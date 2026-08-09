// functions/index.js
// IForget — Cloud Functions
// Деплой: firebase deploy --only functions

const {setGlobalOptions} = require("firebase-functions/v2");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
admin.initializeApp();

// europe-west1 — colocated с Firestore региона на проекта, за по-ниска
// latency и без cross-region hop. ВАЖНО: клиентът (index.html) трябва да
// вика firebase.app().functions('europe-west1'), иначе compat SDK по
// подразбиране търси функцията в us-central1 и хвърля "not-found".
setGlobalOptions({region: "europe-west1"});

const db = admin.firestore();

// Resend API ключ — тайна, задава се веднъж (никога в кода/repo-то):
//   firebase functions:secrets:set RESEND_API_KEY
const resendApiKey = defineSecret("RESEND_API_KEY");

// Изпращащ адрес — noreply@iforget.eu, домейн верифициран в Resend
// (SPF/DKIM/DMARC записи, виж CLAUDE.md). Само за изпращане — тази кутия
// не приема отговори (Enable Receiving е изключено в Resend нарочно).
const FROM_EMAIL = "IForget <noreply@iforget.eu>";

// ═══════════════════════════════════════════════════════════
// БРАНДИРАН PASSWORD RESET — праща от noreply@iforget.eu вместо
// Firebase-default noreply@iforgetbg.firebaseapp.com. Моделирано по
// СЪЩИЯ принцип като sendBrandedPasswordReset в neshovska/glowtrack
// (functions/index.js) — само SMTP/nodemailer е сменено с Resend API
// (HTTP fetch), защото тук изпращаме през Resend, не през Zoho SMTP.
// ═══════════════════════════════════════════════════════════

// Anti-spam throttle — две независими граници, проверени в ЕДНА транзакция:
// 1) per-email — max PASSWORD_RESET_PER_EMAIL_HOURLY_LIMIT заявки/час, спира
//    targeted harassment на конкретен имейл.
// 2) global — max PASSWORD_RESET_GLOBAL_PER_MINUTE_LIMIT заявки/минута общо,
//    независимо от email, спира volumetric/enumeration abuse (много различни
//    имейли), което би могло да маркира Resend акаунта като abuse.
// Проверката е ПРЕДИ generatePasswordResetLink, за да важи и за несъществуващи
// имейли (enumeration probing) — throttle-ът пише СЛЕД успешен линк би оставил
// unknown-email заявки напълно нелимитирани.
// Fixed-window bucket-и (час/минута), не sliding window — прост модел,
// worst case позволява ~2x burst близо до границата на bucket-а, приемлив
// компромис за простота.
const PASSWORD_RESET_PER_EMAIL_HOURLY_LIMIT = 3;
const PASSWORD_RESET_GLOBAL_PER_MINUTE_LIMIT = 20;

exports.sendBrandedPasswordReset = onCall(
    {secrets: [resendApiKey]},
    async (request) => {
      const email = (request.data?.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        throw new HttpsError("invalid-argument", "Невалиден имейл адрес.");
      }

      const now = Date.now();
      const hourBucket = Math.floor(now / (60 * 60 * 1000));
      const minuteBucket = Math.floor(now / (60 * 1000));
      const emailThrottleRef = db.collection("password_reset_throttle").doc(email);
      // "_global" е reserved doc ID — не може да съвпадне с реален имейл (винаги съдържа "@").
      const globalThrottleRef = db.collection("password_reset_throttle").doc("_global");

      const throttle = await db.runTransaction(async (tx) => {
        const [emailSnap, globalSnap] = await Promise.all([
          tx.get(emailThrottleRef),
          tx.get(globalThrottleRef),
        ]);

        const emailData = emailSnap.exists ? emailSnap.data() : {};
        const emailCount = emailData.hourBucket === hourBucket ? (emailData.count || 0) : 0;
        if (emailCount >= PASSWORD_RESET_PER_EMAIL_HOURLY_LIMIT) {
          return {allowed: false, reason: "per-email"};
        }

        const globalData = globalSnap.exists ? globalSnap.data() : {};
        const globalCount = globalData.minuteBucket === minuteBucket ? (globalData.count || 0) : 0;
        if (globalCount >= PASSWORD_RESET_GLOBAL_PER_MINUTE_LIMIT) {
          return {allowed: false, reason: "global"};
        }

        tx.set(emailThrottleRef, {hourBucket, count: emailCount + 1});
        tx.set(globalThrottleRef, {minuteBucket, count: globalCount + 1});
        return {allowed: true};
      });

      if (!throttle.allowed) {
        // тих no-op, не разкриваме throttle статус на клиента (anti-enumeration)
        console.log(`Password reset throttled (${throttle.reason}) за ${throttle.reason === "per-email" ? email : "global limit"}.`);
        return {ok: true};
      }

      // url тук е само continueUrl fallback — не се използва реално, защото по-долу
      // строим собствен линк към iforget.eu/reset-password.html със самия oobCode.
      // iforget.eu трябва да е в Authentication > Settings > Authorized domains,
      // иначе generatePasswordResetLink хвърля auth/unauthorized-continue-uri.
      const actionCodeSettings = {url: "https://iforget.eu/"};

      let resetLink;
      try {
        resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
      } catch (e) {
        // auth/user-not-found и др. — НЕ разкриваме дали имейлът съществува
        // (anti-enumeration). Просто не пращаме нищо, но връщаме success.
        console.log("Password reset заявка за непознат/невалиден имейл (не се разкрива на клиента).");
        return {ok: true};
      }

      // Firebase-генерираният линк сочи към iforgetbg.firebaseapp.com/__/auth/action
      // (Firebase-хостната action-handler страница), защото iforget.eu не е Firebase
      // Hosting сайт (в момента е GitHub Pages) — само custom domain, свързан през
      // Firebase Hosting, би сменил това. Вместо да минаваме по този път (DNS промени,
      // риск), извличаме oobCode-а от генерирания линк и строим собствен URL към
      // iforget.eu/reset-password.html — тя вече сама разпознава ?mode=resetPassword&
      // oobCode=... и показва форма за нова парола (виж reset-password.html в repo-то).
      // oobCode-ът е валиден независимо от кой домейн е сервиран линкът — Firebase
      // го проверява по стойността му, не по домейна.
      const oobCode = new URL(resetLink).searchParams.get("oobCode");
      if (!oobCode) {
        console.error("generatePasswordResetLink не върна oobCode в линка.");
        throw new HttpsError("internal", "Грешка при генериране на линка.");
      }
      const brandedResetLink = `https://iforget.eu/reset-password.html?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}`;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey.value()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: email,
            subject: "IForget — възстановяване на парола",
            text: `Здравей,\n\nПолучихме заявка за нова парола за твоя IForget акаунт.\n\n` +
              `Натисни линка по-долу, за да зададеш нова парола:\n${brandedResetLink}\n\n` +
              `Ако не си заявявал/а това, просто игнорирай този имейл — паролата ти няма да се промени.\n\n` +
              `— Екипът на IForget`,
          }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.error("Resend API грешка:", res.status, errText);
          throw new HttpsError("internal", "Грешка при изпращане на имейла.");
        }
        console.log("Branded password reset изпратен успешно.");
      } catch (e) {
        if (e instanceof HttpsError) throw e;
        console.error("Грешка при изпращане на password reset имейл:", e);
        throw new HttpsError("internal", "Грешка при изпращане на имейла.");
      }

      return {ok: true};
    },
);
