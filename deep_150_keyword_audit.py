import glob
import re
import json
import os
import requests

SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "")
domain = "ultravelozmente.com"
workspace_dir = os.path.dirname(os.path.abspath(__file__))

page_keywords = {
    "index.html": [
        "lectura veloz mexico",
        "fotolectura y lectura veloz mexico",
        "worldbrain lectura veloz",
        "curso de lectura rapida y comprension",
        "agilidad mental y fotolectura"
    ],
    "fotolectura.html": [
        "curso de fotolectura mexico",
        "lectura rapida 1000 palabras por minuto",
        "aprender fotolectura en linea",
        "tecnica de fotolectura ejercicios",
        "curso de lectura veloz para adultos"
    ],
    "comipems.html": [
        "curso comipems intensivo",
        "preparacion examen comipems mexico",
        "garantizar ingreso prepa unam ipn",
        "curso comipems en linea 2026",
        "simulacro examen comipems gratis"
    ],
    "admision-universitaria.html": [
        "curso de ingreso a la universidad unam ipn",
        "examen de admision universidad mexico",
        "preparacion examen de admision unam uam",
        "curso de admision universitaria intensivo",
        "como pasar el examen de la unam"
    ],
    "diplomado-matematicas-fisica.html": [
        "diplomado en matematicas y fisica",
        "curso de matematicas y fisica desde cero",
        "aprender fisica y matematicas desde cero",
        "diplomado de matematicas para adultos",
        "clases de regularizacion de fisica y matematicas"
    ],
    "fastkids.html": [
        "curso de lectura veloz para niños",
        "comprension lectora infantil mexico",
        "estimulacion de lectura rapida niños",
        "taller de lectura para niños de primaria",
        "mejora de comprension lectora infantil"
    ],
    "grandes-lideres.html": [
        "liderazgo e inteligencia emocional niños",
        "desarrollo de habilidades de liderazgo jovenes",
        "taller de inteligencia emocional para niños",
        "curso de liderazgo para adolescentes",
        "oratoria y liderazgo infantil"
    ],
    "homeschool.html": [
        "educacion en casa mexico homeschool",
        "acompañamiento homeschool mexico",
        "como hacer homeschool en mexico legal",
        "programa educativo homeschool primaria secundaria",
        "plataforma homeschool mexico"
    ],
    "juniormath_v2.html": [
        "curso de calculo mental para niños",
        "operaciones matematicas rapidas niños",
        "agilidad matematica para niños de 6 a 12 años",
        "juniormath calculo mental",
        "ejercicios de razonamiento matematico niños"
    ],
    "lectoescritura.html": [
        "curso de lectoescritura para niños",
        "aprender a leer y escribir niños 4 a 8 años",
        "metodo de lectoescritura infantil",
        "regularizacion de lectoescritura primaria",
        "taller de lectoescritura en linea"
    ],
    "mathekids.html": [
        "calculo mental abaco soroban niños",
        "mathekids soroban mexico",
        "aprender a usar el abaco soroban",
        "curso de abaco para niños mexico",
        "clases de matematicas con abaco"
    ],
    "memoria-prodigiosa.html": [
        "curso de memoria y mnemotecnia mexico",
        "tecnicas de memoria palacio mental",
        "como mejorar la memoria y concentracion",
        "ejercicios de mnemotecnia para estudiantes",
        "memoria prodigiosa worldbrain"
    ],
    "neurocomunicacion.html": [
        "curso de comunicacion y liderazgo",
        "vencer el miedo a hablar en publico",
        "neurocomunicacion e inteligencia emocional",
        "taller de oratoria y comunicacion asertiva",
        "hablar en publico sin pavor curso"
    ],
    "redaccion-ejecutiva.html": [
        "curso de redaccion ejecutiva profesional",
        "redaccion de correos e informes ejecutivos",
        "ortografia y redaccion para profesionales",
        "como escribir correos profesionales efectivos",
        "taller de redaccion corporativa"
    ],
    "regularizacion-express.html": [
        "regularizacion escolar para niños",
        "regularizacion de matematicas y lectura",
        "clases particulares de regularizacion primaria",
        "regularizacion academica intensiva niños",
        "regularizar materias reprobadas primaria"
    ],
    "robotics.html": [
        "curso de robotica para niños mexico",
        "programacion scratch arduino niños",
        "robotica e inteligencia artificial para niños",
        "taller de robotica infantil en linea",
        "aprender a programar niños primaria"
    ],
    "universidad-dominical.html": [
        "universidad dominical mexico",
        "licenciatura dominical para trabajadores",
        "estudiar la universidad los domingos",
        "carreras universitarias sabatinas y dominicales",
        "licenciaturas ejecutivas modalidad dominical"
    ],
    "ciencia-astronomia.html": [
        "taller de astronomia y ciencia para niños",
        "curso de ciencia divertida niños",
        "experimentos de fisica y astronomia niños",
        "divulgacion cientifica infantil taller",
        "taller de astronomia infantil mexico"
    ],
    "alfa-cash.html": [
        "educacion financiera para niños y jovenes",
        "finanzas personales para niños",
        "enseñar a ahorrar a los niños",
        "curso de finanzas e inversiones jovenes",
        "alfa cash educacion financiera"
    ],
    "blog-index.html": [
        "blog de tecnicas de estudio y lectura",
        "articulos de educacion y aprendizaje",
        "blog educativo desarrollo infantil",
        "consejos para estudiar mejor y mas rapido",
        "recursos de aprendizaje para padres y alumnos"
    ],
    "blog-1-poder-contenido-organico.html": [
        "contenido organico para escuelas",
        "estrategias de marketing educativo organico",
        "como atraer alumnos sin pagar publicidad",
        "posicionamiento organico para instituciones",
        "redes sociales para colegios y academias"
    ],
    "blog-2-contenido-organico-liderazgo.html": [
        "liderazgo educativo contenido organico",
        "posicionamiento de instituciones educativas",
        "marcas educativas lideres en internet",
        "estrategia de marca para escuelas",
        "como destacar en el sector educativo"
    ],
    "blog-3-creacion-contenido-seo.html": [
        "creacion de contenido seo para cursos",
        "como estructurar articulos educativos seo",
        "redaccion seo para sitios web de cursos",
        "optimizar articulos de blog para google",
        "estrategia de palabras clave educativas"
    ],
    "blog-4-despertar-inteligencia-infantil.html": [
        "despertar inteligencia en los niños",
        "estimulacion cognitiva temprana niños",
        "como hacer a un niño mas inteligente",
        "ejercicios para desarrollar la mente infantil",
        "actividades de agilidad mental niños"
    ],
    "blog-5-eliminar-miedo-matematicas.html": [
        "como eliminar el miedo a las matematicas",
        "metodos faciles para aprender matematicas",
        "por que a los niños no les gustan las matematicas",
        "como ayudar a mi hijo con las matematicas",
        "perder el miedo a las operaciones matematicas"
    ],
    "blog-6-robotica-ciencia-futuro.html": [
        "importancia de la robotica en niños",
        "aprendizaje stem niños futuro",
        "por que enseñar programacion a los niños",
        "beneficios de la robotica educativa",
        "habilidades tecnologicas del futuro niños"
    ],
    "blog-7-ingles-sin-gramatica.html": [
        "aprender ingles sin gramatica",
        "metodo de inmersion ingles niños",
        "como aprender ingles de forma natural",
        "hablar ingles fluido sin estudiar reglas",
        "aprender ingles rapido para niños"
    ],
    "blog-8-educacion-alternativa.html": [
        "beneficios de la educacion alternativa",
        "aprendizaje a ritmo propio homeschool",
        "modelos educativos innovadores mexico",
        "diferencias entre escuela tradicional y homeschool",
        "educacion personalizada para niños"
    ],
    "blog-9-vencer-examenes-admision.html": [
        "estrategias para vencer examenes de admision",
        "como estudiar para examen unam comipems",
        "tecnicas de estudio para examenes dificiles",
        "como controlar los nervios en un examen de admision",
        "guia de preparacion examen de ingreso"
    ],
    "blog-10-super-cerebro.html": [
        "habitos para desarrollar super cerebro",
        "ejercicios de gimnasia cerebral",
        "como mejorar la velocidad de procesamiento mental",
        "alimentos y ejercicios para el cerebro",
        "entrenamiento cerebral diario"
    ],
    "blog-11-jovenes-lideres-finanzas.html": [
        "finanzas personales para jovenes y niños",
        "enseñar el valor del dinero a los niños",
        "como enseñar finanzas a un adolescente",
        "habitos financieros para niños",
        "educacion financiera desde temprana edad"
    ],
    "testimonios.html": [
        "testimonios worldbrain opiniones",
        "experiencias alumnos lectura veloz",
        "opiniones cursos worldbrain mexico",
        "reseñas curso fotolectura worldbrain",
        "casos de éxito alumnos lectura rapida"
    ],
    "privacidad.html": [
        "aviso de privacidad worldbrain",
        "privacidad de datos ultravelozmente",
        "politica de tratamiento de datos personales",
        "derechos arco worldbrain",
        "proteccion de datos mexico"
    ],
    "terminos.html": [
        "terminos y condiciones worldbrain",
        "condiciones de servicio ultravelozmente",
        "reglamento de cursos worldbrain",
        "contrato de servicios educativos en linea",
        "terminos de uso sitio web worldbrain"
    ],
    "reembolsos.html": [
        "politica de reembolsos worldbrain",
        "cancelacion y devolucion de cursos",
        "garantia de satisfaccion worldbrain",
        "politica de devoluciones ultravelozmente",
        "reembolso de inscripcion cursos"
    ],
    "404.html": [
        "pagina no encontrada worldbrain",
        "error 404 ultravelozmente",
        "404 page worldbrain",
        "ruta no existente worldbrain",
        "link roto worldbrain"
    ]
}

all_audit_results = []
counter = 0

for page_file, kws in page_keywords.items():
    page_record = {
        "file": page_file,
        "keywords_results": []
    }
    
    for kw in kws:
        counter += 1
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
            top_3_competitors = []
            
            for idx, item in enumerate(organic[:3], start=1):
                top_3_competitors.append({
                    "rank": idx,
                    "title": item.get("title", ""),
                    "snippet": item.get("snippet", ""),
                    "link": item.get("link", "")
                })
                
            for idx, item in enumerate(organic, start=1):
                link = item.get("link", "")
                if domain in link:
                    rank = idx
                    matched_url = link
                    break
                    
            page_record["keywords_results"].append({
                "keyword": kw,
                "rank": rank if rank else "Fuera de Top 20",
                "matched_url": matched_url,
                "top_competitors": top_3_competitors
            })
            
        except Exception as e:
            page_record["keywords_results"].append({
                "keyword": kw,
                "rank": "Error",
                "error": str(e)
            })

    all_audit_results.append(page_record)

out_file = os.path.join(workspace_dir, "deep_180_keyword_seo_audit.json")
with open(out_file, "w", encoding="utf-8") as out:
    json.dump(all_audit_results, out, ensure_ascii=False, indent=2)

print(f"\n✅ Auditoría guardada en {out_file}.")
