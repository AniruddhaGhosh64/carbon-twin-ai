import time
import html
from collections import defaultdict
from fastapi import Request, HTTPException, status

class InMemLimiter:
    def __init__(self):
        # Maps key (e.g. "IP:UserId:Path") -> list of timestamps
        self.requests = defaultdict(list)

    def is_allowed(self, key: str, limit: int, timeframe: int) -> bool:
        now = time.time()
        # Keep only timestamps in the current window
        cutoff = now - timeframe
        self.requests[key] = [t for t in self.requests[key] if t > cutoff]
        
        if len(self.requests[key]) >= limit:
            return False
            
        self.requests[key].append(now)
        return True

limiter = InMemLimiter()

def rate_limiter(limit: int, timeframe: int = 60):
    def dependency(request: Request):
        # Get x-user-id header or default to anonymous
        user_id = request.headers.get("x-user-id", "anonymous")
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        
        # Combine client IP, user ID, and path for rate limiting boundaries
        key = f"{client_ip}:{user_id}:{path}"
        
        if not limiter.is_allowed(key, limit, timeframe):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later."
            )
    return dependency

def sanitize_string(value: str) -> str:
    """
    HTML escapes a string value to prevent cross-site scripting (XSS).
    """
    if isinstance(value, str):
        return html.escape(value.strip())
    return value
