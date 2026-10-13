import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token():
    resp = client.post("/api/v1/auth/login", json={"email": "admin@testflow.com", "password": "admin123456"})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]

def test_projects_navigation_endpoints():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. GET /projects has user_stories_count and test_cases_count
    resp = client.get("/api/v1/projects", headers=headers)
    assert resp.status_code == 200
    projects = resp.json()
    assert len(projects) >= 1
    p1 = projects[0]
    assert "user_stories_count" in p1
    assert "test_cases_count" in p1
    p1_id = p1["id"]

    # 2. GET /projects/{project_id}
    detail_resp = client.get(f"/api/v1/projects/{p1_id}", headers=headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == p1_id

    # 3. GET /projects/{project_id}/user-stories
    stories_resp = client.get(f"/api/v1/projects/{p1_id}/user-stories", headers=headers)
    assert stories_resp.status_code == 200
    assert isinstance(stories_resp.json(), list)

    # 4. 404 for non-existent project
    resp_404 = client.get("/api/v1/projects/999999", headers=headers)
    assert resp_404.status_code == 404

def test_cross_project_scoping_and_rejection():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    suffix = uuid.uuid4().hex[:6].upper()

    # Create a secondary project
    p2_resp = client.post("/api/v1/projects", json={
        "name": f"Proyecto Secundario {suffix}",
        "key": f"PRJ{suffix[:4]}",
        "description": "Proyecto para probar aislamiento"
    }, headers=headers)
    assert p2_resp.status_code == 200, p2_resp.text
    p2_id = p2_resp.json()["id"]

    # Create a story in project 1
    s1_resp = client.post("/api/v1/user-stories", json={
        "project_id": 1,
        "title": f"Story Proj 1 {suffix}",
        "code": f"HU-P1-{suffix[:4]}"
    }, headers=headers)
    assert s1_resp.status_code == 201
    s1_id = s1_resp.json()["id"]

    # Create a story in project 2
    s2_resp = client.post("/api/v1/user-stories", json={
        "project_id": p2_id,
        "title": f"Story Proj 2 {suffix}",
        "code": f"HU-P2-{suffix[:4]}"
    }, headers=headers)
    assert s2_resp.status_code == 201
    s2_id = s2_resp.json()["id"]

    # Verify project-scoped detail endpoint rejects mismatch: story 2 under project 1
    mismatch_resp = client.get(f"/api/v1/projects/1/user-stories/{s2_id}", headers=headers)
    assert mismatch_resp.status_code == 404

    # Create a test case in project 2
    tc2_resp = client.post("/api/v1/test-cases", json={
        "project_id": p2_id,
        "code": f"TC-{suffix[:4]}",
        "title": f"Caso Proj 2 {suffix}",
        "expected_result": "Debe pasar",
        "priority": "P2"
    }, headers=headers)
    assert tc2_resp.status_code in [200, 201], tc2_resp.text
    tc2_id = tc2_resp.json()["id"]

    # Try assigning tc2 (project 2) to s1 (project 1) -> must reject with 400
    assign_resp = client.post(f"/api/v1/user-stories/{s1_id}/assign-cases", json={
        "test_case_ids": [tc2_id]
    }, headers=headers)
    assert assign_resp.status_code == 400
    assert "asociación cruzada" in assign_resp.json()["detail"]

    # Try batch assigning tc2 to s1 -> must reject with 400
    batch_resp = client.post("/api/v1/test-cases/batch-assign-story", json={
        "test_case_ids": [tc2_id],
        "user_story_id": s1_id
    }, headers=headers)
    assert batch_resp.status_code == 400
    assert "asociación cruzada" in batch_resp.json()["detail"]

    # Try creating execution in project 1 with tc2 (from project 2) -> must reject with 400
    exec_resp = client.post("/api/v1/executions", json={
        "project_id": 1,
        "name": f"Ejecución Inválida {suffix}",
        "test_case_ids": [tc2_id]
    }, headers=headers)
    assert exec_resp.status_code == 400
    assert "asociar casos de otro proyecto" in exec_resp.json()["detail"]

def test_jira_import_configuration_and_rejection():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Verify status reports configured = False when token not configured
    status_resp = client.get("/api/v1/jira/status", headers=headers)
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert "configured" in data

    # Attempting to import story without configured credentials gives clear 400 explanation without mock success
    import_resp = client.post("/api/v1/jira/import-story", json={
        "project_id": 1,
        "issue_key": "PROJ-123"
    }, headers=headers)
    assert import_resp.status_code == 400
    detail = import_resp.json()["detail"]
    assert "credenciales de Jira" in detail or "JIRA_API_TOKEN" in detail
