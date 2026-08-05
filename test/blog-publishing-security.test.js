'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SERVER = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');

function sanitizer() {
  return require(path.join(ROOT, 'js', 'blog-sanitizer.js')).sanitizeBlogContent;
}

test('blog sanitizer preserves the editorial HTML allowlist', () => {
  const clean = sanitizer()(`
    <h2>Aprender mejor</h2>
    <p class="lead">Texto <strong>importante</strong> y <em>humano</em>.</p>
    <blockquote>Una idea</blockquote>
    <ul><li>Primer paso</li></ul>
    <a href="/fotolectura">Curso</a>
    <img src="/images/blog_1_cover.webp" alt="Portada" loading="lazy">
  `);

  assert.match(clean, /<h2>Aprender mejor<\/h2>/);
  assert.match(clean, /<p class="lead">/);
  assert.match(clean, /<strong>importante<\/strong>/);
  assert.match(clean, /<blockquote>Una idea<\/blockquote>/);
  assert.match(clean, /href="\/fotolectura"/);
  assert.match(clean, /src="\/images\/blog_1_cover\.webp"/);
});

test('blog sanitizer removes scriptable elements, event attributes and inline styles', () => {
  const clean = sanitizer()(`
    <script id="xss">alert(1)</script>
    <style>body{display:none}</style>
    <iframe src="https://evil.example"></iframe>
    <svg><script>alert(2)</script></svg>
    <p onclick="alert(3)" style="background:url(javascript:alert(4))">Seguro</p>
    <img src="x" onerror="alert(5)">
  `);

  assert.doesNotMatch(clean, /script|style=|onclick|onerror|iframe|svg|alert\(/i);
  assert.match(clean, /<p>Seguro<\/p>/);
});

test('blog sanitizer blocks javascript, data and protocol-relative URLs', () => {
  const clean = sanitizer()(`
    <a href="javascript:alert(1)">JS</a>
    <a href="java&#0000115;cript:alert(2)">Zero padded decimal</a>
    <a href="java&#x000073;cript:alert(3)">Zero padded hex</a>
    <a href="//evil.example/path">Protocol relative</a>
    <img src="data:image/svg+xml,<svg onload=alert(4)>">
    <a href="https://ultravelozmente.com/blog-index" target="_blank">Seguro</a>
  `);

  assert.doesNotMatch(clean, /javascript:|data:image|\/\/evil\.example|alert\(/i);
  assert.match(clean, /href="https:\/\/ultravelozmente\.com\/blog-index"/);
  assert.match(clean, /rel="noopener noreferrer"/);
});

test('blog sanitizer handles malformed markup without creating executable output', () => {
  const clean = sanitizer()('<p><strong>Texto<script>alert(1)</script></p><a href="java&#x73;cript:alert(2)">x');
  assert.doesNotMatch(clean, /script|javascript:|alert\(/i);
  assert.match(clean, /Texto/);
});

test('server sanitizes content before buildBlogHtml inserts it', () => {
  assert.match(SERVER, /require\(['"]\.\/js\/blog-sanitizer['"]\)/);
  assert.match(SERVER, /sanitizeBlogContent\(content\)/);
  assert.doesNotMatch(SERVER, /<article>\$\{content\}<\/article>/);
});

test('blog sanitizer server module is explicitly blocked from static serving', () => {
  const block = /const PRIVATE_FILES = new Set\(\[([\s\S]*?)\]\);/.exec(SERVER);
  assert.ok(block, 'PRIVATE_FILES not found');
  assert.match(block[1], /['"]\/js\/blog-sanitizer\.js['"]/);
});

test('blog publisher builds a new posts array instead of mutating parsed data', () => {
  assert.doesNotMatch(SERVER, /posts\[i\]\s*=\s*meta/);
  assert.doesNotMatch(SERVER, /posts\.unshift\(meta\)/);
  assert.match(SERVER, /const nextPosts\s*=\s*i !== -1/);
  assert.match(SERVER, /JSON\.stringify\(nextPosts,/);
});
