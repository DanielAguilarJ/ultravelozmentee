'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..', '..');
const GENERATED_START = '<!-- COURSE FAQ SCHEMA:START -->';
const GENERATED_END = '<!-- COURSE FAQ SCHEMA:END -->';

const FAQ_CONFIG = {
    'admision-universitaria.html': { selector: '#faq details' },
    'alfa-cash.html': { selector: '#preguntas details' },
    'ciencia-astronomia.html': { selector: '#preguntas details' },
    'comipems.html': { selector: '#faq details' },
    'diplomado-matematicas-fisica.html': { selector: '#faq details' },
    'fastkids.html': { selector: '#faq details' },
    'fotolectura.html': { selector: '#faq details' },
    'grandes-lideres.html': {
        selector: '#faq .gl-acc-item',
        questionSelector: '.gl-acc-btn span:first-child',
        answerSelector: '.gl-acc-body'
    },
    'homeschool.html': { selector: '#faq details' },
    'juniormath_v2.html': { selector: '#faq details' },
    'lectoescritura.html': { selector: '#faq details' },
    'mathekids.html': { selector: '#faq details' },
    'memoria-prodigiosa.html': { selector: 'details.rv' },
    'neurocomunicacion.html': { selector: '#faq details' },
    'redaccion-ejecutiva.html': { selector: '#faq details' },
    'regularizacion-express.html': { selector: '#faq details' },
    'robotics.html': { selector: '.faq details' },
    'universidad-dominical.html': { selector: '#faq details' }
};

const NEW_FAQ_SECTIONS = {
    'neurocomunicacion.html': {
        before: '    <!-- Booking Section -->',
        html: `    <!-- COURSE FAQ CONTENT:START -->
    <section id="faq" style="padding: 80px 0; background: var(--nc-bg);" aria-labelledby="nc-faq-title">
        <div class="container">
            <div style="text-align: center; max-width: 800px; margin: 0 auto 48px;" data-aos="fade-up">
                <h2 id="nc-faq-title" style="font-family: 'Outfit'; font-size: 3rem; margin-bottom: 16px;">Preguntas <span class="nc-gradient-text">frecuentes</span></h2>
                <p style="color: var(--nc-text-muted); font-size: 1.1rem;">Respuestas concretas antes de elegir el programa.</p>
            </div>
            <div style="display: grid; gap: 16px; max-width: 900px; margin: 0 auto;">
                <details class="seo-faq-item nc-card" style="padding: 24px;" open>
                    <summary style="cursor: pointer; font-weight: 700; font-size: 1.1rem;">¿Para quién está dirigido el curso de Neurocomunicación?</summary>
                    <div class="seo-faq-answer" style="color: var(--nc-text-muted); margin-top: 14px;"><p>Está dirigido a adultos y profesionales que buscan fortalecer su comunicación, liderazgo e inteligencia emocional en contextos laborales y personales.</p></div>
                </details>
                <details class="seo-faq-item nc-card" style="padding: 24px;">
                    <summary style="cursor: pointer; font-weight: 700; font-size: 1.1rem;">¿Qué temas trabaja el programa?</summary>
                    <div class="seo-faq-answer" style="color: var(--nc-text-muted); margin-top: 14px;"><p>El programa presenta seis pilares: neurocomunicación, liderazgo exponencial, multiinteligencias, inteligencia financiera, maestría emocional e innovación disruptiva.</p></div>
                </details>
                <details class="seo-faq-item nc-card" style="padding: 24px;">
                    <summary style="cursor: pointer; font-weight: 700; font-size: 1.1rem;">¿El curso aborda el miedo a hablar en público?</summary>
                    <div class="seo-faq-answer" style="color: var(--nc-text-muted); margin-top: 14px;"><p>Sí. Entre los objetivos del programa están comunicar ideas con claridad, desarrollar presencia y trabajar el miedo escénico. El avance depende de la práctica de cada participante.</p></div>
                </details>
                <details class="seo-faq-item nc-card" style="padding: 24px;">
                    <summary style="cursor: pointer; font-weight: 700; font-size: 1.1rem;">¿Cómo se confirman modalidad, fechas y costos?</summary>
                    <div class="seo-faq-answer" style="color: var(--nc-text-muted); margin-top: 14px;"><p>La modalidad disponible, las fechas de inicio y el costo se confirman por escrito durante la sesión estratégica, antes de completar la inscripción.</p></div>
                </details>
                <details class="seo-faq-item nc-card" style="padding: 24px;">
                    <summary style="cursor: pointer; font-weight: 700; font-size: 1.1rem;">¿Puedo hablar con un asesor antes de inscribirme?</summary>
                    <div class="seo-faq-answer" style="color: var(--nc-text-muted); margin-top: 14px;"><p>Sí. La página permite agendar una sesión estratégica para revisar el perfil del participante, resolver dudas y conocer la ruta de estudio propuesta.</p></div>
                </details>
            </div>
        </div>
    </section>
    <!-- COURSE FAQ CONTENT:END -->

`
    },
    'redaccion-ejecutiva.html': {
        before: '    <!-- ============================================\n         GUARANTEE',
        html: `    <!-- COURSE FAQ CONTENT:START -->
    <section id="faq" class="py-24 bg-black relative" aria-labelledby="re-faq-title">
        <div class="re-container">
            <div style="text-align: center; max-width: 800px; margin: 0 auto 48px;">
                <span class="re-pretitle">Antes de inscribirte</span>
                <h2 id="re-faq-title" class="re-title">Preguntas frecuentes sobre <span class="re-gradient-text">Redacción Ejecutiva</span></h2>
            </div>
            <div style="display: grid; gap: 16px; max-width: 900px; margin: 0 auto;">
                <details class="seo-faq-item" style="padding: 24px; border: 1px solid rgba(255,255,255,.12); border-radius: 16px; background: rgba(255,255,255,.04);" open>
                    <summary style="cursor: pointer; color: #fff; font-weight: 700; font-size: 1.1rem;">¿Qué documentos se trabajan en el curso?</summary>
                    <div class="seo-faq-answer" style="color: #9ca3af; margin-top: 14px;"><p>El curso se enfoca en correos, informes, minutas y propuestas profesionales para mejorar su claridad, estructura y corrección ortográfica.</p></div>
                </details>
                <details class="seo-faq-item" style="padding: 24px; border: 1px solid rgba(255,255,255,.12); border-radius: 16px; background: rgba(255,255,255,.04);">
                    <summary style="cursor: pointer; color: #fff; font-weight: 700; font-size: 1.1rem;">¿El programa es solamente de ortografía?</summary>
                    <div class="seo-faq-answer" style="color: #9ca3af; margin-top: 14px;"><p>No. Además de ortografía, trabaja diagnóstico de hábitos de redacción, estructura del mensaje y recursos para comunicar propuestas con precisión.</p></div>
                </details>
                <details class="seo-faq-item" style="padding: 24px; border: 1px solid rgba(255,255,255,.12); border-radius: 16px; background: rgba(255,255,255,.04);">
                    <summary style="cursor: pointer; color: #fff; font-weight: 700; font-size: 1.1rem;">¿Cuáles son los módulos del curso?</summary>
                    <div class="seo-faq-answer" style="color: #9ca3af; margin-top: 14px;"><p>La página presenta tres módulos: Diagnóstico de Impacto, Estructura de Poder y Persuasión Neuro-Lingüística.</p></div>
                </details>
                <details class="seo-faq-item" style="padding: 24px; border: 1px solid rgba(255,255,255,.12); border-radius: 16px; background: rgba(255,255,255,.04);">
                    <summary style="cursor: pointer; color: #fff; font-weight: 700; font-size: 1.1rem;">¿A quién está dirigido Redacción Ejecutiva?</summary>
                    <div class="seo-faq-answer" style="color: #9ca3af; margin-top: 14px;"><p>Está dirigido a profesionales que necesitan escribir mensajes de trabajo con mayor claridad, desde instrucciones y correos hasta informes y propuestas.</p></div>
                </details>
                <details class="seo-faq-item" style="padding: 24px; border: 1px solid rgba(255,255,255,.12); border-radius: 16px; background: rgba(255,255,255,.04);">
                    <summary style="cursor: pointer; color: #fff; font-weight: 700; font-size: 1.1rem;">¿Cómo solicito información antes de comprar?</summary>
                    <div class="seo-faq-answer" style="color: #9ca3af; margin-top: 14px;"><p>Puedes solicitar por WhatsApp los detalles vigentes de acceso, modalidad y condiciones antes de realizar el pago.</p></div>
                </details>
            </div>
        </div>
    </section>
    <!-- COURSE FAQ CONTENT:END -->

`
    }
};

function normalize(value) {
    return value.replace(/\s+/g, ' ').trim();
}

function courseFiles() {
    return fs.readdirSync(ROOT)
        .filter(file => file.endsWith('.html'))
        .filter(file => /"@type"\s*:\s*"Course"/.test(
            fs.readFileSync(path.join(ROOT, file), 'utf8')
        ))
        .sort();
}

function stripGeneratedSchema(html) {
    const pattern = new RegExp(`\\s*${GENERATED_START}[\\s\\S]*?${GENERATED_END}\\s*`, 'g');
    return html.replace(pattern, '\n');
}

function ensureNewFaqSection(file, html) {
    if (file === 'robotics.html') {
        const oldDescription = 'Curso de robótica y programación para niños y adolescentes con Scratch, Python, Arduino e introducción a inteligencia artificial.';
        const localDescription = 'Curso de robótica y programación para niños y adolescentes con Scratch, Python y Arduino. Clases en Cuautitlán Izcalli y en línea.';
        html = html.split(oldDescription).join(localDescription);

        const oldLocations = `    <h2 class="title rv">Nodos <span class="g">activos</span></h2>
    <div class="nodes">
      <div class="node rv"><span class="st">ONLINE</span><h3>Cuautitlán Izcalli</h3><p>Sede central con laboratorio de robótica completo. Formación STEAM.</p></div>
      <div class="node rv"><span class="st">ONLINE</span><h3>CDMX</h3><p>Clases de robótica y programación en la capital. Zona Metropolitana.</p></div>
      <div class="node rv"><span class="st">ONLINE</span><h3>Estado de México</h3><p>Cobertura en municipios del EdoMex. Zona Norte.</p></div>
    </div>`;
        const localLocations = `    <h2 class="title rv">Clases de robótica en <span class="g">Cuautitlán Izcalli</span> y en línea</h2>
    <div class="nodes">
      <div class="node rv"><span class="st">PRESENCIAL</span><h3>Cuautitlán Izcalli</h3><p>Sede central con laboratorio de robótica completo para niños y adolescentes.</p></div>
      <div class="node rv"><span class="st">EN LÍNEA</span><h3>Ciudad de México</h3><p>Clases de robótica y programación en vivo para familias de CDMX.</p></div>
      <div class="node rv"><span class="st">EN LÍNEA</span><h3>Estado de México</h3><p>Cobertura en línea para municipios del Estado de México y el resto del país.</p></div>
    </div>`;
        if (!html.includes(localLocations)) {
            if (!html.includes(oldLocations)) throw new Error(`${file}: no se encontró el bloque local original`);
            html = html.replace(oldLocations, localLocations);
        }

        const ageFaq = `      <details name="faq">
        <summary>¿Qué curso de robótica para niños corresponde a cada edad?</summary>
        <p>Robotics Kids (7-10 años) con LEGO y Scratch, Robotics Junior (11-14 años) con Arduino y Python básico, y Robotics Pro (15-17 años) con IA y Python avanzado.</p>
      </details>`;
        const localFaq = `      <details name="faq">
        <summary>¿Dónde hay clases de robótica para niños en Cuautitlán Izcalli?</summary>
        <p>WorldBrain ofrece clases presenciales de robótica para niños y adolescentes en su sede de Cuautitlán Izcalli, Estado de México. También hay clases en línea en vivo para familias de otras zonas; la disponibilidad de grupos y horarios se confirma antes de la inscripción.</p>
      </details>`;
        if (!html.includes('¿Dónde hay clases de robótica para niños en Cuautitlán Izcalli?</summary>')) {
            if (!html.includes(ageFaq)) throw new Error(`${file}: no se encontró la FAQ de edades`);
            html = html.replace(ageFaq, `${ageFaq}\n${localFaq}`);
        }
    }

    const section = NEW_FAQ_SECTIONS[file];
    if (!section || html.includes('COURSE FAQ CONTENT:START')) return html;
    if (!html.includes(section.before)) {
        throw new Error(`${file}: no se encontró el punto de inserción de la FAQ`);
    }
    return html.replace(section.before, `${section.html}${section.before}`);
}

function applyEdits(html, edits) {
    return edits
        .sort((a, b) => b.start - a.start)
        .reduce((out, edit) => out.slice(0, edit.start) + edit.text + out.slice(edit.end), html);
}

function addFaqAuditClasses(file, html, config) {
    const dom = new JSDOM(html, { includeNodeLocations: true });
    const document = dom.window.document;
    const items = [...document.querySelectorAll(config.selector)];
    if (items.length < 4) {
        throw new Error(`${file}: el selector ${config.selector} encontró ${items.length} FAQ`);
    }

    const edits = [];
    for (const item of items) {
        if (item.classList.contains('seo-faq-item')) continue;
        const location = dom.nodeLocation(item);
        const startTag = html.slice(location.startTag.startOffset, location.startTag.endOffset);
        let updated;
        if (/\bclass="[^"]*"/.test(startTag)) {
            updated = startTag.replace(/\bclass="([^"]*)"/, (_, classes) =>
                `class="${classes} seo-faq-item"`
            );
        } else {
            updated = startTag.replace(/>$/, ' class="seo-faq-item">');
        }
        edits.push({
            start: location.startTag.startOffset,
            end: location.startTag.endOffset,
            text: updated
        });
    }
    return applyEdits(html, edits);
}

function extractFaqs(file, html, config) {
    const document = new JSDOM(html).window.document;
    const items = [...document.querySelectorAll(config.selector)];
    return items.map((item, index) => {
        let question;
        let answer;
        if (config.questionSelector) {
            question = item.querySelector(config.questionSelector)?.textContent || '';
            answer = item.querySelector(config.answerSelector)?.textContent || '';
        } else {
            question = item.querySelector('summary')?.textContent || '';
            const answerClone = item.cloneNode(true);
            answerClone.querySelector('summary')?.remove();
            answer = answerClone.textContent || '';
        }
        question = normalize(question);
        answer = normalize(answer);
        if (!question || !answer) {
            throw new Error(`${file}: FAQ ${index + 1} no tiene pregunta y respuesta completas`);
        }
        return { question, answer };
    });
}

function removeEmbeddedFaqPages(file, html) {
    const dom = new JSDOM(html, { includeNodeLocations: true });
    const scripts = [...dom.window.document.querySelectorAll('script[type="application/ld+json"]')];
    const edits = [];

    for (const script of scripts) {
        let data;
        try {
            data = JSON.parse(script.textContent);
        } catch {
            continue;
        }

        const location = dom.nodeLocation(script);
        if (data && data['@type'] === 'FAQPage') {
            edits.push({ start: location.startOffset, end: location.endOffset, text: '' });
            continue;
        }

        if (!Array.isArray(data?.['@graph'])) continue;
        const graph = data['@graph'].filter(node => node?.['@type'] !== 'FAQPage');
        if (graph.length === data['@graph'].length) continue;

        const updated = { ...data, '@graph': graph };
        edits.push({
            start: location.startTag.endOffset,
            end: location.endTag.startOffset,
            text: `\n${JSON.stringify(updated, null, 4)}\n    `
        });
    }

    const result = applyEdits(html, edits);
    if (result.includes('"@type": "FAQPage"')) {
        throw new Error(`${file}: quedó un FAQPage anterior sin retirar`);
    }
    return result;
}

function canonicalUrl(file, html) {
    const document = new JSDOM(html).window.document;
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    if (!canonical) throw new Error(`${file}: falta URL canónica`);
    return canonical;
}

function appendSchema(file, html, faqs) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': `${canonicalUrl(file, html)}#faq`,
        mainEntity: faqs.map(({ question, answer }) => ({
            '@type': 'Question',
            name: question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: answer
            }
        }))
    };
    const block = `${GENERATED_START}\n<script type="application/ld+json">\n${JSON.stringify(schema, null, 4)}\n</script>\n${GENERATED_END}\n`;
    if (!html.includes('</head>')) throw new Error(`${file}: falta </head>`);
    return html.replace('</head>', `${block}</head>`);
}

function syncFile(file) {
    const fullPath = path.join(ROOT, file);
    const original = fs.readFileSync(fullPath, 'utf8');
    const config = FAQ_CONFIG[file];
    let html = stripGeneratedSchema(original);
    html = ensureNewFaqSection(file, html);
    html = addFaqAuditClasses(file, html, config);
    const faqs = extractFaqs(file, html, config);
    html = removeEmbeddedFaqPages(file, html);
    html = appendSchema(file, html, faqs);
    if (html !== original) fs.writeFileSync(fullPath, html);
    return { changed: html !== original, faqCount: faqs.length };
}

function main() {
    const files = courseFiles();
    const missingConfig = files.filter(file => !FAQ_CONFIG[file]);
    const staleConfig = Object.keys(FAQ_CONFIG).filter(file => !files.includes(file));
    if (missingConfig.length || staleConfig.length) {
        throw new Error(`configuración FAQ desalineada; faltan: ${missingConfig.join(', ') || '-'}; sobran: ${staleConfig.join(', ') || '-'}`);
    }

    let changed = 0;
    let questions = 0;
    for (const file of files) {
        const result = syncFile(file);
        if (result.changed) changed++;
        questions += result.faqCount;
    }
    console.log(`FAQ de cursos sincronizadas: ${files.length} páginas, ${questions} preguntas, ${changed} archivos actualizados.`);
}

main();
