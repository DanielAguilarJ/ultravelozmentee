#!/usr/bin/env python3
"""Completa el schema de las 18 páginas de curso: Offer y CourseInstance.

Situación de partida medida en la auditoría:

  Course            18
  CourseInstance     5   (admision, comipems, homeschool, lectoescritura, mathekids)
  Offer              0   en todo el sitio

Sin Offer no hay elegibilidad para resultados enriquecidos de precio y
disponibilidad, que es el formato con más CTR en búsquedas comerciales.
Sin CourseInstance, 13 cursos no pueden mostrar modalidad.

SOBRE EL PRECIO — decisión deliberada
─────────────────────────────────────
El Offer se emite SIN precio numérico. No es un olvido.

Los precios visibles en el HTML son ambiguos: 10 de los 18 cursos no
muestran ninguno, y donde hay aparecen entre 3 y 7 cifras distintas
(mensualidad, curso completo, promoción, materiales) sin forma de saber
cuál es el precio del curso. Google exige que el precio del structured
data coincida con el visible en la página; publicar uno equivocado
arriesga perder los resultados enriquecidos por completo, además de
chocar con el gate del repositorio que prohíbe afirmaciones sin
evidencia.

Se emite entonces lo que SÍ es verificable: moneda, disponibilidad,
que el curso es de pago, vendedor y URL. Cuando exista una lista de
precios confirmada, añadir "price" a PRICES y volver a ejecutar.

MODALIDAD
─────────
courseMode NO se inventa: se deduce de lo que la propia página declara.
Si menciona en línea y presencial, Blended; si solo una, esa; si
ninguna, se omite CourseInstance en vez de suponerla.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parents[1]
ORG = "https://ultravelozmente.com/#organization"

COURSES = [
    "fotolectura", "memoria-prodigiosa", "mathekids", "robotics",
    "lectoescritura", "homeschool", "neurocomunicacion", "grandes-lideres",
    "alfa-cash", "redaccion-ejecutiva", "regularizacion-express",
    "admision-universitaria", "universidad-dominical", "comipems",
    "fastkids", "ciencia-astronomia", "juniormath_v2",
    "diplomado-matematicas-fisica",
]

# Rellenar SOLO con precios confirmados por el negocio. Formato:
#   "fotolectura": "3000"
# Mientras esté vacío, el Offer sale sin cifra, que es lo correcto:
# es mejor no declarar precio que declarar uno falso.
PRICES: dict[str, str] = {}

MODE_URL = {
    "online": "https://schema.org/Online",
    "onsite": "https://schema.org/Onsite",
    "blended": "https://schema.org/Blended",
}


def detect_mode(html: str) -> str | None:
    """Modalidad según lo que la página dice, no según lo que suponemos."""
    low = html.lower()
    online = bool(re.search(r"en l[íi]nea|online", low))
    onsite = "presencial" in low

    if online and onsite:
        return "blended"
    if online:
        return "online"
    if onsite:
        return "onsite"
    return None


def build_offer(slug: str) -> dict:
    offer = {
        "@type": "Offer",
        "url": f"https://ultravelozmente.com/{slug}",
        "priceCurrency": "MXN",
        "availability": "https://schema.org/InStock",
        "category": "Paid",
        "seller": {"@id": ORG},
    }

    price = PRICES.get(slug)
    if price:
        offer["price"] = price

    return offer


def build_instance(slug: str, name: str, mode: str) -> dict:
    return {
        "@type": "CourseInstance",
        "@id": f"https://ultravelozmente.com/{slug}#instance",
        "name": name,
        "courseMode": MODE_URL[mode],
        "inLanguage": "es-MX",
        "location": {"@id": ORG},
        "offers": build_offer(slug),
    }


def patch(slug: str) -> str:
    path = ROOT / f"{slug}.html"
    if not path.exists():
        return "no-existe"

    raw = path.read_text(encoding="utf-8")
    mode = detect_mode(raw)
    changed = False

    blocks = list(re.finditer(
        r'<script type="application/ld\+json">(.*?)</script>', raw, re.S
    ))

    for match in blocks:
        body = match.group(1)
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            continue

        nodes = data.get("@graph") if isinstance(data, dict) else None
        pool = nodes if isinstance(nodes, list) else (
            data if isinstance(data, list) else [data]
        )

        hit = False
        for node in pool:
            if not isinstance(node, dict) or node.get("@type") != "Course":
                continue

            if "offers" not in node:
                node["offers"] = build_offer(slug)
                hit = True

            if "hasCourseInstance" not in node and mode:
                node["hasCourseInstance"] = build_instance(
                    slug, node.get("name", slug), mode
                )
                hit = True

        if not hit:
            continue

        # Se respeta la indentación del bloque original para que el diff
        # sea legible y el HTML no cambie de estilo.
        indent = 4
        stripped = body.strip()
        first = stripped.splitlines()[0] if stripped else ""
        rebuilt = json.dumps(data, ensure_ascii=False, indent=indent)
        rebuilt = "\n" + rebuilt + "\n    "

        raw = raw.replace(match.group(0),
                          '<script type="application/ld+json">'
                          + rebuilt + "</script>", 1)
        changed = True
        del first

    if not changed:
        return "sin-cambios"

    path.write_text(raw, encoding="utf-8")
    return f"ok ({mode or 'sin-modalidad'})"


def main() -> None:
    failures = []
    for slug in COURSES:
        outcome = patch(slug)
        print(f"{slug:32s} {outcome}")
        if outcome == "no-existe":
            failures.append(slug)

    if not PRICES:
        print(
            "\nNota: Offer emitido SIN precio numérico. "
            "10 de 18 cursos no muestran precio y el resto muestra varios; "
            "declarar uno equivocado arriesga los resultados enriquecidos. "
            "Rellena PRICES con precios confirmados y vuelve a ejecutar."
        )

    if failures:
        sys.exit("Faltan páginas: " + ", ".join(failures))


if __name__ == "__main__":
    main()
