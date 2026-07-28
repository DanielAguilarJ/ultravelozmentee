'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BASE = 'https://ultravelozmente.com';
const DEFAULT_IMAGE = `${BASE}/images/fl-hero-brain.webp`;

const PAGES = {};

function add(file, kind, title, description, name, datePublished = null) {
  PAGES[file] = {
    file,
    kind,
    title,
    description,
    name,
    datePublished
  };
}

/* ─────────────────────────────────────────────────────────────
   PÁGINAS INSTITUCIONALES Y PROGRAMAS
───────────────────────────────────────────────────────────── */

add(
  'index.html',
  'page',
  'Cursos de aprendizaje acelerado | WorldBrain México',
  'Cursos de lectura rápida, cálculo mental, robótica, inglés, memoria y liderazgo para niños, jóvenes y adultos en Cuautitlán Izcalli y en línea.',
  'WorldBrain México'
);

add(
  'fotolectura.html',
  'course',
  'Curso de lectura rápida y Fotolectura | WorldBrain México',
  'Curso de Fotolectura y técnicas de lectura rápida con comprensión para jóvenes y adultos. Consulta metodología, modalidades y clase muestra.',
  'Curso de lectura rápida y Fotolectura'
);

add(
  'mathekids.html',
  'course',
  'Cálculo mental con ábaco para niños | MatheKids',
  'Curso de cálculo mental con Ábaco Soroban para niños de 6 a 12 años. Desarrolla agilidad, concentración y confianza con práctica guiada.',
  'MatheKids: cálculo mental con Ábaco Soroban'
);

add(
  'juniormath_v2.html',
  'course',
  'Cálculo mental y razonamiento para niños | JuniorMath',
  'Programa de cálculo mental y razonamiento matemático para niños de primaria con ejercicios por niveles, resolución de problemas y práctica gamificada.',
  'JuniorMath: cálculo mental y razonamiento matemático'
);

add(
  'lectoescritura.html',
  'course',
  'Curso de lectoescritura para niños | WorldBrain México',
  'Programa de lectoescritura para niños de 4 a 8 años. Desarrolla lectura fluida, comprensión, escritura y seguridad mediante práctica guiada.',
  'Curso de lectoescritura para niños'
);

add(
  'robotics.html',
  'course',
  'Robótica y programación para niños | Robotics Code',
  'Curso de robótica y programación para niños y adolescentes con Scratch, Python, Arduino e introducción a inteligencia artificial.',
  'Robotics Code: robótica y programación'
);

add(
  'fastkids.html',
  'course',
  'Curso de inglés para niños | FastKids WorldBrain',
  'Curso de inglés para niños con actividades de comprensión, conversación y práctica guiada. Conoce la metodología y solicita una clase muestra.',
  'FastKids: curso de inglés para niños'
);

add(
  'ciencia-astronomia.html',
  'course',
  'Curso de ciencia y astronomía para niños | WorldBrain',
  'Curso de ciencia y astronomía para niños con actividades sobre el espacio, pensamiento científico, observación y resolución de problemas.',
  'Curso de ciencia y astronomía para niños'
);

add(
  'homeschool.html',
  'course',
  'Homeschool en México: acompañamiento escolar | WorldBrain',
  'Acompañamiento académico para familias homeschool en México. Conoce modalidades, niveles, tutorías, costos y requisitos de acreditación externa.',
  'Acompañamiento académico Homeschool'
);

add(
  'memoria-prodigiosa.html',
  'course',
  'Curso de memoria y mnemotecnia | WorldBrain México',
  'Curso de memoria, concentración y mnemotecnia para estudiantes y adultos. Aprende palacios mentales y estrategias prácticas de retención.',
  'Memoria Prodigiosa'
);

add(
  'admision-universitaria.html',
  'course',
  'Curso para examen UNAM, IPN y UAM 2026 | WorldBrain',
  'Preparación para admisión universitaria UNAM, IPN y UAM 2026 con diagnóstico, temarios diferenciados, ejercicios y simulacros internos.',
  'Preparación para admisión universitaria UNAM, IPN y UAM'
);

add(
  'comipems.html',
  'course',
  'Ingreso a bachillerato UNAM e IPN 2026 | WorldBrain',
  'Preparación académica para el ingreso a bachillerato UNAM e IPN en 2026. Diagnóstico, temario, ejercicios y simulacros internos en línea o presenciales.',
  'Preparación para ingreso a bachillerato UNAM e IPN'
);

add(
  'diplomado-matematicas-fisica.html',
  'course',
  'Diplomado de matemáticas y física | WorldBrain México',
  'Programa de matemáticas y física con ejercicios, resolución de problemas y acompañamiento académico para fortalecer conocimientos escolares.',
  'Diplomado de matemáticas y física'
);

add(
  'regularizacion-express.html',
  'course',
  'Regularización escolar para niños y jóvenes | WorldBrain',
  'Programa de regularización académica para fortalecer matemáticas, lectura y hábitos de estudio mediante diagnóstico y seguimiento personalizado.',
  'Regularización Express'
);

add(
  'grandes-lideres.html',
  'course',
  'Curso de liderazgo y oratoria para jóvenes | WorldBrain',
  'Curso de liderazgo, comunicación y oratoria para niños y jóvenes. Actividades para fortalecer confianza, expresión y trabajo en equipo.',
  'Grandes Líderes'
);

add(
  'neurocomunicacion.html',
  'course',
  'Curso de comunicación y liderazgo | Neurocomunicación',
  'Curso de comunicación, liderazgo e inteligencia emocional para adultos y profesionales. Conoce el programa, modalidad y objetivos.',
  'Curso de Neurocomunicación'
);

add(
  'redaccion-ejecutiva.html',
  'course',
  'Curso de redacción ejecutiva y ortografía | WorldBrain',
  'Curso de redacción ejecutiva para escribir correos, informes, minutas y propuestas profesionales con claridad, estructura y buena ortografía.',
  'Curso de redacción ejecutiva y ortografía'
);

add(
  'universidad-dominical.html',
  'course',
  'Preparación académica flexible para adultos | WorldBrain',
  'Acompañamiento académico flexible para adultos que trabajan. Consulta modalidad, proceso de evaluación, institución responsable y requisitos aplicables.',
  'Preparación académica flexible para adultos'
);

add(
  'alfa-cash.html',
  'course',
  'Curso de presupuestos y finanzas profesionales | ALFA-CASH',
  'Programa de planeación presupuestaria y toma de decisiones financieras para profesionales y responsables de proyectos. Consulta contenidos y modalidad.',
  'ALFA-CASH: planeación presupuestaria para profesionales'
);

add(
  'testimonios.html',
  'collection',
  'Testimonios y experiencias de alumnos | WorldBrain México',
  'Conoce experiencias verificadas de alumnos y familias de los programas de lectura, matemáticas, robótica, inglés y preparación académica.',
  'Testimonios de WorldBrain México'
);

add(
  'blog-index.html',
  'collection',
  'Blog de aprendizaje, educación y desarrollo | WorldBrain',
  'Artículos sobre aprendizaje, lectura, cálculo mental, robótica, idiomas, memoria, liderazgo y preparación académica.',
  'Blog educativo de WorldBrain'
);

/* ─────────────────────────────────────────────────────────────
   BLOG
───────────────────────────────────────────────────────────── */

add(
  'blog-1-poder-contenido-organico.html',
  'article',
  'Contenido orgánico y autoridad digital | WorldBrain',
  'Cómo el contenido orgánico puede ayudar a construir confianza, autoridad y presencia digital mediante información útil y constante.',
  'El poder del contenido orgánico en la era digital',
  '2026-02-20'
);

add(
  'blog-2-contenido-organico-liderazgo.html',
  'article',
  'Contenido orgánico, liderazgo y comunicación | WorldBrain',
  'Descubre cómo compartir contenido útil puede fortalecer el liderazgo, la comunicación y la reputación profesional a largo plazo.',
  'Cómo el contenido orgánico transforma el liderazgo',
  '2026-02-22'
);

add(
  'blog-3-creacion-contenido-seo.html',
  'article',
  'Cómo crear contenido útil para SEO | WorldBrain',
  'Guía para crear contenido SEO bien estructurado, útil para las personas y comprensible para los motores de búsqueda.',
  'Creación de contenido orgánico para SEO',
  '2026-02-25'
);

add(
  'blog-4-despertar-inteligencia-infantil.html',
  'article',
  'Cómo estimular el aprendizaje infantil | WorldBrain',
  'Actividades de lectura, escritura, cálculo y juego que pueden apoyar el aprendizaje y el desarrollo de habilidades durante la infancia.',
  'El despertar de la inteligencia infantil',
  '2026-02-28'
);

add(
  'blog-5-eliminar-miedo-matematicas.html',
  'article',
  'Cómo ayudar a los niños con las matemáticas | WorldBrain',
  'Estrategias prácticas para reducir el miedo a las matemáticas y desarrollar confianza, razonamiento y cálculo mental en los niños.',
  'Cómo eliminar el miedo a los números',
  '2026-03-02'
);

add(
  'blog-6-robotica-ciencia-futuro.html',
  'article',
  'Robótica y programación para jóvenes | WorldBrain',
  'Beneficios educativos de aprender robótica, programación y pensamiento científico durante la infancia y la adolescencia.',
  'Robótica y ciencia para la generación del futuro',
  '2026-03-05'
);

add(
  'blog-7-ingles-sin-gramatica.html',
  'article',
  'Cómo apoyar el aprendizaje de inglés en niños | WorldBrain',
  'Actividades de comprensión, conversación y exposición al idioma que pueden ayudar a los niños a aprender inglés de manera práctica.',
  'Inglés e innovación para niños',
  '2026-03-06'
);

add(
  'blog-8-educacion-alternativa.html',
  'article',
  'Educación tradicional, homeschool y alternativas | WorldBrain',
  'Comparación de distintas modalidades educativas, incluyendo escuela tradicional, educación en casa y opciones flexibles de estudio.',
  'Educación tradicional y modalidades alternativas',
  '2026-03-08'
);

add(
  'blog-9-vencer-examenes-admision.html',
  'article',
  'Cómo prepararse para un examen de admisión | WorldBrain',
  'Consejos para organizar el estudio, practicar reactivos y prepararse de manera estratégica para un examen de admisión.',
  'Preparación para exámenes de admisión',
  '2026-03-09'
);

add(
  'blog-10-super-cerebro.html',
  'article',
  'Técnicas de lectura, memoria y concentración | WorldBrain',
  'Conoce técnicas de lectura, memoria, concentración y organización que pueden facilitar el estudio y la comprensión de información.',
  'Técnicas de lectura, memoria y concentración',
  '2026-03-10'
);

add(
  'blog-11-jovenes-lideres-finanzas.html',
  'article',
  'Liderazgo y educación financiera para jóvenes | WorldBrain',
  'Ideas para enseñar liderazgo, comunicación, administración del dinero y toma de decisiones responsables a niños y jóvenes.',
  'Liderazgo y educación financiera para jóvenes',
  '2026-03-12'
);

/* ─────────────────────────────────────────────────────────────
   LEGALES Y 404
───────────────────────────────────────────────────────────── */

add(
  'privacidad.html',
  'page',
  'Aviso de privacidad | WorldBrain México',
  'Consulta el aviso de privacidad y el tratamiento de datos personales realizado por WorldBrain México.',
  'Aviso de privacidad'
);

add(
  'terminos.html',
  'page',
  'Términos y condiciones | WorldBrain México',
  'Consulta los términos y condiciones aplicables a los servicios, programas y plataformas de WorldBrain México.',
  'Términos y condiciones'
);

add(
  'reembolsos.html',
  'page',
  'Política de reembolsos | WorldBrain México',
  'Consulta las condiciones, requisitos y procedimiento para solicitar cancelaciones o reembolsos en WorldBrain México.',
  'Política de reembolsos'
);

add(
  '404.html',
  'noindex',
  'Página no encontrada | WorldBrain México',
  'La página solicitada no existe o fue movida.',
  'Página no encontrada'
);

/* ─────────────────────────────────────────────────────────────
   OPCIONES ADICIONALES POR PÁGINA (imagen, FAQs, modalidades)
───────────────────────────────────────────────────────────── */

const WB_ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: 'Av. 1 de Mayo, Mz-C24B, Loc 282-283, Col. Centro Urbano',
  addressLocality: 'Cuautitlán Izcalli',
  addressRegion: 'Estado de México',
  postalCode: '54700',
  addressCountry: 'MX'
};

const ORGANIZATION = {
  '@type': ['EducationalOrganization', 'LocalBusiness'],
  '@id': `${BASE}/#organization`,
  name: 'WorldBrain México',
  alternateName: 'UltraVelozmente',
  url: `${BASE}/`,
  sameAs: [
    'https://www.facebook.com/WorldBrainMx/',
    'https://www.instagram.com/worldbrainmx1/',
    'https://x.com/WorldBrainMx',
    'https://youtube.com/@worldbrainmexico',
    'https://tiktok.com/@worldbrainmexico'
  ],
  logo: {
    '@type': 'ImageObject',
    url: `${BASE}/images/logo.svg`
  },
  telephone: '+52-55-7810-7837',
  email: 'contacto@ultravelozmente.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Av. 1 de Mayo, Mz-C24B, Loc 282-283, Col. Centro Urbano',
    addressLocality: 'Cuautitlán Izcalli',
    addressRegion: 'Estado de México',
    postalCode: '54700',
    addressCountry: 'MX'
  },
  areaServed: {
    '@type': 'Country',
    name: 'México'
  },
  openingHours: [
    'Mo-Th 09:00-18:00',
    'Fr 09:00-17:00',
    'Sa 08:00-15:00'
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+52-55-7810-7837',
    contactType: 'customer service',
    availableLanguage: ['es', 'Spanish'],
    areaServed: 'MX'
  }
};

const WEBSITE = {
  '@type': 'WebSite',
  '@id': `${BASE}/#website`,
  url: `${BASE}/`,
  name: 'WorldBrain México',
  inLanguage: 'es-MX',
  publisher: {
    '@id': `${BASE}/#organization`
  }
};

function canonicalFor(file) {
  if (file === 'index.html') return `${BASE}/`;
  return `${BASE}/${file.replace(/\.html$/i, '')}`;
}

const PAGE_OPTIONS = {
  'comipems.html': {
    image: `${BASE}/images/fl-hero-brain.webp`,
    modes: ['Online', 'Presencial'],
    faqs: [
      {
        q: '¿COMIPEMS sigue siendo un examen único en 2026?',
        a: 'No se debe presentar el ingreso metropolitano a bachillerato como un único examen aplicable a todas las instituciones. Las modalidades, evaluaciones, fechas y requisitos dependen de la convocatoria y de cada institución. Esta página conserva la URL histórica /comipems para orientar a quienes todavía buscan ese nombre, pero la preparación debe enfocarse en el proceso vigente de ingreso a bachillerato.'
      },
      {
        q: '¿El curso prepara para UNAM e IPN?',
        a: 'El programa ofrece preparación académica para las evaluaciones y áreas de conocimiento que correspondan a las opciones de UNAM e IPN. El aspirante debe consultar la convocatoria oficial de cada institución, porque WorldBrain no organiza el proceso, no asigna lugares y no determina los requisitos de admisión.'
      },
      {
        q: '¿Incluye temario y simulacros?',
        a: 'Sí. La preparación puede incluir diagnóstico, repaso de áreas académicas, ejercicios, administración del tiempo y simulacros internos. Los simulacros son materiales de práctica de WorldBrain y no deben presentarse como copias oficiales del examen.'
      },
      {
        q: '¿Cuántos aciertos necesito?',
        a: 'No existe un número universal que garantice el ingreso. La selección depende de la institución, el plantel, la demanda, la convocatoria y los resultados de cada proceso. Cualquier referencia histórica debe identificarse como orientativa y nunca como promesa de admisión.'
      },
      {
        q: '¿WorldBrain garantiza un lugar?',
        a: 'No. WorldBrain ofrece preparación y acompañamiento académico. El ingreso depende exclusivamente del desempeño del aspirante y de las reglas publicadas por las instituciones responsables.'
      }
    ]
  },
  'admision-universitaria.html': {
    modes: ['Online', 'Presencial'],
    faqs: [
      {
        q: '¿UNAM, IPN y UAM aplican el mismo examen?',
        a: 'No deben presentarse como un solo examen. Cada institución publica su propia convocatoria, temario, modalidad, calendario y criterios de selección. El plan de estudio debe ajustarse a la universidad y carrera elegidas.'
      },
      {
        q: '¿El curso incluye preparación para Medicina UNAM?',
        a: 'El programa puede reforzar las áreas académicas requeridas para la convocatoria correspondiente. La alta demanda de una carrera no permite garantizar ingreso ni establecer anticipadamente un número exacto de aciertos. El aspirante debe revisar la convocatoria oficial vigente.'
      },
      {
        q: '¿Cuántos aciertos pide Medicina UNAM en 2026?',
        a: 'No se debe publicar una cifra como garantía. Los resultados de referencia cambian según la demanda, la oferta de lugares y el desempeño de los aspirantes. WorldBrain puede ayudar a establecer una meta de práctica, pero la información oficial debe consultarse directamente con la UNAM.'
      },
      {
        q: '¿Los simulacros son oficiales?',
        a: 'No. Son ejercicios internos de preparación diseñados para practicar conocimientos, tiempo y estrategia. No son materiales emitidos ni avalados por UNAM, IPN o UAM.'
      },
      {
        q: '¿Hay clases en línea y presenciales?',
        a: 'La página ofrece información sobre modalidades en línea y presenciales en Cuautitlán Izcalli. La disponibilidad de grupos y horarios debe confirmarse por escrito antes de realizar cualquier pago.'
      },
      {
        q: '¿El curso garantiza la admisión?',
        a: 'No. El curso proporciona preparación académica. La admisión depende del desempeño del aspirante, la convocatoria, la demanda y las decisiones de cada universidad.'
      }
    ]
  },
  'homeschool.html': {
    modes: ['Online', 'Presencial'],
    faqs: [
      {
        q: '¿WorldBrain expide directamente certificados SEP?',
        a: 'WorldBrain ofrece acompañamiento y preparación académica. Antes de contratar, la familia debe solicitar por escrito el nombre legal de la institución que emitirá cualquier certificado, el tipo de autorización aplicable, el nivel educativo, los requisitos y el procedimiento de acreditación. No debe asumirse que WorldBrain expide directamente un certificado SEP.'
      },
      {
        q: '¿El programa utiliza INEA?',
        a: 'No debe afirmarse una relación con INEA sin identificar la ruta, el convenio o el trámite aplicable. Si una propuesta utiliza una opción de acreditación externa, esta debe detallarse por escrito antes de la inscripción.'
      },
      {
        q: '¿El homeschool tiene validez legal en México?',
        a: 'El acompañamiento académico en casa y la acreditación oficial son asuntos distintos. Para obtener documentos con reconocimiento oficial se necesita seguir una ruta válida y cumplir los requisitos de la autoridad o institución emisora. La familia debe recibir por escrito la explicación del proceso antes de contratar.'
      },
      {
        q: '¿Cuánto cuesta hacer homeschool en México?',
        a: 'El costo depende del nivel, modalidad, materiales, tutorías y trámites externos. WorldBrain debe entregar una cotización desglosada que indique qué servicios están incluidos y cuáles deben pagarse directamente a terceros. No se deben anunciar costos incompletos como si incluyeran certificación o trámites no confirmados.'
      },
      {
        q: '¿Está disponible para primaria, secundaria y bachillerato?',
        a: 'La disponibilidad académica puede contemplar distintos niveles, pero la ruta de acreditación y la institución emisora deben confirmarse por separado para cada nivel. No debe asumirse que un mismo acuerdo o procedimiento cubre primaria, secundaria y bachillerato.'
      },
      {
        q: '¿WorldBrain garantiza terminar en menos tiempo?',
        a: 'No. El ritmo depende del nivel del estudiante, la ruta de acreditación, los requisitos oficiales y el cumplimiento académico. No se debe prometer que una persona recuperará años escolares en meses ni que terminará un nivel en una fecha garantizada.'
      }
    ]
  },
  'mathekids.html': {
    modes: ['Online', 'Presencial']
  },
  'lectoescritura.html': {
    modes: ['Online', 'Presencial']
  },
  'blog-4-despertar-inteligencia-infantil.html': {
    image: `${BASE}/images/blog_4_cover.png`
  },
  'blog-5-eliminar-miedo-matematicas.html': {
    image: `${BASE}/images/blog_5_cover.png`
  },
  'blog-6-robotica-ciencia-futuro.html': {
    image: `${BASE}/images/blog_6_cover.png`
  },
  'blog-7-ingles-sin-gramatica.html': {
    image: `${BASE}/images/blog_7_cover.png`
  },
  'blog-8-educacion-alternativa.html': {
    image: `${BASE}/images/blog_8_cover.png`
  },
  'blog-9-vencer-examenes-admision.html': {
    image: `${BASE}/images/blog_9_cover.png`
  },
  'blog-11-jovenes-lideres-finanzas.html': {
    image: `${BASE}/images/blog_11_cover.png`
  }
};

for (const [file, options] of Object.entries(PAGE_OPTIONS)) {
  if (!PAGES[file]) {
    throw new Error(`PAGE_OPTIONS referencia una página desconocida: ${file}`);
  }

  if (options.image) {
    const imgPath = path.join(ROOT, options.image.replace(BASE, ''));
    if (!fs.existsSync(imgPath)) {
      console.warn(`⚠️ Imagen configurada no existe físicamente, se usará DEFAULT_IMAGE: ${options.image}`);
      delete options.image;
    }
  }

  Object.assign(PAGES[file], options);
}

function schemaFor(page) {
  const url = canonicalFor(page.file);
  const graph = [ORGANIZATION, WEBSITE];

  const pageType =
    page.kind === 'collection' ? 'CollectionPage' : 'WebPage';

  const webpage = {
    '@type': pageType,
    '@id': `${url}#webpage`,
    url,
    name: page.name,
    description: page.description,
    inLanguage: 'es-MX',
    isPartOf: {
      '@id': `${BASE}/#website`
    },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: page.image || DEFAULT_IMAGE
    }
  };

  if (page.kind === 'course') {
    webpage.mainEntity = {
      '@id': `${url}#course`
    };
  }

  graph.push(webpage);

  if (page.file !== 'index.html') {
    webpage.breadcrumb = {
      '@id': `${url}#breadcrumb`
    };

    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Inicio',
          item: `${BASE}/`
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: page.name,
          item: url
        }
      ]
    });
  }

  if (page.kind === 'course') {
    const course = {
      '@type': 'Course',
      '@id': `${url}#course`,
      name: page.name,
      description: page.description,
      url,
      inLanguage: 'es-MX',
      provider: {
        '@id': `${BASE}/#organization`
      }
    };

    if (Array.isArray(page.modes) && page.modes.length) {
      course.hasCourseInstance = {
        '@type': 'CourseInstance',
        courseMode: page.modes,
        location: {
          '@type': 'Place',
          name: 'WorldBrain Cuautitlán Izcalli',
          address: WB_ADDRESS
        }
      };
    }

    graph.push(course);
  }

  if (Array.isArray(page.faqs) && page.faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      url: `${url}#faq`,
      inLanguage: 'es-MX',
      mainEntity: page.faqs.map(item => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a
        }
      }))
    });
  }

  if (page.kind === 'article') {
    graph.push({
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      headline: page.name,
      description: page.description,
      url,
      image: page.image || DEFAULT_IMAGE,
      datePublished: page.datePublished,
      dateModified: page.datePublished,
      inLanguage: 'es-MX',
      mainEntityOfPage: {
        '@id': `${url}#webpage`
      },
      author: {
        '@type': 'Organization',
        '@id': `${BASE}/#editorial-team`,
        name: 'Equipo Editorial WorldBrain',
        parentOrganization: {
          '@id': `${BASE}/#organization`
        }
      },
      publisher: {
        '@id': `${BASE}/#organization`
      }
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  };
}

/* ─────────────────────────────────────────────────────────────
   NORMALIZACIÓN DE HTML
───────────────────────────────────────────────────────────── */

const REMOVED_META = new Set([
  'description',
  'robots',
  'googlebot',
  'bingbot',
  'author',
  'og:title',
  'og:description',
  'og:type',
  'og:url',
  'og:image',
  'og:image:alt',
  'og:site_name',
  'og:locale',
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
  'twitter:image:alt',
  'article:published_time',
  'article:modified_time'
]);

function stripOldSeo(head) {
  /*
   * Elimina primero el bloque generado anteriormente.
   * Ejecutar el script varias veces ya no acumulará comentarios.
   */
  head = head.replace(
    /<!-- SEO:GENERATED -->[\s\S]*?<!-- \/SEO:GENERATED -->/gi,
    ''
  );

  head = head.replace(
    /<title\b[^>]*>[\s\S]*?<\/title>/gi,
    ''
  );

  head = head.replace(/<link\b[^>]*>/gi, tag => {
    return /\brel\s*=\s*["'][^"']*\bcanonical\b[^"']*["']/i.test(tag)
      ? ''
      : tag;
  });

  head = head.replace(/<meta\b[^>]*>/gi, tag => {
    const match = tag.match(
      /\b(?:name|property)\s*=\s*["']([^"']+)["']/i
    );

    if (!match) {
      return tag;
    }

    return REMOVED_META.has(match[1].toLowerCase())
      ? ''
      : tag;
  });

  /*
   * No eliminamos todos los JSON-LD manuales.
   * El JSON-LD generado ya se elimina junto con SEO:GENERATED.
   */

  return head.trim();
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildSeoBlock(page) {
  if (page.kind === 'noindex') {
    return `
<!-- SEO:GENERATED -->
<title>${escapeAttribute(page.title)}</title>
<meta name="description" content="${escapeAttribute(page.description)}">
<meta name="robots" content="noindex,follow">
<meta name="googlebot" content="noindex,follow">
<!-- /SEO:GENERATED -->
`;
  }

  const url = canonicalFor(page.file);
  const ogType = page.kind === 'article' ? 'article' : 'website';
  const pageImage = page.image || DEFAULT_IMAGE;
  const schema = JSON.stringify(schemaFor(page), null, 2)
    .replace(/</g, '\\u003c');

  const articleMeta = page.kind === 'article'
    ? `
<meta property="article:published_time" content="${page.datePublished}">
<meta property="article:modified_time" content="${page.datePublished}">`
    : '';

  return `
<!-- SEO:GENERATED -->
<title>${escapeAttribute(page.title)}</title>
<meta name="description" content="${escapeAttribute(page.description)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="googlebot" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">

<link rel="canonical" href="${url}">
<link rel="stylesheet" href="/css/seo-components.css">

<meta property="og:locale" content="es_MX">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="WorldBrain México">
<meta property="og:title" content="${escapeAttribute(page.title)}">
<meta property="og:description" content="${escapeAttribute(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${pageImage}">
<meta property="og:image:alt" content="${escapeAttribute(page.name)}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttribute(page.title)}">
<meta name="twitter:description" content="${escapeAttribute(page.description)}">
<meta name="twitter:image" content="${pageImage}">
<meta name="twitter:image:alt" content="${escapeAttribute(page.name)}">
${articleMeta}

<script type="application/ld+json">
${schema}
</script>
<!-- /SEO:GENERATED -->
`;
}

function escapeHtmlText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildFaqBlock(page) {
  if (!Array.isArray(page.faqs) || !page.faqs.length) {
    return null;
  }

  const items = page.faqs.map(item => `
  <details class="seo-faq-item">
    <summary>${escapeHtmlText(item.q)}</summary>
    <div class="seo-faq-answer">
      <p>${escapeHtmlText(item.a)}</p>
    </div>
  </details>`).join('');

  return `<!-- SEO:FAQ:START -->
<section class="seo-section seo-faq" id="faq" aria-labelledby="faq-title">
  <div class="seo-section-header">
    <h2 id="faq-title">Preguntas frecuentes</h2>
  </div>${items}
</section>
<!-- SEO:FAQ:END -->`;
}

function injectFaq(html, page) {
  const block = buildFaqBlock(page);

  /* Elimina cualquier bloque FAQ previo generado en una ejecución anterior */
  html = html.replace(
    /<!-- SEO:FAQ:START -->[\s\S]*?<!-- SEO:FAQ:END -->\s*/gi,
    ''
  );

  if (!block) {
    return html;
  }

  if (html.includes('<!-- SEO:FAQ:SLOT -->')) {
    return html.replace(
      '<!-- SEO:FAQ:SLOT -->',
      `${block}\n<!-- SEO:FAQ:SLOT -->`
    );
  }

  console.warn(`⚠️ ${page.file}: define faqs pero no tiene <!-- SEO:FAQ:SLOT --> en el HTML`);
  return html;
}

function normalizeLang(html) {
  if (/<html\b[^>]*\blang\s*=/i.test(html)) {
    return html.replace(
      /(<html\b[^>]*\blang\s*=\s*)["'][^"']*["']/i,
      '$1"es-MX"'
    );
  }

  return html.replace(/<html\b/i, '<html lang="es-MX"');
}

function cleanInternalUrls(html) {
  /* URLs absolutas del dominio */
  html = html.replace(
    /https:\/\/ultravelozmente\.com\/index\.html(?=([?#][^"' ]*)?["'])/gi,
    `${BASE}/`
  );

  html = html.replace(
    /https:\/\/ultravelozmente\.com\/([a-z0-9][a-z0-9_-]*)\.html/gi,
    `${BASE}/$1`
  );

  /* Enlaces relativos y strings JS como "fotolectura.html" */
  html = html.replace(
    /(["'])(index|[a-z0-9][a-z0-9_-]*)\.html([?#][^"']*)?\1/gi,
    (full, quote, file, suffix = '') => {
      const clean = file.toLowerCase() === 'index'
        ? '/'
        : `/${file}`;

      return `${quote}${clean}${suffix}${quote}`;
    }
  );

  return html;
}

function injectSeo(html, page) {
  return html.replace(
    /<head\b([^>]*)>([\s\S]*?)<\/head>/i,
    (full, attributes, head) => {
      const cleanHead = stripOldSeo(head);
      return `<head${attributes}>${cleanHead}\n${buildSeoBlock(page)}\n</head>`;
    }
  );
}

function audit(file, html, page) {
  const h1Count = (html.match(/<h1\b/gi) || []).length;

  if (h1Count !== 1 && page.kind !== 'noindex') {
    console.warn(`⚠️ ${file}: tiene ${h1Count} etiquetas H1`);
  }

  if (page.title.length > 65) {
    console.warn(`⚠️ ${file}: title largo (${page.title.length})`);
  }

  if (page.description.length > 165) {
    console.warn(
      `⚠️ ${file}: description larga (${page.description.length})`
    );
  }

  if (/href\s*=\s*["'][^"']+\.html/i.test(html)) {
    console.warn(`⚠️ ${file}: conserva enlaces internos .html`);
  }
}

/* Primero normaliza enlaces en todos los HTML de la raíz */
for (const file of fs.readdirSync(ROOT)) {
  if (!file.endsWith('.html') || file.startsWith('google')) continue;

  const filePath = path.join(ROOT, file);
  let html = fs.readFileSync(filePath, 'utf8');

  html = normalizeLang(html);
  html = cleanInternalUrls(html);

  if (PAGES[file]) {
    html = injectSeo(html, PAGES[file]);
    html = injectFaq(html, PAGES[file]);
    audit(file, html, PAGES[file]);
  } else {
    console.warn(`⚠️ Sin configuración SEO: ${file}`);
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`✅ Procesado: ${file}`);
}

console.log('\nSEO aplicado. Revisa los warnings antes de desplegar.');
