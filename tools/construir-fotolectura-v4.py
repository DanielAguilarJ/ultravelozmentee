#!/usr/bin/env python3
"""
Construye fotolectura-v4.html = página real + dirección de arte nueva.

Por qué así y no al revés: la página real trae el SEO, el tracking, el booking,
el test de lectura y el contrato que verifican 14 ficheros de test. Portar todo
eso a un prototipo vacío significa reescribir 3 000 líneas de CSS y arriesgarse
a perder en silencio un bloque de JSON-LD o un `data-*` de medición. Partiendo
de la página real, la paridad es cero por construcción y lo único que hay que
demostrar es que el aspecto cambió.

Cada paso va con `assert`: si el marcado de origen cambia, esto falla en voz
alta en lugar de generar una página medio transformada.
"""
import re
import sys

ORIGEN = "fotolectura.html"
DESTINO = "fotolectura-v4.html"
CSS_EXTRA = "tools/fotolectura-arte.css"
JS_EXTRA = "tools/fotolectura-arte.js"
RESPALDO = "fotolectura.ANTES-DEL-REDISENO.html"


def paso(src, viejo, nuevo, n=1, etiqueta=""):
    hay = src.count(viejo)
    assert hay == n, "«%s»: se esperaban %d coincidencias, hay %d" % (etiqueta, n, hay)
    return src.replace(viejo, nuevo, n)


def main():
    src = open(ORIGEN, encoding="utf-8").read()

    # ── 1. Una sola paleta: el modo claro pasa a ser el único ──────────────
    src = paso(src, "<!DOCTYPE html>\n<html lang=\"es-MX\">", """<!DOCTYPE html>
<!-- `light-mode` va fija: esta página tiene una sola paleta, la clara. Se
     conserva el nombre de la clase porque de ella cuelgan los tokens y las
     reglas de contraste de la página y del navbar compartido. El selector de
     tema se ha retirado, y el módulo de tema de js/navbar.min.js sale solo al
     no encontrar el botón. -->
<html lang="es-MX" class="light-mode">""", etiqueta="html light-mode")

    src = paso(src, """    <!-- Theme: FOUC Prevention -->
    <script>
        (function() {
            var theme = localStorage.getItem('theme');
            if (theme === 'light' || (!theme && window.matchMedia('(prefers-color-scheme: light)').matches)) {
                document.documentElement.classList.add('light-mode');
            }
        })();
    </script>

""", "", etiqueta="script de arranque del tema")

    src = paso(src, """        <button class="nav-pill-theme" id="navThemeToggle" aria-label="Cambiar tema claro/oscuro" title="Cambiar tema">
            <span class="icon-moon">&#x1F319;</span>
            <span class="icon-sun">&#x2600;&#xFE0F;</span>
        </button>

""", "", etiqueta="boton selector de tema")

    # ── 2. Fuera de índice mientras conviva con la página original ─────────
    src = paso(src, '<meta name="viewport"',
               '''<!-- MIENTRAS ESTA PÁGINA CONVIVA CON /fotolectura: fuera del índice para no
         competir consigo misma. Al sustituir la original, borrar esta línea. -->
    <meta name="robots" content="noindex, nofollow">
    <meta name="viewport"''', etiqueta="meta robots")

    # ── 3. Tokens: una sola paleta, papel y tinta ─────────────────────────
    tokens_viejos = re.search(
        r"        /\* -+ Tokens -+ \*/\n        \.fx \{[\s\S]*?\n        \}\n\n        \.light-mode \.fx \{[\s\S]*?\n        \}\n",
        src)
    assert tokens_viejos, "no se localizo el bloque de tokens"
    src = src[:tokens_viejos.start()] + """        /* ---------- Tokens ----------
           Una sola paleta: papel y tinta. Antes había un juego oscuro aquí y un
           override claro en `.light-mode .fx`; se han fundido en este bloque
           para que exista una única fuente de verdad del color.

           Los nombres `--fx-amber*` se conservan porque de ellos cuelgan
           cientos de referencias en esta hoja; el VALOR ya no es ámbar sino la
           terracota de la nueva dirección de arte. */
        .fx {
            --fx-bg: #f5f1e8;              /* papel */
            --fx-bg-raised: #efe9dc;       /* papel cálido */
            --fx-bg-panel: #e6ded0;        /* arena clara */
            --fx-sand: #dccfbb;            /* arena */
            --fx-border: rgba(34, 32, 29, 0.14);
            --fx-border-strong: rgba(34, 32, 29, 0.30);
            --fx-text: #22201d;            /* tinta */
            --fx-text-soft: #55504a;
            --fx-text-faint: #837c72;
            --fx-amber: #c2542f;           /* acento: terracota */
            --fx-amber-soft: rgba(194, 84, 47, 0.13);
            --fx-amber-text: #a63f1e;
            --fx-green: #4e5a44;
            --fx-red: #b3432f;
            --fx-serif: 'Fraunces', 'Iowan Old Style', Georgia, serif;
            --fx-sans: 'Inter', -apple-system, sans-serif;
            --fx-max: 1180px;
            font-family: var(--fx-sans);
            color: var(--fx-text);
            background: var(--fx-bg);
            line-height: 1.62;
        }
""" + src[tokens_viejos.end():]

    # ── 4. Tipografía: el gesto que sostiene la dirección de arte ─────────
    src = paso(src, """        .fx h1, .fx h2, .fx h3 {
            font-family: var(--fx-serif);
            font-weight: 520;
            line-height: 1.12;
            letter-spacing: -0.01em;
            margin: 0;
            color: var(--fx-text);
        }""", """        /* Serif de peso normal, interlineado ~1 y tracking negativo: la
           presencia viene del ajuste, no del tamaño. */
        .fx h1, .fx h2, .fx h3 {
            font-family: var(--fx-serif);
            font-weight: 400;
            line-height: 0.99;
            letter-spacing: -0.03em;
            margin: 0;
            color: var(--fx-text);
            text-wrap: balance;
        }

        .fx h1 { line-height: 0.95; letter-spacing: -0.032em; }
        .fx h3 { line-height: 1.04; letter-spacing: -0.022em; }""",
               etiqueta="tipografia de titulares")

    src = paso(src, """        .fx .fx-eyebrow {
            font-family: var(--fx-sans);
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.14em;
            color: var(--fx-amber-text);
            margin-bottom: 18px;
            display: block;
        }""", """        .fx .fx-eyebrow {
            font-family: var(--fx-sans);
            font-size: 0.69rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            color: var(--fx-text-faint);
            margin-bottom: 20px;
            display: inline-flex;
            align-items: center;
            gap: 10px;
        }

        .fx .fx-eyebrow::before {
            content: "";
            width: 26px;
            height: 1px;
            background: var(--fx-amber);
            flex: none;
        }""", etiqueta="eyebrow")

    src = paso(src, """        .fx-wrap {
            max-width: var(--fx-max);
            margin: 0 auto;
            padding: 0 24px;
        }""", """        .fx-wrap {
            max-width: var(--fx-max);
            margin: 0 auto;
            padding: 0 clamp(20px, 5vw, 48px);
        }""", etiqueta="ancho de caja")

    # ── 5. Fraunces con rango de peso que incluya el 400 ──────────────────
    src = paso(src, "family=Fraunces:opsz,wght@9..144,420;9..144,520;9..144,620",
               "family=Fraunces:opsz,wght@9..144,400..620", etiqueta="peso de Fraunces")

    # ── 6. Capa de cierre con la dirección de arte ────────────────────────
    extra = open(CSS_EXTRA, encoding="utf-8").read()
    i = src.index("</style>")
    src = src[:i] + extra + "\n    " + src[i:]

    # ── 7. Marca-cinta ───────────────────────────────────────────────────
    src = paso(src, '<body class="fx-body">', '''<body class="fx-body">

    <!-- Marca-cinta: marcapáginas de tela anclado al borde. Interpretación
         propia del recurso de marca fija de la referencia. -->
    <a class="fx-ribbon" href="#oferta" aria-label="Ir a la información del programa">
        <svg viewBox="0 0 46 104" aria-hidden="true" focusable="false">
            <path d="M0 0h46v86L23 72 0 86Z" fill="#c2542f"></path>
            <path d="M0 0h46v10H0Z" fill="#a63f1e" opacity=".55"></path>
            <circle cx="23" cy="34" r="4.6" fill="#f5f1e8"></circle>
            <circle cx="23" cy="49" r="2.6" fill="#f5f1e8" opacity=".72"></circle>
            <circle cx="23" cy="59" r="1.5" fill="#f5f1e8" opacity=".45"></circle>
        </svg>
    </a>''', etiqueta="marca-cinta")

    # ── 8. Hero: la demo sale a su propio bloque y entra la pintura ───────
    m = re.search(r'(\s*)<div class="fx-demo"[\s\S]*?id="fxDemoNote">[\s\S]*?</p>\s*</div>', src)
    assert m, "no se localizo la demo de ritmos"
    demo = m.group(0).strip()
    src = src[:m.start()] + src[m.end():]

    src = paso(src, '''                <div class="fx-hero-grid">
                    <div>
''', '''                <div class="fx-hero-copy">
''', etiqueta="apertura de la rejilla del hero")

    # Al fundir la apertura de la rejilla y la de la columna de texto en un solo
    # div, sobra un cierre. Se retira el nivel que ya no existe.
    src = paso(src, '''                    </div>
                </div>
            </div>
        </header>''', '''                </div>
            </div>
        </header>''', etiqueta="cierre de la rejilla del hero")

    src = paso(src, '        <header class="fx-hero">\n', '''        <header class="fx-hero">
            <!-- Pintura tratada: la trama de puntos sale de la página que lee y
                 sube hacia su mirada. El libro queda intacto y legible: es la
                 referencia al curso. El vídeo sólo se carga cuando procede; si
                 no, esta imagen hace de póster. -->
            <div class="fx-hero-art" aria-hidden="true">
                <picture>
                    <source media="(max-width: 700px)"
                            srcset="images/fotolectura-arte-atencion-lectura-sm.webp">
                    <img src="images/fotolectura-arte-atencion-lectura.webp"
                         alt="" width="1600" height="1000" decoding="async" fetchpriority="high">
                </picture>
                <video class="fx-hero-video" data-hero-video muted loop playsinline
                       preload="none" tabindex="-1"
                       data-webm="images/fotolectura-hero-lectura.webm"
                       data-mp4="images/fotolectura-hero-lectura.mp4"></video>
            </div>
''', etiqueta="arte del hero")

    src = paso(src, '        </header>\n', '''        </header>

        <!-- La demostración de ritmos sale del hero para que la pintura respire
             y gana ancho. Conserva íntegros sus identificadores y clases, así
             que el guion que la controla sigue funcionando igual. -->
        <section class="fx-section fx-blk-warm" aria-label="Demostración de ritmos de lectura">
            <div class="fx-wrap">
                DEMO
            </div>
        </section>

        <canvas class="fx-dissolve" data-dissolve
                data-from="#efe9dc" data-to="#f5f1e8" aria-hidden="true"></canvas>
'''.replace("DEMO", demo), etiqueta="bloque de la demo")

    # ── 9. Secuencia fijada, antes de metodología ────────────────────────
    pin = '''        <canvas class="fx-dissolve" data-dissolve
                data-from="#f5f1e8" data-to="#efe9dc" aria-hidden="true"></canvas>

        <!-- Secuencia fijada: el recurso más fuerte de la referencia,
             reinterpretado. Un lienzo fijo donde la frase del centro se releva
             mientras entran teselas de pintura clásica. Cada tesela es una
             fijación de la mirada y en las ocho se ve un libro. -->
        <section class="fx-pin" aria-labelledby="fxPinTitle">
            <h2 id="fxPinTitle" class="fx-sr-only">Cómo se entrena la mirada</h2>
            <div class="fx-pin-track" data-pin>
                <div class="fx-pin-stage">
                    <div class="fx-pin-tiles" aria-hidden="true">
                        <div class="fx-pin-tile" style="--x:6%;  --y:12%; --w:15vw"><img src="images/fotolectura-tesela-corot.webp" alt="" loading="lazy" decoding="async"></div>
                        <div class="fx-pin-tile" style="--x:79%; --y:8%;  --w:12vw"><img src="images/fotolectura-tesela-rembrandt.webp" alt="" loading="lazy" decoding="async"></div>
                        <div class="fx-pin-tile" style="--x:22%; --y:64%; --w:10vw"><img src="images/fotolectura-tesela-renoir.webp" alt="" loading="lazy" decoding="async"></div>
                        <div class="fx-pin-tile" style="--x:66%; --y:58%; --w:17vw"><img src="images/fotolectura-tesela-fantin.webp" alt="" loading="lazy" decoding="async"></div>
                        <div class="fx-pin-tile" style="--x:2%;  --y:40%; --w:8vw"><img src="images/fotolectura-tesela-vangogh.webp" alt="" loading="lazy" decoding="async"></div>
                        <div class="fx-pin-tile" style="--x:87%; --y:36%; --w:9vw"><img src="images/fotolectura-tesela-fragonard.webp" alt="" loading="lazy" decoding="async"></div>
                        <div class="fx-pin-tile" style="--x:37%; --y:3%;  --w:11vw"><img src="images/fotolectura-tesela-chardin.webp" alt="" loading="lazy" decoding="async"></div>
                        <div class="fx-pin-tile" style="--x:52%; --y:76%; --w:8vw"><img src="images/fotolectura-tesela-peddler.webp" alt="" loading="lazy" decoding="async"></div>
                        <div class="fx-pin-tile" style="--x:11%; --y:84%; --w:13vw"><img src="images/fotolectura-tesela-rembrandt.webp" alt="" loading="lazy" decoding="async"></div>
                    </div>
                    <div class="fx-pin-center">
                        <p class="fx-pin-num" data-pin-num>01 — 05</p>
                        <div class="fx-pin-line" data-pin-lines>
                            <span>Tus ojos ya son bastante rápidos.</span>
                            <span>Lo que te frena es volver atrás.</span>
                            <span>Cada parada de la mirada cuesta unos 250 milisegundos.</span>
                            <span>Agrupar palabras multiplica lo que cabe en cada parada.</span>
                            <span>Ahí, y sólo ahí, empieza la fotolectura.</span>
                        </div>
                        <div class="fx-pin-bar" aria-hidden="true"><i></i></div>
                    </div>
                </div>
            </div>
        </section>

'''
    ancla = '<section class="fx-section fx-section-lab" id="metodologia">'
    assert src.count(ancla) == 1, "no se localizo la seccion de metodologia"
    src = src.replace(ancla, pin + ancla, 1)

    # ── 10. Motor de los efectos, dentro del script propio de la página ───
    # Se inserta antes de la biblioteca 3D: en ese punto ya están declarados
    # `$`, `$$` y `reduceMotion`, que es todo lo que necesita.
    js = open(JS_EXTRA, encoding="utf-8").read()
    ancla_js = "            /* ---------- Biblioteca 3D:"
    assert src.count(ancla_js) == 1, "no se localizo el inicio de la biblioteca 3D"
    src = src.replace(ancla_js, js + ancla_js, 1)

    open(DESTINO, "w", encoding="utf-8").write(src)
    print("  %s escrito: %d bytes" % (DESTINO, len(src)))

    if "--sustituir" in sys.argv:
        # Sustitución explícita: el contenido nuevo pasa a ser la página real y
        # el fichero de trabajo desaparece. Se hace copia de seguridad antes y
        # se retira el `noindex`, que sólo existía para no competir con la
        # original mientras convivían.
        import shutil
        shutil.copy2(ORIGEN, RESPALDO)
        final = src.replace('''<!-- MIENTRAS ESTA PÁGINA CONVIVA CON /fotolectura: fuera del índice para no
         competir consigo misma. Al sustituir la original, borrar esta línea. -->
    <meta name="robots" content="noindex, nofollow">
    ''', "")
        assert 'content="noindex, nofollow"' not in final, "quedo un noindex sin retirar"
        open(ORIGEN, "w", encoding="utf-8").write(final)
        import os
        os.remove(DESTINO)
        print("  SUSTITUIDO: %s es ahora la página, %s retirado" % (ORIGEN, DESTINO))
        print("  respaldo de la anterior en %s" % RESPALDO)
        print("  para deshacer:  cp %s %s" % (RESPALDO, ORIGEN))

    return 0


if __name__ == "__main__":
    sys.exit(main())
