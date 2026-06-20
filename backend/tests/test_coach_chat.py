import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.services.carbon_coach_service import CarbonCoachService

client = TestClient(app)

@patch("app.services.carbon_coach_service.settings")
@patch("app.services.carbon_coach_service.assessment_repo")
@patch("app.services.carbon_coach_service.commitments_repo")
@patch("app.services.carbon_coach_service.simulator_repo")
@patch("app.services.carbon_coach_service.genai.Client")
def test_coach_chat_success(mock_genai_client_class, mock_sim_repo, mock_comm_repo, mock_ass_repo, mock_settings):
    mock_settings.gemini_api_keys = ["mock_key"]
    mock_ass_repo.get_latest_assessment.return_value = {}
    mock_comm_repo.get_missions.return_value = []
    mock_sim_repo.list_scenarios.return_value = []
    
    mock_response = MagicMock()
    mock_response.text = "You can reduce emissions by switching to solar panels."
    
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response
    mock_genai_client_class.return_value = mock_client
    
    response = client.post("/api/v1/carbontwin/chat", json={
        "message": "How can I reduce emissions?",
        "history": []
    }, headers={"X-User-Id": "test_user"})
    
    assert response.status_code == 200
    data = response.json()
    assert "solar panels" in data["response"]

@patch("app.services.carbon_coach_service.settings")
@patch("app.services.carbon_coach_service.assessment_repo")
@patch("app.services.carbon_coach_service.commitments_repo")
@patch("app.services.carbon_coach_service.simulator_repo")
def test_coach_chat_missing_key(mock_sim_repo, mock_comm_repo, mock_ass_repo, mock_settings):
    mock_settings.gemini_api_keys = []
    mock_ass_repo.get_latest_assessment.return_value = {}
    mock_comm_repo.get_missions.return_value = []
    mock_sim_repo.list_scenarios.return_value = []
    
    response = client.post("/api/v1/carbontwin/chat", json={
        "message": "Hello",
        "history": []
    }, headers={"X-User-Id": "test_user"})
    
    assert response.status_code == 200
    data = response.json()
    assert "temporarily offline" in data["response"]

@patch("app.services.carbon_coach_service.settings")
@patch("app.services.carbon_coach_service.assessment_repo")
@patch("app.services.carbon_coach_service.commitments_repo")
@patch("app.services.carbon_coach_service.simulator_repo")
@patch("app.services.carbon_coach_service.genai.Client")
def test_coach_chat_error_fallback(mock_genai_client_class, mock_sim_repo, mock_comm_repo, mock_ass_repo, mock_settings):
    mock_settings.gemini_api_keys = ["mock_key"]
    mock_ass_repo.get_latest_assessment.return_value = {}
    mock_comm_repo.get_missions.return_value = []
    mock_sim_repo.list_scenarios.return_value = []
    
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = Exception("Service unavailable")
    mock_genai_client_class.return_value = mock_client
    
    response = client.post("/api/v1/carbontwin/chat", json={
        "message": "Hello",
        "history": []
    }, headers={"X-User-Id": "test_user"})
    
    assert response.status_code == 200
    data = response.json()
    assert "temporarily offline" in data["response"]

def test_coach_chat_rate_limiting():
    responses = []
    for _ in range(11):
        responses.append(client.post("/api/v1/carbontwin/chat", json={
            "message": "Hello",
            "history": []
        }, headers={"X-User-Id": "rate_limit_user"}))
        
    assert any(res.status_code == 429 for res in responses)
