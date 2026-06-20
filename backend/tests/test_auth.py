import os
import datetime
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@patch("app.api.routes.auth.user_repo")
def test_register_user_success(mock_user_repo):
    # Mock get_user_by_email to return None (user doesn't exist yet)
    mock_user_repo.get_user_by_email.return_value = None
    
    # Mock create_user to return mock created user
    mock_user_repo.create_user.return_value = {
        "id": "new_user@example.com",
        "email": "new_user@example.com",
        "name": "Jane Doe",
        "hashed_password": "some_hashed_password",
        "providers": ["local"],
        "created_at": "2026-06-20T12:00:00Z",
        "image": None
    }

    response = client.post("/api/v1/auth/register", json={
        "email": "new_user@example.com",
        "password": "securepassword",
        "name": "Jane Doe"
    })

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "new_user@example.com"
    assert data["name"] == "Jane Doe"
    assert "local" in data["providers"]
    assert "password" not in data

@patch("app.api.routes.auth.user_repo")
def test_register_user_duplicate_email(mock_user_repo):
    # Mock get_user_by_email to return an existing user
    mock_user_repo.get_user_by_email.return_value = {"email": "duplicate@example.com"}

    response = client.post("/api/v1/auth/register", json={
        "email": "duplicate@example.com",
        "password": "password123",
        "name": "Dupe"
    })

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

@patch("app.api.routes.auth.user_repo")
def test_login_user_success(mock_user_repo):
    # Hash password with bcrypt to match database format
    import bcrypt
    plain_pw = "mysecret"
    hashed = bcrypt.hashpw(plain_pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    mock_user_repo.get_user_by_email.return_value = {
        "id": "login@example.com",
        "email": "login@example.com",
        "name": "User Login",
        "hashed_password": hashed,
        "providers": ["local"],
        "created_at": "2026-06-20T12:00:00Z",
        "image": None
    }

    response = client.post("/api/v1/auth/login", json={
        "email": "login@example.com",
        "password": plain_pw
    })

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "login@example.com"
    assert data["name"] == "User Login"

@patch("app.api.routes.auth.user_repo")
def test_login_user_wrong_password(mock_user_repo):
    mock_user_repo.get_user_by_email.return_value = {
        "id": "wrongpass@example.com",
        "email": "wrongpass@example.com",
        "name": "User Wrong Pass",
        "hashed_password": "hashed_wrong_password",
        "providers": ["local"],
        "created_at": "2026-06-20T12:00:00Z"
    }

    response = client.post("/api/v1/auth/login", json={
        "email": "wrongpass@example.com",
        "password": "wrong_plain_password"
    })

    assert response.status_code == 400
    assert "Invalid email or password" in response.json()["detail"]

@patch("app.api.routes.auth.user_repo")
def test_google_login_new_user(mock_user_repo):
    mock_user_repo.get_user_by_email.return_value = None
    mock_user_repo.create_user.return_value = {
        "id": "google_user@example.com",
        "email": "google_user@example.com",
        "name": "Google User",
        "providers": ["google"],
        "created_at": "2026-06-20T12:00:00Z",
        "image": "https://lh3.googleusercontent.com/avatar"
    }

    response = client.post("/api/v1/auth/google-login", json={
        "email": "google_user@example.com",
        "name": "Google User",
        "image": "https://lh3.googleusercontent.com/avatar",
        "google_id": "google-id-1234"
    })

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "google_user@example.com"
    assert "google" in data["providers"]
    assert data["image"] == "https://lh3.googleusercontent.com/avatar"

@patch("app.api.routes.auth.user_repo")
def test_google_login_link_account(mock_user_repo):
    # Existing local-only user
    mock_user_repo.get_user_by_email.return_value = {
        "id": "link@example.com",
        "email": "link@example.com",
        "name": "Link User",
        "hashed_password": "local_hashed_password",
        "providers": ["local"],
        "created_at": "2026-06-20T12:00:00Z",
        "image": None
    }

    response = client.post("/api/v1/auth/google-login", json={
        "email": "link@example.com",
        "name": "Link User",
        "image": "https://lh3.googleusercontent.com/avatar",
        "google_id": "google-id-1234"
    })

    assert response.status_code == 200
    # UserRepository.update_user_providers should have been called
    mock_user_repo.update_user_providers.assert_called_once_with("link@example.com", ["local", "google"])
