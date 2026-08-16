#!/usr/bin/env python3
"""sync_site_identity.py — Propaga la identidad del sitio desde su ÚNICA
fuente de verdad (src/_data/site.json) a cada HTML servible.

Por qué existe
--------------
El informe GEO/AEO del 2026-08-14 dejó dos deudas medidas:

  Punto 9. Un tagline heredado afirmaba liderazgo ("Pioneros en
  Neuroaprendizaje…") e impacto continental ("Transformamos la manera en que
  Latinoamérica aprende") sin evidencia publicable, y seguía servido en
  cientos de páginas. Corregirlo a mano en cada archivo habría sido un parche
  irreproducible: el generador de blogs lo habría reintroducido en la
  siguiente ejecución.

  Punto 10. Teléfono, domicilio, horarios y datos legales se repetían en el
  pipeline heredado en lugar de derivarse de src/_data/site.json.

Este script cierra el círculo: la identidad se edita en UN archivo y desde
ahí se propaga. El texto canónico del tagline no se inventó aquí — es el que
ya se revisó y publicó en fotolectura.html, que ATRIBUYE el año fundacional
en lugar de afirmar autoridad.

Garantías
---------
* Idempotente: escribe solo si el contenido cambia; una segunda corrida
  reporta cero archivos tocados y no altera mtimes.
* Conservador: toca exclusivamente los nodos de identidad conocidos
  (`.footer-tagline`, `.footer-legal-text`) y las frases retiradas. No
  reordena, reindenta ni reescribe el resto del documento.
* Verificable sin escribir: `--check` sale con código 1 si algo está
  desincronizado, para usarse como gate en CI.
* No toca `_archive/`: son backups fuera de la raíz servible.

Uso
---
    python3 tools/sync_site_identity.py            # aplicar
    python3 tools/sync_site_identity.py --check    # verificar sin escribir
    python3 tools/sync_site_identity.py --dry-run  # simular y listar
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE_JSON = ROOT / "src" / "_data" / "site.json"

# Entidades que el pie heredado usa; se comparan en texto plano.
ENTITIES = {
    "&aacute;": "á", "&eacute;": "é", "&iacute;": "í", "&oacute;": "ó",
    "&uacute;": "ú", "&ntilde;": "ñ", "&Aacute;": "Á", "&Eacute;": "É",
    "&Iacute;": "Í", "&Oacute;": "Ó", "&Uacute;": "Ú", "&Ntilde;": "Ñ",
    "&amp;": "&", "&copy;": "©", "&middot;": "·", "&nbsp;": " ",
}

# Frases retiradas por no ser demostrables.
#
# Dos formas distintas, con tratamiento distinto:
#
#   1. Nodo de tagline (`.footer-tagline`, `.foot-tag`): todo el contenido es
#      marca, así que se reemplaza por el tagline canónico completo.
#
#   2. Prosa de pie: varias páginas de curso abren su párrafo con la frase de
#      liderazgo y CONTINÚAN con una descripción legítima y específica de la
#      página ("Preparación académica, técnicas de estudio y acompañamiento…").
#      Ahí se sustituye únicamente la frase no demostrable y se conserva el
#      resto; borrar el párrafo entero destruiría contenido válido.
CLAIM_SENTENCE = re.compile(
    r"Pioneros\s+en\s+Neuroaprendizaje\s+y\s+Desarrollo\s+Mental\s+Acelerado"
    r"\s+desde\s+\d{4}\."
    r"(?:\s*Transformamos\s+la\s+manera\s+en\s+que\s+"
    r"Latinoam(?:é|&eacute;)rica\s+aprende\.)?",
    re.IGNORECASE,
)

TAGLINE_NODE = re.compile(
    r'(<p class="(?:footer-tagline|foot-tag)">)(.*?)(</p>)', re.DOTALL
)
LEGAL_NODE = re.compile(r'(<p class="footer-legal-text">)(.*?)(</p>)', re.DOTALL)

# Perfiles externos: mapeo de la variante servida al perfil canónico.
#
# Cada regla se apoya en una comprobación del 2026-08-16, no en una
# preferencia estética:
#
#   * `youtube.com/@worldbrainmexico` devuelve **HTTP 404**. El canal real es
#     `@worldbrainmx`, cuyo propio título es "WorldBrain México". El enlace
#     roto se servía 606 veces en 309 páginas porque tres generadores lo
#     repetían por separado.
#   * `twitter.com/...` sigue resolviendo, pero el sitio ya usa `x.com` en 606
#     enlaces; mantener dos dominios para el mismo perfil fragmenta la señal.
#   * `facebook.com/worldbrainmx1` queda detrás de login y no está indexado;
#     `facebook.com/WorldBrainMx/` es el perfil público activo.
#   * `facebook.com/ultravelozmente` e `instagram.com/ultravelozmente`
#     aparecen una vez cada uno en fastkids.html, con un aria-label que ya
#     dice "de WorldBrain México": apuntan al perfil de marca.
SOCIAL_REWRITES = {
    "https://youtube.com/@worldbrainmexico": ("youtube", None),
    "https://www.youtube.com/@worldbrainmexico": ("youtube", None),
    "https://twitter.com/WorldBrainMx": ("x", None),
    "https://www.facebook.com/worldbrainmx1": ("facebook", None),
    "https://www.facebook.com/ultravelozmente": ("facebook", None),
    "https://www.instagram.com/ultravelozmente": ("instagram", 0),
}


def canonical_social(site: dict, red: str, index: int | None) -> str:
    value = site["social"][red]
    if isinstance(value, list):
        return value[0 if index is None else index]
    return value


def load_site() -> dict:
    return json.loads(SITE_JSON.read_text(encoding="utf-8"))


def plain(text: str) -> str:
    """Texto sin entidades, para comparar contra site.json."""
    for entity, char in ENTITIES.items():
        text = text.replace(entity, char)
    return text


def legal_line(site: dict) -> str:
    legal = site["legal"]
    return (
        f'{legal["razonSocial"]} | RFC: {legal["rfc"]} | '
        f'Domicilio: {legal["domicilio"]}.'
    )


def servable_html() -> list[Path]:
    """Páginas reales del sitio: HTML plano en la raíz del repo.

    El sitio es plano por diseño — cada página vive en la raíz y Express la
    sirve desde ahí. Se excluye deliberadamente todo lo anidado: `_archive/`
    (backups), `src/` (plantillas Eleventy, no salida), `tools/lead_magnets/`
    (plantillas de PDF) y `google-trends-agent/` (SDK vendorizado con
    fixtures que ni siquiera son UTF-8). Tocar cualquiera de esos no
    cambiaría una sola página servida.
    """
    return sorted(ROOT.glob("*.html"))


def sync_text(html: str, site: dict, tagline: str, legal: str,
              prose: str) -> tuple[str, list[str]]:
    """Devuelve (html_sincronizado, cambios_aplicados)."""
    changes: list[str] = []

    def replace_tagline(match: re.Match[str]) -> str:
        current = plain(match.group(2)).strip()
        if current == tagline:
            return match.group(0)
        changes.append("tagline")
        return f"{match.group(1)}{tagline}{match.group(3)}"

    html = TAGLINE_NODE.sub(replace_tagline, html)

    def replace_legal(match: re.Match[str]) -> str:
        current = plain(match.group(2)).strip()
        if current == legal:
            return match.group(0)
        changes.append("linea-legal")
        return f"{match.group(1)}{legal}{match.group(3)}"

    html = LEGAL_NODE.sub(replace_legal, html)

    # Prosa de pie: se sustituye la frase sin evidencia y se conserva la
    # descripción específica que la sigue.
    html, hits = CLAIM_SENTENCE.subn(prose, html)
    if hits:
        changes.append(f"prosa-sin-evidencia x{hits}")

    # Perfiles externos: se normaliza al perfil verificado. Se ancla en el
    # valor entrecomillado, lo que cubre tanto `href="…"` como las cadenas de
    # `sameAs` en JSON-LD, donde un 404 declara al buscador una identidad
    # inexistente. No toca texto visible ni el píxel de medición.
    for served, (red, index) in SOCIAL_REWRITES.items():
        target = canonical_social(site, red, index)
        if served.rstrip("/") == target.rstrip("/"):
            continue
        for variant in (served, f"{served}/"):
            quoted = f'"{variant}"'
            if quoted in html:
                html = html.replace(quoted, f'"{target}"')
                changes.append(f"perfil-{red}")

    return html, changes


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="verifica sin escribir; sale 1 si hay desincronía")
    parser.add_argument("--dry-run", action="store_true",
                        help="simula y lista los archivos que cambiarían")
    args = parser.parse_args()

    site = load_site()
    tagline = site["tagline"]
    legal = legal_line(site)
    prose = f'{site["descriptor"]} {site["foundingStatement"]}'

    for claim in ("Pioneros en Neuroaprendizaje", "Transformamos la manera en que"):
        if claim in tagline:
            print(f"❌ El tagline de site.json reintroduce un claim sin "
                  f"evidencia: {claim!r}", file=sys.stderr)
            return 2

    if str(site["foundedYear"]) not in tagline:
        print(f"❌ El tagline debe citar foundedYear "
              f"({site['foundedYear']}) para no abrir una segunda fuente "
              f"de año.", file=sys.stderr)
        return 2

    pending: list[tuple[Path, list[str]]] = []
    for path in servable_html():
        original = path.read_text(encoding="utf-8")
        updated, changes = sync_text(original, site, tagline, legal, prose)
        if updated == original:
            continue
        pending.append((path, changes))
        if not (args.check or args.dry_run):
            path.write_text(updated, encoding="utf-8")

    if args.check:
        if pending:
            print(f"❌ {len(pending)} archivo(s) fuera de la fuente única "
                  f"src/_data/site.json:")
            for path, changes in pending:
                print(f"   {path.relative_to(ROOT)} → {', '.join(sorted(set(changes)))}")
            print("   Fix: python3 tools/sync_site_identity.py")
            return 1
        print(f"✅ Identidad sincronizada: {len(servable_html())} HTML "
              f"servibles derivan de src/_data/site.json.")
        return 0

    verb = "cambiarían" if args.dry_run else "actualizados"
    print(f"{verb}: {len(pending)} de {len(servable_html())} HTML servibles")
    for path, changes in pending:
        print(f"   {path.relative_to(ROOT)} → {', '.join(sorted(set(changes)))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
