#!/usr/bin/env bash
# ================================================================
# check.sh v2 — Quality gates locales. Espejo del CI.
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
ALLOWED_PHONES="5578107837|55 7810 7837|55\) 7810-7837|\+52 55 7810-7837|55-7810-7837|5558686784|55 5868 6784|5512345678|55 1234 5678|5578107833"
found_phones=$(grep -roE $GREP_EXCLUDES "(\+52\s?)?\(?55\)?[ -]?[0-9]{4}[ -]?[0-9]{4}" --include="*.html" . 2>/dev/null \
  | cut -d: -f2- | grep -vE "$ALLOWED_PHONES" | sort -u || true)
if [ -n "$found_phones" ]; then
  say "❌ Gate 7: teléfono(s) NO autorizados detectados:"
  printf '   %s\n' "$found_phones"
  say "   Si es real: añádelo a ALLOWED_PHONES en check.sh (con aprobación)."
  say "   Si no: elimínalo — un número muerto es un lead quemado."
  fail=1
fi

# ── Veredicto ────────────────────────────────────────────────
if [ "$fail" -eq 1 ]; then
  say ""
  say "⛔ Commit bloqueado. Corrige los gates y reintenta."
  say "   (Bypass de emergencia, bajo tu responsabilidad: git commit --no-verify)"
  exit 1
fi

say "✅ Todos los gates pasan (7/7)."
