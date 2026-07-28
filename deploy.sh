#!/usr/bin/env bash
# ================================================================
# deploy.sh — Deploy atómico a Hostinger con verificación.
# Uso (desde tu máquina local, en la raíz del repo):
#   ./deploy.sh
# Requiere: acceso SSH configurado (ssh hostinger) y check.sh
# ================================================================
set -euo pipefail

REMOTE="${HOSTINGER_USER:-u955702115}@${HOSTINGER_IP:-127.0.0.1}"
REMOTE_PORT="${HOSTINGER_PORT:-65002}"
APP_DIR="domains/ultravelozmente.com/nodejs"
URL="https://ultravelozmente.com"

echo "── 1/5 Quality gates locales ──"
./check.sh   # si un gate falla, el deploy NI EMPIEZA

echo "── 2/5 Sync de archivos (rsync = atómico por archivo) ──"
rsync -avz --delete -e "ssh -p $REMOTE_PORT" \
  --include='*.html' --include='css/***' --include='js/***' \
  --include='images/***' --include='data/***' \
  --include='server.js' --include='package.json' --include='package-lock.json' \
  --include='robots.txt' --include='llms.txt' \
  --exclude='node_modules' --exclude='.git' --exclude='_archive' \
  --exclude='src' --exclude='_site' --exclude='sitemap.xml' --exclude='*' \
  ./ "$REMOTE:$APP_DIR/"

echo "── 3/5 Dependencias en el servidor ──"
ssh -p "$REMOTE_PORT" "$REMOTE" \
  "cd $APP_DIR && npm install --omit=dev --no-audit --no-fund"

echo "── 4/5 Restart ──"
ssh -p "$REMOTE_PORT" "$REMOTE" "mkdir -p $APP_DIR/tmp && touch $APP_DIR/tmp/restart.txt"
sleep 5

echo "── 5/5 Smoke tests contra producción ──"
fail=0
check() {
  local desc="$1" url="$2" expect="$3"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$code" = "$expect" ]; then
    echo "  ✅ $desc ($code)"
  else
    echo "  ❌ $desc — esperaba $expect, obtuve $code"
    fail=1
  fi
}
check "Homepage"                "$URL/"                       "200"
check "Robotics (limpia)"       "$URL/robotics"               "200"
check "COMIPEMS"                "$URL/comipems"               "200"
check "Admisión universitaria"   "$URL/admision-universitaria" "200"
check "Homeschool"              "$URL/homeschool"             "200"
check "Sitemap"                 "$URL/sitemap.xml"            "200"
check "robots.txt"              "$URL/robots.txt"             "200"
check "llms.txt"                "$URL/llms.txt"               "200"
check "Términos"                "$URL/terminos"               "200"
check "404"                     "$URL/404"                    "404"
check "robotics.html → 301"     "$URL/robotics.html"          "301"
check "comipems.html → 301"     "$URL/comipems.html"          "301"

infected=$(curl -s "$URL/" | grep -c "randomuser\|pravatar\|images.unsplash.com" || true)
if [ "$infected" -eq 0 ]; then
  echo "  ✅ Producción limpia (0 avatares/imágenes externas falsas)"
else
  echo "  ❌ PRODUCCIÓN INFECTADA: $infected referencias a avatares/imágenes externas"
  fail=1
fi

sitemap_bad=$(curl -s "$URL/sitemap.xml" | grep -c "\.html\|/404" || true)
if [ "$sitemap_bad" -eq 0 ]; then
  echo "  ✅ Sitemap sin .html ni /404"
else
  echo "  ❌ Sitemap contiene URLs .html o /404"
  fail=1
fi

if [ "$fail" -eq 1 ]; then
  echo ""
  echo "⛔ DEPLOY CON ERRORES — revisar arriba. El sitio puede estar sirviendo contenido incorrecto."
  exit 1
fi
echo ""
echo "🚀 Deploy verificado: producción = repo, gates en verde."
