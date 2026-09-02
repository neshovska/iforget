# „Какво ново" — версия 1.0.1

За копиране в App Store Connect → версията → полето **What's New in This
Version** (под General Information, над Description). За разлика от
Description, това поле е **само за копиране в самия текст на английски**
— App Store Connect не показва отделно поле за него на български, а
листингът и без друго е на английски (виж `store/store-listing-texts.md`
защо).

⚠️ Не е задължително поле, но Apple очаква нещо тук за всяка версия след
първата — празно изглежда занемарено.

---

## Текстът

```
You can now use iForget without creating an account — tap "Continue
without an account" on the welcome screen. Notes stay on your device;
sign in any time later to sync them across devices.

Reminders can now repeat monthly, in addition to daily and weekly.

Also fixed: the privacy policy and terms links on the sign-in screen,
the password field during sign-up, and changing your email address.
Changing your email or password now asks you to confirm your current
password first.
```

Английски е нарочно кратък и в „App Store" тон (заповедна форма, без
подробности за причината зад бъга) — потребителят чете список с ползи, не
техническа история. Пълната история е в CLAUDE.md.

## За Google Play (когато дойде редът)

Google Play няма отделно поле „What's New" в същия смисъл — версията
получава **Release notes** при качването на `.aab` в Play Console
(Release → Production/Internal testing → Create new release). Същият
текст върши работа и там; Google Play приема и български едновременно с
английски (за разлика от App Store), значи ако искаш, добави и:

```
Вече можеш да ползваш iForget без акаунт — тапни „Продължи без акаунт"
на началния екран. Бележките остават на устройството; влез по-късно, за
да ги синхронизираш между устройства.

Напомнянията вече могат да се повтарят и месечно, освен ежедневно и
седмично.

Оправени са и: линковете за поверителност/общи условия на екрана за
вход, полето за парола при регистрация, и смяната на имейл адрес. Смяна
на имейл или парола вече иска потвърждение с текущата парола.
```
