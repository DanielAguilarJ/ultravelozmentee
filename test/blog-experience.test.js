'use strict';

/* ══════════════════════════════════════════════════════════════════
   Blog Editorial Experience — TDD RED phase
   
   Validates the planned blog transformation:
   - SEO/navbar/footer preserved
   - 11 semantic stories with local covers
   - Featured/highlighted article
   - Accessible search & filters
   - No-JS fallback (progressive enhancement)
   - localStorage-backed bookmarks & view persistence
   - Empty state with aria-live
   - CSS responsive, light mode, focus-visible, pointer coarse, reduced motion
   - /api/posts loaded with safe DOM APIs (no innerHTML with remote data)
   - 11 articles with main-content, shared CSS, js/blog-article.js
   - Read/save/share actions and progress bar
   ══════════════════════════════════════════════════════════════════ */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');

function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function dom(html) {
  return new JSDOM(html, { url: 'https://ultravelozmente.com/blog-index' });
}

/* ─────────────────────────────────────────────────────────────────
   1. SEO / Navbar / Footer preserved in blog-index.html
   ───────────────────────────────────────────────────────────────── */

test('blog-index: SEO:GENERATED block preserved intact', () => {
  const html = readFile('blog-index.html');
  const start = html.indexOf('<!-- SEO:GENERATED -->');
  const end = html.indexOf('<!-- /SEO:GENERATED -->');
  assert.ok(start !== -1, 'Missing <!-- SEO:GENERATED --> marker');
  assert.ok(end !== -1, 'Missing <!-- /SEO:GENERATED --> marker');
  assert.ok(end > start, 'Markers out of order');
  const block = html.slice(start, end + '<!-- /SEO:GENERATED -->'.length);
  assert.ok(block.includes('application/ld+json'), 'JSON-LD missing from SEO block');
  assert.ok(block.includes('rel="canonical"'), 'Canonical link missing');
});

test('blog-index: nav.nav-pill with role=navigation present', () => {
  const { document } = dom(readFile('blog-index.html')).window;
  const nav = document.querySelector('nav.nav-pill[role="navigation"]');
  assert.ok(nav, 'Navbar nav.nav-pill[role=navigation] not found');
});

test('blog-index: footer.footer-modern with role=contentinfo present', () => {
  const { document } = dom(readFile('blog-index.html')).window;
  const footer = document.querySelector('footer.footer-modern[role="contentinfo"]');
  assert.ok(footer, 'Footer footer.footer-modern[role=contentinfo] not found');
});

/* ─────────────────────────────────────────────────────────────────
   2. 11 semantic blog stories with local cover images
   ───────────────────────────────────────────────────────────────── */

const BLOG_SLUGS = [
  'blog-1-poder-contenido-organico',
  'blog-2-contenido-organico-liderazgo',
  'blog-3-creacion-contenido-seo',
  'blog-4-despertar-inteligencia-infantil',
  'blog-5-eliminar-miedo-matematicas',
  'blog-6-robotica-ciencia-futuro',
  'blog-7-ingles-sin-gramatica',
  'blog-8-educacion-alternativa',
  'blog-9-vencer-examenes-admision',
  'blog-10-super-cerebro',
  'blog-11-jovenes-lideres-finanzas',
];

test('blog-index: 11 cards as <article> with semantic structure', () => {
  const { document } = dom(readFile('blog-index.html')).window;
  const articles = document.querySelectorAll('article.ed-card');
  assert.equal(articles.length, 11, `Expected 11 <article.ed-card>, got ${articles.length}`);
  articles.forEach((art, i) => {
    assert.ok(art.querySelector('h2'), `Card ${i + 1} missing <h2>`);
    assert.ok(art.querySelector('p'), `Card ${i + 1} missing <p> excerpt`);
  });
});

test('blog-index: each card has local cover image from images/', () => {
  const { document } = dom(readFile('blog-index.html')).window;
  const cards = document.querySelectorAll('article.ed-card');
  assert.equal(cards.length, 11);
  cards.forEach((card, i) => {
    const img = card.querySelector('img');
    assert.ok(img, `Card ${i + 1} missing <img>`);
    const src = img.getAttribute('src') || '';
    assert.ok(src.startsWith('images/blog_'), `Card ${i + 1} img src should start with images/blog_, got: ${src}`);
    assert.ok(src.endsWith('.webp'), `Card ${i + 1} img should be .webp`);
    assert.ok(img.getAttribute('alt'), `Card ${i + 1} img missing alt`);
    assert.ok(img.getAttribute('loading') === 'lazy', `Card ${i + 1} img missing loading=lazy`);
    assert.ok(img.getAttribute('width'), `Card ${i + 1} img missing width`);
    assert.ok(img.getAttribute('height'), `Card ${i + 1} img missing height`);
  });
});

test('blog-index: all 11 slugs linked', () => {
  const html = readFile('blog-index.html');
  for (const slug of BLOG_SLUGS) {
    assert.ok(html.includes(slug), `Missing link to ${slug}`);
  }
});

/* ─────────────────────────────────────────────────────────────────
   3. Featured / highlighted article
   ───────────────────────────────────────────────────────────────── */

test('blog-index: one featured/highlighted article card', () => {
  const { document } = dom(readFile('blog-index.html')).window;
  const featured = document.querySelector('.ed-card--featured, [aria-label*="destacado"], .ed-featured');
  assert.ok(featured, 'No featured/highlighted article card found');
});

/* ─────────────────────────────────────────────────────────────────
   4. Accessible search and topic filters
   ───────────────────────────────────────────────────────────────── */

test('blog-index: search input with role=search and aria-label', () => {
  const { document } = dom(readFile('blog-index.html')).window;
  const toolbar = document.querySelector('[role="search"]');
  assert.ok(toolbar, 'No element with role="search" found');
  const input = toolbar.querySelector('input[type="search"]');
  assert.ok(input, 'No <input type=search> inside search region');
  assert.ok(input.getAttribute('aria-label'), 'Search input missing aria-label');
});

test('blog-index: topic filter chips with role=group', () => {
  const { document } = dom(readFile('blog-index.html')).window;
  const group = document.querySelector('[role="group"][aria-label]');
  assert.ok(group, 'No role=group for topic chips');
  const chips = group.querySelectorAll('button[data-topic]');
  assert.ok(chips.length >= 3, `Expected at least 3 topic chips, got ${chips.length}`);
  const allChip = group.querySelector('button[data-topic="all"]');
  assert.ok(allChip, 'Missing "all" topic chip');
});

test('blog-index: view toggle button with aria-label', () => {
  const { document } = dom(readFile('blog-index.html')).window;
  const toggle = document.querySelector('.ed-view-toggle[aria-label]');
  assert.ok(toggle, 'No .ed-view-toggle button with aria-label found');
});

/* ─────────────────────────────────────────────────────────────────
   5. No-JS fallback: cards visible as static HTML
   ───────────────────────────────────────────────────────────────── */

test('blog-index: all 11 cards are in static HTML (no JS needed to render)', () => {
  const { document } = dom(readFile('blog-index.html')).window;
  // Without running any JS, cards should be present
  const links = BLOG_SLUGS.map(slug =>
    document.querySelector(`a[href*="${slug}"], article[data-slug="${slug}"] a, [href="/${slug}"]`)
  );
  links.forEach((el, i) => {
    assert.ok(el, `Static card/link for ${BLOG_SLUGS[i]} not found without JS`);
  });
});

/* ─────────────────────────────────────────────────────────────────
   6. localStorage protected bookmarks & view persistence
   ───────────────────────────────────────────────────────────────── */

test('blog-editorial.js: localStorage access wrapped in try/catch', () => {
  const js = readFile('js/blog-editorial.js');
  const tryCount = (js.match(/try\s*\{/g) || []).length;
  const localStorageCount = (js.match(/localStorage/g) || []).length;
  assert.ok(localStorageCount >= 2, 'Expected localStorage usage');
  assert.ok(tryCount >= 2, 'Expected try/catch wrapping localStorage calls');
});

test('blog-editorial.js: saves bookmarks to localStorage', () => {
  const js = readFile('js/blog-editorial.js');
  assert.ok(js.includes('bookmark') || js.includes('saved') || js.includes('guardado'),
    'No bookmark/saved persistence logic found');
});

test('blog-editorial.js: persists view preference (grid/list)', () => {
  const js = readFile('js/blog-editorial.js');
  assert.ok(js.includes('view') || js.includes('vista'),
    'No view toggle persistence logic found');
});

/* ─────────────────────────────────────────────────────────────────
   7. Empty state with aria-live
   ───────────────────────────────────────────────────────────────── */

test('blog-index: empty state container with aria-live', () => {
  const { document } = dom(readFile('blog-index.html')).window;
  const live = document.querySelector('[aria-live="polite"], [aria-live="assertive"]');
  assert.ok(live, 'No aria-live region for empty/search state');
});

/* ─────────────────────────────────────────────────────────────────
   8. CSS: responsive, light mode, focus-visible, pointer coarse, reduced motion
   ───────────────────────────────────────────────────────────────── */

test('blog-editorial.css exists and contains responsive breakpoints', () => {
  const css = readFile('css/blog-editorial.css');
  assert.ok(css.includes('@media'), 'No @media queries found');
  assert.ok(css.includes('max-width') || css.includes('min-width'), 'No responsive breakpoints');
});

test('blog-editorial.css: light mode styles', () => {
  const css = readFile('css/blog-editorial.css');
  assert.ok(
    css.includes('.light-mode') || css.includes('prefers-color-scheme: light'),
    'No light mode styles found'
  );
});

test('blog-editorial.css: focus-visible styles', () => {
  const css = readFile('css/blog-editorial.css');
  assert.ok(css.includes(':focus-visible'), 'No :focus-visible styles');
});

test('blog-editorial.css: pointer coarse media query', () => {
  const css = readFile('css/blog-editorial.css');
  assert.ok(css.includes('pointer: coarse'), 'No @media (pointer: coarse) found');
});

test('blog-editorial.css: prefers-reduced-motion', () => {
  const css = readFile('css/blog-editorial.css');
  assert.ok(css.includes('prefers-reduced-motion'), 'No prefers-reduced-motion query');
});

/* ─────────────────────────────────────────────────────────────────
   9. /api/posts loaded with safe DOM APIs, no innerHTML with data
   ───────────────────────────────────────────────────────────────── */

test('blog-editorial.js: uses createElement+textContent, never innerHTML with remote data', () => {
  const js = readFile('js/blog-editorial.js');
  assert.ok(js.includes('createElement'), 'Should use document.createElement');
  assert.ok(js.includes('textContent'), 'Should use textContent for safe text insertion');
  // innerHTML must not be used with post/remote data
  const lines = js.split('\n');
  const innerHTMLLines = lines.filter(l => l.includes('innerHTML'));
  for (const line of innerHTMLLines) {
    // innerHTML with template literals or variables from fetch is forbidden
    assert.ok(
      !line.includes('post.') && !line.includes('${') && !line.includes('data'),
      `Unsafe innerHTML usage detected: ${line.trim()}`
    );
  }
});

test('blog-editorial.js: fetches /api/posts', () => {
  const js = readFile('js/blog-editorial.js');
  assert.ok(js.includes('/api/posts'), 'Should fetch /api/posts');
});

/* ─────────────────────────────────────────────────────────────────
   10. 11 articles: main-content, shared CSS, js/blog-article.js
   ───────────────────────────────────────────────────────────────── */

for (const slug of BLOG_SLUGS) {
  test(`${slug}.html: has #main-content landmark`, () => {
    const { document } = dom(readFile(`${slug}.html`)).window;
    const main = document.querySelector('#main-content, main[id="main-content"]');
    assert.ok(main, `${slug} missing #main-content`);
  });

  test(`${slug}.html: links css/blog-editorial.css`, () => {
    const html = readFile(`${slug}.html`);
    assert.ok(html.includes('css/blog-editorial.css'), `${slug} missing blog-editorial.css link`);
  });

  test(`${slug}.html: loads js/blog-article.js`, () => {
    const html = readFile(`${slug}.html`);
    assert.ok(html.includes('js/blog-article.js'), `${slug} missing blog-article.js script`);
  });
}

/* ─────────────────────────────────────────────────────────────────
   11. Article actions: read progress, save/bookmark, share
   ───────────────────────────────────────────────────────────────── */

test('articles: read progress bar with role=progressbar', () => {
  const { document } = dom(readFile('blog-1-poder-contenido-organico.html')).window;
  const bar = document.querySelector('[role="progressbar"]');
  assert.ok(bar, 'No role=progressbar element found');
  assert.ok(bar.getAttribute('aria-valuenow') !== null, 'progressbar missing aria-valuenow');
  assert.ok(bar.getAttribute('aria-valuemin') !== null, 'progressbar missing aria-valuemin');
  assert.ok(bar.getAttribute('aria-valuemax') !== null, 'progressbar missing aria-valuemax');
});

test('articles: bookmark/save button with aria-pressed', () => {
  const { document } = dom(readFile('blog-1-poder-contenido-organico.html')).window;
  const btn = document.querySelector('button[aria-pressed], .ed-bookmark-btn');
  assert.ok(btn, 'No bookmark button found');
  assert.ok(btn.getAttribute('aria-pressed') !== null, 'Bookmark button missing aria-pressed');
  assert.ok(btn.getAttribute('aria-label'), 'Bookmark button missing aria-label');
});

test('articles: share button present', () => {
  const { document } = dom(readFile('blog-1-poder-contenido-organico.html')).window;
  const share = document.querySelector('[aria-label*="ompartir"], .ed-share-btn, button.share');
  assert.ok(share, 'No share button found in article');
});

test('js/blog-article.js exists with progress tracking logic', () => {
  const js = readFile('js/blog-article.js');
  assert.ok(js.includes('scroll') || js.includes('IntersectionObserver') || js.includes('progress'),
    'blog-article.js should contain scroll/progress tracking logic');
});

/* ─────────────────────────────────────────────────────────────────
   12. Behaviour in jsdom: filters, bookmarks, safe dynamic posts
   ───────────────────────────────────────────────────────────────── */

async function bootBrowserScript(htmlPath, scriptPath, fetchPayload = []) {
  const instance = new JSDOM(readFile(htmlPath), {
    url: `https://ultravelozmente.com/${htmlPath.replace(/\.html$/, '')}`,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = instance;
  window.fetch = async () => ({
    ok: true,
    json: async () => fetchPayload,
  });
  window.AOS = { refresh: () => {} };
  window.eval(readFile(scriptPath));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  await new Promise(resolve => window.setTimeout(resolve, 0));
  return instance;
}

function visibleStaticCards(document) {
  return [...document.querySelectorAll('article.ed-card:not(.ed-card--dynamic)')]
    .filter(card => !card.hidden);
}

test('blog behaviour: search filters static stories and updates live result count', async () => {
  const instance = await bootBrowserScript('blog-index.html', 'js/blog-editorial.js');
  const { document, Event } = instance.window;
  const input = document.querySelector('input[type="search"]');
  input.value = 'robótica';
  input.dispatchEvent(new Event('input', { bubbles: true }));

  const visible = visibleStaticCards(document);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].dataset.slug, 'blog-6-robotica-ciencia-futuro');
  assert.match(document.querySelector('[aria-live="polite"]').textContent, /1/);
  instance.window.close();
});

test('blog behaviour: topic chips filter stories and expose selected state', async () => {
  const instance = await bootBrowserScript('blog-index.html', 'js/blog-editorial.js');
  const { document, MouseEvent } = instance.window;
  const chip = document.querySelector('button[data-topic="infancia"]');
  chip.dispatchEvent(new MouseEvent('click', { bubbles: true }));

  const visible = visibleStaticCards(document);
  assert.ok(visible.length >= 3, 'Expected several infancia stories');
  assert.ok(visible.every(card => card.dataset.topic.split(/\s+/).includes('infancia')));
  assert.equal(chip.getAttribute('aria-pressed'), 'true');
  instance.window.close();
});

test('blog behaviour: bookmark persists and saved-only filter reveals the library', async () => {
  const instance = await bootBrowserScript('blog-index.html', 'js/blog-editorial.js');
  const { document, MouseEvent, localStorage } = instance.window;
  const card = document.querySelector('article.ed-card[data-slug="blog-11-jovenes-lideres-finanzas"]');
  card.querySelector('[data-bookmark]').dispatchEvent(new MouseEvent('click', { bubbles: true }));

  assert.equal(card.querySelector('[data-bookmark]').getAttribute('aria-pressed'), 'true');
  assert.match(localStorage.getItem('worldbrain.blog.saved.v1') || '', /blog-11-jovenes-lideres-finanzas/);

  document.querySelector('[data-saved-filter]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert.deepEqual(visibleStaticCards(document).map(item => item.dataset.slug), [
    'blog-11-jovenes-lideres-finanzas',
  ]);

  card.querySelector('[data-bookmark]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert.equal(visibleStaticCards(document).length, 0);
  assert.equal(document.querySelector('[data-empty-state]').hidden, false);
  instance.window.close();
});

test('blog behaviour: view preference is applied and persisted', async () => {
  const instance = await bootBrowserScript('blog-index.html', 'js/blog-editorial.js');
  const { document, MouseEvent, localStorage } = instance.window;
  const toggle = document.querySelector('.ed-view-toggle');
  toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));

  assert.equal(document.querySelector('[data-editorial-feed]').dataset.view, 'compact');
  assert.equal(localStorage.getItem('worldbrain.blog.view.v1'), 'compact');
  instance.window.close();
});

test('blog behaviour: remote post content is inserted as text, never executable markup', async () => {
  const payload = [{
    slug: 'seguro',
    filename: 'blog-seguro.html',
    title: '<img id="remote-xss" src=x onerror=alert(1)>',
    excerpt: '<script id="remote-script">alert(1)</script>',
    category: 'Educación',
    date: '5 agosto 2026',
    readTime: '4 min de lectura',
    author: 'Equipo Editorial WorldBrain',
  }];
  const instance = await bootBrowserScript('blog-index.html', 'js/blog-editorial.js', payload);
  const { document } = instance.window;
  const dynamic = document.querySelector('.ed-card--dynamic');

  assert.ok(dynamic, 'Dynamic post was not rendered');
  assert.equal(dynamic.querySelector('#remote-xss'), null);
  assert.equal(dynamic.querySelector('#remote-script'), null);
  assert.match(dynamic.textContent, /<img id="remote-xss"/);
  assert.equal(dynamic.querySelector('a').getAttribute('href'), '/blog-seguro');
  instance.window.close();
});

test('article behaviour: bookmark and progress state update through blog-article.js', async () => {
  const instance = await bootBrowserScript(
    'blog-1-poder-contenido-organico.html',
    'js/blog-article.js'
  );
  const { window } = instance;
  const { document, MouseEvent, Event, localStorage } = window;
  const bookmark = document.querySelector('[data-bookmark]');
  bookmark.dispatchEvent(new MouseEvent('click', { bubbles: true }));

  assert.equal(bookmark.getAttribute('aria-pressed'), 'true');
  assert.match(localStorage.getItem('worldbrain.blog.saved.v1') || '', /blog-1-poder-contenido-organico/);

  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 2000 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 500 });
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 750 });
  window.dispatchEvent(new Event('scroll'));
  await new Promise(resolve => window.setTimeout(resolve, 30));
  assert.equal(document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'), '50');
  window.close();
});

/* ─────────────────────────────────────────────────────────────────
   13. Editorial hierarchy — prevent regression to a generic card grid
   ───────────────────────────────────────────────────────────────── */

test('editorial hierarchy: featured story is separate from the 11-item feed', () => {
  const { document } = dom(readFile('blog-index.html')).window;
  const featured = document.querySelector('article.ed-featured[aria-label]');
  assert.ok(featured, 'A separate article.ed-featured is required');
  assert.equal(featured.classList.contains('ed-card'), false, 'Featured story must not count as a feed card');
  assert.match(featured.querySelector('img').getAttribute('src'), /blog_11_cover\.webp$/);
  assert.equal(document.querySelectorAll('article.ed-card').length, 11);
});

test('editorial hierarchy: hero exposes kicker and concise collection facts', () => {
  const { document } = dom(readFile('blog-index.html')).window;
  assert.ok(document.querySelector('.ed-hero .ed-kicker'), 'Hero kicker missing');
  const facts = document.querySelectorAll('.ed-hero-facts li');
  assert.ok(facts.length >= 2, 'Hero should expose concise collection facts');
});

test('editorial hierarchy: desktop layout has a main feed and a sticky editorial rail', () => {
  const { document } = dom(readFile('blog-index.html')).window;
  const layout = document.querySelector('.ed-layout');
  assert.ok(layout, '.ed-layout missing');
  assert.ok(layout.querySelector('.ed-main-column [data-editorial-feed]'), 'Feed must live in .ed-main-column');
  assert.ok(layout.querySelector('aside.ed-aside'), 'Editorial aside rail missing');
  assert.ok(layout.querySelector('[data-saved-count]'), 'Saved-library count missing');
});

test('editorial hierarchy: feed rows expose publication, category, time and linked thumbnail', () => {
  const { document } = dom(readFile('blog-index.html')).window;
  const cards = [...document.querySelectorAll('article.ed-card')];
  assert.equal(cards[0].dataset.slug, 'blog-11-jovenes-lideres-finanzas', 'Feed should be newest first');
  cards.forEach((card, index) => {
    assert.ok(card.querySelector('.ed-card-meta'), `Card ${index + 1} metadata missing`);
    assert.ok(card.querySelector('.ed-card-category'), `Card ${index + 1} category missing`);
    assert.ok(card.querySelector('time[datetime]'), `Card ${index + 1} semantic date missing`);
    assert.ok(card.querySelector('.ed-card-read-time'), `Card ${index + 1} read time missing`);
    assert.ok(card.querySelector('h2 a[href]'), `Card ${index + 1} title link missing`);
    assert.ok(card.querySelector('a.ed-card-media img'), `Card ${index + 1} linked thumbnail missing`);
  });
});

test('editorial hierarchy: search landmark excludes saved and display controls', () => {
  const { document } = dom(readFile('blog-index.html')).window;
  const search = document.querySelector('[role="search"]');
  assert.ok(search.querySelector('input[type="search"]'));
  assert.equal(search.querySelector('[data-saved-filter]'), null);
  assert.equal(search.querySelector('.ed-view-toggle'), null);
  assert.ok(document.querySelector('.ed-toolbar-actions [data-saved-filter]'));
  assert.ok(document.querySelector('.ed-toolbar-actions .ed-view-toggle'));
});

test('editorial hierarchy: real empty state and no-JS guidance are present', () => {
  const { document } = dom(readFile('blog-index.html')).window;
  const empty = document.querySelector('[data-empty-state]');
  assert.ok(empty, 'Filter empty state missing');
  assert.equal(empty.hidden, true, 'Empty state should start hidden');
  assert.ok(document.querySelector('noscript .ed-no-js'), 'No-JS guidance missing');
});

test('editorial CSS: rows, rail and article reading typography are explicitly defined', () => {
  const css = readFile('css/blog-editorial.css');
  assert.match(css, /\.ed-layout\s*\{[\s\S]*?display:\s*grid/);
  assert.match(css, /\.ed-layout\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.ed-card\s*\{[\s\S]*?display:\s*grid/);
  assert.match(css, /\.ed-card\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.ed-aside-inner\s*\{[\s\S]*?position:\s*sticky/);
  assert.match(css, /\.blog-content\s*\{[\s\S]*?font-family:[^;}]*Georgia/);
  assert.match(css, /\.blog-content\s*\{[\s\S]*?max-width:\s*7[0-9]{2}px/);
});

test('dynamic cards use the same metadata and media structure as static feed rows', async () => {
  const payload = [{
    slug: 'nuevo', filename: 'blog-nuevo.html', title: 'Artículo nuevo', excerpt: 'Texto seguro',
    category: 'Educación', date: '5 agosto 2026', readTime: '4 min de lectura',
    author: 'Equipo Editorial WorldBrain',
  }];
  const instance = await bootBrowserScript('blog-index.html', 'js/blog-editorial.js', payload);
  const dynamic = instance.window.document.querySelector('.ed-card--dynamic');
  assert.ok(dynamic.querySelector('.ed-card-meta'));
  assert.ok(dynamic.querySelector('.ed-card-category'));
  assert.ok(dynamic.querySelector('time[datetime]'));
  assert.ok(dynamic.querySelector('.ed-card-read-time'));
  assert.ok(dynamic.querySelector('a.ed-card-media'));
  assert.ok(dynamic.querySelector('[data-bookmark]'));
  instance.window.close();
});

/* ─────────────────────────────────────────────────────────────────
   14. Original editorial metadata and article action placement
   ───────────────────────────────────────────────────────────────── */

const ORIGINAL_META = {
  'blog-11-jovenes-lideres-finanzas': ['2026-03-12', '12 mar 2026', '6 min'],
  'blog-10-super-cerebro': ['2026-03-10', '10 mar 2026', '8 min'],
  'blog-9-vencer-examenes-admision': ['2026-03-09', '9 mar 2026', '6 min'],
  'blog-8-educacion-alternativa': ['2026-03-08', '8 mar 2026', '7 min'],
  'blog-7-ingles-sin-gramatica': ['2026-03-06', '6 mar 2026', '5 min'],
  'blog-6-robotica-ciencia-futuro': ['2026-03-05', '5 mar 2026', '6 min'],
  'blog-5-eliminar-miedo-matematicas': ['2026-03-02', '2 mar 2026', '6 min'],
  'blog-4-despertar-inteligencia-infantil': ['2026-02-28', '28 feb 2026', '5 min'],
  'blog-3-creacion-contenido-seo': ['2026-02-25', '25 feb 2026', '7 min'],
  'blog-2-contenido-organico-liderazgo': ['2026-02-22', '22 feb 2026', '6 min'],
  'blog-1-poder-contenido-organico': ['2026-02-20', '20 feb 2026', '5 min'],
};

test('editorial metadata: original publication dates and reading times are preserved', () => {
  const { document } = dom(readFile('blog-index.html')).window;
  Object.entries(ORIGINAL_META).forEach(([slug, expected]) => {
    const card = document.querySelector(`article.ed-card[data-slug="${slug}"]`);
    const time = card.querySelector('time');
    assert.equal(time.getAttribute('datetime'), expected[0], `${slug} datetime changed`);
    assert.equal(time.textContent.trim().toLowerCase(), expected[1], `${slug} visible date changed`);
    assert.equal(card.querySelector('.ed-card-read-time').textContent.trim(), expected[2], `${slug} read time changed`);
  });
});

test('featured story carries publication and reading metadata', () => {
  const { document } = dom(readFile('blog-index.html')).window;
  const featured = document.querySelector('.ed-featured');
  assert.ok(featured.querySelector('.ed-featured-meta time[datetime="2026-03-12"]'));
  assert.match(featured.querySelector('.ed-featured-meta').textContent, /6 min/);
});

test('all article pages expose a back-to-blog action in the shared toolbar', () => {
  BLOG_SLUGS.forEach(slug => {
    const { document } = dom(readFile(`${slug}.html`)).window;
    const back = document.querySelector('.ed-article-toolbar a.ed-back-link[href="/blog-index"]');
    assert.ok(back, `${slug} missing back-to-blog action`);
  });
});

test('article action toolbar is a desktop rail and a safe-area mobile bar', () => {
  const css = readFile('css/blog-editorial.css');
  assert.match(css, /\.ed-article-toolbar\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(css, /@media \(max-width:\s*1100px\)[\s\S]*?\.ed-article-toolbar\s*\{[\s\S]*?bottom:/);
  assert.match(css, /\.ed-article-toolbar[\s\S]*?safe-area-inset-bottom/);
});
