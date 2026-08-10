#!/usr/bin/env python3
"""Inyecta el formulario de captura de correo en los artículos del blog.

Por qué existe: los 235 artículos ya renderizados no lo traían, y volver a
renderizarlos no es opción —los 11 posts de la serie original no tienen
JSON de contenido, así que el pipeline no los puede reproducir—. Este
script trabaja sobre el HTML ya publicado.

La plantilla del generador (tools/seo_content/build_html.py) también lo
incluye, para que los posts NUEVOS nazcan con el formulario. Este script
cubre el pasado; la plantilla, el futuro.

Idempotente: reescribe lo que haya entre los marcadores SEO:MAGNET, igual
que build_blog_index.py hace con SEO:CARDS. Ejecutarlo dos veces no
duplica nada.

Se ancla justo antes de </article>, que es donde termina el cuerpo del
artículo: después de la FAQ y de las fuentes. Motivo: el formulario debe
aparecer cuando la persona ya leyó y demostró interés, no antes de
empezar. Las 235 páginas tienen ese cierre, así que no hace falta una
cadena de anclas alternativas.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).parents[1]

START = "<!-- SEO:MAGNET:START -->"
END = "<!-- SEO:MAGNET:END -->"

RESOURCE_SLUG = "guia-tecnicas-de-estudio"
DOWNLOAD_URL = "/descargas/guia-tecnicas-de-estudio.pdf"

SCRIPT_TAG = '<script src="js/lead-capture.js?v=20260810" defer></script>'

ANCHOR = "</article>"


def block() -> str:
    """El formulario. Sin promesas que no se puedan cumplir.

    Nada de "te lo enviamos por correo": el PDF se entrega en el acto
    porque no hay garantía de envío configurada. Y el aviso de privacidad
    es explícito, que además es lo que exige la LFPDPPP mexicana cuando
    se recaban datos personales.
    """
    return f"""{START}
                <section class="ed-magnet" aria-labelledby="magnet-title">
                    <p class="ed-magnet-kicker">Descarga gratuita</p>
                    <h2 id="magnet-title">Guía: cómo estudiar para que se quede</h2>
                    <p>Siete técnicas de estudio explicadas con ejemplos y un plan
                    de 14 días para aplicarlas. PDF de 5 páginas, sin costo.</p>
                    <form data-lead-magnet
                          data-resource="{RESOURCE_SLUG}"
                          data-download="{DOWNLOAD_URL}"
                          novalidate>
                        <div class="ed-magnet-row" data-lm-fields>
                            <label for="magnet-email">Tu correo electrónico</label>
                            <input type="email" id="magnet-email" name="email"
                                   autocomplete="email" inputmode="email"
                                   placeholder="tucorreo@ejemplo.com"
                                   required data-lm-email>
                            <button type="submit" data-lm-submit>Descargar la guía</button>
                        </div>
                        <p class="ed-magnet-status" role="status" aria-live="polite"
                           data-lm-status></p>
                        <div class="ed-magnet-done" hidden data-lm-done>
                            <a href="{DOWNLOAD_URL}" download>Descargar el PDF</a>
                        </div>
                        <p class="ed-magnet-note">Te la damos al instante en esta
                        misma página. Usamos tu correo para enviarte material
                        educativo; puedes pedir que lo borremos cuando quieras.</p>
                    </form>
                </section>
                {END}"""


def inject(path: Path) -> str:
    raw = path.read_text(encoding="utf-8")
    original = raw

    if START in raw and END in raw:
        pre, rest = raw.split(START, 1)
        _, post = rest.split(END, 1)
        raw = pre + block() + post
    else:
        idx = raw.find(ANCHOR)
        if idx == -1:
            return "sin-ancla"
        raw = raw[:idx] + block() + "\n                " + raw[idx:]

    # El script solo se añade una vez, y al final del body para no
    # bloquear el render.
    if "lead-capture.js" not in raw:
        if "</body>" not in raw:
            return "sin-body"
        raw = raw.replace("</body>", "    " + SCRIPT_TAG + "\n</body>", 1)

    if raw == original:
        return "sin-cambios"

    path.write_text(raw, encoding="utf-8")
    return "ok"


def main() -> None:
    targets = sorted(
        p for p in ROOT.glob("blog-*.html") if p.name != "blog-index.html"
    )

    if not targets:
        sys.exit("No se encontró ningún blog-*.html en " + str(ROOT))

    counts: dict[str, int] = {}
    problems: list[str] = []

    for path in targets:
        outcome = inject(path)
        counts[outcome] = counts.get(outcome, 0) + 1
        if outcome not in ("ok", "sin-cambios"):
            problems.append(f"{path.name}: {outcome}")

    for key in sorted(counts):
        print(f"{key}: {counts[key]}")

    if problems:
        print("\nRevisar:")
        for item in problems[:20]:
            print("  -", item)
        sys.exit(1)


if __name__ == "__main__":
    main()
