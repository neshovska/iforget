# Отговор към App Review (Guideline 2.1 — Information Needed)

Първото подаване (23.08.2026) получи **не отказ заради бъг**, а искане за
информация: Apple иска видеозапис от реално устройство плюс писмени
отговори на 6 въпроса, преди да започне същинското ревю. Това е рутинно
за нов разработчик и нов акаунт.

**Текстът по-долу влиза на ДВЕ места:**
1. Отговор в App Store Connect → App Review → Reply (за това подаване).
2. Полето **Notes** в App Review Information — за всяко бъдещо подаване.
   Apple изрично го препоръчва в писмото; така следващия път не пита пак.

⚠️ Преди да го пратиш: попълни **модела на iPhone-а и версията на iOS** в
точка 2. Не ги измисляй и не ги оставяй празни — това е един от въпросите.

---

## Видеозаписът — какво трябва да съдържа

Записва се **на истински телефон** (не симулатор), през TestFlight, с
вградения запис на екрана на iOS (Settings → Control Center → Screen
Recording).

Един непрекъснат запис, в този ред:

1. **Стартиране на приложението** — от иконата, не от вече отворен ап.
2. **Регистрация** на нов акаунт (имейл + парола).
3. **Влизане** с акаунта.
4. Първата бележка: писане и запазване.
5. Приключване на бележка с **плъзгане надясно**.
6. Изтриване с **плъзгане наляво** + бутона "Отмени".
7. **Задържане** върху бележка → менюто → добавяне на напомняне.
8. **Разрешението за известия** — Apple изрично иска да се види всяко
   искане за достъп до чувствителни данни или устройството. То излиза
   точно при задаване на първото напомняне.
9. Календарът и "Твоят преглед" от профилното меню.
10. **Изтриване на акаунта** — Профил → Акаунт → Изтрий профила.

⚠️ **Капан при точка 10:** ако изтриеш акаунта за ревюто, ревюиращият
после не може да влезе. Или показвай екрана за изтриване, БЕЗ да
потвърждаваш, или направи трети акаунт само за да го изтриеш на запис.

Нищо не се записва от месечния цикъл — той не се рекламира и не е нужен
за ревюто.

---

## Видеото не се прикача — дава се като ЛИНК

Полето `Attachment` приема само изображения. Стандартната практика (и
приемана от ревюиращите) е видеото да се качи някъде и в отговора да се
даде линк.

**YouTube, видимост „Unlisted"** е най-сигурно. ⚠️ **НЕ „Private"** —
личното иска влизане в акаунт и ревюиращият няма да го отвори. Скритото
не се показва в търсене, но се отваря от всеки с линка.

⚠️ **Тествай линка в прозорец инкогнито, преди да го пратиш.** Линк, който
иска влизане, е най-честият начин подаването да се върне пак — със
загубени още няколко дни.

Тогава точка 1 от текста по-долу става:

```
1. SCREEN RECORDING
A screen recording captured on a physical iPhone is available here:
[ЛИНК]

It starts from app launch and covers account registration, login, creating and completing notes, swipe gestures, setting a reminder including the iOS notification permission prompt, the calendar view, and the account deletion flow.
```

---

## Текстът (на английски, за копиране)

```
Thank you for reviewing iForget.

1. SCREEN RECORDING
Attached / provided as requested. Recorded on a physical iPhone running the latest iOS, starting from app launch and covering registration, login, creating and completing notes, reminders (including the notification permission prompt), the calendar, and the account deletion flow.

2. DEVICES AND OPERATING SYSTEMS TESTED
- iPhone [МОДЕЛ], iOS [ВЕРСИЯ] — via TestFlight
- The same codebase also runs as a web app at https://iforget.eu and as an Android app, tested on a Samsung Galaxy A17 (SM-A176B), Android 16.

3. APP FUNCTION AND TARGET AUDIENCE
iForget is a simple daily to-do and notes app. It is deliberately designed for day-to-day use rather than long-term archiving: completed notes are automatically moved to the trash after 30 days.

The problem it solves: most task apps are either too simple (a flat list) or too complex (projects, boards, tags hierarchies). iForget sits in between — a single chronological list with three states (active, in progress, done), optional sub-tasks, categories, colours, and local reminders.

Core features:
- Notes with three states, changed by tapping the status dot or swiping
- Sub-notes nested under a parent note
- Categories, including a soft-delete trash with 5-day retention
- Local reminders, optionally repeating daily or weekly
- Calendar view (week / month / year)
- A weekly and monthly personal review, and a streak counter
- Search by text and by date, with Cyrillic/Latin transliteration
- Light, dark and two additional visual themes
- Interface in 5 languages: Bulgarian, English, Russian, German, Spanish

Target audience: general consumers who want a straightforward daily task list. The interface language defaults to the device language. The app is free, with no ads, no in-app purchases and no subscriptions.

4. SETUP AND ACCESS INSTRUCTIONS
The app requires an account because notes sync across devices.

Demo account (also entered in the Sign-In Information field):
  Email: [ИМЕЙЛ НА ТЕСТОВИЯ АКАУНТ]
  Password: [ПАРОЛА]

There is only one account type — there are no roles, tiers or paid levels. No sample files are needed.

On first launch a short 8-step tutorial runs automatically and points at each main feature. It can be replayed at any time from Profile → Help → Replay tutorial.

To test reminders: long-press any note (or tap an existing reminder badge), choose "Reminder", set a date and time a few minutes ahead, and save. iOS will ask for notification permission at that moment. Reminders are scheduled locally on the device and fire even when the app is fully closed.

5. EXTERNAL SERVICES USED
- Firebase Authentication (Google) — email and password sign-in only. No third-party or social sign-in is used.
- Cloud Firestore (Google) — stores each user's notes in a single document keyed by their user ID. Security rules restrict read and write access to the owner of that document.
- Firebase Cloud Functions (Google) — sends branded password-reset and email-verification messages.
- Resend — the email delivery provider used by those Cloud Functions.
- Google Fonts — web fonts for the interface.

No analytics, advertising, crash reporting or tracking SDKs are included. No payment processor is active: the app is entirely free and contains no purchase flow of any kind.

Reminders use @capacitor/local-notifications and are scheduled by the operating system on the device itself. No push notification server is involved, and no reminder data leaves the device for that purpose.

6. REGIONAL DIFFERENCES
There are none. The app behaves identically in every region. The only variation is the interface language, which follows the device language and can be changed manually in the profile menu; all 5 languages expose exactly the same features.

7. REGULATED INDUSTRY / THIRD-PARTY MATERIAL
The app does not operate in a regulated industry and contains no protected third-party material.

The app includes an optional feature for logging menstrual cycle dates. It is a personal date log: the user records the start and end of a period, and the app shows the current phase name and a predicted next date calculated from those entries. It provides no diagnosis, no medical guidance and no health or lifestyle recommendations, and it displays a disclaimer stating that it is a general guide and not medical advice. This is why it is declared as Health data in App Privacy, while the age rating questionnaire was answered as containing no medical or treatment information.

All artwork is original: the app icon and the background photograph were created by the developer. The fonts are licensed under the SIL Open Font License.

Please let us know if anything else would help the review.
```

---

## ⚠️ Бъдещ риск, свързан с точка 5

Отговорът казва честно, че **няма активен платежен път** — и това е вярно
днес: Premium е скрит зад `config/premium.enabled` във Firestore.

Но ако някога го включиш, внимавай: **Apple не позволява продажба на
цифрово съдържание в iOS приложение през външен платежен процесор**
(Stripe). Такова съдържание трябва да минава през In-App Purchase, с
комисионата на Apple. Stripe пътят е законен само през САЙТА, извън
приложението.

Тоест "щракването на ключа", описано в CLAUDE.md, е безопасно за уеб и за
Android, но **за iOS изисква отделна работа** (StoreKit) или Premium да се
продава само през iforget.eu. Не е проблем сега, но не бива да се включи
по невнимание, докато приложението е в App Store.
