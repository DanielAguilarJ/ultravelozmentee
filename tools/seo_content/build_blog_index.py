#!/usr/bin/env python3
"""Hace visibles los 60 posts en /blog-index.

Problema que resuelve: los 60 HTML existen y el sitemap los auto-descubre,
pero blog-index.html solo enlazaba los 11 posts de la serie anterior y
data/posts.json estaba vacío ([]), así que el cargador dinámico de
js/blog-editorial.js abortaba y los 60 quedaban huérfanos: alcanzables por
URL directa, invisibles desde la navegación.

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
PLAN = ROOT / "reports" / "seo" / "editorial-plan-60-posts.json"
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

# Los chips existentes del índice son: infancia, liderazgo, seo, cerebro,
# educacion. Se mapean los 10 clústeres a esos temas en vez de añadir chips
# nuevos, para no alterar el diseño del filtro.
CLUSTER_TOPIC = {
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


def main() -> None:
    plan = json.loads(PLAN.read_text(encoding="utf-8"))["posts"]
    content = load_content()

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

    INDEX.write_text(raw, encoding="utf-8")

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
    POSTS_JSON.write_text(json.dumps(posts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"blog-index.html: {len(plan)} tarjetas inyectadas")
    print(f"data/posts.json: {len(posts)} posts")


if __name__ == "__main__":
    main()
