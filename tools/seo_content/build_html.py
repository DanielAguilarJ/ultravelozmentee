#!/usr/bin/env python3
"""Renderiza los 60 posts JSON (content/posts/batch-*.json) a blog-<slug>.html
siguiendo la plantilla de blog-1-poder-contenido-organico.html (navbar unificado,
hero editorial, blog-content, footer). Usa reports/seo/editorial-plan-60-posts.json
como fuente de metadatos (título, imagen, curso, categoría, fecha)."""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parents[2]
PLAN_PATH = ROOT / "reports" / "seo" / "editorial-plan-60-posts.json"
POSTS_DIR = ROOT / "content" / "posts"
OUT_DIR = ROOT
SITE = "https://ultravelozmente.com"

MONTHS_ES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril", 5: "Mayo", 6: "Junio",
    7: "Julio", 8: "Agosto", 9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
}


def load_plan() -> dict[int, dict]:
    data = json.loads(PLAN_PATH.read_text(encoding="utf-8"))
    return {p["id"]: p for p in data["posts"]}


def load_content() -> dict[int, dict]:
    content: dict[int, dict] = {}
    for f in sorted(POSTS_DIR.glob("batch-*.json")):
        for post in json.loads(f.read_text(encoding="utf-8")):
            content[post["id"]] = post
    return content


def fmt_date_es(iso: str) -> str:
    y, m, d = (int(x) for x in iso.split("-"))
    return f"{d} de {MONTHS_ES[m]}, {y}"


def reading_minutes(word_count: int) -> int:
    return max(3, round(word_count / 200))


def word_count_of(post: dict) -> int:
    text = post["quick_answer"] + " " + " ".join(post["lead"])
    for s in post["sections"]:
        text += " " + s["heading"]
        text += " " + " ".join(s.get("paragraphs", []))
        text += " " + " ".join(s.get("bullets", []))
        text += " " + " ".join(s.get("steps", []))
    for f in post["faq"]:
        text += " " + f["question"] + " " + f["answer"]
    text += " " + post["cta"]["heading"] + " " + post["cta"]["text"]
    return len(text.split())


def esc(text: str) -> str:
    """Escapa comillas dobles para atributos HTML (el texto ya viene en UTF-8 válido)."""
    return text.replace('"', "&quot;")


def render_head(meta: dict, post: dict) -> str:
    slug = meta["slug"]
    url = f"{SITE}/blog-{slug}"
    title = f"{meta['title']} | WorldBrain"
    description = post["description"]
    image_url = f"{SITE}/{meta['image']}"
    pub_date = meta["publication_date"]

    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": ["EducationalOrganization", "LocalBusiness"],
                "@id": f"{SITE}/#organization",
                "name": "WorldBrain México",
                "alternateName": "UltraVelozmente",
                "url": f"{SITE}/",
                "sameAs": [
                    "https://www.facebook.com/WorldBrainMx/",
                    "https://www.instagram.com/worldbrainmx1/",
                    "https://x.com/WorldBrainMx",
                    "https://youtube.com/@worldbrainmexico",
                    "https://tiktok.com/@worldbrainmexico",
                ],
                "logo": {"@type": "ImageObject", "url": f"{SITE}/images/logo.svg"},
                "telephone": "+52-55-7810-7837",
                "email": "contacto@ultravelozmente.com",
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": "Av. 1 de Mayo, Mz-C24B, Loc 282-283, Col. Centro Urbano",
                    "addressLocality": "Cuautitlán Izcalli",
                    "addressRegion": "Estado de México",
                    "postalCode": "54700",
                    "addressCountry": "MX",
                },
                "areaServed": {"@type": "Country", "name": "México"},
                "openingHours": ["Mo-Th 09:00-18:00", "Fr 09:00-17:00", "Sa 08:00-15:00"],
                "contactPoint": {
                    "@type": "ContactPoint",
                    "telephone": "+52-55-7810-7837",
                    "contactType": "customer service",
                    "availableLanguage": ["es", "Spanish"],
                    "areaServed": "MX",
                },
            },
            {"@type": "WebSite", "@id": f"{SITE}/#website", "url": f"{SITE}/", "name": "WorldBrain México",
             "inLanguage": "es-MX", "publisher": {"@id": f"{SITE}/#organization"}},
            {
                "@type": "WebPage", "@id": f"{url}#webpage", "url": url, "name": meta["title"],
                "description": description, "inLanguage": "es-MX",
                "isPartOf": {"@id": f"{SITE}/#website"},
                "primaryImageOfPage": {"@type": "ImageObject", "url": image_url},
                "breadcrumb": {"@id": f"{url}#breadcrumb"},
            },
            {
                "@type": "BreadcrumbList", "@id": f"{url}#breadcrumb",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Inicio", "item": f"{SITE}/"},
                    {"@type": "ListItem", "position": 2, "name": "Blog", "item": f"{SITE}/blog-index"},
                    {"@type": "ListItem", "position": 3, "name": meta["title"], "item": url},
                ],
            },
            {
                "@type": "BlogPosting", "@id": f"{url}#article", "headline": meta["title"],
                "description": description, "url": url, "image": image_url,
                "datePublished": pub_date, "dateModified": pub_date, "inLanguage": "es-MX",
                "mainEntityOfPage": {"@id": f"{url}#webpage"},
                "author": {"@type": "Organization", "@id": f"{SITE}/#editorial-team",
                           "name": "Equipo Editorial WorldBrain",
                           "parentOrganization": {"@id": f"{SITE}/#organization"}},
                "publisher": {"@id": f"{SITE}/#organization"},
            },
            {
                "@type": "FAQPage", "@id": f"{url}#faq",
                "mainEntity": [
                    {"@type": "Question", "name": qa["question"],
                     "acceptedAnswer": {"@type": "Answer", "text": qa["answer"]}}
                    for qa in post["faq"]
                ],
            },
        ],
    }
    schema_json = json.dumps(schema, ensure_ascii=False, indent=2)

    return f"""<!DOCTYPE html>
<html lang="es-MX">

<head><script async src="https://www.googletagmanager.com/gtag/js?id=AW-10846614576"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag() {{ dataLayer.push(arguments); }}
        gtag('js', new Date());
        gtag('config', 'AW-10846614576');
    </script>
    <!-- Google Tag Manager -->
    <script>(function (w, d, s, l, i) {{
            w[l] = w[l] || []; w[l].push({{
                'gtm.start':
                    new Date().getTime(), event: 'gtm.js'
            }}); var f = d.getElementsByTagName(s)[0],
                j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : ''; j.async = true; j.src =
                    'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
        }})(window, document, 'script', 'dataLayer', 'GTM-MWMFXQS7');</script>
    <!-- End Google Tag Manager -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <meta property="article:section" content="{esc(meta['category'])}">

    <!-- Theme: FOUC Prevention -->
    <script>
        (function() {{
            var theme = localStorage.getItem('theme');
            if (theme === 'light' || (!theme && window.matchMedia('(prefers-color-scheme: light)').matches)) {{
                document.documentElement.classList.add('light-mode');
            }}
        }})();
    </script>

    <link rel="stylesheet" href="css/styles.min.css">
    <link rel="stylesheet" href="css/blog.min.css">
    <link rel="stylesheet" href="css/blog-editorial.css">
    <link rel="stylesheet" href="css/marketing-toolkit.min.css">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=Georgia&display=swap"
        rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
<script defer src="https://capi-automation.s3.us-east-2.amazonaws.com/public/client_js/capiParamBuilder/clientParamBuilder.bundle.js"></script>

    <link rel="stylesheet" href="css/footer-modern.min.css">
        <link rel="stylesheet" href="css/navbar-unified.min.css?v=20260804">

<!-- SEO:GENERATED -->
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="googlebot" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">

<link rel="canonical" href="{url}">
<link rel="stylesheet" href="/css/seo-components.css">

<meta property="og:locale" content="es_MX">
<meta property="og:type" content="article">
<meta property="og:site_name" content="WorldBrain México">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{image_url}">
<meta property="og:image:alt" content="{esc(meta['title'])}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(description)}">
<meta name="twitter:image" content="{image_url}">
<meta name="twitter:image:alt" content="{esc(meta['title'])}">

<meta property="article:published_time" content="{pub_date}">
<meta property="article:modified_time" content="{pub_date}">

<script type="application/ld+json">
{schema_json}
</script>
<!-- /SEO:GENERATED -->

</head>"""


NAVBAR = """<body>
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MWMFXQS7" height="0" width="0"
            style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->

    <!-- Skip to content -->
<a href="#main-content" class="nav-skip-link">Saltar al contenido</a>

<!-- Unified Pill Navbar -->
<nav class="nav-pill" role="navigation" aria-label="Navegaci&oacute;n principal">
    <a href="/" class="nav-pill-logo">World<span>Brain</span></a>

    <div class="nav-pill-links">
        <div class="nav-dropdown">
            <button class="nav-pill-link" aria-expanded="false" aria-haspopup="true">
                Cursos <i class="fas fa-chevron-down"></i>
            </button>
            <div class="nav-dropdown-menu" role="menu">
                <div>
                    <span class="dropdown-group-title">Ni&ntilde;os</span>
                    <a href="/fastkids" role="menuitem"><i class="fas fa-child"></i> FastKids</a>
                    <a href="/mathekids" role="menuitem"><i class="fas fa-calculator"></i> MatheKids</a>
                    <a href="/juniormath_v2" role="menuitem"><i class="fas fa-square-root-alt"></i> JuniorMath</a>
                    <a href="/lectoescritura" role="menuitem"><i class="fas fa-book-reader"></i> Lectoescritura</a>
                    <a href="/ciencia-astronomia" role="menuitem"><i class="fas fa-rocket"></i> Ciencia y Astronom&iacute;a</a>
                    <a href="/robotics" role="menuitem"><i class="fas fa-robot"></i> Robotics Code</a>
                    <a href="/homeschool" role="menuitem"><i class="fas fa-home"></i> Homeschool</a>
                </div>
                <div>
                    <span class="dropdown-group-title">J&oacute;venes y Adultos</span>
                    <a href="/fotolectura" role="menuitem"><i class="fas fa-bolt"></i> Fotolectura</a>
                    <a href="/memoria-prodigiosa" role="menuitem"><i class="fas fa-brain"></i> Memoria Prodigiosa</a>
                    <a href="/neurocomunicacion" role="menuitem"><i class="fas fa-comments"></i> Neurocomunicaci&oacute;n</a>
                    <a href="/grandes-lideres" role="menuitem"><i class="fas fa-users"></i> Grandes L&iacute;deres</a>
                    <a href="/redaccion-ejecutiva" role="menuitem"><i class="fas fa-pen-nib"></i> Redacci&oacute;n Ejecutiva</a>
                    <a href="/admision-universitaria" role="menuitem"><i class="fas fa-graduation-cap"></i> Admisi&oacute;n Universitaria</a>
                    <a href="/universidad-dominical" role="menuitem"><i class="fas fa-university"></i> Universidad Dominical</a>
                    <a href="/regularizacion-express" role="menuitem"><i class="fas fa-clipboard-check"></i> Regularizaci&oacute;n Express</a>
                    <a href="/alfa-cash" role="menuitem"><i class="fas fa-coins"></i> ALFA-CASH</a>
                </div>
            </div>
        </div>
        <a href="/#metodologia" class="nav-pill-link">Metodolog&iacute;a</a>
        <a href="/testimonios" class="nav-pill-link">Testimonios</a>
        <a href="/blog-index" class="nav-pill-link">Blog</a>
        <a href="/#contacto" class="nav-pill-cta">Contacto</a>
    </div>

    <button class="nav-pill-theme" id="navThemeToggle" aria-label="Cambiar tema claro/oscuro" title="Cambiar tema">
        <span class="icon-moon">&#x1F319;</span>
        <span class="icon-sun">&#x2600;&#xFE0F;</span>
    </button>

    <button class="nav-pill-hamburger" id="navHamburger" aria-label="Abrir men&uacute;" aria-expanded="false" aria-controls="navMobilePanel">
        <span></span>
        <span></span>
        <span></span>
    </button>
</nav>

<!-- Mobile Menu Panel -->
<div class="nav-mobile-overlay" id="navMobileOverlay"></div>
<div class="nav-mobile-panel" id="navMobilePanel" aria-hidden="true">
    <button class="nav-pill-link mobile-dropdown-toggle" id="mobileDropdownBtn" aria-expanded="false">
        Cursos <i class="fas fa-chevron-down" style="transition: transform 0.2s ease;"></i>
    </button>
    <div class="mobile-dropdown-content" id="mobileDropdownContent">
        <span class="dropdown-group-title">Ni&ntilde;os</span>
        <a href="/fastkids"><i class="fas fa-child"></i> FastKids</a>
        <a href="/mathekids"><i class="fas fa-calculator"></i> MatheKids</a>
        <a href="/juniormath_v2"><i class="fas fa-square-root-alt"></i> JuniorMath</a>
        <a href="/lectoescritura"><i class="fas fa-book-reader"></i> Lectoescritura</a>
        <a href="/ciencia-astronomia"><i class="fas fa-rocket"></i> Ciencia y Astronom&iacute;a</a>
        <a href="/robotics"><i class="fas fa-robot"></i> Robotics Code</a>
        <a href="/homeschool"><i class="fas fa-home"></i> Homeschool</a>
        <span class="dropdown-group-title">J&oacute;venes y Adultos</span>
        <a href="/fotolectura"><i class="fas fa-bolt"></i> Fotolectura</a>
        <a href="/memoria-prodigiosa"><i class="fas fa-brain"></i> Memoria Prodigiosa</a>
        <a href="/neurocomunicacion"><i class="fas fa-comments"></i> Neurocomunicaci&oacute;n</a>
        <a href="/grandes-lideres"><i class="fas fa-users"></i> Grandes L&iacute;deres</a>
        <a href="/redaccion-ejecutiva"><i class="fas fa-pen-nib"></i> Redacci&oacute;n Ejecutiva</a>
        <a href="/admision-universitaria"><i class="fas fa-graduation-cap"></i> Admisi&oacute;n Universitaria</a>
        <a href="/universidad-dominical"><i class="fas fa-university"></i> Universidad Dominical</a>
        <a href="/regularizacion-express"><i class="fas fa-clipboard-check"></i> Regularizaci&oacute;n Express</a>
        <a href="/alfa-cash"><i class="fas fa-coins"></i> ALFA-CASH</a>
    </div>
    <a href="/#metodologia" class="nav-pill-link">Metodolog&iacute;a</a>
    <a href="/testimonios" class="nav-pill-link">Testimonios</a>
    <a href="/blog-index" class="nav-pill-link">Blog</a>
    <a href="/#contacto" class="nav-pill-cta">Contacto</a>
</div>
"""


FOOTER_AND_SCRIPTS = """    <!-- Footer Unificado WorldBrain -->
<footer class="footer-modern" role="contentinfo">
    <div class="footer-content-wrapper">
        <div class="footer-cta-card">
            <div class="cta-content">
                <h2>Aprende a la velocidad de tu potencial</h2>
                <p>Agenda una clase muestra gratuita y descubre de lo que eres capaz.</p>
                <a href="https://wa.me/525578107837?text=Hola,%20quiero%20agendar%20una%20clase%20muestra" class="btn-cta-footer">
                    <i class="fab fa-whatsapp"></i> Agendar Clase Muestra
                </a>
            </div>
            <div class="footer-shape footer-shape-1"></div>
            <div class="footer-shape footer-shape-2"></div>
            <div class="footer-shape footer-shape-3"></div>
            <div class="footer-shape footer-shape-4"></div>
        </div>

        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand-col">
                    <div class="footer-brand-name">World<span>Brain</span></div>
                    <p class="footer-tagline">Pioneros en Neuroaprendizaje y Desarrollo Mental Acelerado desde 2000. Transformamos la manera en que Latinoam&eacute;rica aprende.</p>
                    <div class="footer-socials">
                        <a href="https://www.facebook.com/WorldBrainMx/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                        <a href="https://www.instagram.com/worldbrainmx1/" target="_blank" rel="noopener noreferrer" aria-label="Instagram Principal"><i class="fab fa-instagram"></i></a>
                        <a href="https://www.instagram.com/worldbrainmx/" target="_blank" rel="noopener noreferrer" aria-label="Instagram Cuautitl&aacute;n Izcalli"><i class="fab fa-instagram"></i></a>
                        <a href="https://x.com/WorldBrainMx" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)"><i class="fab fa-x-twitter"></i></a>
                        <a href="https://youtube.com/@worldbrainmexico" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
                        <a href="https://tiktok.com/@worldbrainmexico" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><i class="fab fa-tiktok"></i></a>
                    </div>
                </div>
                <div class="footer-col">
                    <h4>Ni&ntilde;os</h4>
                    <ul>
                        <li><a href="/fastkids">FastKids</a></li>
                        <li><a href="/mathekids">MatheKids</a></li>
                        <li><a href="/juniormath_v2">JuniorMath</a></li>
                        <li><a href="/lectoescritura">Lectoescritura</a></li>
                        <li><a href="/ciencia-astronomia">Ciencia y Astronom&iacute;a</a></li>
                        <li><a href="/robotics">Robotics Code</a></li>
                        <li><a href="/homeschool">Homeschool</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>J&oacute;venes y Adultos</h4>
                    <ul>
                        <li><a href="/fotolectura">Fotolectura</a></li>
                        <li><a href="/memoria-prodigiosa">Memoria Prodigiosa</a></li>
                        <li><a href="/neurocomunicacion">Neurocomunicaci&oacute;n</a></li>
                        <li><a href="/grandes-lideres">Grandes L&iacute;deres</a></li>
                        <li><a href="/redaccion-ejecutiva">Redacci&oacute;n Ejecutiva</a></li>
                        <li><a href="/admision-universitaria">Admisi&oacute;n Universitaria</a></li>
                        <li><a href="/universidad-dominical">Universidad Dominical</a></li>
                        <li><a href="/regularizacion-express">Regularizaci&oacute;n Express</a></li>
                        <li><a href="/alfa-cash">ALFA-CASH</a></li>
                    </ul>
                </div>
                <div class="footer-col footer-contact-col">
                    <h4>Contacto</h4>
                    <div class="contact-item">
                        <i class="fas fa-phone"></i>
                        <a href="tel:+525578107837">+52 (55) 7810-7837</a>
                    </div>
                    <div class="contact-item">
                        <i class="fab fa-whatsapp"></i>
                        <a href="https://wa.me/525578107837">WhatsApp</a>
                    </div>
                    <div class="contact-item">
                        <i class="fas fa-envelope"></i>
                        <a href="mailto:contacto@ultravelozmente.com">contacto@ultravelozmente.com</a>
                    </div>
                    <div class="contact-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>Cuautitl&aacute;n Izcalli, Edo. de M&eacute;x.</span>
                    </div>
                    <ul style="margin-top: 16px; padding: 0; list-style: none;">
                        <li style="margin-bottom: 10px;"><a href="/blog-index">Blog Educativo</a></li>
                        <li><a href="/testimonios">Testimonios</a></li>
                    </ul>
                </div>
            </div>

            <div class="footer-bottom-bar">
                <p class="footer-legal-text">CWBMX, S.C. | RFC: CWB170626UH4 | Domicilio: Av. 1 de Mayo, Mz-C24B, Loc 282-283, Col. Centro Urbano, Cuautitl&aacute;n Izcalli, Edo. de M&eacute;x., C.P. 54700.</p>
                <p class="footer-copyright">&copy; 2026 WorldBrain M&eacute;xico. Todos los derechos reservados.</p>
                <div class="footer-legal-links">
                    <a href="/terminos">T&eacute;rminos y Condiciones</a>
                    <a href="/privacidad">Aviso de Privacidad</a>
                    <a href="/reembolsos">Pol&iacute;ticas de Devoluci&oacute;n</a>
                </div>
            </div>
        </div>
    </div>
</footer>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script>
        AOS.init({ duration: 800, once: true, offset: 50 });
        const hamburger = document.getElementById('hamburger');
        const navLinks = document.getElementById('navLinks');
        if (hamburger && navLinks) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navLinks.classList.toggle('active');
            });
        }
    </script>
    <script src="js/param-builder-client.min.js" defer></script>
    <script src="js/tracking.min.js" defer></script>
    <script src="js/blog-article.js" defer></script>
    <script src="js/navbar.min.js?v=20260804" defer></script>
    </body>

</html>
"""


def render_section_html(section: dict) -> str:
    parts = [f"            <h2>{section['heading']}</h2>"]
    for p in section.get("paragraphs", []):
        parts.append(f"            <p>{p}</p>")
    if section.get("bullets"):
        parts.append("            <ul>")
        for b in section["bullets"]:
            parts.append(f"                <li>{b}</li>")
        parts.append("            </ul>")
    if section.get("steps"):
        parts.append("            <ol>")
        for s in section["steps"]:
            parts.append(f"                <li>{s}</li>")
        parts.append("            </ol>")
    return "\n".join(parts)


def render_body(meta: dict, post: dict, wc: int) -> str:
    course_href = meta["course_url"]
    pub_date_es = fmt_date_es(meta["publication_date"])
    minutes = reading_minutes(wc)

    sections_html = "\n\n".join(render_section_html(s) for s in post["sections"])

    faq_items = "\n".join(
        f"""            <!-- SEO:FAQ:START -->
            <div class="ed-faq-item">
                <h4>{qa['question']}</h4>
                <p>{qa['answer']}</p>
            </div>
            <!-- SEO:FAQ:END -->"""
        for qa in post["faq"]
    )

    sources_items = "\n".join(
        f'                <li><a href="{s["url"]}" target="_blank" rel="noopener noreferrer">{s["name"]}</a> — {s["note"]}</li>'
        for s in post["sources"]
    )

    lead_paragraphs = "\n".join(f'            <p class="lead" style="font-size: 1.3rem; color: var(--text-color); font-weight: 500;">{p}</p>' for p in post["lead"][:1])
    extra_lead = "\n".join(f"            <p>{p}</p>" for p in post["lead"][1:])

    return f"""{NAVBAR}
    <main id="main-content" role="main" style="background: var(--bg-body);">
        <div class="ed-progress" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" aria-label="Progreso de lectura"><div class="ed-progress-bar"></div></div>
        <div class="ed-article-toolbar"><a class="ed-back-link" href="/blog-index" aria-label="Volver al blog">Volver al blog</a><button data-bookmark aria-pressed="false" aria-label="Guardar artículo">♡ Guardar</button><button class="ed-share-btn" aria-label="Compartir artículo">Compartir</button></div>

        <header class="blog-post-hero">
            <div class="container blog-post-header">
                <span class="badge" data-aos="fade-down" style="margin-bottom: 1.5rem;">
                    <i class="fas {meta['icon']}"></i> {meta['category']}
                </span>
                <h1 class="blog-post-title" data-aos="fade-up">{meta['title']}</h1>

                <div class="blog-post-meta" data-aos="fade-up" data-aos-delay="100">
                    <span><i class="far fa-calendar"></i> {pub_date_es}</span>
                    <span><i class="far fa-clock"></i> {minutes} minutos de lectura</span>
                    <span><i class="far fa-user"></i> Equipo Editorial WorldBrain</span>
                </div>
            </div>
        </header>

        <div class="blog-post-cover" data-aos="zoom-in" data-aos-delay="200">
            <img src="{meta['image']}" alt="{meta['title']}">
        </div>

        <article class="blog-content">
{lead_paragraphs}
{extra_lead}

            <div class="ed-quick-answer" data-aos="fade-up">
                <h3><i class="fas fa-bolt"></i> Respuesta rápida</h3>
                <p>{post['quick_answer']}</p>
            </div>

{sections_html}

            <div class="blog-cta-box" data-aos="fade-up">
                <h3>{post['cta']['heading']}</h3>
                <p>{post['cta']['text']}</p>
                <a href="{course_href}" class="btn-primary" style="font-size: 1.1rem; padding: 1rem 2rem;">
                    {post['cta']['label']} <i class="fas fa-arrow-right"></i>
                </a>
            </div>

            <h2>Preguntas frecuentes</h2>
            <div class="ed-faq-list">
{faq_items}
            </div>

            <h2>Fuentes consultadas</h2>
            <ul class="ed-sources-list">
{sources_items}
            </ul>

            <div class="blog-author">
                <div class="avatar-initials" data-hue="2" aria-hidden="true">ET</div>
                <div class="blog-author-info">
                    <h4>Equipo Editorial WorldBrain</h4>
                    <p>Contenido educativo revisado por el equipo editorial de WorldBrain México, especializado en aprendizaje acelerado y desarrollo académico.</p>
                </div>
            </div>
        </article>

    </main>

{FOOTER_AND_SCRIPTS}"""


if __name__ == "__main__":
    import sys

    plan = load_plan()
    content = load_content()
    missing = sorted(set(plan) - set(content))
    print(f"Plan: {len(plan)} posts. Contenido cargado: {len(content)} posts.")
    if missing:
        print(f"Faltan en contenido: {missing}")
        sys.exit(1)

    def render_post(post_id: int) -> str:
        meta = plan[post_id]
        post = content[post_id]
        wc = word_count_of(post)
        head = render_head(meta, post)
        body = render_body(meta, post, wc)
        return head + "\n" + body

    if "--test" in sys.argv:
        # Dry-run: solo renderiza el post 1 a stdout, no escribe archivos.
        html = render_post(1)
        print(f"\n--- PREVIEW post 1 ({len(html)} chars) ---\n")
        print(html[:3000])
        print("\n--- (truncado) ---")
        sys.exit(0)

    written = []
    for post_id in sorted(plan):
        meta = plan[post_id]
        html = render_post(post_id)
        out_path = OUT_DIR / f"blog-{meta['slug']}.html"
        out_path.write_text(html, encoding="utf-8")
        written.append(out_path.name)

    print(f"\nEscritos {len(written)} archivos HTML en {OUT_DIR}:")
    for name in written:
        print(f"  {name}")
