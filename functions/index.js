// functions/index.js
// IForget — Cloud Functions
// Деплой: firebase deploy --only functions

const {setGlobalOptions} = require("firebase-functions/v2");
const {onCall, onRequest, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret, defineString} = require("firebase-functions/params");
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

// Stripe — тайни ключове, задават се веднъж (никога в кода/repo-то):
//   firebase functions:secrets:set STRIPE_SECRET_KEY
//   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
// Price ID-та от Stripe Dashboard (Products → IForget Premium → Monthly/
// Yearly) — не са тайни сами по себе си (безполезни без secret key-я), но
// не са hardcode-нати — задават се при deploy през defineString (Firebase
// пита за стойност автоматично при първи deploy, ако default е празен).
const stripePriceMonthly = defineString("STRIPE_PRICE_MONTHLY", {default: ""});
const stripePriceYearly = defineString("STRIPE_PRICE_YEARLY", {default: ""});

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

// ═══════════════════════════════════════════════════════════
// PREMIUM/STRIPE — ПОДГОТВЕНО, но неактивно за реални потребители, докато
// config/premium.enabled (Firestore) не стане true. Кодът тук работи
// веднага щом Stripe е конфигуриран (STRIPE_SECRET_KEY/
// STRIPE_WEBHOOK_SECRET secrets + STRIPE_PRICE_MONTHLY/STRIPE_PRICE_YEARLY
// params зададени), но самият upgrade бутон в UI-то (index.html) не се
// показва на никого, докато потребителят изрично не "активира" —
// промяна на config/premium.enabled директно в Firestore Console, БЕЗ
// redeploy на код (виж CLAUDE.md за пълния план).
// ═══════════════════════════════════════════════════════════

// Създава Stripe Checkout Session (hosted, самата карта/плащане минава
// изцяло на Stripe-овия домейн, никога през нашия код) и връща URL-а за
// редирект. Trial-ът (14 дни) е зададен ТУК (subscription_data), не в
// самия Stripe Product/Price — картата се пази при Checkout-а, но не се
// таксува до края на trial периода. firebaseUid се пази И като
// client_reference_id (достъпен само в checkout.session.completed), И
// като subscription metadata (достъпен и в customer.subscription.* —
// нужен за подновявания/отказ по-късно, когато вече няма checkout сесия).
exports.createCheckoutSession = onCall(
    {secrets: [stripeSecretKey]},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Трябва да си логнат.");
      }
      const plan = request.data?.plan;
      const priceId = plan === "yearly" ? stripePriceYearly.value() :
        plan === "monthly" ? stripePriceMonthly.value() : null;
      if (!priceId) {
        throw new HttpsError("invalid-argument", "Невалиден план.");
      }

      const stripe = require("stripe")(stripeSecretKey.value());
      const uid = request.auth.uid;
      const email = request.auth.token.email || undefined;

      try {
        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [{price: priceId, quantity: 1}],
          subscription_data: {trial_period_days: 14, metadata: {firebaseUid: uid}},
          success_url: "https://iforget.eu/?premium=success",
          cancel_url: "https://iforget.eu/?premium=cancel",
          client_reference_id: uid,
          customer_email: email,
        });
        return {url: session.url};
      } catch (e) {
        console.error("createCheckoutSession failed:", e);
        throw new HttpsError("internal", "Грешка при създаване на плащането.");
      }
    },
);

// Stripe Customer Portal — оттам потребителят сам управлява/отказва
// абонамента си (задължително за приемливо UX при абонаменти, спестява
// support заявки "искам да спра плащането"). Изисква вече съществуващ
// stripeCustomerId в entitlements/{uid} (записва се от stripeWebhook при
// първо успешно плащане) — ако липсва, потребителят никога не е плащал.
exports.createBillingPortalSession = onCall(
    {secrets: [stripeSecretKey]},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Трябва да си логнат.");
      }
      const uid = request.auth.uid;
      const entSnap = await db.collection("entitlements").doc(uid).get();
      const customerId = entSnap.exists ? entSnap.data().stripeCustomerId : null;
      if (!customerId) {
        throw new HttpsError("failed-precondition", "Няма активен Stripe акаунт за този потребител.");
      }
      const stripe = require("stripe")(stripeSecretKey.value());
      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: "https://iforget.eu/",
        });
        return {url: session.url};
      } catch (e) {
        console.error("createBillingPortalSession failed:", e);
        throw new HttpsError("internal", "Грешка при отваряне на управлението на абонамента.");
      }
    },
);

// Webhook — Stripe вика ТОЗИ ендпойнт директно (не през httpsCallable,
// затова onRequest, не onCall) при всяка промяна на плащане/абонамент.
// req.rawBody е гарантирано наличен от Firebase Functions framework-а
// (дори при JSON-parsed request) — точно затова НЕ пипаме body-parsing,
// нужен е суровият байт низ за проверка на подписа (stripe-signature
// хедъра), иначе constructEvent() хвърля грешка.
// URL-ът за webhook-а (за Stripe Dashboard → Developers → Webhooks) е:
//   https://europe-west1-iforgetbg.cloudfunctions.net/stripeWebhook
exports.stripeWebhook = onRequest(
    {secrets: [stripeSecretKey, stripeWebhookSecret]},
    async (req, res) => {
      const stripe = require("stripe")(stripeSecretKey.value());
      let event;
      try {
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            req.headers["stripe-signature"],
            stripeWebhookSecret.value(),
        );
      } catch (err) {
        console.error("Stripe webhook signature verification failed:", err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
      }

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object;
            const uid = session.client_reference_id;
            if (uid) {
              await db.collection("entitlements").doc(uid).set({
                premium: true,
                stripeCustomerId: session.customer,
                stripeSubscriptionId: session.subscription,
                updatedAt: Date.now(),
              }, {merge: true});
              console.log(`Premium активиран за uid=${uid} (checkout.session.completed).`);
            } else {
              console.error("checkout.session.completed без client_reference_id — не знаем за кой uid.");
            }
            break;
          }
          case "customer.subscription.updated":
          case "customer.subscription.deleted": {
            const sub = event.data.object;
            const isActive = sub.status === "active" || sub.status === "trialing";
            const uid = sub.metadata && sub.metadata.firebaseUid;
            if (uid) {
              await db.collection("entitlements").doc(uid).set({
                premium: isActive,
                stripeCustomerId: sub.customer,
                stripeSubscriptionId: sub.id,
                updatedAt: Date.now(),
              }, {merge: true});
              console.log(`Premium статус=${isActive} за uid=${uid} (${event.type}).`);
            } else {
              // Fallback — metadata липсва по някаква причина, търсим по customer id.
              const snap = await db.collection("entitlements")
                  .where("stripeCustomerId", "==", sub.customer).limit(1).get();
              if (!snap.empty) {
                await snap.docs[0].ref.set({premium: isActive, updatedAt: Date.now()}, {merge: true});
                console.log(`Premium статус=${isActive} за customer=${sub.customer} (fallback по customerId).`);
              } else {
                console.error(`${event.type}: не намерихме entitlement документ за customer=${sub.customer}.`);
              }
            }
            break;
          }
          default:
            // други event типове (напр. invoice.paid) — игнорираме нарочно.
            break;
        }
        res.json({received: true});
      } catch (e) {
        console.error("stripeWebhook processing failed:", e);
        res.status(500).send("Internal error");
      }
    },
);

// ═══════════════════════════════════════════════════════════
// БРАНДИРАН EMAIL VERIFICATION — праща от noreply@iforget.eu вместо
// Firebase-default noreply@iforgetbg.firebaseapp.com. СЪЩИЯ принцип
// като sendBrandedPasswordReset по-горе (generateEmailVerificationLink
// вместо generatePasswordResetLink, отделна статична страница
// verify-email.html вместо reset-password.html), но по-прост throttle —
// изисква request.auth (потребителят вече е логнат/регистриран), затова
// няма anti-enumeration нужда (за разлика от password reset, който е
// достъпен и за нелогнати с произволен имейл).
// ═══════════════════════════════════════════════════════════

const EMAIL_VERIFICATION_HOURLY_LIMIT = 5;

exports.sendBrandedEmailVerification = onCall(
    {secrets: [resendApiKey]},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Трябва да си логнат.");
      }
      const uid = request.auth.uid;
      const email = request.auth.token.email;
      if (!email) {
        throw new HttpsError("failed-precondition", "Акаунтът няма имейл адрес.");
      }

      const now = Date.now();
      const hourBucket = Math.floor(now / (60 * 60 * 1000));
      const throttleRef = db.collection("email_verification_throttle").doc(uid);

      const allowed = await db.runTransaction(async (tx) => {
        const snap = await tx.get(throttleRef);
        const data = snap.exists ? snap.data() : {};
        const count = data.hourBucket === hourBucket ? (data.count || 0) : 0;
        if (count >= EMAIL_VERIFICATION_HOURLY_LIMIT) return false;
        tx.set(throttleRef, {hourBucket, count: count + 1});
        return true;
      });

      if (!allowed) {
        // тих no-op — клиентът си има и собствен 60 сек cooldown в UI-то,
        // това е само сървърен backstop, не съобщаваме различно поведение.
        console.log(`Email verification throttled за uid=${uid}.`);
        return {ok: true};
      }

      // url тук е само continueUrl fallback — не се използва реално, строим
      // собствен линк към iforget.eu/verify-email.html със самия oobCode,
      // по същата причина като sendBrandedPasswordReset (iforget.eu не е
      // Firebase Hosting сайт).
      const actionCodeSettings = {url: "https://iforget.eu/"};

      let verifyLink;
      try {
        verifyLink = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);
      } catch (e) {
        console.error("generateEmailVerificationLink failed:", e);
        throw new HttpsError("internal", "Грешка при генериране на линка.");
      }

      const oobCode = new URL(verifyLink).searchParams.get("oobCode");
      if (!oobCode) {
        console.error("generateEmailVerificationLink не върна oobCode в линка.");
        throw new HttpsError("internal", "Грешка при генериране на линка.");
      }
      const brandedVerifyLink = `https://iforget.eu/verify-email.html?mode=verifyEmail&oobCode=${encodeURIComponent(oobCode)}`;

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
            subject: "IForget — потвърди своя имейл",
            text: `Здравей,\n\nБлагодарим, че се регистрира в IForget!\n\n` +
              `Натисни линка по-долу, за да потвърдиш имейл адреса си:\n${brandedVerifyLink}\n\n` +
              `Ако не си създавал/а тоя акаунт, просто игнорирай този имейл.\n\n` +
              `— Екипът на IForget`,
          }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.error("Resend API грешка:", res.status, errText);
          throw new HttpsError("internal", "Грешка при изпращане на имейла.");
        }
        console.log(`Branded email verification изпратен успешно за uid=${uid}.`);
      } catch (e) {
        if (e instanceof HttpsError) throw e;
        console.error("Грешка при изпращане на verification имейл:", e);
        throw new HttpsError("internal", "Грешка при изпращане на имейла.");
      }

      return {ok: true};
    },
);
