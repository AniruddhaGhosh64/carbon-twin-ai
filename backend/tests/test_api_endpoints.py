import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import limiter
from app.schemas.assessment import SolarSetupTier, FoodHabit, VehicleType
from app.schemas.twin import TwinState, TwinProfile

client = TestClient(app)

# Helper mock assessment response dictionary
def get_mock_assessment_dict():
    return {
        "id": "ass123",
        "user_id": "test_user",
        "transportation": {
            "tracking_unit": "km",
            "vehicle_type": "gasoline",
            "weekly_override": {
                "is_active": True,
                "car": 100.0,
                "public_transit": 0.0,
                "bicycle": 0.0,
                "walking": 0.0
            },
            "flight_records": []
        },
        "home_energy": {
            "household_size": 1,
            "monthly_electricity_bill_inr": 1000.0,
            "solar_tier": "none",
            "appliances": []
        },
        "food_habits": {
            "meals": []
        },
        "shopping": {
            "clothing_items": {"shirts": 0, "pants": 0, "outerwear": 0, "shoes": 0},
            "electronics_items": {"phones": 0, "laptops": 0, "tvs": 0, "accessories": 0},
            "food_deliveries_per_week": 0,
            "package_deliveries_per_week": 0,
            "large_purchases": []
        },
        "created_at": "2026-06-20T20:00:00"
    }

# --- 1. FOOTPRINT ROUTE TESTS ---

@patch("app.api.routes.carbon.carbon_repo")
def test_get_latest_calculation_success(mock_carbon_repo):
    mock_carbon_repo.get_latest_calculation.return_value = {
        "total_kg": 2400.0,
        "total_tons": 2.4,
        "carbon_score": 80,
        "breakdown": {"transportation": 1000, "energy": 500, "food": 500, "shopping": 400}
    }
    response = client.get("/api/v1/footprint/latest", headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["carbon_score"] == 80

@patch("app.api.routes.carbon.carbon_repo")
def test_get_latest_calculation_not_found(mock_carbon_repo):
    mock_carbon_repo.get_latest_calculation.return_value = None
    response = client.get("/api/v1/footprint/latest", headers={"X-User-Id": "test_user"})
    assert response.status_code == 404
    assert "No calculations found" in response.json()["detail"]

@patch("app.api.routes.carbon.assessment_repo")
def test_get_latest_assessment_success(mock_assessment_repo):
    mock_assessment_repo.get_latest_assessment.return_value = get_mock_assessment_dict()
    response = client.get("/api/v1/footprint/assessment/latest", headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["id"] == "ass123"

@patch("app.api.routes.carbon.assessment_repo")
def test_get_latest_assessment_not_found(mock_assessment_repo):
    mock_assessment_repo.get_latest_assessment.return_value = None
    response = client.get("/api/v1/footprint/assessment/latest", headers={"X-User-Id": "test_user"})
    assert response.status_code == 404
    assert "No assessments found" in response.json()["detail"]

@patch("app.api.routes.carbon.progress_repo")
@patch("app.api.routes.carbon.carbon_repo")
@patch("app.api.routes.carbon.assessment_repo")
def test_calculate_footprint_success(mock_assessment_repo, mock_carbon_repo, mock_progress_repo):
    mock_assessment_repo.create_assessment.return_value = get_mock_assessment_dict()
    mock_carbon_repo.create_calculation.return_value = {"id": "calc123"}
    
    payload = get_mock_assessment_dict()
    # Delete id, user_id, created_at since they are read-only / generated on post
    del payload["id"]
    del payload["user_id"]
    del payload["created_at"]
    
    response = client.post("/api/v1/footprint/calculate", json=payload, headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert "data" in response.json()
    assert response.json()["data"]["id"] == "ass123"

def test_calculate_footprint_malformed():
    # Sending empty body which causes Pydantic validation error (422)
    response = client.post("/api/v1/footprint/calculate", json={}, headers={"X-User-Id": "test_user"})
    assert response.status_code == 422

@patch("app.api.routes.carbon.genai.Client")
@patch("app.api.routes.carbon.settings")
def test_food_extract_gemini_success(mock_settings, mock_genai_client_class):
    mock_settings.gemini_api_keys = ["valid_key"]
    
    # Mock Gemini client models generate_content call
    mock_client = MagicMock()
    mock_genai_client_class.return_value = mock_client
    
    mock_response = MagicMock()
    mock_response.text = '{"items": [{"name": "Chicken Breast", "category": "poultry", "confidence": 0.95}]}'
    mock_client.models.generate_content.return_value = mock_response
    
    response = client.post("/api/v1/footprint/food/extract", json={"text": "I ate chicken"})
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert len(response.json()["data"]["items"]) == 1
    assert response.json()["data"]["items"][0]["name"] == "Chicken Breast"

def test_food_extract_fallback():
    # When no key is configured, fallback to keyword parser
    response = client.post("/api/v1/footprint/food/extract", json={"text": "I had beef steak and milk"})
    assert response.status_code == 200
    assert response.json()["success"] is True
    items = response.json()["data"]["items"]
    # Check that it extracted beef and dairy
    cats = [it["category"] for it in items]
    assert "beef" in cats
    assert "dairy" in cats

def test_food_extract_empty():
    response = client.post("/api/v1/footprint/food/extract", json={"text": "   "})
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert len(response.json()["data"]["items"]) == 0


# --- 2. SIMULATOR ROUTE TESTS ---

def test_simulator_calculate_success():
    payload = {
        "levers": {
            "use_metro": True,
            "reduce_meat": True,
            "carpool": False,
            "cycle_days": 2,
            "reduce_electricity": 0,
            "reduce_driving_percentage": 0.0,
            "flight_reduction_count": 0,
            "solar_adoption": False,
            "appliance_optimization": False,
            "reduce_beef_percentage": 0.0,
            "diet_transition": "none",
            "reduce_deliveries_percentage": 0.0,
            "reduce_clothing_percentage": 0.0,
            "reduce_electronics_percentage": 0.0,
            "reduce_electricity_percentage": 0.0
        }
    }
    response = client.post("/api/v1/simulator/calculate", json=payload, headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert "simulated_emissions_kg" in response.json()

@patch("app.api.routes.simulator.simulator_repo")
def test_simulator_scenario_save_success(mock_sim_repo):
    mock_sim_repo.list_scenarios.return_value = []
    mock_sim_repo.create_scenario.return_value = {
        "id": "scen123",
        "user_id": "test_user",
        "base_emissions_kg": 4000.0,
        "simulated_emissions_kg": 3000.0,
        "reduction_percentage": 25.0,
        "money_saved_usd": 150.0,
        "trees_equivalent": 10,
        "emissions_projection": {"six_months": 1500, "one_year": 3000, "five_years": 15000, "ten_years": 30000},
        "savings_projection": {"six_months": 75, "one_year": 150, "five_years": 750, "ten_years": 1500},
        "saved_at": "2026-06-20T20:00:00"
    }
    payload = {
        "name": "My Optimized Commute",
        "levers": {
            "use_metro": True,
            "reduce_meat": False,
            "carpool": True,
            "cycle_days": 0,
            "reduce_electricity": 0,
            "reduce_driving_percentage": 0.0,
            "flight_reduction_count": 0,
            "solar_adoption": False,
            "appliance_optimization": False,
            "reduce_beef_percentage": 0.0,
            "diet_transition": "none",
            "reduce_deliveries_percentage": 0.0,
            "reduce_clothing_percentage": 0.0,
            "reduce_electronics_percentage": 0.0,
            "reduce_electricity_percentage": 0.0
        }
    }
    response = client.post("/api/v1/simulator/scenario", json=payload, headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert response.json()["id"] == "scen123"

@patch("app.api.routes.simulator.simulator_repo")
def test_simulator_scenario_save_limit_exceeded(mock_sim_repo):
    # Mocking 5 pre-existing scenarios to trigger limit error
    mock_sim_repo.list_scenarios.return_value = [{"id": f"s{i}"} for i in range(5)]
    payload = {
        "name": "Limit Breaker",
        "levers": {
            "use_metro": True,
            "reduce_meat": False,
            "carpool": False,
            "cycle_days": 0,
            "reduce_electricity": 0,
            "reduce_driving_percentage": 0.0,
            "flight_reduction_count": 0,
            "solar_adoption": False,
            "appliance_optimization": False,
            "reduce_beef_percentage": 0.0,
            "diet_transition": "none",
            "reduce_deliveries_percentage": 0.0,
            "reduce_clothing_percentage": 0.0,
            "reduce_electronics_percentage": 0.0,
            "reduce_electricity_percentage": 0.0
        }
    }
    response = client.post("/api/v1/simulator/scenario", json=payload, headers={"X-User-Id": "test_user"})
    assert response.status_code == 400
    assert response.json()["detail"] == "MAX_SCENARIOS_EXCEEDED"

@patch("app.api.routes.simulator.simulator_repo")
def test_simulator_scenarios_list(mock_sim_repo):
    mock_sim_repo.list_scenarios.return_value = [
        {
            "id": "s1",
            "user_id": "test_user",
            "base_emissions_kg": 4000.0,
            "simulated_emissions_kg": 3000.0,
            "reduction_percentage": 25.0,
            "money_saved_usd": 150.0,
            "trees_equivalent": 10,
            "emissions_projection": {"six_months": 1500, "one_year": 3000, "five_years": 15000, "ten_years": 30000},
            "savings_projection": {"six_months": 75, "one_year": 150, "five_years": 750, "ten_years": 1500},
            "saved_at": "2026-06-20T20:00:00"
        }
    ]
    response = client.get("/api/v1/simulator/scenarios", headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == "s1"

@patch("app.api.routes.simulator.simulator_repo")
def test_simulator_scenario_delete_success(mock_sim_repo):
    mock_sim_repo.delete_scenario.return_value = True
    response = client.delete("/api/v1/simulator/scenario/s1", headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert response.json()["success"] is True

@patch("app.api.routes.simulator.simulator_repo")
def test_simulator_scenario_delete_not_found(mock_sim_repo):
    mock_sim_repo.delete_scenario.return_value = False
    response = client.delete("/api/v1/simulator/scenario/nonexistent", headers={"X-User-Id": "test_user"})
    assert response.status_code == 404


# --- 3. ECO ACTIONS ROUTE TESTS ---

@patch("app.api.routes.eco.EcoActionsService")
def test_eco_actions_missions_list(mock_eco_service):
    mock_eco_service.get_all_missions.return_value = {
        "suggested": [], "active": [], "completed": []
    }
    response = client.get("/api/v1/eco-actions/missions", headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert "suggested" in response.json()

@patch("app.api.routes.eco.EcoActionsService")
def test_eco_actions_commit_success(mock_eco_service):
    mock_eco_service.commit_mission.return_value = {
        "id": "m123", "user_id": "test_user", "action_id": "use_metro", "title": "Metro Commute",
        "description": "use metro", "source": "dashboard", "status": "active",
        "carbon_reduction_kg": 150, "money_saved_usd": 30, "effort_level": "low",
        "success_probability": 90, "check_ins": []
    }
    payload = {
        "action_id": "use_metro",
        "source": "dashboard",
        "config": {
            "target_frequency": "3 days/week",
            "start_date": "2026-06-20",
            "end_date": "2026-07-20",
            "notes": "Metro only"
        }
    }
    response = client.post("/api/v1/eco-actions/commit", json=payload, headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert response.json()["action_id"] == "use_metro"

@patch("app.api.routes.eco.EcoActionsService")
def test_eco_actions_custom(mock_eco_service):
    mock_eco_service.create_custom_mission.return_value = {
        "id": "c123", "user_id": "test_user", "action_id": "custom", "title": "My custom mission",
        "description": "details", "source": "manual", "status": "active",
        "carbon_reduction_kg": 200, "money_saved_usd": 50, "effort_level": "moderate",
        "success_probability": 85, "check_ins": []
    }
    payload = {
        "title": "My custom mission",
        "description": "details",
        "carbon_reduction_kg": 200,
        "money_saved_usd": 50,
        "effort_level": "moderate",
        "config": {
            "target_frequency": "weekly",
            "start_date": "2026-06-20",
            "end_date": "2026-07-20"
        }
    }
    response = client.post("/api/v1/eco-actions/custom", json=payload, headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert response.json()["title"] == "My custom mission"

@patch("app.api.routes.eco.EcoActionsService")
def test_eco_actions_check_in(mock_eco_service):
    mock_eco_service.check_in_mission.return_value = {
        "id": "m123", "user_id": "test_user", "action_id": "solar", "title": "Solar",
        "description": "solar install", "source": "dashboard", "status": "active",
        "carbon_reduction_kg": 500, "money_saved_usd": 100, "effort_level": "high",
        "success_probability": 80, "check_ins": [{"date": "2026-06-20", "status": "completed", "verified_auto": False}]
    }
    payload = {
        "date": "2026-06-20",
        "status": "completed",
        "verified_auto": False
    }
    response = client.post("/api/v1/eco-actions/check-in/m123", json=payload, headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert len(response.json()["check_ins"]) == 1

@patch("app.api.routes.eco.EcoActionsService")
def test_eco_actions_cancel(mock_eco_service):
    mock_eco_service.cancel_mission.return_value = {"success": True}
    response = client.post("/api/v1/eco-actions/cancel/m123", headers={"X-User-Id": "test_user"})
    assert response.status_code == 200

@patch("app.api.routes.eco.EcoActionsService")
def test_eco_actions_complete(mock_eco_service):
    mock_eco_service.complete_mission.return_value = {
        "id": "m123", "user_id": "test_user", "action_id": "solar", "title": "Solar",
        "description": "solar", "source": "dashboard", "status": "completed",
        "carbon_reduction_kg": 500, "money_saved_usd": 100, "effort_level": "high",
        "success_probability": 80, "check_ins": []
    }
    response = client.post("/api/v1/eco-actions/complete/m123", headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert response.json()["status"] == "completed"


# --- 4. PROGRESS ROUTE TESTS ---

@patch("app.api.routes.progress.progress_repo")
def test_progress_history_seed(mock_prog_repo):
    # Returns empty history first, which triggers seed seeding
    mock_prog_repo.get_history.return_value = []
    mock_prog_repo.add_history_entry.return_value = {
        "id": "seed123", "user_id": "test_user", "date": "2026-06-20",
        "carbon_score": 70, "emissions_kg": 4500.0, "updated_at": "2026-06-20T20:00:00"
    }
    response = client.get("/api/v1/progress/history", headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert len(response.json()["history"]) == 1
    assert response.json()["history"][0]["id"] == "seed123"

@patch("app.api.routes.progress.ProgressService")
def test_progress_overview(mock_progress_service):
    mock_progress_service.get_progress_overview.return_value = {
        "total_carbon_reduced_kg": 150.0,
        "total_money_saved_usd": 40.0,
        "score_improvement": 5,
        "completion_rate": 75.0,
        "comparison": {"baseline": 4500.0, "current": 4350.0, "target": 3500.0, "gap_remaining": 850.0},
        "streaks": {"current_eco_streak": 2, "longest_eco_streak": 4, "completion_streak": 2}
    }
    response = client.get("/api/v1/progress/overview", headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert response.json()["score_improvement"] == 5

@patch("app.api.routes.progress.ProgressService")
def test_progress_performance(mock_progress_service):
    mock_progress_service.get_category_performance.return_value = {"transportation": {"projected_savings_kg": 100, "actual_savings_kg": 90, "variance_percentage": 10}}
    mock_progress_service.get_action_performance.return_value = []
    response = client.get("/api/v1/progress/performance?timeframe=30d", headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert "categories" in response.json()

@patch("app.api.routes.progress.ProgressService")
def test_progress_achievements(mock_progress_service):
    mock_progress_service.get_achievements.return_value = {
        "total_xp": 250, "badges": []
    }
    response = client.get("/api/v1/progress/achievements", headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert response.json()["total_xp"] == 250


# --- 5. CARBON TWIN ROUTE TESTS ---

@patch("app.api.routes.twin.twin_repo")
@patch("app.services.carbon_coach_service.CarbonCoachService")
@patch("app.api.routes.twin.CarbonTwinService")
@patch("app.api.routes.twin.assessment_repo")
def test_carbontwin_apply_simulation(mock_assessment_repo, mock_twin_service, mock_coach_service, mock_twin_repo):
    mock_assessment_repo.get_latest_assessment.return_value = get_mock_assessment_dict()
    
    # Mock service returns
    mock_twin_service.generate_twin.return_value = (
        TwinState(transportation_kg=0, energy_kg=0, food_kg=0, shopping_kg=0, total_kg=0, carbon_score=100),
        TwinState(transportation_kg=0, energy_kg=0, food_kg=0, shopping_kg=0, total_kg=0, carbon_score=100),
        TwinState(transportation_kg=0, energy_kg=0, food_kg=0, shopping_kg=0, total_kg=0, carbon_score=100),
        TwinProfile(archetype="Eco Beginner", strengths=[], weaknesses=[], risk_areas=[], opportunity_areas=[]),
        TwinProfile(archetype="Eco Beginner", strengths=[], weaknesses=[], risk_areas=[], opportunity_areas=[]),
        TwinProfile(archetype="Eco Beginner", strengths=[], weaknesses=[], risk_areas=[], opportunity_areas=[]),
        10.0, 100.0, 5, ["transit"], []
    )
    mock_twin_service.get_profile.return_value = TwinProfile(archetype="Eco Beginner", strengths=[], weaknesses=[], risk_areas=[], opportunity_areas=[])
    mock_coach_service.generate_narrative.return_value = "Optimized Commute Strategy Applied."
    
    payload = {
        "scenario_name": "My Simulation Run",
        "horizon": "1y",
        "levers": {
            "use_metro": True,
            "reduce_meat": False,
            "carpool": False,
            "cycle_days": 0,
            "reduce_electricity": 0,
            "reduce_driving_percentage": 0.0,
            "flight_reduction_count": 0,
            "solar_adoption": False,
            "appliance_optimization": False,
            "reduce_beef_percentage": 0.0,
            "diet_transition": "none",
            "reduce_deliveries_percentage": 0.0,
            "reduce_clothing_percentage": 0.0,
            "reduce_electronics_percentage": 0.0,
            "reduce_electricity_percentage": 0.0
        }
    }
    response = client.post("/api/v1/carbontwin/apply_simulation", json=payload, headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert response.json()["narrative"] == "Optimized Commute Strategy Applied."

@patch("app.api.routes.recommendations.commitments_repo")
def test_dashboard_commit_simulation(mock_commit_repo):
    payload = {
        "use_metro": True,
        "reduce_meat": True,
        "carpool": False,
        "cycle_days": 2,
        "reduce_electricity": 0,
        "reduce_driving_percentage": 0.0,
        "flight_reduction_count": 0,
        "solar_adoption": False,
        "appliance_optimization": False,
        "reduce_beef_percentage": 0.0,
        "diet_transition": "none",
        "reduce_deliveries_percentage": 0.0,
        "reduce_clothing_percentage": 0.0,
        "reduce_electronics_percentage": 0.0,
        "reduce_electricity_percentage": 0.0
    }
    response = client.post("/api/v1/dashboard/commit_simulation", json=payload, headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert response.json()["success"] is True

@patch("app.api.routes.twin.twin_repo")
def test_carbontwin_latest_success(mock_twin_repo):
    mock_twin_repo.get_latest_twin.return_value = {
        "current_state": {"transportation_kg": 0, "energy_kg": 0, "food_kg": 0, "shopping_kg": 0, "total_kg": 0, "carbon_score": 100},
        "future_state": {"transportation_kg": 0, "energy_kg": 0, "food_kg": 0, "shopping_kg": 0, "total_kg": 0, "carbon_score": 100},
        "potential_state": {"transportation_kg": 0, "energy_kg": 0, "food_kg": 0, "shopping_kg": 0, "total_kg": 0, "carbon_score": 100},
        "current_profile": {"archetype": "Balanced Sustainable User", "strengths": [], "weaknesses": [], "risk_areas": [], "opportunity_areas": []},
        "future_profile": {"archetype": "Balanced Sustainable User", "strengths": [], "weaknesses": [], "risk_areas": [], "opportunity_areas": []},
        "potential_profile": {"archetype": "Balanced Sustainable User", "strengths": [], "weaknesses": [], "risk_areas": [], "opportunity_areas": []},
        "reduction_percentage": 15.0,
        "money_saved_usd": 200.0,
        "carbon_score_improvement": 8,
        "applied_rules": ["transit"],
        "recommendations": [],
        "narrative": "Twin narrative content."
    }
    response = client.get("/api/v1/carbontwin/latest", headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert response.json()["reduction_percentage"] == 15.0

@patch("app.services.carbon_coach_service.CarbonCoachService")
@patch("app.api.routes.twin.CarbonTwinService")
@patch("app.api.routes.twin.assessment_repo")
@patch("app.api.routes.twin.twin_repo")
def test_carbontwin_latest_not_found(mock_twin_repo, mock_assessment_repo, mock_twin_service, mock_coach_service):
    mock_twin_repo.get_latest_twin.return_value = None
    mock_assessment_repo.get_latest_assessment.return_value = None
    
    # Mock Twin generation flow
    mock_twin_service.generate_twin.return_value = (
        TwinState(transportation_kg=0, energy_kg=0, food_kg=0, shopping_kg=0, total_kg=0, carbon_score=100),
        TwinState(transportation_kg=0, energy_kg=0, food_kg=0, shopping_kg=0, total_kg=0, carbon_score=100),
        TwinState(transportation_kg=0, energy_kg=0, food_kg=0, shopping_kg=0, total_kg=0, carbon_score=100),
        TwinProfile(archetype="Eco Beginner", strengths=[], weaknesses=[], risk_areas=[], opportunity_areas=[]),
        TwinProfile(archetype="Eco Beginner", strengths=[], weaknesses=[], risk_areas=[], opportunity_areas=[]),
        TwinProfile(archetype="Eco Beginner", strengths=[], weaknesses=[], risk_areas=[], opportunity_areas=[]),
        10.0, 100.0, 5, ["transit"], []
    )
    mock_coach_service.generate_narrative.return_value = "Optimized Commute Strategy Applied."
    mock_twin_repo.create_twin.return_value = {}
    
    response = client.get("/api/v1/carbontwin/latest", headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert response.json()["reduction_percentage"] == 10.0

@patch("app.api.routes.recommendations.commitments_repo")
def test_get_commitments_success(mock_commit_repo):
    mock_commit_repo.get_commitments.return_value = ["use_metro", "solar"]
    response = client.get("/api/v1/dashboard/commitments", headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert len(response.json()) == 2
    assert "use_metro" in response.json()

@patch("app.api.routes.recommendations.commitments_repo")
def test_toggle_commitment_success(mock_commit_repo):
    payload = {"action_id": "solar", "committed": True}
    response = client.post("/api/v1/dashboard/commit", json=payload, headers={"X-User-Id": "test_user"})
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["action_id"] == "solar"
    assert response.json()["committed"] is True


# --- 6. SECURITY: RATE LIMITER & XSS SANITIZATION ---

def test_rate_limiter_block_excessive_requests():
    # Public health endpoint does not have rate limiter, but we can verify
    # a rate-limited route gets blocked when threshold is hit.
    # The register endpoint rate limit is 3 requests / minute.
    # Let's hit it 4 times rapidly to assert 429.
    # Clear limiter first to isolate test
    limiter.requests.clear()
    
    payload = {"email": "rate@example.com", "password": "securepassword", "name": "Rate User"}
    
    # First 3 should pass (or fail with database not found / mock errors, but not 429)
    with patch("app.api.routes.auth.user_repo") as mock_user_repo:
        mock_user_repo.get_user_by_email.return_value = None
        mock_user_repo.create_user.return_value = {
            "id": "uid",
            "email": "rate@example.com",
            "name": "Rate User",
            "providers": ["local"],
            "created_at": "2026-06-20T20:00:00Z",
            "image": None
        }
        
        for _ in range(3):
            response = client.post("/api/v1/auth/register", json=payload)
            assert response.status_code != 429
            
        # 4th request must be blocked with 429 Too Many Requests
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 429
        assert "Too many requests" in response.json()["detail"]

def test_xss_escaping_on_schemas():
    # When sending a custom scenario with XSS payloads, Pydantic model validator
    # should escape the HTML tags automatically.
    # Check scenario creation XSS payload escaping
    from app.schemas.simulator import ScenarioSaveRequest, SimulatorLevers
    
    xss_payload = ScenarioSaveRequest(
        name="<script>alert('XSS')</script>",
        levers=SimulatorLevers()
    )
    
    # Assert string has been HTML escaped
    assert "<script>" not in xss_payload.name
    assert "&lt;script&gt;" in xss_payload.name
    assert "&#x27;XSS&#x27;" in xss_payload.name or "&#x27;XSS&#x27;" in xss_payload.name
