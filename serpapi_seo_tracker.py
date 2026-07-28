import requests
import json
import os

# Lee la clave API de la variable de entorno SERPAPI_KEY o usa una por defecto si está definida
SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "")

domain = "ultravelozmente.com"

keywords_to_track = [
    ("index.html", "ultravelozmente.com", "lectura veloz mexico"),
    ("fotolectura.html", "ultravelozmente.com/fotolectura", "curso de fotolectura mexico"),
    ("comipems.html", "ultravelozmente.com/comipems", "curso comipems intensivo"),
    ("admision-universitaria.html", "ultravelozmente.com/admision-universitaria", "curso de ingreso a la universidad unam ipn"),
    ("diplomado-matematicas-fisica.html", "ultravelozmente.com/diplomado-matematicas-fisica", "diplomado en matematicas y fisica"),
    ("homeschool.html", "ultravelozmente.com/homeschool", "educacion en casa mexico homeschool"),
    ("mathekids.html", "ultravelozmente.com/mathekids", "calculo mental abaco soroban niños"),
    ("redaccion-ejecutiva.html", "ultravelozmente.com/redaccion-ejecutiva", "curso de redaccion ejecutiva profesional"),
    ("robotics.html", "ultravelozmente.com/robotics", "curso de robotica para niños mexico"),
    ("lectoescritura.html", "ultravelozmente.com/lectoescritura", "curso de lectoescritura para niños"),
    ("memoria-prodigiosa.html", "ultravelozmente.com/memoria-prodigiosa", "curso de memoria y mnemotecnia mexico"),
    ("neurocomunicacion.html", "ultravelozmente.com/neurocomunicacion", "curso de comunicacion y liderazgo"),
    ("universidad-dominical.html", "ultravelozmente.com/universidad-dominical", "universidad dominical mexico"),
    ("regularizacion-express.html", "ultravelozmente.com/regularizacion-express", "regularizacion escolar para niños"),
    ("alfa-cash.html", "ultravelozmente.com/alfa-cash", "educacion financiera para niños y jovenes")
]

print(f"=== VERIFICACIÓN DE POSICIONES REALES EN GOOGLE (SERPAPI) PARA {domain} ===\n")

if not SERPAPI_KEY:
    print("⚠️ ADVERTENCIA: Define SERPAPI_KEY en tus variables de entorno para ejecutar las consultas en vivo.")
    print("Ejemplo: export SERPAPI_KEY='tu_llave_de_serpapi'\n")

results_summary = []

site_url = "https://serpapi.com/search.json"
site_params = {
    "engine": "google",
    "q": f"site:{domain}",
    "api_key": SERPAPI_KEY
}

try:
    s_res = requests.get(site_url, params=site_params).json()
    total_indexed = s_res.get("search_information", {}).get("total_results", "Desconocido")
    print(f"🔍 Páginas indexadas en Google para site:{domain}: ~{total_indexed}\n")
    results_summary.append({"type": "indexation", "total_indexed": total_indexed})
except Exception as e:
    print(f"Error al verificar indexación: {e}\n")

for page_file, target_path, kw in keywords_to_track:
    params = {
        "engine": "google",
        "q": kw,
        "location": "Mexico",
        "hl": "es",
        "gl": "mx",
        "num": 50,
        "api_key": SERPAPI_KEY
    }
    
    try:
        response = requests.get("https://serpapi.com/search.json", params=params)
        data = response.json()
        
        if "error" in data:
            print(f"❌ Error SerpApi para '{kw}': {data['error']}")
            results_summary.append({'page': page_file, 'kw': kw, 'pos': 'Error', 'error': data['error']})
            continue
            
        organic_results = data.get("organic_results", [])
        
        found_rank = None
        found_url = None
        found_snippet = None
        
        for index, item in enumerate(organic_results, start=1):
            link = item.get("link", "")
            if domain in link:
                found_rank = index
                found_url = link
                found_snippet = item.get("snippet", "")
                break
                
        if found_rank:
            res_str = f"🟢 [Posición #{found_rank}] '{kw}' ({page_file}) -> {found_url}"
            print(res_str)
            results_summary.append({'page': page_file, 'kw': kw, 'pos': found_rank, 'url': found_url, 'snippet': found_snippet})
        else:
            res_str = f"⚪ [Top 50+] '{kw}' ({page_file}) -> No aparece en los primeros 50 resultados."
            print(res_str)
            results_summary.append({'page': page_file, 'kw': kw, 'pos': 'Top 50+', 'url': None})
            
    except Exception as e:
        print(f"❌ Error en request para '{kw}': {e}")

out_path = os.path.join(os.path.dirname(__file__), "serpapi_results.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(results_summary, f, ensure_ascii=False, indent=2)

print(f"\n=== RESULTADOS GUARDADOS EN {out_path} ===")
