import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@patch("app.services.twin_service.CarbonTwinService")
@patch("app.services.progress_service.ProgressService")
@patch("app.services.carbon_service.CarbonCalculationService")
@patch("app.api.routes.recommendations.RecommendationService")
@patch("app.repositories.progress_repository.ProgressRepository")
@patch("app.repositories.twin_repository.TwinRepository")
@patch("app.repositories.carbon_repository.CarbonRepository")
@patch("app.api.routes.recommendations.assessment_repo")
def test_dashboard_overview_endpoint(
    mock_assessment_repo,
    mock_carbon_repo,
    mock_twin_repo,
    mock_progress_repo,
    mock_rec_service,
    mock_carbon_calc_service,
    mock_progress_service,
    mock_twin_service
):
    # Setup mock returns
    mock_assessment_repo.get_latest_assessment.return_value = {
        "transportation": {"vehicle_type": "gasoline", "weekly_distance_km": 250.0, "commute_method": "car", "annual_flights": 2},
        "home_energy": {"monthly_electricity_kwh": 450.0, "ac_usage_hours_per_day": 5.0, "renewable_energy_percentage": 10.0},
        "food_habits": {"diet_type": "mixed"},
        "shopping": {"monthly_purchases_usd": 500.0, "clothing_purchases_per_month": 3, "electronics_purchases_per_year": 1}
    }
    
    mock_carbon_repo_inst = MagicMock()
    mock_carbon_repo.return_value = mock_carbon_repo_inst
    mock_carbon_repo_inst.get_latest_calculation.return_value = {
        "total_kg": 4500.0,
        "carbon_score": 70,
        "breakdown": {"transportation": 2000.0, "energy": 1500.0, "food": 500.0, "shopping": 500.0}
    }

    mock_twin_repo_inst = MagicMock()
    mock_twin_repo.return_value = mock_twin_repo_inst
    mock_twin_repo_inst.get_latest_twin.return_value = {
        "current_state": {"total_kg": 4500.0, "carbon_score": 70},
        "future_state": {"total_kg": 3500.0, "carbon_score": 85},
        "reduction_percentage": 22.2,
        "money_saved_usd": 300.0,
        "applied_rules": []
    }

    mock_progress_repo_inst = MagicMock()
    mock_progress_repo.return_value = mock_progress_repo_inst
    mock_progress_repo_inst.get_history.return_value = [
        {"id": "pt1", "user_id": "test_user", "date": "2026-06-01", "carbon_score": 70, "emissions_kg": 4500.0}
    ]

    # Recommendation service mock
    mock_rec_service.generate_recommendations.return_value = ("transportation", [])
    mock_rec_service.generate_coaching_explanation.return_value = "Keep it up!"

    mock_carbon_calc_service.calculate_footprint.return_value = {
        "total_kg": 4500.0,
        "breakdown": {"transportation": 2000.0, "energy": 1500.0, "food": 500.0, "shopping": 500.0}
    }

    # Progress Service Mock
    mock_overview = MagicMock()
    mock_overview.model_dump.return_value = {
        "total_carbon_reduced_kg": 100.0,
        "total_money_saved_usd": 50.0,
        "score_improvement": 2,
        "completion_rate": 80.0
    }
    mock_progress_service.get_progress_overview.return_value = mock_overview
    mock_progress_service.get_category_performance.return_value = {}
    mock_progress_service.get_action_performance.return_value = []
    mock_achievements = MagicMock()
    mock_achievements.model_dump.return_value = {"total_xp": 120}
    mock_progress_service.get_achievements.return_value = mock_achievements

    # Execute request
    response = client.get("/api/v1/dashboard/overview", headers={"X-User-Id": "test_user"})
    
    assert response.status_code == 200
    res_data = response.json()
    assert "assessment" in res_data
    assert "carbonData" in res_data
    assert "recommendationData" in res_data
    assert "twinData" in res_data
    assert "progress" in res_data
    assert res_data["progress"]["overview"]["total_carbon_reduced_kg"] == 100.0
