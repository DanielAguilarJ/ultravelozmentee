#!/usr/bin/env python3
"""
fix_founding_year.py — Unifica el año fundacional en TODO el sitio.

Por qué existe: robotics.html dice "Desde 1994", el resto del sitio
dice "desde 2000", y el hero de index dice "30+ años". En el sitio de
una escuela de matemáticas, las matemáticas tienen que cuadrar.

Uso:
    python3 fix_founding_year.py --year 1994 --dry-run   # simular
    python3 fix_founding_year.py --year 1994             # aplicar

Idempotente: correrlo N veces da el mismo resultado.
"""
import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent
EXCLUDE_DIRS = {"_archive", "node_modules", "_site", ".git"}

YEAR_PATTERNS = [
    re.compile(r"([Dd]esde\s+)(19|20)\d{2}"),          # "desde 1994" / "Desde 2000"
    re.compile(r"([Ff]undad[oa]\s+en\s+)(19|20)\d{2}"),
]


def process(path: Path, year: str, dry_run: bool) -> int:
    original = path.read_text(encoding="utf-8")
    content = original
    for pat in YEAR_PATTERNS:
        content = pat.sub(lambda m: f"{m.group(1)}{year}", content)

    if content == original:
        return 0
    if not dry_run:
        path.write_text(content, encoding="utf-8")
    return sum(
        1 for pat in YEAR_PATTERNS for _ in pat.finditer(original)
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", required=True,
                        help="Año fundacional oficial (ej. 1994)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not re.fullmatch(r"(19|20)\d{2}", args.year):
        print(f"❌ Año inválido: {args.year}", file=sys.stderr)
        return 1

    total_files, total_fixes = 0, 0
    for path in sorted(ROOT.rglob("*.html")):
        if EXCLUDE_DIRS & set(path.parts):
            continue
        fixes = process(path, args.year, args.dry_run)
        if fixes:
            prefix = "[DRY-RUN] " if args.dry_run else "✅ "
            print(f"{prefix}{path.relative_to(ROOT)}: {fixes} mención(es) → {args.year}")
            total_files += 1
            total_fixes += fixes

    site_json = ROOT / "src" / "_data" / "site.json"
    if site_json.exists():
        content = site_json.read_text(encoding="utf-8")
        fixed = re.sub(r'("foundedYear":\s*)(19|20)\d{2}', rf"\g<1>{args.year}", content)
        if fixed != content and not args.dry_run:
            site_json.write_text(fixed, encoding="utf-8")
            print(f"✅ src/_data/site.json: foundedYear → {args.year}")

    print(f"\n{'Simulación' if args.dry_run else 'Unificación'} completa: "
          f"{total_fixes} corrección(es) en {total_files} archivo(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
