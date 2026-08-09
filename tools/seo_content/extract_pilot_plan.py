#!/usr/bin/env python3
"""Extrae del plan de 500 solo los 10 posts marcados status=pilot y los
escribe en reports/seo/editorial-plan-pilot-10.json, en el mismo esquema
que espera build_html.py. No toca el plan de 500 ni el de 60."""
import json
from pathlib import Path

ROOT = Path(__file__).parents[2]
PLAN_500 = ROOT / "reports" / "seo" / "editorial-plan-500-posts.json"
OUT = ROOT / "reports" / "seo" / "editorial-plan-pilot-10.json"


def main() -> None:
    data = json.loads(PLAN_500.read_text(encoding="utf-8"))
    pilots = [p for p in data["posts"] if p["status"] == "pilot"]
    assert len(pilots) == 10, f"esperaba 10 posts piloto, encontré {len(pilots)}"
    out = {
        "meta": {
            "site": "https://ultravelozmente.com",
            "geo": "MX",
            "source": "editorial-plan-500-posts.json (subconjunto piloto, Stage 2)",
            "post_count": len(pilots),
        },
        "posts": pilots,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Escrito {OUT} con {len(pilots)} posts piloto.")
    for p in pilots:
        print(f"  {p['id']:3d}  {p['slug']}")


if __name__ == "__main__":
    main()
