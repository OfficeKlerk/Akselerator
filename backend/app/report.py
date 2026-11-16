from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from .rules import PURPOSES

env = Environment(loader=FileSystemLoader(Path(__file__).parent / "templates"), autoescape=True)
LEVELS = {"low": "Низкий риск", "medium": "Средний риск", "high": "Высокий риск"}


def _num(v: float | None) -> str:
    return "—" if v is None else f"{v:,.0f}".replace(",", " ")


def render_pdf(report: dict, purpose: str) -> bytes:
    html = env.get_template("report.html").render(
        r=report,
        purpose=PURPOSES[purpose][0],
        levels=LEVELS,
        num=_num,
        generated=datetime.fromisoformat(report["generated_at"]).strftime("%d.%m.%Y"),
    )
    return HTML(string=html).write_pdf()
