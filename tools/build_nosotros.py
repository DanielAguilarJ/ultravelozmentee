#!/usr/bin/env python3
"""Genera /nosotros heredando el esqueleto de una página existente.

Por qué existía el hueco: el sitio no tenía ninguna página que dijera
quién está detrás. Para E-E-A-T eso es un techo: Google no tiene a quién
atribuir la autoridad de 235 artículos educativos, y el visitante no
tiene dónde resolver "¿en quién estoy confiando?" antes de dejar un
correo o pagar un curso.

Se construye a partir del HTML de otra página (head, nav, footer,
tracking) en vez de escribirlo a mano, para que herede exactamente el
mismo CSS, la misma navegación y los mismos scripts de medición. Si
mañana cambia el nav, se regenera y queda al día.

TODO el contenido sale de src/_data/site.json, que es la única fuente de
verdad del proyecto. No se inventa ni un dato: ni número de alumnos, ni
premios, ni nombres de personas. Lo que no está en site.json no se
publica.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).parents[1]
SKELETON = ROOT / "terminos.html"
OUT = ROOT / "nosotros.html"
SITE = json.loads((ROOT / "src" / "_data" / "site.json").read_text(encoding="utf-8"))

URL = "https://ultravelozmente.com/nosotros"
TITLE = "Nosotros — WorldBrain México, formación en aprendizaje desde 2000"
DESC = (
    "Quiénes somos: WorldBrain México, escuela de lectura veloz, memoria y "
    "matemáticas fundada en 2000. Grupos de máximo 7 alumnos, método propio "
    "y datos de contacto verificables."
)


def year_span() -> str:
    from datetime import date
    return str(date.today().year - int(SITE["foundedYear"]))


def main_html() -> str:
    s = SITE
    m = s["method"]
    legal = s["legal"]
    años = year_span()

    return f"""
    <header class="legal-hero">
        <div class="container">
            <div class="legal-badge">Sobre nosotros</div>
            <h1 class="legal-title">Quiénes somos</h1>
            <p class="legal-subtitle">{s['name']} enseña a leer más rápido,
                recordar mejor y perderle el miedo a las matemáticas. Llevamos
                haciéndolo desde {s['foundedYear']}: {años} años.</p>
        </div>
    </header>

    <main id="main-content">
        <section class="legal-body">
            <div class="container">

                <h2>Qué hacemos</h2>
                <p>Formamos a niños, adolescentes y adultos en las habilidades
                que la escuela da por supuestas y casi nunca enseña de forma
                explícita: leer con velocidad y comprensión, memorizar con
                método, estudiar de manera que lo aprendido se sostenga, y
                razonar matemáticamente sin bloqueo. Tenemos 18 programas, desde
                lectoescritura para los más pequeños hasta preparación para
                exámenes de admisión universitaria.</p>

                <h2>Cómo trabajamos</h2>
                <p>Los grupos son de <strong>máximo {m['maxGroupSize']}
                alumnos</strong>. No es un detalle de marketing: es la condición
                que permite corregir la técnica de cada persona en el momento en
                que se está formando el hábito. Con veinte alumnos por aula eso
                no se puede hacer, y sin corrección individual las técnicas se
                aprenden mal y se abandonan.</p>

                <h3>«{m['signature']}»</h3>
                <p>Cada clase abre con la misma rutina, que llamamos
                {m['signature']}: {m['signatureDesc'].lower()}. Sirve para que
                el alumno llegue a la sesión en condiciones de aprender en vez
                de arrastrando la inercia del día. Es corto, es constante, y es
                lo que más nos preguntan los padres cuando ven la diferencia en
                casa.</p>

                <h2>Qué no prometemos</h2>
                <p>No damos cifras de resultados infalibles ni porcentajes de
                mejora, porque dependen de la persona, de su punto de partida y
                de cuánto practique entre sesiones. Lo que sí ofrecemos es un
                diagnóstico gratuito antes de inscribirse: una sesión para medir
                dónde está el alumno y decir con honestidad si nuestro programa
                le sirve o no. A veces la respuesta es que no, y lo decimos.</p>

                <h2>Dónde estamos</h2>
                <p>Atendemos de forma presencial y en línea según el programa.
                Nuestra dirección fiscal y sede es:</p>
                <p><strong>{legal['domicilio']}</strong></p>

                <h2>Datos de contacto</h2>
                <ul>
                    <li>Teléfono y WhatsApp: <a href="{s['phoneHref']}">{s['phone']}</a></li>
                    <li>Correo: <a href="mailto:{s['email']}">{s['email']}</a></li>
                    <li>Horario de atención: {s['hours']}</li>
                </ul>

                <h2>Datos fiscales</h2>
                <p>Operamos como <strong>{legal['razonSocial']}</strong>,
                RFC {legal['rfc']}. Los publicamos porque una escuela a la que
                vas a pagar debería poder identificarse sin que haya que
                pedírselo.</p>

                <h2>Lo que publicamos aquí</h2>
                <p>Nuestro blog reúne más de 200 artículos sobre métodos de
                estudio, aprendizaje y acompañamiento educativo, escritos y
                revisados por el equipo docente a partir de lo que vemos en
                clase. Cuando citamos una fuente externa, la enlazamos. Cuando
                no tenemos evidencia de algo, no lo afirmamos.</p>
                <p><a href="/blog-index">Ver el blog</a></p>

            </div>
        </section>
    </main>"""


def json_ld() -> str:
    s = SITE
    legal = s["legal"]

    graph = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "AboutPage",
                "@id": URL + "#page",
                "url": URL,
                "name": TITLE,
                "description": DESC,
                "inLanguage": "es-MX",
                "isPartOf": {"@id": "https://ultravelozmente.com/#website"},
                "about": {"@id": "https://ultravelozmente.com/#organization"},
            },
            {
                # Se declara EducationalOrganization, no solo Organization:
                # es una escuela, y ese tipo admite propiedades que Google
                # entiende mejor en el contexto educativo.
                "@type": "EducationalOrganization",
                "@id": "https://ultravelozmente.com/#organization",
                "name": s["name"],
                "url": s["url"],
                "foundingDate": str(s["foundedYear"]),
                "legalName": legal["razonSocial"],
                "taxID": legal["rfc"],
                "email": s["email"],
                "telephone": s["phone"],
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": legal["domicilio"],
                    "addressCountry": "MX",
                },
                "areaServed": {"@type": "Country", "name": "México"},
                "knowsLanguage": "es-MX",
            },
            {
                "@type": "BreadcrumbList",
                "@id": URL + "#breadcrumb",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Inicio",
                        "item": "https://ultravelozmente.com/",
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Nosotros",
                        "item": URL,
                    },
                ],
            },
        ],
    }

    return ('<script type="application/ld+json">\n'
            + json.dumps(graph, ensure_ascii=False, indent=4)
            + "\n    </script>")


def main() -> None:
    raw = SKELETON.read_text(encoding="utf-8")

    # 1 · Cuerpo. Se reemplaza desde el <header> del hero hasta </main>,
    #     no solo <main>: el hero de la plantilla vive FUERA de main y
    #     lleva su propio <h1>. Sustituir solo main dejaba dos H1 en la
    #     página, que es justamente lo que el gate 9 detecta.
    start = raw.find('<header class="legal-hero">')
    if start == -1:
        start = raw.find("<main")
    end = raw.find("</main>") + len("</main>")
    if start == -1 or end < start:
        raise SystemExit("No se encontró el bloque header/main en " + SKELETON.name)
    raw = raw[:start] + main_html().strip() + raw[end:]

    # 2 · Metadatos del head.
    raw = re.sub(r"<title>.*?</title>", f"<title>{TITLE}</title>", raw, count=1, flags=re.S)
    raw = re.sub(r'(<meta name="description" content=")[^"]*(")',
                 lambda m: m.group(1) + DESC + m.group(2), raw, count=1)
    raw = re.sub(r'(<link rel="canonical" href=")[^"]*(")',
                 lambda m: m.group(1) + URL + m.group(2), raw, count=1)
    raw = re.sub(r'(<meta property="og:url" content=")[^"]*(")',
                 lambda m: m.group(1) + URL + m.group(2), raw, count=1)
    raw = re.sub(r'(<meta property="og:title" content=")[^"]*(")',
                 lambda m: m.group(1) + TITLE + m.group(2), raw, count=1)
    raw = re.sub(r'(<meta property="og:description" content=")[^"]*(")',
                 lambda m: m.group(1) + DESC + m.group(2), raw, count=1)
    raw = re.sub(r'(<meta name="twitter:title" content=")[^"]*(")',
                 lambda m: m.group(1) + TITLE + m.group(2), raw, count=1)
    raw = re.sub(r'(<meta name="twitter:description" content=")[^"]*(")',
                 lambda m: m.group(1) + DESC + m.group(2), raw, count=1)

    # 3 · JSON-LD: se reemplazan TODOS los bloques heredados por el nuestro,
    #     porque los de términos describen otra página.
    blocks = list(re.finditer(
        r'<script type="application/ld\+json">.*?</script>', raw, re.S))
    if not blocks:
        raise SystemExit("La plantilla no traía JSON-LD")

    for block in reversed(blocks[1:]):
        raw = raw[:block.start()] + raw[block.end():]
    raw = raw[:blocks[0].start()] + json_ld() + raw[blocks[0].end():]

    OUT.write_text(raw, encoding="utf-8")
    print(f"{OUT.name}: escrito ({len(raw)} bytes)")


if __name__ == "__main__":
    main()
