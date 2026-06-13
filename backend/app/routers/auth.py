import os
import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import AuditLog, User, Wallet
from ..security import create_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

# Dev mode: no Resend key → verification code is returned in the response
# and printed to the server log instead of being emailed.
DEV_MODE = not os.environ.get("RESEND_API_KEY")


class RegisterIn(BaseModel):
    email: str = Field(min_length=5, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=2, max_length=50)


class VerifyIn(BaseModel):
    email: str
    code: str = Field(min_length=6, max_length=6)


class LoginIn(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    user: dict


def user_dto(u: User) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "display_name": u.display_name,
        "is_admin": u.is_admin,
        "is_verified": u.is_verified,
        "avatar_url": u.avatar_url,
    }


@router.post("/register", status_code=201)
async def register(body: RegisterIn, db: AsyncSession = Depends(get_db)):
    existing = await db.scalar(select(User).where(User.email == body.email.lower()))
    if existing:
        raise HTTPException(409, "EMAIL_TAKEN")

    code = f"{secrets.randbelow(1_000_000):06d}"
    user = User(
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        display_name=body.display_name,
        verification_code=code,
    )
    db.add(user)
    await db.flush()
    db.add(Wallet(user_id=user.id))
    db.add(AuditLog(action="auth.register", user_id=user.id))
    await db.commit()

    print(f"[utabiri] verification code for {user.email}: {code}")
    out: dict = {"message": "Verification code sent to email"}
    if DEV_MODE:
        out["dev_verification_code"] = code
    return out


@router.post("/verify-email")
async def verify_email(body: VerifyIn, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or user.verification_code != body.code:
        raise HTTPException(400, "CODE_INVALID")
    user.is_verified = True
    user.verification_code = None
    db.add(AuditLog(action="auth.verified", user_id=user.id))
    await db.commit()
    return {"message": "Email verified"}


@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "INVALID_CREDENTIALS")
    if not user.is_verified:
        raise HTTPException(403, "EMAIL_NOT_VERIFIED")
    db.add(AuditLog(action="auth.login", user_id=user.id))
    await db.commit()
    return TokenOut(
        access_token=create_token(user.id, user.is_admin), user=user_dto(user)
    )


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return user_dto(user)
