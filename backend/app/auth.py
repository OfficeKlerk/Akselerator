from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import COOKIE_SECURE, SECRET_KEY
from .db import User, get_session

COOKIE = "access_token"
TTL = timedelta(days=7)

hasher = PasswordHasher()
router = APIRouter(prefix="/auth")
Db = Annotated[Session, Depends(get_session)]


class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    company: str | None = Field(default=None, max_length=200)
    pd_consent: Literal[True]


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=200)


def _public(u: User) -> dict:
    return {"id": u.id, "email": u.email, "full_name": u.full_name, "company": u.company}


def _set_cookie(response: Response, user: User) -> None:
    token = jwt.encode(
        {"sub": user.id, "exp": datetime.now(timezone.utc) + TTL}, SECRET_KEY, algorithm="HS256"
    )
    response.set_cookie(
        COOKIE,
        token,
        max_age=int(TTL.total_seconds()),
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
    )


def current_user(db: Db, access_token: Annotated[str | None, Cookie()] = None) -> User:
    try:
        user_id = jwt.decode(access_token or "", SECRET_KEY, algorithms=["HS256"])["sub"]
    except jwt.InvalidTokenError:
        user_id = None
    user = db.get(User, user_id) if user_id else None
    if user is None:
        raise HTTPException(401, "Не авторизован")
    return user


CurrentUser = Annotated[User, Depends(current_user)]


@router.post("/register", status_code=201)
def register(body: RegisterIn, response: Response, db: Db):
    user = User(
        email=body.email.lower(),
        password_hash=hasher.hash(body.password),
        full_name=body.full_name.strip(),
        company=body.company or None,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        raise HTTPException(409, "Пользователь с таким email уже зарегистрирован") from None
    _set_cookie(response, user)
    return _public(user)


@router.post("/login")
def login(body: LoginIn, response: Response, db: Db):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    try:
        if user is None:
            raise VerifyMismatchError
        hasher.verify(user.password_hash, body.password)
    except VerifyMismatchError:
        raise HTTPException(401, "Неверный email или пароль") from None
    _set_cookie(response, user)
    return _public(user)


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(COOKIE)


@router.get("/me")
def me(user: CurrentUser):
    return _public(user)
