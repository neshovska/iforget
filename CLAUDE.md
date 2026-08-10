# IForget

Progressive Web App за бележки, изцяло на български. Живо на
**https://iforget.eu** (и стар адрес `neshovska.github.io/iforget/`, който
автоматично пренасочва, стандартно поведение на GitHub Pages при потвърден
custom domain).

Собственик/потребител: физическо лице, основно на iPhone/iPad. Комуникацията
за развитие на приложението е на български.

## Технически стек

- **Единствен файл `index.html`** (~2300 реда) — цялото приложение: HTML +
  `<style>` + `<script>`, без build стъпка, без npm зависимости за самото
  приложение.
- **Деплой:** GitHub Actions → GitHub Pages (workflow `static.yml`,
  тригър при push към `main`). Custom domain `iforget.eu` е свързан през
  `CNAME` файла + DNS записи в SuperHosting.
- **Firebase Auth** — вход само с имейл + парола (нарочно БЕЗ Google Sign-In,
  за да не се показва `firebaseapp.com` вместо `iforget.eu` при OAuth екран).
  Проект: `iforgetbg`.
- **Firestore** — облачно съхранение на бележките, `users/{uid}` документ на
  акаунт; security rules изискват `request.auth.uid == userId`.
- **localStorage** — локален кеш за мигновен старт/офлайн (`loadLocalCache()`
  преди Firebase да потвърди сесия), после презаписан от `loadFromCloud()`.
- **`reset-password.html`** — самостоятелна страница за забравена парола на
  `iforget.eu` домейна (вместо Firebase-овия hosted домейн); изисква ръчно
  "Customize action URL" в Firebase Console → Auth → Templates.

## Модел на данните

Бележка:
```
{ id, text, status: 'open'|'progress'|'done', createdAt, completedAt, tag, reminderAt, reminderRepeat: null|'daily'|'weekly', color: null|hex, subs: [] }
```
Подбележка: същата форма, но без собствен `tag` (само основните бележки имат
tag-picker в интерфейса).

Резервиран таг `deleted` = кошче (soft delete, виж по-долу) — не е обикновен
потребителски таг.

Firestore документ `users/{uid}` също съдържа `tagOrder: string[]` — редът на
потребителските тагове в реда с категории (виж `saveTagOrder()`), отделно
поле от `notes`, записва се само при разместване, не при всяка промяна на
бележка.

## Основни функции (към момента)

- **Статус на бележка** — кръгчето/dot вече САМО превключва open ⇄ прогрес
  (тап отново маха "в прогрес" обратно на активна, `cycleStatus()`); НЕ
  слага "завършено" повече и е no-op върху вече завършена бележка —
  "завършено" се задава (и е достижимо) единствено чрез swipe надясно
  (`markDoneBySwipe()`, сам управлява `completedAt`), по изрична заявка.
  Цветно кръгче + текстов статус до датата (само при прогрес/завършено,
  датата е винаги първа, статусът е веднага след нея). В главния списък
  (`render()`) само "Приключени" излизат в отделна секция най-горе, извън
  обичайния поток; "В прогрес" и активните (open) стоят ЗАЕДНО в един общ
  хронологичен поток, без разместване помежду им — само статус-точката на
  всяка бележка ги отличава визуално (за да не се "чупи" хронологията при
  смяна на статус на в-прогрес).
- **Подредба на картата (по подразбиране, "за дясна ръка")** — дата
  (+статус текст) горе в началото (вляво); кръгчето за статус вдясно, до
  края на текста; таг + "+ добави подбележка" + разгъни/скрий — накуп долу
  вдясно, в края на текста. Индентът на подбележките си остава вляво
  (непроменен), но кръгчето/датата вътре в тях са огледални както основната
  бележка. Оригиналната (преди-огледална) подредба е достъпна веднага чрез
  включване на "Режим за лявата ръка" в профила — вижте коментара над
  `.note-top`/`.note-main`/`.note .meta` в `<style>` за точните CSS
  стойности, ако потребителят поиска пълно връщане назад по подразбиране.
- **Подбележки** — "+ добави" в мета реда на основната бележка; визуално
  вложени с лява рамка-индикатор; малко по-голямо разстояние (16px) след
  цялата група преди следваща самостоятелна бележка (`.note-wrap:has(.subs)`).
- **Тагове/категории** — вградени "Лични"/"Работни" + произволни
  потребителски тагове + скрит таг "Satori" (само за акаунт
  `neshovska@yahoo.com`, виж `SATORI_EMAIL`) + системен таг "Изтрити"
  (кошче). Филтър от бутона с категориите горе в topbar-а (`renderCatRow()`).
  Фиксиран, НЕразместваем ред в началото: Всички → В прогрес (бърз филтър
  по СТАТУС, не по таг — `PROGRESS_FILTER`, филтрира всички "в прогрес"
  бележки независимо от тага им; най-отпред сред истинските филтри, по
  изрична заявка) → Работни → Лични → Satori (ако е приложимо) → Изтрити
  (винаги видим, дори празно кошче — закачен като останалите, не се крие).
  След това потребителските тагове —
  тези МОГАТ да се разместват с дълго натискане (~480ms) + провлачване
  (`attachCatRowDrag()`), редът се пази в `tagOrder` (localStorage +
  Firestore `users/{uid}.tagOrder`, синхронизиран между устройства, виж
  `saveTagOrder()`/`orderedCustomTags()`).
  ВАЖНО за тъч устройства: обикновеният тап (филтриране) за потребителските
  тагове се обработва РЪЧНО на `pointerup` в `attachCatRowDrag()`, НЕ през
  нативния `click` — `touch-action:none` (нужен за самото провлачване) спира
  браузъра да синтезира `click` след допир на iOS Safari. CSS-ът за тези
  чипове има и `-webkit-touch-callout:none`/`-webkit-user-select:none`, за
  да не открадне iOS собствения си дълъг-натиск (callout/избор на текст)
  жеста преди нашия таймер.
- **Кошче (soft delete)** — изтрита бележка/подбележка получава таг
  `deleted` и виси 10 дни (`TRASH_RETENTION_MS`, чисти се с
  `purgeExpiredTrash()` при всяко зареждане), откриваема от филтъра
  "Изтрити" горе. Смяна на тага ѝ (тап върху тагчето) я връща обратно.
  Изтрита подбележка се "изважда" от родителя си като самостоятелна
  бележка в кошчето (данните не се губят, само вложеността).
- **Swipe жестове** — надясно = директно завършено, наляво = изтрито
  (soft delete) с 2.5 сек Undo тост + опит за haptic feedback
  (`navigator.vibrate` — не работи в Safari iOS, но безобидно другаде).
- **Long-press меню** (~480ms задържане без движение) — Редактирай /
  Добави подбележка / Цвят / Напомняне / Сподели / Изтрий. Постоянните
  бутони молив/кошче са премахнати от картите — редакция е през ДВОЕН
  тап/клик върху текста (умишлено не единичен, за да не се влиза случайно
  в редакция докато четеш/скролваш), swipe, или това меню.
  **"Цвят" и "Напомняне" са ВРЕМЕННО скрити от обикновените потребители**
  (по изрична молба) — видими САМО в админ профила (`isSatoriUser()`,
  `neshovska@yahoo.com`), докато не се реши кога/как да се пуснат за
  всички (виж плана за free/premium разделение по-долу). Гейтинг на 3
  места в `renderCtxMenuMain()`/`itemRow()`: (1) самите бутони "Цвят"/
  "Напомняне" в `renderCtxMenuMain()` се рендират само `if(isSatoriUser())`
  — за обикновен потребител тия под-изгледи (`renderCtxMenuColor()`/
  `renderCtxMenuReminder()`) са физически недостижими (няма бутон, който
  да ги отвори); (2) `noteColorAttr()` връща празен низ и когато
  `item.color` Е зададен, ако `!isSatoriUser()` — за да не прозира стар/
  останал цвят от преди скриването; (3) значката за напомняне в
  `itemRow()` също проверява `isSatoriUser()`, не само `item.reminderAt`.
  **За админ профила ВИНАГИ всичко е отключено** — това е общото правило
  занапред за всякакви бъдещи free/premium ограничения, не само за тия
  две функции (потвърдено изрично от потребителя).
- **Повтарящи се напомняния** (`item.reminderRepeat: null|'daily'|'weekly'`,
  чипове "Никога/Всеки ден/Всяка седмица" във формата за напомняне,
  `renderCtxMenuReminder()`) — избраното се пази в локална `selectedRepeat`
  променлива, докато формата е отворена, записва се в `item` чак при
  "Запази". Значката на картата показва малка repeat иконка до датата/часа,
  ако е зададено повторение (`ICONS.repeat`). `reminderOccursOnDate()`
  генерира занапред всички дни, в които даден реминдър реално ще се
  повтори (daily = всеки ден от старта нататък; weekly = същия ден от
  седмицата) — ползва се от `calendarRemindersCountForKey()`, за да
  "изгрее" повтарящо се напомняне на ВСЕКИ бъдещ ден в календара, не само
  на първоначалната дата.
- **Личен цвят на бележка** ("Цвят" в long-press менюто,
  `renderCtxMenuColor()`, `item.color`) — маркира само конкретната
  бележка/подбележка, палитра СЪЩАТА като `PROFILE_COLORS` в профила (за
  консистентност). Рендира се като полупрозрачен `background-image`
  градиент (`--nc` custom property, виж `noteColorAttr()`/`hexToRgb()`)
  ВЪРХУ съществуващия `background-color`, никога не го замества — затова
  автоматично уважава и плътния, и прозрачния (glass) режим без отделни
  правила за всяка комбинация. ВАЖНО: всички background правила на
  `.note`/`.subs .note` затова ползват `background-color`, никога голия
  `background` shorthand (той би нулирал `background-image`). Плътността на
  тона е различна в двата режима — `.4` в плътен, `.25` в glass
  (`html.glass-notes .note[data-colored]`, по-ниска по изрична заявка "да е
  малко по-прозрачен"); важи автоматично и за подбележките, без отделно
  правило (същият `.note[data-colored]` селектор съвпада навсякъде).
- **Търсене** — по текст (кирилица⇄латиница транслитерация,
  `toLatin()`/`textMatches()`) и по дата (ISO, дд.мм, ден от седмицата,
  "днес"/"вчера" и т.н., `dateMatches()`).
- **Streak брояч** — пламъче+число до заглавието "IForget", поредни дни с
  поне 1 завършена бележка (по `completedAt`, не `createdAt`), виж
  `computeStreak()`.
- **Pull-to-refresh анимация** — чисто декоративна (искряща SVG иконка при
  дърпане надолу на върха на списъка), НЕ презарежда никакви данни.
- **Home Screen quick-add** — `manifest.json` shortcut отваря приложението
  директно с фокус върху полето за нова бележка (`?quickadd=1`).
- **"Сподели към IForget"** (Web Share Target, `share_target` в
  `manifest.json` + `maybeHandleShareTarget()`) — текст/линк, споделен от
  друго приложение, попада предварително попълнен в полето за нова
  бележка (НЕ се записва автоматично). Работи само на Android/Chrome при
  инсталирано приложение — iOS Safari няма поддръжка за тази функция при
  уеб приложения.
- **Личен седмичен/месечен преглед** ("Твоят преглед" в профила,
  `renderMyReview()`) — за ВСЕКИ потребител (за разлика от админ
  статистиката): "завършени X от Y" основни бележки за текущата
  седмица/месец, прогрес лента за всеки период, плюс streak-а
  (`computeStreak()`) накрая.
- **Календарен изглед** ("Календар" в профила, `renderCalendarView()`) —
  седмица (понеделник–неделя), месец или година, превключваеми с табове, с
  навигация напред/назад. Дните преди днес показват броя добавени основни
  бележки за деня; днес и напред показват броя зададени напомняния
  (`reminderAt`, на основни бележки и подбележки) — сиво = бележки, златно =
  напомняния (виж легендата под изгледа). Годишният изглед е СЪЩАТА решетка
  като месечния (споделена `monthGridHtml()` функция), просто 12 пъти една
  под друга в скролваем контейнер (`.year-scroll`) — по изрична заявка на
  потребителя, НЕ отделен компактен heatmap стил (такъв имаше по-рано,
  премахнат). Отваря се скролнат директно на текущия месец, ако се показва
  текущата година. `localDateStr()` (локален, не UTC базиран дата-ключ) се
  ползва навсякъде тук — виж коментара в кода защо `dateStr()` (UTC) чупи
  "днешния ден" в часови зони пред UTC.
- **Дълъг текст** — свит на 2 реда по подразбиране (`-webkit-line-clamp`),
  "покажи"/"скрий" бутон се появява само ако текстът реално прелива.
- **Тема** — тъмна (по подразбиране) / светла "Капучино" палитра
  (`:root[data-theme="light"]`), превключвател в topbar-а, пази се в
  localStorage.
- **Език** — 5 езика (bg/en/ru/de/es, `STRINGS.<code>`, `t()` helper),
  падащо меню (`openLangPicker()`) вместо просто превключване.
- **Фон** — ginkgo листа (реални снимки на потребителя, `bg-dark.jpg`/
  `bg-light.jpg`), директно като `body` background-image, тайлват се.
- **PWA** — собствена икона (ginkgo лист), `manifest.json`,
  `apple-touch-icon.png`, инсталируемо на Home Screen.
- **Export/Import резервно копие** (Настройки панел) — JSON файл, ръчна
  застраховка отделно от Firestore синхронизацията.
- **Потвърждение на имейл** — при регистрация се изпраща верификационен
  линк (`sendEmailVerification()`). Ненатрапчив банер (`#verifyBanner`,
  `updateVerifyBanner()`) се показва под topbar-а, докато
  `currentUser.emailVerified` е false — НЕ блокира приложението, само
  напомня, с бутон "изпрати пак" (60 сек охлаждане, `resendVerifyEmail()`).
- **Политика за поверителност / Общи условия** (`privacy.html`/`terms.html`)
  — самостоятелни статични страници, само bg+en (таб-превключвател горе),
  свързани от входния екран (`.auth-legal-links`) и от профил менюто.
  Чернова, писана добросъвестно, но **не е юридическа консултация** — при
  реално масово пускане е добре да мине преглед от юрист/счетоводител
  (особено GDPR детайлите — данни на администратора, приложимо право).
- **Обратна връзка** — бутон в профила, `mailto:` към `SUPPORT_EMAIL`
  (в момента същият имейл като админ статистиката — виж дали иска отделен
  support адрес по-нататък).
- **Меню на профила — акордеон с 4 разгъващи се групи, не плосък списък
  от ~13 реда и НЕ drill-down (подмяна на целия панел).** `renderProfileMenu()`
  показва имейл + цветове + 4 групови заглавия (Изглед/Данни/Акаунт/Помощ,
  генерирани през `profileGroupBlock(key, icon, label, innerHtml)`), всяко
  със стрелка `ICONS.chevronDown` вдясно (`.action-chev`), СОЧЕЩА НАДОЛУ по
  подразбиране. Клик на заглавие разгъва съдържанието му (`.group-content`)
  НА МЯСТОТО, под самото заглавие — останалите групи се избутват надолу,
  `.action-chev` се завърта на 180° (`.action-chev.open`). Само ЕДНА група
  е отворена наведнъж (акордеон) — клик на друго заглавие затваря текущо
  отворената и отваря новата; клик на СЪЩОТО заглавие просто я затваря.
  Разпределение: **Изглед** = прозрачни бележки + лява ръка; **Данни** =
  Твоят преглед/Календар/Експорт/Импорт/Статистика (админ); **Акаунт** =
  смяна на парола/имейл + Изход/Изтриване на профила (danger бутоните,
  преди отделни в дъното на плоското меню, сега вътре в тази група);
  **Помощ** = Обратна връзка + Поверителност/Общи условия. Линковете
  "Поверителност"/"Общи условия" в Помощ са по ситен шрифт (`.small-link`,
  `font-size:10px`, `font-weight:400`) по изрична молба — по-малко визуално
  тегло от истинските действия. Текстът им е златист (`.small-link
  .action-label{color:var(--gold);}`), но ИКОНИТЕ им НЕ — остават сиви/
  приглушени (наследяват `var(--text-dim)` от `.small-link`, защото иконата
  е "брат" елемент на `.action-label`, не негово дете) — по изрична молба
  само текстът да е златист, не и иконата.
  **Шрифт/еднолинейни етикети** (по изрична молба): базовият `font-weight`
  на `.profile-panel button.action, .profile-panel a.action` е 500 (не
  600 — по-тънък). Панелът е `width:254px` (от 230px) и отстъпът на
  редовете вътре в група е `padding-left:22px` (от 30px) — освободено
  място, за да се събира максимално изречение на ЕДИН ред. Самият текст на
  всеки бутон е обвит в `<span class="action-label">` (помощна функция
  `L(text)` в `index.html`, ползвана и от `profileGroupBlock()`) — ТОЧНО
  този `<span>`, не целият flex контейнер на бутона, носи
  `white-space:nowrap;overflow:hidden;text-overflow:ellipsis` — иначе
  иконата/чекмарк-а/стрелката вдясно биха се свили заедно с текста. Ако
  някой бъдещ етикет е твърде дълъг дори при тази ширина — отрязва се с
  "…" вместо да чупи на 2 реда (елегантно деградиране, не бъг).
  **Отварянето/затварянето на групата при клик е ПРЯКА DOM манипулация
  (class toggle + `content.style.maxHeight = content.scrollHeight + 'px'`),
  НЕ re-render** — точно за да остане плавната CSS `transition:max-height`
  анимация (не може да се анимира към `auto`, затова JS-ът смята и задава
  конкретен `px`). `let profileOpenGroup` (module-level, до `profileColor`)
  пази КОЯ група е последно отворена, за да оцелее през истинските
  `renderProfileMenu()` re-render-и (смяна на цвят, toggle на прозрачни
  бележки/лява ръка, връщане от под-форма като "Смени парола") — в тия
  случаи групата се разгъва обратно МОМЕНТАЛНО, без анимация (само user
  клик анимира). Нулира се на `null` само в `closeProfilePanel()` (целият
  панел се затваря), за да тръгва свежо следващия път. Всички под-форми/
  изгледи, достъпни ОТ дадена група (`renderPasswordForm()`/
  `renderEmailForm()`/`renderDeleteAccountForm()` от Акаунт,
  `renderMyReview()`/`renderCalendarView()`/`renderAdminStats()` от Данни),
  при "Отказ"/"Назад" викат просто `renderProfileMenu()` — групата се
  разгъва автоматично обратно благодарение на `profileOpenGroup`, не се
  налага отделна логика за "коя група да отворя". Вече покритият
  `#profilePanel` `mousedown`/`stopPropagation()` фикс (виж по-долу) важи
  автоматично и за груповите заглавия — не е нужен нов код за това.

## Постоянни правила (винаги, без изключение)

- **Само SVG икони, никога emoji** за бутони/иконки в интерфейса (виж
  `ICONS` обекта в `index.html`) — emoji изглежда различно на различни
  устройства/ОС версии, SVG е консистентно навсякъде. Декоративни стрелки
  в обикновен текст (напр. "активна → в прогрес") не са "икона" в този
  смисъл и са ОК. При добавяне на нова визуална иконка — винаги нов запис
  в `ICONS`, никога суров emoji символ в HTML/JS низовете.
- **Фоновата ginkgo снимка (`bg-dark-v3.jpg`/`bg-light.jpg`) трябва да е на
  `html`, НЕ на `body`.** html и body имат `height:100%` (фиксирана
  стойност, не `auto`) — при по-дълъг списък бележки съдържанието прелива
  извън собствената кутия и на двата елемента (нормално, видимо е), но
  background на елемент спира точно на неговата собствена изчислена
  височина, освен ако е на html (кореновият елемент по спецификация винаги
  покрива цялото платно на страницата, без значение колко е дълго
  съдържанието). `body` затова е БЕЗ собствен `background-color` — иначе
  плътният му цвят би скрил образа на html точно в първия екран (виж git
  history за фикса, ако това някога се разпадне отново при бъдещи промени
  в CSS-а на `html,body{...}`).
- **Позициониране на плаващи панели (tag-picker/ctx-menu/lang-picker) спрямо
  екранната клавиатура: НИКОГА само `window.innerHeight`.** На телефон
  клавиатурата НЕ смалява `window.innerHeight` — само `window.visualViewport
  .height`/`.offsetTop` реално отразяват видимата зона над клавиатурата.
  Панел, позициониран само спрямо `innerHeight`, може да увисне (частично
  или изцяло) зад клавиатурата, недостижим — виж `visibleViewportBox()` в
  `index.html` (ползвана от `positionTagPicker()`) и слушателя за
  `visualViewport`-а `resize` събитие, нужен ЗАЕДНО с проверката — самата
  проверка веднъж при отваряне не стига, трябва да следи и последващото
  отваряне на клавиатурата (напр. тапване на полето за нов таг СЛЕД като
  picker-ът вече е отворен).
- **Бутони ВЪТРЕ в #ctxMenu/#profilePanel, които подменят innerHTML НА
  МЯСТО (панелът остава отворен, само превключва изгледа — напр. "Цвят"/
  "Напомняне"/"назад" в ctx-менюто, "Твоят преглед"/"Календар" в профила),
  ЗАДЪЛЖИТЕЛНО се нуждаят `#ctxMenu`/`#profilePanel` да имат собствен
  `mousedown` слушател с `e.stopPropagation()` (виж го точно преди
  глобалния "затвори при клик отвън" `document` слушател).** Причина:
  подмяната на `innerHTML` прави оригиналния `e.target` DETACHED от
  документа В СЪЩИЯ момент, докато СЪЩОТО mousedown събитие все още
  "изкачва" (bubble) към `document` — глобалният outside-click слушател там
  проверява `panel.contains(e.target)`, а за detached възел това връща
  `false` (все едно кликът е бил ИЗВЪН панела) → погрешно затваря панела
  веднага след като той тъкмо е превключил изгледа. Реален бъг, хванат
  точно с "Цвят" бутона — тапваш го и веднага се връща на бележката, вместо
  да покаже кръгчетата за избор.

## Известни ограничения

- `navigator.vibrate()` не работи в Safari iOS (Apple, native-only) —
  извиква се навсякъде безобидно, реално вибрира само на Android/Chrome.
- Home Screen quick-add shortcut изисква по-нова iOS Safari версия за
  пълна поддръжка на manifest `shortcuts`.
- `share_target` (Web Share Target) изобщо не се поддържа от iOS Safari за
  уеб приложения — само Android/Chrome. На iPhone/iPad ще проработи само
  ако IForget стане native приложение в App Store.
- `:has()` CSS селектор (използван за разстоянието след група с
  подбележки) изисква Safari 15.4+/iOS 15.4+.
- Няма build/test pipeline.

## Работен процес при промени

1. `git pull -q origin main` в локалния клонинг преди всяка промяна.
2. Редакция на `index.html` (и/или `manifest.json` и др.).
3. Проверка на JS синтаксиса преди push — извличане на съдържанието между
   `<script>...</script>` и `node --check` върху него (регекс екстракция,
   не има отделен `.js` файл в repo-то).
4. `git add -A && git commit -m "..." && git push -u origin main`.
5. Изчакване ~20 сек и проверка на GitHub Actions run-а за
   `conclusion:"success"`, преди да се докладва успех на потребителя.
6. Отговор винаги на български, с препратка към живия адрес
   `https://iforget.eu` и напомняне за hard refresh (кешът на браузъра/PWA
   понякога пази старата версия).

Всяка промяна на UI/UX се комуникира и потвърждава на български — user-ът
пише с чести правописни грешки/фонетична транслитерация, но намеренията
обикновено стават ясни от контекста; при истинска неяснота — питай.

## Брандиран линк за забравена парола — ДЕПЛОЙНАТО И РАБОТЕЩО (потвърдено)

Домейн верифициран в Resend (SuperHosting.bg DNS: DKIM/SPF/MX/DMARC
записи), `RESEND_API_KEY` secret зададен, `firebase deploy --only
functions,firestore:rules` мина успешно, реален тест през "Забравена
парола?" на iforget.eu потвърди — писмото идва от `noreply@iforget.eu`.
(Ако тестваш пак и видиш стар подател — кеширана страница в браузъра,
hard refresh `Cmd+Shift+R` решава, не е бъг в кода — вече се е случвало.)

Firebase-генерираните reset линкове винаги сочат към `*.firebaseapp.com`
(iforget.eu е на GitHub Pages, не Firebase Hosting, затова Console
"Action URL" настройката не помага). Решението — Cloud Function, точно
както е в `neshovska/glowtrack` (`functions/index.js:sendBrandedPasswordReset`,
виж го там за пълния rationale/коментари) — е написано и в тоя repo, но
разликата с glowtrack: **изпраща през Resend (HTTP API), не през SMTP/
nodemailer**, защото имейлът е Resend (`noreply@iforget.eu`, само за
изпращане, "Enable Receiving" изключено нарочно), не пълна Zoho кутия.

**Файлове в repo-то** (нови): `functions/index.js` (самата функция),
`functions/package.json`, `functions/.eslintrc.js`, `firebase.json`,
`.firebaserc` (project ID `iforgetbg`), `firestore.rules` (добавен нов
блок за `password_reset_throttle` — `allow read, write: if false;`,
достъпна само от Admin SDK, никога от клиента).

**Логика на `sendBrandedPasswordReset`** (`onCall`, region `europe-west1`
— трябва да съвпада с клиентския `firebase.app().functions('europe-west1')`
в `index.html`, иначе compat SDK търси в `us-central1` и хвърля not-found):
1. Anti-abuse throttle (Firestore транзакция, `password_reset_throttle`
   колекция) — 3/час per имейл + 20/минута общо, проверено ПРЕДИ
   `generatePasswordResetLink`, за да важи и за несъществуващи имейли.
2. `admin.auth().generatePasswordResetLink(email, {url:'https://iforget.eu/'})`
   → извлича `oobCode`-а от резултата → строи
   `https://iforget.eu/reset-password.html?mode=resetPassword&oobCode=...`
   (`reset-password.html` вече съществуваше в repo-то отпреди, приема
   точно тия параметри — не е пипана).
3. Изпраща през `fetch('https://api.resend.com/emails', ...)` с `Authorization:
   Bearer <RESEND_API_KEY secret>`, `from: 'IForget <noreply@iforget.eu>'`.
4. **Винаги връща `{ok:true}`**, дори за несъществуващ имейл/throttled
   заявка (anti-enumeration — клиентът не може да различи "имейлът не
   съществува" от "успешно изпратено"). `index.html:handleForgotPassword()`
   вече е обновена да вика тази функция (`functionsInstance.httpsCallable(
   'sendBrandedPasswordReset')`) вместо стария `auth.sendPasswordResetEmail()`.

Всички стъпки по-долу вече са изпълнени от потребителя (запазено само за
референция, ако функцията трябва да се пре-деплойва след бъдещи промени
в `functions/index.js`):
1. `firebase login` + `firebase use iforgetbg` (локално, на компютъра ѝ).
2. `firebase functions:secrets:set RESEND_API_KEY` (НИКОГА не се пише в
   repo-то/код — secret е в Google Cloud Secret Manager).
3. `firebase deploy --only functions,firestore:rules`.
4. Реален тест — потвърдено работещо.

## Premium/Stripe инфраструктура — ПОДГОТВЕНА, но НЕВИДИМА за реални потребители

По изрична молба: "искам да имам всички опции подготвени, после кто
реша да пускам плащане само активирам и готово, но за момента ще
мъчим безплатно да видим колко ще се вържат." Целта: целият платежен
път е написан и работи, но е напълно скрит/неактивен, докато
потребителят изрично не "щракне ключа" — БЕЗ redeploy на код, само
промяна на един Firestore документ.

**Главният ключ** — `config/premium` документ във Firestore, поле
`enabled: boolean`. Публично четим (`allow read: if true`), пишем
САМО ръчно от Firebase Console (rules забраняват клиентски write).
Ако документът изобщо не съществува (сегашното състояние — никой не
го е създавал още), `loadPremiumConfig()` в `index.html` третира това
като `enabled: false` — т.е. **не е нужно нищо да се създава предварително,
Premium е скрит по подразбиране без никакво действие**. За да "активира"
Premium занапред, потребителят просто създава/редактира тоя документ
в Firebase Console → Firestore → `config/premium` → `enabled: true`.

**Ценообразуване** (потвърдено с потребителя): Месечен €2.99/месец +
Годишен €19.99/година (-44% спрямо 12×месечен), и двата с вграден
14-дневен безплатен trial (конфигуриран в `subscription_data.trial_period_days`
на самата Checkout Session, не в Stripe Product-а — картата се пази при
подписване, но не се таксува до края на 14-те дни).

**Клиентска логика (`index.html`)**:
- `let premiumLaunched` — зареден веднъж при старта на апа (`loadPremiumConfig()`,
  извикана от init секцията долу до `requestPersistentStorage()`), НЕЗАВИСИМО
  от логин статус.
- `let userIsPremium` — зареден от `entitlements/{uid}` при всеки успешен
  логин (`loadEntitlement()`, извикана от `auth.onAuthStateChanged()` ПРЕДИ
  `loadFromCloud()`), нулиран на `false` при логаут/смяна на акаунт.
- `function hasAdvancedFeatures(){ return isSatoriUser() || userIsPremium; }`
  — заменя старите директни `isSatoriUser()` проверки за Цвят/Напомняне (3
  места: бутоните в `renderCtxMenuMain()`, `noteColorAttr()`, значката за
  напомняне в `itemRow()`). **Админ профилът винаги минава, независимо от
  реален Stripe статус** — общото правило от по-рано в документа. Чисто
  административни неща (Статистика, Satori таг) си остават `isSatoriUser()`
  директно — НЕ минават през `hasAdvancedFeatures()`, не са Premium функции.
- `renderProfileMenu()` показва (само ако `premiumLaunched && !isSatoriUser()`):
  ако `userIsPremium` → злат бадж "Premium активен"; иначе → злат бутон
  "Ъпгрейд до Premium" (`data-action="premium-upgrade"`) → `renderPremiumPlans()`.
- `renderPremiumPlans()` (нов, до `renderDeleteAccountForm()`) — 2 бутона
  (месечен/годишен), вика `createCheckoutSession` Cloud Function, редиректва
  към `session.url` (Stripe-хостнатата Checkout страница — картата НИКОГА
  не минава през нашия код).
- CSS gotcha (документиран директно в CSS коментар): `.profile-panel .premium-cta`
  (2 класа) губи от по-специфичното `.profile-panel button.action` (тип+2 класа)
  — трябва `.profile-panel button.action.premium-cta` (3), същия капан като
  `.action.danger` по-горе. Ценовите бутони (`.premium-plans .action-label`)
  изрично РАЗРЕШАВАТ чупене на 2 реда (override на глобалния nowrap+ellipsis)
  — по-добре 2 реда, отколкото да изчезне "-44%" зад "...".

**Сървърна логика (`functions/index.js`)**:
- `stripeSecretKey`/`stripeWebhookSecret` — Firebase secrets (`firebase
  functions:secrets:set STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`).
- `stripePriceMonthly`/`stripePriceYearly` — `defineString` params (Price
  ID-та от Stripe Dashboard, не са тайни, но не са hardcode-нати).
- `createCheckoutSession` (onCall) — създава Stripe Checkout Session,
  пази `firebaseUid` И като `client_reference_id` (за `checkout.session.completed`),
  И като `subscription_data.metadata.firebaseUid` (за по-късни
  `customer.subscription.*` събития, които нямат checkout контекст).
- `createBillingPortalSession` (onCall) — Stripe Customer Portal, за да
  може платен потребител сам да управлява/отказва абонамента си (изисква
  вече записан `stripeCustomerId` в `entitlements/{uid}`).
- `stripeWebhook` (onRequest, HTTP ендпойнт — Stripe вика директно, не
  през httpsCallable) — слуша `checkout.session.completed` (първо
  плащане → `entitlements/{uid}.premium = true`) и `customer.subscription.
  updated`/`.deleted` (подновяване/отказ → update спрямо `sub.status`).
  Използва `req.rawBody` (гарантирано от Firebase Functions framework-а)
  за проверка на `stripe-signature` хедъра — НЕ пипай body-parsing-а тук.
  URL за Stripe Dashboard → Webhooks: `https://europe-west1-iforgetbg.
  cloudfunctions.net/stripeWebhook`.

**Firestore rules** — `config/premium` (публично четим, `allow write:
if false`), `entitlements/{uid}` (четим само от собственика, `allow
write: if false` — САМО `stripeWebhook` през Admin SDK пише тук; иначе
всеки логнат клиент би могъл директно да си самозапише `premium:true`).

**Остава (действие от потребителя, когато реши да активира, не сега)**:
1. Създай Stripe акаунт (ако няма) + Products/Prices (Monthly €2.99,
   Yearly €19.99) в Stripe Dashboard.
2. `firebase functions:secrets:set STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`.
3. При `firebase deploy` ще попита за `STRIPE_PRICE_MONTHLY`/`STRIPE_PRICE_YEARLY`
   (Price ID-тата от стъпка 1) — или зададени предварително през `.env.iforgetbg`.
4. Stripe Dashboard → Webhooks → добави ендпойнта отгоре, копирай
   webhook signing secret-а → `STRIPE_WEBHOOK_SECRET`.
5. `firebase deploy --only functions,firestore:rules`.
6. Тест с истинска (или Stripe test mode) карта.
7. Firestore Console → създай `config/premium` документ, `enabled: true` —
   това е реалното "активиране", без нищо друго.

## Capacitor обвивка (App Store/Google Play) — СКЕЛЕТЪТ Е ГОТОВ

Избран **Вариант А** (вградено съдържание, не WebView към живия сайт —
виж дискусията в чата) — по-прост, по-безопасен спрямо Apple ревю риска
"просто уебсайт в рамка", но означава промени в кода изискват нов build +
ново App Store/Play качване, за разлика от сайта/PWA (виж съответния
раздел по-долу за пълния rationale).

**Структура** (ново в repo root-а, ОТДЕЛНО npm проектче от `functions/`):
- `package.json`/`package-lock.json` — Capacitor CLI + platform пакети
  (`@capacitor/core`/`android`/`ios`/`cli`, всички `^8.0.0`, последна
  major версия към момента на setup-а).
- `capacitor.config.json` — `appId: "eu.iforget.app"` (reverse-domain на
  iforget.eu — bundle ID, **трудно сменяем след първо публикуване в
  магазините**, тъй като слага акцент), `appName: "IForget"`,
  `webDir: "www"`, `backgroundColor` съвпада с `manifest.json`-а,
  `server.androidScheme: "https"` (ВАЖНО — не default `file://`; Firebase
  Auth и други web API-та се държат различно/понякога чупят под `file://`
  origin, `https` scheme избягва това).
- `scripts/sync-www.js` — копира runtime файловете (index.html,
  manifest.json, privacy/terms.html, икони, фонови снимки — НЕ
  reset-password.html, firebase.json, CLAUDE.md и т.н.) от repo root-а в
  `www/` (git-игнориран, генериран, виж `.gitignore`). IForget няма build
  стъпка (чист статичен сайт) — това е просто копиране, не транспилация.
- `android/` и `ios/` — нативните проекти (Capacitor scaffold), **СЕ
  комитват** (стандартна Capacitor практика — нативния код/конфигурация
  живее тук, не се пресъздава от нулата всеки път). Build артефактите
  (Gradle `build/`, iOS `Pods/`/`DerivedData/`) СА игнорирани.
  - **iOS ползва Swift Package Manager** (Capacitor 8 default,
    `ios/App/CapApp-SPM/`), НЕ CocoaPods — няма `Podfile`, значи няма
    нужда от `pod install` стъпка преди Xcode (по-просто от по-стари
    Capacitor туториали, които всички споменават CocoaPods).
  - Изтрит нарочно: Android `androidTest`/`test` boilerplate папките
    (Capacitor template default) — съдържаха счупен placeholder тест
    (`assertEquals("com.getcapacitor.app", ...)`, грешен package name,
    никога нямаше да мине) — безобиден (не участва в нормален build),
    но подвеждащ, махнат за чистота.

**Работен процес за бъдещи промени** (след като нещо се смени в
`index.html` и трябва да стигне до нативния апп):
```
npm run open:android  # sync + отваря Android Studio
npm run open:ios      # sync + отваря Xcode
```
`open:android`/`open:ios` вече вкарват `npm run sync` вътре в себе си
(поправено — реален бъг, засегна първия ѝ опит: `android/
capacitor-cordova-android-plugins/` папката е auto-generated от `cap
sync`, но `android/.gitignore` (генериран от Capacitor, не мой файл) я
игнорира изрично — на чисто клонирано repo тя просто не съществува,
докато не се пусне `cap sync` поне веднъж; отварянето директно с "npx
cap open android" преди sync гърмеше с "Could not read script
.../cordova.variables.gradle"). Ако само трябва пресинхронизиране без да
се отваря IDE — `npm run sync` самостоятелно.
После обичайният native build/archive/upload flow във всеки IDE.

**Остава (изисква Mac/Android Studio, не мога аз да го направя тук —
Linux sandbox, няма Xcode):**
1. `git pull` на repo-то на компютъра ѝ, `npm install` в root-а (не в
   `functions/` — различен проект).
2. **Android**: отвори `android/` в Android Studio (`npm run open:android`
   след `npm install`) — трябва да работи "as is" за debug build.
   Истинска иконка/splash screen (сега е Capacitor default placeholder,
   не IForget брандинг) — през Android Studio Asset Studio, или
   `@capacitor/assets` CLI пакет (не инсталиран още, по избор).
3. **iOS**: отвори `ios/App/App.xcodeproj` в Xcode (`npm run open:ios`)
   — Swift Package Manager ще resolve-не автоматично при отваряне (не е
   нужен ръчен `pod install` при тоя setup). Иконка/splash — аналогично,
   през Xcode Asset Catalog.
4. Developer акаунти (все още не са регистрирани, доколкото знам):
   Apple Developer Program ($99/година), Google Play Console ($25
   еднократно) — нужни за реално подписване/качване в магазините.
5. Тъй като първото пускане е изцяло безплатно (виж Premium раздела
   по-горе — Stripe инфраструктурата е готова, но невидима), **не е нужна
   никаква IAP/StoreKit/Play Billing интеграция за това първо качване** —
   значително по-малко работа за старт. IAP интеграция ще стане отделна,
   по-късна задача САМО ако в бъдеще решиш да продаваш Premium И вътре в
   нативния апп (алтернатива: продавай Premium само през сайта — виж
   дискусията в чата за компромиса "IAP такса на Apple/Google" срещу
   "по-малко seamless за app потребителите").

## Планирани задачи (за после, не сега)
- **Споделени бележки/тагове между няколко акаунта** (напр. споделен
  списък за пазаруване или общи задачи, редактируем от повече от един
  човек). В момента архитектурата е строго лична — `users/{uid}` документ
  с бележки, security rules позволяват четене/писане само на собственика;
  никой друг акаунт не вижда чужди данни. Реалистичен обхват (без нужда от
  Cloud Functions/Blaze):
  - Нова колекция `sharedLists/{listId}` с масив `memberEmails` — security
    rules позволяват четене/писане на всеки, чийто вход-имейл присъства в
    масива (Firestore проверява директно от auth токена, без сървър).
  - Покана с имейл адрес (просто добавяне в `memberEmails`).
  - Синхронизация при обновяване на екрана (както сега), или с realtime
    listener (`onSnapshot()` вместо еднократен `.get()`) за по-плавно
    виждане на промените на другите почти веднага — умерена промяна в кода.
  - **НЕ** включва истинско едновременно писане буква по буква (като Google
    Docs) — това изисква съвсем различна технология (operational
    transforms/CRDT) и е отделна, много по-голяма задача, извън обхвата тук.
  Съзнателно отложено — не блокира нищо в сегашното приложение.

## Преди масово пускане — какво е готово vs. какво остава за потребителя

Направено в кода (не изисква нищо допълнително от потребителя):
- Потвърждение на имейл при регистрация (банер + resend).
- Политика за поверителност / Общи условия (`privacy.html`/`terms.html`),
  свързани от входния екран и профила.
- Бутон "Обратна връзка" (mailto) в профила.

Изисква действие от потребителя извън repo-то (не мога да го направя вместо
нея — няма Firebase CLI/Console API достъп в тази среда):

1. ~~**Firebase план → Blaze**~~ — **НАПРАВЕНО** (потвърдено от потребителя).
   Отключва Cloud Functions/Storage за в бъдеще (снимки, брандиран линк за
   забравена парола).
2. ~~**Публикуване на финалните Firestore security rules**~~ — **НАПРАВЕНО**
   (потвърдено от потребителя, пуснато в Firebase Console → Firestore →
   Rules → Publish). Черновата остава по-долу само за референция, ако
   правилата трябва да се редактират пак в бъдеще (напр. нова колекция за
   снимки/Storage rules).
3. **App Check / reCAPTCHA** (по избор, но препоръчително при масово
   пускане) — Firebase Console → App Check → Web apps → reCAPTCHA v3,
   за защита на формата за регистрация от ботове.
4. **Преглед на превода** на ru/de/es от носител на съответния език —
   преводите в момента са направени от мен (Клод), с грижа, но непроверени
   от носител.
5. **Преглед на privacy.html/terms.html от юрист** (по избор, но
   препоръчително) — текстовете са добросъвестна чернова, не юридическа
   консултация.

### Чернова на Firestore security rules (за т. 2 по-горе)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Собственикът чете/пише само своя документ.
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // Admin акаунтът (виж SATORI_EMAIL в index.html) чете цялата колекция
      // само за статистика — НЕ може да пише в чужди документи.
      allow read: if request.auth != null
                   && request.auth.token.email == 'neshovska@yahoo.com';
    }
  }
}
```

Ако текущите ѝ правила вече правят точно това, тази стъпка е просто
потвърждение, не промяна.
