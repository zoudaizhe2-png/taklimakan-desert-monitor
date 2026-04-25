"""JWT authentication utilities."""

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.user import User

logger = logging.getLogger(__name__)

# Fail-fast JWT secret loading.
# - In production (ENV=production), JWT_SECRET MUST be set or app refuses to start.
# - In dev/test, fall back to insecure default but emit a loud warning.
_DEV_FALLBACK_SECRET = "dev-secret-change-in-production"
_ENV = os.environ.get("ENV", "development").lower()
SECRET_KEY = os.environ.get("JWT_SECRET")

if not SECRET_KEY:
    if _ENV == "production":
        raise RuntimeError(
            "JWT_SECRET environment variable is required in production. "
            "Set a strong random secret (e.g. `openssl rand -hex 32`) before starting the app."
        )
    logger.warning(
        "JWT_SECRET not set — falling back to INSECURE dev default. "
        "Never run this in production without setting JWT_SECRET."
    )
    SECRET_KEY = _DEV_FALLBACK_SECRET

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Extract user from JWT token. Returns None if not authenticated (optional auth)."""
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            return None
        user_id = int(sub)
    except (JWTError, ValueError, TypeError):
        return None

    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def require_user(
    user: Optional[User] = Depends(get_current_user),
) -> User:
    """Require authentication — raises 401 if not logged in."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
