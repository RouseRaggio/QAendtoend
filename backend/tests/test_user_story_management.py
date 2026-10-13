import io
import time
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_header():
    resp = client.post("/api/v1/auth/login", json={"email": "qa@gestadoc.com", "password": "qa123456"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_user_story_test_cases_pagination_and_filter():
    headers = get_auth_header()
    stories_resp = client.get("/api/v1/user-stories?project_id=1", headers=headers)
    assert stories_resp.status_code == 200
    stories = stories_resp.json()
    assert len(stories) > 0
    story_id = stories[0]["id"]
    project_id = stories[0]["project_id"]

    # Create a couple of unique test cases associated with this user story
    stamp = int(time.time() * 1000)
    tc1_resp = client.post(
        "/api/v1/test-cases",
        headers=headers,
        json={
            "project_id": project_id,
            "code": f"TC-PAG1-{stamp}",
            "title": f"Paginated Search Alpha {stamp}",
            "expected_result": "Debe pasar",
            "priority": "P1",
            "user_story_id": story_id
        }
    )
    assert tc1_resp.status_code in [200, 201]

    tc2_resp = client.post(
        "/api/v1/test-cases",
        headers=headers,
        json={
            "project_id": project_id,
            "code": f"TC-PAG2-{stamp}",
            "title": f"Paginated Search Beta {stamp}",
            "expected_result": "Debe validar",
            "priority": "P3",
            "user_story_id": story_id
        }
    )
    assert tc2_resp.status_code in [200, 201]

    # Test GET /{story_id}/test-cases default pagination (page_size=10)
    resp = client.get(f"/api/v1/user-stories/{story_id}/test-cases?page=1&page_size=10", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert data["page_size"] == 10
    assert data["total"] >= 2

    # Test Search filter
    search_resp = client.get(f"/api/v1/user-stories/{story_id}/test-cases?search=Alpha%20{stamp}", headers=headers)
    assert search_resp.status_code == 200
    search_data = search_resp.json()
    assert search_data["total"] == 1
    assert search_data["items"][0]["code"] == f"TC-PAG1-{stamp}"

    # Test Priority filter
    prio_resp = client.get(f"/api/v1/user-stories/{story_id}/test-cases?priority=P3&search={stamp}", headers=headers)
    assert prio_resp.status_code == 200
    prio_data = prio_resp.json()
    assert prio_data["total"] == 1
    assert prio_data["items"][0]["priority"] == "P3"

def test_ai_generation_and_approval_for_user_story():
    headers = get_auth_header()
    stories_resp = client.get("/api/v1/user-stories?project_id=1", headers=headers)
    assert stories_resp.status_code == 200
    story = stories_resp.json()[0]
    story_id = story["id"]
    project_id = story["project_id"]

    # 1. Generate preview using the User Story context
    gen_resp = client.post(
        "/api/v1/ai/generate",
        headers=headers,
        json={
            "project_id": project_id,
            "user_story_id": story_id,
            "title": story["title"],
            "story_text": story["description"] or story["title"],
            "acceptance_criteria": story.get("acceptance_criteria", ["Criterio 1"]),
            "test_types": ["POSITIVE", "NEGATIVE", "VALIDATION"],
            "detail_level": "HIGH"
        }
    )
    assert gen_resp.status_code == 200
    gen_data = gen_resp.json()
    assert gen_data["user_story_id"] == story_id
    assert len(gen_data["test_cases"]) > 0

    # 2. Approve selected generated cases
    first_case = gen_data["test_cases"][0]
    stamp = int(time.time() * 1000)
    approve_resp = client.post(
        "/api/v1/ai/approve",
        headers=headers,
        json={
            "project_id": project_id,
            "user_story_id": story_id,
            "cases": [
                {
                    "title": f"IA Approved Case {stamp}",
                    "preconditions": first_case["preconditions"],
                    "steps": first_case["steps"],
                    "expected_result": first_case["expected_result"],
                    "priority": first_case["priority"],
                    "tags": ["IA-Generado"]
                }
            ]
        }
    )
    assert approve_resp.status_code == 200
    approved_list = approve_resp.json()
    assert len(approved_list) == 1
    created_tc = approved_list[0]
    assert created_tc["user_story_id"] == story_id
    assert created_tc["is_ai_generated"] is True

def test_test_case_crud_edit_and_delete_protection():
    headers = get_auth_header()
    stories_resp = client.get("/api/v1/user-stories?project_id=1", headers=headers)
    story = stories_resp.json()[0]
    story_id = story["id"]
    project_id = story["project_id"]

    stamp = int(time.time() * 1000)
    # Create test case
    create_resp = client.post(
        "/api/v1/test-cases",
        headers=headers,
        json={
            "project_id": project_id,
            "code": f"TC-CRUD-{stamp}",
            "title": f"Original Title {stamp}",
            "expected_result": "Original Expected",
            "priority": "P2",
            "user_story_id": story_id
        }
    )
    assert create_resp.status_code in [200, 201]
    tc_id = create_resp.json()["id"]

    # 1. Read / View Detail
    get_resp = client.get(f"/api/v1/test-cases/{tc_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["title"] == f"Original Title {stamp}"

    # 2. Edit
    edit_resp = client.put(
        f"/api/v1/test-cases/{tc_id}",
        headers=headers,
        json={
            "title": f"Updated Title {stamp}",
            "expected_result": "Updated Expected Result",
            "priority": "P1"
        }
    )
    assert edit_resp.status_code == 200
    assert edit_resp.json()["title"] == f"Updated Title {stamp}"
    assert edit_resp.json()["priority"] == "P1"

    # 3. Unlink from story (user_story_id = 0)
    unlink_resp = client.put(
        f"/api/v1/test-cases/{tc_id}",
        headers=headers,
        json={"user_story_id": 0}
    )
    assert unlink_resp.status_code == 200
    assert unlink_resp.json()["user_story_id"] is None

    # 4. Re-link to story
    relink_resp = client.put(
        f"/api/v1/test-cases/{tc_id}",
        headers=headers,
        json={"user_story_id": story_id}
    )
    assert relink_resp.status_code == 200
    assert relink_resp.json()["user_story_id"] == story_id

    # 5. Delete (no execution results => physically deleted)
    del_resp = client.delete(f"/api/v1/test-cases/{tc_id}", headers=headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["archived"] is False

    # Check 404 after deletion
    get_after_del = client.get(f"/api/v1/test-cases/{tc_id}", headers=headers)
    assert get_after_del.status_code == 404
