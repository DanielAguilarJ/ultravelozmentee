#!/usr/bin/env python3
"""Inyecta el formulario de captura de correo en los artículos del blog.

── Qué cambió y por qué ─────────────────────────────────────────────
La primera versión ofrecía UN SOLO documento —la guía de técnicas de
estudio— en los 269 artículos, sin importar el tema. Un artículo sobre
robótica pedía el correo a cambio de una guía de técnicas de estudio: el
lector no recibía lo que el contexto le prometía, y la descarga dejaba de
tener relación con el curso al que el propio artículo remite.

Ahora cada artículo ofrece un documento relacionado con SU cluster, definido en
tools/lead_magnets/catalog.json. El CTA del documento apunta al curso declarado
por ese lead magnet. En cada lote auditado, las diferencias frente al CTA
principal del artículo deben registrarse en cross_sell_exceptions después de
revisar el PDF. Ese registro no presupone un inventario retroactivo ni
una coherencia comercial universal.

── Cómo sabe a qué cluster pertenece un artículo ────────────────────
Por el slug, cruzado con todos los planes editoriales declarados. Los
artículos de la serie original que no están en ningún plan usan un mapa
explícito por palabra clave del slug; lo que no se pueda resolver
conserva el documento por omisión, que es el de técnicas de estudio
(aplicable a cualquier tema de estudio) en vez de quedarse sin nada.

Idempotente: reescribe lo que haya entre los marcadores SEO:MAGNET.
Ejecutarlo dos veces no duplica nada.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parents[1]
CATALOG = ROOT / "tools" / "lead_magnets" / "catalog.json"
PLANS = (
    ROOT / "reports" / "seo" / "editorial-plan-60-posts.json",
    ROOT / "reports" / "seo" / "editorial-plan-500-posts.json",
    ROOT / "reports" / "seo" / "editorial-plan-national-international.json",
)

START = "<!-- SEO:MAGNET:START -->"
END = "<!-- SEO:MAGNET:END -->"

SCRIPT_TAG = '<script src="js/lead-capture.js?v=20260814" defer></script>'
ANCHOR = "</article>"

DEFAULT_MAGNET = "guia-tecnicas-de-estudio"

# Artículos de la serie original (no están en ningún plan editorial).
# El orden importa: se toma la primera coincidencia.
SLUG_HINTS = (
    ("primer-lenguaje-programacion-ninos", "guia-robotica-educativa-en-casa"),
    ("comprension-lectora-primaria-por-grados", "guia-lectoescritura-en-casa"),
    ("robotica", "guia-robotica-educativa-en-casa"),
    ("arduino", "guia-robotica-educativa-en-casa"),
    ("scratch", "guia-robotica-educativa-en-casa"),
    ("microbit", "guia-robotica-educativa-en-casa"),
    ("astronomia", "guia-robotica-educativa-en-casa"),
    ("lectoescritura", "guia-lectoescritura-en-casa"),
    ("homeschool", "guia-lectoescritura-en-casa"),
    ("educacion-alternativa", "guia-lectoescritura-en-casa"),
    ("dislexia", "guia-lectoescritura-en-casa"),
    ("habito-lector", "guia-lectoescritura-en-casa"),
    ("comprension-lectora", "guia-tecnicas-de-estudio"),
    ("fotolectura", "guia-tecnicas-de-estudio"),
    ("memoria", "guia-tecnicas-de-estudio"),
    ("mapas-mentales", "guia-tecnicas-de-estudio"),
    ("recuerdo-activo", "guia-tecnicas-de-estudio"),
    ("regularizacion", "guia-plan-de-estudio-sin-atrasos"),
    ("rezago", "guia-plan-de-estudio-sin-atrasos"),
    ("admision", "guia-plan-de-estudio-sin-atrasos"),
    ("examen", "guia-plan-de-estudio-sin-atrasos"),
    ("concentracion", "guia-plan-de-estudio-sin-atrasos"),
    ("ansiedad", "guia-plan-de-estudio-sin-atrasos"),
    ("estudiar-y-trabajar", "guia-plan-de-estudio-sin-atrasos"),
    ("universidad", "guia-plan-de-estudio-sin-atrasos"),
    ("dominical", "guia-plan-de-estudio-sin-atrasos"),
    ("lideres", "guia-comunicacion-y-liderazgo-adolescentes"),
    ("liderazgo", "guia-comunicacion-y-liderazgo-adolescentes"),
    ("finanzas", "guia-escritura-profesional"),
    ("presupuesto", "guia-escritura-profesional"),
    ("contenido-organico", "guia-escritura-profesional"),
    ("ingles", "guia-estimulacion-temprana"),
    ("fastkids", "guia-estimulacion-temprana"),
    ("matematicas", "guia-estimulacion-temprana"),
    ("multiplicar", "guia-estimulacion-temprana"),
    ("abaco", "guia-estimulacion-temprana"),
    ("soroban", "guia-estimulacion-temprana"),
    ("mathekids", "guia-estimulacion-temprana"),
    ("aprendizaje-temprano", "guia-estimulacion-temprana"),
    ("curso-verano", "guia-plan-de-estudio-sin-atrasos"),
)


def load_catalog() -> tuple[dict, dict]:
    """Devuelve (magnets, cluster→slug)."""
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    magnets = data["magnets"]

    by_cluster: dict[str, str] = {}
    for slug, meta in magnets.items():
        for cluster in meta.get("clusters", []):
            if cluster in by_cluster:
                sys.exit(
                    f"El cluster '{cluster}' está asignado a dos documentos: "
                    f"{by_cluster[cluster]} y {slug}. Cada cluster debe tener uno."
                )
            by_cluster[cluster] = slug

    if DEFAULT_MAGNET not in magnets:
        sys.exit(f"El documento por omisión '{DEFAULT_MAGNET}' no está en el catálogo.")

    return magnets, by_cluster


def load_slug_clusters() -> dict[str, str]:
    """slug del artículo → cluster, combinando ambos planes editoriales."""
    out: dict[str, str] = {}
    for plan_path in PLANS:
        if not plan_path.exists():
            continue
        for post in json.loads(plan_path.read_text(encoding="utf-8"))["posts"]:
            slug = post.get("slug")
            cluster = post.get("cluster")
            if slug and cluster:
                out[slug] = cluster
    return out


def pick_magnet(page_slug: str, slug_clusters: dict, by_cluster: dict) -> str:
    """Elige el documento para un artículo. Nunca devuelve vacío."""
    cluster = slug_clusters.get(page_slug)
    if cluster and cluster in by_cluster:
        return by_cluster[cluster]

    for needle, magnet in SLUG_HINTS:
        if needle in page_slug:
            return magnet

    return DEFAULT_MAGNET


def block(magnet_slug: str, meta: dict) -> str:
    """El formulario.

    La descarga se entrega EN EL ACTO, no "te lo enviamos por correo": el
    sitio no tiene envío garantizado configurado, y prometer un correo que
    quizá no llega es la clase de afirmación sin respaldo que el resto del
    proyecto evita. El aviso de privacidad es explícito, que además es lo
    que exige la LFPDPPP cuando se recaban datos personales.
    """
    download = f"/descargas/{magnet_slug}.pdf"
    return f"""{START}
                <section class="ed-magnet" aria-labelledby="magnet-title">
                    <p class="ed-magnet-kicker">Descarga gratuita</p>
                    <h2 id="magnet-title">{meta['title']}</h2>
                    <p>{meta['teaser']}</p>
                    <form data-lead-magnet
                          data-resource="{magnet_slug}"
                          data-download="{download}"
                          data-course="{meta['course_name']}"
                          novalidate>
                        <div class="ed-magnet-row" data-lm-fields>
                            <label for="magnet-email">Tu correo electrónico</label>
                            <input type="email" id="magnet-email" name="email"
                                   autocomplete="email" inputmode="email"
                                   placeholder="tucorreo@ejemplo.com"
                                   required data-lm-email>
                            <button type="submit" data-lm-submit>{meta['button']}</button>
                        </div>
                        <p class="ed-magnet-status" role="status" aria-live="polite"
                           data-lm-status></p>
                        <div class="ed-magnet-done" hidden data-lm-done>
                            <a href="{download}" download>Descargar el PDF</a>
                        </div>
                        <p class="ed-magnet-note">Te lo damos al instante en esta
                        misma página. Usamos tu correo para enviarte material
                        educativo; puedes pedir que lo borremos cuando quieras.</p>
                    </form>
                </section>
                {END}"""


def inject(path: Path, magnet_slug: str, meta: dict) -> str:
    raw = path.read_text(encoding="utf-8")
    original = raw

    new_block = block(magnet_slug, meta)

    if START in raw and END in raw:
        pre, rest = raw.split(START, 1)
        _, post = rest.split(END, 1)
        raw = pre + new_block + post
    else:
        idx = raw.find(ANCHOR)
        if idx == -1:
            return "sin-ancla"
        raw = raw[:idx] + new_block + "\n                " + raw[idx:]

    # El script se añade una sola vez, al final del body.
    if "lead-capture.js" not in raw:
        if "</body>" not in raw:
            return "sin-body"
        raw = raw.replace("</body>", "    " + SCRIPT_TAG + "\n</body>", 1)
    else:
        raw = re.sub(
            r'<script src="js/lead-capture\.js\?v=\d+" defer></script>',
            SCRIPT_TAG,
            raw,
        )

    if raw == original:
        return "sin-cambios"

    path.write_text(raw, encoding="utf-8")
    return "ok"


def main() -> None:
    magnets, by_cluster = load_catalog()
    slug_clusters = load_slug_clusters()

    targets = sorted(
        p for p in ROOT.glob("blog-*.html") if p.name != "blog-index.html"
    )
    if not targets:
        sys.exit("No se encontró ningún blog-*.html en " + str(ROOT))

    # Un documento del catálogo sin PDF generado rompería la descarga.
    missing_pdf = [
        slug for slug in magnets
        if not (ROOT / "descargas" / f"{slug}.pdf").exists()
    ]
    if missing_pdf:
        sys.exit(
            "Falta el PDF de: " + ", ".join(sorted(missing_pdf)) +
            "\nGenera los documentos antes de inyectar:\n"
            "  node tools/lead_magnets/build_pdfs.js"
        )

    counts: dict[str, int] = {}
    per_magnet: dict[str, int] = {}
    problems: list[str] = []

    for path in targets:
        page_slug = path.stem[len("blog-"):]
        magnet_slug = pick_magnet(page_slug, slug_clusters, by_cluster)
        outcome = inject(path, magnet_slug, magnets[magnet_slug])

        counts[outcome] = counts.get(outcome, 0) + 1
        if outcome in ("ok", "sin-cambios"):
            per_magnet[magnet_slug] = per_magnet.get(magnet_slug, 0) + 1
        else:
            problems.append(f"{path.name}: {outcome}")

    for key in sorted(counts):
        print(f"{key}: {counts[key]}")

    print("\nReparto por documento:")
    for slug in sorted(per_magnet, key=lambda s: -per_magnet[s]):
        print(f"  {per_magnet[slug]:>4}  {slug}")

    if problems:
        print("\nRevisar:")
        for item in problems[:20]:
            print("  -", item)
        sys.exit(1)


if __name__ == "__main__":
    main()
