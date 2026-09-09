#!/usr/bin/env bash
# ================================================================
# check.sh v3 — Quality gates locales. Espejo del CI.
# Instalación (una vez por clon):
#   chmod +x check.sh && ln -sf ../../check.sh .git/hooks/pre-commit
# Cada gate existe porque su bug ya ocurrió una vez. No se negocian.
# ================================================================
set -euo pipefail

fail=0
say() { printf '%s\n' "$*"; }

GREP_EXCLUDES="--exclude-dir=_archive --exclude-dir=node_modules --exclude-dir=_site --exclude-dir=.git"

html_grep() {
  grep -rln $GREP_EXCLUDES "$1" --include="*.html" . 2>/dev/null || true
}

# ── Gate 1: cero avatares falsos ─────────────────────────────
if [ -n "$(html_grep 'pravatar\.cc\|randomuser\.me')" ]; then
  say "❌ Gate 1: avatares falsos detectados (pravatar/randomuser)."
  say "   Fix: python3 fix_fake_testimonials.py"
  fail=1
fi

# ── Gate 2: cero sedes no verificadas ────────────────────────
if [ -n "$(html_grep 'Guadalajara')" ]; then
  say "❌ Gate 2: sede no verificada (Guadalajara) en HTML servible."
  fail=1
fi

# ── Gate 3: cero secretos hardcodeados ───────────────────────
if grep -rn $GREP_EXCLUDES "API_TOKEN\s*=\s*['\"]" server.js js/ 2>/dev/null; then
  say "❌ Gate 3: token hardcodeado. Solo process.env.API_TOKEN."
  fail=1
fi

# ── Gate 4: script retirado sigue retirado ───────────────────
if [ -f update_global_testimonials.py ] && \
   ! grep -q "sys.exit" update_global_testimonials.py; then
  say "❌ Gate 4: update_global_testimonials.py volvió a su versión infectante."
  fail=1
fi

# ── Gate 5: cero backups en raíz servible ────────────────────
if compgen -G "*backup*.html" >/dev/null || compgen -G "*-old.html" >/dev/null; then
  say "❌ Gate 5: archivos backup en raíz. Fix: git mv <archivo> _archive/"
  fail=1
fi

# ── Gate 6: UN solo año fundacional en todo el sitio ─────────
years=$(grep -roE $GREP_EXCLUDES "[Dd]esde (19|20)[0-9]{2}" --include="*.html" . 2>/dev/null \
  | cut -d: -f2- | tr '[:upper:]' '[:lower:]' | sort -u)
year_count=$(printf '%s\n' "$years" | grep -c . || true)
if [ "$year_count" -gt 1 ]; then
  say "❌ Gate 6: años fundacionales inconsistentes:"
  printf '   %s\n' "$years"
  say "   Fix: python3 fix_founding_year.py --year <año_oficial>"
  fail=1
fi

# ── Gate 7: solo teléfonos autorizados ───────────────────────
# La lista se DERIVA de src/_data/site.json (phonesAuthorized), la única
# fuente de verdad. Antes estaba escrita a mano aquí, así que autorizar o
# retirar una línea exigía editar dos lugares y el gate podía quedar
# desincronizado del sitio que vigila.
ALLOWED_PHONES=$(python3 - <<'PY'
import json, re
from pathlib import Path

site = json.loads(Path("src/_data/site.json").read_text(encoding="utf-8"))
variants = []
for phone in site["phonesAuthorized"]:
    d = phone["digits"]                      # p. ej. 5578107837
    lada, a, b = d[:2], d[2:6], d[6:]        # 55 | 7810 | 7837
    variants += [
        d,                                   # 5578107837
        f"{lada} {a} {b}",                   # 55 7810 7837
        rf"{lada}\) {a}-{b}",                # 55) 7810-7837
        rf"\+52 {lada} {a}-{b}",             # +52 55 7810-7837
        f"{lada}-{a}-{b}",                   # 55-7810-7837
        f"{lada} {a}-{b}",                   # 55 7810-7837
    ]
print("|".join(variants))
PY
)
if [ -z "$ALLOWED_PHONES" ]; then
  say "❌ Gate 7: no se pudo derivar phonesAuthorized de src/_data/site.json"
  fail=1
fi
found_phones=$(grep -roE $GREP_EXCLUDES "(\+52\s?)?\(?55\)?[ -]?[0-9]{4}[ -]?[0-9]{4}" --include="*.html" . 2>/dev/null \
  | cut -d: -f2- | grep -vE "$ALLOWED_PHONES" | sort -u || true)
if [ -n "$found_phones" ]; then
  say "❌ Gate 7: teléfono(s) NO autorizados detectados:"
  printf '   %s\n' "$found_phones"
  say "   Si es real: añádelo a phonesAuthorized en src/_data/site.json (con aprobación)."
  say "   Si no: elimínalo — un número muerto es un lead quemado."
  fail=1
fi

# ── Gate 7b: la identidad servida deriva de src/_data/site.json ──
# Causa raíz: un tagline sin evidencia sobrevivió en ~300 HTML porque cada
# corrección era un parche manual que el generador revertía.
if [ -f tools/sync_site_identity.py ]; then
  if ! python3 tools/sync_site_identity.py --check; then
    fail=1
  fi
fi

# ── Gate 8: dependencias de server.js declaradas en package.json ──
# Causa raíz del incidente 'Cannot find module express': un
# package.json de build reemplazó al de runtime. Nunca más.
if [ -f server.js ] && [ -f package.json ]; then
  NODE_BUILTINS="fs|path|http|https|url|crypto|os|stream|events|util|buffer|querystring|child_process"
  server_deps=$(grep -oE "require\('([a-z0-9@/_-]+)'\)" server.js \
    | sed "s/require('//;s/')//" \
    | grep -v "^\." | grep -vE "^($NODE_BUILTINS)$" | sort -u)   # excluye requires locales y builtins
  for dep in $server_deps; do
    if ! grep -q "\"$dep\"" package.json; then
      say "❌ Gate 8: server.js requiere '$dep' pero no está en package.json"
      say "   Fix: npm install $dep --save"
      fail=1
    fi
  done
fi

# ── Gate 9: auditoría SEO estructural ────────────────────────
if [ -f scripts/seo-audit.js ]; then
  if ! node scripts/seo-audit.js; then
    say "❌ Gate 9: auditoría SEO fallida."
    fail=1
  fi
fi

# ── Gate 10: contenido editorial moderno, generado y 10/10 ──
# Desde el ID 1025 cada post nace bajo el contrato estricto. Este gate evita
# tres regresiones que antes dependían de memoria humana: olvidar correr los
# dos revisores, olvidar reconstruir los HTML y dejar el índice/API obsoletos.
if [ -f tools/seo_content/review_strict_content.py ]; then
  if ! python3 tools/seo_content/build_html.py --check; then
    say "❌ Gate 10: HTML del blog desactualizado."
    fail=1
  fi
  if ! python3 tools/seo_content/build_blog_index.py --check; then
    say "❌ Gate 10: índice del blog o data/posts.json desactualizado."
    fail=1
  fi
  if ! python3 tools/seo_content/review_strict_content.py; then
    say "❌ Gate 10: algún post moderno no alcanza calidad y SEO 10/10."
    fail=1
  fi
  if ! python3 test/test_seo_content_reviewers.py; then
    say "❌ Gate 10: regresión en los revisores de contenido."
    fail=1
  fi
fi

# ── Veredicto ────────────────────────────────────────────────
if [ "$fail" -eq 1 ]; then
  say ""
  say "⛔ Commit bloqueado. Corrige los gates y reintenta."
  say "   (Bypass de emergencia, bajo tu responsabilidad: git commit --no-verify)"
  exit 1
fi

say "✅ Todos los gates pasan (10/10)."
