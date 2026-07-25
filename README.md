# WorldBrain México — ultravelozmente.com

Sitio estático + `server.js` (Express) con canonicalización, sitemap dinámico
y Meta CAPI. Migración a Eleventy en curso (`src/`).

## Regla de oro
**Ningún dato de negocio vive en HTML.** Teléfonos, sedes, cifras, año
fundacional y testimonios tienen una sola fuente de verdad. Corregir un dato
= editar un lugar.

## Tareas comunes

| Necesito… | Hago… |
|---|---|
| Cambiar teléfono/sede/cifra | Editar `src/_data/site.json` + propagar (temporal, hasta completar Eleventy) |
| Añadir testimonio | Consentimiento firmado → `data/testimonials.json` con `verified: true`. Sin evidencia = no se publica |
| Unificar año fundacional | `python3 fix_founding_year.py --year <año>` |
| Limpiar avatares falsos | `python3 fix_fake_testimonials.py` |
| Verificar antes de commit | `./check.sh` (se ejecuta solo si instalaste el hook) |

## Instalación del pre-commit hook (una vez por clon)
```bash
chmod +x check.sh && ln -sf ../../check.sh .git/hooks/pre-commit
```

## Los 7 gates (existen porque cada bug ya ocurrió una vez)
1. Cero avatares falsos (pravatar/randomuser)
2. Cero sedes no verificadas (Guadalajara)
3. Cero secretos hardcodeados
4. Script infectante sigue retirado
5. Cero backups en raíz servible
6. Un solo año fundacional en todo el sitio
7. Solo teléfonos autorizados
