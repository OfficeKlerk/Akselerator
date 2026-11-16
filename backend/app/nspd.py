"""Данные участка и зон из НСПД (неофициальный API, клиент — pynspd)."""

import json
import logging
import os

import httpx
from pynspd import Nspd, errors
from shapely.geometry import shape

ZOUIT_CATEGORY = 36940
TERRITORIAL_CATEGORY = 472819

log = logging.getLogger(__name__)


class ParcelError(Exception):
    """Ошибка с текстом для пользователя; status — код ответа API."""

    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


NOT_FOUND = "Участок не найден в НСПД. Проверьте кадастровый номер."


def _call(fn):
    try:
        # без таймаута pynspd может ждать бесконечно
        proxy = os.environ.get("NSPD_PROXY") or None
        with Nspd(client_timeout=30, client_retries=2, client_proxy=proxy) as client:
            return fn(client)
    except errors.BlockedIP:
        raise ParcelError(
            "НСПД отклонил запрос: доступ с IP-адреса сервера заблокирован. "
            "Нужен российский IP или прокси."
        ) from None
    except errors.AmbiguousSearchError:
        raise ParcelError("По этому номеру найдено несколько объектов. Уточните номер.", 404) from None
    except (errors.PynspdError, httpx.HTTPError) as e:
        log.warning("NSPD request failed: %r", e)
        raise ParcelError("НСПД временно недоступен. Попробуйте позже.") from None


def _geojson(feature) -> dict:
    return json.loads(feature.geometry.model_dump_json(exclude_none=True))


def to_parcel(feature) -> dict:
    o = feature.properties.options
    if feature.geometry.type not in ("Polygon", "MultiPolygon"):
        raise ParcelError("В ЕГРН нет границ этого участка — проверить пересечение с зонами нельзя.", 404)
    return {
        "cadastral_number": o.cad_num,
        "address": o.readable_address,
        "area_m2": o.specified_area or o.area or o.declared_area,
        "land_category": o.land_record_category_type,
        "permitted_use": o.permitted_use_established_by_document,
        "cadastral_value_rub": o.cost_value,
        "geometry": _geojson(feature),
    }


def to_zone(feature) -> dict | None:
    if feature.geometry.type not in ("Polygon", "MultiPolygon"):
        return None
    p = feature.properties
    o = p.options.model_dump()
    territorial = p.category == TERRITORIAL_CATEGORY
    registry_number = o.get("reg_numb_border")
    name = o.get("name_by_doc") or o.get("description") or p.descr or p.label or ""
    return {
        "kind": "territorial" if territorial else "zouit",
        # у территориальных зон НСПД отдаёт только реестровый номер
        "type_label": o.get("type_zone") or ("Территориальная зона" if territorial else p.category_name),
        "name": "" if name == registry_number else name,
        "registry_number": registry_number,
        "restrictions": o.get("content_restrict_encumbrances"),
        "geometry": _geojson(feature),
    }


def fetch_parcel(cadastral_number: str) -> dict:
    feature = _call(lambda c: c.find_landplot(cadastral_number))
    if feature is None:
        raise ParcelError(NOT_FOUND, 404)
    return to_parcel(feature)


def fetch_parcel_at(lat: float, lng: float) -> dict:
    features = _call(lambda c: c.search_landplots_at_coords(lat, lng))
    if not features:
        raise ParcelError("В этой точке участок не найден", 404)
    return to_parcel(features[0])


def fetch_zones(parcel_geometry: dict) -> list[dict]:
    """ЗОУИТ и территориальные зоны, пересекающие контур участка."""
    contour = shape(parcel_geometry)
    features = _call(lambda c: c._search_in_contour(contour, ZOUIT_CATEGORY, TERRITORIAL_CATEGORY))
    return [z for f in features or [] if (z := to_zone(f))]
