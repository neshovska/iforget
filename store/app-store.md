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

## 0. Регистрация — ЧАКА ОДОБРЕНИЕ

Избрано е **Individual** (не Organization): по-бързо, иска само лична
карта. Последствие: в App Store като разработчик ще стои личното име, не
фирма. Смяната после минава през прехвърляне на приложението.

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
- Name: `iForget`
- Primary language: Bulgarian
- Bundle ID: `eu.iforget.app`
- SKU: `iforget-001` (вътрешен, невидим)

Текстовете и снимките са в `store/store-listing-texts.md` —
подзаглавие, промо текст, описание и ключови думи, на бг и en.
Снимките 1290×2796 от `store/screenshots/` стават директно.

⚠️ App Store НЕ иска feature graphic — банерът е само за Google Play.

⚠️ **Декларацията за данни (App Privacy)** е като Data safety при Google:
имейл, бележки И **здравна информация** (месечният цикъл, `cycleData`).
Не я пропускай.

---

## 7. Сглобяване и качване

Actions → **iOS release (TestFlight)** → Run workflow.

Слага номер на build-а автоматично от номера на пускането, за да е винаги
уникален — Apple отказва повторно качване със същия номер, което е
най-честата спънка при второто качване.

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

`.github/workflows/ios-release.yml` е **написан, но никога не е пускан** —
не може да бъде, преди да съществуват акаунтът и ключовете. Очаквай един
кръг поправки при първото пускане; това е нормално за подписване в CI.

Работи вече и е потвърдено: **сглобяването за симулатор**
(`ios-build.yml`, `** BUILD SUCCEEDED **`), тоест самият код се компилира.
Неизвестното е само подписването и качването.
