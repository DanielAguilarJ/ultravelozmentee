#!/usr/bin/env python3
"""
Instala el Meta Pixel de forma uniforme en todas las páginas del sitio.

Problema que resuelve
─────────────────────
El código base del pixel estaba pegado a mano en 11 de 182 páginas HTML.
En las otras 171 (incluida la home) `fbq` nunca existía, así que
tracking.min.js llamaba a window.fbq en vano: los eventos del navegador se
perdían en silencio y las campañas de Meta se quedaban sin señal.

Qué hace en cada página
───────────────────────
1. Borra el bloque inline `<!-- Meta Pixel Code --> … <!-- End Meta Pixel Code -->`
   (si existe) para que no haya dos `fbq('track','PageView')` = doble conteo.
2. Inserta en el <head>, en este orden:
      - gtag de Google Ads      (si falta)
      - js/meta-pixel.js        (única fuente del pixel + noscript de respaldo)
      - clientParamBuilder      (si falta)
3. Inserta antes de </body> (si faltan):
      - js/param-builder-client.min.js
      - js/tracking.min.js

Es idempotente: se puede correr varias veces sin duplicar nada.

Uso:
    python3 tools/install_meta_pixel.py --check   # no escribe, solo informa
    python3 tools/install_meta_pixel.py           # aplica los cambios
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PIXEL_ID = "280967147554736"

# Los scripts de medición se sirven con cache-control de 24 h (y hasta 7 días
# de stale-while-revalidate). Sin versionar, cualquier corrección de tracking
# tarda un día en llegar a quien ya visitó el sitio. Al tocar js/meta-pixel.js
# o js/tracking.js hay que subir esta versión, igual que se hace con el CSS
# (navbar-unified.min.css?v=20260806).
ASSET_VERSION = "20260810"

# googleb3…: archivo de verificación de Google, no es una página.
# 404: no queremos contar PageView de una página de error.
SKIP = {"googleb3cccf1efd67c490.html", "404.html"}

GTAG_ID = "AW-10846614576"
GTAG_MARKER = f"gtag/js?id={GTAG_ID}"
GTAG_SNIPPET = f"""<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id={GTAG_ID}"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag() {{ dataLayer.push(arguments); }}
    gtag('js', new Date());
    gtag('config', '{GTAG_ID}');
</script>"""

PIXEL_MARKER = "js/meta-pixel.js"
PIXEL_SNIPPET = f"""<!-- Meta Pixel — código base único en js/meta-pixel.js (pixel {PIXEL_ID}) -->
<script src="js/meta-pixel.js?v={ASSET_VERSION}"></script>
<noscript><img height="1" width="1" style="display:none" alt=""
    src="https://www.facebook.com/tr?id={PIXEL_ID}&ev=PageView&noscript=1" /></noscript>"""

PARAM_BUILDER_MARKER = "clientParamBuilder.bundle.js"
PARAM_BUILDER_SNIPPET = (
    '<script defer src="https://capi-automation.s3.us-east-2.amazonaws.com'
    '/public/client_js/capiParamBuilder/clientParamBuilder.bundle.js"></script>'
)

BODY_MARKER = "js/tracking.js"
BODY_SNIPPET = f"""<script src="js/param-builder-client.min.js" defer></script>
<script src="js/tracking.js?v={ASSET_VERSION}" defer></script>"""

# Bloque inline heredado, con o sin el comentario de cierre.
INLINE_PIXEL_RE = re.compile(
    r"[ \t]*<!--\s*Meta Pixel Code\s*-->.*?<!--\s*End Meta Pixel Code\s*-->[ \t]*\n?",
    re.DOTALL | re.IGNORECASE,
)
HEAD_OPEN_RE = re.compile(r"<head\b[^>]*>", re.IGNORECASE)
HEAD_CLOSE_RE = re.compile(r"</head\s*>", re.IGNORECASE)
# El charset debe seguir siendo lo primero del <head>: el HTML exige que la
# declaración caiga dentro de los primeros 1024 bytes del documento. Si no,
# el navegador adivina la codificación y los acentos salen corruptos. Por eso
# se inyecta SIEMPRE después del charset, esté donde esté dentro del <head>
# (varias páginas lo tienen detrás del bloque de gtag, no pegado a <head>).
CHARSET_RE = re.compile(r"<meta\b[^>]*charset\s*=[^>]*>", re.IGNORECASE)
BODY_CLOSE_RE = re.compile(r"</body\s*>", re.IGNORECASE)


def head_insert_position(html: str) -> int | None:
    """Devuelve el offset donde inyectar dentro del <head>, o None si no hay."""
    head = HEAD_OPEN_RE.search(html)
    if not head:
        return None

    head_close = HEAD_CLOSE_RE.search(html, head.end())
    limit = head_close.start() if head_close else len(html)

    charset = CHARSET_RE.search(html, head.end())
    if charset and charset.end() <= limit:
        return charset.end()
    return head.end()


class PageResult:
    def __init__(self, name: str) -> None:
        self.name = name
        self.actions: list[str] = []
        self.error: str | None = None


def process(html: str, result: PageResult) -> str:
    # 1) Quitar el pixel inline heredado (evita el doble PageView).
    html, removed = INLINE_PIXEL_RE.subn("", html)
    if removed:
        result.actions.append(f"pixel inline eliminado x{removed}")

    # 2) Preparar lo que va en el <head>, en orden.
    head_parts: list[str] = []
    if GTAG_MARKER not in html:
        head_parts.append(GTAG_SNIPPET)
        result.actions.append("gtag añadido")
    if PIXEL_MARKER not in html:
        head_parts.append(PIXEL_SNIPPET)
        result.actions.append("meta-pixel.js añadido")
    if PARAM_BUILDER_MARKER not in html:
        head_parts.append(PARAM_BUILDER_SNIPPET)
        result.actions.append("clientParamBuilder añadido")

    if head_parts:
        position = head_insert_position(html)
        if position is None:
            result.error = "no se encontró <head>"
            return html
        block = "\n" + "\n".join(head_parts) + "\n"
        html = html[:position] + block + html[position:]

    # 3) Scripts de tracking al final del <body>.
    if BODY_MARKER not in html:
        match = BODY_CLOSE_RE.search(html)
        if not match:
            result.error = "no se encontró </body>"
            return html
        html = html[: match.start()] + BODY_SNIPPET + "\n" + html[match.start():]
        result.actions.append("tracking.js añadido")

    return html


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="no escribe archivos, solo informa qué cambiaría",
    )
    args = parser.parse_args()

    pages = sorted(p for p in ROOT.glob("*.html") if p.name not in SKIP)
    if not pages:
        print("No se encontraron páginas HTML en la raíz.", file=sys.stderr)
        return 1

    changed: list[PageResult] = []
    errors: list[PageResult] = []
    untouched = 0

    for page in pages:
        original = page.read_text(encoding="utf-8")
        result = PageResult(page.name)
        updated = process(original, result)

        if result.error:
            errors.append(result)
            continue
        if updated == original:
            untouched += 1
            continue

        changed.append(result)
        if not args.check:
            page.write_text(updated, encoding="utf-8")

    verb = "cambiarían" if args.check else "actualizadas"
    print(f"Páginas analizadas : {len(pages)}")
    print(f"Páginas {verb:<11}: {len(changed)}")
    print(f"Ya correctas       : {untouched}")

    for result in changed[:5]:
        print(f"  · {result.name}: {', '.join(result.actions)}")
    if len(changed) > 5:
        print(f"  · … y {len(changed) - 5} más")

    if errors:
        print(f"\nERRORES ({len(errors)}):", file=sys.stderr)
        for result in errors:
            print(f"  · {result.name}: {result.error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
