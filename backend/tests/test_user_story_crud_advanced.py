import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.entities import User, UserRole, UserStory, TestCase, TestExecution, TestResult, execution_user_stories
from app.core.security import get_password_hash

client = TestClient(app)

def get_auth_token(email="admin@testflow.com", password="admin123456"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["access_token"]

def ensure_viewer_user():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "viewer@testflow.com").first()
        if not user:
            user = User(
                email="viewer@testflow.com",
                hashed_password=get_password_hash("viewer123456"),
                full_name="Usuario Viewer",
                role=UserRole.VIEWER,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    finally:
        db.close()

def test_user_story_full_crud_and_validation():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    suffix = uuid.uuid4().hex[:6].upper()
    code = f"HU-CR-{suffix}"

    # 1. Create with required fields
    create_payload = {
        "project_id": 1,
        "code": code,
        "title": f"Historia CRUD {suffix}",
        "description": "Descripción de prueba para CRUD",
        "acceptance_criteria": ["Criterio A", "Criterio B"],
        "status": "TODO"
    }
    create_res = client.post("/api/v1/user-stories", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    story = create_res.json()
    story_id = story["id"]
    assert story["code"] == code
    assert story["title"] == f"Historia CRUD {suffix}"
    assert story["project_id"] == 1

    # 2. Update all editable fields
    update_res = client.put(f"/api/v1/user-stories/{story_id}", json={
        "title": f"Historia CRUD {suffix} Modificada",
        "description": "Descripción actualizada",
        "status": "IN_PROGRESS",
        "acceptance_criteria": ["Criterio Modificado 1", "Criterio Modificado 2"]
    }, headers=headers)
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["title"] == f"Historia CRUD {suffix} Modificada"
    assert updated["status"] == "IN_PROGRESS"
    assert len(updated["acceptance_criteria"]) == 2

    # 3. Validation: Empty title should be rejected
    bad_title_res = client.put(f"/api/v1/user-stories/{story_id}", json={"title": "   "}, headers=headers)
    assert bad_title_res.status_code == 400
    assert "no puede estar vacío" in bad_title_res.json()["detail"]

    # 4. Attach a test case to this story
    tc_res = client.post("/api/v1/test-cases", json={
        "project_id": 1,
        "code": f"TC-DET-{suffix}",
        "title": "Caso para verificar desvinculación segura",
        "expected_result": "Debe conservarse",
        "priority": "P2",
        "user_story_id": story_id
    }, headers=headers)
    assert tc_res.status_code in [200, 201]
    tc_id = tc_res.json()["id"]

    # 5. Delete story: must safely detach test case without deleting it
    del_res = client.delete(f"/api/v1/user-stories/{story_id}", headers=headers)
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["detached_cases_count"] >= 1

    # Verify story is gone
    get_res = client.get(f"/api/v1/user-stories/{story_id}", headers=headers)
    assert get_res.status_code == 404

    # Verify test case is PRESERVED in project and unlinked
    tc_check = client.get(f"/api/v1/test-cases/{tc_id}", headers=headers)
    assert tc_check.status_code == 200
    assert tc_check.json()["user_story_id"] is None

    # Cleanup test case
    client.delete(f"/api/v1/test-cases/{tc_id}", headers=headers)

def test_delete_user_story_blocked_when_execution_history_exists():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    suffix = uuid.uuid4().hex[:6].upper()
    code = f"HU-BLK-{suffix}"

    # 1. Create story
    story = client.post("/api/v1/user-stories", json={
        "project_id": 1,
        "code": code,
        "title": f"Historia con Ejecucion {suffix}",
        "description": "No debe permitirse su eliminación"
    }, headers=headers).json()
    story_id = story["id"]

    # 2. Create test case and assign to story
    tc = client.post("/api/v1/test-cases", json={
        "project_id": 1,
        "code": f"TC-BLK-{suffix}",
        "title": "Caso de prueba ejecutado",
        "expected_result": "Resultado",
        "priority": "P1",
        "user_story_id": story_id
    }, headers=headers).json()
    tc_id = tc["id"]

    # 3. Create test execution linked to this story
    execution = client.post("/api/v1/executions", json={
        "project_id": 1,
        "name": f"Ejecución Bloqueo {suffix}",
        "version": "v1.0.0",
        "environment": "QA",
        "user_story_ids": [story_id]
    }, headers=headers).json()
    exec_id = execution["id"]

    # Register result
    client.post(f"/api/v1/executions/{exec_id}/results", data={
        "test_case_id": tc_id,
        "status": "PASSED",
        "actual_result": "Aprobado"
    }, headers=headers)

    # 4. Attempt to delete story: MUST BE BLOCKED BY DATA RETENTION POLICY
    del_attempt = client.delete(f"/api/v1/user-stories/{story_id}", headers=headers)
    assert del_attempt.status_code == 400
    err_detail = del_attempt.json()["detail"]
    assert "No es posible eliminar" in err_detail
    assert "historial de ejecución" in err_detail

    # Story should still exist
    check_story = client.get(f"/api/v1/user-stories/{story_id}", headers=headers)
    assert check_story.status_code == 200

    # Cleanup execution first, then deletion becomes permissible
    client.delete(f"/api/v1/executions/{exec_id}", headers=headers)
    del_after_cleanup = client.delete(f"/api/v1/user-stories/{story_id}", headers=headers)
    assert del_after_cleanup.status_code == 200
    client.delete(f"/api/v1/test-cases/{tc_id}", headers=headers)

def test_viewer_role_authorization_prevent_mutations():
    ensure_viewer_user()
    viewer_token = get_auth_token("viewer@testflow.com", "viewer123456")
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

    # 1. VIEWER cannot create story
    create_res = client.post("/api/v1/user-stories", json={
        "project_id": 1,
        "title": "Intento de creación por Viewer",
        "description": "Debe fallar con 403"
    }, headers=viewer_headers)
    assert create_res.status_code == 403
    assert "VIEWER" in create_res.json()["detail"]

    # 2. VIEWER cannot update story
    update_res = client.put("/api/v1/user-stories/1", json={
        "title": "Intento de actualización por Viewer"
    }, headers=viewer_headers)
    assert update_res.status_code == 403
    assert "VIEWER" in update_res.json()["detail"]

    # 3. VIEWER cannot delete story
    delete_res = client.delete("/api/v1/user-stories/1", headers=viewer_headers)
    assert delete_res.status_code == 403
    assert "VIEWER" in delete_res.json()["detail"]
