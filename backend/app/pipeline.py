"""Фоновый расчёт отчёта: НСПД → пересечение с зонами в PostGIS → правила."""

import json
import logging

from celery import Celery
from sqlalchemy import text

from . import nspd, rules
from .config import CELERY_EAGER, REDIS_URL
from .db import Check, Session

log = logging.getLogger(__name__)

celery_app = Celery("pravozor", broker=REDIS_URL)
celery_app.conf.update(task_always_eager=CELERY_EAGER, task_ignore_result=True)

# Площадь пересечения считаем на сфероиде (geography); зону обрезаем ~1 км вокруг участка,
# чтобы не хранить и не слать на карту многокилометровые контуры (водоохранные зоны и т.п.)
OVERLAP_SQL = text("""
    WITH p AS (SELECT ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(:parcel), 4326)) AS g),
         z AS (SELECT ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(:zone), 4326)) AS g)
    SELECT ST_Area(ST_Intersection(p.g, z.g)::geography) AS overlap,
           ST_Area(p.g::geography) AS total,
           ST_AsGeoJSON(ST_CollectionExtract(ST_Intersection(z.g, ST_Expand(p.g, 0.01)), 3), 6)::jsonb AS clipped
    FROM p, z
""")


def overlaps(session, parcel_geometry: dict, zones: list[dict]) -> list[dict]:
    """Оставляет зоны, реально пересекающие участок, и добавляет площадь и долю пересечения."""
    result = []
    for zone in zones:
        row = session.execute(
            OVERLAP_SQL, {"parcel": json.dumps(parcel_geometry), "zone": json.dumps(zone["geometry"])}
        ).one()
        pct = min(row.overlap / row.total * 100, 100)
        # касание границей или краешек соседней территориальной зоны (погрешность границ) — не пересечение
        if row.overlap < 1 or (zone["kind"] == "territorial" and pct < 1):
            continue
        result.append({
            **zone,
            "id": f"z{len(result)}",
            "geometry": row.clipped,
            "overlap_area_m2": round(row.overlap),
            "overlap_pct": round(pct, 1),
        })
    return result


@celery_app.task
def run_check(check_id: str) -> None:
    with Session() as session:
        check = session.get(Check, check_id)

        def stage(status: str, message: str | None) -> None:
            check.status, check.stage_message = status, message
            session.commit()

        try:
            stage("collecting", "Запрашиваем сведения об участке в НСПД")
            parcel = nspd.fetch_parcel(check.cadastral_number)
            check.address = parcel["address"]
            stage("collecting", "Проверяем пересечение с зонами")
            zones = overlaps(session, parcel["geometry"], nspd.fetch_zones(parcel["geometry"]))
            stage("analyzing", "Формируем выводы")
            check.report = rules.build_report(parcel, zones, check.purpose)
            check.overall_level = check.report["overall_level"]
            stage("done", None)
        except nspd.ParcelError as e:
            session.rollback()
            check.error = str(e)
            stage("failed", None)
        except Exception:
            log.exception("check %s failed", check_id)
            session.rollback()
            check.error = "Не удалось сформировать отчёт. Попробуйте ещё раз позже."
            stage("failed", None)
