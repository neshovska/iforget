// scripts/stress-test.js
// Тест с претоварване: колко се забавя приложението при много бележки.
// НЕ се качва на живия сайт (виж pages.yml — scripts/ се маха преди deploy).
//
// Пуска се така (иска локален сървър на 8099 и Playwright):
//   python3 -m http.server 8099 &
//   node scripts/stress-test.js
//
// Числата от последното пускане са записани в CLAUDE.md — ако промениш
// render()/itemRow(), пусни го пак и обнови таблицата там.
const path = require('path');
const { chromium } = require('playwright');
const makeNotes = require('./stress-notes.js');

// Макет на Firebase: влязъл потребител, чийто документ връща подадените
// бележки — така минаваме по истинския път onAuthStateChanged →
// loadFromCloud → render, вместо по изкуствен пряк път.
const STUB = `
window.__cloudOnline = true;
const USER = { uid:'stress', email:'stress@test.local', emailVerified:true };
const userDoc = {
  get: () => Promise.resolve({ exists:true, data: () => ({ notes: window.__seedNotes||[], tagOrder:[], dayHistory:{}, onboarded:true }) }),
  set: () => Promise.resolve(), update: () => Promise.resolve(),
  delete: () => Promise.resolve(), onSnapshot: () => () => {},
};
const authFn = () => ({
  onAuthStateChanged: cb => { setTimeout(() => cb(USER), 0); return () => {}; },
  signOut: () => Promise.resolve(), currentUser: USER,
});
authFn.EmailAuthProvider = { credential: () => ({}) };
window.firebase = {
  initializeApp: () => {}, auth: authFn,
  firestore: () => ({ enablePersistence: () => Promise.resolve(),
    collection: () => ({ doc: () => userDoc, get: () => Promise.resolve({docs:[],size:0,forEach(){}}),
      add: () => Promise.resolve(), orderBy: () => ({ limit: () => ({ get: () => Promise.resolve({forEach(){}}) }) }) }) }),
  functions: () => ({ httpsCallable: () => () => Promise.resolve({data:{}}) }),
  app: () => ({ functions: () => ({ httpsCallable: () => () => Promise.resolve({data:{}}) }) }),
};`;

const URL = process.env.STRESS_URL || 'http://localhost:8099/index.html';
const SIZES = [50, 100, 200, 350, 500, 800];

(async () => {
  const browser = await chromium.launch();
  console.log('бележки | приключване | добавяне | скрол (най-лош кадър)');
  console.log('--------|-------------|----------|----------------------');
  for (const n of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    // Без мрежа към Google — иначе тестът зависи от интернет.
    await ctx.route('**/gstatic.com/firebasejs/**', r => r.fulfill({status:200,contentType:'application/javascript',body:''}));
    await ctx.route('**/fonts.googleapis.com/**', r => r.fulfill({status:200,contentType:'text/css',body:''}));
    await ctx.addInitScript(STUB);
    await ctx.addInitScript(j => { window.__seedNotes = JSON.parse(j); }, JSON.stringify(makeNotes(n)));
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      // void offsetHeight принуждава layout-а ДА СЕ СЛУЧИ вътре в меренето —
      // иначе браузърът го отлага и числата излизат подвеждащо ниски.
      const meas = fn => { const a = performance.now(); fn(); void document.body.offsetHeight; return performance.now()-a; };
      const target = notes.find(x => (x.status||'open') !== 'done');
      const toggle = meas(() => cycleStatus(target.id, null));
      const add = meas(() => addNote('нова бележка от теста'));
      const area = document.getElementById('activeArea');
      let worst = 0;
      for (let i=0;i<10;i++){ const a=performance.now(); area.scrollTop += 400; void area.offsetHeight; worst = Math.max(worst, performance.now()-a); }
      return { toggle: Math.round(toggle), add: Math.round(add), scroll: Math.round(worst) };
    });
    console.log(String(n).padStart(7), '|', String(r.toggle+' ms').padStart(12), '|',
                String(r.add+' ms').padStart(9), '|', r.scroll + ' ms');
    await ctx.close();
  }
  await browser.close();
})();
