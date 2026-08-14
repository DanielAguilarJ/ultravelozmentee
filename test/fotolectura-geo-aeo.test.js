'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const LANDING_PATH = path.join(ROOT, 'fotolectura.html');
const HOME_PATH = path.join(ROOT, 'index.html');
const ARTICLE_PATH = path.join(ROOT, 'blog-fotolectura-que-es-como-funciona.html');
const CONTENT_PATH = path.join(ROOT, 'content', 'posts', 'batch-01-10.json');

const landingHtml = fs.readFileSync(LANDING_PATH, 'utf8');
const landingDocument = new JSDOM(landingHtml).window.document;

function normalize(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function jsonLdNodes(document) {
    return [...document.querySelectorAll('script[type="application/ld+json"]')]
        .flatMap(script => {
            const data = JSON.parse(script.textContent);
            return data['@graph'] || [data];
        });
}

function getNode(type) {
    return jsonLdNodes(landingDocument).find(node => {
        const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
        return types.includes(type);
    });
}

function correctOptionText(questionName, answerValue) {
    const input = landingDocument.querySelector(
        `#fxQuiz input[name="${questionName}"][value="${answerValue}"]`
    );
    assert.ok(input, `falta la opción correcta ${questionName}=${answerValue}`);
    return normalize(input.closest('label').textContent);
}

test('la respuesta inicial explica cómo elegir sin autoproclamarse el mejor curso', () => {
    const h1 = normalize(landingDocument.querySelector('h1')?.textContent);
    assert.match(h1, /curso de lectura rápida y Fotolectura/i);

    const section = landingDocument.querySelector('#como-elegir');
    assert.ok(section, 'falta la respuesta directa #como-elegir');
    const text = normalize(section.textContent);
    assert.match(text, /¿cuál es el mejor curso de lectura rápida\?/i);
    assert.match(text, /no existe un mejor curso universal/i);

    for (const criterion of ['comprensión', 'instructor', 'tamaño del grupo', 'temario', 'precio']) {
        assert.match(text, new RegExp(criterion, 'i'), `falta el criterio: ${criterion}`);
    }
});

test('la landing y la portada retiran métricas y resultados sin evidencia', () => {
    const homeHtml = fs.readFileSync(HOME_PATH, 'utf8');
    const prohibited = [
        /4\.9\/5/i,
        /2[,.]847\s+reseñas/i,
        /\+5[,.]000\s+alumnos/i,
        /30\s+años\s+enseñando/i,
        /\+200[,.]000\s+egresados/i,
        /3\s*[–-]\s*10\s*[×x]/i,
        /la mayoría[^.]{0,80}duplica/i,
        /duplica o triplica/i,
        /varios miles de palabras por minuto/i,
        /garantía de satisfacción/i,
        /Instituto de Neurociencia Cognitiva de Londres/i,
        /Richard Bandler/i,
        /Google, Microsoft y Tesla/i,
        /la información se duplica cada dieciocho meses/i,
        /300 páginas en 30 minutos/i,
        /un libro de 300 páginas/i,
        /Carlos Méndez/i,
    ];

    for (const pattern of prohibited) {
        assert.doesNotMatch(landingHtml, pattern, `claim prohibido en Fotolectura: ${pattern}`);
        assert.doesNotMatch(homeHtml, pattern, `claim prohibido en portada: ${pattern}`);
    }

    assert.match(landingHtml, /Texto de referencia: 90,000 palabras/i);
    assert.match(
        landingHtml,
        /Para un texto de 90,000 palabras, la estimación es[^.]+\. No predice tu resultado\./i,
    );
});

test('la portada no usa autoridad, eficacia, precios ni garantías sin respaldo', () => {
    const homeHtml = fs.readFileSync(HOME_PATH, 'utf8');
    const homeDocument = new JSDOM(homeHtml).window.document;
    const visible = normalize(homeDocument.body.textContent);
    const prohibitedVisible = [
        /treinta años|30\+?\s*años|desde hace 30 años/i,
        /200[,.]000\+?\s*(graduados|veces)/i,
        /97%\s*tasa de éxito/i,
        /resultados medibles desde la primera sesión/i,
        /reconocidos en/i,
        /integración de hemisferios|musicoterapia|aromaterapia|ludoterapia/i,
        /beneficios educativos comprobados/i,
        /certificación oficial SEP/i,
        /90 operaciones en 6 minutos/i,
        /comprensión total/i,
        /8 semanas\s*promedio de transformación/i,
        /recordar sin esfuerzo|para siempre/i,
        /diagnóstico neuro-cognitivo/i,
        /valor\s*\$\s*(1[,.]500|800|500)/i,
        /garantía\s*100%|garantía de resultados|devolvemos el 100%/i,
        /transformación real y medible/i,
        /cuarenta y cinco minutos|menos de 5 minutos/i,
    ];
    const prohibitedSource = [
        /del "no puedo" al "mira esto, mamá" en 90 días/i,
        /estrategia probada/i,
        /recupera calificaciones/i,
        /mnemotecnia de campeones/i,
    ];

    for (const pattern of prohibitedVisible) {
        assert.doesNotMatch(visible, pattern, `claim visible no respaldado en portada: ${pattern}`);
    }
    for (const pattern of prohibitedSource) {
        assert.doesNotMatch(homeHtml, pattern, `claim dinámico no respaldado en portada: ${pattern}`);
    }

    assert.match(visible, /desde 2000/i);
    assert.match(visible, /máx(?:imo)?\.?\s*7/i);
    assert.match(visible, /17 programas/i);
});

test('publica datos operativos verificables y transparenta los que faltan', () => {
    const facts = landingDocument.querySelector('#datos-curso');
    assert.ok(facts, 'falta #datos-curso');
    const text = normalize(facts.textContent);

    assert.match(text, /WorldBrain[^.]{0,80}desde 2000/i);
    assert.match(text, /máximo de 7 participantes/i);
    assert.match(text, /duración[^.]{0,100}se confirma por generación/i);
    assert.match(text, /no publica una tarifa vigente/i);
    assert.match(text, /modalidad[^.]{0,100}se confirma por generación/i);

    const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', '_data', 'site.json'), 'utf8'));
    assert.equal(site.foundedYear, 2000);
    assert.equal(site.method.maxGroupSize, 7);
});

test('expone temario, público, límites, medición e información honesta del instructor', () => {
    const program = landingDocument.querySelector('#programa');
    assert.ok(program, 'falta #programa');
    const programText = normalize(program.textContent);
    for (const topic of [
        'Diagnóstico de velocidad y comprensión',
        'Propósito y vista previa',
        'Lectura por bloques',
        'Activación y lectura selectiva',
        'Retención y plan de práctica',
    ]) {
        assert.match(programText, new RegExp(topic, 'i'), `falta tema: ${topic}`);
    }

    const fit = normalize(landingDocument.querySelector('#para-quien')?.textContent);
    assert.match(fit, /adolescentes y adultos/i);
    assert.match(fit, /no sustituye/i);
    assert.match(fit, /dificultad de lectura[^.]{0,120}especialista/i);

    const results = normalize(landingDocument.querySelector('#resultados-realistas')?.textContent);
    assert.match(results, /velocidad y comprensión/i);
    assert.match(results, /no garantiza/i);
    assert.match(results, /condiciones comparables/i);

    const instructor = normalize(landingDocument.querySelector('#instructor')?.textContent);
    assert.match(instructor, /no publica todavía[^.]{0,100}perfil individual verificable/i);
    assert.match(instructor, /solicita por escrito el nombre y la experiencia/i);
});

test('distingue técnicas útiles de promesas no respaldadas y enlaza recursos de apoyo', () => {
    const evidence = normalize(landingDocument.querySelector('#evidencia')?.textContent);
    assert.match(evidence, /no hay evidencia sólida/i);
    assert.match(evidence, /memoria fotográfica|procesamiento subliminal/i);
    assert.match(evidence, /lectura profunda/i);

    const expectedLinks = [
        '/blog-fotolectura-que-es-como-funciona',
        '/blog-leer-rapido-sin-perder-comprension',
        '/blog-tecnicas-lectura-estudiantes',
        '/blog-ejercicios-lectura-rapida-comprension',
    ];
    const hrefs = new Set([...landingDocument.querySelectorAll('a[href]')]
        .map(link => link.getAttribute('href')));
    for (const href of expectedLinks) {
        assert.ok(hrefs.has(href), `falta enlace interno a ${href}`);
    }
});

test('no atribuye testimonios de Fotolectura sin evidencia y consentimiento', () => {
    assert.equal(landingDocument.querySelectorAll('#evidencia-testimonios blockquote').length, 0);
    const text = normalize(landingDocument.querySelector('#evidencia-testimonios')?.textContent);
    assert.match(text, /no hay testimonios de Fotolectura con evidencia y consentimiento/i);
    assert.match(text, /no atribuimos resultados a alumnos/i);
});

test('el test usa un caso ficticio neutral, preguntas coherentes y conteo real', () => {
    const reading = landingDocument.querySelector('.fx-reading');
    assert.ok(reading, 'falta el texto del test');
    const readingText = normalize(reading.textContent);
    assert.match(readingText, /caso hipotético/i);
    assert.match(readingText, /sirve únicamente para medir comprensión/i);
    assert.doesNotMatch(readingText, /neurociencia|hemisferio|preconsciente|Tesla|memoria fotográfica/i);

    const expected = {
        q1: ['¿Durante cuánto tiempo observó el equipo el uso de la biblioteca?', 'Cuatro semanas'],
        q2: ['¿En qué horario se registró la mayor demanda?', 'Al final de la tarde'],
        q3: ['¿Cómo se reorganizaron los materiales?', 'Por temas y niveles de dificultad'],
        q4: ['¿Qué dato no guardaba el registro de préstamos?', 'El historial personal de lectura'],
        q5: ['¿Para qué se creó la zona silenciosa?', 'Para lectura que requiere concentración'],
        q6: ['¿Qué practicaban los talleres breves?', 'Cómo comparar y evaluar fuentes'],
        q7: ['¿Qué indicador era insuficiente por sí solo?', 'El número total de visitas'],
        q8: ['¿Qué decidió hacer el equipo al final?', 'Revisar los cambios con nuevas mediciones'],
    };
    const answerMatch = landingHtml.match(/var ANSWERS = \{([^}]+)\}/);
    assert.ok(answerMatch, 'falta ANSWERS');
    const answers = Object.fromEntries(
        [...answerMatch[1].matchAll(/(q\d+)\s*:\s*'([a-d])'/g)].map(match => [match[1], match[2]])
    );
    assert.deepEqual(Object.keys(answers).sort(), Object.keys(expected));

    for (const [name, [question, option]] of Object.entries(expected)) {
        const visibleQuestion = normalize(
            landingDocument.querySelector(`#fxQuiz .fx-q[data-q="${name}"] .fx-q-text`)?.textContent
        );
        assert.equal(visibleQuestion, question);
        assert.equal(correctOptionText(name, answers[name]), option);
    }

    const paragraphs = [...reading.querySelectorAll('p')].map(p => normalize(p.textContent)).join(' ');
    const actualWordCount = paragraphs.split(/\s+/).filter(Boolean).length;
    const configuredWordCount = Number(landingHtml.match(/var WORD_COUNT = (\d+);/)?.[1]);
    assert.equal(configuredWordCount, actualWordCount, 'WORD_COUNT no coincide con el pasaje');
});

test('Course schema describe sólo información visible y elimina ofertas incompletas', () => {
    const course = getNode('Course');
    assert.ok(course, 'falta Course');
    assert.equal(course.availableLanguage, 'es-MX');
    assert.equal(course.educationalLevel, 'Inicial');
    assert.match(course.coursePrerequisites, /lectura comprensiva convencional/i);
    assert.ok(Array.isArray(course.teaches) && course.teaches.length >= 4);
    assert.equal(course.audience?.audienceType, 'Adolescentes y adultos');
    assert.ok(Array.isArray(course.syllabusSections) && course.syllabusSections.length >= 5);

    for (const value of course.teaches) {
        assert.match(normalize(landingDocument.body.textContent), new RegExp(value, 'i'));
    }
    for (const section of course.syllabusSections) {
        assert.match(normalize(landingDocument.body.textContent), new RegExp(section.name, 'i'));
    }

    for (const forbidden of ['offers', 'aggregateRating', 'review', 'totalHistoricalEnrollment', 'hasCourseInstance']) {
        assert.equal(course[forbidden], undefined, `Course no debe declarar ${forbidden}`);
    }
});

test('FAQPage coincide exactamente con las preguntas y respuestas visibles', () => {
    const faq = getNode('FAQPage');
    assert.ok(faq, 'falta FAQPage');
    const visibleItems = [...landingDocument.querySelectorAll('#faq details.seo-faq-item')].map(item => ({
        question: normalize(item.querySelector('summary')?.textContent),
        answer: normalize(item.querySelector('p')?.textContent),
    }));
    const schemaItems = faq.mainEntity.map(item => ({
        question: normalize(item.name),
        answer: normalize(item.acceptedAnswer?.text),
    }));
    assert.ok(visibleItems.length >= 7, 'se esperan al menos siete preguntas útiles');
    assert.deepEqual(schemaItems, visibleItems);
});

test('la portada enlaza Fotolectura con una descripción verificable', () => {
    const homeDocument = new JSDOM(fs.readFileSync(HOME_PATH, 'utf8')).window.document;
    const links = [...homeDocument.querySelectorAll('a[href="/fotolectura"]')];
    assert.ok(links.length > 0, 'falta enlace a Fotolectura');
    assert.ok(
        links.some(link => /curso de lectura rápida.*comprensión/i.test(normalize(link.textContent))),
        'ningún enlace de portada describe el curso de forma específica'
    );
});

test('el artículo de apoyo incluye una comparación neutral y enlaza el curso', () => {
    const posts = JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'));
    const post = posts.find(item => item.slug === 'fotolectura-que-es-como-funciona');
    assert.ok(post, 'falta la fuente del artículo');
    const section = post.sections.find(item => item.heading === 'Cómo elegir un curso de lectura rápida');
    assert.ok(section, 'falta la sección comparativa en la fuente editorial');
    const sourceText = normalize(JSON.stringify(section));
    for (const criterion of ['comprensión', 'instructor', 'tamaño del grupo', 'temario', 'precio']) {
        assert.match(sourceText, new RegExp(criterion, 'i'), `falta ${criterion} en la comparación`);
    }
    assert.match(sourceText, /no existe un mejor curso universal/i);

    const articleDocument = new JSDOM(fs.readFileSync(ARTICLE_PATH, 'utf8')).window.document;
    assert.ok(
        [...articleDocument.querySelectorAll('h2')]
            .some(h2 => normalize(h2.textContent) === 'Cómo elegir un curso de lectura rápida'),
        'la sección comparativa no se generó en el HTML'
    );
    assert.ok(articleDocument.querySelector('a[href="/fotolectura"]'), 'el artículo no enlaza la landing');
});

test('cada testimonio de portada procede del catálogo verificado', () => {
    const catalog = JSON.parse(
        fs.readFileSync(path.join(ROOT, 'src', '_data', 'testimonials.json'), 'utf8')
    ).filter(item => item.verified && item.published && item.consentRecorded && item.evidenceId);
    const byEvidenceId = new Map(catalog.map(item => [item.evidenceId, item]));
    const homeDocument = new JSDOM(fs.readFileSync(HOME_PATH, 'utf8')).window.document;
    const cards = [...homeDocument.querySelectorAll('#stack .letter')];
    const evidenceIds = cards.map(card => card.dataset.evidenceId);

    assert.ok(cards.length > 0, 'la portada no publica experiencias verificadas');
    assert.equal(cards.length, catalog.length, 'la portada y el catálogo publicado no están sincronizados');
    assert.equal(new Set(evidenceIds).size, evidenceIds.length, 'la portada duplica un evidenceId');
    for (const card of cards) {
        const evidenceId = card.dataset.evidenceId;
        const source = byEvidenceId.get(evidenceId);
        assert.ok(source, `testimonio sin evidencia publicada: ${evidenceId || 'sin evidenceId'}`);
        assert.equal(source.course, 'robotics', 'un testimonio de otro programa se atribuye en portada');
        const text = normalize(card.textContent);
        for (const field of ['name', 'quote', 'role', 'badge']) {
            assert.match(text, new RegExp(escapeRegExp(source[field]), 'i'), `${evidenceId}: falta ${field}`);
        }
    }
});

test('robots permite el rastreo general sin grupos específicos contradictorios', () => {
    const robots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
    assert.match(robots, /User-agent:\s*\*/i);
    assert.match(robots, /Allow:\s*\//i);
    assert.doesNotMatch(robots, /User-agent:\s*(PerplexityBot|OAI-SearchBot)/i);
    assert.match(robots, /Sitemap:\s*https:\/\/ultravelozmente\.com\/sitemap\.xml/i);
});
