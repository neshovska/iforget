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

// Демо текстовете са на ВСИЧКИТЕ 5 езика на приложението (bg/en/ru/de/es,
// виж STRINGS в index.html) — по изрична заявка ("снимката да са видими
// всички езици ни трябва"): всеки, който отвори листинга на своя език
// (Google Play приема localized screenshots за всеки от петте; App Store
// Connect няма български, но приема ru/de/es отделно от en), трябва да
// вижда приложението, говорещо НЕГОВИЯ език на самите кадри, не превод в
// текста около тях. `pinned` е нарочно ЦЕЛИЯТ текст на бележката (не само
// начало) — WRAP_BY_TEXT_JS търси по `.includes()`, а при различен словоред
// (напр. немски) кратка фраза лесно не е точно подниз.
const DEMO = {
  bg: {
    tagOrder: ['Дом', 'Здраве'],
    pinned: 'Купи подарък за рождения ден на Мира',
    notes: [
      { text:'Плати сметките за тока и водата', tag:'Дом' },
      { text:'Довърши презентацията за понеделник', tag:'work',
        subs:['Събери числата за второто тримесечие', 'Прегледай слайдовете с Иван', 'Изпрати финалния файл'] },
      { text:'Купи подарък за рождения ден на Мира', tag:'personal' },
      { text:'Полей цветята', tag:'Дом' },
      { text:'Запиши час за преглед при зъболекар', tag:'Здраве' },
    ],
    extra: ['Занеси якето на химическо', 'Обади се на счетоводителя',
            'Напазарувай за седмицата', 'Прочети главата за понеделник'],
  },
  en: {
    tagOrder: ['Home', 'Health'],
    pinned: 'Buy a birthday present for Mira',
    notes: [
      { text:'Pay the electricity and water bills', tag:'Home' },
      { text:'Finish the presentation for Monday', tag:'work',
        subs:['Pull the second-quarter numbers', 'Go through the slides with Ivan', 'Send the final file'] },
      { text:'Buy a birthday present for Mira', tag:'personal' },
      { text:'Water the plants', tag:'Home' },
      { text:'Book a dentist appointment', tag:'Health' },
    ],
    extra: ['Take the jacket to the cleaners', 'Call the accountant',
            'Do the weekly shopping', 'Read the chapter for Monday'],
  },
  ru: {
    tagOrder: ['Дом', 'Здоровье'],
    pinned: 'Купить подарок на день рождения для Миры',
    notes: [
      { text:'Оплатить счета за электричество и воду', tag:'Дом' },
      { text:'Закончить презентацию к понедельнику', tag:'work',
        subs:['Собрать цифры за второй квартал', 'Просмотреть слайды с Иваном', 'Отправить финальный файл'] },
      { text:'Купить подарок на день рождения для Миры', tag:'personal' },
      { text:'Полить цветы', tag:'Дом' },
      { text:'Записаться к стоматологу', tag:'Здоровье' },
    ],
    extra: ['Отнести куртку в химчистку', 'Позвонить бухгалтеру',
            'Сделать покупки на неделю', 'Прочитать главу к понедельнику'],
  },
  de: {
    tagOrder: ['Zuhause', 'Gesundheit'],
    pinned: 'Ein Geburtstagsgeschenk für Mira kaufen',
    notes: [
      { text:'Strom- und Wasserrechnung bezahlen', tag:'Zuhause' },
      { text:'Präsentation für Montag fertigstellen', tag:'work',
        subs:['Zahlen für das zweite Quartal zusammenstellen', 'Folien mit Ivan durchgehen', 'Die finale Datei senden'] },
      { text:'Ein Geburtstagsgeschenk für Mira kaufen', tag:'personal' },
      { text:'Blumen gießen', tag:'Zuhause' },
      { text:'Zahnarzttermin vereinbaren', tag:'Gesundheit' },
    ],
    extra: ['Jacke zur Reinigung bringen', 'Den Buchhalter anrufen',
            'Wocheneinkauf machen', 'Das Kapitel für Montag lesen'],
  },
  es: {
    tagOrder: ['Casa', 'Salud'],
    pinned: 'Comprar un regalo de cumpleaños para Mira',
    notes: [
      { text:'Pagar las facturas de luz y agua', tag:'Casa' },
      { text:'Terminar la presentación para el lunes', tag:'work',
        subs:['Reunir las cifras del segundo trimestre', 'Revisar las diapositivas con Ivan', 'Enviar el archivo final'] },
      { text:'Comprar un regalo de cumpleaños para Mira', tag:'personal' },
      { text:'Regar las plantas', tag:'Casa' },
      { text:'Reservar cita con el dentista', tag:'Salud' },
    ],
    extra: ['Llevar la chaqueta a la tintorería', 'Llamar al contable',
            'Hacer la compra semanal', 'Leer el capítulo para el lunes'],
  },
};

// Датите са нарочно близки (вчера + днес): списъкът се скролва най-долу
// при отваряне, значи по-стари бележки биха останали извън кадъра.
function buildSeed(code){
  const d = DEMO[code];
  const n = d.notes;
  return {
    onboarded: true,
    tagOrder: d.tagOrder,
    notes: [
      note({ text:n[0].text, tag:n[0].tag, status:'done',
             completedAt: now - 2*3600e3, createdAt: at(0, 8, 10) }),
      note({ text:n[1].text, tag:n[1].tag, status:'progress',
             color:'#C6A052', createdAt: at(-1, 16, 40),
             subs:[ note({text:n[1].subs[0], status:'done', completedAt: now - 3600e3}),
                    note({text:n[1].subs[1], status:'progress'}),
                    note({text:n[1].subs[2]}) ] }),
      note({ text:n[2].text, tag:n[2].tag,
             reminderAt: at(0, 18, 30), reminderRepeat:'monthly', createdAt: at(0, 9, 5) }),
      note({ text:n[3].text, tag:n[3].tag, reminderAt: at(0, 20, 0),
             reminderRepeat:'daily', createdAt: at(0, 9, 20) }),
      note({ text:n[4].text, tag:n[4].tag,
             reminderAt: at(2, 10, 0), createdAt: at(0, 11, 0) }),
    ],
    dayHistory: (()=>{ const h={}; for(let i=1;i<=12;i++){
        const dd=new Date(now - i*DAY); const k=`${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`;
        h[k]={c: 2+(i%3), d: 1+(i%3)}; } return h; })(),
  };
}

// Само за екрана "Твоят преглед": още приключени бележки от по-рано тази
// седмица, за да е прогрес лентата реалистично пълна, а не "1 от 5".
// НЕ влизат в главния списък (снимка 1) — той е бутнат най-долу при
// отваряне и всяка добавена бележка отгоре би изтикала секция извън кадър.
function buildReviewExtra(code){
  const d = DEMO[code];
  const tags = ['personal', 'work', d.tagOrder[0], 'personal'];
  return d.extra.map((text, i) => note({
    text, tag: tags[i], status:'done',
    completedAt: at(-(3 - Math.min(i, 2)), 12 + i, 0),
    createdAt: at(-(3 - Math.min(i, 2)), 9 + i, 0),
  }));
}

const STUB = fs.readFileSync(path.join(__dirname, 'fbstub.js'), 'utf8');

// `code` е езикът на демото ('bg'/'en'). Езикът на самия ИНТЕРФЕЙС се
// задава през localStorage ПРЕДИ страницата да тръгне — приложението го
// чете оттам при старт (`let lang = localStorage.getItem(LANG_KEY)`), значи
// не се налага да се кликат бутони и да се чака пре-рисуване.
async function newPage(ctx, code, extraNotes){
  const page = await ctx.newPage();
  const base = buildSeed(code);
  const seed = extraNotes
    ? Object.assign({}, base, { notes: base.notes.concat(extraNotes) })
    : base;
  await page.addInitScript(`try{ localStorage.setItem('lang', ${JSON.stringify(code)}); }catch(e){}\nwindow.__SEED_DOC = ${JSON.stringify(seed)};\n${STUB}`);
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

// Отделен вариант БЕЗ влязъл потребител — за кадъра с "Продължи без
// акаунт" (виж window.__NO_USER в fbstub.js). Не се стъпват бележки/
// notes, значи не се чака '.note' — чака се самата auth карта.
async function newAuthPage(ctx, code){
  const page = await ctx.newPage();
  await page.addInitScript(`try{ localStorage.setItem('lang', ${JSON.stringify(code)}); }catch(e){}\nwindow.__NO_USER = true;\n${STUB}`);
  await page.route('**/www.gstatic.com/firebasejs/**', r => r.abort());
  await page.route('**/fonts.googleapis.com/**', route => {
    const url = route.request().url();
    const woff = url.match(/([^/?]+\.woff2)/);
    if(woff) return route.fulfill({ contentType:'font/woff2', body: fs.readFileSync(path.join(FONTS, woff[1])) });
    return route.fulfill({ contentType:'text/css', body: fs.readFileSync(path.join(FONTS, 'fonts.css'), 'utf8') });
  });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForSelector('#authGuestBtn', { timeout: 15000 });
  await page.waitForTimeout(900); // шрифтове + анимации
  return page;
}


// Взима .note-wrap на конкретна бележка по текста ѝ — по-надеждно от
// "първата в списъка" (тя е приключената, а менюто ѝ показва рядкото
// "Върни в активни" вместо обичайните действия).
const WRAP_BY_TEXT_JS = `(() => {
  const w = [...document.querySelectorAll('.note-wrap')]
    .find(el => el.querySelector('.txt') && el.querySelector('.txt').textContent.includes(__PINNED__));
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
  // РЕАЛЕН БЪГ (хванат при добавянето на "7-guest.png"): браузърът се
  // стартираше ЕДИН път, винаги с LANG=bg_BG — датовото поле в АНГЛИЙСКИТЕ
  // кадри (за App Store) показваше "02.09.2026 г." с българското "г."
  // Затова браузърът вече се стартира ОТДЕЛНО за всеки език (виж
  // launchBrowser() и цикъла по LANGS по-долу), с LANG, съответен на
  // самия набор снимки.
  // PW_CHROMIUM — аварийна пътечка за среда, в която Playwright пакетът и
  // свалените браузъри са различни версии (тогава launch() гърми с
  // "Executable doesn't exist"). Празна е при нормална употреба.
  function launchBrowser(langTag){
    return chromium.launch({
      args: [`--lang=${langTag.replace('_', '-')}`],
      env: { ...process.env, LANG: langTag + '.UTF-8', LANGUAGE: langTag },
      ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
    });
  }
  // Един и същ набор от пет кадъра се прави за два размера — виж SIZES
  // по-долу. Приложението е сглобено за iPhone И iPad
  // (`TARGETED_DEVICE_FAMILY = "1,2"` в iOS проекта), а App Store иска
  // отделни снимки за всяко семейство устройства и не пуска подаване без
  // тях.
  async function captureSet(ctx, outDir, code){
    fs.mkdirSync(outDir, { recursive: true });
    const shot = (page, name) => page.screenshot({ path: path.join(outDir, name) });
    const wrap = WRAP_BY_TEXT_JS.replace('__PINNED__', JSON.stringify(DEMO[code].pinned));

    // 1. Езиците — ПЪРВИЯТ кадър, по изрична заявка. Основният екран с
    // отворен избор на език: вижда се веднага, че приложението не е само
    // на един език. Първата снимка в магазина често е и единствената,
    // която човек изобщо поглежда.
    let page = await newPage(ctx, code);
    await page.evaluate(() => { openLangPicker(document.getElementById('langBtn')); });
    await page.waitForTimeout(500);
    await shot(page, '1-languages.png');
    await page.close();

    // 2. Основен списък
    page = await newPage(ctx, code);
    await shot(page, '2-list.png');
    await page.close();

    // 3. Меню при задържане върху бележка
    page = await newPage(ctx, code);
    await page.evaluate(`(() => {
      const el = ${wrap};
      openCtxMenu(el.dataset.note, null, el.querySelector('.note'));
    })()`);
    await page.waitForTimeout(600);
    await shot(page, '3-menu.png');
    await page.close();

    // 4. Календар (месечен изглед)
    page = await newPage(ctx, code);
    await page.evaluate(() => { openProfilePanel(document.getElementById('userChip')); renderCalendarView('month'); });
    await page.waitForTimeout(700);
    await shot(page, '4-calendar.png');
    await page.close();

    // 5. Форма за напомняне. Натискаме самата значка на напомнянето
    // (data-action="reminder-open") — това е истинският бърз път на
    // потребителя до формата и отваря менюто направо в нея. Викането на
    // renderCtxMenuReminder() веднага след openCtxMenu() не работи:
    // менюто още се позиционира и остава на главния списък с бутони.
    page = await newPage(ctx, code);
    await page.evaluate(`(() => {
      const el = ${wrap};
      el.querySelector('[data-action="reminder-open"]').click();
    })()`);
    await page.waitForTimeout(700);
    await shot(page, '5-reminder.png');
    await page.close();

    // 6. "Твоят преглед" — седмичен/месечен прогрес + серията. Избран пред
    // голото профилно меню: показва РЕЗУЛТАТ от употребата, а не настройки.
    page = await newPage(ctx, code, buildReviewExtra(code));
    await page.evaluate(() => { openProfilePanel(document.getElementById('userChip')); renderMyReview(); });
    await page.waitForTimeout(700);
    await shot(page, '6-review.png');
    await page.close();

    // 7. Екран за вход — бутонът "Продължи без акаунт". Новото в тая
    // версия (виж release notes), затова получава собствен кадър — на
    // главния списък/менюто нищо не намеква, че акаунт изобщо не е нужен.
    page = await newAuthPage(ctx, code);
    await shot(page, '7-guest.png');
    await page.close();
  }

  // 430×932 @3 = 1290×2796 — приема се и от App Store (6.9"/6.7"), и от
  // Google Play.
  //
  // iPad размерът (1032×1376 @2 = 2064×2752) се прави САМО при
  // `IPAD=1 node store/generate.js`. Приложението нарочно се предлага
  // само за iPhone (`TARGETED_DEVICE_FAMILY = 1`), защото няма отделен
  // изглед за таблет — на голям екран бележките се разпъват по цялата
  // ширина и горе остава голямо празно поле. Ако някога се направи
  // истински iPad изглед, снимките са на едно превключване разстояние.
  // Всичките 5 езика на приложението, всеки в своя папка (screenshots,
  // screenshots-en, screenshots-ru, ...), за да не се презаписват.
  // Текстовете около снимките (описание/What's New) остават само bg+en
  // (виж store-listing-texts.md/release-notes) — тук иде реч само за САМИТЕ
  // кадри, които вече говорят и петте езика на приложението.
  const LANGS = [
    { code: 'bg', dir: OUT,           locale: 'bg-BG', browserLang: 'bg_BG' },
    { code: 'en', dir: OUT + '-en',   locale: 'en-US', browserLang: 'en_US' },
    { code: 'ru', dir: OUT + '-ru',   locale: 'ru-RU', browserLang: 'ru_RU' },
    { code: 'de', dir: OUT + '-de',   locale: 'de-DE', browserLang: 'de_DE' },
    { code: 'es', dir: OUT + '-es',   locale: 'es-ES', browserLang: 'es_ES' },
  ];

  // 430×932 @3 = 1290×2796 — приема се и от App Store (6.9"/6.7"), и от
  // Google Play.
  //
  // iPad размерът (1032×1376 @2 = 2064×2752) се прави САМО при
  // `IPAD=1 node store/generate.js`. Приложението нарочно се предлага
  // само за iPhone (`TARGETED_DEVICE_FAMILY = 1`), защото няма отделен
  // изглед за таблет — на голям екран бележките се разпъват по цялата
  // ширина и горе остава голямо празно поле. Ако някога се направи
  // истински iPad изглед, снимките са на едно превключване разстояние.
  const SIZES = [
    { suffix: '',      viewport: { width: 430, height: 932 }, dsf: 3 },
  ];
  if(process.env.IPAD){
    SIZES.push({ suffix: '-ipad', viewport: { width: 1032, height: 1376 }, dsf: 2 });
  }

  for(const l of LANGS){
    const browser = await launchBrowser(l.browserLang);
    for(const s of SIZES){
      const ctx = await browser.newContext({
        viewport: s.viewport,
        deviceScaleFactor: s.dsf,
        isMobile: true, hasTouch: true,
        locale: l.locale,
      });
      await captureSet(ctx, l.dir + s.suffix, l.code);
      await ctx.close();
    }
    await browser.close();
  }

  // --- Банер за Google Play (feature graphic, точно 1024×500) ---------
  // Банерът е само на български, значи си иска собствен bg_BG браузър —
  // тия по-горе вече са затворени след цикъла им.
  const banBrowser = await launchBrowser('bg_BG');
  const bctx = await banBrowser.newContext({ viewport:{width:1024, height:500}, deviceScaleFactor:1, locale:'bg-BG' });
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
  await banBrowser.close();

  srv.close();
  console.log('Готово — скрийншоти в store/screenshots/, банер в store/banner.png');
})().catch(e => { console.error(e); process.exit(1); });
