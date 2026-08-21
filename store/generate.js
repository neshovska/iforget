/*
 * Прави скрийншотите и банера за App Store/Google Play от ИСТИНСКОТО
 * приложение (index.html), не от макет — така картинките в магазина
 * винаги съвпадат с това, което потребителят реално вижда.
 *
 * Пускане:  node store/generate.js
 * Изисква:  playwright + chromium (вече налични в средата).
 *
 * Firebase е подменен със store/fbstub.js — без реален акаунт/мрежа.
 * Бележките по-долу са измислени, но реалистични („ден за ден“ употреба,
 * виж позиционирането в CLAUDE.md) — БЕЗ месечен цикъл, нарочно: функцията
 * си остава в приложението, просто не се рекламира в магазините.
 */
const { chromium, devices } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots');
const FONTS = path.join(__dirname, 'fonts');

const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon' };

function serve(){
  return new Promise(resolve => {
    const srv = http.createServer((req,res)=>{
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\//,'') || 'index.html';
      const file = path.join(ROOT, rel);
      if(!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){
        res.writeHead(404); return res.end('not found');
      }
      res.writeHead(200, {'Content-Type': MIME[path.extname(file)] || 'application/octet-stream'});
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, () => resolve(srv));
  });
}

// --- демо съдържание -------------------------------------------------
const DAY = 86400000;
const now = Date.now();
const at = (days, h, m) => { const d = new Date(now + days*DAY); d.setHours(h, m, 0, 0); return d.getTime(); };

let idc = 1;
const note = o => Object.assign({
  id: 'n' + (idc++), text: '', status: 'open', createdAt: now,
  completedAt: null, tag: null, reminderAt: null, reminderRepeat: null,
  color: null, subs: [],
}, o);

const SEED = {
  onboarded: true,
  tagOrder: ['Дом', 'Здраве'],
  // Датите са нарочно близки (вчера + днес): списъкът се скролва най-долу
  // при отваряне, значи по-стари бележки биха останали извън кадъра.
  notes: [
    note({ text:'Плати сметките за тока и водата', tag:'Дом', status:'done',
           completedAt: now - 2*3600e3, createdAt: at(0, 8, 10) }),
    note({ text:'Довърши презентацията за понеделник', tag:'work', status:'progress',
           color:'#C6A052', createdAt: at(-1, 16, 40),
           subs:[ note({text:'Събери числата за второто тримесечие', status:'done', completedAt: now - 3600e3}),
                  note({text:'Прегледай слайдовете с Иван', status:'progress'}),
                  note({text:'Изпрати финалния файл'}) ] }),
    note({ text:'Купи подарък за рождения ден на Мира', tag:'personal',
           reminderAt: at(0, 18, 30), createdAt: at(0, 9, 5) }),
    note({ text:'Полей цветята', tag:'Дом', reminderAt: at(0, 20, 0),
           reminderRepeat:'daily', createdAt: at(0, 9, 20) }),
    note({ text:'Запиши час за преглед при зъболекар', tag:'Здраве',
           reminderAt: at(2, 10, 0), createdAt: at(0, 11, 0) }),
  ],
  dayHistory: (()=>{ const h={}; for(let i=1;i<=12;i++){
      const d=new Date(now - i*DAY); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      h[k]={c: 2+(i%3), d: 1+(i%3)}; } return h; })(),
};

// Само за екрана "Твоят преглед": още приключени бележки от по-рано тази
// седмица, за да е прогрес лентата реалистично пълна, а не "1 от 5".
// НЕ влизат в главния списък (снимка 1) — той е бутнат най-долу при
// отваряне и всяка добавена бележка отгоре би изтикала секция извън кадър.
const REVIEW_EXTRA = [
  note({ text:'Занеси якето на химическо', tag:'personal', status:'done',
         completedAt: at(-3, 12, 0), createdAt: at(-3, 9, 0) }),
  note({ text:'Обади се на счетоводителя', tag:'work', status:'done',
         completedAt: at(-2, 15, 30), createdAt: at(-2, 10, 15) }),
  note({ text:'Напазарувай за седмицата', tag:'Дом', status:'done',
         completedAt: at(-2, 18, 0), createdAt: at(-2, 11, 0) }),
  note({ text:'Прочети главата за понеделник', tag:'personal', status:'done',
         completedAt: at(-1, 21, 0), createdAt: at(-1, 19, 30) }),
];

const STUB = fs.readFileSync(path.join(__dirname, 'fbstub.js'), 'utf8');

async function newPage(ctx, extraNotes){
  const page = await ctx.newPage();
  const seed = extraNotes
    ? Object.assign({}, SEED, { notes: SEED.notes.concat(extraNotes) })
    : SEED;
  await page.addInitScript(`window.__SEED_DOC = ${JSON.stringify(seed)};\n${STUB}`);
  // Спираме САМО Firebase SDK скриптовете (подменени са от fbstub.js).
  await page.route('**/www.gstatic.com/firebasejs/**', r => r.abort());

  // Шрифтовете (Cormorant Garamond + DM Sans) се сервират от store/fonts/,
  // не от мрежата. Две причини: (1) Chromium в тази среда не стига до
  // fonts.googleapis.com (изходящият трафик минава през прокси, което той
  // не ползва) и без това снимките излизаха с резервен системен шрифт,
  // тоест НЕ приличаха на истинското приложение; (2) така скриптът дава
  // един и същ резултат и без мрежа. Кирилските subset-и са включени —
  // приложението е на български.
  await page.route('**/fonts.googleapis.com/**', route => {
    const url = route.request().url();
    const woff = url.match(/([^/?]+\.woff2)/);
    if(woff) return route.fulfill({ contentType:'font/woff2', body: fs.readFileSync(path.join(FONTS, woff[1])) });
    return route.fulfill({ contentType:'text/css', body: fs.readFileSync(path.join(FONTS, 'fonts.css'), 'utf8') });
  });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForSelector('.note', { timeout: 15000 });
  await page.waitForTimeout(900); // шрифтове + анимации
  return page;
}


// Взима .note-wrap на конкретна бележка по текста ѝ — по-надеждно от
// "първата в списъка" (тя е приключената, а менюто ѝ показва рядкото
// "Върни в активни" вместо обичайните действия).
const WRAP_BY_TEXT = (txt) => `(() => {
  const w = [...document.querySelectorAll('.note-wrap')]
    .find(el => el.querySelector('.txt') && el.querySelector('.txt').textContent.includes(${JSON.stringify(txt)}));
  return w;
})()`;

let BASE;

(async () => {
  const srv = await serve();
  BASE = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  fs.mkdirSync(OUT, { recursive: true });

  // Родните <input type="date"/"time"> се рисуват по локала на САМИЯ
  // БРАУЗЪРСКИ ПРОЦЕС, не по locale-а на контекста/страницата — без това
  // датата излиза "08/21/2026 06:30 PM" (американски формат) вместо
  // "21.08.2026 г. 18:30", както я вижда български потребител.
  // ПРОВЕРЕНО: само args:['--lang=bg-BG'] НЕ стига — решаващата е
  // env-променливата LANG; --lang остава, защото не пречи.
  const browser = await chromium.launch({
    args: ['--lang=bg-BG'],
    env: { ...process.env, LANG: 'bg_BG.UTF-8', LANGUAGE: 'bg_BG' },
  });
  // 430×932 @3x = 1290×2796 — приема се и от App Store (6.7"), и от Google Play.
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true, hasTouch: true,
    locale: 'bg-BG',
  });

  const shot = (page, name) => page.screenshot({ path: path.join(OUT, name) });

  // 1. Основен списък
  let page = await newPage(ctx);
  await shot(page, '1-list.png');
  await page.close();

  // 2. Меню при задържане върху бележка
  page = await newPage(ctx);
  await page.evaluate(`(() => {
    const el = ${WRAP_BY_TEXT('Купи подарък')};
    openCtxMenu(el.dataset.note, null, el.querySelector('.note'));
  })()`);
  await page.waitForTimeout(600);
  await shot(page, '2-menu.png');
  await page.close();

  // 3. Календар (месечен изглед)
  page = await newPage(ctx);
  await page.evaluate(() => { openProfilePanel(document.getElementById('userChip')); renderCalendarView('month'); });
  await page.waitForTimeout(700);
  await shot(page, '3-calendar.png');
  await page.close();

  // 4. Форма за напомняне. Натискаме самата значка на напомнянето
  // (data-action="reminder-open") — това е истинският бърз път на
  // потребителя до формата и отваря менюто направо в нея. Викането на
  // renderCtxMenuReminder() веднага след openCtxMenu() не работи:
  // менюто още се позиционира и остава на главния списък с бутони.
  page = await newPage(ctx);
  await page.evaluate(`(() => {
    const el = ${WRAP_BY_TEXT('Купи подарък')};
    el.querySelector('[data-action="reminder-open"]').click();
  })()`);
  await page.waitForTimeout(700);
  await shot(page, '4-reminder.png');
  await page.close();

  // 5. "Твоят преглед" — седмичен/месечен прогрес + серията. Избран пред
  // голото профилно меню: показва РЕЗУЛТАТ от употребата, а не настройки.
  page = await newPage(ctx, REVIEW_EXTRA);
  await page.evaluate(() => { openProfilePanel(document.getElementById('userChip')); renderMyReview(); });
  await page.waitForTimeout(700);
  await shot(page, '5-review.png');
  await page.close();

  // --- Банер за Google Play (feature graphic, точно 1024×500) ---------
  const bctx = await browser.newContext({ viewport:{width:1024, height:500}, deviceScaleFactor:1, locale:'bg-BG' });
  const bpage = await bctx.newPage();
  await bpage.route('**/fonts.googleapis.com/**', route => {
    const woff = route.request().url().match(/([^/?]+\.woff2)/);
    if(woff) return route.fulfill({ contentType:'font/woff2', body: fs.readFileSync(path.join(FONTS, woff[1])) });
    return route.fulfill({ contentType:'text/css', body: fs.readFileSync(path.join(FONTS, 'fonts.css'), 'utf8') });
  });
  await bpage.goto(BASE.replace('/index.html', '/store/banner.html'), { waitUntil:'load' });
  await bpage.waitForTimeout(900);
  await bpage.screenshot({ path: path.join(__dirname, 'banner.png') });
  await bctx.close();

  await browser.close();
  srv.close();
  console.log('Готово — скрийншоти в store/screenshots/, банер в store/banner.png');
})().catch(e => { console.error(e); process.exit(1); });
