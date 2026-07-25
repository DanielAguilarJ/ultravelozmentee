#!/usr/bin/env bash
# Quality gates locales — espejo del CI. Bloquea el commit si falla.
set -euo pipefail

fail=0

# Gate 1: cero avatares falsos (la reinfección queda vetada)
if grep -rln "pravatar\.cc\|randomuser\.me" --include="*.html" . | grep -v "_archive"; then
  echo "❌ Gate 1: avatares falsos detectados (pravatar/randomuser)."
  echo "   Fix: python3 fix_fake_testimonials.py"
  fail=1
fi

# Gate 2: cero sedes no verificadas hardcodeadas
if grep -rln "Guadalajara" --include="*.html" . | grep -v "_archive"; then
  echo "❌ Gate 2: sede no verificada (Guadalajara) en HTML servible."
  fail=1
fi

# Gate 3: cero secretos hardcodeados en JS del servidor
if grep -rn "API_TOKEN\s*=\s*['\"]" server.js js/ 2>/dev/null; then
  echo "❌ Gate 3: token hardcodeado. Solo process.env.API_TOKEN."
  fail=1
fi

# Gate 4: el script retirado no debe reaparecer funcional
if ! grep -q "sys.exit" update_global_testimonials.py 2>/dev/null; then
  echo "❌ Gate 4: update_global_testimonials.py volvió a su versión infectante."
  fail=1
fi

# Gate 5: cero backups en la raíz servible
if ls *backup*.html *-old.html 2>/dev/null | grep -q .; then
  echo "❌ Gate 5: archivos backup en raíz. Muévelos: git mv <archivo> _archive/"
  fail=1
fi

if [ "$fail" -eq 1 ]; then
  echo ""
  echo "⛔ Commit bloqueado. Corrige los gates y reintenta."
  exit 1
fi

echo "✅ Todos los gates pasan."
