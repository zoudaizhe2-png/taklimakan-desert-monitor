"""Authentication routes — register, login, me, update preferences."""

import json
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rate_limit import limiter
from database import get_db
from models.user import User
from auth import hash_password, verify_password, create_access_token, require_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    display_name: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdatePreferencesRequest(BaseModel):
    language: str | None = None
    theme: str | None = None
    last_view: str | None = None


@router.post("/register")
@limiter.limit("10/minute")
async def register(request: Request, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user."""
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=body.email,
        display_name=body.display_name,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.id})
    return {"token": token, "user": user.to_dict()}


@router.post("/login")
@limiter.limit("20/minute")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email/password."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.id})
    return {"token": token, "user": user.to_dict()}


@router.get("/me")
async def get_me(user: User = Depends(require_user)):
    """Get current user profile."""
    return user.to_dict()


@router.put("/preferences")
async def update_preferences(
    body: UpdatePreferencesRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user preferences (language, theme, last_view)."""
    prefs = json.loads(user.preferences_json) if user.preferences_json else {}
    if body.language is not None:
        prefs["language"] = body.language
    if body.theme is not None:
        prefs["theme"] = body.theme
    if body.last_view is not None:
        prefs["last_view"] = body.last_view
    user.preferences_json = json.dumps(prefs)
    await db.commit()
    return {"preferences": prefs}
