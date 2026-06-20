import os
import json
from unittest.mock import patch, MagicMock
from app.services.carbon_coach_service import CarbonCoachService
from app.schemas.twin import TwinState, CarbonTwinNarrative

def get_test_twin_states():
    current = TwinState(
        transportation_kg=1200.0,
        energy_kg=1500.0,
        food_kg=900.0,
        shopping_kg=600.0,
        total_kg=4200.0,
        carbon_score=70
    )
    future = TwinState(
        transportation_kg=800.0,
        energy_kg=900.0,
        food_kg=600.0,
        shopping_kg=400.0,
        total_kg=2700.0,
        carbon_score=85
    )
    return current, future

@patch("app.services.carbon_coach_service.settings")
def test_generate_narrative_missing_key(mock_settings):
    mock_settings.gemini_api_keys = []
    current, future = get_test_twin_states()
    res = CarbonCoachService.generate_narrative(
        user_id="test_user",
        current_state=current,
        future_state=future,
        reduction_pct=35.7,
        savings=450.0,
        rules=["transit", "optimize_energy"]
    )
    
    assert isinstance(res, CarbonTwinNarrative)
    assert "temporarily unavailable" in res.summary
    assert "fully functional" in res.summary
    assert "sustainability projections" in res.summary
    assert "Set GEMINI_API_KEY" not in res.summary

@patch("app.services.carbon_coach_service.settings")
@patch("app.services.carbon_coach_service.genai.Client")
@patch("app.services.carbon_coach_service.assessment_repo")
@patch("app.services.carbon_coach_service.simulator_repo")
@patch("app.services.carbon_coach_service.commitments_repo")
def test_generate_narrative_success(mock_comm_repo, mock_sim_repo, mock_ass_repo, mock_client_cls, mock_settings):
    mock_settings.gemini_api_keys = ["mock_key"]
    current, future = get_test_twin_states()
    
    # Mock repos to prevent DB hits
    mock_ass_repo.get_latest_assessment.return_value = {}
    mock_sim_repo.list_scenarios.return_value = []
    mock_comm_repo.get_missions.return_value = []
    
    # Setup genai mocks
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    
    mock_response = MagicMock()
    mock_response.text = json.dumps({
        "summary": "You are on track to save 1.5 tons of carbon.",
        "biggest_contributor": "Energy is your main emissions source.",
        "biggest_opportunity": "Installing solar panels provides the highest yield.",
        "projected_reduction": "Reduce by 35% with $450/yr savings.",
        "future_self_message": "Keep up the excellent sustainable work!"
    })
    
    mock_client.models.generate_content.return_value = mock_response
    
    res = CarbonCoachService.generate_narrative(
        user_id="test_user",
        current_state=current,
        future_state=future,
        reduction_pct=35.7,
        savings=450.0,
        rules=["transit", "optimize_energy"]
    )
    
    assert isinstance(res, CarbonTwinNarrative)
    assert res.summary == "You are on track to save 1.5 tons of carbon."
    assert res.biggest_contributor == "Energy is your main emissions source."
    assert res.biggest_opportunity == "Installing solar panels provides the highest yield."
    assert res.projected_reduction == "Reduce by 35% with $450/yr savings."
    assert res.future_self_message == "Keep up the excellent sustainable work!"

@patch("app.services.carbon_coach_service.settings")
@patch("app.services.carbon_coach_service.genai.Client")
@patch("app.services.carbon_coach_service.assessment_repo")
@patch("app.services.carbon_coach_service.simulator_repo")
@patch("app.services.carbon_coach_service.commitments_repo")
def test_generate_narrative_error_fallback(mock_comm_repo, mock_sim_repo, mock_ass_repo, mock_client_cls, mock_settings):
    mock_settings.gemini_api_keys = ["mock_key"]
    current, future = get_test_twin_states()
    
    # Mock repos
    mock_ass_repo.get_latest_assessment.return_value = {}
    mock_sim_repo.list_scenarios.return_value = []
    mock_comm_repo.get_missions.return_value = []
    
    # Setup genai mock to throw exception
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    mock_client.models.generate_content.side_effect = Exception("Gemini service is down")
    
    res = CarbonCoachService.generate_narrative(
        user_id="test_user",
        current_state=current,
        future_state=future,
        reduction_pct=35.7,
        savings=450.0,
        rules=["transit", "optimize_energy"]
    )
    
    assert isinstance(res, CarbonTwinNarrative)
    assert "temporarily unavailable" in res.summary
    assert "fully functional" in res.summary
    assert "Gemini service is down" not in res.summary
