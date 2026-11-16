"""Сквозной тест API на настоящем PostGIS; НСПД подменён фикстурами в формате его ответов."""

import os
from uuid import uuid4

os.environ.setdefault("CELERY_EAGER", "1")

import pytest
from fastapi.testclient import TestClient
from pynspd import NspdFeature
from sqlalchemy import delete

from app import nspd
from app.db import Session, User
from app.main import app


def _feature(category: int, name: str, options: dict, lon0: float, lon1: float) -> NspdFeature:
    ring = [[lon0, 55.900], [lon1, 55.900], [lon1, 55.901], [lon0, 55.901], [lon0, 55.900]]
    return NspdFeature.model_validate({
        "type": "Feature",
        "id": 1,
        "geometry": {"type": "Polygon", "coordinates": [ring]},
        "properties": {"category": category, "categoryName": name, "options": options},
    })


PARCEL = _feature(36368, "Земельные участки ЕГРН", {
    "cad_num": "50:10:0010317:1234",
    "readable_address": "Московская обл., тестовый участок",
    "specified_area": 13900,
    "land_record_category_type": "Земли сельскохозяйственного назначения",
    "permitted_use_established_by_document": "Для сельскохозяйственного производства",
    "cost_value": 1000000,
}, 37.400, 37.402)
ZONES = [
    # западная половина участка
    _feature(36940, "ЗОУИТ", {"type_zone": "Охранная зона объектов электросетевого хозяйства", "name_by_doc": "ВЛ 110 кВ", "reg_numb_border": "50:10-6.1"}, 37.390, 37.401),
    _feature(472819, "Территориальные зоны", {"type_zone": "Зона СХ-1", "reg_numb_border": "50:10-7.1"}, 37.390, 37.410),
    # только касается восточной границы — в отчёт попасть не должна
    _feature(36940, "ЗОУИТ", {"type_zone": "Водоохранная зона"}, 37.402, 37.410),
]


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(nspd, "fetch_parcel", lambda cn: nspd.to_parcel(PARCEL))
    monkeypatch.setattr(nspd, "fetch_zones", lambda geom: [nspd.to_zone(z) for z in ZONES])
    emails = []

    def register(c: TestClient) -> str:
        emails.append(f"test-{uuid4().hex}@example.com")
        r = c.post("/api/auth/register", json={
            "full_name": "Тест Тестов", "email": emails[-1], "password": uuid4().hex,
            "company": None, "pd_consent": True,
        })
        assert r.status_code == 201, r.text
        return emails[-1]

    with TestClient(app) as c:
        c.register = lambda other=None: register(other or c)
        yield c
    with Session.begin() as s:
        s.execute(delete(User).where(User.email.in_(emails)))


def test_check_flow(client):
    assert client.get("/api/checks").status_code == 401
    email = client.register()
    assert client.get("/api/auth/me").json()["email"] == email

    r = client.post("/api/checks", json={"cadastral_number": "50:10:0010317:1234", "purpose": "izhs"})
    assert r.status_code == 202
    check = client.get(f"/api/checks/{r.json()['id']}").json()
    assert check["status"] == "done", check
    report = check["report"]

    zones = {z["kind"]: z for z in report["zones"]}
    assert len(report["zones"]) == 2
    assert zones["territorial"]["overlap_pct"] == 100
    assert 49 <= zones["zouit"]["overlap_pct"] <= 51
    assert zones["zouit"]["geometry"]["type"] in ("Polygon", "MultiPolygon")

    # сельхозземля под ИЖС — высокий риск; ЛЭП — средний со ссылкой на постановление № 160
    assert report["overall_level"] == check["overall_level"] == "high"
    lep = next(x for x in report["risks"] if zones["zouit"]["id"] in x["zone_ids"])
    assert lep["level"] == "medium" and "№ 160" in lep["basis"][0]["document"]

    assert client.get("/api/checks").json()[0]["id"] == check["id"]
    pdf = client.get(f"/api/checks/{check['id']}/report.pdf")
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")

    # другой пользователь чужую проверку не видит
    with TestClient(app) as other:
        client.register(other)
        assert other.get(f"/api/checks/{check['id']}").status_code == 404
        assert other.get(f"/api/checks/{check['id']}/report.pdf").status_code == 404


def test_parcel_not_found_fails_check(client, monkeypatch):
    def not_found(cn):
        raise nspd.ParcelError(nspd.NOT_FOUND, 404)

    monkeypatch.setattr(nspd, "fetch_parcel", not_found)
    client.register()
    assert client.get("/api/parcels", params={"cadastral_number": "50:11:0000001:1"}).status_code == 404
    r = client.post("/api/checks", json={"cadastral_number": "50:11:0000001:1", "purpose": "mkd"})
    check = client.get(f"/api/checks/{r.json()['id']}").json()
    assert check["status"] == "failed" and check["error"] == nspd.NOT_FOUND


def test_auth_validation(client):
    email = client.register()
    body = {"full_name": "Тест Тестов", "email": email, "password": "long-enough-1", "company": None, "pd_consent": True}
    assert client.post("/api/auth/register", json=body).status_code == 409
    assert client.post("/api/auth/register", json={**body, "email": "x@example.com", "pd_consent": False}).status_code == 422
    assert client.post("/api/auth/login", json={"email": email, "password": "wrong-password"}).status_code == 401
    assert client.post("/api/checks", json={"cadastral_number": "abc", "purpose": "izhs"}).status_code == 422
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401
