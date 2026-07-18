import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;

console.log(`Updating landing page fallbacks to version: v${version}`);

// Update index.html
const htmlPath = path.join(__dirname, '../docs/index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Replace version badge
htmlContent = htmlContent.replace(
  /Son Sürüm: v\d+\.\d+\.\d+/g,
  `Son Sürüm: v${version}`
);

// Replace Windows download link
htmlContent = htmlContent.replace(
  /\/releases\/download\/v\d+\.\d+\.\d+\/FlaschDeck[-.]Setup[-.]\d+\.\d+\.\d+\.exe/g,
  `/releases/download/v${version}/FlaschDeck.Setup.${version}.exe`
);


// Replace macOS download link
htmlContent = htmlContent.replace(
  /\/releases\/download\/v\d+\.\d+\.\d+\/FlaschDeck-\d+\.\d+\.\d+-arm64\.dmg/g,
  `/releases/download/v${version}/FlaschDeck-${version}-arm64.dmg`
);

// Replace Linux download link
htmlContent = htmlContent.replace(
  /\/releases\/download\/v\d+\.\d+\.\d+\/FlaschDeck-\d+\.\d+\.\d+\.AppImage/g,
  `/releases/download/v${version}/FlaschDeck-${version}.AppImage`
);

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('docs/index.html updated successfully.');

// Update app.js
const jsPath = path.join(__dirname, '../docs/app.js');
let jsContent = fs.readFileSync(jsPath, 'utf8');

jsContent = jsContent.replace(
  /releaseVersion\.textContent = 'Son Sürüm: v\d+\.\d+\.\d+'/g,
  `releaseVersion.textContent = 'Son Sürüm: v${version}'`
);

fs.writeFileSync(jsPath, jsContent, 'utf8');
console.log('docs/app.js updated successfully.');
