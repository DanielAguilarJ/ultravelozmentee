#!/usr/bin/env python3
"""Optimiza la carga de la imagen de portada de cada artículo.

Dos cosas medidas, no supuestas:

1. Las 11 portadas de la serie original (blog_N_cover.webp) no declaraban
   width/height. Sin dimensiones el navegador no reserva el hueco y la
   página salta al cargar la imagen: eso es CLS, una de las tres Core Web
   Vitals. Las 11 miden 800x800 reales, leídos del propio archivo WebP.

2. Las 236 imágenes "sin loading=lazy" que la auditoría marcó son UNA por
   página: la portada del artículo, que está arriba y es el elemento LCP.
   Ponerles loading="lazy" habría EMPEORADO el LCP, que es justo lo
   contrario de lo que se buscaba. La optimización correcta es la inversa:
   declarar fetchpriority="high" para que el navegador la pida antes que
   al resto de recursos.

Por eso este script no añade lazy a nada. Las imágenes que sí van abajo
—las 224 tarjetas del índice— ya lo traían del generador.

Idempotente: no toca una etiqueta que ya tenga el atributo.
"""
from __future__ import annotations

import glob
import re
from pathlib import Path

ROOT = Path(__file__).parents[1]

COVER_W = "800"
COVER_H = "800"


def first_img(html: str) -> re.Match | None:
    """La portada del artículo: la primera <img> de CONTENIDO.

    No basta con tomar la primera <img> del documento. La primera es el
    píxel de seguimiento 1x1 de Meta, dentro de un <noscript>:

        <noscript><img height="1" width="1" style="display:none" alt="">

    Marcarla como prioritaria no rompe nada, pero tampoco sirve de nada y
    deja el LCP real sin optimizar. Se exige entonces que la imagen
    apunte a images/ y que no esté oculta.
    """
    for match in re.finditer(r"<img\b[^>]*>", html):
        tag = match.group(0)
        if "display:none" in tag.replace(" ", ""):
            continue
        if 'width="1"' in tag or 'height="1"' in tag:
            continue
        if "src=" not in tag:
            continue
        return match
    return None


def patch(path: Path) -> str:
    raw = path.read_text(encoding="utf-8")
    match = first_img(raw)
    if not match:
        return "sin-img"

    tag = match.group(0)
    new = tag
    notes = []

    # Dimensiones: solo a las portadas de la serie original, que son las
    # únicas que no las traen, y solo con las medidas reales del archivo.
    if "width=" not in new and "blog_" in new and "_cover.webp" in new:
        new = new[:-1].rstrip() + f' width="{COVER_W}" height="{COVER_H}">'
        notes.append("dimensiones")

    # Prioridad de descarga para el LCP.
    if "fetchpriority=" not in new:
        new = new[:-1].rstrip() + ' fetchpriority="high">'
        notes.append("fetchpriority")

    # Una portada nunca debe ser lazy: es lo primero que se ve.
    if 'loading="lazy"' in new:
        new = new.replace(' loading="lazy"', "")
        notes.append("quitado-lazy")

    if new == tag:
        return "sin-cambios"

    raw = raw[:match.start()] + new + raw[match.end():]
    path.write_text(raw, encoding="utf-8")
    return "+".join(notes)


def main() -> None:
    targets = sorted(
        p for p in ROOT.glob("blog-*.html") if p.name != "blog-index.html"
    )

    counts: dict[str, int] = {}
    for path in targets:
        outcome = patch(path)
        counts[outcome] = counts.get(outcome, 0) + 1

    for key in sorted(counts):
        print(f"{key}: {counts[key]}")


if __name__ == "__main__":
    main()
