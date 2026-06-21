import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException

from app.repositories.user_repository import UserRepository
from app.repositories.assessment_repository import AssessmentRepository
from app.repositories.carbon_repository import CarbonRepository
from app.repositories.commitments_repository import CommitmentsRepository
from app.repositories.progress_repository import ProgressRepository
from app.repositories.simulator_repository import SimulatorRepository
from app.repositories.twin_repository import TwinRepository

def test_base_repository_error_handling():
    from app.repositories.base_repository import BaseRepository
    repo = BaseRepository("test_collection")
    with pytest.raises(HTTPException) as exc:
        repo._handle_error("some_op", Exception("test error"))
    assert exc.value.status_code == 500
    assert "Database error" in exc.value.detail

def test_user_repository():
    repo = UserRepository()
    mock_coll = MagicMock()
    repo.collection = mock_coll

    # get_user_by_email success
    mock_doc = MagicMock()
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {"email": "test@example.com"}
    mock_doc.id = "test@example.com"
    mock_coll.document.return_value.get.return_value = mock_doc
    res = repo.get_user_by_email("test@example.com")
    assert res is not None
    assert res["id"] == "test@example.com"

    # get_user_by_email not found
    mock_doc.exists = False
    assert repo.get_user_by_email("notfound@example.com") is None

    # get_user_by_email exception
    mock_coll.document.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.get_user_by_email("error@example.com")
    mock_coll.document.side_effect = None

    # get_user_by_id success
    mock_doc.exists = True
    mock_doc.id = "uid123"
    res = repo.get_user_by_id("uid123")
    assert res is not None
    assert res["id"] == "uid123"

    # get_user_by_id exception
    mock_coll.document.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.get_user_by_id("uid123")
    mock_coll.document.side_effect = None

    # create_user success
    res = repo.create_user({"email": "New@example.com", "name": "New User"})
    assert res["id"] == "new@example.com"

    # create_user exception
    mock_coll.document.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.create_user({"email": "New@example.com"})
    mock_coll.document.side_effect = None

    # update_user_providers success
    res = repo.update_user_providers("test@example.com", ["google"])
    assert res is True

    # update_user_providers exception
    mock_coll.document.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.update_user_providers("test@example.com", ["google"])
    mock_coll.document.side_effect = None

def test_assessment_repository():
    repo = AssessmentRepository()
    mock_coll = MagicMock()
    repo.collection = mock_coll

    # create_assessment success
    mock_doc_ref = MagicMock()
    mock_doc_ref.id = "ass_doc_id"
    mock_coll.document.return_value = mock_doc_ref
    res = repo.create_assessment("user123", {"transportation": {}})
    assert res["id"] == "ass_doc_id"
    assert res["user_id"] == "user123"

    # create_assessment exception
    mock_coll.document.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.create_assessment("user123", {})
    mock_coll.document.side_effect = None

    # get_latest_assessment success
    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {"id": "ass1", "created_at": "2026-06-20T20:00:00"}
    mock_doc2 = MagicMock()
    mock_doc2.to_dict.return_value = {"id": "ass2", "created_at": "2026-06-21T20:00:00"}
    mock_coll.where.return_value.stream.return_value = [mock_doc, mock_doc2]
    res = repo.get_latest_assessment("user123")
    assert res["id"] == "ass2"

    # get_latest_assessment not found
    mock_coll.where.return_value.stream.return_value = []
    assert repo.get_latest_assessment("user123") is None

    # get_latest_assessment exception
    mock_coll.where.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.get_latest_assessment("user123")
    mock_coll.where.side_effect = None

def test_carbon_repository():
    repo = CarbonRepository()
    mock_coll = MagicMock()
    repo.collection = mock_coll

    # create_calculation success
    mock_doc_ref = MagicMock()
    mock_doc_ref.id = "calc_doc_id"
    mock_coll.document.return_value = mock_doc_ref
    res = repo.create_calculation("user123", "ass123", {"total_kg": 100})
    assert res["id"] == "calc_doc_id"
    assert res["assessment_id"] == "ass123"

    # create_calculation exception
    mock_coll.document.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.create_calculation("user123", "ass123", {})
    mock_coll.document.side_effect = None

    # get_latest_calculation success
    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {"id": "calc1", "calculated_at": "2026-06-20T20:00:00"}
    mock_doc2 = MagicMock()
    mock_doc2.to_dict.return_value = {"id": "calc2", "calculated_at": "2026-06-21T20:00:00"}
    mock_coll.where.return_value.stream.return_value = [mock_doc, mock_doc2]
    res = repo.get_latest_calculation("user123")
    assert res["id"] == "calc2"

    # get_latest_calculation not found
    mock_coll.where.return_value.stream.return_value = []
    assert repo.get_latest_calculation("user123") is None

    # get_latest_calculation exception
    mock_coll.where.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.get_latest_calculation("user123")
    mock_coll.where.side_effect = None

def test_commitments_repository():
    repo = CommitmentsRepository()
    mock_coll = MagicMock()
    mock_missions = MagicMock()
    repo.collection = mock_coll
    repo.missions_collection = mock_missions

    # get_commitments success
    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {"action_id": "solar", "committed": True}
    mock_doc2 = MagicMock()
    mock_doc2.to_dict.return_value = {"action_id": "diet", "committed": False}
    mock_coll.where.return_value.stream.return_value = [mock_doc, mock_doc2]
    res = repo.get_commitments("user123")
    assert res == ["solar"]

    # get_commitments exception
    mock_coll.where.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.get_commitments("user123")
    mock_coll.where.side_effect = None

    # set_commitment success
    res = repo.set_commitment("user123", "solar", True)
    assert res["id"] == "user123_solar"

    # set_commitment exception
    mock_coll.document.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.set_commitment("user123", "solar", True)
    mock_coll.document.side_effect = None

    # get_missions success
    mock_m_doc = MagicMock()
    mock_m_doc.exists = True
    mock_m_doc.to_dict.return_value = {"id": "m1"}
    mock_missions.where.return_value.stream.return_value = [mock_m_doc]
    res = repo.get_missions("user123")
    assert len(res) == 1
    assert res[0]["id"] == "m1"

    # get_missions exception
    mock_missions.where.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.get_missions("user123")
    mock_missions.where.side_effect = None

    # get_mission success
    mock_m_doc = MagicMock()
    mock_m_doc.exists = True
    mock_m_doc.to_dict.return_value = {"id": "m1"}
    mock_missions.document.return_value.get.return_value = mock_m_doc
    res = repo.get_mission("user123", "m1")
    assert res is not None
    assert res["id"] == "m1"

    # get_mission not found
    mock_m_doc.exists = False
    assert repo.get_mission("user123", "m1") is None

    # get_mission exception
    mock_missions.document.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.get_mission("user123", "m1")
    mock_missions.document.side_effect = None

    # save_mission success
    res = repo.save_mission("user123", {"id": "m1", "title": "solar"})
    assert res["id"] == "m1"

    # save_mission exception
    mock_missions.document.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.save_mission("user123", {"id": "m1"})
    mock_missions.document.side_effect = None

    # delete_mission success
    mock_doc_get = MagicMock()
    mock_doc_get.exists = True
    mock_missions.document.return_value.get.return_value = mock_doc_get
    res = repo.delete_mission("user123", "m1")
    assert res is True

    # delete_mission not found
    mock_doc_get.exists = False
    res = repo.delete_mission("user123", "m1")
    assert res is False

    # delete_mission exception
    mock_missions.document.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.delete_mission("user123", "m1")
    mock_missions.document.side_effect = None

def test_progress_repository():
    repo = ProgressRepository()
    mock_coll = MagicMock()
    repo.collection = mock_coll

    # add_history_entry success
    res = repo.add_history_entry("user123", "2026-06-20", 85, 2000.0)
    assert res["id"] == "user123_2026-06-20"

    # add_history_entry exception
    mock_coll.document.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.add_history_entry("user123", "2026-06-20", 85, 2000.0)
    mock_coll.document.side_effect = None

    # get_history success
    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {"date": "2026-06-20"}
    mock_doc2 = MagicMock()
    mock_doc2.to_dict.return_value = {"date": "2026-06-19"}
    mock_coll.where.return_value.stream.return_value = [mock_doc, mock_doc2]
    res = repo.get_history("user123")
    assert res[0]["date"] == "2026-06-19"
    assert res[1]["date"] == "2026-06-20"

    # get_history exception
    mock_coll.where.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.get_history("user123")
    mock_coll.where.side_effect = None

def test_simulator_repository():
    repo = SimulatorRepository()
    mock_coll = MagicMock()
    repo.collection = mock_coll

    # create_scenario success
    mock_doc_ref = MagicMock()
    mock_doc_ref.id = "scen_doc_id"
    mock_coll.document.return_value = mock_doc_ref
    res = repo.create_scenario("user123", {"name": "scen1"})
    assert res["id"] == "scen_doc_id"
    assert res["name"] == "scen1"

    # create_scenario exception
    mock_coll.document.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.create_scenario("user123", {})
    mock_coll.document.side_effect = None

    # list_scenarios success
    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {"saved_at": "2026-06-20T20:00:00"}
    mock_doc2 = MagicMock()
    mock_doc2.to_dict.return_value = {"saved_at": "2026-06-21T20:00:00"}
    mock_coll.where.return_value.stream.return_value = [mock_doc, mock_doc2]
    res = repo.list_scenarios("user123")
    assert res[0]["saved_at"] == "2026-06-21T20:00:00"

    # list_scenarios exception
    mock_coll.where.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.list_scenarios("user123")
    mock_coll.where.side_effect = None

    # delete_scenario success
    mock_doc_ref = MagicMock()
    mock_doc = MagicMock()
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {"user_id": "user123"}
    mock_doc_ref.get.return_value = mock_doc
    mock_coll.document.return_value = mock_doc_ref
    res = repo.delete_scenario("user123", "scen1")
    assert res is True

    # delete_scenario not found
    mock_doc.exists = False
    res = repo.delete_scenario("user123", "scen1")
    assert res is False

    # delete_scenario wrong user
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {"user_id": "other_user"}
    res = repo.delete_scenario("user123", "scen1")
    assert res is False

    # delete_scenario exception
    mock_coll.document.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.delete_scenario("user123", "scen1")
    mock_coll.document.side_effect = None

def test_twin_repository():
    repo = TwinRepository()
    mock_coll = MagicMock()
    repo.collection = mock_coll

    # create_twin success
    mock_doc_ref = MagicMock()
    mock_doc_ref.id = "twin_doc_id"
    mock_coll.document.return_value = mock_doc_ref
    res = repo.create_twin("user123", {"reduction_percentage": 10.0})
    assert res["id"] == "twin_doc_id"
    assert res["reduction_percentage"] == 10.0

    # create_twin exception
    mock_coll.document.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.create_twin("user123", {})
    mock_coll.document.side_effect = None

    # get_latest_twin success
    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {"id": "twin1", "generated_at": "2026-06-20T20:00:00"}
    mock_doc2 = MagicMock()
    mock_doc2.to_dict.return_value = {"id": "twin2", "generated_at": "2026-06-21T20:00:00"}
    mock_coll.where.return_value.stream.return_value = [mock_doc, mock_doc2]
    res = repo.get_latest_twin("user123")
    assert res["id"] == "twin2"

    # get_latest_twin not found
    mock_coll.where.return_value.stream.return_value = []
    assert repo.get_latest_twin("user123") is None

    # get_latest_twin exception
    mock_coll.where.side_effect = Exception("db error")
    with pytest.raises(HTTPException):
        repo.get_latest_twin("user123")
    mock_coll.where.side_effect = None
