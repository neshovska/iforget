# Пускане в App Store — стъпка по стъпка

**Особеното при този проект:** компютърът на собственика (MacBook Air
2015, macOS Monterey) НЕ може да сглоби iOS приложението — Monterey дава
максимум Xcode 14.2, а Capacitor 8 иска Xcode 15+. Затова сглобяването и
качването минават през **GitHub Actions**, а всичко останало се управлява
от браузър или от приложението App Store Connect на iPhone.

Разделението:

| Стъпка | Къде |
|---|---|
| Регистрация + $99 | приложението Apple Developer на iPhone |
| Bundle ID, сертификат, profile | браузър (developer.apple.com) |
| Сертификатът → GitHub Secrets | Terminal на Mac (само `openssl`, БЕЗ Xcode) |
| Сглобяване на `.ipa` + качване | GitHub Actions |
| Описания, снимки, ревю | браузър или iPhone |
| Тест на iPhone | TestFlight |

---

## 0. Регистрация — ✅ ОДОБРЕНА

Избрано е **Individual** (не Organization): по-бързо, иска само лична
карта. Последствие: в App Store като разработчик ще стои личното име, не
фирма. Смяната после минава през прехвърляне на приложението.

Team ID: `YU6TSUJ9A4`.

---

## 1. Bundle ID

developer.apple.com → Certificates, IDs & Profiles → **Identifiers** → +

- Description: `iForget`
- Bundle ID: **`eu.iforget.app`** ← трябва да съвпада ТОЧНО с
  `capacitor.config.json` и с Xcode проекта
- Capabilities: нищо не се включва. Приложението не ползва Push
  (напомнянията са локални, виж CLAUDE.md), нито Sign in with Apple.

---

## 2. Сертификат за разпространение

Обикновено се прави с Keychain Access, но `openssl` върши същата работа и
работи на Monterey. **Командите по-долу са изпробвани** — минават чисто
от начало до край.

### На твоя Mac

```bash
mkdir -p ~/iforget-ios-keys && cd ~/iforget-ios-keys

# Частен ключ — ПАЗИ ГО, без него сертификатът е безполезен
openssl genrsa -out ios_distribution.key 2048

# CSR — този файл се качва в портала на Apple
openssl req -new -key ios_distribution.key \
  -out ios_distribution.certSigningRequest \
  -subj "/emailAddress=info@iforget.eu/CN=Gabriela Neshovska/C=BG"
```

### В портала

Certificates, IDs & Profiles → **Certificates** → + → **Apple
Distribution** → качваш `ios_distribution.certSigningRequest` →
сваляш `distribution.cer`.

### Обратно на Mac — правим `.p12`

```bash
cd ~/iforget-ios-keys
# Премести свалития distribution.cer тук, после:
openssl x509 -inform DER -in distribution.cer -out distribution.pem

openssl pkcs12 -export \
  -inkey ios_distribution.key \
  -in distribution.pem \
  -out certificate.p12 \
  -passout pass:ИЗМИСЛИ_ПАРОЛА
```

⚠️ Запиши паролата — тя влиза в GitHub Secrets и без нея build-ът спира.

---

## 3. Provisioning profile

Portal → **Profiles** → + → **App Store Connect** (под Distribution) →
избираш App ID `eu.iforget.app` → избираш сертификата от стъпка 2 →
име `iForget App Store` → сваляш `.mobileprovision`.

---

## 4. Ключ за App Store Connect API

Служи за качването, вместо парола.

App Store Connect → Users and Access → **Integrations** → App Store
Connect API → **+**

- Име: `GitHub Actions`
- Access: **App Manager**

Сваляш `.p8` файла — **дава се само веднъж, не може да се свали пак.**
Запиши си и **Key ID** и **Issuer ID** от същата страница.

---

## 5. GitHub Secrets

Settings → Secrets and variables → Actions → New repository secret.

За файловете трябва base64 (на един ред):

```bash
cd ~/iforget-ios-keys
base64 -i certificate.p12 | pbcopy          # вече е в клипборда
base64 -i iForget_App_Store.mobileprovision | pbcopy
base64 -i AuthKey_XXXXXXX.p8 | pbcopy
```

| Secret | Какво съдържа |
|---|---|
| `IOS_CERTIFICATE_P12_BASE64` | base64 на `certificate.p12` |
| `IOS_CERTIFICATE_PASSWORD` | паролата от стъпка 2 |
| `IOS_PROVISIONING_PROFILE_BASE64` | base64 на `.mobileprovision` |
| `APPSTORE_API_KEY_P8_BASE64` | base64 на `.p8` |
| `APPSTORE_API_KEY_ID` | Key ID |
| `APPSTORE_API_ISSUER_ID` | Issuer ID |
| `IOS_TEAM_ID` | Team ID (горе вдясно в портала, 10 знака) |

⚠️ **`~/iforget-ios-keys` НЕ влиза в repo-то.** Направи ѝ копие на
сигурно място — както при Android ключа.

---

## 6. Създай приложението в App Store Connect

My Apps → + → New App

- Platform: iOS
- Name: **`iForget - Simple Notes`** — чистото `iForget` е ЗАЕТО в App
  Store от друг разработчик. Името в магазина няма нищо общо с Bundle
  ID-то и със самото приложение; в Google Play то си остава `iForget`.
- Primary language: **English** — App Store Connect НЕ предлага български
  сред езиците за описание. Затова листингът там е на английски, а
  българските текстове се ползват само за Google Play.
- Bundle ID: `eu.iforget.app`
- SKU: `iforget-001` (вътрешен, невидим)

Текстовете и снимките са в `store/store-listing-texts.md` —
подзаглавие, промо текст, описание и ключови думи.
Снимките 1290×2796 от `store/screenshots/` стават директно (слотът се
казва 6.9", същият приема и 6.5").

⚠️ App Store НЕ иска feature graphic — банерът е само за Google Play.

⚠️ **Приложението се предлага САМО за iPhone**
(`TARGETED_DEVICE_FAMILY = 1` в `project.pbxproj`, подадено и при
сглобяването в `ios-release.yml` като предпазна мрежа срещу `cap sync`).
Причината е обмислена, не случайна: няма отделен изглед за таблет — на
iPad бележките се разпъват по цялата ширина и горе остава голямо празно
поле, защото списъкът е залепен долу. Разтеглен телефон в магазина не е
добра първа среща с приложението.

Практическото последствие: **App Store не иска iPad снимки**. Ако някога
се направи истински iPad изглед, снимките се правят с
`IPAD=1 node store/generate.js` и семейството устройства се връща на
`"1,2"` — и на двете места.

⚠️ **Семейството устройства идва от самия build**, не от настройка в App
Store Connect. Смяната изисква ново качване; вече каченият build пази
старото си състояние.

⚠️ **Въпросът за криптиране (export compliance)** вече не се задава при
всяко качване — `ios/App/App/Info.plist` носи
`ITSAppUsesNonExemptEncryption = false`. Декларацията е вярна:
приложението няма собствена криптография, ползва само HTTPS/TLS през
Firebase, тоест стандартната на операционната система.

⚠️ **App Store Connect не запазва сам.** Натискай `Save` след всяко
парче. `Save` НЕ подава за ревю — това прави само "Add for Review".

---

## 6а. App Privacy — готовите отговори

Проверено какво реално събира приложението, не предположено: заредени са
само `firebase-auth`, `firebase-firestore` и `firebase-functions` (виж
`index.html`), тоест НЯМА аналитика и НЯМА отчитане на сривове.

"Do you or your third-party partners collect any data from this app?" →
**Yes**, после точно тези четири:

| Категория | Тип | Откъде идва |
|---|---|---|
| Contact Info | **Email Address** | вход с имейл (Firebase Auth) |
| Identifiers | **User ID** | `uid`, ключът на `users/{uid}` |
| User Content | **Other User Content** | самите бележки |
| Health & Fitness | **Health** | месечният цикъл (`cycleData`) |

За всеки от четирите Apple задава три въпроса; отговорите са еднакви:

1. Използва ли се за **tracking**? → **No**
2. **Linked to identity**? → **Yes** (бележките живеят под акаунта)
3. За какво се използва? → само **App Functionality**. Без Analytics,
   без Advertising, без Product Personalization.

**Какво НЕ се маркира и защо:**

- **Payment Info** — Stripe е подготвен, но изключен
  (`config/premium.enabled`), а картата минава през хоствана страница на
  Stripe, не през приложението. ⚠️ **Ако Premium се пусне, тази
  декларация трябва да се обнови** — това е точно видът разминаване,
  заради което приложения падат по-късно, не при първото ревю.
- **Usage Data / Diagnostics / Crash Data** — няма такива SDK-та.
- **Location / Contacts / Search History** — търсенето е изцяло локално.

Здравната информация е точката, в която приложенията се спъват най-често
— не при първото ревю, а после, когато Apple забележи разминаване.
Затова се декларира, макар функцията да не се рекламира в описанието.

---

## 6б. App Review Information — акаунтът за ревюиращия

⚠️ **НЕ давай личен акаунт.** Ревюиращият влиза в него и вижда истинските
бележки, включително записите за месечния цикъл. Направи отделен
(регистрация на iforget.eu; потвърждаване на имейла НЕ е нужно — банерът
не блокира влизането). Чист акаунт е и по-разбираем: ревюиращият вижда
обучението при първи вход, вместо чужди бележки на български.

Полетата за контакт (име, телефон, имейл) са задължителни — те са за
връзка с ТЕБ, ако ревюиращият има въпрос.

Полезен текст за `Notes` (на английски):

```
iForget is a daily to-do and notes app.

Sign-in is required because notes sync across devices via Firebase. A test account is provided above.

Reminders are scheduled locally on the device (no push server). Please allow the notification permission when prompted to test them.

The app interface is available in 5 languages; it defaults to the device language and can be changed in the profile menu.
```

**App Store Version Release** → избери **Manually release this version**.
Одобрението идва както обикновено, но приложението излиза живо чак когато
ти натиснеш бутона — например след като TestFlight потвърди, че работи.

---

## 7. Сглобяване и качване — ✅ РАБОТИ

Actions → **iOS release (TestFlight)** → Run workflow.

Слага номер на build-а автоматично от номера на пускането, за да е винаги
уникален — Apple отказва повторно качване със същия номер, което е
най-честата спънка при второто качване.

**Потвърдено на 23.08.2026:** подписан `.ipa` стигна до App Store Connect
(Archive 73 сек, `.ipa` 3 сек, качване 74 сек). Обработката от страна на
Apple отнема 5–30 минути, след което build-ът се появява в TestFlight.

Провери в лога, че стъпката "Качи в App Store Connect" наистина е вървяла
десетки секунди — прескочена стъпка изглежда със същата зелена отметка.

Двете поправки, нужни при първите два опита (описани и в самия workflow,
за да не се загубят):

1. **`No signing certificate "iOS Development" found`** — Capacitor
   заковава `CODE_SIGN_IDENTITY = "iPhone Developer"` в
   `project.pbxproj`. Проектът НЕ се редактира (`cap sync` го пренаписва
   при всяко синхронизиране) — стойността се подава отвън при
   сглобяването: `CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY="Apple
   Distribution"`.
2. **`built with the iOS 18.5 SDK ... must be built with the iOS 26 SDK
   or later`** — оттам `runs-on: macos-26` плюс изричен избор на
   най-новия наличен Xcode. Машините на GitHub носят по няколко версии
   наведнъж и подразбиращата се не е непременно най-новата.

---

## 8. Тест през TestFlight

Единственият начин да пробваш на своя iPhone, защото Xcode локално е
недостъпен.

App Store Connect → TestFlight → добавяш себе си като вътрешен тестер →
инсталираш приложението TestFlight на iPhone-а → приложението идва като
нормално инсталиране.

**Какво да провериш задължително** (на iOS нищо от това не е пускано
досега, само в браузър):

- **Звънят ли напомнянията** при затворен ап — ограничението на iOS е 64
  чакащи известия, затова кодът насрочва първите 50
- Клавиатурата в трите сценария: нова бележка, подбележка, редакция
  (виж дългата история с iOS Safari в `CLAUDE.md` — решена за уеб, но
  нативната обвивка е друга среда)
- Жестовете: плъзгане, задържане
- Влизане с имейл и парола (Firebase Auth)

---

## 9. Подаване за ревю

Като TestFlight потвърди, че работи: App Store Connect → версията →
Add for Review → Submit.

Първото ревю обикновено е няколко дни. Apple е по-строг от Google —
най-честите откази са заради непълна декларация за поверителност или
липсваща информация за тестов достъп.

---

## Какво е НЕПРОВЕРЕНО тук

Потвърдено работещо: сглобяване за симулатор (`ios-build.yml`), подписан
build и качване към App Store Connect (`ios-release.yml`).

**Остава непроверено дали приложението РАБОТИ на iOS.** Компилация ≠
работа. Напомнянията, клавиатурата и жестовете там са виждали само
браузър, никога нативната обвивка. Отговорът идва от TestFlight (стъпка
8), не по-рано.

**Trader status (Digital Services Act)** — App Store Connect → Business.
Изисква се преди разпространение в ЕС; попълва се веднъж за акаунта, не
за приложението.
