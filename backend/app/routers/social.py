"""Social features: market comments, user follows, public profiles, avatar upload."""
import os
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Comment, Follow, User
from ..security import get_current_user, optional_user

router = APIRouter(tags=["social"])

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/data/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_BYTES = 5 * 1024 * 1024
ALLOWED = {"image/jpeg", "image/png", "image/webp", "image/gif"}


class CommentIn(BaseModel):
    text: str = Field(min_length=1, max_length=500)


# ── comments ────────────────────────────────────────────────────────────────

@router.get("/markets/{market_id}/comments")
async def list_comments(market_id: str, db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Comment, User.display_name, User.avatar_url)
            .join(User, User.id == Comment.user_id)
            .where(Comment.market_id == market_id)
            .order_by(Comment.created_at.desc())
            .limit(100)
        )
    ).all()
    return {
        "items": [
            {
                "id": c.id,
                "user_id": c.user_id,
                "display_name": name,
                "avatar_url": avatar,
                "text": c.text,
                "created_at": c.created_at.isoformat(),
            }
            for c, name, avatar in rows
        ]
    }


@router.post("/markets/{market_id}/comments", status_code=201)
async def post_comment(
    market_id: str,
    body: CommentIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c = Comment(market_id=market_id, user_id=user.id, text=body.text.strip())
    db.add(c)
    await db.commit()
    return {
        "id": c.id,
        "user_id": user.id,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "text": c.text,
        "created_at": c.created_at.isoformat(),
    }


@router.delete("/comments/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c = await db.get(Comment, comment_id)
    if c is None:
        raise HTTPException(404, "NOT_FOUND")
    if c.user_id != user.id and not user.is_admin:
        raise HTTPException(403, "FORBIDDEN")
    await db.delete(c)
    await db.commit()


# ── follows ──────────────────────────────────────────────────────────────────

@router.post("/users/{user_id}/follow", status_code=201)
async def follow_user(
    user_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == user.id:
        raise HTTPException(400, "CANNOT_FOLLOW_SELF")
    if not await db.get(User, user_id):
        raise HTTPException(404, "USER_NOT_FOUND")
    exists = await db.scalar(
        select(Follow).where(Follow.follower_id == user.id, Follow.following_id == user_id)
    )
    if exists:
        return {"status": "already_following"}
    db.add(Follow(follower_id=user.id, following_id=user_id))
    await db.commit()
    return {"status": "following"}


@router.delete("/users/{user_id}/follow", status_code=204)
async def unfollow_user(
    user_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    f = await db.scalar(
        select(Follow).where(Follow.follower_id == user.id, Follow.following_id == user_id)
    )
    if f is None:
        raise HTTPException(404, "NOT_FOLLOWING")
    await db.delete(f)
    await db.commit()


# ── public profile ───────────────────────────────────────────────────────────

@router.get("/users/{user_id}/profile")
async def public_profile(
    user_id: str,
    viewer: User | None = Depends(optional_user),
    db: AsyncSession = Depends(get_db),
):
    u = await db.get(User, user_id)
    if u is None:
        raise HTTPException(404, "USER_NOT_FOUND")
    followers = await db.scalar(
        select(func.count()).select_from(Follow).where(Follow.following_id == user_id)
    )
    following = await db.scalar(
        select(func.count()).select_from(Follow).where(Follow.follower_id == user_id)
    )
    is_following = False
    if viewer and viewer.id != user_id:
        is_following = bool(await db.scalar(
            select(Follow).where(Follow.follower_id == viewer.id, Follow.following_id == user_id)
        ))
    return {
        "id": u.id,
        "display_name": u.display_name,
        "avatar_url": u.avatar_url,
        "followers": followers or 0,
        "following": following or 0,
        "is_following": is_following,
        "joined": u.created_at.isoformat(),
    }


@router.get("/users/{user_id}/followers")
async def list_followers(user_id: str, db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(User.id, User.display_name, User.avatar_url)
            .join(Follow, Follow.follower_id == User.id)
            .where(Follow.following_id == user_id)
            .limit(50)
        )
    ).all()
    return {"items": [{"id": r[0], "display_name": r[1], "avatar_url": r[2]} for r in rows]}


@router.get("/users/{user_id}/following")
async def list_following(user_id: str, db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(User.id, User.display_name, User.avatar_url)
            .join(Follow, Follow.following_id == User.id)
            .where(Follow.follower_id == user_id)
            .limit(50)
        )
    ).all()
    return {"items": [{"id": r[0], "display_name": r[1], "avatar_url": r[2]} for r in rows]}


# ── avatar upload ─────────────────────────────────────────────────────────────

@router.post("/users/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in ALLOWED:
        raise HTTPException(400, "UNSUPPORTED_FILE_TYPE")
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(400, "FILE_TOO_LARGE")
    ext = (file.content_type or "image/jpeg").split("/")[-1].replace("jpeg", "jpg")
    filename = f"{user.id}.{ext}"
    (UPLOAD_DIR / filename).write_bytes(data)
    user.avatar_url = f"/uploads/{filename}"
    db.add(user)
    await db.commit()
    return {"avatar_url": user.avatar_url}


# ── update display name ───────────────────────────────────────────────────────

class ProfileIn(BaseModel):
    display_name: str = Field(min_length=2, max_length=50)


@router.patch("/users/me")
async def update_profile(
    body: ProfileIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user.display_name = body.display_name.strip()
    db.add(user)
    await db.commit()
    return {"display_name": user.display_name}
