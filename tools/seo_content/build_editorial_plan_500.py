#!/usr/bin/env python3
"""Genera reports/seo/editorial-plan-500-posts.json (IDs 61-560, 50 por
cluster) a partir de los 10 clusters definidos en
reports/seo/research-500-posts-2026-08-10.md. Mismo esquema que
editorial-plan-60-posts.json. No genera contenido ni HTML: solo el plan."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).parents[2]
OUT = ROOT / "reports" / "seo" / "editorial-plan-500-posts.json"

CLUSTERS = [
    {
        "cluster": "metodologias-aprendizaje", "category": "Metodologías de Aprendizaje",
        "icon": "fa-brain", "image": "images/metodo-aprendizaje-acelerado-practica-constante-worldbrain.webp",
        "courses": [("Fotolectura", "/fotolectura"), ("Memoria Prodigiosa", "/memoria-prodigiosa")],
    },
    {
        "cluster": "productividad-estudiantil", "category": "Productividad Estudiantil",
        "icon": "fa-list-check", "image": "images/metodo-aprendizaje-acelerado-practica-constante-worldbrain.webp",
        "courses": [("Regularización Express", "/regularizacion-express"), ("Admisión Universitaria", "/admision-universitaria")],
    },
    {
        "cluster": "tecnologia-educativa", "category": "Tecnología Educativa",
        "icon": "fa-laptop-code", "image": "images/integracion-hemisferios-cerebrales-aprendizaje-worldbrain.webp",
        "courses": [("Robotics Code", "/robotics"), ("MatheKids", "/mathekids")],
    },
    {
        "cluster": "habilidades-blandas", "category": "Habilidades Blandas",
        "icon": "fa-comments", "image": "images/neurocomunicacion-curso-hablar-en-publico-liderazgo.webp",
        "courses": [("Neurocomunicación", "/neurocomunicacion"), ("Grandes Líderes", "/grandes-lideres")],
    },
    {
        "cluster": "desarrollo-profesional", "category": "Desarrollo Profesional",
        "icon": "fa-briefcase", "image": "images/redaccion-ejecutiva-curso-escritura-profesional.webp",
        "courses": [("Redacción Ejecutiva", "/redaccion-ejecutiva"), ("ALFA-CASH", "/alfa-cash")],
    },
    {
        "cluster": "crianza-educacion", "category": "Crianza y Educación",
        "icon": "fa-people-roof", "image": "images/homeschool-educacion-en-casa-certificada-sep.webp",
        "courses": [("Homeschool", "/homeschool"), ("Lectoescritura", "/lectoescritura")],
    },
    {
        "cluster": "neurociencia-aprendizaje", "category": "Neurociencia del Aprendizaje",
        "icon": "fa-atom", "image": "images/integracion-hemisferios-cerebrales-aprendizaje-worldbrain.webp",
        "courses": [("Memoria Prodigiosa", "/memoria-prodigiosa"), ("Fotolectura", "/fotolectura")],
    },
    {
        "cluster": "bienestar-estudiantil", "category": "Bienestar Estudiantil",
        "icon": "fa-heart-pulse", "image": "images/aromaterapia-para-estudiar-concentracion-worldbrain.webp",
        "courses": [("Admisión Universitaria", "/admision-universitaria"), ("Regularización Express", "/regularizacion-express")],
    },
    {
        "cluster": "aprendizaje-temprano", "category": "Aprendizaje Temprano",
        "icon": "fa-child", "image": "images/ludoterapia-infantil-juego-aprendizaje-worldbrain.webp",
        "courses": [("FastKids", "/fastkids"), ("MatheKids", "/mathekids")],
    },
    {
        "cluster": "ciencia-y-futuro", "category": "Ciencia y Futuro",
        "icon": "fa-meteor", "image": "images/ciencia-astronomia-curso-ninos-telescopio.webp",
        "courses": [("Ciencia y Astronomía", "/ciencia-astronomia"), ("Robotics Code", "/robotics")],
    },
]

# 50 ángulos por cluster: variaciones de intención/formato que evitan que el
# título y la keyword se repitan dentro del mismo cluster. Estage 2 (piloto)
# reemplaza estos placeholders por títulos y keywords reales investigados;
# aquí solo se fija el ESQUEMA y la asignación balanceada de curso/imagen.
ANGLE_TEMPLATES = [
    "que-es", "guia-completa", "para-principiantes", "errores-comunes", "paso-a-paso",
    "vs-metodo-tradicional", "beneficios-reales", "como-empezar", "casos-practicos", "mitos-y-verdades",
    "para-padres", "para-estudiantes", "edad-recomendada", "en-casa", "en-la-escuela",
    "herramientas-utiles", "senales-de-alerta", "rutina-semanal", "checklist", "preguntas-frecuentes",
    "comparativa", "ejemplos-reales", "plan-de-30-dias", "por-que-importa", "como-medir-resultados",
    "para-adolescentes", "para-ninos-pequenos", "recursos-gratuitos", "errores-de-los-padres", "como-elegir",
    "ventajas-y-desventajas", "guia-rapida", "en-mexico-2026", "segun-la-ciencia", "aplicacion-practica",
    "para-el-aula", "para-el-hogar", "nivel-basico", "nivel-avanzado", "que-dice-la-evidencia",
    "como-mantener-la-motivacion", "senales-de-progreso", "plan-de-emergencia", "estrategias-efectivas", "que-evitar",
    "como-lograrlo-sin-estres", "recomendaciones-de-expertos", "que-esperar-el-primer-mes", "guia-para-principiantes-2026", "resumen-practico",
]

assert len(ANGLE_TEMPLATES) == 50


def main() -> None:
    posts = []
    post_id = 61
    for cluster in CLUSTERS:
        for i, angle in enumerate(ANGLE_TEMPLATES):
            course_name, course_url = cluster["courses"][i % len(cluster["courses"])]
            slug = f"{cluster['cluster']}-{angle}"
            posts.append({
                "id": post_id,
                "slug": slug,
                "filename": f"blog-{slug}.html",
                "title": None,  # se completa en Stage 2 con el título real investigado
                "primary_keyword": None,
                "cluster": cluster["cluster"],
                "category": cluster["category"],
                "intent": "informacional",
                "angle": angle,
                "course_name": course_name,
                "course_url": course_url,
                "image": cluster["image"],
                "icon": cluster["icon"],
                "evidence": "Cluster general 2026 (research-500-posts-2026-08-10.md); pendiente de verificación de keyword real en Stage 2",
                "publication_date": None,  # se asigna en Stage 3 al momento de publicar cada lote
                "status": "draft-slug",
            })
            post_id += 1

    out = {
        "meta": {
            "site": "https://ultravelozmente.com",
            "geo": "MX",
            "source": "research-500-posts-2026-08-10.md",
            "post_count": len(posts),
            "note": "Esqueleto de slugs/clusters. title/primary_keyword/publication_date se completan por lote en Stage 2-3, no aquí.",
        },
        "posts": posts,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Escrito {OUT} con {len(posts)} posts (IDs {posts[0]['id']}-{posts[-1]['id']}).")

    # Verificación: sin slugs duplicados, sin colisión con los 71 existentes.
    slugs = [p["slug"] for p in posts]
    assert len(slugs) == len(set(slugs)), "slugs duplicados dentro del plan de 500"
    existing = json.loads((ROOT / "reports" / "seo" / "editorial-plan-60-posts.json").read_text())
    existing_slugs = {p["slug"] for p in existing["posts"]}
    collision = existing_slugs & set(slugs)
    assert not collision, f"colisión de slugs con el plan de 60: {collision}"
    print("Verificado: 0 slugs duplicados, 0 colisiones con el plan de 60 posts.")


if __name__ == "__main__":
    main()
