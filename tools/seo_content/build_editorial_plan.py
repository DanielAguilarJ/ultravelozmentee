#!/usr/bin/env python3
"""Genera el mapa editorial SEO 2026 de WorldBrain México."""
from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).parents[2] / "reports" / "seo" / "editorial-plan-60-posts.json"

CLUSTERS = {
    "universidad-dominical": ("Universidad Dominical", "/universidad-dominical", "images/hero-dominical.webp", "fa-university", "Trends MX al alza + 445 impresiones GSC relacionadas con CTR muy bajo"),
    "fotolectura": ("Fotolectura", "/fotolectura", "images/fotolectura-curso-lectura-rapida-libro.webp", "fa-book-open", "GSC: fotolectura/foto lectura en posición media 8.5; demanda evergreen en Trends"),
    "matematicas": ("MatheKids", "/mathekids", "images/mk-hero-kid.webp", "fa-calculator", "Trends MX: ábaco soroban al alza + consultas GSC de soroban/cálculo mental"),
    "robotica": ("Robotics Code", "/robotics", "images/robotics-curso-programacion-arduino-ninos.webp", "fa-robot", "GSC: robotics.html suma 1,292 impresiones; Trends MX: curso de robótica al alza"),
    "admision": ("Admisión Universitaria", "/admision-universitaria", "images/admision-universitaria-curso-examen-ingreso-unam.webp", "fa-graduation-cap", "Trends MX: examen de admisión UNAM al alza; examen IPN estable"),
    "regularizacion": ("Regularización Express", "/regularizacion-express", "images/regularizacion-express-curso-recuperar-materias.webp", "fa-clipboard-check", "Trends MX: regularización escolar y curso de verano para niños al alza"),
    "homeschool-lectoescritura": ("Homeschool y Lectoescritura", "/homeschool", "images/homeschool-educacion-en-casa-certificada-sep.webp", "fa-home", "Trends MX: homeschool México al alza + consultas GSC de homeschooling por nivel"),
    "estudio-memoria": ("Memoria Prodigiosa", "/memoria-prodigiosa", "images/memoria-prodigiosa-curso-memorizar-mnemotecnia.webp", "fa-brain", "Demanda evergreen validada con pytrends-modern; soporte transversal a admisión y aprendizaje"),
    "ingles": ("FastKids", "/fastkids", "images/fastkids-curso-ingles-ninos-flashcards.webp", "fa-language", "GSC ya muestra consultas locales de cursos de inglés; clúster comercial existente"),
    "finanzas-liderazgo-ia": ("ALFA-CASH y Grandes Líderes", "/alfa-cash", "images/alfa-cash-curso-finanzas-flujo-efectivo.webp", "fa-coins", "Trends MX: educación financiera para niños al alza; IA educativa como expansión informacional"),
}

# slug, título, keyword principal, intención, ángulo diferenciador
ROWS = [
("universidad-dominical-que-es", "Universidad dominical: qué es, cómo funciona y para quién conviene", "universidad dominical", "informacional-comercial", "Respuesta directa más checklist de compatibilidad personal"),
("modalidad-dominical-ventajas-retos", "Modalidad dominical: ventajas, retos y cómo organizar tu semana", "modalidad dominical", "informacional", "Decisión realista sin ocultar carga de trabajo"),
("universidad-dominical-vs-sabatina-en-linea", "Universidad dominical, sabatina o en línea: comparación para decidir", "universidad dominical vs sabatina", "comparativa", "Matriz por tiempo, autonomía, convivencia y ritmo"),
("como-elegir-universidad-dominical-validez", "Cómo elegir una universidad dominical y verificar la validez de estudios", "universidades dominicales", "investigación-comercial", "Checklist verificable con consulta oficial de RVOE"),
("estudiar-y-trabajar-plan-semanal", "Cómo estudiar y trabajar al mismo tiempo: plan semanal sostenible", "estudiar y trabajar", "informacional", "Bloques mínimos, energía y contingencias"),
("volver-a-estudiar-universidad-adultos", "Volver a la universidad de adulto: guía para retomar sin empezar a ciegas", "universidad para adultos", "informacional-comercial", "Barreras emocionales, documentos y prueba piloto"),

("fotolectura-que-es-como-funciona", "Fotolectura: qué es, cómo se practica y qué resultados esperar", "fotolectura", "informacional-comercial", "Explicación sin promesas imposibles ni cifras infladas"),
("velocidad-lectora-como-medirla", "Velocidad lectora: cómo medir palabras por minuto y comprensión", "velocidad lectora", "informacional", "Protocolo reproducible con doble métrica"),
("leer-rapido-sin-perder-comprension", "Cómo leer más rápido sin perder comprensión: método paso a paso", "leer rápido sin perder comprensión", "informacional", "Velocidad adaptativa según propósito y dificultad"),
("mejorar-comprension-lectora", "Cómo mejorar la comprensión lectora con preguntas antes, durante y después", "mejorar comprensión lectora", "informacional", "Rutina de preguntas y resumen verificable"),
("tecnicas-lectura-estudiantes", "7 técnicas de lectura para estudiar textos difíciles", "técnicas de lectura", "informacional", "Cuándo usar exploración, lectura profunda y recuperación"),
("plan-cuatro-semanas-habito-lector", "Plan de cuatro semanas para construir un hábito de lectura sostenible", "hábito de lectura", "informacional", "Progresión flexible sin el mito de los 21 días"),

("abaco-soroban-que-es", "Ábaco soroban: qué es y cómo ayuda a comprender el cálculo", "ábaco soroban", "informacional-comercial", "Del objeto concreto a la representación mental"),
("calculo-mental-ninos-ejercicios", "Cálculo mental para niños: ejercicios breves por nivel", "cálculo mental para niños", "informacional", "Rutinas graduadas sin convertir rapidez en presión"),
("ansiedad-matematica-ninos", "Ansiedad matemática en niños: señales y formas de recuperar confianza", "ansiedad matemática niños", "informacional", "Lenguaje cuidadoso y apoyo pedagógico, no diagnóstico"),
("tablas-multiplicar-sin-memorizar", "Cómo aprender las tablas de multiplicar con patrones y práctica espaciada", "aprender tablas de multiplicar", "informacional", "Comprensión antes de automatización"),
("soroban-edad-ideal", "¿A qué edad empezar con soroban? Señales de preparación por etapa", "soroban edad", "informacional-comercial", "Criterios de preparación en lugar de una edad rígida"),
("elegir-curso-matematicas-ninos", "Cómo elegir un curso de matemáticas para niños: 10 preguntas clave", "curso de matemáticas para niños", "investigación-comercial", "Checklist contra presión, memorización y promesas exageradas"),

("curso-robotica-ninos-que-aprenden", "Curso de robótica para niños: qué aprenden realmente", "curso de robótica para niños", "informacional-comercial", "Resultados observables: diseño, código, prueba y explicación"),
("arduino-microbit-scratch-cual-elegir", "Arduino, micro:bit o Scratch: cuál elegir para empezar", "Arduino para niños", "comparativa", "Decisión por edad, lectura, electrónica y objetivo"),
("programacion-ninos-por-edades", "Programación para niños por edades: ruta de 6 a 17 años", "programación para niños", "informacional", "Progresión por madurez y proyectos, no por moda"),
("robotica-educativa-beneficios", "Robótica educativa: beneficios, límites y cómo evaluar el aprendizaje", "robótica educativa", "informacional", "Distinguir producto llamativo de pensamiento ingenieril"),
("primer-proyecto-robotica-casa", "Primer proyecto de robótica en casa: semáforo de papel paso a paso", "proyecto robótica para niños", "informacional", "Actividad de bajo costo con reflexión y seguridad"),
("elegir-curso-robotica-ninos", "Cómo elegir clases de robótica para niños sin pagar solo por entretenimiento", "clases de robótica para niños", "investigación-comercial", "Evidencias, seguridad, acompañamiento y portafolio"),

("examen-admision-universidad-plan-12-semanas", "Plan de 12 semanas para preparar un examen de admisión universitaria", "examen de admisión", "informacional-comercial", "Diagnóstico, bloques, simulacros y ajustes"),
("examen-unam-como-prepararse", "Cómo prepararse para el examen UNAM con fuentes oficiales y práctica", "examen UNAM", "informacional-comercial", "Método evergreen; fechas siempre remitidas a DGAE"),
("examen-ipn-como-prepararse", "Examen IPN: cómo organizar temario, práctica y simulacros", "examen IPN", "informacional-comercial", "Preparación verificable y referencia al portal oficial"),
("comipems-ecoems-que-cambio", "De COMIPEMS al nuevo proceso metropolitano: qué debe verificar cada aspirante", "COMIPEMS", "informacional", "Evita fechas inventadas y dirige a convocatorias oficiales vigentes"),
("simulacro-examen-admision", "Cómo usar un simulacro de examen de admisión para mejorar de verdad", "simulacro examen admisión", "informacional", "Análisis de errores por causa, no solo puntuación"),
("ansiedad-examen-admision", "Ansiedad antes del examen de admisión: plan práctico para la última semana", "ansiedad examen admisión", "informacional", "Preparación logística y autorregulación sin consejo clínico"),

("regularizacion-escolar-que-es", "Regularización escolar: qué es, cuándo conviene y qué debe incluir", "regularización escolar", "informacional-comercial", "Diagnóstico, objetivo medible y salida gradual"),
("senales-rezago-escolar", "7 señales de rezago escolar que conviene atender a tiempo", "rezago escolar", "informacional", "Diferenciar tropiezo puntual de patrón persistente"),
("clases-regularizacion-primaria", "Clases de regularización para primaria: guía para madres y padres", "regularización primaria", "investigación-comercial", "Juego, bases y comunicación con escuela"),
("regularizacion-secundaria-plan", "Regularización en secundaria: plan para recuperar materias sin saturarse", "regularización secundaria", "informacional-comercial", "Priorización por prerrequisitos y evaluación próxima"),
("reprobe-materia-que-hacer", "Reprobé una materia: qué hacer en las primeras 48 horas", "reprobé una materia", "informacional", "Acciones concretas, sin culpa ni soluciones mágicas"),
("curso-verano-aprovechamiento-escolar", "Curso de verano académico: cómo elegirlo y aprovecharlo", "curso de verano para niños", "investigación-comercial", "Equilibrio entre recuperación, descanso y objetivos"),

("homeschool-mexico-guia-familias", "Homeschool en México: preguntas que una familia debe resolver antes de empezar", "homeschool México", "informacional-comercial", "Decisión familiar, socialización y ruta administrativa"),
("validar-estudios-educacion-casa-sep", "Cómo investigar la validez de estudios al educar en casa en México", "validar estudios SEP", "informacional", "No da asesoría legal; enseña a verificar ante autoridad competente"),
("horario-homeschool-realista", "Horario homeschool realista: bloques, pausas y autonomía", "horario homeschool", "informacional", "Menos horas de silla, más evidencia de aprendizaje"),
("como-ensenar-a-leer-ninos", "Cómo enseñar a leer: habilidades previas y actividades por etapas", "cómo enseñar a leer", "informacional", "Conciencia fonológica, correspondencia y comprensión"),
("actividades-lectoescritura-casa", "12 actividades de lectoescritura en casa con materiales cotidianos", "actividades de lectoescritura", "informacional", "Práctica lúdica y observable, sin fichas interminables"),
("dislexia-senales-cuando-evaluar", "Dificultades de lectura: señales para pedir una evaluación profesional", "señales de dislexia", "informacional", "No diagnostica; orienta a documentar y buscar especialistas"),

("tecnicas-estudio-que-si-funcionan", "Técnicas de estudio: qué hacer en lugar de releer y subrayar todo", "técnicas de estudio", "informacional", "Práctica de recuperación, elaboración y distribución"),
("recuerdo-activo-como-usarlo", "Recuerdo activo: cómo estudiar preguntándote en vez de releer", "recuerdo activo", "informacional", "Guía con ejemplos y control de dificultad"),
("repeticion-espaciada-guia", "Repetición espaciada: guía práctica para no olvidar lo estudiado", "repetición espaciada", "informacional", "Calendario adaptable, no algoritmo obligatorio"),
("concentracion-estudiar-sin-distracciones", "Cómo concentrarse para estudiar: diseña el entorno antes de exigir voluntad", "concentración para estudiar", "informacional", "Fricción digital, tarea definida y descansos"),
("metodo-cornell-apuntes", "Método Cornell: cómo tomar apuntes y convertirlos en preguntas", "método Cornell", "informacional", "El repaso activo como parte del sistema"),
("mapas-mentales-estudiar", "Mapas mentales para estudiar: cuándo ayudan y cuándo estorban", "mapas mentales", "informacional", "Uso selectivo para relaciones, no para copiar el libro"),

("ingles-ninos-por-edades", "Inglés para niños por edades: objetivos realistas de 4 a 15 años", "inglés para niños", "informacional-comercial", "Expectativas por exposición, interacción y autonomía"),
("aprender-ingles-sin-traducir", "Cómo aprender inglés sin traducir cada palabra", "aprender inglés sin traducir", "informacional", "Contexto, imágenes, frases y tolerancia a ambigüedad"),
("actividades-ingles-casa", "10 actividades de inglés en casa que no parecen tarea", "actividades inglés niños", "informacional", "Microinmersión cotidiana con instrucciones simples"),
("como-elegir-curso-ingles-ninos", "Cómo elegir un curso de inglés para niños: señales de calidad", "curso de inglés para niños", "investigación-comercial", "Tiempo de habla, retroalimentación y progreso observable"),
("vocabulario-ingles-repeticion-espaciada", "Cómo aprender vocabulario en inglés con frases y repetición espaciada", "vocabulario inglés", "informacional", "Recuperación en contexto, no listas aisladas"),
("miedo-hablar-ingles", "Miedo a hablar inglés: una progresión segura para empezar a expresarte", "miedo a hablar inglés", "informacional", "Escalera de exposición sin ridiculización"),

("educacion-financiera-ninos-por-edades", "Educación financiera para niños por edades: de elegir a presupuestar", "educación financiera para niños", "informacional-comercial", "Decisiones reales y lenguaje apropiado por etapa"),
("presupuesto-adolescentes", "Presupuesto para adolescentes: plantilla simple con ingresos irregulares", "presupuesto adolescentes", "informacional", "Separar compromisos, metas, disfrute y colchón"),
("ahorro-ninos-actividades", "Cómo enseñar ahorro a los niños con 5 actividades cotidianas", "ahorro para niños", "informacional", "Objetivos visibles y decisiones, no sermones"),
("liderazgo-adolescentes-habilidades", "Liderazgo en adolescentes: 6 habilidades que se practican", "liderazgo para adolescentes", "informacional-comercial", "Escucha, iniciativa, acuerdos y reflexión"),
("inteligencia-artificial-para-estudiar", "Inteligencia artificial para estudiar: 8 usos que sí exigen pensar", "inteligencia artificial educación", "informacional", "Tutor socrático, ejemplos y verificación de fuentes"),
("chatgpt-estudiantes-uso-responsable", "ChatGPT para estudiantes: cómo usarlo sin copiar ni dejar de aprender", "ChatGPT para estudiar", "informacional", "Flujo pedir-intentar-verificar-citar"),
]

cluster_order = list(CLUSTERS)
posts = []
for index, row in enumerate(ROWS, start=1):
    cluster = cluster_order[(index - 1) // 6]
    course, course_url, image, icon, evidence = CLUSTERS[cluster]
    slug, title, keyword, intent, angle = row
    posts.append({
        "id": index,
        "slug": slug,
        "filename": f"blog-{slug}.html",
        "title": title,
        "primary_keyword": keyword,
        "cluster": cluster,
        "category": course,
        "intent": intent,
        "angle": angle,
        "course_name": course,
        "course_url": course_url,
        "image": image,
        "icon": icon,
        "evidence": evidence,
        "publication_date": "2026-08-04",
        "status": "planned",
    })

assert len(posts) == 60
assert len({p["slug"] for p in posts}) == 60
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({"meta": {"site": "https://ultravelozmente.com", "geo": "MX", "source": "pytrends-modern + Google Search Console", "post_count": len(posts)}, "posts": posts}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{OUT}: {len(posts)} posts")
