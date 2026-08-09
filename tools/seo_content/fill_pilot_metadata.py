#!/usr/bin/env python3
"""Completa title/primary_keyword/publication_date/status para el lote
piloto de 10 posts (Stage 2), dejando el resto del plan de 500 intacto."""
import json
from pathlib import Path

ROOT = Path(__file__).parents[2]
PLAN = ROOT / "reports" / "seo" / "editorial-plan-500-posts.json"

PILOT = {
    61: ("Qué son las metodologías de aprendizaje y cómo elegir la tuya",
         "metodologías de aprendizaje"),
    62: ("Guía completa de metodologías de aprendizaje basadas en evidencia",
         "metodologías de aprendizaje basadas en evidencia"),
    63: ("Metodologías de aprendizaje para principiantes: por dónde empezar",
         "cómo empezar a estudiar con método"),
    111: ("Productividad estudiantil: qué es y por qué la mayoría la hace mal",
          "productividad estudiantil"),
    112: ("Guía completa de productividad estudiantil para secundaria y prepa",
          "guía de productividad para estudiantes"),
    113: ("Productividad estudiantil para principiantes: primeros pasos reales",
          "cómo mejorar la productividad al estudiar"),
    # IDs reales del cluster habilidades-blandas (verificado contra el plan de 500).
    # La primera versión de este script usó 161/162 asumiendo que pertenecían a
    # habilidades-blandas; en realidad ese rango es tecnologia-educativa. Corregido
    # para apuntar a los IDs verificados de habilidades-blandas.
    211: ("Qué son las habilidades blandas y por qué importan en la escuela",
          "habilidades blandas en la escuela"),
    212: ("Guía completa de habilidades blandas para adolescentes",
           "habilidades blandas para adolescentes"),
    # IDs reales del cluster aprendizaje-temprano (verificado contra el plan de 500);
    # la primera versión asumió 411/412, que en realidad es bienestar-estudiantil.
    461: ("Qué es el aprendizaje temprano y cuándo empezar a estimularlo",
          "aprendizaje temprano en niños"),
    462: ("Guía completa de aprendizaje temprano: 0 a 6 años",
          "estimulación temprana infantil"),
}

PUB_DATE = "2026-08-10"

# Estos 4 IDs se marcaron "pilot" por error en la primera ejecución de este
# script (161/162 son tecnologia-educativa, 411/412 son bienestar-estudiantil;
# ninguno es el cluster que el título describía). Se revierten a su estado
# original antes de aplicar los IDs correctos.
REVERT = (161, 162, 411, 412)


def main() -> None:
    data = json.loads(PLAN.read_text(encoding="utf-8"))
    reverted = 0
    updated = 0
    for post in data["posts"]:
        if post["id"] in REVERT and post["status"] == "pilot":
            post["title"] = None
            post["primary_keyword"] = None
            post["publication_date"] = None
            post["status"] = "draft-slug"
            reverted += 1
        if post["id"] in PILOT:
            title, kw = PILOT[post["id"]]
            post["title"] = title
            post["primary_keyword"] = kw
            post["publication_date"] = PUB_DATE
            post["status"] = "pilot"
            updated += 1
    assert reverted == len(REVERT), f"esperaba revertir {len(REVERT)}, reverti {reverted}"
    assert updated == len(PILOT), f"esperaba actualizar {len(PILOT)}, actualicé {updated}"
    PLAN.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Revertidos {reverted} IDs mal asignados. Actualizados {updated} posts piloto con title/primary_keyword reales.")


if __name__ == "__main__":
    main()
