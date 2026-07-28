import glob
import re
import json
import os
import requests

SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "")
domain = "ultravelozmente.com"
workspace_dir = os.path.dirname(os.path.abspath(__file__))

new_page_keywords = {
    "index.html": [
        "mejores cursos de lectura rapida en mexico",
        "cuanto cuesta un curso de fotolectura",
        "donde aprender lectura veloz en linea",
        "tecnicas de lectura rapida y comprension garantizada",
        "escuelas de fotolectura en mexico"
    ],
    "fotolectura.html": [
        "fotolectura opiniones y resultados",
        "como funciona la fotolectura mental",
        "leer 1000 palabras por minuto mexico",
        "curso de lectura fotosintetica",
        "metodo fotolectura paul scheele mexico"
    ],
    "comipems.html": [
        "cuantos puntos pide la prepa 6 unam comipems",
        "temario examen comipems 2026 oficial",
        "como asegurar 100 aciertos en el comipems",
        "mejores cursos de preparacion comipems cdmx",
        "guia de estudio comipems resuelta"
    ],
    "admision-universitaria.html": [
        "cuantos aciertos pide medicina unam 2026",
        "curso de preparacion examen de admision ipn",
        "guia de estudio examen de admision uam",
        "como ingresar a la unam a la primera",
        "simulacro examen de admision unam gratis"
    ],
    "diplomado-matematicas-fisica.html": [
        "aprender matematicas desde cero para adultos",
        "como entender la fisica desde cero",
        "diplomado de regularizacion en ciencias exactas",
        "clases particulares de fisica cuantitativa y algebra",
        "curso de preparacion para ingresar a ingenieria"
    ],
    "fastkids.html": [
        "mi hijo lee muy lento como ayudarlo",
        "ejercicios de lectura rapida para niños de primaria",
        "tecnicas de comprension lectora para niños con tdah",
        "como hacer que a mi hijo le guste leer",
        "taller de lectura y redaccion para niños"
    ],
    "grandes-lideres.html": [
        "como quitar la timidez a un niño",
        "inteligencia emocional para niños y adolescentes",
        "desarrollar habilidades sociales en niños",
        "curso de oratoria y hablar en publico para niños",
        "talleres de autoestima e inteligencia emocional infantil"
    ],
    "homeschool.html": [
        "cuanto cuesta hacer homeschool en mexico",
        "certificacion de primaria y secundaria homeschool mexico",
        "validez oficial del homeschool en mexico inea",
        "ventajas y desventajas de la educacion en casa",
        "material didactico para hacer homeschool en mexico"
    ],
    "juniormath_v2.html": [
        "como enseñar operaciones matematicas rapidas a un niño",
        "ejercicios de calculo mental primaria gratis",
        "juegos de agilidad matematica para niños",
        "como hacer calculo mental rapido sin calculadora",
        "regularizar a mi hijo en matematicas primaria"
    ],
    "lectoescritura.html": [
        "metodo fonetico de lectoescritura para niños",
        "mi hijo de 6 años no sabe leer que hago",
        "actividades para enseñar a leer y escribir en casa",
        "como enseñar a leer a un niño de preescolar",
        "regularizacion de lectura y escritura para niños"
    ],
    "mathekids.html": [
        "beneficios del abaco soroban en el cerebro de los niños",
        "donde comprar abaco soroban en mexico",
        "como usar el abaco japones soroban ejercicios",
        "clases de soroban en linea mexico",
        "matematicas con abaco para niños de primaria"
    ],
    "memoria-prodigiosa.html": [
        "como memorizar un libro completo rapido",
        "tecnica de palacio de la memoria paso a paso",
        "como mejorar la memoria para examenes dificiles",
        "mnemotecnia para aprender historia y conceptos",
        "entrenamiento de memoria para profesionales y medicos"
    ],
    "neurocomunicacion.html": [
        "como hablar en publico sin ponerse nervioso",
        "tecnicas de neurocomunicacion para ventas y liderazgo",
        "como comunicarme mejor en el trabajo y negocios",
        "taller de lenguaje corporal y oratoria",
        "superar el pánico escenico al presentar"
    ],
    "redaccion-ejecutiva.html": [
        "como escribir correos profesionales sin faltas de ortografia",
        "redaccion de reportes e informes de trabajo",
        "errores comunes de ortografia y redaccion ejecutiva",
        "curso de redaccion corporativa para gerentes",
        "como redactar una carta formal de negocios"
    ],
    "regularizacion-express.html": [
        "clases de regularizacion de matematicas urgentes",
        "regularizar a un alumno reprobado primaria secundaria",
        "profesores de regularizacion a domicilio o en linea",
        "como nivelar a mi hijo en la escuela rapido",
        "regularizacion de fisica y matematicas primaria"
    ],
    "robotics.html": [
        "kits de robotica educativa para niños mexico",
        "aprender a programar en scratch niños gratis",
        "por que los niños deben aprender inteligencia artificial",
        "clases de robotica y arduino para niños",
        "escuelas de robotica infantil cerca de mi"
    ],
    "universidad-dominical.html": [
        "donde estudiar la universidad solo los domingos",
        "licenciaturas en linea o dominicales con validez rvoe",
        "carreras universitarias para personas que trabajan",
        "universidad ejecuctiva fines de semana mexico",
        "titulacion universitaria para adultos trabajadores"
    ],
    "ciencia-astronomia.html": [
        "experimentos faciles de ciencia para niños en casa",
        "como enseñar astronomia a los niños",
        "talleres stem para niños en vacaciones",
        "actividades de ciencia divertida para primaria",
        "taller de astronomia y telescopios para niños"
    ],
    "alfa-cash.html": [
        "juegos de finanzas personales para niños",
        "como enseñar el valor de las inversiones a jovenes",
        "educacion financiera para adolescentes mexico",
        "libros de finanzas para niños y jovenes",
        "taller de emprendimiento infantil y finanzas"
    ],
    "blog-index.html": [
        "mejores blogs de educacion y aprendizaje mexico",
        "tecnicas de estudio efectivas para universitarios",
        "como aprender mas rapido segun la neurociencia",
        "recursos educativos para padres de familia",
        "articulos de pedagogia y desarrollo cognitivo"
    ],
    "blog-1-poder-contenido-organico.html": [
        "marketing de contenidos para instituciones educativas",
        "como conseguir alumnos por internet sin pagar anuncios",
        "estrategias de inscripcion para escuelas particulares",
        "embudos de venta para cursos educativos",
        "casos de exito marketing educativo organico"
    ],
    "blog-2-contenido-organico-liderazgo.html": [
        "como posicionar una marca educativa en google",
        "estrategia digital para colegios privados",
        "marcas de educacion lideres en latinoamerica",
        "reputacion digital para escuelas y academias",
        "posicionamiento seo para instituciones educativas"
    ],
    "blog-3-creacion-contenido-seo.html": [
        "redaccion de contenidos educativos para blogs",
        "guia de seo copywriting para cursos online",
        "como elegir palabras clave para una escuela",
        "estructura de un articulo de blog que posiciona en google",
        "seo para plataformas de cursos y edtech"
    ],
    "blog-4-despertar-inteligencia-infantil.html": [
        "estimulacion temprana para desarrollar la inteligencia",
        "juegos para aumentar el coeficiente intelectual en niños",
        "como saber si mi hijo es superdotado o brillante",
        "desarrollo del cerebro en niños de 4 a 10 años",
        "ejercicios de agilidad mental para niños primaria"
    ],
    "blog-5-eliminar-miedo-matematicas.html": [
        "por que las matematicas son dificiles para los niños",
        "ansiedad matematica en estudiantes como superarla",
        "metodo visual para comprender las matematicas",
        "como hacer divertidas las matematicas en casa",
        "tecnicas para perder el miedo a las ecuaciones"
    ],
    "blog-6-robotica-ciencia-futuro.html": [
        "empleos del futuro y la robotica infantil",
        "por que el pensamiento computacional es clave en los niños",
        "beneficios de aprender a programar a temprana edad",
        "robotica y pensamiento critico en la infancia",
        "innovacion educativa stem en latinoamerica"
    ],
    "blog-7-ingles-sin-gramatica.html": [
        "por que la gramatica no funciona para hablar ingles",
        "metodo de inmersión linguistica natural",
        "como lograr que un niño hable ingles fluido",
        "aprender ingles escuchando y hablando sin traducir",
        "ingles como segundo idioma en niños"
    ],
    "blog-8-educacion-alternativa.html": [
        "metodo montessori vs homeschool diferencias",
        "por que la escuela tradicional esta obsoleta",
        "educacion personalizada vs educacion masiva",
        "tendencias de la educacion del futuro en mexico",
        "aprendizaje basado en proyectos para niños"
    ],
    "blog-9-vencer-examenes-admision.html": [
        "tecnicas de respiracion para nervios en examenes",
        "como organizar un calendario de estudio para comipems unam",
        "metodo pomodoro para estudiar examenes de admision",
        "errores mas comunes al presentar el examen de la unam",
        "como responder preguntas de opcion multiple dificiles"
    ],
    "blog-10-super-cerebro.html": [
        "ejercicios de neurobica para rejuvenecer la mente",
        "alimentos nootrópicos para concentracion y memoria",
        "cuantas horas debe dormir un estudiante para memorizar mejor",
        "como evitar la fatiga mental al estudiar mucho",
        "tecnicas de enfoque profundo para estudiantes"
    ],
    "blog-11-jovenes-lideres-finanzas.html": [
        "la regla del ahorro 50 30 20 para adolescentes",
        "como explicar la inflacion y el interes compuesto a un niño",
        "primeras inversiones para jovenes de 15 a 18 años",
        "tarjetas de débito para menores de edad mexico",
        "educacion financiera en la escuela secundaria"
    ],
    "testimonios.html": [
        "experiencias de padres en worldbrain lectura veloz",
        "reseñas reales de cursos de fotolectura mexico",
        "worldbrain es confiable opiniones de alumnos",
        "resultados de niños en mathekids opiniones",
        "calificaciones de worldbrain en trustpilot"
    ],
    "privacidad.html": [
        "politica de privacidad ultravelozmente com",
        "aviso de privacidad datos personales worldbrain",
        "como ejercer derechos arco en worldbrain",
        "seguridad de datos de alumnos worldbrain",
        "contacto de privacidad worldbrain mexico"
    ],
    "terminos.html": [
        "condiciones de inscripcion cursos worldbrain",
        "terminos de uso de la plataforma ultravelozmente",
        "reglamento interno de alumnos worldbrain",
        "derechos de autor y material didactico worldbrain",
        "terminos de servicio en linea worldbrain"
    ],
    "reembolsos.html": [
        "como solicitar reembolso en worldbrain",
        "politica de cancelacion de cursos ultravelozmente",
        "garantia de devolucion de dinero worldbrain",
        "condiciones para solicitar reembolso en linea",
        "proceso de devolucion de pago worldbrain"
    ],
    "404.html": [
        "pagina no encontrada error 404 worldbrain",
        "url no disponible ultravelozmente",
        "soporte tecnico link roto worldbrain",
        "redireccion 404 ultravelozmente com",
        "buscar pagina en worldbrain mexico"
    ]
}

new_audit_results = []
counter = 0

for page_file, kws in new_page_keywords.items():
    p_record = {
        "file": page_file,
        "new_keywords_results": []
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
            top_3 = []
            
            for idx, item in enumerate(organic[:3], start=1):
                top_3.append({
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
                    
            p_record["new_keywords_results"].append({
                "keyword": kw,
                "rank": rank if rank else "Fuera de Top 20",
                "matched_url": matched_url,
                "top_competitors": top_3
            })
            
        except Exception as e:
            p_record["new_keywords_results"].append({
                "keyword": kw,
                "rank": "Error",
                "error": str(e)
            })

    new_audit_results.append(p_record)

out_file = os.path.join(workspace_dir, "expand_360_keyword_seo_audit.json")
with open(out_file, "w", encoding="utf-8") as out:
    json.dump(new_audit_results, out, ensure_ascii=False, indent=2)

print(f"\n✅ Segunda fase completada. Guardado en {out_file}.")
