// scripts/sync-www.js
// Копира runtime-нужните статични файлове от repo root-а в www/ — точно
// това е "webDir"-ът, който Capacitor вгражда във нативния апп при `cap
// sync`/`cap copy`. IForget е чист статичен сайт (index.html + assets),
// няма build стъпка (bundler/transpile) — този скрипт е просто копиране,
// не истински build. Пуска се преди ВСЕКИ `npx cap sync` (виж "sync" npm
// script-а в package.json) — гарантира, че нативната обвивка вижда
// последната версия на кода, не остаряло копие в www/.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WWW = path.join(ROOT, 'www');

// Файлове, нужни на нативния апп по време на изпълнение. НЕ включва
// reset-password.html (само за уеб flow-а, отваря се от имейл линк в
// браузър, не вътре в апа) нито firebase.json/firestore.rules/functions/
// CLAUDE.md/README — тия са само за repo-то, не за самото приложение.
const FILES_TO_COPY = [
  'index.html',
  'manifest.json',
  'privacy.html',
  'terms.html',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'favicon-32.png',
  'bg-dark-v3.jpg',
  'bg-light.jpg',
  'auth-bg.jpg',
];

fs.rmSync(WWW, {recursive: true, force: true});
fs.mkdirSync(WWW, {recursive: true});

let copied = 0;
for (const file of FILES_TO_COPY) {
  const src = path.join(ROOT, file);
  if (!fs.existsSync(src)) {
    console.warn(`[sync-www] липсва (пропуснат): ${file}`);
    continue;
  }
  fs.copyFileSync(src, path.join(WWW, file));
  copied++;
}

console.log(`[sync-www] Копирани ${copied}/${FILES_TO_COPY.length} файла в www/.`);
