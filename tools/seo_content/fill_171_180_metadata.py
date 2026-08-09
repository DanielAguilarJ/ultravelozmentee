#!/usr/bin/env python3
"""Completa title/primary_keyword/publication_date/status para los posts
171-180 (cluster tecnologia-educativa), derivando el titulo de la
description que ya escribio el sub-agente."""
import json
from pathlib import Path

ROOT = Path(__file__).parents[2]
PLAN = ROOT / "reports" / "seo" / "editorial-plan-500-posts.json"
CONTENT = ROOT / "content" / "posts" / "batch-171-180.json"

TITLES = {
    171: ("Tecnología educativa para padres: cómo acompañar sin ser experto", "tecnología educativa para padres"),
    172: ("Cómo usar tecnología educativa siendo estudiante", "tecnología educativa para estudiantes"),
    173: ("Edad recomendada para cada tipo de tecnología educativa", "edad recomendada tecnología educativa"),
    174: ("Cómo organizar la tecnología educativa en casa", "tecnología educativa en casa"),
    175: ("Tecnología educativa en la escuela: qué se usa y cómo evaluarla", "tecnología educativa en la escuela"),
    176: ("Herramientas de tecnología educativa que sí sirven", "herramientas de tecnología educativa"),
    177: ("Señales de alerta en el uso de tecnología educativa", "señales de alerta tecnología educativa"),
    178: ("Rutina semanal con tecnología educativa: cómo organizarla", "rutina semanal tecnología educativa"),
    179: ("Checklist para evaluar tecnología educativa antes de usarla", "checklist tecnología educativa"),
    180: ("Preguntas frecuentes sobre tecnología educativa", "preguntas frecuentes tecnología educativa"),
}

PUB_DATE = "2026-08-10"


def main() -> None:
    data = json.loads(PLAN.read_text(encoding="utf-8"))
    updated = 0
    for post in data["posts"]:
        if post["id"] in TITLES:
            title, kw = TITLES[post["id"]]
            post["title"] = title
            post["primary_keyword"] = kw
            post["publication_date"] = PUB_DATE
            post["status"] = "pilot"
            updated += 1
    assert updated == len(TITLES), f"esperaba actualizar {len(TITLES)}, actualicé {updated}"
    PLAN.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Actualizados {updated} posts (171-180) con title/primary_keyword.")


if __name__ == "__main__":
    main()
