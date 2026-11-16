import re
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import APIRouter, FastAPI, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import select

from . import auth, nspd
from .auth import CurrentUser, Db
from .db import Check, init_db
from .pipeline import run_check
from .report import render_pdf

CADASTRAL = r"^\d{2}:\d{2}:\d{6,7}:\d{1,7}$"


class CheckIn(BaseModel):
    cadastral_number: str = Field(pattern=CADASTRAL)
    purpose: Literal["warehouse", "izhs", "mkd"]


def _summary(c: Check) -> dict:
    return {
        "id": c.id,
        "cadastral_number": c.cadastral_number,
        "purpose": c.purpose,
        "status": c.status,
        "address": c.address,
        "overall_level": c.overall_level,
        "created_at": c.created_at.isoformat(),
    }


def _own_check(db, user, check_id: str) -> Check:
    check = db.get(Check, check_id)
    # чужая проверка — тоже 404, чтобы не раскрывать её существование
    if check is None or check.user_id != user.id:
        raise HTTPException(404, "Проверка не найдена")
    return check


api = APIRouter(prefix="/api")
api.include_router(auth.router)


@api.get("/parcels")
def parcel(user: CurrentUser, cadastral_number: str = Query(pattern=CADASTRAL)):
    try:
        return nspd.fetch_parcel(cadastral_number)
    except nspd.ParcelError as e:
        raise HTTPException(e.status, str(e)) from None


@api.get("/parcels/at-point")
def parcel_at_point(user: CurrentUser, lat: float = Query(ge=-90, le=90), lng: float = Query(ge=-180, le=180)):
    try:
        return nspd.fetch_parcel_at(lat, lng)
    except nspd.ParcelError as e:
        raise HTTPException(e.status, str(e)) from None


@api.get("/checks")
def list_checks(user: CurrentUser, db: Db):
    checks = db.scalars(
        select(Check).where(Check.user_id == user.id).order_by(Check.created_at.desc())
    )
    return [_summary(c) for c in checks]


@api.post("/checks", status_code=202)
def create_check(body: CheckIn, user: CurrentUser, db: Db):
    check = Check(user_id=user.id, **body.model_dump())
    db.add(check)
    db.commit()
    try:
        run_check.delay(check.id)
    except Exception:
        # очередь недоступна — не оставляем проверку висеть в статусе «в очереди»
        check.status, check.stage_message, check.error = "failed", None, "Сервис проверки временно недоступен."
        db.commit()
        raise HTTPException(503, "Сервис проверки временно недоступен. Попробуйте позже.") from None
    return {"id": check.id, "status": "queued"}


@api.get("/checks/{check_id}")
def get_check(check_id: str, user: CurrentUser, db: Db):
    check = _own_check(db, user, check_id)
    return {
        **_summary(check),
        "stage_message": check.stage_message,
        "error": check.error,
        "report": check.report,
    }


@api.get("/checks/{check_id}/report.pdf")
def report_pdf(check_id: str, user: CurrentUser, db: Db):
    check = _own_check(db, user, check_id)
    if check.report is None:
        raise HTTPException(409, "Отчёт ещё не готов")
    filename = "pravozor-" + re.sub(r"\D", "-", check.cadastral_number) + ".pdf"
    return Response(
        render_pdf(check.report, check.purpose),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="ПРАВОЗОР API", lifespan=lifespan)
app.include_router(api)
