# Текстове за App Store и Google Play

Абзаците и точките са на ЕДИН ред всеки, нарочно — магазините пазят
прекъсванията на редовете буквално, а ръчно пренесен текст изглежда
накъсан на телефон.

Готови за копиране. Броят знаци е проверен спрямо лимитите на всеки
магазин (виж `store/check-lengths.js` — пуска се с `node store/check-lengths.js`).

**Нарочно НЕ се споменава месечният цикъл.** Функцията си остава в
приложението, просто не се рекламира в магазините.

**Нарочно НЕ се обещава дълготрайно съхранение.** Приключените бележки
се прибират сами след 30 дни (виж `archiveOldCompleted()` в `index.html`)
— текст, който обещава архив, би бил некоректен.

---

## Общи

| Поле | Стойност |
|---|---|
| Име | `iForget` |
| Пакет / Bundle ID | `eu.iforget.app` |
| Категория | Продуктивност (Productivity) |
| Сайт | https://iforget.eu |
| Поверителност | https://iforget.eu/privacy.html |
| Общи условия | https://iforget.eu/terms.html |
| Поддръжка | info@iforget.eu |

---

## Български

### Подзаглавие (App Store subtitle, до 30 знака)

```
Запиши. Направи. Приключи.
```

### Кратко описание (Google Play, до 80 знака)

```
Прост списък за всеки ден — напомняния, подзадачи и календар на едно място.
```

### Промо текст (App Store promotional text, до 170 знака)

```
Списък за днешния ден, не архив за всичко. Напомняния, които звънят, подзадачи, календар и серия, която ти показва колко дни подред приключваш нещо.
```

### Пълно описание (до 4000 знака)

```
iForget е списък с бележки за всеки ден — за хора, които не искат сложна система, а просто да помнят какво имат за вършене днес.

Запиши. Направи. Приключи.

КАКВО МОЖЕ

• Три състояния на бележка — активна, в прогрес, приключена. Плъзгаш надясно за готово, наляво за изтриване.
• Подбележки — разбиваш голямата задача на стъпки, а те се подреждат сами: недовършените най-горе, готовите най-долу.
• Напомняния с час — еднократни или повтарящи се всеки ден или всяка седмица.
• Категории — Лични, Работни и твои собствени, подредени както ти е удобно.
• Календар — седмица, месец или година. Виждаш какво си добавил в миналите дни и какво те чака занапред.
• Твоят преглед — колко бележки си завършил тази седмица и този месец.
• Серия — колко дни подред приключваш поне по една бележка.
• Търсене по текст (разбира и латиница) или по дата — „вчера“, „петък“, „21.08“.
• Кошче — изтритата бележка се пази 5 дни и може да се върне на мястото си, заедно с цвета и напомнянето си.
• Цветове — маркираш важното с един поглед.
• Пет езика — български, английски, руски, немски и испански.
• Тъмна и светла тема, плюс чиста и ученическа визия.

ЗА ДЕН ЗА ДЕН, НЕ ЗА АРХИВ

iForget е направен за днешния ден, не за да събира хиляди бележки. Приключените се прибират сами след 30 дни, за да не се задръства списъкът. Серията и календарът се запазват.

ТВОИТЕ ДАННИ

Бележките ти се синхронизират между устройствата през личен акаунт с имейл и парола. Приложението работи и без интернет — писаното офлайн се качва само, щом връзката се върне. По всяко време можеш да изнесеш резервно копие във файл и да го внесеш обратно.

Въпроси и предложения: info@iforget.eu
```

### Ключови думи (App Store keywords, до 100 знака, разделени със запетая)

```
бележки,задачи,списък,напомняне,todo,notes,tasks,reminder,checklist,календар,планер,навици
```

---

## English

### Subtitle (App Store, max 30 chars)

```
Write it. Do it. Done.
```

### Short description (Google Play, max 80 chars)

```
A simple daily list — reminders, subtasks and a calendar in one place.
```

### Promotional text (App Store, max 170 chars)

```
A list for today, not an archive for everything. Reminders that actually ring, subtasks, a calendar, and a streak that shows how many days you keep finishing things.
```

### Full description (max 4000 chars)

```
iForget is a daily note list — for people who don't want a complicated system, just to remember what needs doing today.

Think less. Do more.

WHAT IT DOES

• Three states per note — active, in progress, done. Swipe right to finish, left to delete.
• Subtasks — break a big task into steps. They sort themselves: unfinished on top, completed at the bottom.
• Timed reminders — one-off, or repeating every day or every week.
• Categories — Personal, Work and your own, ordered the way you like.
• Calendar — week, month or year. See what you added on past days and what's coming up.
• Your review — how many notes you finished this week and this month.
• Streak — how many days in a row you finish at least one note.
• Search by text or by date — "yesterday", "Friday", "21.08".
• Trash — a deleted note is kept for 5 days and can be restored to its exact place, with its colour and reminder intact.
• Colours — mark what matters at a glance.
• Five languages — Bulgarian, English, Russian, German and Spanish.
• Dark and light themes, plus clean and study looks.

FOR DAY TO DAY, NOT FOR ARCHIVING

iForget is built for today, not for collecting thousands of notes. Completed notes tidy themselves away after 30 days so the list stays usable. Your streak and calendar are kept.

YOUR DATA

Your notes sync across devices through a personal account with email and password. The app works offline too — anything written without a connection uploads itself once you're back online. You can export a backup file at any time and import it back.

Questions and suggestions: info@iforget.eu
```

### Keywords (App Store, max 100 chars, comma separated)

```
notes,tasks,todo,list,reminder,checklist,planner,daily,habits,calendar,productivity,subtasks
```

---

## Какво се качва къде

### Google Play Console
- Икона: 512×512 → `icon-512.png` (в корена на repo-то)
- Feature graphic: 1024×500 → `store/banner.png`
- Телефонни снимки (мин. 2, макс. 8) → `store/screenshots/*.png`
- Кратко описание (80) + пълно описание (4000) — от секцията по-горе

### App Store Connect
- Икона: 1024×1024 → `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
- Снимки 6.7" (1290×2796) → `store/screenshots/*.png`
- Подзаглавие (30) + промо текст (170) + описание (4000) + ключови думи (100)
- App Store НЕ иска feature graphic — банерът е само за Google Play.

### И за двата
- Политика за поверителност: https://iforget.eu/privacy.html
- Възрастова категория: за всички
- Няма реклами, няма покупки в приложението (при първото пускане)

---

## ПРОВЕРИ ПРЕДИ ДА КАЧИШ

**Напомнянията трябва да са тествани на истински телефон.** Описанието
по-горе ги обещава изрично („Напомняния с час — еднократни или повтарящи
се“), а нативната част още НЕ е пускана на устройство (виж
„Напомняния — реално задействане“ в `CLAUDE.md`). Освен това
`@capacitor/local-notifications` е в `package.json`, но още не е вкаран в
нативните проекти (`android/app/capacitor.build.gradle` има празен блок
`dependencies`, `ios/App/CapApp-SPM/Package.swift` не го изброява).

Затова отваряй нативния проект САМО така:

```
npm install
npm run open:ios       # или: npm run open:android
```

И двата скрипта пускат `npx cap sync` вътре в себе си, който закача
плъгина. Отвориш ли `.xcodeproj` направо, плъгинът няма да е компилиран и
напомнянията ще мълчат — без никаква грешка, което е най-трудният вид
проблем за откриване.

Дребно за Android 12+: плъгинът си декларира сам `POST_NOTIFICATIONS`,
`RECEIVE_BOOT_COMPLETED` и `WAKE_LOCK` (проверено), значи
`AndroidManifest.xml` не се пипа. НЕ декларира `SCHEDULE_EXACT_ALARM` —
напомнянето може да звънне приблизително, не точно в минутата. Струва си
да се провери при първия тест.

## Как се правят наново

```
node store/generate.js      # 5-те снимки + банера, от истинското приложение
node store/check-lengths.js # текстовете спрямо лимитите на магазините
```
