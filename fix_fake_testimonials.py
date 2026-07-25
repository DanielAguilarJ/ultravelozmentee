#!/usr/bin/env python3
"""
fix_fake_testimonials.py — Elimina el 'Global Social Proof Footer' con
avatares falsos (i.pravatar.cc / randomuser.me) de todo el sitio.

Por qué existe: update_global_testimonials.py inyectó testimonios con
fotos de generadores aleatorios en 34 páginas, incluyendo las legales
(términos, privacidad, reembolsos). Riesgo: credibilidad + publicidad
engañosa + requests a terceros sin SLA.

Uso:
    python3 fix_fake_testimonials.py --dry-run   # ver qué cambiaría
    python3 fix_fake_testimonials.py             # aplicar

Idempotente: correrlo dos veces no rompe nada.
"""
import argparse
import re
import sys
from pathlib import Path

# ── Configuración ────────────────────────────────────────────
ROOT = Path(__file__).parent

# Páginas donde el bloque de testimonios NO tiene sentido comercial:
LEGAL_PAGES = {"terminos.html", "privacidad.html", "reembolsos.html"}

# Archivos que jamás se tocan
EXCLUDE = {"googleb3cccf1efd67c490.html", "404.html"}

# Patrones de footers de social proof inyectados
FOOTER_PATTERNS = [
    re.compile(
        r'\s*<!-- Global Social Proof Footer -->\s*'
        r'<div class="global-social-proof-footer".*?</div>\s*</div>\s*</div>\s*</div>',
        re.DOTALL,
    ),
    re.compile(
        r'\s*<!-- Social Proof -->\s*'
        r'<div class="footer-social-proof">.*?</div>\s*</div>\s*</div>',
        re.DOTALL,
    ),
]

# Cualquier <img> que apunte a generadores de avatares falsos
FAKE_IMG_PATTERN = re.compile(
    r'<img[^>]*src="https?://(?:i\.pravatar\.cc|randomuser\.me)[^"]*"[^>]*>',
    re.IGNORECASE,
)

# Cualquier div con background-image que apunte a generadores de avatares falsos
FAKE_BG_PATTERN = re.compile(
    r'<div[^>]*style="[^"]*background-image:\s*url\([\'"]?https?://(?:i\.pravatar\.cc|randomuser\.me)[^\'"]*[\'"]?\)[^"]*"[^>]*>\s*</div>',
    re.IGNORECASE,
)


def initials_from_alt(img_tag: str, index: int) -> str:
    """Genera un avatar local de iniciales a partir del alt de la imagen."""
    alt = re.search(r'alt="([^"]*)"', img_tag)
    name = (alt.group(1) if alt else "").strip()
    words = [w for w in re.sub(r"[^\wÁÉÍÓÚÑáéíóúñ. ]", "", name).split() if w]
    initials = "".join(w[0].upper() for w in words[:2]) or "WB"
    hue = (index % 4) + 1
    return (
        f'<div class="avatar-initials" data-hue="{hue}" '
        f'aria-hidden="true">{initials}</div>'
    )


def process(path: Path, dry_run: bool) -> str | None:
    original = path.read_text(encoding="utf-8")
    content = original

    if path.name in LEGAL_PAGES:
        # Páginas legales: los bloques de social proof desaparecen por completo
        for pat in FOOTER_PATTERNS:
            content = pat.sub("", content)
        counter = 0
        def repl_legal(match: re.Match) -> str:
            nonlocal counter
            counter += 1
            return initials_from_alt(match.group(0), counter)
        content = FAKE_IMG_PATTERN.sub(repl_legal, content)
        content = FAKE_BG_PATTERN.sub(lambda m: '<div class="avatar-initials" data-hue="1" aria-hidden="true">WB</div>', content)
        action = "footer de social proof eliminado (página legal)"
    else:
        counter = 0
        def repl(match: re.Match) -> str:
            nonlocal counter
            counter += 1
            return initials_from_alt(match.group(0), counter)

        content = FAKE_IMG_PATTERN.sub(repl, content)
        content = FAKE_BG_PATTERN.sub(lambda m: '<div class="avatar-initials" data-hue="1" aria-hidden="true">WB</div>', content)
        action = f"avatar(es) falso(s) reemplazado(s)"

    if content == original:
        return None
    if not dry_run:
        path.write_text(content, encoding="utf-8")
    return action


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    changed = 0
    for path in sorted(ROOT.glob("*.html")):
        if path.name in EXCLUDE or "_archive" in path.parts:
            continue
        action = process(path, args.dry_run)
        if action:
            prefix = "[DRY-RUN] " if args.dry_run else "✅ "
            print(f"{prefix}{path.name}: {action}")
            changed += 1

    remaining = [
        p.name for p in ROOT.glob("*.html")
        if p.name not in EXCLUDE and "_archive" not in p.parts
        and re.search(r"pravatar\.cc|randomuser\.me", p.read_text(encoding="utf-8"))
    ]
    if remaining and not args.dry_run:
        print(f"\n❌ AÚN QUEDAN referencias en: {remaining}", file=sys.stderr)
        return 1

    print(f"\n{'Simulación' if args.dry_run else 'Limpieza'} completa: {changed} archivo(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
