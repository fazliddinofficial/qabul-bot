const loginView = document.querySelector("#login-view");
const appView = document.querySelector("#app-view");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const listEl = document.querySelector("#list");
const searchEl = document.querySelector("#search");
const positionEl = document.querySelector("#position-filter");
const statusEl = document.querySelector("#status-filter");
const sortEl = document.querySelector("#sort-filter");
const dateFromEl = document.querySelector("#date-from");
const dateToEl = document.querySelector("#date-to");
const statsEl = document.querySelector("#stats");
const detail = document.querySelector("#detail");
const detailBody = document.querySelector("#detail-body");
const detailTitle = document.querySelector("#detail-title");
const detailPosition = document.querySelector("#detail-position");

const labels = {
  fullName: "I.F.Sh",
  birthday: "Tug‘ilgan sana",
  nation: "Millati",
  address: "Manzil",
  phone: "Telefon",
  parentPhone: "Qo'shimcha yoki ota-ona telefoni",
  education: "Ma’lumot",
  institution: "O‘quv muassasasi",
  graduationYear: "Tugatish yili",
  languageLevel: "Til darajasi",
  computerSkills: "Kompyuter",
  prevJob: "Oldingi ish",
  lastSalary: "Oxirgi oylik",
  expectedSalary: "Kutilayotgan oylik",
  maritalStatus: "Oilaviy holat",
  workHours: "Ish vaqti",
  workDuration: "Ishlash muddati",
  foundResource: "E’lon manbasi",
  username: "Telegram",
  telegramUserId: "Telegram ID",
  createdAt: "Yuborilgan vaqt",
};

let currentUser = null;
let allItems = [];
let knownPositions = [];
let activePosition = "";
let activeStatus = "";
let activeSort = "position";
let archiveMode = false;

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function prettyStamp(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!match) return value || "";
  const months = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
  const time = match[4] ? `, ${match[4]}:${match[5]}` : "";
  return `${match[3]} ${months[Number(match[2]) - 1]}${time}`;
}

function uzContractDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const months = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
  return `${match[1]}-yil ${Number(match[3])}-${months[Number(match[2]) - 1]}`;
}

function parseUzContractDate(value) {
  const raw = String(value || "").trim().toLowerCase();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const months = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
  const match = raw.match(/(\d{4})\s*-?\s*yil\s+(\d{1,2})\s*-?\s*([a-z'’ʻ]+)/);
  if (!match) return "";
  const index = months.findIndex((name) => match[3] === name || match[3].startsWith(name));
  if (index < 0) return "";
  const day = Number(match[2]);
  if (day < 1 || day > 31) return "";
  return `${match[1]}-${String(index + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function contractMonths(term) {
  const lower = String(term || "").trim().toLowerCase();
  if (!lower) return 0;
  const amount = (pattern) => {
    const hit = lower.match(pattern);
    return hit ? Number(hit[1].replace(",", ".")) : 0;
  };
  const years = amount(/(\d+(?:[.,]\d+)?)\s*yil/);
  let months = amount(/(\d+(?:[.,]\d+)?)\s*oy/);
  const days = amount(/(\d+)\s*kun/);
  if (!years && !months && !days) {
    const only = lower.match(/^(\d+(?:[.,]\d+)?)$/);
    if (!only) return 0;
    months = Number(only[1].replace(",", "."));
  }
  const total = Math.round(years * 12 + months + days / 30);
  if (!total) return 0;
  return Math.max(1, total);
}

function normalizeContractMonths(term) {
  const months = contractMonths(term);
  return months ? String(months) : "";
}

function monthsAsYears(term) {
  const months = contractMonths(term);
  if (!months) return "";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years && rest) return `${years} yil ${rest} oy`;
  if (years) return `${years} yil`;
  return `${months} oy`;
}

function contractPerson(data) {
  const parts = String(data.fullName || "").trim().split(/\s+/).filter(Boolean);
  const surname = parts[0] || "";
  const name = parts[1] || "";
  const father = String(data.fatherName || "").trim() || parts.slice(2).join(" ");
  return {
    surname,
    name,
    father,
    full: [surname, name, father].filter(Boolean).join(" "),
  };
}
function addContractTerm(start, term) {
  const match = String(start || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  const months = contractMonths(term);
  if (!match || !months) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCMonth(date.getUTCMonth() + months);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

function saveWordFile(html, number) {
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const link = document.createElement("a");
  const safe = String(number || "").trim() || "shartnoma";
  link.href = URL.createObjectURL(blob);
  link.download = `shartnoma-${safe}.doc`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function buildAdminContractHtml(data) {
  const text = (value) => {
    const clean = String(value || "").trim();
    return (clean || "____________")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  };
  const day = (value) => text(uzContractDate(value));
  const person = contractPerson(data);
  const contractEnd = addContractTerm(data.hiredAt, data.contractTerm) || data.contractEnd;
  const salary = text(data.agreedSalary || data.perStudentPay);
  const probation = String(data.probation || "").trim();
  const trial = !probation || probation === "0 oy" ? "sinov muddatisiz" : `${text(probation)} sinov muddati bilan`;
  const hours = String(data.workHours || "").trim();
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>Mehnat shartnomasi</title>
<style>
  body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.35; color: #111; }
  h1 { text-align: center; font-size: 16pt; margin: 0 0 4pt; }
  h2 { font-size: 13pt; margin: 12pt 0 6pt; }
  p { margin: 0 0 6pt; text-align: justify; }
  .center { text-align: center; }
  .sides { width: 100%; margin-top: 8pt; }
  .sides td { width: 50%; vertical-align: top; }
  .place-date { width: 100%; margin: 0 0 10pt; border-collapse: collapse; }
  .place-date td { width: 50%; border: none; padding: 0; }
  .place-date .right { text-align: right; }
</style></head>
<body>
<h1>MUDDATLI MEHNAT SHARTNOMASI № ${text(data.contractNumber)}</h1>
<p class="center">(${text(data.position || "Markaz administratori")} lavozimi uchun)</p>
<table class="place-date" width="100%"><tr>
<td>Jizzax shahri</td>
<td class="right">${day(data.hiredAt)}</td>
</tr></table>
<p>Ushbu Mehnat Shartnomasi (keyingi o‘rinlarda «Shartnoma» deb yuritiladi) “KING’S EDUCATION JIZZAKH” NTM nomidan Ustav asosida faoliyat yurituvchi Rahbar Tursunbayev Shahzod Ixtiyor o‘g‘li (keyingi o‘rinlarda «Ish beruvchi» deb yuritiladi) bir tomondan, hamda fuqaro ${text(person.full)} (keyingi o‘rinlarda «Xodim» deb yuritiladi) ikkinchi tomondan, O‘zbekiston Respublikasi Mehnat kodeksi hamda O‘zbekiston Respublikasi Vazirlar Mahkamasining 2024-yil 14-noyabrdagi 758-sonli qarori bilan tasdiqlangan Namunaviy mehnat shartnomasi shartlari asosida quyidagilar haqida tuzildi:</p>
<h2>I. UMUMIY QOIDALAR</h2>
<p>1.1. Xodim “KING’S EDUCATION JIZZAKH” NTMga ${text(data.position || "Markaz administratori")} lavozimiga ishga qabul qilinadi.</p>
<p>1.2. Xodimning ish joyi: Jizzax shahri, Sharof Rashidov Shoh ko‘chasi, "Darkmen" binosi, 2-qavatda joylashgan “KING’S EDUCATION JIZZAKH” NTM binosi.</p>
<p>1.3. Ekskluzivlik (yagona ish joyi) sharti: Ushbu ish Xodim uchun yagona va asosiy ish joyi hisoblanadi. Xodimga Ish beruvchining yozma roziligisiz boshqa tashkilotlarda, o‘quv markazlarida o‘rindoshlik bo‘yicha yoki boshqa shartnomalar asosida mehnat faoliyatini olib borishi qat'iyan taqiqlanadi.</p>
<h2>II. MEHNAT SHARTNOMASINING MUDDATI VA SINOV MUDDATI</h2>
<p>2.1. Ushbu Mehnat Shartnomasi O‘zbekiston Respublikasi Mehnat kodeksining 110 va 113-moddalariga muvofiq ${text(monthsAsYears(data.contractTerm))} muddatga tuziladi.</p>
<p>2.2. Shartnoma bo‘yicha ishning boshlanish sanasi: ${day(data.hiredAt)}.</p>
<p>2.3. Shartnomaning tugash sanasi: ${day(contractEnd)}.</p>
<p>2.4. O‘zbekiston Respublikasi Mehnat kodeksining 129-moddasiga asosan Xodim ishga dastlabki ${trial} qabul qilinadi.</p>
<h2>III. XODIMNING HUQUQLARI VA MAJBURIYATLARI</h2>
<p>3.1. Xodim quyidagi huquqlarga ega:</p>
<p>a) Mehnat shartnomasida shartlashilgan ish bilan Ish beruvchi tomonidan ta'minlanish;</p>
<p>b) O‘z vaqtida va to‘liq hajmda shartlashilgan oylik ish haqini olish;</p>
<p>c) Mehnatni muhofaza qilish va xavfsizlik talablariga javob beradigan ish joyiga ega bo‘lish;</p>
<p>d) Qonunchilikda belgilangan tartibda dam olish va har yilgi haq to‘lanadigan mehnat ta'tilidan foydalanish.</p>
<p>3.2. Xodim quyidagi majburiyatlarni oladi:</p>
<p>a) O‘z lavozim yo‘riqnomasi va mehnat majburiyatlarini vijdonan va sifatli bajarish;</p>
<p>b) Markazga keluvchi o‘quvchi va ota-onalarni munosib kutib olish, murojaatlarni qayta ishlash hamda guruhlar davomatini muntazam yuritish;</p>
<p>c) Ichki mehnat tartibi qoidalariga, mehnat intizomiga va texnika xavfsizligi talablariga qat'iy rioya etish;</p>
<p>d) Ish beruvchining mol-mulkiga (kompyuterlar, aloqa vositalari va jihozlarga) ehtiyotkorona munosabatda bo‘lish;</p>
<p>e) Markazning tijorat sirlari, kompyuterlardagi ma'lumotlar hamda mijozlar bazasi maxfiyligini qat'iy saqlash.</p>
<h2>IV. ISH BERUVCHINING HUQUQLARI VA MAJBURIYATLARI</h2>
<p>4.1. Ish beruvchi quyidagi huquqlarga ega:</p>
<p>a) Xodimdan o‘z mehnat majburiyatlari va lavozim yo‘riqnomasini to‘liq bajarishni talab qilish;</p>
<p>b) Ichki mehnat tartibi qoidalarini buzgan Xodimga nisbatan Mehnat kodeksida belgilangan intizomiy choralar qo‘llash;</p>
<p>c) Xodimni halol va samarali mehnati uchun rag‘batlantirish.</p>
<p>4.2. Ish beruvchi quyidagi majburiyatlarni oladi:</p>
<p>a) Xodimni shartnomada belgilangan ish bilan ta'minlash hamda zaruriy mehnat va texnik vositalarni ajratish;</p>
<p>b) Xodimga belgilangan mehnat haqini o‘z vaqtida va to‘liq hajmda to‘lab berish;</p>
<p>c) Xavfsiz mehnat va maishiy sharoitlarni yaratish;</p>
<p>d) Ushbu mehnat shartnomasini «Yagona milliy mehnat tizimi» (YaMMT) IDAKda belgilangan muddatda va tartibda elektron ro‘yxatdan o‘tkazish.</p>
<h2>V. ISH VAQTI VA MEHNATGA HAQ TO‘LASH SHARTLARI</h2>
<p>5.1. Xodim uchun ish vaqti Markazning ichki mehnat tartibi qoidalari bilan belgilanadi.${hours ? ` Ish vaqti: ${text(hours)}.` : ""}</p>
<p>5.2. Oylik ish haqi miqdori: Xodimga oyiga ${salary} lavozim maoshi belgilanadi.</p>
<p>5.3. Ish haqini to‘lash muddati va tartibi: oylik ish haqi va unga tegishli to‘lovlar har oyda kechiktirilmasdan, har oyning 25-sanasiga qadar Xodimning bank plastik kartasiga o‘tkazib berish yoki naqd pul shaklida to‘liq to‘lab beriladi.</p>
<p>5.4. Ta'til: Xodimga O‘zbekiston Respublikasi Mehnat kodeksining 216–217-moddalariga muvofiq davomiyligi 21 (yigirma bir) kalendar kunidan iborat haq to‘lanadigan yillik asosiy mehnat ta'tili beriladi.</p>
<h2>VI. MAXFIYLIK, LIDLAR VA KOMPYUTER SIRLARI</h2>
<p>6.1. Xodim ish faoliyati davomida hamda ushbu mehnat shartnomasi bekor qilingandan keyin 3 (uch) yil mobaynida Markazning tijorat va ishxona sirlari, kompyuterlardagi fayllar, o‘quv dasturlari hamda mijozlar bazasiga oid ma'lumotlarni boshqa o‘quv markazlariga, raqobatchilarga yoki uchinchi shaxslarga oshkor qilmaslik majburiyatini oladi. Ushbu shart buzilsa, Xodim Ish beruvchiga 15 000 000 (o‘n besh million) so‘m miqdorida shartnomaviy jarima to‘laydi va yetkazilgan zararni to‘liq qoplaydi.</p>
<h2>VII. SHARTNOMANI BEKOR QILISH VA TOVON TO‘LASH TARTIBI</h2>
<p>7.1. Ushbu Mehnat Shartnomasi O‘zbekiston Respublikasi Mehnat kodeksida nazarda tutilgan umumiy asoslar bo‘yicha bekor qilinishi mumkin.</p>
<p>7.2. Mehnat kodeksining 159-moddasiga asosan, agarda ushbu muddatli mehnat shartnomasi Ish beruvchi tomonidan qonunda va shartnomada nazarda tutilgan asoslarsiz muddatidan oldin bir taraflama bekor qilinsa, Ish beruvchi Xodimga 5 000 000 (besh million) so‘m miqdorida tovon to‘lash majburiyatini oladi.</p>
<h2>VIII. YAKUNIY QOIDALAR</h2>
<p>8.1. Ushbu Shartnoma O‘zbekiston Respublikasi Mehnat kodeksining 109-moddasi hamda Vazirlar Mahkamasining 971-son va 796-son qarorlari talablariga muvofiq «YaMMT» IDAKda majburiy elektron ro‘yxatdan o‘tkaziladi.</p>
<p>8.2. Ushbu Shartnomaga kiritiladigan barcha o‘zgartirish va qo‘shimchalar faqat ikki taraflama yozma ravishda va qo‘shimcha kelishuv tuzish orqali amalga oshiriladi.</p>
<p>8.3. Ushbu Shartnoma bir xil yuridik kuchga ega bo‘lgan 2 (ikki) nusxada tuzilib, bir nusxasi Ish beruvchida, bir nusxasi Xodimda saqlanadi.</p>
<h2>IX. TARAFLARNING REKVIZITLARI VA IMZOLARI</h2>
<table class="sides"><tr>
<td>
<p><b>ISH BERUVCHI:</b></p>
<p>“KING’S EDUCATION JIZZAKH” NTM</p>
<p>STIR (INN): 305700644</p>
<p>Manzil: Jizzax shahri, Sharof Rashidov Shoh ko‘chasi, "Darkmen" binosi, 2-qavat</p>
<p>Tel: +998 72 221 97 00</p>
<p>Rahbar: _____________________</p>
<p>Tursunbayev Shahzod Ixtiyor o‘g‘li</p>
<p>M.O‘.</p>
</td>
<td>
<p><b>XODIM:</b></p>
<p>${text(person.full)}</p>
<p>Pasport / ID: ${text(data.passportSeries)}</p>
<p>Berilgan: ${text(data.passportIssued)}, ${text(data.passportIssuer)}</p>
<p>JShSHIR (PINFL): ${text(data.jshshir)}</p>
<p>Manzil: ${text(data.address)}</p>
<p>Tel: ${text(data.phone)}</p>
<p>Imzo: _____________________</p>
</td>
</tr></table>
</body></html>`;
}

function downloadContractDoc(data) {
  const text = (value) => {
    const clean = String(value || "").trim();
    return (clean || "____________")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  };
  const day = (value) => text(uzContractDate(value));
  const contractEnd = addContractTerm(data.hiredAt, data.contractTerm) || data.contractEnd;
  const pay = text(data.perStudentPay || data.agreedSalary);
  const person = contractPerson(data);
  if (data.contractKind === "admin") {
    saveWordFile(buildAdminContractHtml(data), data.contractNumber);
    return;
  }
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>Mehnat shartnomasi</title>
<style>
  body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.35; color: #111; }
  h1 { text-align: center; font-size: 16pt; margin: 0 0 10pt; }
  h2 { font-size: 13pt; margin: 12pt 0 6pt; }
  p { margin: 0 0 6pt; text-align: justify; }
  .center { text-align: center; }
  .sides { width: 100%; margin-top: 8pt; }
  .sides td { width: 50%; vertical-align: top; }
  .place-date { width: 100%; margin: 0 0 10pt; border-collapse: collapse; }
  .place-date td { width: 50%; border: none; padding: 0; }
  .place-date .right { text-align: right; }
</style></head>
<body>
<h1>MEHNAT SHARTNOMASI № ${text(data.contractNumber)}</h1>
<table class="place-date" width="100%"><tr>
<td>Jizzax shahri</td>
<td class="right">${day(data.hiredAt)}</td>
</tr></table>
<p>Nodavlat ta'lim muassasasi «KING'S EDUCATION JIZZAKH» NTM nomidan Ustav asosida faoliyat yurituvchi Direktor Tursunbayev Shahzod Ixtiyor o‘g‘li (keyingi o‘rinlarda — «Ish beruvchi») bir tomondan, va fuqaro ${text(person.full)} (keyingi o‘rinlarda — «Xodim») ikkinchi tomondan, O‘zbekiston Respublikasi Mehnat kodeksiga muvofiq ushbu mehnat shartnomasini quyidagilar haqida tuzdik:</p>
<h2>1. SHARTNOMA MAQSADI VA ISH JOYI</h2>
<p>1.1. Xodim «KING'S EDUCATION JIZZAKH» NTMning ${text(data.department || "O‘quv bo‘limi")}ga ${text(data.position)} lavozimiga ishga qabul qilinadi.</p>
<p>1.2. Xodimning asosiy ish joyi: Jizzax shahar, Sharof Rashidov Shoh ko‘chasi, «Darkmen» binosi, 2-qavat manzilida joylashgan «KING'S EDUCATION JIZZAKH» NTM o‘quv binosi hisoblanadi.</p>
<p>1.3. Ushbu mehnat shartnomasi O‘zR MK 113-moddasiga asosan ${text(monthsAsYears(data.contractTerm))} muddatga (${day(data.hiredAt)}dan ${day(contractEnd)}ga qadar) tuziladi.</p>
<p>1.4. Xodim ishga dastlabki sinov muddati ${text(data.probation || "0 oy")} bilan qabul qilinadi (O‘zR MK 129-moddasi).</p>
<p>1.5. YAGONA MEHNAT FAOLIYATI VA EKSKLYUZIVLIK SHARTI: Xodim ushbu mehnat shartnomasi amal qilish davrida faqatgina «KING'S EDUCATION JIZZAKH» NTMda asosiy ish joyi bo‘yicha mehnat faoliyatini olib borishi shart. Xodimga Ish beruvchining oldindan berilgan rasmiy yozma ruxsatisiz boshqa o‘quv markazlarida, xususiy yoki davlat ta'lim muassasalarida va tashkilotlarida o‘rindoshlik asosida (ichki yoki tashqi) yoxud fuqarolik-huquqiy shartnomalar (G‘HSH) bo‘yicha parallel ravishda dars berish, repetitorlik qilish va har qanday mehnat faoliyatini amalga oshirish qat'iyan taqiqlanadi (O‘zR MK 104, 433-moddalari).</p>
<h2>2. XODIMNING HUQUQ VA MAJBURIYATLARI</h2>
<p>2.1. Xodim quyidagi huquqlarga ega: mehnat shartnomasida shartlashilgan ish bilan ta'minlanish; xavfsiz va gigiyena talablariga javob beradigan ish joyiga ega bo‘lish; bajargan mehnati uchun o‘z vaqtida va to‘liq miqdorda ish haqi olish; har yilgi haq to‘lanadigan mehnat ta'tilidan foydalanish (O‘zR MK 21-moddasi).</p>
<p>2.2. Xodimning majburiyatlari: ${text(data.position)} bo‘yicha dars mashg‘ulotlarini yuqori sifat va samaradorlik bilan o‘tkazish; o‘quv dasturlari va dars jadvaliga qat'iy rioya etish; Ichki mehnat tartibi qoidalari, mehnat intizomi va mehnat muhofazasi talablarini bajarish; Ish beruvchining mol-mulki va kompyuter/o‘quv texnikasini ehtiyotlab saqlash; o‘quvchilar va ularning ota-onalari bilan xushmuomala bo‘lish (O‘zR MK 22-moddasi).</p>
<h2>3. ISH BERUVCHINING HUQUQ VA MAJBURIYATLARI</h2>
<p>3.1. Ish beruvchi quyidagi huquqlarga ega: Xodimdan o‘z mehnat majburiyatlarini intizom bilan va sifatli bajarishni, Ichki mehnat tartibi qoidalariga rioya etishni talab qilish; Xodimlarni halol va samarali mehnati uchun rag‘batlantirish; mehnat intizomini buzgan Xodimlarni O‘zR MKda belgilangan tartibda intizomiy va moddiy javobgarlikka tortish (O‘zR MK 24-moddasi).</p>
<p>3.2. Ish beruvchining majburiyatlari: Xodimni shartnomada belgilangan ish bilan ta'minlash va zarur o‘quv xonasi hamda texnik vositalarni ajratish; ish haqini belgilangan muddatlarda to‘liq to‘lash; Xodimning mehnatini muhofaza qilish va xavfsiz ish sharoitlarini yaratish; ushbu shartnomani «Yagona milliy mehnat tizimi» (YAMMT) IDAKda 5 ish kuni ichida elektron ro‘yxatdan o‘tkazish (VM 971-son qarori).</p>
<h2>4. MEHNATGA HAQ TO‘LASH VA ISH VAQTI REJIMI</h2>
<p>4.1. Xodimga o‘zi o‘qitadigan har bir o‘quvchi uchun: ${pay} miqdorida oylik ish haqi to‘lanadi.</p>
<p>4.2. Oylik ish haqi har oyda 2 marta (bo‘nak va oylik yakuniy hisob-kitob) amalga oshirilib, oylik yakuniy ish haqi har oyning 25-sanasigacha to‘lab beriladi (O‘zR MK 253-moddasi).</p>
<p>4.3. Xodim uchun dars jadvaliga muvofiq ravishda tasdiqlangan moslashuvchan (soatbay) ish vaqti rejimi va 6 kunlik ish haftasi belgilanadi. Ish vaqti: ${text(data.workHours)}.</p>
<p>4.4. Xodimga davomiyligi 21 (yigirma bir) kalendar kundan iborat bo‘lgan har yilgi asosiy haq to‘lanadigan mehnat ta'tili beriladi (O‘zR MK 217-moddasi).</p>
<h2>5. INTELLEKTUAL MULK VA KONFIDENSIYALLIK</h2>
<p>5.1. Xodim tomonidan mehnat faoliyati davomida Ish beruvchining topshirig‘i yoki resurslari hisobidan yaratilgan barcha o‘quv dasturlari, metodik qo‘llanmalar, dars ishlanmalari va taqdimotlar Ish beruvchining mutlaq intellektual mulki hisoblanadi.</p>
<p>5.2. Xodim «KING'S EDUCATION JIZZAKH» NTMning tijorat siri bo‘lgan ma'lumotlarni (o‘quvchilar va ularning ota-onalari bazasi, telefon raqamlari, narx siyosati, o‘quv metodikalari va moliyaviy ko‘rsatkichlar) oshkor etmaslik majburiyatini oladi.</p>
<h2>6. MOLIYAVIY HIMOYA, NEUSTOYKA VA ZARARNI QOPLASH</h2>
<p>6.1. Xodim shartnoma muddatli bo‘lganligi sababli uni o‘z vajlari bilan uzrsiz sabablarga ko‘ra muddatidan oldin bir tomonlama bekor qilsa, Ish beruvchiga 5 000 000 (besh million) so‘m miqdorida neustoyka (tovon) to‘laydi (O‘zR MK 159, 160-moddalari).</p>
<p>6.2. Xodim ishdan bo‘shagandan so‘ng 3 (uch) yil davomida NTMning tijorat siri va o‘quvchilar bazasini oshkor etsa yoki uchinchi shaxslarga topshirsa, Ish beruvchiga 15 000 000 (o‘n besh million) so‘m miqdorida jarima to‘laydi hamda yetkazilgan barcha haqiqiy zararni qoplaydi (O‘zR MK 316, 318, 341-moddalari).</p>
<p>6.3. Xodim NTMda ta'lim olayotgan o‘quvchilarni o‘zining shaxsiy uyiga yoki boshqa o‘quv markazlariga olib ketgan (og‘dirgan) taqdirda, Ish beruvchiga har bir olib ketilgan o‘quvchining 1 oylik o‘quv to‘lovi summasining 6 (olti) baravari miqdorida jarima to‘laydi.</p>
<p>6.4. Xodim o‘ziga topshirilgan kompyuter va o‘quv jihozlarining but saqlanishi uchun moddiy javobgar hisoblanadi va yetkazilgan bevosita haqiqiy zararni to‘liq qoplaydi.</p>
<h2>7. SHARTNOMANI BEKOR QILISH TARTIBI</h2>
<p>7.1. Ushbu mehnat shartnomasi quyidagi hollarda bekor qilinadi: shartnoma muddati tugashi bilan (O‘zR MK 158-modda); taraflarning kelishuviga ko‘ra (O‘zR MK 157-modda); Xodimning tashabbusiga ko‘ra (O‘zR MK 160-modda); Ish beruvchining tashabbusiga ko‘ra (O‘zR MK 161-modda); taraflarning ixtiyoriga bog‘liq bo‘lmagan holatlarga ko‘ra (O‘zR MK 168-modda).</p>
<p>7.2. Xodim tomonidan eksklyuzivlik shartlari (1.5-band), tijorat siri yoki mehnat intizomi bir marta qo‘pol ravishda buzilishi (O‘zR MK 161-moddasi 2-qismi 5-bandi va 162-modda) shartnomani Ish beruvchi tashabbusi bilan darhol bekor qilishga asos bo‘ladi.</p>
<h2>8. YAKUNIY QOIDALAR VA REKVIZITLAR</h2>
<p>8.1. Shartnomani o‘zgartirish va to‘ldirish faqat taraflarning o‘zaro yozma kelishuvi hamda qo‘shimcha kelishuv imzolanishi orqali amalga oshiriladi.</p>
<p>8.2. Ushbu shartnoma bir xil yuridik kuchga ega bo‘lgan 2 (ikki) nusxada tuzilib, bir nusxasi Xodimga, bir nusxasi Ish beruvchida saqlanadi.</p>
<table class="sides"><tr>
<td>
<p><b>ISH BERUVCHI:</b></p>
<p>«KING'S EDUCATION JIZZAKH» NTM</p>
<p>STIR (INN): 306700644</p>
<p>Manzil: Jizzax sh., Sh.Rashidov shohko‘chasi, «Darkmen» binosi, 2-qavat</p>
<p>Tel: 72 221 97 00</p>
<p>Direktor: ____________ Tursunbayev Sh.I.</p>
<p>M.O‘ / Imzo</p>
</td>
<td>
<p><b>XODIM:</b></p>
<p>${text(person.full)}</p>
<p>Pasport: ${text(data.passportSeries)}</p>
<p>Berilgan: ${text(data.passportIssued)}, ${text(data.passportIssuer)}</p>
<p>JSHSHIR (PINFL): ${text(data.jshshir)}</p>
<p>Manzil: ${text(data.address)}</p>
<p>Tel: ${text(data.phone)}</p>
<p>Imzo: ____________________</p>
<p>Sana: ${day(data.hiredAt)}</p>
</td>
</tr></table>
</body></html>`;
  saveWordFile(html, data.contractNumber);
}

function formatDate(value) {
  if (!value) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tashkent",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );
  const months = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
  return `${parts.day} ${months[Number(parts.month) - 1]}, ${parts.hour}:${parts.minute}`;
}

function showLogin() {
  loginView.classList.remove("hidden");
  appView.classList.add("hidden");
}

function showApp() {
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  const who = [currentUser?.surname, currentUser?.name].filter(Boolean).join(" ");
  document.querySelector("#whoami-name").textContent = who;
  document.querySelector("#open-staff").classList.toggle("hidden", currentUser?.role !== "admin");
}

function byName(a, b) {
  return String(a.fullName || "").localeCompare(String(b.fullName || ""), "uz");
}

function byDate(direction) {
  return (a, b) => {
    const left = new Date(a.createdAt || 0).getTime();
    const right = new Date(b.createdAt || 0).getTime();
    return direction === "oldest" ? left - right : right - left;
  };
}

function searchedItems() {
  const query = searchEl.value.trim().toLowerCase();
  if (!query) return allItems;
  return allItems.filter((item) =>
    [item.fullName, item.phone, item.parentPhone, item.username, item.position]
      .some((value) => String(value || "").toLowerCase().includes(query)),
  );
}

function interviewKey(status) {
  if (status === "arrived") return "arrived";
  if (status === "hired") return "hired";
  if (status === "missed") return "missed";
  if (status === "expected" || status === "called") return "expected";
  return "none";
}

const interviewLabels = {
  none: "Chaqirilmagan",
  expected: "Chaqirildi",
  arrived: "Keldi",
  missed: "Kelmagan",
  hired: "Ishga kirgan",
};

function dateMatch(item) {
  const from = dateFromEl.value;
  const to = dateToEl.value;
  if (!from && !to) return true;
  const time = new Date(item.createdAt || 0).getTime();
  if (!Number.isFinite(time)) return false;
  if (from && time < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && time > new Date(`${to}T23:59:59.999`).getTime()) return false;
  return true;
}

function statusMatch(item) {
  if (activeStatus === "none" || activeStatus === "expected" || activeStatus === "arrived" || activeStatus === "missed" || activeStatus === "hired") {
    return interviewKey(item.interviewStatus) === activeStatus;
  }
  if (activeStatus === "scored") return item.score !== null && item.score !== undefined;
  return true;
}

function staffMark(value) {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const initial = parts[1] ? `${parts[1].replace(/\./g, "").charAt(0).toUpperCase()}.` : "";
  return [parts[0], initial].filter(Boolean).join(" ");
}

function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { surname: "—", name: "—", patronymic: "—" };
  if (parts.length === 1) return { surname: parts[0], name: "—", patronymic: "—" };
  const [surname, name, ...rest] = parts;
  return { surname, name, patronymic: rest.join(" ") || "—" };
}

function formatSum(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return `${Number(digits).toLocaleString("ru-RU")} so'm`;
}

function formatPhone(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length > 9) digits = digits.slice(-9);
  if (digits.length < 9) return digits;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
}

function heartHtml(item) {
  return `<span class="fav ${item.favorite ? "on" : ""}" data-fav="${esc(item._id)}" role="button" aria-label="Izbranniy"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z"/></svg></span>`;
}

function cardActions(item) {
  const heart = heartHtml(item);
  if (currentUser?.role !== "admin") return heart;
  const action = archiveMode
    ? `<span class="card-act restore" data-restore="${esc(item._id)}" role="button" aria-label="Arxivdan chiqarish"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v5h16v-5M12 16V4M8 8l4-4 4 4"/></svg></span>`
    : `<span class="card-act" data-archive="${esc(item._id)}" role="button" aria-label="Arxivga o‘tkazish"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg></span>`;
  return `<span class="card-acts">${action}${heart}</span>`;
}

function cardHtml(item) {
  const person = splitName(item.fullName);
  const photo = item.hasPhoto
    ? `<img class="id-photo" src="/api/applications/${esc(item._id)}/photo" alt="" />`
    : `<span class="id-photo id-photo-empty">Rasm yo‘q</span>`;
  return `
    <button class="idcard${currentUser?.role === "admin" ? " has-act" : ""}" type="button" data-id="${esc(item._id)}">
      ${cardActions(item)}
      <div class="id-head">
        <span class="id-logo">QABUL</span>
        <span class="id-title tone-${interviewKey(item.interviewStatus)}">ARIZA KARTASI<span class="id-added">${esc(formatDate(item.createdAt) || "—")}</span></span>
      </div>
      <div class="id-main">
        ${photo}
        <div class="id-info">
          <p><span class="id-label">Suhbat</span><span class="id-value">${esc(interviewLabels[interviewKey(item.interviewStatus)])}</span></p>
          <p><span class="id-label">Suhbat vaqti</span><span class="id-value">${esc(prettyStamp(item.interviewAt) || "—")}</span></p>
          <p><span class="id-label">Ball</span><span class="id-value">${item.score == null || item.score === "" ? "—" : `${Math.round(Number(item.score))} / 10`}</span></p>
          <p><span class="id-label">Familiya, ism</span><span class="id-value">${esc(person.surname)} ${esc(person.name)}</span></p>
          <p><span class="id-label">Telefon</span><span class="id-value">${esc(formatPhone(item.phone) || "—")}</span></p>
          <p><span class="id-label">Tug‘ilgan sanasi</span><span class="id-meta">${esc(item.birthday || "—")}</span></p>
          <p><span class="id-label">Yo‘nalish</span><span class="id-meta">${esc(item.position || "—")}</span></p>
          <p><span class="id-label">Qo'shimcha yoki ota-ona telefoni</span><span class="id-meta">${esc(formatPhone(item.parentPhone) || "—")}</span></p>
          <p><span class="id-label">Til darajasi</span><span class="id-meta">${esc(item.languageLevel || "—")}</span></p>
        </div>
      </div>
    </button>`;
}

function groupOrder(items) {
  const names = [...knownPositions];
  for (const item of items) {
    if (item.position && !names.includes(item.position)) names.push(item.position);
  }
  return names;
}

function fillSelect(select, options, current) {
  select.innerHTML = options
    .map((option) => `<option value="${esc(option.value)}">${esc(option.label)}</option>`)
    .join("");
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function render() {
  const found = searchedItems().filter(dateMatch).filter(statusMatch);
  const dated = allItems.filter(dateMatch);
  const counts = new Map();
  for (const item of found) {
    const key = item.position || "Yo‘nalishsiz";
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const directions = groupOrder(found).filter((name) => counts.get(name));
  const directionCount = new Set(allItems.map((item) => item.position).filter(Boolean)).size;
  const latest = allItems[0] ? formatDate(allItems[0].createdAt) : "—";
  const totalLabel = archiveMode ? "Arxivdagi ariza" : "Jami ariza";

  statsEl.innerHTML = `
    <div class="stat"><span>${totalLabel}</span><b>${allItems.length}</b></div>
    <div class="stat"><span>Yo‘nalishlar</span><b>${directionCount}</b></div>
    <div class="stat"><span>So‘nggi ariza</span><b style="font-size:18px">${esc(latest)}</b></div>
  `;

  const positionPool = groupOrder(allItems);
  fillSelect(
    positionEl,
    [
      { value: "", label: "Barchasi" },
      ...positionPool
        .map((name) => {
          const count = dated.filter((item) => item.position === name).length;
          return count ? { value: name, label: `${name} (${count})` } : null;
        })
        .filter(Boolean),
    ],
    activePosition,
  );

  const countStatus = (key) => dated.filter((item) => interviewKey(item.interviewStatus) === key).length;
  const scoredCount = dated.filter((item) => item.score !== null && item.score !== undefined).length;
  fillSelect(
    statusEl,
    [
      { value: "", label: "Barchasi" },
      { value: "none", label: `Chaqirilmagan (${countStatus("none")})` },
      { value: "expected", label: `Chaqirildi (${countStatus("expected")})` },
      { value: "arrived", label: `Keldi (${countStatus("arrived")})` },
      { value: "missed", label: `Kelmagan (${countStatus("missed")})` },
      { value: "hired", label: `Ishga kirgan (${countStatus("hired")})` },
      { value: "scored", label: `Ball qo‘yilgan (${scoredCount})` },
    ],
    activeStatus,
  );

  let visible = activePosition
    ? found.filter((item) => item.position === activePosition)
    : found;
  if (activeSort === "favorite") visible = visible.filter((item) => item.favorite);
  const sort = activeSort;

  if (!visible.length) {
    listEl.innerHTML = archiveMode
      ? `<p class="empty">Arxiv bo‘sh. O‘chirilgan arizalar shu yerda turadi.</p>`
      : `<p class="empty">Hozircha bu bo‘yicha ariza yo‘q. Botdan yangi ariza kelganda shu yerda ko‘rinadi.</p>`;
    return;
  }

  if (sort === "position" && !activePosition) {
    listEl.innerHTML = directions
      .map((name) => {
        const cards = visible
          .filter((item) => (item.position || "Yo‘nalishsiz") === name)
          .sort(byDate("newest"))
          .map(cardHtml)
          .join("");
        return `
          <section class="group">
            <div class="group-head">
              <h2>${esc(name)}</h2>
              <span class="badge">${counts.get(name)} ta</span>
            </div>
            <div class="cards">${cards}</div>
          </section>`;
      })
      .join("");
    return;
  }

  if (sort === "name") visible = [...visible].sort(byName);
  else visible = [...visible].sort(byDate(sort === "oldest" ? "oldest" : "newest"));

  const title = activePosition
    || (sort === "favorite" ? "Izbranniy" : sort === "all" ? "Barchasi" : sort === "name" ? "Ism bo‘yicha" : sort === "oldest" ? "Eskisidan" : sort === "newest" ? "Yangisidan" : "Sana bo‘yicha");
  listEl.innerHTML = `
    <section class="group">
      <div class="group-head">
        <h2>${esc(title)}</h2>
        <span class="badge">${visible.length} ta</span>
      </div>
      <div class="cards">${visible.map(cardHtml).join("")}</div>
    </section>`;
}

async function loadApplications() {
  const res = await fetch(archiveMode ? "/api/applications?archived=1" : "/api/applications");
  if (res.status === 401) return showLogin();
  const data = await res.json();
  allItems = data.items || [];
  knownPositions = data.positions || [];
  render();
}

async function openDetail(id, silent = false) {
  const res = await fetch(`/api/applications/${id}${silent ? "?silent=1" : ""}`);
  if (!res.ok) return;
  const { item } = await res.json();
  const index = allItems.findIndex((entry) => entry._id === id);
  if (index >= 0) allItems[index] = { ...allItems[index], ...item };
  detailTitle.textContent = item.fullName || "Ariza";
  detailPosition.textContent = item.position || "Yo‘nalishsiz";

  const person = splitName(item.fullName);
  const shown = (value) => (value === 0 || value ? esc(value) : "—");
  const block = (label, value, wide = false) => `
    <div class="pass-field ${wide ? "wide" : ""}">
      <span>${label}</span>
      <strong>${shown(value)}</strong>
    </div>`;
  const editCard = (key, label, display, control, askSave = false) => `
    <div class="pass-field edit-card" data-edit="${key}">
      <span>${label}</span>
      <strong class="edit-view">${shown(display)}</strong>
      <div class="edit-box">
        ${control}
        ${askSave ? `<button type="button" class="card-save">Saqlash</button>` : ""}
      </div>
    </div>`;

  const interview = interviewKey(item.interviewStatus);
  const photoUrl = `/api/applications/${esc(item._id)}/photo`;
  const docSlots = [
    ["passportFront", "Pasport oldi", item.hasPassportFront, item.passportFrontName, item.passportFrontType],
    ["passportBack", "Pasport orqasi", item.hasPassportBack, item.passportBackName, item.passportBackType],
    ["diploma", "Diplom", item.hasDiploma, item.diplomaName, item.diplomaType],
    ["certificate", "Sertifikat", item.hasCertificate, item.certificateName, item.certificateType],
    ["signedContract", "Imzolangan shartnoma", item.hasSignedContract, item.signedContractName, item.signedContractType, "application/pdf,.pdf"],
  ];
  const docHtml = docSlots.map(([slot, label, has, fileName, type, accept]) => {
    const url = `/api/applications/${esc(item._id)}/docs/${slot}`;
    const fallback = String(type || "").includes("pdf") ? "hujjat.pdf" : "rasm.jpg";
    const name = String(fileName || "").trim() || fallback;
    const pdf = String(type || "").includes("pdf") || slot === "signedContract";
    const preview = has
      ? `<div class="doc-open" data-src="${url}" data-pdf="${pdf ? "1" : "0"}" title="${esc(name)}">${
          pdf
            ? `<iframe src="${url}" title="${esc(name)}"></iframe>`
            : `<img src="${url}" alt="${esc(name)}" />`
        }</div>`
      : `<div class="doc-empty">Bo‘sh</div>`;
    return `
      <div class="doc-slot" data-doc="${slot}">
        <span>${label}</span>
        ${preview}
        ${has ? `<p class="doc-name" title="${esc(name)}">${esc(name)}</p>` : ""}
        <div class="doc-actions">
          <label class="doc-pick" title="Joylash" aria-label="Joylash"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V6M8 10l4-4 4 4M5 19h14"/></svg><input type="file" accept="${accept || "image/jpeg,image/png,image/webp,application/pdf"}" hidden /></label>
          ${has ? `<a class="doc-save" href="${url}?download=1" title="Yuklab olish" aria-label="Yuklab olish"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v10M8 10l4 4 4-4M5 19h14"/></svg></a>` : ""}
          ${has ? `<button type="button" class="doc-clear" title="Olib tashlash" aria-label="Olib tashlash"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg></button>` : ""}
        </div>
      </div>`;
  }).join("");
  detailBody.innerHTML = `
    <article class="pass" id="pass-card">
      <div class="pass-top">
      <div class="pass-photo-col">
        ${
          item.hasPhoto
            ? `<div class="photo-frame"><button type="button" class="photo-open" id="open-photo"><img src="${photoUrl}" alt="Nomzod rasmi" /></button><a class="photo-download" href="${photoUrl}?download=1" aria-label="Yuklab olish" title="Yuklab olish"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v10M8 10l4 4 4-4M5 19h14"/></svg></a></div>`
            : `<div class="pass-empty">Rasm yo‘q</div>`
        }
      </div>
        <div class="pass-identity">
          <div class="pass-who">
            <p class="pass-kicker">Familiya · Ism · Otasining ismi</p>
            <h2 class="pass-name">${esc(person.surname)} ${esc(person.name)} ${esc(person.patronymic)}</h2>
            <p class="pass-role">${esc(item.position || "Yo‘nalishsiz")}</p>
            <p class="pass-interviewer" id="who-called">Suhbatga chaqirgan: ${esc(staffMark(item.callerName) || "hali belgilanmagan")}</p>
            <p class="pass-interviewer" id="who-ran">Suhbat o‘tkazuvchi: ${esc(staffMark(item.interviewerName) || "hali belgilanmagan")}</p>
          </div>
          <button type="button" class="contract-launch" id="open-contract">Shartnomani ko‘rish</button>
          ${editCard(
            "interviewStatus",
            "Suhbat",
            interviewLabels[interview],
            `<div class="choice mini">
              <button type="button" data-call="none">Chaqirilmagan</button>
              <button type="button" data-call="expected">Chaqirildi</button>
              <button type="button" data-call="arrived">Keldi</button>
              <button type="button" data-call="missed">Kelmagan</button>
              <button type="button" data-call="hired">Ishga kirgan</button>
            </div>`,
          )}
          ${editCard("interviewAt", "Suhbat vaqti", prettyStamp(item.interviewAt), `<input name="interviewAt" type="datetime-local" value="${esc(item.interviewAt || "")}" />`)}
          ${editCard("workStart", "Ish boshlash", prettyStamp(item.workStart), `<input name="workStart" type="date" value="${esc(item.workStart || "")}" />`)}
          ${editCard("agreedSalary", "Kelishilgan oylik", formatSum(item.agreedSalary), `<input name="agreedSalary" value="${esc(formatSum(item.agreedSalary))}" placeholder="5 000 000" />`)}
          ${editCard(
            "score",
            "Ball",
            item.score == null || item.score === "" ? "" : `${Math.round(Number(item.score))} / 10`,
            `<input name="score" type="number" min="1" max="10" step="1" value="${item.score == null || item.score === "" ? "" : Math.round(Number(item.score))}" placeholder="1–10" />`,
          )}
          <div class="pass-next">
            ${block("Tug‘ilgan sana", item.birthday)}
            ${editCard("phone", "Telefon", formatPhone(item.phone), `<input name="phone" value="${esc(formatPhone(item.phone))}" placeholder="99 999 99 99" />`, true)}
            ${editCard("parentPhone", "Qo'shimcha yoki ota-ona telefoni", formatPhone(item.parentPhone), `<input name="parentPhone" value="${esc(formatPhone(item.parentPhone))}" placeholder="99 999 99 99" />`, true)}
            ${block("Millati", item.nation)}
            ${block("Oilaviy holat", item.maritalStatus)}
          </div>
          <div class="pass-meta">
            ${block("Telegram", item.username ? `@${item.username}` : "")}
            ${block("Ma’lumot", item.education)}
            ${block("Tugatish yili", item.graduationYear)}
            ${block("Til darajasi", item.languageLevel)}
            ${block("Kompyuter", item.computerSkills)}
          </div>
        </div>
        <div class="pass-raise">
          ${editCard("workHours", "Ish vaqti", item.workHours, `<input name="workHours" value="${esc(item.workHours || "")}" placeholder="09:00 dan 14:00 gacha" />`, true)}
          ${editCard("workDuration", "Ishlash muddati", item.workDuration, `<input name="workDuration" value="${esc(item.workDuration || "")}" placeholder="6 oy" />`, true)}
          ${block("Oxirgi oylik", formatSum(item.lastSalary))}
          ${block("Kutilayotgan oylik", formatSum(item.expectedSalary))}
          ${block("Yuborilgan vaqt", formatDate(item.createdAt))}
          ${block("O‘quv muassasasi", item.institution, true)}
          ${block("Manzil", item.address, true)}
          ${block("Oldingi ish", item.prevJob, true)}
          ${block("E’lon manbasi", item.foundResource)}
          ${block("Telegram ID", item.telegramUserId)}
        </div>
      </div>
        ${editCard("note", "Izoh", item.note, `<textarea name="note" rows="4" maxlength="2000" placeholder="Izoh yozing">${esc(item.note || "")}</textarea>`)}
    </article>
    <article class="contract-page hidden" id="contract-page">
      <div class="contract-head">
        <button type="button" class="icon-btn" id="close-contract" aria-label="Orqaga">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6"/></svg>
        </button>
        <div>
          <p class="eyebrow">Mehnat shartnomasi</p>
          <h2>Kartalarni to‘ldiring</h2>
        </div>
        <div class="contract-kind">
          <button type="button" class="contract-kind-btn" id="contract-kind-toggle">${item.contractKind === "admin" ? "Administrator" : "O‘qituvchilar"}</button>
          <div class="contract-kind-menu hidden" id="contract-kind-menu">
            <button type="button" data-kind="teacher">O‘qituvchilar</button>
            <button type="button" data-kind="admin">Administrator</button>
          </div>
        </div>
      </div>
      <div class="contract-cards">
        ${editCard("contractNumber", "Shartnoma raqami", item.contractNumber, `<input name="contractNumber" value="${esc(item.contractNumber || "")}" maxlength="40" placeholder="15654" />`, true)}
        ${editCard("hiredAt", "Ishga qabul qilingan kun", uzContractDate(item.hiredAt), `<div class="hire-date"><input name="hiredAt" value="${esc(uzContractDate(item.hiredAt))}" placeholder="2026-yil 15-noyabr" /><input class="hire-cal" type="date" value="${esc(String(item.hiredAt || "").slice(0, 10))}" aria-label="Kalendar" /></div>`, true)}
        ${editCard("contractTerm", "Shartnoma muddati (oy)", normalizeContractMonths(item.contractTerm || ""), `<input name="contractTerm" value="${esc(normalizeContractMonths(item.contractTerm || ""))}" placeholder="1" />`, true)}
        <div class="pass-field" id="contract-end-card">
          <span>Shartnoma tugash sanasi</span>
          <strong id="contract-end-view">${shown(uzContractDate(addContractTerm(String(item.hiredAt || "").slice(0, 10), item.contractTerm) || item.contractEnd))}</strong>
        </div>
        ${editCard("department", "Bo‘lim", item.department || "O‘quv bo‘limi", `<input name="department" value="${esc(item.department || "O‘quv bo‘limi")}" />`, true)}
        ${editCard("probation", "Sinov muddati", item.probation || "0 oy", `<input name="probation" value="${esc(item.probation || "0 oy")}" placeholder="0 oy" />`, true)}
        ${editCard("fullName", "Xodim F.I.Sh", item.fullName, `<input name="fullName" value="${esc(item.fullName || "")}" placeholder="Familiya Ism" />`, true)}
        ${editCard("fatherName", "Otasining ismi", item.fatherName, `<input name="fatherName" value="${esc(item.fatherName || "")}" placeholder="Otasining ismi" />`, true)}
        ${editCard("birthday", "Tug‘ilgan sana", item.birthday, `<input name="birthday" value="${esc(item.birthday || "")}" placeholder="KK.OO.YYYY" />`, true)}
        ${editCard("passportSeries", "Pasport seriyasi", item.passportSeries, `<input name="passportSeries" value="${esc(item.passportSeries || "")}" maxlength="20" placeholder="AA1234567" />`, true)}
        ${editCard("passportIssued", "Pasport berilgan sana", item.passportIssued, `<input name="passportIssued" value="${esc(item.passportIssued || "")}" placeholder="05.02.2025" />`, true)}
        ${editCard("passportIssuer", "Pasport bergan organ", item.passportIssuer, `<input name="passportIssuer" value="${esc(item.passportIssuer || "")}" placeholder="IIV 8213" />`, true)}
        ${editCard("jshshir", "JSHSHIR", item.jshshir, `<input name="jshshir" value="${esc(item.jshshir || "")}" maxlength="14" inputmode="numeric" placeholder="14 raqam" />`, true)}
        ${editCard("address", "Manzil", item.address, `<input name="address" value="${esc(item.address || "")}" />`, true)}
        ${editCard("phone", "Telefon", formatPhone(item.phone), `<input name="phone" value="${esc(formatPhone(item.phone))}" placeholder="99 999 99 99" />`, true)}
        ${editCard("position", "Lavozim", item.position, `<input name="position" value="${esc(item.position || "")}" />`, true)}
        ${editCard("workHours", "Ish vaqti", item.workHours, `<input name="workHours" value="${esc(item.workHours || "")}" placeholder="08:00-14:00" />`, true)}
        ${editCard("perStudentPay", "Har bir o‘quvchi uchun haq", item.perStudentPay, `<input name="perStudentPay" value="${esc(item.perStudentPay || "")}" placeholder="150 000 so‘m" />`, true)}
      </div>
      <section class="docs">
        ${docHtml}
      </section>
      <button type="button" class="contract-make" id="make-contract">Shartnomani tayyorlash</button>
    </article>
    ${
      item.hasPhoto
        ? `<div id="photo-lightbox" class="lightbox hidden"><button type="button" class="icon-btn" id="close-photo" aria-label="Yopish"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button><img src="${photoUrl}" alt="" /></div>`
        : ""
    }
    <div id="doc-lightbox" class="lightbox hidden">
      <div class="lightbox-tools">
        <label class="doc-pick" title="Joylash" aria-label="Joylash"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V6M8 10l4-4 4 4M5 19h14"/></svg><input id="doc-lightbox-file" type="file" hidden /></label>
        <a id="doc-lightbox-download" class="doc-save" title="Yuklab olish" aria-label="Yuklab olish"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v10M8 10l4 4 4-4M5 19h14"/></svg></a>
        <button type="button" id="doc-lightbox-clear" class="doc-clear" title="Olib tashlash" aria-label="Olib tashlash"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg></button>
        <button type="button" class="icon-btn" id="close-doc" aria-label="Yopish"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      </div>
      <img id="doc-lightbox-img" alt="" /><iframe id="doc-lightbox-frame" class="hidden" title="Hujjat"></iframe>
    </div>
  `;
  const detailFav = document.querySelector("#detail-fav");
  detailFav.classList.toggle("on", Boolean(item.favorite));
  detailFav.dataset.fav = item._id;
  detail.showModal();

  const draft = {
    interviewStatus: interview,
    score: item.score == null || item.score === "" ? "" : Math.round(Number(item.score)),
    note: item.note || "",
    agreedSalary: formatSum(item.agreedSalary),
    lastSalary: formatSum(item.lastSalary),
    expectedSalary: formatSum(item.expectedSalary),
    phone: formatPhone(item.phone),
    parentPhone: formatPhone(item.parentPhone),
    workHours: item.workHours || "",
    workDuration: item.workDuration || "",
    passportSeries: item.passportSeries || "",
    jshshir: item.jshshir || "",
    contractNumber: item.contractNumber || "",
    contractKind: item.contractKind === "admin" ? "admin" : "teacher",
    hiredAt: String(item.hiredAt || "").slice(0, 10),
    contractTerm: normalizeContractMonths(item.contractTerm || ""),
    contractEnd: addContractTerm(String(item.hiredAt || "").slice(0, 10), item.contractTerm) || item.contractEnd || "",
    department: item.department || "O‘quv bo‘limi",
    probation: item.probation || "0 oy",
    perStudentPay: item.perStudentPay || "",
    passportIssued: item.passportIssued || "",
    passportIssuer: item.passportIssuer || "",
    fullName: item.fullName || "",
    fatherName: item.fatherName || "",
    position: item.position || "",
    address: item.address || "",
    birthday: item.birthday || "",
    interviewAt: item.interviewAt || "",
    workStart: item.workStart || "",
  };

  const interviewCard = detailBody.querySelector('[data-edit="interviewStatus"]');
  function paintInterview(card) {
    card.classList.remove("tone-none", "tone-expected", "tone-arrived", "tone-missed", "tone-hired");
    card.classList.add(`tone-${interviewKey(draft.interviewStatus)}`);
  }
  if (interviewCard) paintInterview(interviewCard);

  function viewText(key) {
    if (key === "interviewStatus") return interviewLabels[interviewKey(draft.interviewStatus)];
    if (key === "hiredAt" || key === "contractEnd") return uzContractDate(draft[key]) || "—";
    if (key === "interviewAt" || key === "workStart") return prettyStamp(draft[key]) || "—";
    if (key === "phone" || key === "parentPhone") return formatPhone(draft[key]) || "—";
    if (key === "agreedSalary" || key === "lastSalary" || key === "expectedSalary") return formatSum(draft[key]) || "—";
    if (key === "score") return draft.score === "" || draft.score == null ? "—" : `${draft.score} / 10`;
    if (draft[key] === 0 || draft[key]) return String(draft[key]);
    return "—";
  }

  async function commit(card) {
    const key = card.dataset.edit;
    const input = card.querySelector("input, textarea");
    const previousContractNumber = draft.contractNumber;
    if (key === "interviewStatus") {
      draft.interviewStatus = card.dataset.pending || draft.interviewStatus;
    } else if (key === "score") {
      const raw = String(input?.value || "").trim();
      if (!raw) draft.score = "";
      else {
        const num = Math.round(Number(raw));
        if (!Number.isFinite(num) || num < 1 || num > 10) return;
        draft.score = num;
        input.value = String(num);
      }
    } else if (input) {
      if (key === "phone" || key === "parentPhone") draft[key] = formatPhone(input.value);
      else if (key === "agreedSalary" || key === "lastSalary" || key === "expectedSalary") draft[key] = formatSum(input.value);
      else if (key === "jshshir") draft[key] = String(input.value || "").replace(/\D/g, "").slice(0, 14);
      else if (key === "passportSeries") draft[key] = String(input.value || "").trim().toUpperCase().slice(0, 20);
      else if (key === "hiredAt") {
        const parsed = parseUzContractDate(input.value);
        if (parsed || !String(input.value || "").trim()) draft.hiredAt = parsed;
        input.value = uzContractDate(draft.hiredAt);
      } else draft[key] = key === "contractTerm" ? normalizeContractMonths(input.value) : input.value;
      if (key !== "hiredAt") input.value = draft[key];
      if (key === "hiredAt" || key === "contractTerm") {
        draft.contractEnd = addContractTerm(draft.hiredAt, draft.contractTerm);
      }
    }
    const salaryReady = String(draft.agreedSalary || "").replace(/\D/g, "");
    const conducted = (key === "score" || key === "agreedSalary") && draft.score !== "" && draft.score != null && Boolean(salaryReady);
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, conducted }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (key === "contractNumber") {
        draft.contractNumber = previousContractNumber;
        if (input) input.value = previousContractNumber;
      }
      alert(data.error || "Saqlanmadi");
      return;
    }
    const data = await res.json();
    const index = allItems.findIndex((entry) => entry._id === id);
    if (index >= 0) allItems[index] = { ...allItems[index], ...data.item };
    card.querySelector(".edit-view").textContent = viewText(key);
    if (key === "hiredAt" || key === "contractTerm") paintContractEnd(true);
    if (key === "interviewStatus") paintInterview(card);
    const who = detailBody.querySelector("#who-ran");
    if (who) who.textContent = `Suhbat o‘tkazuvchi: ${staffMark(data.item.interviewerName) || "hali belgilanmagan"}`;
    const caller = detailBody.querySelector("#who-called");
    if (caller) caller.textContent = `Suhbatga chaqirgan: ${staffMark(data.item.callerName) || "hali belgilanmagan"}`;
    render();
  }

  function paintContractEnd(store = false) {
    const hiredRaw = detailBody.querySelector('[data-edit="hiredAt"] input')?.value;
    const hired = parseUzContractDate(hiredRaw) || draft.hiredAt;
    const term = detailBody.querySelector('[data-edit="contractTerm"] input')?.value ?? draft.contractTerm;
    const end = addContractTerm(hired, term);
    if (store) draft.contractEnd = end;
    const endView = detailBody.querySelector("#contract-end-view");
    if (endView) endView.textContent = uzContractDate(end) || "—";
  }

  ["hiredAt", "contractTerm"].forEach((key) => {
    detailBody.querySelector(`[data-edit="${key}"] input`)?.addEventListener("input", () => paintContractEnd(false));
  });
  const hireCal = detailBody.querySelector(".hire-cal");
  const hireText = detailBody.querySelector('[data-edit="hiredAt"] input[name="hiredAt"]');
  hireText?.addEventListener("input", () => {
    const iso = parseUzContractDate(hireText.value);
    if (iso && hireCal) hireCal.value = iso;
  });
  hireCal?.addEventListener("change", () => {
    if (hireText) hireText.value = uzContractDate(hireCal.value);
    paintContractEnd(false);
  });

  detailBody.querySelectorAll(".edit-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest(".edit-box")) return;
      if (card.classList.contains("editing")) return;
      detailBody.querySelectorAll(".edit-card.editing").forEach((other) => other.classList.remove("editing"));
      card.classList.add("editing");
      if (card.dataset.edit === "interviewStatus") {
        card.dataset.pending = draft.interviewStatus;
        card.querySelectorAll("[data-call]").forEach((button) => {
          button.classList.toggle("active", button.dataset.call === draft.interviewStatus);
        });
      }
      card.querySelector("input, textarea")?.focus();
      if (card.dataset.edit === "hiredAt") {
        const cal = card.querySelector(".hire-cal");
        const text = card.querySelector('input[name="hiredAt"]');
        if (cal && text) cal.value = parseUzContractDate(text.value) || draft.hiredAt || cal.value;
        try { cal?.showPicker?.(); } catch { /* kalendar brauzer ruxsat bermasa tugma orqali ochiladi */ }
      }
    });
    const saveButton = card.querySelector(".card-save");
    if (saveButton) {
      saveButton.addEventListener("click", async (event) => {
        event.stopPropagation();
        await commit(card);
        card.classList.remove("editing");
      });
    } else {
      card.querySelector("input, textarea")?.addEventListener("change", async () => {
        await commit(card);
        card.classList.remove("editing");
      });
    }
  });

  detailBody.querySelectorAll("[data-call]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const card = button.closest(".edit-card");
      card.dataset.pending = button.dataset.call;
      card.querySelectorAll("[data-call]").forEach((item) => item.classList.toggle("active", item === button));
      if (!card.querySelector(".card-save")) {
        await commit(card);
        card.classList.remove("editing");
      }
    });
  });

  detailBody.querySelectorAll(".doc-slot").forEach((slot) => {
    const kind = slot.dataset.doc;
    slot.querySelector("input")?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      const maxSize = kind === "signedContract" ? 15 * 1024 * 1024 : 6 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(kind === "signedContract" ? "PDF 15 MB dan katta bo‘lmasin" : "Fayl 6 MB dan katta bo‘lmasin");
        return;
      }
      const res = await fetch(`/api/applications/${id}/docs/${kind}`, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name || ""),
        },
        body: file,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Hujjat saqlanmadi");
        return;
      }
      await openDetail(id, true);
    });
    slot.querySelector(".doc-clear")?.addEventListener("click", async () => {
      if (!confirm("Aniq shu rasmni o‘chirayveraymi?")) return;
      const res = await fetch(`/api/applications/${id}/docs/${kind}`, { method: "DELETE" });
      if (!res.ok) return;
      await openDetail(id, true);
    });
  });
  detailBody.querySelectorAll(".doc-open").forEach((button) => {
    button.addEventListener("click", () => {
      const img = detailBody.querySelector("#doc-lightbox-img");
      const frame = detailBody.querySelector("#doc-lightbox-frame");
      const pdf = button.dataset.pdf === "1";
      img.classList.toggle("hidden", pdf);
      frame.classList.toggle("hidden", !pdf);
      if (pdf) {
        img.removeAttribute("src");
        frame.src = button.dataset.src;
      } else {
        frame.removeAttribute("src");
        img.src = button.dataset.src;
      }
      const box = detailBody.querySelector("#doc-lightbox");
      const slot = button.closest(".doc-slot");
      box.dataset.slot = slot?.dataset.doc || "";
      const fileInput = box.querySelector("#doc-lightbox-file");
      if (fileInput) fileInput.accept = slot?.querySelector("input[type=file]")?.accept || "";
      const download = box.querySelector("#doc-lightbox-download");
      if (download) download.href = `${button.dataset.src}?download=1`;
      box.classList.remove("hidden");
    });
  });
  detailBody.querySelector("#close-doc")?.addEventListener("click", () => {
    const frame = detailBody.querySelector("#doc-lightbox-frame");
    if (frame) frame.removeAttribute("src");
    detailBody.querySelector("#doc-lightbox")?.classList.add("hidden");
  });
  detailBody.querySelector("#doc-lightbox-file")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    const kind = detailBody.querySelector("#doc-lightbox")?.dataset.slot;
    if (!file || !kind) return;
    const maxSize = kind === "signedContract" ? 15 * 1024 * 1024 : 6 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(kind === "signedContract" ? "PDF 15 MB dan katta bo‘lmasin" : "Fayl 6 MB dan katta bo‘lmasin");
      return;
    }
    const res = await fetch(`/api/applications/${id}/docs/${kind}`, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name || ""),
      },
      body: file,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Hujjat saqlanmadi");
      return;
    }
    await openDetail(id, true);
  });
  detailBody.querySelector("#doc-lightbox-clear")?.addEventListener("click", async () => {
    const kind = detailBody.querySelector("#doc-lightbox")?.dataset.slot;
    if (!kind) return;
    if (!confirm("Aniq shu rasmni o‘chirayveraymi?")) return;
    const res = await fetch(`/api/applications/${id}/docs/${kind}`, { method: "DELETE" });
    if (!res.ok) return;
    await openDetail(id, true);
  });

  detailBody.querySelector("#open-contract")?.addEventListener("click", () => {
    detailBody.querySelector("#pass-card")?.classList.add("hidden");
    detailBody.querySelector("#contract-page")?.classList.remove("hidden");
  });
  detailBody.querySelector("#close-contract")?.addEventListener("click", () => {
    detailBody.querySelector("#contract-page")?.classList.add("hidden");
    detailBody.querySelector("#pass-card")?.classList.remove("hidden");
  });
  const kindToggle = detailBody.querySelector("#contract-kind-toggle");
  const kindMenu = detailBody.querySelector("#contract-kind-menu");
  kindToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    kindMenu?.classList.toggle("hidden");
  });
  kindMenu?.querySelectorAll("[data-kind]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      draft.contractKind = button.dataset.kind === "admin" ? "admin" : "teacher";
      if (kindToggle) kindToggle.textContent = button.textContent;
      kindMenu.classList.add("hidden");
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Saqlanmadi");
      }
    });
  });
  detailBody.querySelector("#make-contract")?.addEventListener("click", async () => {
    const editing = detailBody.querySelector("#contract-page .edit-card.editing");
    if (editing) {
      await commit(editing);
      editing.classList.remove("editing");
    }
    downloadContractDoc(draft);
  });

  detailBody.querySelector("#open-photo")?.addEventListener("click", () => {
    detailBody.querySelector("#photo-lightbox")?.classList.remove("hidden");
  });
  detailBody.querySelector("#close-photo")?.addEventListener("click", () => {
    detailBody.querySelector("#photo-lightbox")?.classList.add("hidden");
  });
  document.querySelector("#header-delete")?.remove();
  document.querySelector("#header-restore")?.remove();
  if (currentUser?.role !== "admin") return;
  if (item.archived) {
    const restoreButton = document.createElement("button");
    restoreButton.id = "header-restore";
    restoreButton.type = "button";
    restoreButton.className = "ghost";
    restoreButton.textContent = "Qaytarish";
    document.querySelector("#close-detail").before(restoreButton);
    restoreButton.addEventListener("click", async () => {
      if (!confirm("Bu ariza arxivdan qaytarilsinmi?")) return;
      const res = await fetch(`/api/applications/${id}/restore`, { method: "POST" });
      if (!res.ok) return;
      allItems = allItems.filter((entry) => entry._id !== id);
      detail.close();
      render();
    });
    return;
  }
  const deleteButton = document.createElement("button");
  deleteButton.id = "header-delete";
  deleteButton.type = "button";
  deleteButton.className = "icon-btn danger";
  deleteButton.setAttribute("aria-label", "Arxivga o‘tkazish");
  deleteButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg>`;
  document.querySelector("#close-detail").before(deleteButton);
  deleteButton.addEventListener("click", async () => {
    if (!confirm("Bu ariza arxivga o‘tkazilsinmi?")) return;
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    allItems = allItems.filter((entry) => entry._id !== id);
    detail.close();
    render();
  });
}

document.querySelector("#open-archive").addEventListener("click", async () => {
  archiveMode = !archiveMode;
  document.querySelector("#page-title").textContent = archiveMode ? "Arxiv" : "Qabul qilingan arizalar";
  document.querySelector("#open-archive").classList.toggle("on", archiveMode);
  document.querySelector("#open-archive").setAttribute("aria-pressed", archiveMode ? "true" : "false");
  if (detail.open) detail.close();
  await loadApplications();
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  const body = Object.fromEntries(new FormData(loginForm));
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    loginError.textContent = data.error || "Kirib bo‘lmadi";
    return;
  }
  currentUser = data.user;
  showApp();
  await loadApplications();
});

document.querySelector("#whoami").addEventListener("click", () => {
  const account = document.querySelector(".account");
  const open = account.classList.toggle("open");
  document.querySelector("#whoami").setAttribute("aria-expanded", open ? "true" : "false");
  document.querySelector(".more").classList.remove("open");
});
document.querySelector("#more-actions").addEventListener("click", () => {
  document.querySelector(".more").classList.toggle("open");
  document.querySelector(".account").classList.remove("open");
  document.querySelector("#whoami").setAttribute("aria-expanded", "false");
});
document.addEventListener("click", (event) => {
  const account = document.querySelector(".account");
  const more = document.querySelector(".more");
  if (!account.contains(event.target)) account.classList.remove("open");
  if (!more.contains(event.target)) more.classList.remove("open");
});
document.querySelector("#export-applications").addEventListener("click", () => {
  document.querySelector(".more").classList.remove("open");
  const columns = [
    ["fullName", "I.F.Sh"],
    ["position", "Yo‘nalish"],
    ["birthday", "Tug‘ilgan sana"],
    ["phone", "Telefon"],
    ["parentPhone", "Qo'shimcha yoki ota-ona telefoni"],
    ["address", "Manzil"],
    ["nation", "Millati"],
    ["education", "Ma’lumot"],
    ["institution", "O‘quv muassasasi"],
    ["graduationYear", "Tugatish yili"],
    ["languageLevel", "Til darajasi"],
    ["computerSkills", "Kompyuter"],
    ["prevJob", "Oldingi ish"],
    ["lastSalary", "Oxirgi oylik"],
    ["expectedSalary", "Kutilayotgan oylik"],
    ["agreedSalary", "Kelishilgan oylik"],
    ["maritalStatus", "Oilaviy holat"],
    ["workHours", "Ish vaqti"],
    ["workDuration", "Ishlash muddati"],
    ["passportSeries", "Pasport seriyasi"],
    ["jshshir", "JSHSHIR"],
    ["foundResource", "E’lon manbasi"],
    ["interviewStatus", "Suhbat"],
    ["interviewAt", "Suhbat vaqti"],
    ["score", "Ball"],
    ["callerName", "Suhbatga chaqirgan"],
    ["interviewerName", "Suhbat o‘tkazuvchi"],
    ["note", "Izoh"],
    ["username", "Telegram"],
    ["telegramUserId", "Telegram ID"],
    ["createdAt", "Qo‘shilgan sana"],
  ];
  const cell = (value) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
  const lines = [
    columns.map(([, label]) => cell(label)).join(";"),
    ...allItems.map((item) =>
      columns
        .map(([key]) => {
          if (key === "interviewStatus") return cell(interviewLabels[interviewKey(item.interviewStatus)] || "");
          if (key === "score") return cell(item.score == null || item.score === "" ? "" : `${item.score} / 10`);
          if (key === "createdAt") return cell(formatDate(item.createdAt));
          if (key === "username") return cell(item.username ? `@${item.username}` : "");
          return cell(item[key]);
        })
        .join(";"),
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "arizalar.csv";
  link.click();
  URL.revokeObjectURL(link.href);
});

const importColumns = [
  ["fullName", "I.F.Sh"],
  ["position", "Yo‘nalish"],
  ["birthday", "Tug‘ilgan sana"],
  ["phone", "Telefon"],
  ["parentPhone", "Qo'shimcha yoki ota-ona telefoni"],
  ["address", "Manzil"],
  ["nation", "Millati"],
  ["education", "Ma’lumot"],
  ["institution", "O‘quv muassasasi"],
  ["graduationYear", "Tugatish yili"],
  ["languageLevel", "Til darajasi"],
  ["computerSkills", "Kompyuter"],
  ["prevJob", "Oldingi ish"],
  ["lastSalary", "Oxirgi oylik"],
  ["expectedSalary", "Kutilayotgan oylik"],
  ["agreedSalary", "Kelishilgan oylik"],
  ["maritalStatus", "Oilaviy holat"],
  ["workHours", "Ish vaqti"],
  ["workDuration", "Ishlash muddati"],
  ["passportSeries", "Pasport seriyasi"],
  ["jshshir", "JSHSHIR"],
  ["foundResource", "E’lon manbasi"],
  ["interviewStatus", "Suhbat"],
  ["interviewAt", "Suhbat vaqti"],
  ["score", "Ball"],
  ["callerName", "Suhbatga chaqirgan"],
  ["interviewerName", "Suhbat o‘tkazuvchi"],
  ["note", "Izoh"],
  ["username", "Telegram"],
  ["telegramUserId", "Telegram ID"],
];

function parseCsv(text) {
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === "\"" && src[i + 1] === "\"") {
        cell += "\"";
        i += 1;
      } else if (ch === "\"") quoted = false;
      else cell += ch;
    } else if (ch === "\"") quoted = true;
    else if (ch === ";") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((line) => line.some((value) => String(value).trim()));
}

document.querySelector("#import-applications").addEventListener("click", () => {
  document.querySelector(".more").classList.remove("open");
  document.querySelector("#import-file").click();
});
document.querySelector("#import-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  const table = parseCsv(await file.text());
  const header = table[0] || [];
  const index = new Map(header.map((label, i) => [String(label).trim(), i]));
  if (!index.has("I.F.Sh") && !index.has("Telefon")) {
    alert("Bu eksport fayli emas. Avval Eksport qilingan .csv ni tanlang.");
    return;
  }
  const rows = table.slice(1).map((line) => {
    const item = {};
    for (const [key, label] of importColumns) {
      const at = index.get(label);
      item[key] = at == null ? "" : line[at] || "";
    }
    item.username = String(item.username || "").replace(/^@/, "");
    const score = String(item.score || "").match(/\d+/);
    item.score = score ? score[0] : "";
    return item;
  });
  const res = await fetch("/api/applications/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(data.error || "Import bo‘lmadi");
    return;
  }
  alert(`${data.added} ta qo‘shildi. ${data.skipped} ta allaqachon borligi uchun o‘tkazib yuborildi.`);
  await loadApplications();
});
document.querySelector("#logout").addEventListener("click", async () => {
  document.querySelector(".account").classList.remove("open");
  await fetch("/api/logout", { method: "POST" });
  showLogin();
});

document.querySelector("#back-detail").addEventListener("click", () => detail.close());
document.querySelector("#close-detail").addEventListener("click", () => detail.close());
let timer;
searchEl.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(render, 200);
});
sortEl.addEventListener("change", () => {
  activeSort = sortEl.value;
  if (activeSort === "all") {
    activePosition = "";
    activeStatus = "";
    dateFromEl.value = "";
    dateToEl.value = "";
    syncDateField(dateFromEl);
    syncDateField(dateToEl);
  }
  render();
});
function syncDateField(input) {
  input.classList.toggle("has-value", Boolean(input.value));
}
dateFromEl.addEventListener("change", () => {
  syncDateField(dateFromEl);
  render();
});
dateToEl.addEventListener("change", () => {
  syncDateField(dateToEl);
  render();
});
positionEl.addEventListener("change", () => {
  activePosition = positionEl.value;
  render();
});
statusEl.addEventListener("change", () => {
  activeStatus = statusEl.value;
  render();
});
listEl.addEventListener("click", (event) => {
  const archiveBtn = event.target.closest("[data-archive]");
  if (archiveBtn) {
    event.preventDefault();
    event.stopPropagation();
    moveToArchive(archiveBtn.dataset.archive);
    return;
  }
  const restoreBtn = event.target.closest("[data-restore]");
  if (restoreBtn) {
    event.preventDefault();
    event.stopPropagation();
    takeFromArchive(restoreBtn.dataset.restore);
    return;
  }
  const fav = event.target.closest("[data-fav]");
  if (fav) {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(fav.dataset.fav);
    return;
  }
  const card = event.target.closest("[data-id]");
  if (card) openDetail(card.dataset.id);
});

function closeDetailIf(id) {
  if (!detail.open) return;
  if (document.querySelector("#detail-fav")?.dataset.fav === id) detail.close();
}

async function moveToArchive(id) {
  if (!confirm("Bu ariza arxivga o‘tkazilsinmi?")) return;
  const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
  if (!res.ok) return;
  allItems = allItems.filter((entry) => entry._id !== id);
  closeDetailIf(id);
  render();
}

async function takeFromArchive(id) {
  if (!confirm("Bu ariza arxivdan chiqarilsinmi?")) return;
  const res = await fetch(`/api/applications/${id}/restore`, { method: "POST" });
  if (!res.ok) return;
  allItems = allItems.filter((entry) => entry._id !== id);
  closeDetailIf(id);
  render();
}

async function toggleFavorite(id) {
  const item = allItems.find((entry) => entry._id === id);
  if (!item) return;
  const res = await fetch(`/api/applications/${id}/favorite`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ favorite: !item.favorite }),
  });
  if (!res.ok) return;
  const data = await res.json();
  item.favorite = Boolean(data.item.favorite);
  render();
  const detailFav = document.querySelector("#detail-fav");
  if (detailFav?.dataset.fav === id) detailFav.classList.toggle("on", item.favorite);
}

document.querySelector("#detail-fav").addEventListener("click", () => {
  const id = document.querySelector("#detail-fav").dataset.fav;
  if (id) toggleFavorite(id);
});

const staffDialog = document.querySelector("#staff-dialog");
const staffForm = document.querySelector("#staff-form");
const staffList = document.querySelector("#staff-list");
const staffError = document.querySelector("#staff-error");

async function loadStaff() {
  const res = await fetch("/api/staff");
  if (!res.ok) return;
  const data = await res.json();
  staffList.innerHTML = data.items
    .map(
      (person) => `
      <div class="staff-row">
        <div>
          <p><strong>${esc(person.surname)} ${esc(person.name)}</strong></p>
          <p class="muted">${esc(person.username)} · ${person.role === "admin" ? "Admin" : "Hodim"}</p>
        </div>
        <div class="staff-actions">
          <button type="button" class="ghost" data-edit-staff="${esc(person.id)}" data-surname="${esc(person.surname)}" data-name="${esc(person.name)}" data-username="${esc(person.username)}">Tahrirlash</button>
          ${person.role === "admin" ? "" : `<button type="button" class="danger" data-delete-staff="${esc(person.id)}">O‘chirish</button>`}
        </div>
      </div>`,
    )
    .join("");
}

document.querySelector("#open-staff").addEventListener("click", async () => {
  document.querySelector(".account").classList.remove("open");
  staffError.textContent = "";
  staffForm.reset();
  await loadStaff();
  staffDialog.showModal();
});
document.querySelector("#close-staff").addEventListener("click", () => staffDialog.close());

const historyDialog = document.querySelector("#history-dialog");
const historyList = document.querySelector("#history-list");

async function loadHistory() {
  const res = await fetch("/api/activity");
  if (!res.ok) return;
  const data = await res.json();
  const items = data.items || [];
  historyList.innerHTML = items.length
    ? items
        .map(
          (item) => `
        <article class="history-row">
          <div class="history-top">
            <strong>${esc(item.actorName || "Noma’lum")}</strong>
            <time>${esc(formatDate(item.at) || "—")}</time>
          </div>
          <p>${esc(item.action)}</p>
          ${item.detail ? `<p class="muted">${esc(item.detail)}</p>` : ""}
        </article>`,
        )
        .join("")
    : `<p class="empty">Hozircha harakat yo‘q.</p>`;
}

document.querySelector("#open-history").addEventListener("click", async () => {
  document.querySelector(".account").classList.remove("open");
  historyList.innerHTML = `<p class="muted">Yuklanmoqda...</p>`;
  historyDialog.showModal();
  await loadHistory();
});
document.querySelector("#close-history").addEventListener("click", () => historyDialog.close());

staffForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  staffError.textContent = "";
  const body = Object.fromEntries(new FormData(staffForm));
  const id = body.id;
  delete body.id;
  if (!body.password) delete body.password;
  const res = await fetch(id ? `/api/staff/${id}` : "/api/staff", {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    staffError.textContent = data.error || "Saqlanmadi";
    return;
  }
  if (currentUser?.id === data.item?.id) {
    currentUser = data.item;
    showApp();
  }
  staffForm.reset();
  await loadStaff();
});

staffList.addEventListener("click", async (event) => {
  const edit = event.target.closest("[data-edit-staff]");
  if (edit) {
    staffForm.elements.id.value = edit.dataset.editStaff;
    staffForm.elements.surname.value = edit.dataset.surname;
    staffForm.elements.name.value = edit.dataset.name;
    staffForm.elements.username.value = edit.dataset.username;
    staffForm.elements.password.value = "";
    return;
  }
  const remove = event.target.closest("[data-delete-staff]");
  if (!remove) return;
  if (!confirm("Bu hodim o‘chirilsinmi?")) return;
  const res = await fetch(`/api/staff/${remove.dataset.deleteStaff}`, { method: "DELETE" });
  if (!res.ok) return;
  await loadStaff();
});

const me = await fetch("/api/me");
const session = await me.json();
if (session.ok) {
  currentUser = session.user;
  showApp();
  await loadApplications();
} else {
  showLogin();
}
