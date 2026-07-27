'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const OLD_NUMBERS = [
  '5215578107837',
  '5215578107833'
];

const OFFICIAL_NUMBER = '525578107837';

for (const file of fs.readdirSync(ROOT)) {
  if (!file.endsWith('.html')) continue;

  const filePath = path.join(ROOT, file);
  let html = fs.readFileSync(filePath, 'utf8');
  const original = html;

  for (const oldNumber of OLD_NUMBERS) {
    html = html.replaceAll(
      `wa.me/${oldNumber}`,
      `wa.me/${OFFICIAL_NUMBER}`
    );
  }

  if (html !== original) {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`✅ WhatsApp normalizado: ${file}`);
  }
}

const siteJsonPath = path.join(
  ROOT,
  'src',
  '_data',
  'site.json'
);

if (fs.existsSync(siteJsonPath)) {
  const site = JSON.parse(
    fs.readFileSync(siteJsonPath, 'utf8')
  );

  site.whatsappNumber = OFFICIAL_NUMBER;

  fs.writeFileSync(
    siteJsonPath,
    `${JSON.stringify(site, null, 2)}\n`,
    'utf8'
  );

  console.log('✅ src/_data/site.json actualizado');
}
