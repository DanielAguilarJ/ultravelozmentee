import glob
import re
import json
import os
import requests

SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "")
domain = "ultravelozmente.com"
workspace_dir = os.path.dirname(os.path.abspath(__file__))

html_files = sorted(glob.glob(os.path.join(workspace_dir, "*.html")))

pages_meta = []

for fpath in html_files:
    fname = os.path.basename(fpath)
    if fname == "googleb3cccf1efd67c490.html":
        continue
    
    with open(fpath, "r", encoding="utf-8", errors="ignore") as fp:
        content = fp.read()
        
    t_match = re.search(r"<title>(.*?)</title>", content, re.IGNORECASE | re.DOTALL)
    title = t_match.group(1).strip() if t_match else ""

    d_match = re.search(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', content, re.IGNORECASE | re.DOTALL)
    if not d_match:
        d_match = re.search(r'<meta\s+content=["\'](.*?)["\']\s+name=["\']description["\']', content, re.IGNORECASE | re.DOTALL)
    desc = d_match.group(1).strip() if d_match else ""

    h1s = re.findall(r"<h1[^>]*>(.*?)</h1>", content, re.IGNORECASE | re.DOTALL)
    h1_clean = [re.sub(r"<[^>]+>", "", h1).strip() for h1 in h1s]

    h2s = re.findall(r"<h2[^>]*>(.*?)</h2>", content, re.IGNORECASE | re.DOTALL)
    h2_clean = [re.sub(r"<[^>]+>", "", h2).strip() for h2 in h2s]

    clean_title = re.sub(r"\|.*$", "", title).strip()
    clean_title = re.sub(r"-.*$", "", clean_title).strip()

    pages_meta.append({
        "file": fname,
        "title": title,
        "clean_title": clean_title,
        "meta_desc": desc,
        "h1": h1_clean[0] if h1_clean else "",
        "h2s": h2_clean[:3]
    })

print(f"Total páginas extraídas para auditoría de keywords con SerpApi: {len(pages_meta)}\n")

keyword_map = {
    "index.html": ["fotolectura y lectura veloz mexico", "worldbrain lectura veloz"],
    "fotolectura.html": ["curso de fotolectura mexico", "lectura rapida 1000 palabras por minuto"],
    "comipems.html": ["curso comipems intensivo", "preparacion examen comipems mexico"],
    "admision-universitaria.html": ["curso de ingreso a la universidad unam ipn", "examen de admision universidad mexico"],
    "diplomado-matematicas-fisica.html": ["diplomado en matematicas y fisica", "curso de matematicas y fisica desde cero"],
    "fastkids.html": ["curso de lectura veloz para niños", "comprension lectora infantil mexico"],
    "grandes-lideres.html": ["liderazgo e inteligencia emocional niños", "desarrollo de habilidades de liderazgo jovenes"],
    "homeschool.html": ["educacion en casa mexico homeschool", "acompañamiento homeschool mexico"],
    "juniormath_v2.html": ["curso de calculo mental para niños", "operaciones matematicas rapidas niños"],
    "lectoescritura.html": ["curso de lectoescritura para niños", "aprender a leer y escribir niños 4 a 8 años"],
    "mathekids.html": ["calculo mental abaco soroban niños", "mathekids soroban mexico"],
    "memoria-prodigiosa.html": ["curso de memoria y mnemotecnia mexico", "tecnicas de memoria palacio mental"],
    "neurocomunicacion.html": ["curso de comunicacion y liderazgo", "vencer el miedo a hablar en publico"],
    "redaccion-ejecutiva.html": ["curso de redaccion ejecutiva profesional", "redaccion de correos e informes ejecutivos"],
    "regularizacion-express.html": ["regularizacion escolar para niños", "regularizacion de matematicas y lectura"],
    "robotics.html": ["curso de robotica para niños mexico", "programacion scratch arduino niños"],
    "universidad-dominical.html": ["universidad dominical mexico", "licenciatura dominical para trabajadores"],
    "ciencia-astronomia.html": ["taller de astronomia y ciencia para niños", "curso de ciencia divertida niños"],
    "alfa-cash.html": ["educacion financiera para niños y jovenes", "finanzas personales para niños"],
    "blog-index.html": ["blog de tecnicas de estudio y lectura", "articulos de educacion y aprendizaje"],
    "blog-1-poder-contenido-organico.html": ["contenido organico para escuelas", "estrategias de marketing educativo organico"],
    "blog-2-contenido-organico-liderazgo.html": ["liderazgo educativo contenido organico", "posicionamiento de instituciones educativas"],
    "blog-3-creacion-contenido-seo.html": ["creacion de contenido seo para cursos", "como estructurar articulos educativos seo"],
    "blog-4-despertar-inteligencia-infantil.html": ["despertar inteligencia en los niños", "estimulacion cognitiva temprana niños"],
    "blog-5-eliminar-miedo-matematicas.html": ["como eliminar el miedo a las matematicas", "metodos faciles para aprender matematicas"],
    "blog-6-robotica-ciencia-futuro.html": ["importancia de la robotica en niños", "aprendizaje stem niños futuro"],
    "blog-7-ingles-sin-gramatica.html": ["aprender ingles sin gramatica", "metodo de inmersion ingles niños"],
    "blog-8-educacion-alternativa.html": ["beneficios de la educacion alternativa", "aprendizaje a ritmo propio homeschool"],
    "blog-9-vencer-examenes-admision.html": ["estrategias para vencer examenes de admision", "como estudiar para examen unam comipems"],
    "blog-10-super-cerebro.html": ["habitos para desarrollar super cerebro", "ejercicios de gimnasia cerebral"],
    "blog-11-jovenes-lideres-finanzas.html": ["finanzas personales para jovenes y niños", "enseñar el valor del dinero a los niños"],
    "testimonios.html": ["testimonios worldbrain opiniones", "experiencias alumnos lectura veloz"],
    "privacidad.html": ["aviso de privacidad worldbrain"],
    "terminos.html": ["terminos y condiciones worldbrain"],
    "reembolsos.html": ["politica de reembolsos worldbrain"],
    "404.html": ["pagina no encontrada worldbrain"]
}

audit_results = []

for page_info in pages_meta:
    fname = page_info["file"]
    keywords = keyword_map.get(fname, [page_info["clean_title"]])
    
    page_report = {
        "file": fname,
        "title": page_info["title"],
        "meta_desc": page_info["meta_desc"],
        "h1": page_info["h1"],
        "keywords_evaluated": []
    }
    
    for kw in keywords:
        params = {
            "engine": "google",
            "q": kw,
            "location": "Mexico",
            "hl": "es",
            "gl": "mx",
            "num": 20,
            "api_key": SERPAPI_KEY
        }
        
        try:
            res = requests.get("https://serpapi.com/search.json", params=params).json()
            organic = res.get("organic_results", [])
            
            rank = None
            matched_url = None
            competitors = []
            
            for idx, item in enumerate(organic[:5], start=1):
                competitors.append({
                    "rank": idx,
                    "title": item.get("title"),
                    "link": item.get("link")
                })
                
            for idx, item in enumerate(organic, start=1):
                link = item.get("link", "")
                if domain in link:
                    rank = idx
                    matched_url = link
                    break
                    
            page_report["keywords_evaluated"].append({
                "keyword": kw,
                "rank": rank if rank else "Top 20+",
                "matched_url": matched_url,
                "top_competitors": competitors
            })
            print(f"[{fname}] Kw: '{kw}' -> Rank: {rank if rank else 'Top 20+'}")
            
        except Exception as e:
            print(f"Error consultando '{kw}': {e}")
            page_report["keywords_evaluated"].append({
                "keyword": kw,
                "rank": "Error",
                "error": str(e)
            })

    audit_results.append(page_report)

out_file = os.path.join(workspace_dir, "full_keyword_seo_audit.json")
with open(out_file, "w", encoding="utf-8") as out:
    json.dump(audit_results, out, ensure_ascii=False, indent=2)

print(f"\nAuditoría de palabras clave completada y guardada en {out_file}.")
