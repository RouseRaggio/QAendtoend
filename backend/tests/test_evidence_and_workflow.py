import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_header():
    resp = client.post("/api/v1/auth/login", json={"email": "qa@gestadoc.com", "password": "qa123456"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_evidence_and_bug_creation_workflow():
    headers = get_auth_header()

    # 1. Create a dummy test case
    import time
    code_unique = f"WF-AUTO-{int(time.time() * 1000) % 1000000}"
    tc_resp = client.post("/api/v1/test-cases", headers=headers, json={
        "project_id": 1,
        "code": code_unique,
        "title": "Prueba de portapapeles y evidencia con fallo",
        "expected_result": "Debe persistir correctamente",
        "priority": "P1"
    })
    assert tc_resp.status_code == 200
    tc_id = tc_resp.json()["id"]

    # 2. Register result as BUG with evidence files & descriptions
    fake_img1 = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB\x82")
    fake_img2 = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB\x82")

    files = [
        ("files", ("screenshot_01.png", fake_img1, "image/png")),
        ("files", ("screenshot_02.png", fake_img2, "image/png")),
    ]
    data = {
        "test_case_id": tc_id,
        "status": "BUG",
        "actual_result": "Error 500 al guardar en base de datos",
        "severity": "HIGH",
        "priority": "P1",
        "observations": "Se adjuntan capturas pegadas",
        "descriptions": '["Captura de error en pantalla", "Log de consola"]'
    }

    reg_resp = client.post("/api/v1/executions/1/results", headers=headers, data=data, files=files)
    assert reg_resp.status_code == 200
    res_data = reg_resp.json()

    assert res_data["status"] == "BUG"
    assert len(res_data["evidences"]) == 2
    assert res_data["evidences"][0]["description"] == "Captura de error en pantalla"
    assert res_data["evidences"][1]["description"] == "Log de consola"
    assert res_data["bug_id"] is not None

    # Verify bug was created and has evidence
    bugs_resp = client.get("/api/v1/incidents/bugs?project_id=1")
    assert bugs_resp.status_code == 200
    all_bugs = bugs_resp.json()
    created_bug = next(b for b in all_bugs if b["id"] == res_data["bug_id"])
    assert created_bug["title"] == f"Fallo en {code_unique}: Prueba de portapapeles y evidencia con fallo"
    assert len(created_bug["evidences"]) == 2

def test_ai_generation_and_approval():
    headers = get_auth_header()

    gen_payload = {
        "project_id": 1,
        "title": "Módulo de Facturación Electrónica",
        "story_text": "Como usuario quiero emitir facturas electrónicas para cumplir con las normas tributarias.",
        "acceptance_criteria": [
            "Validar número de NIT",
            "Generar código QR",
            "Enviar XML a la DIAN"
        ]
    }

    ai_resp = client.post("/api/v1/ai/generate", headers=headers, json=gen_payload)
    assert ai_resp.status_code == 200
    ai_data = ai_resp.json()
    assert len(ai_data["test_cases"]) == 6
    assert len(ai_data["analysis"]["requirements"]) > 0

    # Approve 2 cases
    approve_payload = {
        "project_id": 1,
        "user_story_id": ai_data["user_story_id"],
        "cases": [
            {
                "title": ai_data["test_cases"][0]["title"],
                "steps": ai_data["test_cases"][0]["steps"],
                "expected_result": ai_data["test_cases"][0]["expected_result"],
                "priority": "P1",
                "tags": ["Facturación"]
            },
            {
                "title": ai_data["test_cases"][1]["title"],
                "steps": ai_data["test_cases"][1]["steps"],
                "expected_result": ai_data["test_cases"][1]["expected_result"],
                "priority": "P2",
                "tags": ["Facturación", "Negativo"]
            }
        ]
    }
    appr_resp = client.post("/api/v1/ai/approve", headers=headers, json=approve_payload)
    assert appr_resp.status_code == 200
    approved_cases = appr_resp.json()
    assert len(approved_cases) == 2
    assert approved_cases[0]["is_ai_generated"] is True

def test_pdf_report_generation():
    headers = get_auth_header()
    rep_resp = client.post("/api/v1/reports/executions/1/generate", headers=headers)
    assert rep_resp.status_code == 200
    data = rep_resp.json()
    assert "report_id" in data

    # Download it
    dl_resp = client.get(f"/api/v1/reports/{data['report_id']}/download")
    assert dl_resp.status_code == 200
    assert dl_resp.headers["content-type"] == "application/pdf"
    assert len(dl_resp.content) > 1000

def test_execution_engine_workflow():
    headers = get_auth_header()

    # 1. Get test cases for Project 1
    tc_resp = client.get("/api/v1/test-cases?project_id=1&page_size=50", headers=headers)
    assert tc_resp.status_code == 200
    tc_data = tc_resp.json()
    items = tc_data["items"]
    assert len(items) >= 3
    
    # Select first 3 test cases
    selected_case_ids = [items[0]["id"], items[1]["id"], items[2]["id"]]
    
    # 2. Create execution with selective cases
    exec_payload = {
        "project_id": 1,
        "name": "Suite de Regresion Automatizada V2",
        "environment": "QA",
        "version_build": "v2.4.0-rc1",
        "description": "Validacion de ciclo de ejecucion end-to-end",
        "test_case_ids": selected_case_ids
    }
    create_resp = client.post("/api/v1/executions", json=exec_payload, headers=headers)
    assert create_resp.status_code in [200, 201]
    exec_data = create_resp.json()
    exec_id = exec_data["id"]
    assert exec_data["total_cases"] == 3
    assert exec_data["status"] == "EN_EJECUCION"

    # 3. Get Execution Detail
    detail_resp = client.get(f"/api/v1/executions/{exec_id}", headers=headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["name"] == "Suite de Regresion Automatizada V2"
    assert len(detail["cases"]) == 3
    assert detail["cases"][0]["order_index"] == 0
    assert detail["cases"][1]["order_index"] == 1
    assert detail["cases"][2]["order_index"] == 2
    assert detail["cases"][0]["status"] == "NOT_EXECUTED"

    # 4. Fetch case 0 -> auto-transitions NOT_EXECUTED to IN_PROGRESS
    case0_id = selected_case_ids[0]
    get_c0 = client.get(f"/api/v1/executions/{exec_id}/cases/{case0_id}", headers=headers)
    assert get_c0.status_code == 200
    c0_data = get_c0.json()
    assert c0_data["status"] == "IN_PROGRESS"
    assert c0_data["started_at"] is not None

    # 5. Save draft for case 0
    draft_data = {
        "test_case_id": case0_id,
        "actual_result": "Prueba iniciada, esperando validacion de backend",
        "severity": "MEDIUM",
        "priority": "P2",
        "observations": "Observacion preliminar de borrador"
    }
    draft_resp = client.post(f"/api/v1/executions/{exec_id}/draft", data=draft_data, headers=headers)
    assert draft_resp.status_code == 200
    d_res = draft_resp.json()
    assert d_res["status"] == "IN_PROGRESS"
    assert d_res["actual_result"] == "Prueba iniciada, esperando validacion de backend"

    # 6. Save PASSED result for case 0
    pass_data = {
        "test_case_id": case0_id,
        "status": "PASSED",
        "actual_result": "El proceso se ejecuto exitosamente segun lo esperado.",
        "severity": "NONE",
        "priority": "P2",
        "observations": "Todo OK"
    }
    pass_resp = client.post(f"/api/v1/executions/{exec_id}/results", data=pass_data, headers=headers)
    assert pass_resp.status_code == 200
    p_res = pass_resp.json()
    assert p_res["status"] == "PASSED"
    assert p_res["completed_at"] is not None

    # 7. Validation errors for BUG on case 1
    case1_id = selected_case_ids[1]
    # Missing actual_result
    bug_fail_1 = client.post(
        f"/api/v1/executions/{exec_id}/results",
        data={"test_case_id": case1_id, "status": "BUG", "actual_result": "", "severity": "HIGH", "priority": "P1"},
        headers=headers
    )
    assert bug_fail_1.status_code == 400
    assert "resultado obtenido" in bug_fail_1.json()["detail"].lower()

    # Missing severity (NONE not allowed for BUG)
    bug_fail_2 = client.post(
        f"/api/v1/executions/{exec_id}/results",
        data={"test_case_id": case1_id, "status": "BUG", "actual_result": "Fallo critico", "severity": "NONE", "priority": "P1"},
        headers=headers
    )
    assert bug_fail_2.status_code == 400
    assert "severidad" in bug_fail_2.json()["detail"].lower()

    # 8. Successful BUG registration with image evidence upload
    fake_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    bug_data = {
        "test_case_id": case1_id,
        "status": "BUG",
        "actual_result": "Error 500 al hacer click en el boton Guardar",
        "severity": "CRITICAL",
        "priority": "P1",
        "observations": "Se adjunta captura de pantalla con el traceback",
        "descriptions": '["Captura de error 500 en consola"]'
    }
    files = [("files", ("error_screenshot.png", io.BytesIO(fake_png), "image/png"))]
    bug_resp = client.post(f"/api/v1/executions/{exec_id}/results", data=bug_data, files=files, headers=headers)
    assert bug_resp.status_code == 200
    b_res = bug_resp.json()
    assert b_res["status"] == "BUG"
    assert len(b_res["evidences"]) == 1
    evidence_id = b_res["evidences"][0]["id"]
    assert b_res["evidences"][0]["file_name"] == "error_screenshot.png"

    # Verify bug was automatically created in Incidents
    bugs_resp = client.get("/api/v1/incidents/bugs", headers=headers)
    assert bugs_resp.status_code == 200
    all_bugs = bugs_resp.json()
    matching_bug = next((b for b in all_bugs if b.get("test_result_id") == b_res["id"]), None)
    assert matching_bug is not None
    assert matching_bug["severity"] == "CRITICAL"
    assert len(matching_bug["evidences"]) == 1

    # 9. Test evidence deletion
    del_ev_resp = client.delete(f"/api/v1/executions/{exec_id}/evidence/{evidence_id}", headers=headers)
    assert del_ev_resp.status_code == 200

    # 10. Attempt finish execution while case 2 is still pending
    finish_warning = client.post(f"/api/v1/executions/{exec_id}/finish", headers=headers)
    assert finish_warning.status_code == 200
    fw_data = finish_warning.json()
    assert fw_data["warning"] is True
    assert fw_data["pending_count"] == 1
    assert fw_data["status"] == "FINALIZADA"
    assert fw_data["ended_at"] is not None

    # 11. Cleanup execution
    del_exec = client.delete(f"/api/v1/executions/{exec_id}", headers=headers)
    assert del_exec.status_code == 200
