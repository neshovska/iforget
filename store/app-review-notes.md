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

## ⚠️ Полето за отговор приема НАЙ-МНОГО 4000 знака

Първата, подробна версия беше 4964 — App Store Connect я отряза. Текстът
по-долу е свитата, реално пратена версия: **3839 знака**, всичките седем
отговора запазени.

## Видеото се дава като ЛИНК, не се прикача

Полето `Attachment` приема само изображения. Видеото се качва в YouTube с
видимост **Unlisted** (⚠️ НЕ "Private" — личното иска влизане в акаунт и
ревюиращият не го отваря) и линкът влиза в самия текст.

⚠️ Тествай линка в прозорец инкогнито, преди да пратиш.

**Пратеното видео:** https://youtu.be/PdBvvfXHhc8

## Къде отива текстът

1. App Store Connect → **App Review** → тапваш реда с датата на подаването
   → поле за писане под съобщението от Apple → Send.
2. Същият текст в полето **Notes** на App Review Information — Apple
   изрично го препоръчва, за да не пита пак при бъдещи подавания.
3. ⚠️ **Смени избрания build на 5**, преди да подадеш пак.

## Защо данните за акаунта НЕ са в текста

Текстът сочи към полето **Sign-In Information**, вместо да повтаря имейл
и парола. Така не може да се получи разминаване, ако някога се сменят, а
ревюиращият и без друго чете точно това поле.

Акаунтът, който се вижда създаден и изтрит във ВИДЕОТО, е друг — еднократен,
само за демонстрацията. Затова текстът го обяснява изрично: иначе
ревюиращият може да опита да влезе с него, да не успее и да реши, че
приложението е счупено.

---

## Текстът, както беше пратен (24.08.2026)

```
Thank you for reviewing iForget.

1. SCREEN RECORDING
Captured on a physical iPhone: https://youtu.be/PdBvvfXHhc8
It starts at app launch and covers registration, login, creating and completing notes, swipe gestures, setting a reminder including the iOS notification permission prompt, the calendar, and account deletion.

2. DEVICES TESTED
iPhone 13 Pro Max, iOS 26.6, via TestFlight. The same codebase also runs as a web app (https://iforget.eu) and as an Android app, tested on a Samsung Galaxy A17, Android 16.

3. FUNCTION AND AUDIENCE
iForget is a simple daily to-do and notes app, built for day-to-day use rather than archiving: completed notes move to the trash automatically after 30 days.

Most task apps are either a flat list or a full project system. iForget sits between: one chronological list with three states (active, in progress, done), plus sub-tasks, categories, colours and local reminders.

Features: three-state notes changed by tapping the status dot or swiping; nested sub-notes; categories and a 5-day soft-delete trash; local reminders that can repeat daily or weekly; week/month/year calendar; a weekly and monthly personal review with a streak counter; search by text and by date; light, dark and two further themes; interface in Bulgarian, English, Russian, German and Spanish.

Audience: general consumers wanting a straightforward daily task list. The app is free, with no ads, no in-app purchases and no subscriptions.

4. SETUP AND ACCESS
An account is required because notes sync across devices. A working demo account is in the Sign-In Information field. There is one account type only, with no roles or paid tiers, and no sample files are needed.

A short 8-step tutorial runs on first launch and can be replayed from Profile > Help.

To test reminders: long-press a note, choose "Reminder", set a time a few minutes ahead and save. iOS asks for notification permission at that moment. Reminders are scheduled locally and fire with the app fully closed.

The account created and deleted in the recording was a throwaway used only for that demonstration; the demo account in Sign-In Information is separate and active.

5. EXTERNAL SERVICES
Firebase Authentication (email and password only; no social sign-in). Cloud Firestore, storing each user's notes in one document keyed by their user ID, with security rules limiting access to the owner. Firebase Cloud Functions for password-reset and email-verification messages, delivered through Resend. Google Fonts for the interface.

No analytics, advertising, crash-reporting or tracking SDKs are included. No payment processor is active; the app contains no purchase flow of any kind.

Reminders use @capacitor/local-notifications and are scheduled by the operating system on the device. No push server is involved and no reminder data leaves the device.

6. REGIONAL DIFFERENCES
None. The app behaves identically everywhere. The only variation is interface language, which follows the device setting and can be changed manually; all five languages expose the same features.

7. REGULATED INDUSTRY / THIRD-PARTY MATERIAL
Neither applies. The app includes an optional feature for logging menstrual cycle dates: the user records the start and end of a period, and the app shows the current phase name and a predicted next date calculated from those entries. It gives no diagnosis, no medical guidance and no lifestyle recommendations, and displays a disclaimer that it is a general guide and not medical advice. This is why it is declared as Health data in App Privacy while the age rating questionnaire records no medical or treatment information.

All artwork is original: the app icon and background photograph were created by the developer. Fonts are licensed under the SIL Open Font License.

Please let us know if anything else would help the review.
```
