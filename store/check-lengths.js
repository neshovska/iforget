/*
 * Проверява, че текстовете в store-listing-texts.md се събират в лимитите
 * на App Store/Google Play. Пускане:  node store/check-lengths.js
 *
 * Защо изобщо: магазините ОТХВЪРЛЯТ полето, ако е с един знак повече, а
 * кирилицата подвежда окото — броим по КОДОВИ ТОЧКИ ([...str].length, не
 * str.length), защото магазините броят знаци, не UTF-16 единици.
 */
const fs = require('fs');
const path = require('path');

const md = fs.readFileSync(path.join(__dirname, 'store-listing-texts.md'), 'utf8');

// Заглавие на секция → лимит. Търсим ПЪРВИЯ ``` блок след всяко заглавие.
const LIMITS = [
  ['Подзаглавие (App Store subtitle, до 30 знака)', 30],
  ['Кратко описание (Google Play, до 80 знака)', 80],
  ['Промо текст (App Store promotional text, до 170 знака)', 170],
  ['Пълно описание (до 4000 знака)', 4000],
  ['Ключови думи (App Store keywords, до 100 знака, разделени със запетая)', 100],
  ['Subtitle (App Store, max 30 chars)', 30],
  ['Short description (Google Play, max 80 chars)', 80],
  ['Promotional text (App Store, max 170 chars)', 170],
  ['Full description (max 4000 chars)', 4000],
  ['Keywords (App Store, max 100 chars, comma separated)', 100],
];

let failed = 0;
for(const [heading, limit] of LIMITS){
  const at = md.indexOf('### ' + heading);
  if(at === -1){ console.log(`??  ЛИПСВА секция: ${heading}`); failed++; continue; }
  const open = md.indexOf('```', at);
  const close = md.indexOf('```', open + 3);
  const body = md.slice(open + 3, close).replace(/^\n/, '').replace(/\n$/, '');
  const n = [...body].length;
  const ok = n <= limit;
  if(!ok) failed++;
  console.log(`${ok ? 'ОК ' : 'НАД'}  ${String(n).padStart(4)}/${String(limit).padEnd(4)}  ${heading}`);
}

console.log(failed ? `\n${failed} проблем(а).` : '\nВсички текстове се събират в лимитите.');
process.exit(failed ? 1 : 0);
