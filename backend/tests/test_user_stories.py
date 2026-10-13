import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token():
    resp = client.post("/api/v1/auth/login", json={"email": "admin@testflow.com", "password": "admin123456"})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]

def test_user_story_crud_and_code_uniqueness():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    suffix = uuid.uuid4().hex[:5].upper()
    code_val = f"HU-TR-{suffix}"

    # 1. Create User Story with specific code
    payload = {
        "project_id": 1,
        "code": code_val,
        "title": f"Historia de Trazabilidad {suffix}",
        "description": "Como tester deseo verificar trazabilidad",
        "acceptance_criteria": ["Criterio 1", "Criterio 2"],
        "status": "TODO"
    }
    create_resp = client.post("/api/v1/user-stories", json=payload, headers=headers)
    assert create_resp.status_code == 201, create_resp.text
    data = create_resp.json()
    assert data["code"] == code_val
    story_id = data["id"]

    # 2. Reject duplicate code in same project
    dup_resp = client.post("/api/v1/user-stories", json=payload, headers=headers)
    assert dup_resp.status_code == 400
    assert "ya está en uso" in dup_resp.json()["detail"]

    # 3. Create without code (auto-generation)
    auto_payload = {
        "project_id": 1,
        "title": "Historia Auto Code",
        "description": "Auto generated code story"
    }
    auto_resp = client.post("/api/v1/user-stories", json=auto_payload, headers=headers)
    assert auto_resp.status_code == 201
    auto_data = auto_resp.json()
    assert auto_data["code"].startswith("HU-")
    auto_id = auto_data["id"]

    # 4. List user stories with filters
    list_resp = client.get(f"/api/v1/user-stories?project_id=1&search={suffix}", headers=headers)
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) >= 1
    assert any(s["id"] == story_id for s in items)

    # 5. Update user story
    update_resp = client.put(f"/api/v1/user-stories/{story_id}", json={
        "title": f"Historia de Trazabilidad {suffix} Actualizada",
        "status": "IN_PROGRESS"
    }, headers=headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == f"Historia de Trazabilidad {suffix} Actualizada"
    assert update_resp.json()["status"] == "IN_PROGRESS"

    # Cleanup
    client.delete(f"/api/v1/user-stories/{story_id}", headers=headers)
    client.delete(f"/api/v1/user-stories/{auto_id}", headers=headers)

def test_test_case_assignment_and_filtering():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    suffix = uuid.uuid4().hex[:5].upper()
    code_val = f"HU-AS-{suffix}"

    # Create story
    story_resp = client.post("/api/v1/user-stories", json={
        "project_id": 1,
        "code": code_val,
        "title": f"Historia para Asignacion {suffix}",
        "description": "Test assignment flow"
    }, headers=headers)
    assert story_resp.status_code == 201, story_resp.text
    story_id = story_resp.json()["id"]

    # Create 2 test cases without story
    tc1 = client.post("/api/v1/test-cases", json={
        "project_id": 1,
        "code": f"TC-TR1-{suffix}",
        "title": "Caso de prueba trazable 1",
        "expected_result": "Resultado esperado 1",
        "priority": "P2"
    }, headers=headers).json()

    tc2 = client.post("/api/v1/test-cases", json={
        "project_id": 1,
        "code": f"TC-TR2-{suffix}",
        "title": "Caso de prueba trazable 2",
        "expected_result": "Resultado esperado 2",
        "priority": "P2"
    }, headers=headers).json()

    # Assign them via batch assign
    assign_resp = client.post("/api/v1/test-cases/batch-assign-story", json={
        "test_case_ids": [tc1["id"], tc2["id"]],
        "user_story_id": story_id
    }, headers=headers)
    assert assign_resp.status_code == 200
    assert assign_resp.json()["count"] == 2

    # Verify filtering by user_story_id in test cases endpoint
    filter_resp = client.get(f"/api/v1/test-cases?user_story_id={story_id}", headers=headers)
    assert filter_resp.status_code == 200
    filtered_cases = filter_resp.json()["items"]
    assert len(filtered_cases) == 2
    assert all(c["user_story_id"] == story_id for c in filtered_cases)
    assert all(c["user_story_code"] == code_val for c in filtered_cases)

    # Verify user story detail reflects associated cases
    detail_resp = client.get(f"/api/v1/user-stories/{story_id}", headers=headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert len(detail["test_cases"]) == 2
    assert detail["metrics"]["total_cases"] == 2

    # Cleanup story and test cases
    client.delete(f"/api/v1/user-stories/{story_id}", headers=headers)
    client.delete(f"/api/v1/test-cases/{tc1['id']}", headers=headers)
    client.delete(f"/api/v1/test-cases/{tc2['id']}", headers=headers)

def test_execution_by_user_story_and_strict_isolation():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    suffix = uuid.uuid4().hex[:5].upper()
    code_val = f"HU-EX-{suffix}"

    # 1. Create a User Story
    story_resp = client.post("/api/v1/user-stories", json={
        "project_id": 1,
        "code": code_val,
        "title": f"Historia de Ejecucion Aislada {suffix}",
        "description": "Historia para probar ejecucion aislada"
    }, headers=headers)
    assert story_resp.status_code == 201, story_resp.text
    story_id = story_resp.json()["id"]

    # 2. Create 2 test cases attached to this story
    tc1 = client.post("/api/v1/test-cases", json={
        "project_id": 1,
        "code": f"TC-IS1-{suffix}",
        "title": "Caso Aislamiento 1",
        "expected_result": "Debe pasar",
        "priority": "P1",
        "user_story_id": story_id
    }, headers=headers).json()

    tc2 = client.post("/api/v1/test-cases", json={
        "project_id": 1,
        "code": f"TC-IS2-{suffix}",
        "title": "Caso Aislamiento 2",
        "expected_result": "Debe fallar",
        "priority": "P2",
        "user_story_id": story_id
    }, headers=headers).json()

    # Create an unrelated test case in another story or unassigned
    tc_unrelated = client.post("/api/v1/test-cases", json={
        "project_id": 1,
        "code": f"TC-UNR-{suffix}",
        "title": "Caso No Relacionado",
        "expected_result": "No debe entrar",
        "priority": "P3"
    }, headers=headers).json()

    # 3. Create Execution selecting ONLY this User Story
    exec1_resp = client.post("/api/v1/executions", json={
        "project_id": 1,
        "name": f"Ejecución Sprint 1 - {code_val}",
        "version": "v1.0.0",
        "environment": "QA",
        "user_story_ids": [story_id]
    }, headers=headers)
    assert exec1_resp.status_code == 200
    exec1 = exec1_resp.json()
    exec1_id = exec1["id"]
    assert exec1["total_cases"] == 2
    assert story_id in exec1["user_story_ids"]

    # Check execution detail: verify ONLY tc1 and tc2 are included, NOT tc_unrelated
    detail1 = client.get(f"/api/v1/executions/{exec1_id}", headers=headers).json()
    case_ids_in_exec1 = [c["test_case_id"] for c in detail1["cases"]]
    assert set(case_ids_in_exec1) == {tc1["id"], tc2["id"]}
    assert tc_unrelated["id"] not in case_ids_in_exec1

    # 4. Save results in Execution 1: Pass tc1, Fail tc2
    res1 = client.post(f"/api/v1/executions/{exec1_id}/results", data={
        "test_case_id": tc1["id"],
        "status": "PASSED",
        "actual_result": "Paso exitoso en ejecucion 1"
    }, headers=headers)
    assert res1.status_code == 200

    res2 = client.post(f"/api/v1/executions/{exec1_id}/results", data={
        "test_case_id": tc2["id"],
        "status": "BUG",
        "actual_result": "Fallo en ejecucion 1",
        "severity": "HIGH"
    }, headers=headers)
    assert res2.status_code == 200

    # 5. Create a Second Execution for the SAME User Story (e.g. re-test or next sprint)
    exec2_resp = client.post("/api/v1/executions", json={
        "project_id": 1,
        "name": f"Ejecución Sprint 2 - Re-test {code_val}",
        "version": "v1.1.0",
        "environment": "QA",
        "user_story_ids": [story_id]
    }, headers=headers)
    assert exec2_resp.status_code == 200
    exec2_id = exec2_resp.json()["id"]

    # In Execution 2, test cases must start as NOT_EXECUTED, completely isolated from Execution 1
    detail2 = client.get(f"/api/v1/executions/{exec2_id}", headers=headers).json()
    assert all(c["status"] == "NOT_EXECUTED" for c in detail2["cases"])

    # Register result in Execution 2: Pass tc2
    res2_exec2 = client.post(f"/api/v1/executions/{exec2_id}/results", data={
        "test_case_id": tc2["id"],
        "status": "PASSED",
        "actual_result": "Corregido y aprobado en ejecucion 2"
    }, headers=headers)
    assert res2_exec2.status_code == 200

    # 6. Verify Execution 1 results were NOT overwritten (STRICT HISTORICAL ISOLATION)
    detail1_recheck = client.get(f"/api/v1/executions/{exec1_id}", headers=headers).json()
    tc2_in_exec1 = next(c for c in detail1_recheck["cases"] if c["test_case_id"] == tc2["id"])
    assert tc2_in_exec1["status"] == "BUG", "Historical result in Execution 1 was overwritten!"
    assert tc2_in_exec1["actual_result"] == "Fallo en ejecucion 1"

    # Verify Execution 2 has its own isolated result
    detail2_recheck = client.get(f"/api/v1/executions/{exec2_id}", headers=headers).json()
    tc2_in_exec2 = next(c for c in detail2_recheck["cases"] if c["test_case_id"] == tc2["id"])
    assert tc2_in_exec2["status"] == "PASSED"
    assert tc2_in_exec2["actual_result"] == "Corregido y aprobado en ejecucion 2"

    # Cleanup executions and cases
    client.delete(f"/api/v1/executions/{exec1_id}", headers=headers)
    client.delete(f"/api/v1/executions/{exec2_id}", headers=headers)
    client.delete(f"/api/v1/user-stories/{story_id}", headers=headers)
    client.delete(f"/api/v1/test-cases/{tc1['id']}", headers=headers)
    client.delete(f"/api/v1/test-cases/{tc2['id']}", headers=headers)
    client.delete(f"/api/v1/test-cases/{tc_unrelated['id']}", headers=headers)
