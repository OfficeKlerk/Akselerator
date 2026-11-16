"""Правила оценки рисков: факты об участке → риск, норма, путь решения.

ЧЕРНОВИК разработчика: формулировки и ссылки на нормы должны проверить юристы.
Чтобы добавить правило для вида ЗОУИТ — допишите строку в ZOUIT_RULES.
"""

from datetime import datetime, timezone

GRK = "Градостроительный кодекс РФ"
ZK = "Земельный кодекс РФ"
VK = "Водный кодекс РФ"
VRI_CLASSIFIER = "Классификатор видов разрешённого использования (приказ Росреестра от 10.11.2020 № П/0412)"

PURPOSES = {
    # цель: (название, коды классификатора, ключевые слова в ВРИ участка)
    "warehouse": ("склад", "6.9", ("склад",)),
    "izhs": ("индивидуальный жилой дом", "2.1", ("индивидуальн", "личного подсобного", "приусадебн", "садовод")),
    "mkd": ("многоквартирный дом", "2.1.1, 2.5, 2.6", ("многоквартирн", "многоэтажн", "среднеэтажн")),
}
HOUSING = ("izhs", "mkd")
SEVERITY = {"low": 0, "medium": 1, "high": 2}

DISCLAIMER = (
    "Отчёт носит рекомендательный характер и не является юридическим заключением. "
    "Выводы сформированы автоматически на основе открытых данных и требуют проверки "
    "юристом перед принятием решения о сделке."
)


def cite(document: str, article: str | None = None) -> dict:
    return {"document": document, "article": article, "quote": None, "url": None}


# (ключевые слова в типе/названии зоны, запрещает ли жильё, основание, что делать)
ZOUIT_RULES = [
    (
        ("санитарно-защитн",),
        True,
        [cite("Правила установления санитарно-защитных зон (постановление Правительства РФ от 03.03.2018 № 222)", "п. 5")],
        "Жилая застройка в санитарно-защитной зоне не допускается. Возможный путь — сокращение зоны по инициативе владельца источника воздействия.",
    ),
    (
        ("связи", "радиофикац"),
        False,
        [cite("Правила охраны линий и сооружений связи РФ (постановление Правительства РФ от 09.06.1995 № 578)", "п. 48")],
        "Строительные и земляные работы в зоне — только с письменного согласия владельца линии связи.",
    ),
    (
        ("электр", "лэп", "подстанц", "вл-", "вл "),
        False,
        [cite("Правила установления охранных зон объектов электросетевого хозяйства (постановление Правительства РФ от 24.02.2009 № 160)", "пп. 8–10")],
        "Не размещать здания в границах зоны; строительство и земляные работы согласовать с сетевой организацией.",
    ),
    (
        ("газ",),
        False,
        [cite("Правила охраны газораспределительных сетей (постановление Правительства РФ от 20.11.2000 № 878)", "п. 14")],
        "Не строить в границах зоны; работы согласовать с эксплуатирующей организацией.",
    ),
    (
        ("водоохран", "прибрежн"),
        False,
        [cite(VK, "ст. 65")],
        "Учесть ограничения зоны при планировке: запрещены, в частности, стоянки вне твёрдого покрытия, склады ГСМ, размещение отходов; нужны сооружения для охраны вод.",
    ),
    (
        ("затоплен", "подтоплен"),
        True,
        [cite(VK, "ст. 67.1")],
        "Строительство возможно только при обеспечении инженерной защиты от затопления и подтопления — заложите её стоимость.",
    ),
    (
        ("культурн", "наслед", "защитная зона"),
        False,
        [cite("Федеральный закон от 25.06.2002 № 73-ФЗ «Об объектах культурного наследия»", "ст. 34, 34.1")],
        "Проверить режим зоны (ограничения высоты и облика, в защитной зоне — запрет нового строительства) и согласовать проект с органом охраны объектов культурного наследия.",
    ),
    (
        ("аэродром",),
        False,
        [cite("Воздушный кодекс РФ", "ст. 47")],
        "Проверить ограничения подзоны приаэродромной территории (высота, назначение объектов) и при необходимости согласовать строительство.",
    ),
]
ZOUIT_DEFAULT = (
    (),
    False,
    [cite(ZK, "ст. 104–107")],
    "Изучить ограничения, установленные для этой зоны (сведения ЕГРН, акт об установлении зоны), и учесть их в проекте.",
)


def _num(v: float) -> str:
    return f"{v:,.0f}".replace(",", " ")


def _category_risk(parcel: dict, purpose: str) -> dict | None:
    category = parcel["land_category"]
    if not category:
        return None
    low = category.lower()
    if "населенных пунктов" in low or "населённых пунктов" in low:
        return None
    if "промышленности" in low and purpose == "warehouse":
        return None
    basis = [cite(ZK, "ст. 7"), cite("Федеральный закон от 21.12.2004 № 172-ФЗ «О переводе земель или земельных участков из одной категории в другую»")]
    if "сельскохозяйственного" in low:
        basis.insert(1, cite(ZK, "ст. 77–78"))
    return {
        "level": "high",
        "title": "Категория земель не допускает такое строительство",
        "finding": f"Категория участка — «{category}». Цель «{PURPOSES[purpose][0]}» для этой категории не предусмотрена.",
        "basis": basis,
        "recommendation": "Нужен перевод земель в другую категорию (или включение участка в границы населённого пункта) и затем изменение ВРИ. Процедура долгая и не гарантирована — учтите это в сроках и цене сделки.",
        "zone_ids": [],
    }


def _vri_risk(parcel: dict, zones: list[dict], purpose: str) -> dict:
    name, codes, keywords = PURPOSES[purpose]
    vri = parcel["permitted_use"]
    territorial = sorted((z for z in zones if z["kind"] == "territorial"), key=lambda z: -z["overlap_pct"])
    zone_note = (
        " Территориальная зона по ЕГРН: " + ", ".join(
            f"{z['name'] or z['type_label']} (реестровый № {z['registry_number']}, {_num(z['overlap_pct'])} % участка)" for z in territorial
        ) + "."
        if territorial
        else " Территориальная зона в ЕГРН не внесена — регламент нужно смотреть в ПЗЗ муниципалитета."
    )
    zone_ids = [z["id"] for z in territorial]
    if vri and any(k in vri.lower() for k in keywords):
        return {
            "level": "low",
            "title": "Вид разрешённого использования соответствует цели",
            "finding": f"ВРИ участка — «{vri}».{zone_note}",
            "basis": [cite(GRK, "ст. 37"), cite(VRI_CLASSIFIER, f"код {codes}")],
            "recommendation": "Изменение ВРИ не требуется. Проверьте предельные параметры строительства (этажность, отступы, процент застройки) в градостроительном регламенте зоны.",
            "zone_ids": zone_ids,
        }
    return {
        "level": "medium",
        "title": "Вид разрешённого использования не соответствует цели",
        "finding": f"ВРИ участка — «{vri or 'не указан'}», для цели «{name}» нужен ВРИ с кодом {codes}.{zone_note}",
        "basis": [cite(GRK, "ст. 37, 39"), cite(GRK, "ст. 33"), cite(VRI_CLASSIFIER, f"код {codes}")],
        "recommendation": "Проверьте градостроительный регламент территориальной зоны в ПЗЗ. Если нужный вид — основной, правообладатель меняет ВРИ без разрешений (ч. 4 ст. 37 ГрК РФ); если условно разрешённый — нужно разрешение с общественными обсуждениями (ст. 39); если вида нет в регламенте — потребуется изменение ПЗЗ (ст. 33).",
        "zone_ids": zone_ids,
    }


def _zouit_risk(zone: dict, purpose: str) -> dict:
    # сначала ищем по типу зоны и только потом по названию: в названии бывают посторонние слова
    # (санитарно-защитная зона «МОСГАЗ» — не охранная зона газопровода)
    _, blocks_housing, basis, recommendation = next(
        (r for text in (zone["type_label"].lower(), zone["name"].lower()) for r in ZOUIT_RULES if any(k in text for k in r[0])),
        ZOUIT_DEFAULT,
    )
    finding = (
        f"{_num(zone['overlap_pct'])} % площади участка ({_num(zone['overlap_area_m2'])} м²) "
        f"находится в зоне «{zone['name'] or zone['type_label']}»"
        + (f" (реестровый № {zone['registry_number']})." if zone["registry_number"] else ".")
    )
    if zone.get("restrictions"):
        finding += f" Ограничения по ЕГРН: {zone['restrictions']}"
    return {
        "level": "high" if blocks_housing and purpose in HOUSING else "medium",
        "title": f"Участок в зоне с особыми условиями: {zone['type_label']}",
        "finding": finding,
        "basis": basis,
        "recommendation": recommendation,
        "zone_ids": [zone["id"]],
    }


def assess(parcel: dict, zones: list[dict], purpose: str) -> list[dict]:
    risks = [_category_risk(parcel, purpose), _vri_risk(parcel, zones, purpose)]
    risks += [_zouit_risk(z, purpose) for z in zones if z["kind"] == "zouit"]
    return [{"id": f"r{i}", **r} for i, r in enumerate(r for r in risks if r)]


def build_report(parcel: dict, zones: list[dict], purpose: str) -> dict:
    risks = assess(parcel, zones, purpose)
    overall = max((r["level"] for r in risks), key=SEVERITY.__getitem__)
    counts = ", ".join(
        f"{label} — {n}"
        for level, label in (("high", "высокий"), ("medium", "средний"), ("low", "низкий"))
        if (n := sum(r["level"] == level for r in risks))
    )
    verdict = {
        "high": "Покупка под эту цель связана с существенными препятствиями.",
        "medium": "Цель достижима, но есть ограничения, которые нужно учесть.",
        "low": "Существенных препятствий не выявлено.",
    }[overall]
    now = datetime.now(timezone.utc).isoformat()
    return {
        "overall_level": overall,
        "summary": f"Цель: {PURPOSES[purpose][0]}. Найдено рисков: {counts}. {verdict}",
        "parcel": parcel,
        "zones": [{k: v for k, v in z.items() if k != "restrictions"} for z in zones],
        "risks": risks,
        "data_sources": [
            {"name": "НСПД — сведения об участке и его границе", "fetched_at": now},
            {"name": "НСПД — ЗОУИТ и территориальные зоны", "fetched_at": now},
            {"name": "Правила оценки рисков ПРАВОЗОР, версия 0.1", "fetched_at": now},
        ],
        "disclaimer": DISCLAIMER,
        "generated_at": now,
    }
