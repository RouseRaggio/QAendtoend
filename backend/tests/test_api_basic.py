import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_login_success():
    response = client.post("/api/v1/auth/login", json={"email": "qa@gestadoc.com", "password": "qa123456"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "qa@gestadoc.com"

def test_get_dashboard_metrics():
    response = client.get("/api/v1/dashboard/metrics")
    assert response.status_code == 200
    data = response.json()
    assert data["total_test_cases"] >= 45
    assert data["passed"] >= 32
    assert data["bugs"] >= 7
    assert data["improvements"] >= 6

def test_get_projects_and_cases():
    response = client.get("/api/v1/projects")
    assert response.status_code == 200
    projs = response.json()
    assert len(projs) >= 1
    
    cases_resp = client.get("/api/v1/test-cases?project_id=1&page_size=100")
    assert cases_resp.status_code == 200
    cases_data = cases_resp.json()
    assert cases_data["total"] >= 41
    assert len(cases_data["items"]) >= 41
