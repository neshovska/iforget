# Шрифтове за скрийншотите

Cormorant Garamond и DM Sans — същите, които `index.html` зарежда от
Google Fonts. Свалени тук, защото Chromium в средата за правене на
снимките не стига до `fonts.googleapis.com` и без тях снимките излизаха
с резервен системен шрифт, тоест не приличаха на истинското приложение.
Кирилските subset-и са включени — приложението е на български.

`store/generate.js` пренасочва заявките към `fonts.googleapis.com` към
тази папка (виж `page.route()` там).

- Cormorant Garamond — Catharsis Fonts, SIL Open Font License 1.1
- DM Sans — Colophon Foundry / Google, SIL Open Font License 1.1

OFL позволява свободно разпространение, включително в това repo.
Пълният текст: https://openfontlicense.org

Обновяване (ако някога се смени шрифт в `index.html` — низът трябва да
съвпада с `<link rel="stylesheet">` там):

```
cd store/fonts
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
curl -sS -A "$UA" "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=DM+Sans:wght@300;400;500;600&display=swap" -o raw.css
# после свали всеки https://fonts.gstatic.com/... от raw.css и замени
# адресите с локални имена -> fonts.css
```
