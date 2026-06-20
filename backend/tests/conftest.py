import pytest
from app.core.security import limiter

@pytest.fixture(autouse=True)
def reset_limiter():
    """
    Autouse fixture to clear the in-memory rate limiter's request history
    before each test. This prevents test isolation issues (e.g. 429 Too Many Requests)
    caused by shared rate limiting state between test files.
    """
    limiter.requests.clear()
