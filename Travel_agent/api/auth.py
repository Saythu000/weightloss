"""
FastAPI Security & Authentication Verification Dependencies
"""

from fastapi import Security, HTTPException, status
from fastapi.security.api_key import APIKeyHeader
import os

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)


async def verify_api_key(api_key_header: str = Security(api_key_header)):
    """Validates X-API-Key header against server environment config."""
    expected_key = os.environ.get("TREKATOUR_API_KEY", "trekatour_secret_key_2026")
    if api_key_header == expected_key:
        return api_key_header
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Unauthorized access: Invalid or missing API key.",
    )
