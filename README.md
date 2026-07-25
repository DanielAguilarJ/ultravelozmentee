# WorldBrain México — ultravelozmente.com

Sitio estático de neuroaprendizaje y robótica educativa. **Ningún dato de negocio vive en HTML.**

## Tareas comunes

### Cambiar teléfono, horarios, sedes o cifras
Edita `data/site-data.js` (o `src/_data/site.json`). Un solo archivo actualiza las páginas.

### Añadir un testimonio
1. Consigue consentimiento firmado + evidencia → archívalos en Drive.
2. Añádelo a `data/site-data.js` con `"verified": true`.
3. Sin evidencia → `"verified": false` → no se publica (regla en el build, no negociable).

### Abrir la sede de Guadalajara
`data/site-data.js` → locations → Guadalajara → `"verified": true`. Eso es todo.

### Modificar niveles/proyectos/FAQ de un curso
`src/_data/courses.json`. El FAQ visible y el schema de Google salen del mismo dato.

## Comandos
- `npm run dev` — servidor local con hot reload
- `npm run build` — genera `_site/`
- `npm run check:external` — verifica cero imágenes de terceros

## Reglas que el CI hace cumplir
1. Cero `randomuser.me` / `pravatar.cc` (credibilidad/legal)
2. Cero sedes hardcodeadas desiertas (publicidad engañosa)
3. Build debe pasar
