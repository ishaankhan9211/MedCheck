"""
Verifies the Supabase session token the frontend sends as:
    Authorization: Bearer <access_token>

This calls Supabase's Auth REST endpoint (GET /auth/v1/user) directly
with our own httpx.AsyncClient, rather than going through supabase-py's
internal auth client. That internal client intermittently raised
"ConnectionTerminated" errors under normal traffic (a stale/closed HTTP
connection being reused) -- a known class of issue with long-lived HTTP
clients in a running server process. httpx.AsyncClient's own connection
pool handles a closed connection by transparently reconnecting, and this
version also retries once on a transport-level failure as a second line
of defense, so a real "invalid session" (401 from Supabase) and a
transient network hiccup are no longer both reported as one thing.
"""
import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .config import settings

_security = HTTPBearer()

# Shared across requests; httpx.AsyncClient manages its own connection
# pool and re-establishes connections as needed.
_http_client = httpx.AsyncClient(timeout=10)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> dict:
    token = credentials.credentials
    url = f"{settings.SUPABASE_URL}/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": settings.SUPABASE_SECRET_KEY,
    }

    response = None
    last_error = None
    for attempt in range(2):
        try:
            response = await _http_client.get(url, headers=headers)
            break
        except httpx.TransportError as exc:
            last_error = exc
            continue

    if response is None:
        raise HTTPException(
            status_code=503,
            detail=f"Could not reach Supabase Auth (network issue): {last_error}. Please try again.",
        )

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please log in again.")

    user = response.json()
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")

    return {"id": user_id, "email": user.get("email")}
