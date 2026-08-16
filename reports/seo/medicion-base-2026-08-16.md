# Medición de base: campo, señales externas y rastreo

**Fecha de medición:** 2026-08-16
**Propiedad:** `https://ultravelozmente.com/` (Search Console, `siteFullUser`)

Este documento registra **solo lo medido**. Cada cifra lleva su fuente y su
periodo. Donde no hay dato, se dice que no hay dato: no se estima, no se
interpola y no se sustituye campo por laboratorio.

---

## 1. Core Web Vitals — sin datos de campo actuales

**Resultado: no existen Core Web Vitals de campo vigentes para este sitio.**

La History API pública que alimenta CrUX Vis devolvió `HTTP 200` para el
origen, pero en la ventana más reciente (**2026-07-12 – 2026-08-08**) LCP, INP
y CLS tienen `p75: null` en `PHONE` y en `DESKTOP`. Es decir: el origen está
en CrUX, pero no acumuló muestra suficiente en el periodo actual.

### Histórico disponible — NO representa el estado actual

| Métrica | p75 | Categoría | Factor | Periodo de la muestra |
|---|---:|---|---|---|
| LCP | 1953 ms | good | DESKTOP | 2025-11-30 – 2025-12-27 |
| INP | 87 ms | good | DESKTOP | 2025-11-23 – 2025-12-20 |
| CLS | **0.52** | **poor** | DESKTOP | 2025-11-30 – 2025-12-27 |
| LCP | 3427 ms | needs improvement | PHONE | 2026-03-08 – 2026-04-04 |
| INP | 233 ms | needs improvement | PHONE | 2025-11-23 – 2025-12-20 |
| CLS | **0.30** | **poor** | PHONE | 2026-03-08 – 2026-04-04 |

Lectura honesta: **CLS aparecía en «poor» en ambos factores** y LCP móvil en
«needs improvement». Son las únicas señales de campo que existen y son
antiguas; sirven como hipótesis de trabajo, no como estado presente.

### Errores exactos obtenidos

- Entorno, `.env` y `.env.example`: **ninguna** clave que coincida con
  `psi|crux|pagespeed|google_api`. No se imprimió ningún valor.
- 12 consultas directas a la CrUX API (origen y cinco URLs, `PHONE`/`DESKTOP`)
  sin credencial → `HTTP 403 PERMISSION_DENIED`:
  *«Method doesn't allow unregistered callers (callers without established
  identity). Please use API Key or other form of API consumer identity.»*
- History API por URL (`/`, `/fotolectura`, `/robotics`, `/blog-index`,
  `/nosotros`), ambos factores → `HTTP 404 NOT_FOUND`,
  literal `chrome ux report data not found`.
- PageSpeed Insights público sin clave, 10 combinaciones →
  `HTTP 429 RESOURCE_EXHAUSTED`; cuota del consumidor público en `0`.
- **No** se ejecutó Lighthouse. No se usaron datos de laboratorio como
  sustituto de campo.

### Qué haría falta

Una clave de Google Cloud con **Chrome UX Report API** habilitada permitiría
consultar `queryRecord`, pero **no crearía muestras que no existen**. Cada
origen o URL necesita tráfico elegible de Chrome suficiente; Google no publica
el umbral. CrUX usa ventana móvil de 28 días con unos dos días de retraso.

---

## 2. Accesibilidad del sitio — discrepancia registrada

Desde este host, tres pilas TLS distintas (LibreSSL/curl, OpenSSL `s_client`,
Python `ssl`) obtuvieron el mismo comportamiento: **TCP 443 acepta y el saludo
TLS se corta** (`SSL_ERROR_SYSCALL`, `UNEXPECTED_EOF_WHILE_READING`). DNS
resuelve a `92.113.23.228` y `92.113.16.185`; un dominio de control respondió
`HTTP 200`.

**No se concluye que el sitio esté caído.** Search Console demuestra lo
contrario: `/comipems` fue rastreada por Google el **2026-08-16**. La
explicación compatible con ambas observaciones es un filtrado por cliente,
huella TLS o red de origen. Queda anotado como pendiente de verificar desde
otra red, no como incidencia de disponibilidad.

---

## 3. Sitemap y rastreo — corregido y medido

### Estado encontrado

Search Console tenía **cinco sitemaps registrados y los cinco con errores**, y
**ninguno era el que el sitio genera de verdad**:

| Sitemap registrado | Última descarga | Estado | Errores |
|---|---|---|---:|
| `sitemap_index.xml` | 2026-07-25 | Has errors | 2 |
| `page-sitemap.xml` | 2026-07-24 | Has errors | 2 |
| `e-landing-page-sitemap.xml` | 2026-07-17 | Has errors | 2 |
| `locations.kml` | 2026-07-19 | Has errors | 2 |
| `video-sitemap.xml` | 2026-07-20 | Has errors | 2 |

Ninguna de esas rutas existe en el repositorio: son restos de la etapa
WordPress/Yoast. `sitemap_index.xml` se envió por última vez el 2025-03-14 y
su desglose de contenido está **vacío**. Mientras tanto, `robots.txt` declara
`Sitemap: https://ultravelozmente.com/sitemap.xml` y `server.js` lo sirve,
pero **nunca se había enviado a Search Console**.

### Acción aplicada

Se envió `https://ultravelozmente.com/sitemap.xml` el **2026-08-16 19:32**.
Google lo descargó en el mismo momento:

| Sitemap | Estado | URLs declaradas | Errores |
|---|---|---:|---:|
| `sitemap.xml` | **Valid** | **310** | **0** |

Los cinco heredados **siguen registrados**; retirarlos es una acción sobre un
sistema compartido y queda pendiente de decisión explícita.

### Indexabilidad verificada por URL

| URL | Veredicto | Cobertura | Último rastreo |
|---|---|---|---|
| `/` | PASS | Submitted and indexed | 2026-08-14 |
| `/fotolectura` | PASS | Submitted and indexed | 2026-08-06 |
| `/blog-index` | PASS | Submitted and indexed | 2026-08-06 |
| `/comipems` | PASS | Submitted and indexed | 2026-08-16 |
| `/nosotros` | NEUTRAL | **URL is unknown to Google** | **Never** |
| `/diplomado-matematicas-fisica` | NEUTRAL | **URL is unknown to Google** | **Never** |

Las dos páginas invisibles son exactamente las que el PR #32 corrigió. Ese PR
está fusionado en `main`, pero **el despliegue es manual y no se ha
ejecutado**: hasta entonces producción sigue sirviendo el sitemap anterior y
pedir reindexación de `/nosotros` no puede funcionar.

---

## 4. Línea base de rendimiento

Fuente: Search Console, dimensión `date`, 28 días **2026-07-19 – 2026-08-16**.

| Métrica | Valor |
|---|---:|
| Clics | 68 |
| Impresiones | 3 281 |
| CTR medio | 2,07 % |
| Posición media diaria | rango 4,1 – 25,5 |

Advertencias necesarias:

- El último día (2026-08-16, 8 impresiones) está **incompleto** por el retraso
  habitual de Search Console; no debe leerse como caída.
- Las impresiones crecen con fuerza desde el 2026-08-07 (162 → 491 el 08-10)
  mientras el CTR baja a 0,8 %. Un aumento de impresiones con CTR a la baja es
  compatible con impresiones poco relevantes, el mismo patrón ya documentado
  en Robotics; **no** se interpreta como mejora hasta comparar por consulta.
- La muestra es pequeña. Diferencias de uno o dos clics no son señal.

### Seguimiento acordado

Volver a medir con la **misma consulta y el mismo rango de 28 días** en:

1. **Semana 1** tras el despliegue — comprobar que `/nosotros` y
   `/diplomado-matematicas-fisica` pasan de «never crawled» a rastreadas.
2. **Semana 4** — comparar clics, impresiones, CTR y posición contra esta
   línea base.
3. **Semana 8** — comprobar si CrUX ya publica p75 para el origen.

Ningún resultado se dará por bueno sin el export que lo respalde.

---

## 5. Señales externas — auditado, no fabricado

No se creó ni se sugirió crear ninguna reseña, enlace o mención. Lo detectado
son inconsistencias reales entre lo que publica el sitio y lo que publican los
perfiles.

### Corregido en el repositorio

| Hallazgo | Evidencia | Estado |
|---|---|---|
| Canal de YouTube del pie devuelve **HTTP 404** | `youtube.com/@worldbrainmexico` → 404 verificado; se servía 606 veces en 309 páginas y también dentro de `sameAs` | **Corregido**: apunta a `@worldbrainmx`, cuyo título propio es «WorldBrain México» |
| Dos dominios para el mismo perfil | `twitter.com` (2) y `x.com` (606) | **Unificado** en `x.com` |
| Perfil de Facebook tras login | `facebook.com/worldbrainmx1` no indexado | **Redirigido** al perfil público activo |
| Handles inexistentes de marca | `facebook.com/ultravelozmente`, `instagram.com/ultravelozmente` en `fastkids.html` | **Normalizados** al perfil de marca |

### Fuera del repositorio — requiere acción del propietario

| Superficie | Inconsistencia observada |
|---|---|
| Google Maps | Local **186 B**, C.P. **54750**, horario L–S 08:00–18:00; el oficial es Loc 282-283, C.P. 54700 y L-J 9-18 / V 9-17 / S 8-15. Existe además un **duplicado cerrado** en Avenida Benito Juárez 6 |
| Facebook | Domicilio «C.C. Mega Izc. 1 mayo 24 Int. 183», no locales 282-283 |
| Emagister | Razón social «WORLDBRAIN MEXICO S.C.» y sede **Morelos/Cuernavaca**; ofrece dos cursos en Cuernavaca |
| X | Publica un teléfono de Cuernavaca **777 532 6012**, no autorizado |
| Trustpilot | Snippet indexado con «Colonia Hidalgo» y `ventas@ultravelozmente.com`, distinto del correo oficial |

Prioridad propuesta: 1) reclamar y corregir Maps y fusionar el duplicado;
2) unificar NAP en los perfiles; 3) consolidar duplicados sociales;
4) actualizar Emagister y Trustpilot.

### No verificado

- `facebook.com/worldbrainmx1` exige inicio de sesión.
- Trustpilot devolvió `403` al acceso directo.
- **No se encontraron** menciones en prensa, cámaras de comercio ni
  instituciones al buscar por dominio, teléfonos, RFC y domicilio. Eso no
  demuestra que no existan; demuestra que no aparecen en búsqueda pública.

---

## 6. Lo que sigue dependiendo de terceros o del tiempo

| Pendiente | De quién depende |
|---|---|
| Rastreo de `/nosotros` y `/diplomado-matematicas-fisica` | Ejecutar el despliegue manual, después Google |
| Core Web Vitals de campo | Clave de CrUX **y** acumulación de tráfico real |
| Fichas de Maps, Emagister, Trustpilot | Propietario del negocio |
| Efecto en clics, posición y conversiones | Semanas de medición tras el despliegue |

Nada de lo anterior garantiza citas en asistentes, posiciones ni
recomendaciones. Lo que se puede afirmar es que el sitio ya no declara
identidades falsas ni enlaces rotos, y que su sitemap real está registrado y
válido por primera vez.
