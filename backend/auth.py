import os

from fastapi import Header, HTTPException, status


def require_admin(x_admin_key: str = Header(...)):
    expected = os.getenv("ADMIN_KEY", "")
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ADMIN_KEY is not configured on the server.",
        )
    if x_admin_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin key.",
        )
