#!/usr/bin/env python3
"""Hace visibles en /blog-index TODOS los posts que tienen contenido y HTML.

Problema que resuelve: los HTML existen y el sitemap los auto-descubre, pero
blog-index.html solo enlazaba una parte, así que el resto quedaba huérfano de
enlazado interno: alcanzable por URL directa, casi invisible para el rastreo.

Ocurrió dos veces por la misma causa (un plan editorial cableado en el
script):

  1.ª vez  los 11 posts de la serie original enlazados, los 60 del plan de 60
           invisibles.
  2.ª vez  los 60 + 11 enlazados, los 164 del plan de 500 invisibles.

Para que no haya una tercera, el script ya NO se ata a un plan: recorre
PLANS y publica toda entrada que cumpla las dos condiciones reales de estar
publicable —tener contenido en content/posts y su HTML renderizado en la
raíz—. Añadir un plan nuevo no exige tocar este archivo; basta sumarlo a
PLANS.

Se generan tarjetas ESTÁTICAS (no solo el JSON del API) porque así los
enlaces internos son rastreables y el listado funciona sin JS y en cualquier
host, no solo bajo Express.

Idempotente: reescribe el bloque entre los marcadores SEO:CARDS.
"""
from __future__ import annotations

import html as html_mod
import json
import re
from pathlib import Path

ROOT = Path(__file__).parents[2]
PLANS = (
    ROOT / "reports" / "seo" / "editorial-plan-60-posts.json",
    ROOT / "reports" / "seo" / "editorial-plan-500-posts.json",
    ROOT / "reports" / "seo" / "editorial-plan-national-international.json",
    ROOT / "reports" / "seo" / "editorial-plan-lectura-2026-09.json",
    ROOT / "reports" / "seo" / "editorial-plan-lectoescritura-2026-09.json",
    ROOT / "reports" / "seo" / "editorial-plan-lectoescritura-secundaria-2026-09.json",
    ROOT / "reports" / "seo" / "editorial-plan-mathekids-soroban-2026-09.json",
    ROOT / "reports" / "seo" / "editorial-plan-mathekids-matematicas-2026-09.json",
    ROOT / "reports" / "seo" / "editorial-plan-ciencia-astronomia-2026-09.json",
    ROOT / "reports" / "seo" / "editorial-plan-memoria-2026-09.json",
    ROOT / "reports" / "seo" / "editorial-plan-redaccion-ejecutiva-2026-09.json",
)
POSTS_DIR = ROOT / "content" / "posts"
INDEX = ROOT / "blog-index.html"
POSTS_JSON = ROOT / "data" / "posts.json"

START = "<!-- SEO:CARDS:START -->"
END = "<!-- SEO:CARDS:END -->"

FEED_ANCHOR = '<div class="ed-feed" data-editorial-feed data-view="grid">'

MESES = {
    1: "ene", 2: "feb", 3: "mar", 4: "abr", 5: "may", 6: "jun",
    7: "jul", 8: "ago", 9: "sep", 10: "oct", 11: "nov", 12: "dic",
}

# Cada clúster se publica bajo uno de los chips del filtro. Los cinco chips
# originales (infancia, liderazgo, seo, cerebro, educacion) no discriminaban
# con 235 posts: "educacion" se habría llevado más de la mitad. Se añaden dos
# chips (productividad, tecnologia) en blog-index.html con el mismo markup que
# los demás, y los clústeres restantes caen donde encajan de verdad:
# metodologías de estudio con Cerebro (donde ya viven fotolectura y memoria),
# habilidades blandas con Liderazgo, aprendizaje temprano con Infancia.
CLUSTER_TOPIC = {
    # plan de 60
    "universidad-dominical": "educacion",
    "fotolectura": "cerebro",
    "matematicas": "infancia",
    "robotica": "infancia",
    "admision": "educacion",
    "regularizacion": "educacion",
    "homeschool-lectoescritura": "infancia",
    "estudio-memoria": "cerebro",
    "ingles": "infancia",
    "finanzas-liderazgo-ia": "liderazgo",
    # plan de 500
    "metodologias-aprendizaje": "cerebro",
    "productividad-estudiantil": "productividad",
    "tecnologia-educativa": "tecnologia",
    "habilidades-blandas": "liderazgo",
    "aprendizaje-temprano": "infancia",
    "ciencia-ninos": "infancia",
    "desarrollo-profesional": "liderazgo",
    "crianza-educacion": "infancia",
    "neurociencia-aprendizaje": "cerebro",
    "bienestar-estudiantil": "productividad",
    "ciencia-y-futuro": "tecnologia",
    "educacion-financiera": "liderazgo",
}


def esc(t: str) -> str:
    return html_mod.escape(t, quote=True)


def fecha_corta(iso: str) -> str:
    y, m, d = (int(x) for x in iso.split("-"))
    return f"{d} {MESES[m]} {y}"


def word_count(post: dict) -> int:
    text = post["quick_answer"] + " " + " ".join(post["lead"])
    for s in post["sections"]:
        text += " " + s["heading"] + " " + " ".join(s.get("paragraphs", []))
        text += " " + " ".join(s.get("bullets", [])) + " " + " ".join(s.get("steps", []))
    for f in post["faq"]:
        text += " " + f["question"] + " " + f["answer"]
    return len(text.split())


def load_content() -> dict[int, dict]:
    out: dict[int, dict] = {}
    for f in sorted(POSTS_DIR.glob("batch-*.json")):
        for p in json.loads(f.read_text(encoding="utf-8")):
            out[p["id"]] = p
    return out


def render_card(meta: dict, post: dict) -> str:
    slug = meta["slug"]
    url = f"/blog-{slug}"
    topic = CLUSTER_TOPIC.get(meta["cluster"], "educacion")
    # Un solo tema por tarjeta: al añadir "educacion" como secundario a las 60,
    # ese chip devolvía 69 de 71 y dejaba de discriminar.
    topics = topic
    minutos = max(3, round(word_count(post) / 200))
    return f"""                    <article class="ed-card" data-slug="blog-{slug}" data-topic="{topics}">
                        <div class="ed-card-copy">
                            <div class="ed-card-meta"><span class="ed-card-category">{esc(meta['category'])}</span><time datetime="{meta['publication_date']}">{fecha_corta(meta['publication_date'])}</time><span class="ed-card-read-time">{minutos} min</span></div>
                            <h2><a href="{url}">{esc(meta['title'])}</a></h2>
                            <p>{esc(post['description'])}</p>
                        </div>
                        <a class="ed-card-media" href="{url}"><img src="{meta['image']}" alt="{esc(meta['title'])}" loading="lazy" width="190" height="125"></a>
                        <button data-bookmark aria-pressed="false" aria-label="Guardar artículo">♡</button>
                    </article>"""


def load_plan_entries() -> list[dict]:
    """Entradas publicables de todos los planes, sin duplicar y ordenadas.

    Publicable = tiene contenido en content/posts Y su HTML en la raíz. Un
    plan declara 500 posts mucho antes de que existan; sin este filtro el
    índice enlazaría a 404 y el script moriría con KeyError en el primero
    sin contenido.
    """
    content = load_content()
    entries: dict[int, dict] = {}
    for plan_path in PLANS:
        if not plan_path.exists():
            continue
        for meta in json.loads(plan_path.read_text(encoding="utf-8"))["posts"]:
            if meta["id"] in entries:
                continue
            if meta["id"] not in content:
                continue
            if not (ROOT / f"blog-{meta['slug']}.html").exists():
                continue
            entries[meta["id"]] = meta
    # Más reciente primero: es un feed de blog, no un catálogo por id.
    return sorted(
        entries.values(),
        key=lambda m: (m["publication_date"], m["id"]),
        reverse=True,
    )


def main() -> None:
    content = load_content()
    plan = load_plan_entries()

    cards = "\n".join(render_card(m, content[m["id"]]) for m in plan)
    block = f"{START}\n{cards}\n                    {END}"

    raw = INDEX.read_text(encoding="utf-8")
    if START in raw and END in raw:
        pre, rest = raw.split(START, 1)
        _, post_ = rest.split(END, 1)
        raw = pre + block + post_
    else:
        if FEED_ANCHOR not in raw:
            raise SystemExit("No se encontró el contenedor .ed-feed en blog-index.html")
        raw = raw.replace(FEED_ANCHOR, FEED_ANCHOR + "\n                    " + block, 1)

    # El hero traía "11 artículos publicados" hardcodeado, que quedó obsoleto
    # al añadir los 60. Se recalcula sobre las tarjetas reales del feed para
    # que no vuelva a desincronizarse.
    total = raw.count('<article class="ed-card"')
    raw = re.sub(
        r"<li>\d+\s+artículos publicados</li>",
        f"<li>{total} artículos publicados</li>",
        raw,
        count=1,
    )

    def write_text_if_changed(path: Path, text: str) -> None:
        if path.exists() and path.read_text(encoding="utf-8") == text:
            return
        path.write_text(text, encoding="utf-8")

    write_text_if_changed(INDEX, raw)

    # data/posts.json alimenta GET /api/posts. El cargador dinámico deduplica
    # por slug, así que no duplica las tarjetas estáticas que acabamos de
    # inyectar; queda como fuente para el API y para clientes futuros.
    posts = []
    for m in plan:
        p = content[m["id"]]
        posts.append({
            "title": m["title"],
            "slug": m["slug"],
            "filename": m["filename"],
            "category": m["category"],
            "excerpt": p["description"],
            "date": fecha_corta(m["publication_date"]),
            "readTime": f"{max(3, round(word_count(p) / 200))} min de lectura",
            "author": "Equipo Editorial WorldBrain",
            "createdAt": m["publication_date"] + "T00:00:00.000Z",
        })
    POSTS_JSON.parent.mkdir(parents=True, exist_ok=True)
    posts_json = json.dumps(posts, ensure_ascii=False, indent=2) + "\n"
    write_text_if_changed(POSTS_JSON, posts_json)

    print(f"blog-index.html: {len(plan)} tarjetas inyectadas")
    print(f"data/posts.json: {len(posts)} posts")


if __name__ == "__main__":
    main()
