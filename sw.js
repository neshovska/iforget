// sw.js — Service Worker на iForget.
//
// ЦЕЛ: приложението да се ОТВАРЯ и работи офлайн (без връзка изобщо), не да
// синхронизира данни офлайн — това вече го прави локалният localStorage кеш
// (виж STORAGE_KEY/loadLocalCache()/save() в index.html — всяка бележка се
// пише в localStorage мигновено, Firestore записът е "fire and forget"
// отгоре). Тук кешираме само "обвивката": index.html + иконки/снимки +
// самите Firebase SDK скриптове (firebase.initializeApp() тръгва СИНХРОННО
// на първия ред от <script> блока — ако тия 4 gstatic файла не се заредят,
// цялото приложение хвърля грешка и не показва дори кешираните бележки).
//
// НИКОГА не пипа Firestore/Auth/Functions заявките — те живеят на
// дълготрайни streaming връзки и Firestore SDK-то си има собствена offline
// опашка/retry; SW-намеса там носи само риск, без полза.

// v2: index.html вече се тегли с {cache:'no-cache'} (виж fetch handler-а
// по-долу) — вдигнато нарочно, за да се изхвърли всеки стар кеширан
// index.html, който по-старата версия на тоя файл може вече да е записала
// (потенциално остарял заради липсата на no-cache преди).
const CACHE_VERSION = 'v2';
const CACHE_NAME = 'iforget-shell-' + CACHE_VERSION;

const PRECACHE_URLS = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'favicon-32.png',
  'bg-dark-v3.jpg',
  'bg-light.jpg',
  'bg-school.svg',
  'auth-bg.jpg',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-functions-compat.js',
];

// Домейни на "живи" Firebase канали — никога не минават през SW-то.
const NEVER_INTERCEPT = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'www.googleapis.com',
  'cloudfunctions.net',
  'firebaseinstallations.googleapis.com',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Отделно за всеки файл (не Cache.addAll, което пада ЦЯЛОТО install,
    // ако дори един ресурс липсва/timeout-не) — една пропусната снимка не
    // бива да чупи целия офлайн кеш.
    await Promise.all(PRECACHE_URLS.map(async url => {
      try{
        const resp = await fetch(url, { cache: 'no-cache' });
        if(resp && (resp.ok || resp.type === 'opaque')) await cache.put(url, resp);
      }catch(e){ /* best-effort */ }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = req.url;
  if(NEVER_INTERCEPT.some(host => url.includes(host))) return;

  if(req.mode === 'navigate'){
    // index.html: мрежата първа — приложението се обновява при всеки push,
    // не искаме потребител да заседне на стара версия, докато е онлайн.
    // Кешът е само fallback, когато няма връзка изобщо.
    // {cache:'no-cache'} е ЗАДЪЛЖИТЕЛНО тук — без него fetch() минава
    // първо през СОБСТВЕНИЯ HTTP кеш на браузъра (различен от caches API-то
    // тук долу), който може тихо да върне стара версия дори когато SW-то
    // мисли, че тегли "най-новото" (реален риск: потребител вижда стара
    // версия дори онлайн, докато не презареди достатъчно пъти да изтече
    // браузърният кеш). 'no-cache' форсира сървъра да потвърди свежест
    // (ETag/Last-Modified), не да пропусне мрежата.
    event.respondWith((async () => {
      try{
        const fresh = await fetch(req, { cache: 'no-cache' });
        const cache = await caches.open(CACHE_NAME);
        cache.put('index.html', fresh.clone());
        return fresh;
      }catch(e){
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match('index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  const sameOriginStatic = url.startsWith(self.location.origin);
  const isPrecached = PRECACHE_URLS.some(u => url === u || url.endsWith(u));
  if(sameOriginStatic || isPrecached){
    // Статични файлове (икони/снимки/Firebase SDK): stale-while-revalidate
    // — мигновен отговор от кеша (бързо, работи и офлайн), плюс тихо
    // опресняване във фонов режим за следващия път.
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const networkPromise = fetch(req).then(resp => {
        if(resp && (resp.ok || resp.type === 'opaque')) cache.put(req, resp.clone());
        return resp;
      }).catch(() => null);
      return cached || (await networkPromise) || Response.error();
    })());
  }
});
