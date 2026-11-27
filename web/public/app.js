import {
  ASSESSMENT_QUESTIONS,
  ASSESSMENT_SETS,
  assessmentKindFor,
  ASSESSMENT_VERSION,
  MAX_SCORE,
  RATING_SCALE,
  assessmentGrade,
} from "./assessment.js?v=14";
import {
  buildStudentContractHtml,
  courseToCyr,
  latinToCyrillic,
  COURSES_CYR,
  numberToUzWords,
  formatPrice,
} from "./student-contract.js?v=36";

const loginView = document.querySelector("#login-view");
const appView = document.querySelector("#app-view");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const listEl = document.querySelector("#list");
const searchEl = document.querySelector("#search");
const chipsEl = document.querySelector("#position-chips");
const latestNoteEl = document.querySelector("#latest-note");
const statusEl = document.querySelector("#status-filter");
const sortEl = document.querySelector("#sort-filter");
const dateFromEl = document.querySelector("#date-from");
const dateToEl = document.querySelector("#date-to");
const shiftEl = document.querySelector("#shift-filter");
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
let activeSort = "newest";
let archiveMode = false;

// Ro'yxat bo'lib-bo'lib chiziladi: 1000+ kartochkani bir yo'la chizish sahifani qotirardi
const RENDER_STEP = 60;
let renderLimit = RENDER_STEP;
let moreObserver = null;

function resetPaging() {
  renderLimit = RENDER_STEP;
}

function moreHtml(total) {
  if (total <= renderLimit) return "";
  const left = total - renderLimit;
  return `
    <div class="load-more" id="load-more">
      <button type="button" id="load-more-btn">
        Yana ko‘rsatish <b>${Math.min(RENDER_STEP, left)}</b>
        <small>qolgan ${left} ta</small>
      </button>
    </div>`;
}

function showMore() {
  renderLimit += RENDER_STEP;
  render();
}

// Pastga yaqinlashganda keyingi kartochkalar o'zi qo'shiladi
function watchLoadMore() {
  moreObserver?.disconnect();
  const box = document.querySelector("#load-more");
  if (!box) return;
  box.querySelector("#load-more-btn")?.addEventListener("click", showMore);
  if (!("IntersectionObserver" in window)) return;
  moreObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      moreObserver.disconnect();
      showMore();
    }
  }, { rootMargin: "800px 0px" });
  moreObserver.observe(box);
}

// Zaxira: IntersectionObserver ishlamasa ham, pastga yaqinlashganda yuklanadi
let moreScrollTick = false;
window.addEventListener("scroll", () => {
  if (moreScrollTick) return;
  moreScrollTick = true;
  setTimeout(() => {
    moreScrollTick = false;
    const box = document.querySelector("#load-more");
    if (box && box.getBoundingClientRect().top < window.innerHeight + 800) showMore();
  }, 150);
}, { passive: true });

function canChange() {
  return currentUser?.role === "admin" || Boolean(currentUser?.canEdit);
}

function canRemove() {
  return currentUser?.role === "admin" || Boolean(currentUser?.canDelete);
}

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

// Sana + vaqt tanlash oynasi (brauzerning standart kalendari o‘rniga)
let activeDtp = null;
function closeDateTimePicker(cancelled = true) {
  if (!activeDtp) return;
  const { pop, cleanup, onClose } = activeDtp;
  activeDtp = null;
  cleanup();
  pop.remove();
  if (cancelled) onClose?.();
}

function openDateTimePicker(anchor, value, { onPick, onClose, withTime = true } = {}) {
  closeDateTimePicker(false);
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
  const week = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  const today = ymd(new Date());
  let selDate = match ? `${match[1]}-${match[2]}-${match[3]}` : "";
  let selTime = match && match[4] ? `${match[4]}:${match[5]}` : "";
  let viewY = match ? Number(match[1]) : new Date().getFullYear();
  let viewM = match ? Number(match[2]) - 1 : new Date().getMonth();
  const slots = [];
  for (let m = 8 * 60; m <= 20 * 60; m += 30) slots.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);

  const pop = document.createElement("div");
  pop.className = withTime ? "dtp" : "dtp dtp-dateonly";
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-label", "Sana va vaqtni tanlang");
  // Modal <dialog> ichida bo‘lsa, oynani o‘sha dialogga qo‘shamiz — aks holda dialog orqasida qolib ko‘rinmaydi
  const host = anchor.closest("dialog[open]") || document.body;
  host.appendChild(pop);

  function summary() {
    if (!selDate) return "Sana tanlanmagan";
    const [y, mo, d] = selDate.split("-").map(Number);
    return `${d}-${months[mo - 1].toLowerCase()} ${y}${selTime ? `, ${selTime}` : ""}`;
  }

  function paint() {
    const first = new Date(viewY, viewM, 1);
    const lead = (first.getDay() + 6) % 7;
    const start = new Date(viewY, viewM, 1 - lead);
    let cells = "";
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = ymd(d);
      const cls = [
        "dtp-day",
        d.getMonth() !== viewM ? "out" : "",
        key < today ? "past" : "",
        key === today ? "today" : "",
        key === selDate ? "sel" : "",
        d.getDay() === 0 ? "sun" : "",
      ].filter(Boolean).join(" ");
      cells += `<button type="button" class="${cls}" data-day="${key}">${d.getDate()}</button>`;
    }
    const timeBtns = slots
      .map((t) => `<button type="button" class="dtp-slot${t === selTime ? " sel" : ""}" data-time="${t}">${t}</button>`)
      .join("");
    pop.innerHTML = `
      <div class="dtp-cal">
        <div class="dtp-head">
          <button type="button" class="dtp-nav" data-nav="-1" aria-label="Oldingi oy"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>
          <strong>${months[viewM]} ${viewY}</strong>
          <button type="button" class="dtp-nav" data-nav="1" aria-label="Keyingi oy"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>
        </div>
        <div class="dtp-week">${week.map((w) => `<span>${w}</span>`).join("")}</div>
        <div class="dtp-grid">${cells}</div>
        <div class="dtp-quick">
          <button type="button" data-quick="0">Bugun</button>
          <button type="button" data-quick="1">Ertaga</button>
        </div>
      </div>
      ${withTime ? `<div class="dtp-time">
        <div class="dtp-time-head">Vaqt</div>
        <div class="dtp-slots">${timeBtns}</div>
        <label class="dtp-exact">Aniq vaqt <input type="time" step="300" value="${selTime}" /></label>
      </div>` : ""}
      <div class="dtp-foot">
        <span class="dtp-sum">${summary()}</span>
        <button type="button" class="dtp-clear">Tozalash</button>
        <button type="button" class="dtp-cancel">Bekor</button>
        <button type="button" class="dtp-ok"${selDate ? "" : " disabled"}>Saqlash</button>
      </div>`;
  }

  function place() {
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    let top = r.bottom + 8;
    if (top + h > vh - 12 && r.top - h - 8 > 12) top = r.top - h - 8;
    top = Math.max(12, Math.min(top, vh - h - 12));
    const left = Math.max(16, Math.min(r.left, vw - w - 16));
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
  }

  pop.addEventListener("click", (event) => {
    const t = event.target.closest("button");
    if (!t) return;
    if (t.dataset.nav) {
      viewM += Number(t.dataset.nav);
      if (viewM < 0) { viewM = 11; viewY -= 1; }
      if (viewM > 11) { viewM = 0; viewY += 1; }
    } else if (t.dataset.day) {
      selDate = t.dataset.day;
      const [y, mo] = selDate.split("-").map(Number);
      viewY = y;
      viewM = mo - 1;
    } else if (t.dataset.quick) {
      const d = new Date();
      d.setDate(d.getDate() + Number(t.dataset.quick));
      selDate = ymd(d);
      viewY = d.getFullYear();
      viewM = d.getMonth();
    } else if (t.dataset.time) {
      selTime = t.dataset.time;
    } else if (t.classList.contains("dtp-clear")) {
      closeDateTimePicker(false);
      onPick?.("");
      return;
    } else if (t.classList.contains("dtp-cancel")) {
      closeDateTimePicker(true);
      return;
    } else if (t.classList.contains("dtp-ok")) {
      if (!selDate) return;
      closeDateTimePicker(false);
      onPick?.(withTime ? `${selDate}T${selTime || "10:00"}` : selDate);
      return;
    }
    const keep = pop.querySelector(".dtp-slots")?.scrollTop;
    paint();
    if (keep != null) pop.querySelector(".dtp-slots").scrollTop = keep;
    place();
  });
  pop.addEventListener("change", (event) => {
    if (!event.target.matches('.dtp-exact input')) return;
    selTime = event.target.value || "";
    const keep = pop.querySelector(".dtp-slots")?.scrollTop;
    paint();
    if (keep != null) pop.querySelector(".dtp-slots").scrollTop = keep;
  });

  const outside = (event) => {
    if (pop.contains(event.target) || anchor.contains(event.target)) return;
    closeDateTimePicker(true);
  };
  const onKey = (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    closeDateTimePicker(true);
  };
  const onHostClose = () => closeDateTimePicker(true);
  document.addEventListener("pointerdown", outside, true);
  document.addEventListener("keydown", onKey, true);
  if (host !== document.body) host.addEventListener("close", onHostClose);
  window.addEventListener("resize", place);
  window.addEventListener("scroll", place, true);
  activeDtp = {
    pop,
    onClose,
    cleanup() {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", onKey, true);
      host.removeEventListener("close", onHostClose);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    },
  };
  paint();
  const list = pop.querySelector(".dtp-slots");
  const picked = list?.querySelector(".dtp-slot.sel") || list?.querySelector('[data-time="10:00"]');
  if (list && picked) list.scrollTop = picked.offsetTop - list.clientHeight / 2 + picked.offsetHeight / 2;
  place();
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const initials = [currentUser?.surname, currentUser?.name]
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  document.querySelector("#whoami-initials").textContent = initials || "?";
  document.querySelector("#open-staff").classList.toggle("hidden", currentUser?.role !== "admin");
  document.querySelector("#open-branding").classList.toggle("hidden", currentUser?.role !== "admin");
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

// Qidiruv: ism, username, yo'nalish bo'yicha; telefon raqam bo'shliq va chiziqchasiz ham topiladi
function matchesQuery(item, query) {
  const text = query.toLowerCase();
  if ([item.fullName, item.username, item.position, item.phone, item.parentPhone]
    .some((value) => String(value || "").toLowerCase().includes(text))) return true;
  const digits = query.replace(/\D/g, "");
  if (digits.length < 3) return false;
  return [item.phone, item.parentPhone].some((value) => String(value || "").replace(/\D/g, "").includes(digits));
}

function searchedItems() {
  const query = searchEl.value.trim();
  if (!query) return allItems;
  return allItems.filter((item) => matchesQuery(item, query));
}

function interviewKey(status) {
  if (status === "arrived") return "arrived";
  if (status === "hired") return "hired";
  if (status === "started") return "started";
  if (status === "left") return "left";
  if (status === "declined") return "declined";
  if (status === "missed") return "missed";
  if (status === "expected" || status === "called") return "expected";
  return "none";
}

// "Chaqirildi" bo‘lib, belgilangan suhbat vaqti o‘tib ketgan bo‘lsa — "Kelmadi" deb ko‘rsatamiz (bazada holat o‘zgarmaydi)
function interviewOverdue(item) {
  if (interviewKey(item?.interviewStatus) !== "expected") return false;
  const m = String(item?.interviewAt || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return false;
  const at = m[4]
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]))
    : new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59);
  return at.getTime() <= Date.now();
}

function interviewTone(item) {
  return interviewOverdue(item) ? "late" : interviewKey(item?.interviewStatus);
}

const interviewLabels = {
  none: "Chaqirilmagan",
  expected: "Chaqirildi",
  late: "Kelmadi",
  arrived: "Zaxirada",
  missed: "Kelmagan",
  hired: "Boshqa joyga ishga kirgan",
  started: "Ishni boshladi",
  left: "Ishdan bo‘shagan",
  declined: "Ishlamaydi ekan",
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

// Ish vaqti matnidan smenani aniqlaymiz: bot tugmalari ("1-Smena ...", "2-Smena ...", "To'liq smena ...")
// yoki qo'lda yozilgan vaqt oralig'i ("08:00-14:00")
function shiftKey(item) {
  const raw = String(item?.workHours || "").trim().toLowerCase();
  if (!raw) return "other";
  if (/^1\s*-?\s*smena/.test(raw)) return "1";
  if (/^2\s*-?\s*smena/.test(raw)) return "2";
  if (/to.?liq/.test(raw)) return "full";
  const times = [...raw.matchAll(/(\d{1,2})[:.](\d{2})/g)].map((m) => Number(m[1]) + Number(m[2]) / 60);
  if (times.length >= 2) {
    const [start, end] = times;
    if (start < 12 && end >= 18) return "full";
    if (start < 12) return "1";
    return "2";
  }
  return "other";
}

function shiftMatch(item) {
  const want = shiftEl?.value || "";
  return !want || shiftKey(item) === want;
}

function periodMatch(item) {
  return dateMatch(item) && shiftMatch(item);
}

function statusMatch(item) {
  if (activeStatus === "none" || activeStatus === "expected" || activeStatus === "arrived" || activeStatus === "missed" || activeStatus === "hired" || activeStatus === "started" || activeStatus === "left" || activeStatus === "declined") {
    return interviewKey(item.interviewStatus) === activeStatus;
  }
  if (activeStatus === "scored") return hasScore(item);
  if (activeStatus === "new") return isFresh(item);
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

// Kelishilgan oylik: fiks summa, foiz yoki ikkalasi — "3 000 000 so'm + 30%" ko‘rinishida saqlanadi
function parseAgreedSalary(value) {
  const raw = String(value || "");
  const pm = raw.match(/(\d+(?:[.,]\d+)?)\s*%/);
  const pct = pm ? pm[1].replace(",", ".") : "";
  const fix = (pm ? raw.replace(pm[0], "") : raw).replace(/\D/g, "");
  return { fix, pct };
}

function formatAgreedSalary(value) {
  const { fix, pct } = parseAgreedSalary(value);
  return [fix ? formatSum(fix) : "", pct ? `${pct}%` : ""].filter(Boolean).join(" + ");
}

function salaryEditorHtml(value) {
  return `
    <input name="agreedSalary" type="hidden" value="${esc(formatAgreedSalary(value))}" />
    <div class="sal-edit">
      <div class="sal-mode">
        <button type="button" data-sal-mode="fix">Fiks</button>
        <button type="button" data-sal-mode="pct">Foiz</button>
        <button type="button" data-sal-mode="both">Fiks + foiz</button>
      </div>
      <label class="sal-row sal-fix"><input data-sal="fix" inputmode="numeric" placeholder="5 000 000" autocomplete="off" /><em>so‘m</em></label>
      <label class="sal-row sal-pct"><input data-sal="pct" inputmode="decimal" placeholder="30" autocomplete="off" /><em>%</em></label>
    </div>`;
}

function setupSalaryEditor(card, value) {
  const hidden = card.querySelector('input[name="agreedSalary"]');
  const box = card.querySelector(".sal-edit");
  const fixInput = card.querySelector('[data-sal="fix"]');
  const pctInput = card.querySelector('[data-sal="pct"]');
  if (!hidden || !box || !fixInput || !pctInput) return;
  const sync = () => {
    const mode = box.dataset.mode;
    const fixDigits = fixInput.value.replace(/\D/g, "");
    const pctValue = Number(pctInput.value.replace(",", ".").replace(/[^\d.]/g, ""));
    const parts = [];
    if (mode !== "pct" && fixDigits) parts.push(fixDigits);
    if (mode !== "fix" && pctValue > 0) parts.push(`${Math.min(pctValue, 100)}%`);
    hidden.value = formatAgreedSalary(parts.join(" "));
  };
  const setMode = (mode) => {
    box.dataset.mode = mode;
    box.querySelectorAll("[data-sal-mode]").forEach((b) => b.classList.toggle("active", b.dataset.salMode === mode));
    sync();
  };
  const focusFirst = () => (box.dataset.mode === "pct" ? pctInput : fixInput).focus();
  if (!box.dataset.ready) {
    box.dataset.ready = "1";
    box.querySelectorAll("[data-sal-mode]").forEach((b) => b.addEventListener("click", () => {
      setMode(b.dataset.salMode);
      focusFirst();
    }));
    fixInput.addEventListener("input", () => {
      const digits = fixInput.value.replace(/\D/g, "").slice(0, 12);
      fixInput.value = digits ? Number(digits).toLocaleString("ru-RU") : "";
      sync();
    });
    pctInput.addEventListener("input", () => {
      pctInput.value = pctInput.value.replace(/[^\d.,]/g, "").slice(0, 5);
      sync();
    });
    [fixInput, pctInput].forEach((input) => input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") card.querySelector(".card-save")?.click();
    }));
  }
  const { fix, pct } = parseAgreedSalary(value);
  fixInput.value = fix ? Number(fix).toLocaleString("ru-RU") : "";
  pctInput.value = pct;
  setMode(fix && pct ? "both" : pct ? "pct" : "fix");
  focusFirst();
}

// ============ metafor’ga o‘tkazish (ishga olinganda) ============
const CRM_WEB = "https://metafor.uz";
const crmArrow = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

function crmButtonHtml(item) {
  if (item.crmTransfer?.id) {
    const kind = item.crmTransfer.kind === "teacher" ? "o‘qituvchi" : "xodim";
    return `<a class="crm-launch done" href="${CRM_WEB}${esc(item.crmTransfer.path || "")}" target="_blank" rel="noopener" title="metafor’da ${kind} sifatida bor — ochish"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg>metafor’da</a>`;
  }
  if (currentUser?.role !== "admin") return "";
  return `<button type="button" class="crm-launch" id="open-crm" title="Ishga olingan xodimni metafor’ga o‘tkazish">metafor’ga ${crmArrow}</button>`;
}

function guessTeacher(item) {
  return /o[‘'’ʻ`]?qituvchi/i.test(item.position || "") || !/admin|manager|menejer|smm|buxgalter/i.test(item.position || "");
}

function crmModalHtml(item, options) {
  const teacher = guessTeacher(item);
  const salary = parseAgreedSalary(item.agreedSalary);
  const salaryMode = !salary.fix && salary.pct ? "percent" : "fixed";
  const salaryValue = salaryMode === "percent" ? salary.pct : salary.fix ? Number(salary.fix).toLocaleString("ru-RU") : "";
  const subject = String(item.position || "").replace(/\s*o[‘'’ʻ`]?qituvchisi\s*$/i, "").trim();
  const position = String(item.position || "").toLowerCase();
  const role = options.roles.find((r) => position && (r.name.toLowerCase().includes(position) || position.includes(r.name.toLowerCase())));
  const person = splitName(item.fullName);
  const sends = [
    ["Familiya, ism", `${person.surname} ${person.name}`],
    ["Telefon", formatPhone(item.phone)],
    ["Qo‘shimcha telefon", formatPhone(item.parentPhone)],
    ["Tug‘ilgan sana", item.birthday],
    ["Manzil", item.address],
    ["O‘qigan joyi", [item.institution, item.graduationYear].filter(Boolean).join(", ")],
    ["Rasm", item.hasPhoto ? "bor (o‘qituvchi kartasiga)" : ""],
    ["Qolganlari (izohga)", "otasining ismi, ma’lumot, til, oylik, ish vaqti, oldingi ish, pasport, ball, izohlar"],
  ].filter(([, value]) => value && String(value).trim() && String(value).trim() !== "—");
  return `
    <div class="crm-modal" id="crm-modal" role="dialog" aria-label="metafor’ga o‘tkazish">
      <form class="crm-box" id="crm-form">
        <div class="crm-head">
          <span class="crm-ico">${crmArrow}</span>
          <div>
            <h3>metafor’ga o‘tkazish</h3>
            <p class="muted">${esc(item.fullName || "")} — ishga olingan xodim sifatida metafor’ga qo‘shiladi</p>
          </div>
        </div>
        <div class="crm-seg" role="radiogroup">
          <label><input type="radio" name="kind" value="teacher" ${teacher ? "checked" : ""} /><span>O‘qituvchilar bo‘limiga</span></label>
          <label><input type="radio" name="kind" value="employee" ${teacher ? "" : "checked"} /><span>Xodimlar bo‘limiga</span></label>
        </div>
        <div class="crm-grid">
          <label class="stu-field">
            <span>Filial</span>
            <select name="branchId">${options.branches.map((b) => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join("")}</select>
          </label>
          <label class="stu-field crm-only-teacher">
            <span>Fan / mutaxassislik</span>
            <input name="specialization" value="${esc(subject)}" placeholder="Ingliz tili" maxlength="80" />
          </label>
          <label class="stu-field crm-only-employee">
            <span>Lavozim</span>
            <select name="roleId">
              <option value="">— tanlang —</option>
              ${options.roles.map((r) => `<option value="${esc(r.id)}" ${role?.id === r.id ? "selected" : ""}>${esc(r.name)}</option>`).join("")}
            </select>
          </label>
          <label class="stu-field">
            <span>Oylik</span>
            <div class="crm-salary">
              <select name="salaryMode">
                <option value="fixed" ${salaryMode === "fixed" ? "selected" : ""}>Fiks, so‘m</option>
                <option value="percent" ${salaryMode === "percent" ? "selected" : ""}>Foiz, %</option>
              </select>
              <input name="salaryAmount" inputmode="numeric" value="${esc(salaryValue)}" placeholder="${salaryMode === "percent" ? "30" : "3 000 000"}" />
            </div>
          </label>
          <label class="stu-field">
            <span>Kirish paroli (ixtiyoriy)</span>
            <input name="password" autocomplete="new-password" minlength="4" maxlength="128" placeholder="Keyin metafor’da ham qo‘yish mumkin" />
          </label>
        </div>
        <div class="crm-sends">
          <b>Nimalar o‘tadi</b>
          <ul>${sends.map(([k, v]) => `<li><span>${esc(k)}</span><em>${esc(v)}</em></li>`).join("")}</ul>
        </div>
        <p class="crm-msg" id="crm-msg"></p>
        <div class="crm-actions">
          <button type="button" class="ghost" id="crm-cancel">Bekor</button>
          <button type="submit" class="crm-go" id="crm-go">O‘tkazish ${crmArrow}</button>
        </div>
      </form>
    </div>`;
}

function wireCrmButton(item) {
  const open = document.querySelector("#detail-crm #open-crm");
  if (!open) return;
  open.addEventListener("click", async () => {
    open.disabled = true;
    const res = await fetch("/api/crm/options");
    open.disabled = false;
    const options = await res.json().catch(() => ({}));
    if (!res.ok) return alert(options.error || "metafor bilan bog‘lanib bo‘lmadi");
    detailBody.querySelector("#crm-modal")?.remove();
    detailBody.insertAdjacentHTML("beforeend", crmModalHtml(item, { branches: options.branches || [], roles: options.roles || [] }));
    const modal = detailBody.querySelector("#crm-modal");
    const form = modal.querySelector("#crm-form");
    const msg = modal.querySelector("#crm-msg");
    const paintKind = () => {
      const teacher = form.kind.value === "teacher";
      modal.classList.toggle("is-teacher", teacher);
      modal.classList.toggle("is-employee", !teacher);
    };
    paintKind();
    form.querySelectorAll('input[name="kind"]').forEach((radio) => radio.addEventListener("change", paintKind));
    form.salaryAmount.addEventListener("input", () => {
      if (form.salaryMode.value === "percent") return;
      const digits = form.salaryAmount.value.replace(/\D/g, "").slice(0, 12);
      form.salaryAmount.value = digits ? Number(digits).toLocaleString("ru-RU") : "";
    });
    const close = () => modal.remove();
    modal.querySelector("#crm-cancel").addEventListener("click", close);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close();
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(form));
      if (body.kind === "employee" && !body.roleId) {
        msg.textContent = "Xodim uchun lavozimni tanlang";
        msg.className = "crm-msg bad";
        return;
      }
      if (body.password && body.password.length < 4) {
        msg.textContent = "Parol kamida 4 belgi bo‘lsin (yoki bo‘sh qoldiring)";
        msg.className = "crm-msg bad";
        return;
      }
      const go = form.querySelector("#crm-go");
      go.disabled = true;
      msg.textContent = "O‘tkazilmoqda...";
      msg.className = "crm-msg";
      const res = await fetch(`/api/applications/${encodeURIComponent(item._id)}/crm-transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      go.disabled = false;
      if (!res.ok) {
        msg.textContent = data.error || "O‘tkazib bo‘lmadi";
        msg.className = "crm-msg bad";
        return;
      }
      item.crmTransfer = data.transfer;
      const stored = allItems.find((entry) => entry._id === item._id);
      if (stored) stored.crmTransfer = data.transfer;
      const holder = document.querySelector("#detail-crm #open-crm");
      if (holder) holder.outerHTML = crmButtonHtml(item);
      form.innerHTML = `
        <div class="crm-done">
          <span class="crm-done-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg></span>
          <h3>metafor’ga qo‘shildi</h3>
          <p class="muted">${esc(item.fullName || "")} — ${data.transfer.kind === "teacher" ? "O‘qituvchilar" : "Xodimlar"} bo‘limida</p>
          <div class="crm-actions">
            <button type="button" class="ghost" id="crm-close">Yopish</button>
            <a class="crm-go" href="${esc(data.url)}" target="_blank" rel="noopener">metafor’da ochish ${crmArrow}</a>
          </div>
        </div>`;
      form.querySelector("#crm-close").addEventListener("click", close);
    });
  });
}

// ============ Izohlar: har biri alohida, vaqti va muallifi bilan ============
function noteEntries(item) {
  const list = (item.notes || []).map((note) => ({ ...note, legacy: false }));
  if (String(item.note || "").trim()) list.unshift({ _id: "legacy", text: item.note, legacy: true });
  return list;
}

function notesPlainText(item) {
  return noteEntries(item)
    .map((note) => (note.legacy ? note.text : `[${formatDate(note.at)} · ${note.byName || "—"}] ${note.text}`))
    .join("\n");
}

function noteInitials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

function noteHue(name) {
  let hash = 0;
  for (const ch of String(name || "")) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}

function noteListHtml(item) {
  const entries = noteEntries(item);
  if (!entries.length) return `<p class="note-empty">Hali izoh yo‘q</p>`;
  return entries
    .map((note) => {
      const mine = currentUser?.role === "admin" || (!note.legacy && note.byId === currentUser?.id);
      const who = note.legacy ? "Avvalgi izoh" : note.byName || "Noma’lum";
      return `
        <article class="note-item${note.legacy ? " legacy" : ""}">
          <span class="note-avatar" style="--nh:${note.legacy ? 220 : noteHue(note.byName)}">${note.legacy ? "✎" : esc(noteInitials(note.byName))}</span>
          <div class="note-body">
            <div class="note-meta">
              <b>${esc(who)}</b>
              ${note.legacy ? "" : `<time>${esc(formatDate(note.at) || "")}</time>`}
              ${mine && canChange() ? `<button type="button" class="note-del" data-note-del="${esc(note._id)}" title="O‘chirish" aria-label="Izohni o‘chirish"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg></button>` : ""}
            </div>
            <p>${esc(note.text)}</p>
          </div>
        </article>`;
    })
    .join("");
}

function notesCardHtml(item) {
  const count = noteEntries(item).length;
  return `
    <section class="pass-field notes-card has-ico" style="--fc:#eab308" id="notes-card">
      <i class="pf-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${svgPaths.pencil}</svg></i>
      <div class="notes-head">
        <span>Izohlar</span>
        <em class="notes-count" id="notes-count">${count ? `${count} ta` : ""}</em>
      </div>
      <div class="notes-list" id="notes-list">${noteListHtml(item)}</div>
      ${canChange() ? `
      <form class="note-form" id="note-form">
        <textarea name="text" rows="1" maxlength="2000" placeholder="Yangi izoh yozing… (Ctrl+Enter — yuborish)"></textarea>
        <button type="submit" class="note-send" title="Qo‘shish" aria-label="Izoh qo‘shish"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 14-7-5 14-2.5-5.5z"/></svg></button>
      </form>` : ""}
    </section>`;
}

function wireNotesCard(item) {
  const card = detailBody.querySelector("#notes-card");
  if (!card) return;
  const list = card.querySelector("#notes-list");
  const paint = (notes, legacyNote) => {
    item.notes = notes;
    if (legacyNote !== undefined) item.note = legacyNote;
    const stored = allItems.find((entry) => entry._id === item._id);
    if (stored) {
      stored.notes = notes;
      if (legacyNote !== undefined) stored.note = legacyNote;
    }
    list.innerHTML = noteListHtml(item);
    const count = noteEntries(item).length;
    card.querySelector("#notes-count").textContent = count ? `${count} ta` : "";
    list.scrollTop = list.scrollHeight;
  };
  list.scrollTop = list.scrollHeight;
  const form = card.querySelector("#note-form");
  const area = form?.querySelector("textarea");
  const grow = () => {
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${Math.min(area.scrollHeight, 120)}px`;
    area.style.overflowY = area.scrollHeight > 120 ? "auto" : "hidden";
  };
  area?.addEventListener("input", grow);
  area?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = area.value.trim();
    if (!text) return;
    const button = form.querySelector(".note-send");
    button.disabled = true;
    const res = await fetch(`/api/applications/${encodeURIComponent(item._id)}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    button.disabled = false;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || "Izoh saqlanmadi");
    area.value = "";
    grow();
    paint(data.notes || []);
  });
  list.addEventListener("click", async (event) => {
    const del = event.target.closest("[data-note-del]");
    if (!del) return;
    if (!confirm("Bu izoh o‘chirilsinmi?")) return;
    const res = await fetch(`/api/applications/${encodeURIComponent(item._id)}/notes/${encodeURIComponent(del.dataset.noteDel)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || "O‘chirilmadi");
    paint(data.notes || [], data.note);
  });
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

// Yangi = panelda hali hech kim ochmagan ariza (seenAt bo'sh)
function isFresh(item) {
  return !item.seenAt;
}

const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

function dayStart(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function daysAgo(value) {
  const time = new Date(value || 0).getTime();
  if (!time || !Number.isFinite(time)) return Infinity;
  return Math.round((dayStart(Date.now()) - dayStart(time)) / 86400000);
}

// Ro'yxatni sana bo'yicha guruhlash: Bugun, Kecha, Oxirgi 7 kun, keyin oylar
function dateBucket(value) {
  const days = daysAgo(value);
  if (days === Infinity) return { key: "none", label: "Sanasiz", tone: "old" };
  if (days <= 0) return { key: "today", label: "Bugun", tone: "today" };
  if (days === 1) return { key: "yesterday", label: "Kecha", tone: "yesterday" };
  if (days < 7) return { key: "week", label: "Oxirgi 7 kun", tone: "week" };
  const date = new Date(value);
  return { key: `m-${date.getFullYear()}-${date.getMonth()}`, label: `${monthNames[date.getMonth()]} ${date.getFullYear()}`, tone: "old" };
}

function relativeStamp(value) {
  const time = new Date(value || 0).getTime();
  if (!time || !Number.isFinite(time)) return "—";
  const minutes = Math.floor((Date.now() - time) / 60000);
  const clock = String(formatDate(value)).split(", ")[1] || "";
  const days = daysAgo(value);
  if (minutes < 1) return "Hozirgina";
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  if (days <= 0) return `Bugun, ${clock}`;
  if (days === 1) return `Kecha, ${clock}`;
  if (days < 7) return `${days} kun oldin`;
  return formatDate(value);
}

// Har bir yo'nalishga o'z rangi
const positionHues = [245, 160, 25, 200, 330, 45, 280, 120, 0, 185, 300, 90, 215, 15, 265, 140, 350, 60, 230];
function positionHue(name) {
  const index = knownPositions.indexOf(name);
  if (index >= 0) return positionHues[index % positionHues.length];
  let hash = 0;
  for (const ch of String(name || "")) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}

const factIcons = {
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  parent: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.9-2.8 3-4.2 5.5-4.2s4.6 1.4 5.5 4.2M16 5.5a3 3 0 0 1 0 5.6M17.5 14.9c1.6.6 2.6 1.9 3 4.1"/>',
  birthday: '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M4 15c2.5 1.5 5.5 1.5 8 0s5.5-1.5 8 0M12 11V7.5"/><path d="M12 3.5c.8.9 1.2 1.6 1.2 2.2a1.2 1.2 0 0 1-2.4 0c0-.6.4-1.3 1.2-2.2z"/>',
  language: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.6 3.5 5.4 3.5 8.5s-1.1 5.9-3.5 8.5c-2.4-2.6-3.5-5.4-3.5-8.5s1.1-5.9 3.5-8.5"/>',
  interview: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  score: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
};

function scoreCardHtml(item) {
  if (item.assessmentScore != null) return `<b>${item.assessmentScore}</b><small>/100</small>`;
  if (item.score != null && item.score !== "") return `<b>${Math.round(Number(item.score))}</b><small>/10</small>`;
  return "—";
}

function scoreDetailHtml(item) {
  if (item.assessmentScore != null) {
    const grade = assessmentGrade(item.assessmentScore);
    const manualMark = item.assessment?.manualScore != null ? ` <em class="grade-pill">qo‘lda</em>` : "";
    return `${item.assessmentScore} / 100 <em class="grade-pill g-${grade.key}">${grade.label}</em>${manualMark}`;
  }
  if (item.score != null && item.score !== "") return `${Math.round(Number(item.score))} / 10 <em class="grade-pill">eski baho</em>`;
  return `<em class="score-cta">Baholashni boshlash →</em>`;
}

function hasScore(item) {
  return item.assessmentScore != null || (item.score !== null && item.score !== undefined && item.score !== "");
}

function cardActions(item) {
  const heart = heartHtml(item);
  if (!canRemove()) return heart;
  const trash = `<span class="ac-icon ac-delete" data-${archiveMode ? "purge" : "archive"}="${esc(item._id)}" role="button" aria-label="${archiveMode ? "Butunlay o‘chirish" : "Arxivga o‘tkazish"}" title="${archiveMode ? "Butunlay o‘chirish" : "Arxivga o‘tkazish"}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg></span>`;
  const restore = archiveMode && currentUser?.role === "admin"
    ? `<span class="ac-icon ac-restore" data-restore="${esc(item._id)}" role="button" aria-label="Arxivdan qaytarish" title="Arxivdan qaytarish"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v5h16v-5M12 16V4M8 8l4-4 4 4"/></svg></span>`
    : "";
  return `${restore}${trash}${heart}`;
}

function cardHtml(item) {
  const person = splitName(item.fullName);
  const tone = interviewTone(item);
  const initials = [person.surname, person.name]
    .filter((part) => part && part !== "—")
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  const photo = item.hasPhoto
    ? `<img class="ac-photo" src="/api/applications/${esc(item._id)}/photo" alt="" loading="lazy" />`
    : `<span class="ac-photo ac-photo-empty">${esc(initials || "?")}</span>`;
  const score = item.score == null || item.score === "" ? "" : Math.round(Number(item.score));
  const fact = (kind, label, value, html = "") => `
    <div class="ac-fact f-${kind}">
      <span class="ac-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${factIcons[kind]}</svg></span>
      <span class="ac-txt">
        <span class="ac-k">${label}</span>
        <span class="ac-v">${html || esc(value || "—")}</span>
      </span>
    </div>`;
  const recency = dateBucket(item.createdAt).tone;
  const position = item.position || "Yo‘nalishsiz";
  return `
    <button class="acard tone-${tone} recent-${recency}${isFresh(item) ? " is-new" : ""}" type="button" data-id="${esc(item._id)}" title="Yuborilgan: ${esc(formatDate(item.createdAt) || "—")}">
      <div class="ac-top">
        <span class="status-pill tone-${tone}"><i></i>${esc(interviewLabels[tone])}</span>
        ${isFresh(item) ? `<span class="new-pill">Yangi</span>` : ""}
        <time class="ac-time t-${recency}"><svg viewBox="0 0 24 24" aria-hidden="true">${factIcons.clock}</svg>${esc(relativeStamp(item.createdAt))}</time>
        <span class="ac-tools">${cardActions(item)}</span>
      </div>
      <div class="ac-body">
        <div class="ac-photo-wrap">${photo}</div>
        <div class="ac-main">
          <h3 class="ac-name">${esc(person.surname)} ${esc(person.name === "—" ? "" : person.name)}</h3>
          <span class="ac-role" style="--h:${positionHue(item.position)}">${esc(position)}</span>
          <div class="ac-facts">
            ${fact("phone", "Telefon", formatPhone(item.phone))}
            ${fact("parent", "Qo‘shimcha tel.", formatPhone(item.parentPhone))}
            ${fact("birthday", "Tug‘ilgan", item.birthday)}
            ${fact("language", "Til darajasi", item.languageLevel)}
            ${fact("interview", "Suhbat vaqti", prettyStamp(item.interviewAt))}
            ${fact("score", "Ball", "", scoreCardHtml(item))}
          </div>
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
  const found = searchedItems().filter(periodMatch).filter(statusMatch);
  const dated = allItems.filter(periodMatch);
  const counts = new Map();
  for (const item of found) {
    const key = item.position || "Yo‘nalishsiz";
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const directions = [...groupOrder(found), "Yo‘nalishsiz"].filter((name) => counts.get(name));
  const directionCount = new Set(allItems.map((item) => item.position).filter(Boolean)).size;
  const latest = allItems[0] ? formatDate(allItems[0].createdAt) : "—";
  const totalLabel = archiveMode ? "Arxivdagi ariza" : "Jami ariza";

  if (latestNoteEl) latestNoteEl.textContent = `So‘nggi ariza: ${latest}`;

  const searchedDated = searchedItems().filter(periodMatch);
  const tileCount = (key) => searchedDated.filter((item) => interviewKey(item.interviewStatus) === key).length;
  const tiles = [
    ["", archiveMode ? "Arxivda" : "Jami arizalar", searchedDated.length, `${directionCount} ta yo‘nalish`],
    ["new", "Yangi", searchedDated.filter(isFresh).length, "Hali ochilmagan"],
    ["none", "Chaqirilmagan", tileCount("none"), "Javob kutmoqda"],
    ["expected", "Chaqirildi", tileCount("expected"), "Suhbatga"],
    ["arrived", "Zaxirada", tileCount("arrived"), "Keyinroq olinadi"],
    ["hired", "Boshqa joyda", tileCount("hired"), "Boshqa ishga kirgan"],
    ["started", "Ishni boshladi", tileCount("started"), "Ish boshlagan"],
    ["left", "Bo‘shagan", tileCount("left"), "Ishlab, ketgan"],
    ["declined", "Ishlamaydi ekan", tileCount("declined"), "Ishlay olmaydi"],
  ];
  // Eski "Kelmagan" yozuvlari bo'lsa ham ko'rinib tursin
  if (tileCount("missed")) tiles.push(["missed", "Kelmagan", tileCount("missed"), "Eski holat"]);
  statsEl.innerHTML = tiles
    .map(([key, label, value, hint]) => `
      <button type="button" class="stat tone-${key || "all"} ${activeStatus === key ? "active" : ""}" data-status="${key}">
        <span class="stat-label"><i></i>${label}</span>
        <b>${value}</b>
        <small>${hint}</small>
      </button>`)
    .join("");

  const positionPool = groupOrder(allItems);
  const chipCount = (name) => found.filter((item) => (item.position || "Yo‘nalishsiz") === name).length;
  const chipNames = [...positionPool, "Yo‘nalishsiz"].filter((name, index, list) => list.indexOf(name) === index);
  if (activePosition && !chipNames.includes(activePosition)) chipNames.push(activePosition);
  // Eng ko'p arizali yo'nalishlar birinchi; teng bo'lsa — asl tartibda
  chipsEl.innerHTML = [
    `<button type="button" class="chip chip-all ${activePosition ? "" : "active"}" data-position="" style="--h:245"><svg class="chip-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg><span class="chip-name">Barcha yo‘nalishlar</span><i>${found.length}</i></button>`,
    ...chipNames
      .map((name, order) => ({ name, order, count: chipCount(name) }))
      .filter(({ name, count }) => count || name === activePosition)
      .sort((a, b) => b.count - a.count || a.order - b.order)
      .map(({ name, count }) => `<button type="button" class="chip ${activePosition === name ? "active" : ""}" data-position="${esc(name)}" title="${esc(name)} — ${count} ta" style="--h:${positionHue(name === "Yo‘nalishsiz" ? "" : name)}"><span class="chip-dot"></span><span class="chip-name">${esc(name)}</span><i>${count}</i></button>`),
  ].join("");

  const countStatus = (key) => dated.filter((item) => interviewKey(item.interviewStatus) === key).length;
  const scoredCount = dated.filter(hasScore).length;
  fillSelect(
    statusEl,
    [
      { value: "", label: "Barchasi" },
      { value: "new", label: `Yangi, ochilmagan (${dated.filter(isFresh).length})` },
      { value: "none", label: `Chaqirilmagan (${countStatus("none")})` },
      { value: "expected", label: `Chaqirildi (${countStatus("expected")})` },
      { value: "arrived", label: `Zaxirada (${countStatus("arrived")})` },
      { value: "hired", label: `Boshqa joyga ishga kirgan (${countStatus("hired")})` },
      { value: "started", label: `Ishni boshladi (${countStatus("started")})` },
      { value: "left", label: `Ishdan bo‘shagan (${countStatus("left")})` },
      { value: "declined", label: `Ishlamaydi ekan (${countStatus("declined")})` },
      ...(countStatus("missed") ? [{ value: "missed", label: `Kelmagan (${countStatus("missed")})` }] : []),
      { value: "scored", label: `Ball qo‘yilgan (${scoredCount})` },
    ],
    activeStatus,
  );

  let visible = activePosition
    ? found.filter((item) => (item.position || "Yo‘nalishsiz") === activePosition)
    : found;
  if (activeSort === "favorite") visible = visible.filter((item) => item.favorite);
  const sort = activeSort;
  const totalVisible = visible.length;
  let budget = renderLimit;
  const take = (list) => {
    const part = list.slice(0, Math.max(0, budget));
    budget -= part.length;
    return part;
  };

  if (!visible.length) {
    listEl.innerHTML = `
      <div class="empty">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h4l2 3h4l2-3h4M5 13l2-7h10l2 7v5H5z"/></svg>
        <strong>${archiveMode ? "Arxiv bo‘sh" : "Bu bo‘yicha ariza topilmadi"}</strong>
        <p>${archiveMode ? "O‘chirilgan arizalar shu yerda turadi." : "Filtrlarni o‘zgartiring yoki botdan yangi ariza kelishini kuting."}</p>
      </div>`;
    return;
  }

  if (sort === "position" && !activePosition) {
    listEl.innerHTML = directions
      .map((name) => {
        const shown = take(visible
          .filter((item) => (item.position || "Yo‘nalishsiz") === name)
          .sort(byDate("newest")));
        if (!shown.length) return "";
        const cards = shown.map(cardHtml).join("");
        return `
          <section class="group">
            <div class="group-head">
              <span class="group-dot" style="--h:${positionHue(name === "Yo‘nalishsiz" ? "" : name)}"></span>
              <h2>${esc(name)}</h2>
              <span class="badge">${counts.get(name)} ta</span>
            </div>
            <div class="cards">${cards}</div>
          </section>`;
      })
      .join("") + moreHtml(totalVisible);
    watchLoadMore();
    return;
  }

  if (sort === "newest" || sort === "oldest") {
    const sorted = [...visible].sort(byDate(sort));
    const buckets = [];
    for (const item of sorted) {
      const bucket = dateBucket(item.createdAt);
      const last = buckets[buckets.length - 1];
      if (last && last.key === bucket.key) last.items.push(item);
      else buckets.push({ ...bucket, items: [item] });
    }
    const bucketIcon = {
      today: '<path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/><circle cx="12" cy="12" r="4"/>',
      yesterday: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
      week: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
      old: '<path d="M4 7h16v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM3 4h18v3H3zM10 11h4"/>',
    };
    listEl.innerHTML = buckets
      .map((bucket) => {
        const shown = take(bucket.items);
        if (!shown.length) return "";
        return `
        <section class="group bucket bucket-${bucket.tone}">
          <div class="group-head">
            <span class="bucket-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${bucketIcon[bucket.tone] || bucketIcon.old}</svg></span>
            <h2>${esc(bucket.label)}</h2>
            <span class="badge">${bucket.items.length} ta</span>
            ${activePosition ? `<span class="group-sub">${esc(activePosition)}</span>` : ""}
          </div>
          <div class="cards">${shown.map(cardHtml).join("")}</div>
        </section>`;
      })
      .join("") + moreHtml(totalVisible);
    watchLoadMore();
    return;
  }

  if (sort === "name") visible = [...visible].sort(byName);
  else if (sort === "oldest") visible = [...visible].sort(byDate("oldest"));
  else visible = [...visible].sort(byDate("newest"));

  const title = activePosition
    || (sort === "favorite" ? "Izbranniy" : sort === "all" ? "Barchasi" : sort === "name" ? "Ism bo‘yicha" : sort === "oldest" ? "Eskisidan" : sort === "newest" ? "Yangisidan" : "Sana bo‘yicha");
  listEl.innerHTML = `
    <section class="group">
      <div class="group-head">
        <h2>${esc(title)}</h2>
        <span class="badge">${visible.length} ta</span>
      </div>
      <div class="cards">${take(visible).map(cardHtml).join("")}</div>
    </section>${moreHtml(totalVisible)}`;
  watchLoadMore();
}

async function loadApplications() {
  const res = await fetch(archiveMode ? "/api/applications?archived=1" : "/api/applications");
  if (res.status === 401) return showLogin();
  const data = await res.json();
  allItems = data.items || [];
  knownPositions = data.positions || [];
  overdueMark = overdueIds();
  render();
  refreshStudentBadge();
}

// Suhbat vaqti o‘tgan zahoti kartochka sahifa yangilanmasa ham "Kelmadi" rangiga o‘tsin
let overdueMark = "";
const overdueIds = () => allItems.filter(interviewOverdue).map((item) => item._id).join(",");
setInterval(() => {
  const mark = overdueIds();
  if (mark === overdueMark) return;
  overdueMark = mark;
  render();
}, 60 * 1000);

const svgPaths = {
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  calendarCheck: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M9 15l2 2 4-4"/>',
  calendarEnd: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M10 13l4 4M14 13l-4 4"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M7 12h.01M17 12h.01"/>',
  star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
  cake: '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M4 15c2.5 1.5 5.5 1.5 8 0s5.5-1.5 8 0M12 11V7.5"/><path d="M12 3.5c.8.9 1.2 1.6 1.2 2.2a1.2 1.2 0 0 1-2.4 0c0-.6.4-1.3 1.2-2.2z"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.9-2.8 3-4.2 5.5-4.2s4.6 1.4 5.5 4.2M16 5.5a3 3 0 0 1 0 5.6M17.5 14.9c1.6.6 2.6 1.9 3 4.1"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"/>',
  heart: '<path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z"/>',
  send: '<path d="m21 4-18 7 7 2 2 7 3-5"/><path d="m10 13 11-9"/>',
  cap: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6"/>',
  award: '<circle cx="12" cy="9" r="5"/><path d="m8.5 13-1.5 8 5-3 5 3-1.5-8"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.6 3.5 5.4 3.5 8.5s-1.1 5.9-3.5 8.5c-2.4-2.6-3.5-5.4-3.5-8.5s1.1-5.9 3.5-8.5"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7 3v3a5 5 0 0 0 10 0V3M7 21v-3a5 5 0 0 1 10 0v3"/>',
  wallet: '<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V6a2 2 0 0 1 2-2h11v3"/><path d="M16 13.5h.01"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>',
  inbox: '<path d="M4 13h4l2 3h4l2-3h4M5 13l2-7h10l2 7v6H5z"/>',
  building: '<path d="M4 21V5l8-2 8 2v16M4 21h16M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 21v-4h4v4"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>',
  megaphone: '<path d="M4 10v4h3l7 5V5L7 10z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
  hash: '<path d="M5 9h15M4 15h15M10 3 8 21M16 3l-2 18"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.3-4 4.3-6 8-6s6.7 2 8 6"/>',
  idcard: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.5 1.6-2.2 3-2.2s2.4.7 3 2.2M14 10h4M14 14h3"/>',
  shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  coins: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
};

// Har bir maydon: [ikonka, rang]. Kalit — maydon nomi yoki sarlavhasi
const fieldLook = {
  interviewStatus: ["chat", "var(--c)"],
  interviewAt: ["calendar", "#f59e0b"],
  workStart: ["flag", "#14b8a6"],
  agreedSalary: ["cash", "#10b981"],
  score: ["star", "#f97316"],
  "Tug‘ilgan sana": ["cake", "#ec4899"],
  birthday: ["cake", "#ec4899"],
  phone: ["phone", "#10b981"],
  parentPhone: ["users", "#3b82f6"],
  "Millati": ["map", "#0ea5e9"],
  "Oilaviy holat": ["heart", "#f43f5e"],
  "Telegram": ["send", "#229ed9"],
  "Ma’lumot": ["cap", "#6366f1"],
  "Tugatish yili": ["award", "#8b5cf6"],
  "Til darajasi": ["globe", "#a855f7"],
  "Kompyuter": ["monitor", "#06b6d4"],
  workHours: ["clock", "#f59e0b"],
  workDuration: ["hourglass", "#eab308"],
  "Oxirgi oylik": ["wallet", "#84cc16"],
  "Kutilayotgan oylik": ["trend", "#22c55e"],
  "Yuborilgan vaqt": ["inbox", "#6366f1"],
  "O‘quv muassasasi": ["building", "#3b82f6"],
  "Manzil": ["pin", "#ef4444"],
  address: ["pin", "#ef4444"],
  "Oldingi ish": ["briefcase", "#f97316"],
  "E’lon manbasi": ["megaphone", "#ec4899"],
  "Telegram ID": ["hash", "#229ed9"],
  note: ["pencil", "#eab308"],
  contractNumber: ["hash", "#6366f1"],
  hiredAt: ["calendarCheck", "#10b981"],
  contractTerm: ["hourglass", "#eab308"],
  contractEnd: ["calendarEnd", "#ef4444"],
  department: ["building", "#3b82f6"],
  probation: ["flask", "#a855f7"],
  fullName: ["user", "#6366f1"],
  fatherName: ["users", "#8b5cf6"],
  passportSeries: ["idcard", "#0ea5e9"],
  passportIssued: ["calendar", "#f59e0b"],
  passportIssuer: ["shield", "#14b8a6"],
  jshshir: ["hash", "#f43f5e"],
  position: ["briefcase", "#f97316"],
  perStudentPay: ["coins", "#22c55e"],
};

function fieldIcon(name) {
  const look = fieldLook[name];
  if (!look) return "";
  return `<i class="pf-ico" style="--fc:${look[1]}"><svg viewBox="0 0 24 24" aria-hidden="true">${svgPaths[look[0]]}</svg></i>`;
}

function fieldStyle(name) {
  const look = fieldLook[name];
  return look ? ` style="--fc:${look[1]}"` : "";
}

// Qaysi savollar to'plami: saqlangan baho o'z to'plamida qoladi
// (eski baholarda "kind" yo'q — ular pedagogik savollar bilan qo'yilgan).
function assessmentKindOf(item) {
  const saved = item.assessment;
  if (saved && (saved.answered || saved.manualScore != null)) return saved.kind || "teacher";
  return assessmentKindFor(item.position);
}

function assessmentPageHtml(item) {
  const saved = item.assessment || {};
  const kind = assessmentKindOf(item);
  const set = ASSESSMENT_SETS[kind] || ASSESSMENT_SETS.teacher;
  const answers = Array.isArray(saved.answers) ? saved.answers : [];
  const notes = Array.isArray(saved.notes) ? saved.notes : [];
  const manual = saved.manualScore ?? "";
  let index = 0;
  const sections = set.sections.map((section, sectionIndex) => {
    const questions = section.questions.map((question) => {
      const i = index++;
      const value = answers[i] ?? null;
      return `
        <div class="q${value === null ? "" : " done"}" data-q="${i}">
          <div class="q-head">
            <span class="q-num">${i + 1}</span>
            <div class="q-body">
              <p class="q-text">${esc(question.text)}</p>
              <details class="q-hint"><summary>Yaxshi javobda nima bo‘lishi kerak?</summary><p>${esc(question.hint)}</p></details>
            </div>
          </div>
          <div class="q-rate" role="group" aria-label="${i + 1}-savol bahosi">
            ${RATING_SCALE.map((rate) => `<button type="button" class="r r-${rate.value}${value === rate.value ? " on" : ""}" data-v="${rate.value}"><b>${rate.value}</b><small>${rate.label}</small></button>`).join("")}
          </div>
          <input class="q-note" type="text" maxlength="300" placeholder="Izoh (ixtiyoriy)" value="${esc(notes[i] || "")}" />
        </div>`;
    }).join("");
    return `
      <section class="assess-cat" style="--cc:${section.color}">
        <h3><span class="cat-num">${sectionIndex + 1}</span><span class="cat-title">${esc(section.title)}</span><em class="cat-score"></em></h3>
        ${questions}
      </section>`;
  }).join("");
  const by = saved.byName ? `Oxirgi baholagan: ${esc(saved.byName)}, ${esc(formatDate(saved.at))}` : "Hali baholanmagan";
  return `
    <article class="assess-page hidden" id="assess-page" data-kind="${kind}">
      <div class="assess-head">
        <button type="button" class="icon-btn" id="close-assess" aria-label="Orqaga">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6"/></svg>
        </button>
        <div class="assess-title">
          <p class="eyebrow">${esc(set.title)}</p>
          <h2>20 ta savol · ${MAX_SCORE} ballik baho</h2>
          <p class="assess-by" id="assess-by">${by}</p>
        </div>
        <div class="assess-score" id="assess-score">
          <div class="ring"><div><b id="assess-total">0</b><small>/ ${MAX_SCORE}</small></div></div>
          <div class="assess-verdict">
            <strong id="assess-grade">—</strong>
            <span id="assess-advice"></span>
            <span id="assess-count" class="muted"></span>
          </div>
        </div>
        <label class="manual-score" title="Savollarsiz, ballni o‘zingiz qo‘yishingiz mumkin">
          <span>Qo‘lda ball</span>
          <span class="manual-box"><input id="assess-manual" type="number" min="0" max="${MAX_SCORE}" step="1" inputmode="numeric" placeholder="—" value="${esc(manual)}" /><small>/ ${MAX_SCORE}</small></span>
          <button type="button" id="assess-manual-clear" class="manual-clear" title="Qo‘lda ballni olib tashlash" aria-label="Qo‘lda ballni olib tashlash">×</button>
        </label>
      </div>
      <p class="assess-help">Savolni nomzodga bering, javobini tinglang va <b>0–5</b> ball qo‘ying. Har bir savol 5 ball, jami ${MAX_SCORE} ball — natija o‘zi hisoblanadi. Bahoni bekor qilish uchun tanlangan tugmani yana bosing. Xohlasangiz, yuqoridagi <b>«Qo‘lda ball»</b> maydoniga 0–${MAX_SCORE} oralig‘ida ballni o‘zingiz yozishingiz mumkin — u savollar bahosi o‘rniga hisoblanadi.</p>
      ${sections}
      <div class="assess-foot">
        <span id="assess-state" class="assess-state">O‘zgarish yo‘q</span>
        <button type="button" id="assess-save">Bahoni saqlash</button>
      </div>
    </article>`;
}

function bindAssessment(item, id) {
  const page = detailBody.querySelector("#assess-page");
  const passCard = detailBody.querySelector("#pass-card");
  if (!page || !passCard) return;
  const count = ASSESSMENT_QUESTIONS.length;
  const saved = item.assessment || {};
  const kind = page.dataset.kind || "teacher";
  const manualInput = page.querySelector("#assess-manual");
  const state = {
    answers: Array.from({ length: count }, (_, i) =>
      Array.isArray(saved.answers) && saved.answers[i] != null ? Number(saved.answers[i]) : null),
    notes: Array.from({ length: count }, (_, i) => (Array.isArray(saved.notes) ? String(saved.notes[i] || "") : "")),
    manual: saved.manualScore != null ? Number(saved.manualScore) : null,
  };
  let dirty = false;
  const stateEl = page.querySelector("#assess-state");
  const setDirty = (value, text) => {
    dirty = value;
    stateEl.textContent = text || (value ? "Saqlanmagan o‘zgarishlar bor" : "O‘zgarish yo‘q");
    stateEl.classList.toggle("warn", value);
    stateEl.classList.toggle("ok", !value && Boolean(text));
  };

  function paint() {
    const answered = state.answers.filter((value) => value !== null).length;
    const total = state.answers.reduce((sum, value) => sum + (value || 0), 0);
    const manual = state.manual;
    const shown = manual ?? total;
    const grade = assessmentGrade(manual ?? (answered ? total : null));
    page.querySelector("#assess-total").textContent = String(shown);
    page.querySelector("#assess-grade").textContent = grade.label;
    page.querySelector("#assess-advice").textContent = manual !== null || answered ? grade.advice : "";
    page.querySelector("#assess-count").textContent = manual !== null
      ? `Qo‘lda kiritilgan · savollar bo‘yicha: ${total}`
      : `${answered} / ${count} savol baholandi`;
    page.classList.toggle("manual-on", manual !== null);
    const box = page.querySelector("#assess-score");
    box.dataset.grade = grade.key;
    box.style.setProperty("--p", String((shown / MAX_SCORE) * 100));
    page.querySelectorAll(".assess-cat").forEach((cat) => {
      const indexes = [...cat.querySelectorAll(".q")].map((q) => Number(q.dataset.q));
      const sum = indexes.reduce((acc, i) => acc + (state.answers[i] || 0), 0);
      const done = indexes.filter((i) => state.answers[i] !== null).length;
      cat.querySelector(".cat-score").textContent = `${sum} / ${indexes.length * 5}${done < indexes.length ? ` · ${done}/${indexes.length}` : ""}`;
    });
  }
  paint();

  page.addEventListener("click", (event) => {
    const button = event.target.closest(".q-rate [data-v]");
    if (!button || !canChange()) return;
    const question = button.closest(".q");
    const i = Number(question.dataset.q);
    const value = Number(button.dataset.v);
    state.answers[i] = state.answers[i] === value ? null : value;
    question.querySelectorAll("[data-v]").forEach((other) => {
      other.classList.toggle("on", Number(other.dataset.v) === state.answers[i]);
    });
    question.classList.toggle("done", state.answers[i] !== null);
    setDirty(true);
    paint();
  });
  manualInput?.addEventListener("input", () => {
    const raw = manualInput.value.trim();
    if (!raw) state.manual = null;
    else {
      const num = Math.round(Number(raw));
      if (!Number.isFinite(num) || num < 0 || num > MAX_SCORE) {
        manualInput.classList.add("bad");
        return;
      }
      state.manual = num;
    }
    manualInput.classList.remove("bad");
    setDirty(true);
    paint();
  });
  page.querySelector("#assess-manual-clear")?.addEventListener("click", (event) => {
    event.preventDefault();
    if (!canChange() || state.manual === null) return;
    manualInput.value = "";
    manualInput.classList.remove("bad");
    state.manual = null;
    setDirty(true);
    paint();
  });
  page.addEventListener("input", (event) => {
    const note = event.target.closest(".q-note");
    if (!note) return;
    state.notes[Number(note.closest(".q").dataset.q)] = note.value;
    setDirty(true);
  });

  detailBody.querySelector("#open-assess")?.addEventListener("click", () => {
    passCard.classList.add("hidden");
    page.classList.remove("hidden");
    page.scrollTop = 0;
  });
  page.querySelector("#close-assess").addEventListener("click", () => {
    if (dirty && !confirm("Baholar saqlanmadi. Saqlamasdan chiqasizmi?")) return;
    page.classList.add("hidden");
    passCard.classList.remove("hidden");
  });
  if (!canChange()) {
    page.classList.add("readonly");
    page.querySelector("#assess-save").disabled = true;
    if (manualInput) manualInput.disabled = true;
    stateEl.textContent = "Faqat ko‘rish: baholashga ruxsat yo‘q";
  }
  page.querySelector("#assess-save").addEventListener("click", async () => {
    if (!canChange()) return;
    if (manualInput?.classList.contains("bad")) {
      alert(`Qo‘lda ball 0 dan ${MAX_SCORE} gacha bo‘lishi kerak`);
      return;
    }
    const saveButton = page.querySelector("#assess-save");
    saveButton.disabled = true;
    const res = await fetch(`/api/applications/${id}/assessment`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: ASSESSMENT_VERSION, kind, answers: state.answers, notes: state.notes, manualScore: state.manual }),
    });
    saveButton.disabled = false;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Baholash saqlanmadi");
      return;
    }
    const index = allItems.findIndex((entry) => entry._id === id);
    if (index >= 0) allItems[index] = { ...allItems[index], ...data.item };
    const scoreView = detailBody.querySelector("#score-view");
    if (scoreView) scoreView.innerHTML = scoreDetailHtml(data.item);
    const who = detailBody.querySelector("#who-ran");
    if (who) who.textContent = `Suhbat o‘tkazuvchi: ${staffMark(data.item.interviewerName) || "hali belgilanmagan"}`;
    const by = page.querySelector("#assess-by");
    if (by && data.item.assessment?.byName) {
      by.textContent = `Oxirgi baholagan: ${data.item.assessment.byName}, ${formatDate(data.item.assessment.at)}`;
    }
    setDirty(false, "Saqlandi ✓");
    render();
  });
}

async function openDetail(id, silent = false) {
  const res = await fetch(`/api/applications/${id}${silent ? "?silent=1" : ""}`);
  if (!res.ok) return;
  const { item } = await res.json();
  const index = allItems.findIndex((entry) => entry._id === id);
  const wasNew = index >= 0 && isFresh(allItems[index]);
  if (index >= 0) allItems[index] = { ...allItems[index], ...item };
  if (wasNew && !isFresh(allItems[index])) render();
  detailTitle.textContent = item.fullName || "Ariza";
  detailPosition.textContent = item.position || "Yo‘nalishsiz";

  const person = splitName(item.fullName);
  const shown = (value) => (value === 0 || value ? esc(value) : "—");
  const block = (label, value, wide = false) => `
    <div class="pass-field ${wide ? "wide" : ""}${String(value ?? "").length > 24 ? " long" : ""}${fieldLook[label] ? " has-ico" : ""}"${fieldStyle(label)}>
      ${fieldIcon(label)}
      <span>${label}</span>
      <strong>${shown(value)}</strong>
    </div>`;
  const editCard = (key, label, display, control, askSave = false) => `
    <div class="pass-field edit-card${String(display ?? "").length > 24 ? " long" : ""}${fieldLook[key] ? " has-ico" : ""}" data-edit="${key}"${fieldStyle(key)}>
      ${fieldIcon(key)}
      <span>${label}</span>
      <strong class="edit-view">${shown(display)}</strong>
      <div class="edit-box">
        ${control}
        ${askSave ? `<button type="button" class="card-save">Saqlash</button>` : ""}
      </div>
    </div>`;

  const interview = interviewTone(item);
  const photoUrl = `/api/applications/${esc(item._id)}/photo`;
  const docSlots = [
    ["passportFront", "Pasport oldi", item.hasPassportFront, item.passportFrontName, item.passportFrontType],
    ["passportBack", "Pasport orqasi", item.hasPassportBack, item.passportBackName, item.passportBackType],
    ["diploma", "Diplom", item.hasDiploma, item.diplomaName, item.diplomaType],
    ["diplomaAppendix", "Diplom ilovasi", item.hasDiplomaAppendix, item.diplomaAppendixName, item.diplomaAppendixType],
    ["certificate", "Sertifikat", item.hasCertificate, item.certificateName, item.certificateType],
    ["signedContract", "Imzolangan shartnoma", item.hasSignedContract, item.signedContractName, item.signedContractType, "application/pdf,.pdf"],
  ];
  const docLook = {
    passportFront: ["idcard", "#0ea5e9"],
    passportBack: ["idcard", "#14b8a6"],
    diploma: ["cap", "#6366f1"],
    diplomaAppendix: ["file", "#8b5cf6"],
    certificate: ["award", "#f59e0b"],
    signedContract: ["file", "#10b981"],
  };
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
      <div class="doc-slot" data-doc="${slot}" style="--fc:${docLook[slot][1]}">
        <span><i class="pf-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${svgPaths[docLook[slot][0]]}</svg></i>${label}</span>
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
    <article class="pass tone-${interview}" id="pass-card">
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
            <span class="pass-role" style="--h:${positionHue(item.position)}">${esc(item.position || "Yo‘nalishsiz")}</span>
            <div class="pass-person"><i class="pi-ico" style="--fc:#3b82f6"><svg viewBox="0 0 24 24" aria-hidden="true">${svgPaths.phone}</svg></i><p class="pass-interviewer" id="who-called">Suhbatga chaqirgan: ${esc(staffMark(item.callerName) || "hali belgilanmagan")}</p></div>
            <div class="pass-person"><i class="pi-ico" style="--fc:#8b5cf6"><svg viewBox="0 0 24 24" aria-hidden="true">${svgPaths.user}</svg></i><p class="pass-interviewer" id="who-ran">Suhbat o‘tkazuvchi: ${esc(staffMark(item.interviewerName) || "hali belgilanmagan")}</p></div>
          </div>
          <div class="launch-row">
            <button type="button" class="contract-launch" id="open-contract"><svg viewBox="0 0 24 24" aria-hidden="true">${svgPaths.file}</svg>Shartnomani ko‘rish</button>
          </div>
          ${editCard(
            "interviewStatus",
            "Suhbat",
            interviewLabels[interview],
            `<div class="choice mini">
              <button type="button" class="tone-none" data-call="none"><i></i>Chaqirilmagan</button>
              <button type="button" class="tone-expected" data-call="expected"><i></i>Chaqirildi</button>
              <button type="button" class="tone-arrived" data-call="arrived"><i></i>Zaxirada</button>
              <button type="button" class="tone-hired" data-call="hired"><i></i>Boshqa joyga ishga kirgan</button>
              <button type="button" class="tone-started" data-call="started"><i></i>Ishni boshladi</button>
              <button type="button" class="tone-left" data-call="left"><i></i>Ishdan bo‘shagan</button>
              <button type="button" class="tone-declined" data-call="declined"><i></i>Ishlamaydi ekan</button>
            </div>`,
          )}
          ${editCard("interviewAt", "Suhbat vaqti", prettyStamp(item.interviewAt), `<input name="interviewAt" type="hidden" value="${esc(item.interviewAt || "")}" />`)}
          ${editCard("workStart", "Ish boshlash", prettyStamp(item.workStart), `<input name="workStart" type="hidden" value="${esc(item.workStart || "")}" />`)}
          ${editCard("agreedSalary", "Kelishilgan oylik", formatAgreedSalary(item.agreedSalary), salaryEditorHtml(item.agreedSalary), true)}
          <button type="button" class="pass-field has-ico score-launch" id="open-assess"${fieldStyle("score")} title="20 ta pedagogik savol bo‘yicha baholash">
            ${fieldIcon("score")}
            <span>Ball · 20 savol</span>
            <strong id="score-view">${scoreDetailHtml(item)}</strong>
          </button>
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
        ${notesCardHtml(item)}
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
        <div class="pass-field has-ico" id="contract-end-card"${fieldStyle("contractEnd")}>
          ${fieldIcon("contractEnd")}
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
    ${assessmentPageHtml(item)}
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
  // metafor’ga o‘tkazish — sarlavhada, yurakchaning chap tomonida
  document.querySelector("#detail-crm").innerHTML = crmButtonHtml(item);
  detail.showModal();

  const draft = {
    interviewStatus: interview,
    score: item.score == null || item.score === "" ? "" : Math.round(Number(item.score)),
    note: item.note || "",
    agreedSalary: formatAgreedSalary(item.agreedSalary),
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
    const tones = ["tone-none", "tone-expected", "tone-late", "tone-arrived", "tone-missed", "tone-hired", "tone-started", "tone-left", "tone-declined"];
    const pass = detailBody.querySelector("#pass-card");
    for (const el of [card, pass].filter(Boolean)) {
      el.classList.remove(...tones);
      el.classList.add(`tone-${interviewTone(draft)}`);
    }
  }
  if (interviewCard) paintInterview(interviewCard);

  function viewText(key) {
    if (key === "interviewStatus") return interviewLabels[interviewTone(draft)];
    if (key === "hiredAt" || key === "contractEnd") return uzContractDate(draft[key]) || "—";
    if (key === "interviewAt" || key === "workStart") return prettyStamp(draft[key]) || "—";
    if (key === "phone" || key === "parentPhone") return formatPhone(draft[key]) || "—";
    if (key === "agreedSalary") return formatAgreedSalary(draft[key]) || "—";
    if (key === "lastSalary" || key === "expectedSalary") return formatSum(draft[key]) || "—";
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
      else if (key === "agreedSalary") draft[key] = formatAgreedSalary(input.value);
      else if (key === "lastSalary" || key === "expectedSalary") draft[key] = formatSum(input.value);
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
    if (key === "interviewAt" && interviewCard) {
      paintInterview(interviewCard);
      interviewCard.querySelector(".edit-view").textContent = viewText("interviewStatus");
    }
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
      if (!canChange()) return;
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
      if (card.dataset.edit === "interviewAt" || card.dataset.edit === "workStart") {
        const key = card.dataset.edit;
        const hidden = card.querySelector(`input[name="${key}"]`);
        openDateTimePicker(card, hidden?.value || draft[key], {
          withTime: key === "interviewAt",
          onPick(next) {
            if (!hidden) return;
            hidden.value = next;
            hidden.dispatchEvent(new Event("change"));
          },
          onClose() {
            card.classList.remove("editing");
          },
        });
        return;
      }
      if (card.dataset.edit === "agreedSalary") {
        setupSalaryEditor(card, draft.agreedSalary);
        return;
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

  wireNotesCard(item);
  wireCrmButton(item);

  detailBody.querySelectorAll(".doc-slot").forEach((slot) => {
    const kind = slot.dataset.doc;
    slot.querySelector("input")?.addEventListener("change", async (event) => {
      if (!canChange()) return;
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
      if (!canChange()) return;
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
    if (!canChange()) return;
    const kind = detailBody.querySelector("#doc-lightbox")?.dataset.slot;
    if (!kind) return;
    if (!confirm("Aniq shu rasmni o‘chirayveraymi?")) return;
    const res = await fetch(`/api/applications/${id}/docs/${kind}`, { method: "DELETE" });
    if (!res.ok) return;
    await openDetail(id, true);
  });

  bindAssessment(item, id);

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
      if (!canChange()) return;
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
  if (item.archived && currentUser?.role === "admin") {
    const restoreButton = document.createElement("button");
    restoreButton.id = "header-restore";
    restoreButton.type = "button";
    restoreButton.className = "ghost";
    restoreButton.textContent = "Qaytarish";
    document.querySelector("#close-detail").before(restoreButton);
    restoreButton.addEventListener("click", () => takeFromArchive(id));
  }
  if (!canRemove()) return;
  const deleteButton = document.createElement("button");
  deleteButton.id = "header-delete";
  deleteButton.type = "button";
  deleteButton.className = "icon-btn danger";
  deleteButton.setAttribute("aria-label", item.archived ? "O‘chirish" : "Arxivga o‘tkazish");
  deleteButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg>`;
  document.querySelector("#close-detail").before(deleteButton);
  deleteButton.addEventListener("click", () => {
    if (item.archived) purgeFromArchive(id);
    else moveToArchive(id);
  });
}

// ===== Arxiv: alohida, to'liq ekranli sahifa =====
const archiveDialog = document.querySelector("#archive-dialog");
const archiveList = document.querySelector("#arc-list");
const archiveSearch = document.querySelector("#arc-search");
let archiveItems = [];

async function loadArchive() {
  archiveList.innerHTML = `<p class="muted arc-loading">Yuklanmoqda...</p>`;
  const res = await fetch("/api/applications?archived=1");
  if (res.status === 401) return showLogin();
  const data = await res.json().catch(() => ({}));
  archiveItems = (data.items || []).sort((a, b) =>
    new Date(b.archivedAt || b.createdAt || 0) - new Date(a.archivedAt || a.createdAt || 0));
  renderArchive();
}

function renderArchive() {
  document.querySelector("#arc-count").textContent = `${archiveItems.length} ta`;
  const query = archiveSearch.value.trim().toLowerCase();
  const items = query
    ? archiveItems.filter((item) =>
        [item.fullName, item.phone, item.parentPhone, item.position, item.username]
          .some((value) => String(value || "").toLowerCase().includes(query)))
    : archiveItems;
  if (!items.length) {
    archiveList.innerHTML = `
      <div class="empty arc-empty">
        <span class="arc-empty-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM3 4h18v3H3zM10 11h4"/></svg></span>
        <strong>${query ? "Hech narsa topilmadi" : "Arxiv bo‘sh"}</strong>
        <p>${query ? "Boshqa so‘z bilan qidirib ko‘ring." : "Arizani o‘chirsangiz, u shu yerga tushadi va keyin qaytarish mumkin bo‘ladi."}</p>
      </div>`;
    return;
  }
  const admin = currentUser?.role === "admin";
  let lastDay = "";
  archiveList.innerHTML = items
    .map((item) => {
      const day = historyDay(item.archivedAt || item.createdAt);
      const head = day !== lastDay ? `<h3 class="history-day arc-day">${esc(day)}</h3>` : "";
      lastDay = day;
      const person = splitName(item.fullName);
      const tone = interviewTone(item);
      const initials = [person.surname, person.name].filter((p) => p && p !== "—").map((p) => p.charAt(0).toUpperCase()).join("");
      const photo = item.hasPhoto
        ? `<img class="arc-photo" src="/api/applications/${esc(item._id)}/photo" alt="" loading="lazy" />`
        : `<span class="arc-photo arc-photo-empty">${esc(initials || "?")}</span>`;
      const archivedAt = item.archivedAt ? formatDate(item.archivedAt) : "—";
      return `${head}
        <article class="arc-card tone-${tone}" data-arc-open="${esc(item._id)}" tabindex="0">
          ${photo}
          <div class="arc-main">
            <div class="arc-name-row">
              <h3>${esc(item.fullName || "Ariza")}</h3>
              <span class="status-pill tone-${tone}"><i></i>${esc(interviewLabels[tone])}</span>
            </div>
            <span class="ac-role" style="--h:${positionHue(item.position)}">${esc(item.position || "Yo‘nalishsiz")}</span>
            <div class="arc-meta">
              <span><svg viewBox="0 0 24 24" aria-hidden="true">${factIcons.phone}</svg>${esc(formatPhone(item.phone) || "—")}</span>
              <span><svg viewBox="0 0 24 24" aria-hidden="true">${factIcons.interview}</svg>Kelgan: ${esc(formatDate(item.createdAt) || "—")}</span>
              <span class="arc-when"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM3 4h18v3H3z"/></svg>Arxivga: ${esc(archivedAt)}</span>
            </div>
          </div>
          <div class="arc-actions">
            ${admin ? `<button type="button" class="arc-btn restore" data-arc-restore="${esc(item._id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v5h16v-5M12 16V4M8 8l4-4 4 4"/></svg>Qaytarish</button>` : ""}
            ${canRemove() ? `<button type="button" class="arc-btn purge" data-arc-purge="${esc(item._id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg>Butunlay o‘chirish</button>` : ""}
          </div>
        </article>`;
    })
    .join("");
}

archiveSearch.addEventListener("input", renderArchive);

archiveList.addEventListener("click", (event) => {
  const restore = event.target.closest("[data-arc-restore]");
  if (restore) return takeFromArchive(restore.dataset.arcRestore);
  const purge = event.target.closest("[data-arc-purge]");
  if (purge) return purgeFromArchive(purge.dataset.arcPurge);
  const card = event.target.closest("[data-arc-open]");
  if (card) openDetail(card.dataset.arcOpen);
});
archiveList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const card = event.target.closest("[data-arc-open]");
  if (card) openDetail(card.dataset.arcOpen);
});

document.querySelector("#open-archive").addEventListener("click", async () => {
  if (detail.open) detail.close();
  archiveSearch.value = "";
  archiveDialog.showModal();
  await loadArchive();
});
document.querySelector("#close-archive").addEventListener("click", () => archiveDialog.close());

// ============ O‘quvchilar shartnomasi ============
const studentsDialog = document.querySelector("#students-dialog");
const studentList = document.querySelector("#stu-list");
const studentDetail = document.querySelector("#stu-detail");
const studentSearch = document.querySelector("#stu-search");
let studentItems = [];
let contractTemplates = [];
let studentCourses = [];

async function loadStudentCourses() {
  try {
    const res = await fetch("/api/student-courses");
    if (!res.ok) return;
    studentCourses = (await res.json()).items || [];
  } catch { /* kurslar kelmasa ham shartnoma qo‘lda to‘ldiriladi */ }
}
let templateTags = [];

async function loadContractTemplates() {
  try {
    const res = await fetch("/api/contract-templates");
    if (!res.ok) return;
    const data = await res.json();
    contractTemplates = data.items || [];
    templateTags = data.tags || [];
  } catch { /* shablonlar ro‘yxati kelmasa standart shartnoma ishlayveradi */ }
}

const STUDENT_FIELDS = [
  ["fullName", "F.I.Sh", "Familiya Ism Otasining ismi", true],
  ["course", "Kurs", "Ingliz tili"],
  ["birthday", "Tug‘ilgan sana", "KK.OO.YYYY"],
  ["phone", "Telefon", "+998 90 123 45 67"],
  ["passportSeries", "Hujjat seriyasi va raqami", "AD1234567"],
  ["passportIssued", "Hujjat berilgan sana", "KK.OO.YYYY"],
  ["passportIssuer", "Hujjatni bergan organ", "IIV 8213"],
  ["jshshir", "JSHSHIR", "14 ta raqam"],
  ["address", "Manzil", "Doimiy yashash manzili", "span2"],
];
const STUDENT_DOC_TYPES = { id: "🪪 ID karta", passport: "📘 Pasport", birth: "📄 Tug‘ilganlik guvohnomasi" };
const STUDENT_DOCS = [
  ["passportFront", "Pasport oldi", "#0ea5e9"],
  ["passportBack", "Pasport orqasi", "#14b8a6"],
  ["birthCertificate", "Tug‘ilganlik guvohnomasi", "#f59e0b"],
];
const studentFlag = (item, slot) => item[`has${slot.charAt(0).toUpperCase()}${slot.slice(1)}`];

function setStudentBadge(items) {
  const badge = document.querySelector("#stu-new-badge");
  const fresh = items.filter((item) => !item.seenAt).length;
  badge.textContent = String(fresh);
  badge.classList.toggle("hidden", !fresh);
}

async function refreshStudentBadge() {
  try {
    const res = await fetch("/api/student-contracts");
    if (!res.ok) return;
    const data = await res.json();
    setStudentBadge(data.items || []);
  } catch { /* nishon ko‘rinmasa ham panel ishlayveradi */ }
}

async function loadStudents() {
  studentList.innerHTML = `<p class="muted arc-loading">Yuklanmoqda...</p>`;
  const res = await fetch("/api/student-contracts");
  if (res.status === 401) return showLogin();
  const data = await res.json().catch(() => ({}));
  studentItems = data.items || [];
  setStudentBadge(studentItems);
  renderStudents();
  loadContractTemplates();
}

function studentThumb(item, cls) {
  const initials = String(item.fullName || "?").trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");
  return item.hasPassportFront && !String(item.passportFrontType || "").includes("pdf")
    ? `<img class="${cls}" src="/api/student-contracts/${esc(item._id)}/docs/passportFront" alt="" loading="lazy" />`
    : `<span class="${cls} arc-photo-empty">${esc(initials || "?")}</span>`;
}

function renderStudents() {
  document.querySelector("#stu-count").textContent = `${studentItems.length} ta`;
  const query = studentSearch.value.trim().toLowerCase();
  const items = query
    ? studentItems.filter((item) =>
        [item.fullName, item.phone, item.course, item.jshshir, item.username, item.passportSeries]
          .some((value) => String(value || "").toLowerCase().includes(query)))
    : studentItems;
  if (!items.length) {
    studentList.innerHTML = `
      <div class="empty arc-empty">
        <span class="arc-empty-ico stu-empty-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/></svg></span>
        <strong>${query ? "Hech narsa topilmadi" : "Hali o‘quvchi shartnomasi yo‘q"}</strong>
        <p>${query ? "Boshqa so‘z bilan qidirib ko‘ring." : "O‘quvchi botda /start → «🎓 O‘quvchi shartnomasi» tugmasini bosib ma’lumot yuborsa, shu yerda paydo bo‘ladi."}</p>
      </div>`;
    return;
  }
  let lastDay = "";
  studentList.innerHTML = items
    .map((item) => {
      const day = historyDay(item.createdAt);
      const head = day !== lastDay ? `<h3 class="history-day arc-day">${esc(day)}</h3>` : "";
      lastDay = day;
      const docs = STUDENT_DOCS.filter(([slot]) => studentFlag(item, slot)).length;
      return `${head}
        <article class="arc-card stu-card${item.seenAt ? "" : " is-new"}" data-stu-open="${esc(item._id)}" tabindex="0">
          ${studentThumb(item, "arc-photo")}
          <div class="arc-main">
            <div class="arc-name-row">
              <h3>${esc(item.fullName || "O‘quvchi")}</h3>
              ${item.seenAt ? "" : `<span class="new-pill">Yangi</span>`}
            </div>
            <div class="stu-tags">
              ${item.course ? `<span class="ac-role" style="--h:${positionHue(item.course)}">${esc(item.course)}</span>` : ""}
              ${item.docType ? `<span class="stu-doc-tag">${esc(STUDENT_DOC_TYPES[item.docType] || "")}</span>` : ""}
            </div>
            <div class="arc-meta">
              <span><svg viewBox="0 0 24 24" aria-hidden="true">${factIcons.phone}</svg>${esc(formatPhone(item.phone) || "—")}</span>
              <span><svg viewBox="0 0 24 24" aria-hidden="true">${factIcons.birthday}</svg>${esc(item.birthday || "—")}</span>
              <span><svg viewBox="0 0 24 24" aria-hidden="true">${svgPaths.file}</svg>${docs} ta hujjat</span>
              <span class="arc-when"><svg viewBox="0 0 24 24" aria-hidden="true">${factIcons.clock}</svg>${esc(formatDate(item.createdAt) || "—")}</span>
            </div>
          </div>
        </article>`;
    })
    .join("");
}

function showStudentList() {
  studentDetail.classList.add("hidden");
  studentDetail.innerHTML = "";
  studentList.classList.remove("hidden");
  studentsDialog.querySelector(".arc-head").classList.remove("hidden");
  renderStudents();
}

async function openStudent(id) {
  const res = await fetch(`/api/student-contracts/${encodeURIComponent(id)}`);
  if (res.status === 401) return showLogin();
  if (!res.ok) return alert("O‘quvchi topilmadi");
  const { item } = await res.json();
  if (!contractTemplates.length) await loadContractTemplates();
  await loadStudentCourses();
  const index = studentItems.findIndex((entry) => entry._id === id);
  if (index >= 0) studentItems[index] = item;
  setStudentBadge(studentItems);
  renderStudentDetail(item);
}

function renderStudentDetail(item) {
  const editable = canChange();
  const docs = STUDENT_DOCS.map(([slot, label, color]) => {
    const url = `/api/student-contracts/${esc(item._id)}/docs/${slot}`;
    const has = studentFlag(item, slot);
    const pdf = String(item[`${slot}Type`] || "").includes("pdf");
    const preview = has
      ? `<a class="stu-doc-view" href="${url}" target="_blank" rel="noopener" title="Kattaroq ochish">${
          pdf ? `<iframe src="${url}" title="${esc(label)}"></iframe><span class="stu-doc-pdf">PDF</span>` : `<img src="${url}" alt="${esc(label)}" loading="lazy" />`
        }</a>`
      : `<div class="doc-empty">Yuborilmagan</div>`;
    return `
      <div class="stu-doc" style="--fc:${color}">
        <span class="stu-doc-label"><i class="pf-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${svgPaths.idcard}</svg></i>${label}</span>
        ${preview}
        ${has ? `<a class="stu-doc-dl" href="${url}?download=1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v10M8 10l4 4 4-4M5 19h14"/></svg>Yuklab olish</a>` : ""}
      </div>`;
  }).join("");
  const fields = STUDENT_FIELDS.map(([key, label, placeholder, wide]) => `
    <label class="stu-field${wide === "span2" ? " span2" : wide ? " wide" : ""}">
      <span>${label}</span>
      <input name="${key}" value="${esc(item[key] || "")}" placeholder="${esc(placeholder)}" ${editable ? "" : "readonly"} />
    </label>`).join("");
  studentsDialog.querySelector(".arc-head").classList.add("hidden");
  studentList.classList.add("hidden");
  studentDetail.classList.remove("hidden");
  studentDetail.innerHTML = `
    <div class="stu-detail-head">
      <button type="button" class="arc-back" id="stu-back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6"/></svg>Ro‘yxatga qaytish</button>
      <div class="stu-detail-title">
        ${studentThumb(item, "stu-avatar")}
        <div>
          <p class="eyebrow">O‘quvchi shartnomasi</p>
          <h2>${esc(item.fullName || "O‘quvchi")}</h2>
          <p class="muted">Yuborgan: ${esc(formatDate(item.createdAt) || "—")}${item.username ? ` · @${esc(item.username)}` : ""}${item.docType ? ` · ${esc(STUDENT_DOC_TYPES[item.docType] || "")}` : ""}</p>
        </div>
      </div>
    </div>
    <div class="stu-docs">${docs}</div>
    <form class="stu-form" id="stu-form">
      ${fields}
      <label class="stu-field">
        <span>Hujjat turi</span>
        <select name="docType" ${editable ? "" : "disabled"}>
          <option value="">—</option>
          ${Object.entries(STUDENT_DOC_TYPES).map(([value, label]) => `<option value="${value}" ${item.docType === value ? "selected" : ""}>${esc(label)}</option>`).join("")}
        </select>
      </label>
      <label class="stu-field">
        <span>E-pochta (bo‘lsa)</span>
        <input name="email" value="${esc(item.email || "")}" placeholder="misol@gmail.com" ${editable ? "" : "readonly"} />
      </label>
      <div class="stu-contract wide">
        <div class="stu-contract-head">
          <span class="stu-contract-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${svgPaths.file}</svg></span>
          <div>
            <strong>Shartnoma</strong>
            <p class="muted">Shu kartalar shartnomaga tushadi. Qolgan matn namunadagidek o‘zgarmaydi.</p>
          </div>
        </div>
        <div class="stu-contract-grid">
          <label class="stu-field span2">
            <span>Shablon</span>
            <select name="contractTemplateId" ${editable ? "" : "disabled"}>
              <option value="">Standart — «Шартнома кингс» (ichki)</option>
              ${contractTemplates.map((tpl) => `<option value="${esc(tpl._id)}" ${tpl._id === item.contractTemplateId ? "selected" : ""}>${esc(tpl.name)}</option>`).join("")}
            </select>
          </label>
          <label class="stu-field">
            <span>Shartnoma raqami</span>
            <input name="contractNumber" value="${esc(item.contractNumber || "")}" placeholder="1/2026" ${editable ? "" : "readonly"} />
          </label>
          <label class="stu-field">
            <span>Shartnoma sanasi</span>
            <input type="hidden" name="contractDate" value="${esc(item.contractDate || todayIso())}" />
            <button type="button" class="stu-date" id="stu-date" ${editable ? "" : "disabled"}>${esc(uzContractDate(item.contractDate || todayIso()))}</button>
          </label>
          ${studentCourses.length ? `
          <label class="stu-field span2 stu-course-pick">
            <span>Kurslardan tanlash (narx va muddat o‘zi qo‘yiladi)</span>
            <input type="hidden" name="courseId" value="${esc(item.courseId || "")}" />
            <select id="stu-course-pick" ${editable ? "" : "disabled"}>
              <option value="">— tanlang —</option>
              ${studentCourses.map((c) => `<option value="${esc(c._id)}" ${c._id === item.courseId ? "selected" : ""}>${esc(c.name)}${c.price ? ` — ${esc(formatPrice(c.price))} so‘m` : ""}${c.months ? `, ${esc(c.months)} oy` : ""}</option>`).join("")}
            </select>
          </label>` : ""}
          <label class="stu-switch wide">
            <input type="checkbox" name="transliterate" ${item.transliterate === false ? "" : "checked"} ${editable ? "" : "disabled"} />
            <span class="stu-switch-track" aria-hidden="true"></span>
            <span class="stu-switch-text">
              <b>Ism va manzilni shartnoma yozuviga o‘girish</b>
              <small>Yoqilgan: lotincha yozilgan bo‘lsa, kirillcha shartnomaga kirillda tushadi (va aksincha). O‘chirilgan: o‘quvchi yozganidek qoladi.</small>
            </span>
          </label>
          <label class="stu-field span2 stu-cyr-field">
            <span>F.I.Sh shartnomada (kirillda) — bo‘sh qolsa avtomatik</span>
            <input name="fullNameCyr" value="${esc(item.fullNameCyr || "")}" placeholder="${esc(latinToCyrillic(item.fullName || "") || "Каримов Сардор Алиевич")}" ${editable ? "" : "readonly"} />
          </label>
          <label class="stu-field span2 stu-cyr-field">
            <span>Manzil shartnomada (kirillda) — bo‘sh qolsa avtomatik</span>
            <input name="addressCyr" value="${esc(item.addressCyr || "")}" placeholder="${esc(latinToCyrillic(item.address || "") || "Жиззах ш., Шарқ маҳалласи 5")}" ${editable ? "" : "readonly"} />
          </label>
          <label class="stu-field">
            <span>Kurs (shartnomada, kirillda)</span>
            <input name="contractCourse" list="stu-courses" value="${esc(item.contractCourse || courseToCyr(item.course))}" placeholder="Инглиз тили" ${editable ? "" : "readonly"} />
          </label>
          <label class="stu-field">
            <span>Muddati (oy)</span>
            <input name="contractMonths" inputmode="numeric" value="${esc(item.contractMonths || "")}" placeholder="2" ${editable ? "" : "readonly"} />
          </label>
          <label class="stu-field span2">
            <span>Umumiy summa (so‘m)</span>
            <input name="contractPrice" inputmode="numeric" value="${esc(formatPrice(item.contractPrice))}" placeholder="2 200 000" ${editable ? "" : "readonly"} />
          </label>
          <p class="stu-words wide" id="stu-words"></p>
        </div>
        <datalist id="stu-courses">${COURSES_CYR.map(([, name]) => `<option value="${esc(name)}"></option>`).join("")}</datalist>
      </div>
      <label class="stu-field wide">
        <span>Izoh</span>
        <textarea name="note" rows="3" placeholder="Masalan: shartnoma imzolandi, guruh, to‘lov..." ${editable ? "" : "readonly"}>${esc(item.note || "")}</textarea>
      </label>
      <div class="stu-actions">
        ${canRemove() ? `<button type="button" class="arc-btn purge" id="stu-delete"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg>O‘chirish</button>` : ""}
        <span class="stu-saved" id="stu-saved"></span>
        ${editable ? `<button type="submit" class="stu-save ghost">Saqlash</button>` : ""}
        <button type="button" class="stu-make" id="stu-make"><svg viewBox="0 0 24 24" aria-hidden="true">${svgPaths.file}</svg>Shartnomani tayyorlash</button>
      </div>
    </form>`;
  studentDetail.querySelector("#stu-back").addEventListener("click", showStudentList);
  const form = studentDetail.querySelector("#stu-form");
  // Lotincha ism/manzil o‘zgarsa — kirill varianti (placeholder) ham yangilanadi
  // Kirill maydonlaridagi kulrang ko‘rsatma — shartnomaga aynan nima tushishini ko‘rsatadi
  const paintCyrHints = () => {
    const on = form.transliterate.checked;
    form.fullNameCyr.placeholder = (on ? latinToCyrillic(form.fullName?.value || "") : form.fullName?.value) || "Каримов Сардор Алиевич";
    form.addressCyr.placeholder = (on ? latinToCyrillic(form.address?.value || "") : form.address?.value) || "Жиззах ш., Шарқ маҳалласи 5";
  };
  form.fullName?.addEventListener("input", paintCyrHints);
  form.address?.addEventListener("input", paintCyrHints);
  studentDetail.querySelector("#stu-course-pick")?.addEventListener("change", (event) => {
    const course = studentCourses.find((c) => c._id === event.target.value);
    if (!course) return;
    form.contractCourse.value = course.contractName || courseToCyr(course.name);
    if (course.months) form.contractMonths.value = course.months;
    if (course.price) form.contractPrice.value = formatPrice(course.price);
    if (form.course) form.course.value = course.name;
    if (form.courseId) form.courseId.value = course._id;
    paintWords();
    studentDetail.querySelector("#stu-saved").textContent = "";
  });
  const paintWords = () => {
    const price = String(form.contractPrice.value || "").replace(/\D/g, "");
    const months = String(form.contractMonths.value || "").replace(/\D/g, "");
    const parts = [];
    if (price) parts.push(`${formatPrice(price)} (${numberToUzWords(price)}) сўм`);
    if (months) parts.push(`${months} (${numberToUzWords(months)}) ой`);
    studentDetail.querySelector("#stu-words").textContent = parts.length
      ? `Shartnomada shunday yoziladi: ${parts.join(" · ")}`
      : "Summa va muddatni yozing — shartnomaga so‘z bilan avtomatik tushadi.";
  };
  paintWords();
  form.contractPrice.addEventListener("input", () => {
    const digits = form.contractPrice.value.replace(/\D/g, "").slice(0, 13);
    form.contractPrice.value = formatPrice(digits);
    paintWords();
  });
  form.contractMonths.addEventListener("input", () => {
    form.contractMonths.value = form.contractMonths.value.replace(/\D/g, "").slice(0, 3);
    paintWords();
  });
  const dateButton = studentDetail.querySelector("#stu-date");
  dateButton?.addEventListener("click", () => {
    openDateTimePicker(dateButton, form.contractDate.value, {
      withTime: false,
      onPick(next) {
        form.contractDate.value = next || todayIso();
        dateButton.textContent = uzContractDate(form.contractDate.value);
        studentDetail.querySelector("#stu-saved").textContent = "";
      },
    });
  });
  const paintSwitch = () => {
    studentDetail.querySelector(".stu-contract").classList.toggle("no-translit", !form.transliterate.checked);
    paintCyrHints();
  };
  form.transliterate.addEventListener("change", paintSwitch);
  paintSwitch();
  async function saveStudentForm() {
    const body = Object.fromEntries(new FormData(form));
    body.transliterate = form.transliterate.checked;
    const res = await fetch(`/api/student-contracts/${encodeURIComponent(item._id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Saqlanmadi");
      return null;
    }
    const data = await res.json();
    const index = studentItems.findIndex((entry) => entry._id === item._id);
    if (index >= 0) studentItems[index] = data.item;
    Object.assign(item, data.item);
    studentDetail.querySelector("#stu-saved").textContent = "✓ Saqlandi";
    studentDetail.querySelector(".stu-detail-title h2").textContent = data.item.fullName || "O‘quvchi";
    return data.item;
  }
  studentDetail.querySelector("#stu-make").addEventListener("click", async () => {
    const data = editable ? await saveStudentForm() : item;
    if (!data) return;
    const missing = [
      ["contractCourse", "kurs"],
      ["contractMonths", "muddat"],
      ["contractPrice", "summa"],
    ].filter(([key]) => !String(data[key] || "").trim()).map(([, label]) => label);
    if (missing.length && !confirm(`Shartnomada ${missing.join(", ")} yozilmagan — bo‘sh chiziq qoladi. Baribir tayyorlansinmi?`)) return;
    const templateId = form.contractTemplateId?.value || data.contractTemplateId || "";
    if (!templateId) {
      saveWordFile(buildStudentContractHtml(data), `oquvchi-${data.contractNumber || data.fullName || ""}`.replace(/[\\/:*?"<>|]+/g, "-"));
      return;
    }
    const res = await fetch(`/api/student-contracts/${encodeURIComponent(item._id)}/render/${encodeURIComponent(templateId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Shartnoma tayyorlanmadi");
      return;
    }
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `shartnoma-oquvchi-${String(data.contractNumber || data.fullName || "").replace(/[\\/:*?"<>|]+/g, "-")}.docx`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
  form.addEventListener("input", () => {
    studentDetail.querySelector("#stu-saved").textContent = "";
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!editable) return;
    await saveStudentForm();
  });

  studentDetail.querySelector("#stu-delete")?.addEventListener("click", async () => {
    if (!confirm(`${item.fullName || "Bu o‘quvchi"} shartnomasi butunlay o‘chirilsinmi? Qaytarib bo‘lmaydi.`)) return;
    const res = await fetch(`/api/student-contracts/${encodeURIComponent(item._id)}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "O‘chirilmadi");
      return;
    }
    studentItems = studentItems.filter((entry) => entry._id !== item._id);
    setStudentBadge(studentItems);
    showStudentList();
  });
}

function fileSize(bytes) {
  const n = Number(bytes) || 0;
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

function renderTemplates() {
  const editable = canChange();
  studentsDialog.querySelector(".arc-head").classList.add("hidden");
  studentList.classList.add("hidden");
  studentDetail.classList.remove("hidden");
  const cards = contractTemplates.length
    ? contractTemplates.map((tpl) => `
      <article class="tpl-card">
        <span class="tpl-card-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg></span>
        <div class="tpl-card-main">
          <h3>${esc(tpl.name)}</h3>
          <p class="muted">${esc(tpl.fileName)} · ${fileSize(tpl.size)} · ${esc(formatDate(tpl.createdAt) || "")}${tpl.createdBy ? ` · ${esc(tpl.createdBy)}` : ""}</p>
          <div class="tpl-tags">
            ${(tpl.tags || []).map((tag) => `<code class="ok">{${esc(tag)}}</code>`).join("") || `<span class="tpl-warn">Ichida birorta ham belgi topilmadi — shartnoma o‘zgarmay chiqadi</span>`}
            ${(tpl.unknownTags || []).map((tag) => `<code class="bad" title="Noma’lum belgi — bo‘sh chiziq bo‘lib chiqadi">{${esc(tag)}}</code>`).join("")}
          </div>
        </div>
        <div class="tpl-card-actions">
          <a class="arc-btn tpl-dl" href="/api/contract-templates/${esc(tpl._id)}/file"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v10M8 10l4 4 4-4M5 19h14"/></svg>Yuklab olish</a>
          ${editable ? `<button type="button" class="arc-btn purge" data-tpl-delete="${esc(tpl._id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg>O‘chirish</button>` : ""}
        </div>
      </article>`).join("")
    : `<div class="empty tpl-empty"><strong>Hali shablon yuklanmagan</strong><p>Hozircha «Standart — Шартнома кингс» ishlatiladi. Pastdagi namunani yuklab, o‘zgartirib, qayta yuklang.</p></div>`;
  const tags = templateTags.map(([tag, label, sample]) => `
    <button type="button" class="tpl-tag" data-copy="{${esc(tag)}}" title="Nusxa olish">
      <code>{${esc(tag)}}</code><span>${esc(label)}</span><em>${esc(sample)}</em>
    </button>`).join("");
  studentDetail.innerHTML = `
    <div class="stu-detail-head">
      <button type="button" class="arc-back" id="tpl-back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6"/></svg>Ro‘yxatga qaytish</button>
      <div class="stu-detail-title">
        <span class="dialog-ico stu-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg></span>
        <div>
          <p class="eyebrow">O‘quvchilar shartnomasi</p>
          <h2>Shartnoma shablonlari</h2>
          <p class="muted">O‘z Word shartnomangizni yuklang — ichidagi belgilar o‘quvchi ma’lumoti bilan to‘ldiriladi</p>
        </div>
      </div>
    </div>
    <section class="tpl-how">
      <ol>
        <li><b>Namunani yuklab oling</b> yoki o‘z Word (.docx) shartnomangizni oching.</li>
        <li>O‘zgaradigan joylarga pastdagi belgilarni yozing, masalan <code>{FISH}</code>, <code>{SUMMA} ({SUMMA_SOZ}) сўм</code>. Belgini bosing — nusxa olinadi.</li>
        <li>Faylni <b>.docx</b> qilib saqlang va shu yerga yuklang. Keyin o‘quvchi kartasida «Shablon» dan tanlab, «Shartnomani tayyorlash» ni bosing.</li>
      </ol>
      <a class="arc-btn tpl-example" href="/api/contract-templates/example"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v10M8 10l4 4 4-4M5 19h14"/></svg>Namuna shablon (Шартнома кингс)</a>
    </section>
    ${editable ? `
    <form class="tpl-upload" id="tpl-upload">
      <label class="stu-field">
        <span>Shablon nomi</span>
        <input name="name" placeholder="Masalan: Ingliz tili — 3 oylik" maxlength="120" />
      </label>
      <label class="stu-field tpl-file">
        <span>Word fayl (.docx)</span>
        <input name="file" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required />
      </label>
      <button type="submit" class="stu-make tpl-submit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V6M8 10l4-4 4 4M5 19h14"/></svg>Yuklash</button>
      <p class="tpl-msg" id="tpl-msg"></p>
    </form>` : ""}
    <section class="tpl-list">${cards}</section>
    <section class="tpl-legend">
      <h3>Belgilar <span class="muted">— bosing, nusxa olinadi</span></h3>
      <div class="tpl-legend-grid">${tags}</div>
    </section>`;
  studentDetail.querySelector("#tpl-back").addEventListener("click", showStudentList);
  studentDetail.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.classList.add("copied");
      setTimeout(() => button.classList.remove("copied"), 900);
    } catch { /* nusxa olinmasa ham belgi ko‘rinib turadi */ }
  }));
  studentDetail.querySelectorAll("[data-tpl-delete]").forEach((button) => button.addEventListener("click", async () => {
    const tpl = contractTemplates.find((entry) => entry._id === button.dataset.tplDelete);
    if (!confirm(`«${tpl?.name || "Shablon"}» o‘chirilsinmi? Bu shablonni tanlagan o‘quvchilarda standart shartnoma ishlatiladi.`)) return;
    const res = await fetch(`/api/contract-templates/${encodeURIComponent(button.dataset.tplDelete)}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "O‘chirilmadi");
      return;
    }
    await loadContractTemplates();
    renderTemplates();
  }));
  studentDetail.querySelector("#tpl-upload")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formEl = event.target;
    const file = formEl.file.files?.[0];
    const msg = studentDetail.querySelector("#tpl-msg");
    if (!file) return;
    if (!/\.docx$/i.test(file.name)) {
      msg.textContent = "Faqat .docx fayl. Word’da «Сохранить как» → «Документ Word (.docx)» qilib saqlang.";
      msg.className = "tpl-msg bad";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      msg.textContent = "Fayl 5 MB dan katta bo‘lmasin.";
      msg.className = "tpl-msg bad";
      return;
    }
    msg.textContent = "Yuklanmoqda...";
    msg.className = "tpl-msg";
    const res = await fetch("/api/contract-templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
        "X-Template-Name": encodeURIComponent(formEl.name.value.trim()),
      },
      body: file,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      msg.textContent = data.error || "Yuklanmadi";
      msg.className = "tpl-msg bad";
      return;
    }
    await loadContractTemplates();
    renderTemplates();
    const fresh = studentDetail.querySelector("#tpl-msg");
    if (fresh) {
      const unknown = data.item?.unknownTags || [];
      fresh.textContent = `✓ «${data.item?.name}» yuklandi — ${data.item?.tags?.length || 0} ta belgi topildi${unknown.length ? `, noma’lum: ${unknown.map((t) => `{${t}}`).join(", ")}` : ""}.`;
      fresh.className = `tpl-msg ${unknown.length ? "warn" : "ok"}`;
    }
  });
}

// ============ Kurslar: botda tugma, narxi va muddati shartnomaga ============
function courseRowHtml(course, editable) {
  return `
    <article class="course-row${course.active ? "" : " off"}" data-course="${esc(course._id)}">
      <div class="course-main">
        <h3>${esc(course.name)}${course.active ? "" : ` <em class="course-off">botda yashirin</em>`}</h3>
        <p class="muted">Shartnomada: «${esc(course.contractName || courseToCyr(course.name))}»</p>
      </div>
      <div class="course-num"><span>Muddati</span><b>${course.months ? `${esc(course.months)} oy` : "—"}</b></div>
      <div class="course-num"><span>Umumiy summa</span><b>${course.price ? `${esc(formatPrice(course.price))} so‘m` : "—"}</b></div>
      ${editable ? `
      <div class="course-actions">
        <button type="button" class="ghost" data-course-edit="${esc(course._id)}">Tahrirlash</button>
        <button type="button" class="arc-btn purge" data-course-del="${esc(course._id)}" title="O‘chirish" aria-label="O‘chirish"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg></button>
      </div>` : ""}
    </article>`;
}

function courseFormHtml(course = {}) {
  return `
    <form class="course-form" data-course-form="${esc(course._id || "")}">
      <label class="stu-field">
        <span>Kurs nomi (botda shunday ko‘rinadi)</span>
        <input name="name" value="${esc(course.name || "")}" placeholder="Ingliz tili" maxlength="80" required />
      </label>
      <label class="stu-field">
        <span>Shartnomadagi nomi (kirillda)</span>
        <input name="contractName" value="${esc(course.contractName || "")}" placeholder="Инглиз тили" maxlength="120" />
      </label>
      <label class="stu-field">
        <span>Muddati (oy)</span>
        <input name="months" inputmode="numeric" value="${esc(course.months || "")}" placeholder="3" maxlength="3" />
      </label>
      <label class="stu-field">
        <span>Umumiy summa (so‘m)</span>
        <input name="price" inputmode="numeric" value="${esc(formatPrice(course.price || ""))}" placeholder="1 800 000" />
      </label>
      <label class="course-active"><input type="checkbox" name="active" ${course.active === false ? "" : "checked"} /> Botda ko‘rinsin</label>
      <p class="course-words" data-course-words></p>
      <div class="course-form-actions">
        ${course._id ? `<button type="button" class="ghost" data-course-cancel>Bekor</button>` : ""}
        <button type="submit" class="stu-make">${course._id ? "Saqlash" : "Kurs qo‘shish"}</button>
      </div>
    </form>`;
}

function wireCourseForm(formEl) {
  const words = formEl.querySelector("[data-course-words]");
  const paint = () => {
    const price = formEl.price.value.replace(/\D/g, "");
    const months = formEl.months.value.replace(/\D/g, "");
    words.textContent = price || months
      ? `Shartnomada: ${months ? `${months} (${numberToUzWords(months)}) ой` : "— ой"} · ${price ? `${formatPrice(price)} (${numberToUzWords(price)}) сўм` : "— сўм"}`
      : "";
  };
  formEl.name.addEventListener("input", () => {
    if (!formEl.contractName.dataset.touched) formEl.contractName.placeholder = courseToCyr(formEl.name.value) || "Инглиз тили";
  });
  formEl.contractName.addEventListener("input", () => { formEl.contractName.dataset.touched = "1"; });
  formEl.price.addEventListener("input", () => {
    const digits = formEl.price.value.replace(/\D/g, "").slice(0, 13);
    formEl.price.value = digits ? formatPrice(digits) : "";
    paint();
  });
  formEl.months.addEventListener("input", () => {
    formEl.months.value = formEl.months.value.replace(/\D/g, "").slice(0, 3);
    paint();
  });
  paint();
  formEl.querySelector("[data-course-cancel]")?.addEventListener("click", renderCourses);
  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = formEl.dataset.courseForm;
    const body = {
      name: formEl.name.value.trim(),
      contractName: formEl.contractName.value.trim() || courseToCyr(formEl.name.value.trim()),
      months: formEl.months.value,
      price: formEl.price.value,
      active: formEl.active.checked,
    };
    const res = await fetch(id ? `/api/student-courses/${encodeURIComponent(id)}` : "/api/student-courses", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || "Saqlanmadi");
    await loadStudentCourses();
    renderCourses();
  });
}

function renderCourses() {
  const editable = canChange();
  studentsDialog.querySelector(".arc-head").classList.add("hidden");
  studentList.classList.add("hidden");
  studentDetail.classList.remove("hidden");
  studentDetail.innerHTML = `
    <div class="stu-detail-head">
      <button type="button" class="arc-back" id="course-back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6"/></svg>Ro‘yxatga qaytish</button>
      <div class="stu-detail-title">
        <span class="dialog-ico stu-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/></svg></span>
        <div>
          <p class="eyebrow">O‘quvchilar shartnomasi</p>
          <h2>Kurslar <span class="badge">${studentCourses.length} ta</span></h2>
          <p class="muted">Bu kurslar botda tugma bo‘lib chiqadi. O‘quvchi tanlasa, summa va muddat shartnomaga o‘zi tushadi.</p>
        </div>
      </div>
    </div>
    ${editable ? `<section class="course-new"><h3>Yangi kurs</h3>${courseFormHtml()}</section>` : ""}
    <section class="course-list" id="course-list">
      ${studentCourses.length ? studentCourses.map((c) => courseRowHtml(c, editable)).join("") : `<div class="empty tpl-empty"><strong>Hali kurs qo‘shilmagan</strong><p>Kurs qo‘shmaguningizcha botda o‘quvchi kurs nomini o‘zi yozadi.</p></div>`}
    </section>`;
  studentDetail.querySelector("#course-back").addEventListener("click", showStudentList);
  studentDetail.querySelectorAll("[data-course-form]").forEach(wireCourseForm);
  const list = studentDetail.querySelector("#course-list");
  list.addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-course-edit]");
    if (edit) {
      const course = studentCourses.find((c) => c._id === edit.dataset.courseEdit);
      const row = edit.closest(".course-row");
      row.outerHTML = `<div class="course-row editing">${courseFormHtml(course)}</div>`;
      wireCourseForm(list.querySelector(`[data-course-form="${CSS.escape(course._id)}"]`));
      return;
    }
    const del = event.target.closest("[data-course-del]");
    if (del) {
      const course = studentCourses.find((c) => c._id === del.dataset.courseDel);
      if (!confirm(`«${course?.name || "Kurs"}» o‘chirilsinmi? Botda endi ko‘rinmaydi (avval tuzilgan shartnomalar o‘zgarmaydi).`)) return;
      const res = await fetch(`/api/student-courses/${encodeURIComponent(del.dataset.courseDel)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return alert(data.error || "O‘chirilmadi");
      }
      await loadStudentCourses();
      renderCourses();
    }
  });
}

document.querySelector("#open-courses").addEventListener("click", async () => {
  await loadStudentCourses();
  renderCourses();
});

document.querySelector("#open-templates").addEventListener("click", async () => {
  await loadContractTemplates();
  renderTemplates();
});

studentSearch.addEventListener("input", renderStudents);
studentList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-stu-open]");
  if (card) openStudent(card.dataset.stuOpen);
});
studentList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const card = event.target.closest("[data-stu-open]");
  if (card) openStudent(card.dataset.stuOpen);
});
document.querySelector("#open-students").addEventListener("click", async () => {
  if (detail.open) detail.close();
  studentSearch.value = "";
  showStudentList();
  studentsDialog.showModal();
  await loadStudents();
});
document.querySelector("#close-students").addEventListener("click", () => studentsDialog.close());

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
          if (key === "note") return cell(notesPlainText(item));
          if (key === "score") {
            if (item.assessmentScore != null) return cell(`${item.assessmentScore} / 100`);
            return cell(item.score == null || item.score === "" ? "" : `${item.score} / 10`);
          }
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
  renderSearchResults();
});

// Filtr, qidiruv yoki saralash o'zgarsa — ro'yxat yana boshidan (60 ta) chiziladi
[
  [searchEl, "input"],
  [chipsEl, "click"],
  [statsEl, "click"],
  [document.querySelector("#reset-filters"), "click"],
  [sortEl, "change"],
  [statusEl, "change"],
  [dateFromEl, "change"],
  [dateToEl, "change"],
  [shiftEl, "change"],
].forEach(([el, type]) => el?.addEventListener(type, resetPaging, true));

// ===== Qidiruv ostidagi natijalar ro'yxati =====
const searchResults = document.querySelector("#search-results");
let searchPicks = [];
let searchActive = -1;

function highlight(text, query) {
  const value = String(text || "");
  const q = query.trim();
  if (!q) return esc(value);
  const at = value.toLowerCase().indexOf(q.toLowerCase());
  if (at < 0) return esc(value);
  return `${esc(value.slice(0, at))}<mark>${esc(value.slice(at, at + q.length))}</mark>${esc(value.slice(at + q.length))}`;
}

function closeSearchResults() {
  searchResults.classList.add("hidden");
  searchEl.setAttribute("aria-expanded", "false");
  searchActive = -1;
}

function renderSearchResults() {
  const query = searchEl.value.trim();
  const byNewest = (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  const found = query ? allItems.filter((item) => matchesQuery(item, query)) : [...allItems];
  searchPicks = found.sort(byNewest).slice(0, 8);
  searchActive = searchPicks.length ? 0 : -1;
  const title = query
    ? `<div class="sr-head"><span>Topildi: <b>${found.length}</b></span>${found.length > searchPicks.length ? `<small>eng yangi ${searchPicks.length} tasi</small>` : ""}</div>`
    : `<div class="sr-head"><span>So‘nggi arizalar</span><small>yozing — qidiradi</small></div>`;
  if (!searchPicks.length) {
    searchResults.innerHTML = `${title}<div class="sr-empty">«${esc(query)}» bo‘yicha ariza topilmadi</div>`;
  } else {
    searchResults.innerHTML = title + searchPicks
      .map((item, index) => {
        const tone = interviewTone(item);
        const person = splitName(item.fullName);
        const initials = [person.surname, person.name].filter((p) => p && p !== "—").map((p) => p.charAt(0).toUpperCase()).join("");
        const photo = item.hasPhoto
          ? `<img class="sr-photo" src="/api/applications/${esc(item._id)}/photo" alt="" loading="lazy" />`
          : `<span class="sr-photo sr-photo-empty tone-${tone}">${esc(initials || "?")}</span>`;
        const phone = formatPhone(item.phone) || formatPhone(item.parentPhone) || "—";
        return `
          <button type="button" class="sr-item${index === searchActive ? " active" : ""}" role="option" data-pick="${esc(item._id)}" data-index="${index}">
            ${photo}
            <span class="sr-main">
              <span class="sr-name">${highlight(item.fullName || "Ariza", query)}${isFresh(item) ? ` <i class="sr-new">Yangi</i>` : ""}</span>
              <span class="sr-sub">
                <span class="sr-role" style="--h:${positionHue(item.position)}">${highlight(item.position || "Yo‘nalishsiz", query)}</span>
                <span class="sr-phone">${highlight(phone, query)}</span>
              </span>
            </span>
            <span class="status-pill tone-${tone}"><i></i>${esc(interviewLabels[tone])}</span>
          </button>`;
      })
      .join("");
  }
  searchResults.classList.remove("hidden");
  searchEl.setAttribute("aria-expanded", "true");
}

function paintSearchActive() {
  searchResults.querySelectorAll(".sr-item").forEach((el) => {
    const on = Number(el.dataset.index) === searchActive;
    el.classList.toggle("active", on);
    if (on) el.scrollIntoView({ block: "nearest" });
  });
}

function pickSearchResult(id) {
  closeSearchResults();
  searchEl.blur();
  openDetail(id);
}

searchEl.addEventListener("focus", renderSearchResults);
searchEl.addEventListener("click", renderSearchResults);
searchEl.addEventListener("keydown", (event) => {
  if (searchResults.classList.contains("hidden")) {
    if (event.key === "ArrowDown") renderSearchResults();
    return;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (!searchPicks.length) return;
    const step = event.key === "ArrowDown" ? 1 : -1;
    searchActive = (searchActive + step + searchPicks.length) % searchPicks.length;
    paintSearchActive();
  } else if (event.key === "Enter") {
    event.preventDefault();
    const pick = searchPicks[searchActive];
    if (pick) pickSearchResult(pick._id);
  } else if (event.key === "Escape") {
    closeSearchResults();
  }
});
// sichqoncha bilan bosilganda input fokusni yo'qotmasidan oldin ushlaymiz
searchResults.addEventListener("mousedown", (event) => event.preventDefault());
searchResults.addEventListener("click", (event) => {
  event.preventDefault();
  const item = event.target.closest("[data-pick]");
  if (item) pickSearchResult(item.dataset.pick);
});
searchResults.addEventListener("mousemove", (event) => {
  const item = event.target.closest("[data-index]");
  if (!item || Number(item.dataset.index) === searchActive) return;
  searchActive = Number(item.dataset.index);
  paintSearchActive();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".search")) closeSearchResults();
});
sortEl.addEventListener("change", () => {
  activeSort = sortEl.value;
  if (activeSort === "all") {
    activePosition = "";
    activeStatus = "";
    dateFromEl.value = "";
    dateToEl.value = "";
    if (shiftEl) shiftEl.value = "";
    syncDateField(dateFromEl);
    syncDateField(dateToEl);
  }
  render();
});
shiftEl?.addEventListener("change", render);
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
chipsEl.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-position]");
  if (!chip) return;
  activePosition = chip.dataset.position;
  render();
});
statsEl.addEventListener("click", (event) => {
  const tile = event.target.closest("[data-status]");
  if (!tile) return;
  const key = tile.dataset.status;
  activeStatus = activeStatus === key ? "" : key;
  render();
});
document.querySelector("#reset-filters").addEventListener("click", () => {
  activePosition = "";
  activeStatus = "";
  activeSort = "newest";
  sortEl.value = "newest";
  searchEl.value = "";
  dateFromEl.value = "";
  dateToEl.value = "";
  if (shiftEl) shiftEl.value = "";
  syncDateField(dateFromEl);
  syncDateField(dateToEl);
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
  const purgeBtn = event.target.closest("[data-purge]");
  if (purgeBtn) {
    event.preventDefault();
    event.stopPropagation();
    purgeFromArchive(purgeBtn.dataset.purge);
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

async function removeRequest(id, url, method) {
  const res = await fetch(url, { method });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    alert(data.error || "Bajarilmadi");
    return false;
  }
  allItems = allItems.filter((entry) => entry._id !== id);
  closeDetailIf(id);
  render();
  if (archiveDialog.open) {
    archiveItems = archiveItems.filter((entry) => entry._id !== id);
    renderArchive();
  }
  return true;
}

async function moveToArchive(id) {
  if (!confirm("Bu ariza arxivga o‘tkazilsinmi? Keyin «Arxiv» bo‘limidan qaytarish mumkin.")) return;
  await removeRequest(id, `/api/applications/${id}`, "DELETE");
}

async function purgeFromArchive(id) {
  if (!confirm("Bu ariza arxivdan butunlay o‘chirilsinmi? Qaytarib bo‘lmaydi.")) return;
  await removeRequest(id, `/api/applications/${id}`, "DELETE");
}

async function takeFromArchive(id) {
  if (!confirm("Bu ariza arxivdan qaytarilsinmi? U yana asosiy ro‘yxatda ko‘rinadi.")) return;
  // qaytarilgan ariza asosiy ro'yxatda paydo bo'lishi uchun ro'yxat qayta yuklanadi
  if (await removeRequest(id, `/api/applications/${id}/restore`, "POST")) await loadApplications();
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

const ICONS = {
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  login: '<path d="M10 17l5-5-5-5M15 12H4M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/>',
  logout: '<path d="M15 5h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3M10 8l-4 4 4 4M6 12h10"/>',
  alert: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/>',
  star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
  restore: '<path d="M4 14v5h16v-5M12 16V4M8 8l4-4 4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
  swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  heart: '<path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.9-2.8 3-4.2 5.5-4.2s4.6 1.4 5.5 4.2M16 5.5a3 3 0 0 1 0 5.6M17.5 14.9c1.6.6 2.6 1.9 3 4.1"/>',
  dot: '<circle cx="12" cy="12" r="3"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.dot}</svg>`;

function nameHue(text) {
  let hash = 0;
  for (const ch of String(text || "")) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}

function initialsOf(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";
}

async function loadStaff() {
  const res = await fetch("/api/staff");
  if (!res.ok) return;
  const data = await res.json();
  const items = data.items || [];
  document.querySelector("#staff-count").textContent = `${items.length} ta`;
  staffList.innerHTML = items
    .map((person) => {
      const full = `${person.surname} ${person.name}`.trim();
      const admin = person.role === "admin";
      const perms = admin
        ? `<span class="perm-chip" style="--pc:#8b5cf6">${icon("star")}Hamma narsa</span>`
        : [
            `<span class="perm-chip" style="--pc:#10b981">${icon("eye")}Ko‘radi</span>`,
            person.canEdit ? `<span class="perm-chip" style="--pc:#f59e0b">${icon("pencil")}O‘zgartiradi</span>` : "",
            person.canDelete ? `<span class="perm-chip" style="--pc:#ef4444">${icon("trash")}O‘chiradi</span>` : "",
          ].join("");
      const me = currentUser?.id === person.id ? `<span class="me-pill">Siz</span>` : "";
      return `
      <div class="staff-card">
        <span class="avatar" style="--h:${nameHue(full)}">${esc(initialsOf(full))}</span>
        <div class="staff-main">
          <div class="staff-name"><strong>${esc(full || person.username)}</strong>${me}</div>
          <div class="staff-meta">
            <span class="role-pill ${admin ? "is-admin" : ""}">${admin ? "Admin" : "Xodim"}</span>
            <span class="muted">@${esc(person.username)}</span>
          </div>
          <div class="perm-chips">${perms}</div>
        </div>
        <div class="staff-actions">
          <button type="button" class="ac-icon" title="Tahrirlash" aria-label="Tahrirlash" data-edit-staff="${esc(person.id)}" data-role="${esc(person.role)}" data-edit="${person.canEdit ? "1" : "0"}" data-remove="${person.canDelete ? "1" : "0"}" data-surname="${esc(person.surname)}" data-name="${esc(person.name)}" data-username="${esc(person.username)}">${icon("pencil")}</button>
          ${admin ? "" : `<button type="button" class="ac-icon ac-delete" title="O‘chirish" aria-label="O‘chirish" data-delete-staff="${esc(person.id)}" data-full="${esc(full)}">${icon("trash")}</button>`}
        </div>
      </div>`;
    })
    .join("") || `<p class="empty">Hozircha xodim yo‘q.</p>`;
}

function syncStaffPerms() {
  const role = staffForm.querySelector('input[name="role"]:checked')?.value;
  document.querySelector("#staff-perms").classList.toggle("hidden", role === "admin");
}
staffForm.addEventListener("change", (event) => {
  if (event.target.name === "role") syncStaffPerms();
});

// Forma ikki holatda: yangi xodim qo'shish yoki mavjudini tahrirlash
function setStaffMode(editingName) {
  const editing = Boolean(editingName);
  document.querySelector("#staff-form-title").textContent = editing ? `Tahrirlash: ${editingName}` : "Yangi xodim qo‘shish";
  document.querySelector("#staff-submit").textContent = editing ? "O‘zgarishlarni saqlash" : "Xodimni qo‘shish";
  document.querySelector("#staff-cancel").classList.toggle("hidden", !editing);
  staffForm.classList.toggle("is-editing", editing);
  const password = staffForm.elements.password;
  password.placeholder = editing ? "O‘zgartirmasangiz bo‘sh qoldiring" : "Kamida 4 ta belgi";
  password.required = !editing;
}

function resetStaffForm() {
  staffForm.reset();
  staffForm.elements.id.value = "";
  staffError.textContent = "";
  setStaffMode("");
  syncStaffPerms();
}

document.querySelector("#staff-cancel").addEventListener("click", resetStaffForm);

document.querySelector("#open-staff").addEventListener("click", async () => {
  document.querySelector(".account").classList.remove("open");
  resetStaffForm();
  await loadStaff();
  staffDialog.showModal();
});
document.querySelector("#close-staff").addEventListener("click", () => staffDialog.close());

const historyDialog = document.querySelector("#history-dialog");
const historyList = document.querySelector("#history-list");

// Harakat turiga qarab ikonka va rang
function historyLook(action) {
  const text = String(action || "").toLowerCase();
  if (text.includes("muvaffaqiyatsiz")) return ["alert", "#ef4444"];
  if (text.includes("tizimga kirdi")) return ["login", "#10b981"];
  if (text.includes("tizimdan chiqdi")) return ["logout", "#94a3b8"];
  if (text.includes("baho")) return ["star", "#f97316"];
  if (text.includes("qaytardi")) return ["restore", "#10b981"];
  if (text.includes("arxiv") || text.includes("o‘chirdi") || text.includes("olib tashladi")) return ["trash", "#ef4444"];
  if (text.includes("hodim") || text.includes("xodim")) return ["users", "#6366f1"];
  if (text.includes("hujjat")) return ["file", "#06b6d4"];
  if (text.includes("import") || text.includes("eksport")) return ["swap", "#8b5cf6"];
  if (text.includes("sevimli")) return ["heart", "#ec4899"];
  if (text.includes("ochdi")) return ["eye", "#3b82f6"];
  if (text.includes("o‘zgartirdi") || text.includes("tahrir")) return ["pencil", "#f59e0b"];
  if (text.includes("qo‘shdi")) return ["plus", "#10b981"];
  return ["dot", "#64748b"];
}

function historyDay(value) {
  const days = daysAgo(value);
  if (days <= 0) return "Bugun";
  if (days === 1) return "Kecha";
  const label = String(formatDate(value)).split(",")[0];
  return label || "Sanasiz";
}

async function loadHistory() {
  const res = await fetch("/api/activity");
  if (!res.ok) return;
  const data = await res.json();
  const items = data.items || [];
  if (!items.length) {
    historyList.innerHTML = `<p class="empty">Hozircha harakat yo‘q.</p>`;
    return;
  }
  let lastDay = "";
  historyList.innerHTML = items
    .map((item) => {
      const day = historyDay(item.at);
      const head = day !== lastDay ? `<h3 class="history-day">${esc(day)}</h3>` : "";
      lastDay = day;
      const [kind, color] = historyLook(item.action);
      const time = String(formatDate(item.at)).split(", ")[1] || "";
      return `${head}
        <article class="history-row" style="--hc:${color}">
          <span class="history-ico">${icon(kind)}</span>
          <div class="history-body">
            <div class="history-top">
              <strong>${esc(item.action)}</strong>
              <time>${esc(time)}</time>
            </div>
            <p class="history-who"><span class="avatar xs" style="--h:${nameHue(item.actorName)}">${esc(initialsOf(item.actorName))}</span>${esc(item.actorName || "Noma’lum")}</p>
            ${item.detail ? `<p class="history-detail">${esc(item.detail)}</p>` : ""}
          </div>
        </article>`;
    })
    .join("");
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
  body.canEdit = Boolean(staffForm.elements.canEdit.checked);
  body.canDelete = Boolean(staffForm.elements.canDelete.checked);
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
  resetStaffForm();
  await loadStaff();
});

staffList.addEventListener("click", async (event) => {
  const edit = event.target.closest("[data-edit-staff]");
  if (edit) {
    staffForm.elements.id.value = edit.dataset.editStaff;
    staffForm.elements.surname.value = edit.dataset.surname;
    staffForm.elements.name.value = edit.dataset.name;
    staffForm.elements.username.value = edit.dataset.username;
    staffForm.elements.role.value = edit.dataset.role === "admin" ? "admin" : "staff";
    staffForm.elements.canEdit.checked = edit.dataset.edit === "1";
    staffForm.elements.canDelete.checked = edit.dataset.remove === "1";
    staffForm.elements.password.value = "";
    staffError.textContent = "";
    setStaffMode(`${edit.dataset.surname} ${edit.dataset.name}`.trim());
    syncStaffPerms();
    staffForm.scrollIntoView({ behavior: "smooth", block: "start" });
    staffForm.elements.surname.focus();
    return;
  }
  const remove = event.target.closest("[data-delete-staff]");
  if (!remove) return;
  if (!confirm(`${remove.dataset.full || "Bu xodim"} o‘chirilsinmi? U endi panelga kira olmaydi.`)) return;
  const res = await fetch(`/api/staff/${remove.dataset.deleteStaff}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    alert(data.error || "O‘chirilmadi");
    return;
  }
  await loadStaff();
});

document.querySelectorAll(".theme-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("qabul-theme", next); } catch { /* xotira yopiq bo'lsa ham ishlayveradi */ }
  });
});

// ===== Brend: logo va nom (hamma joyda bir xil, admin o'zgartiradi) =====
let branding = { name: "Qabul paneli", hasLogo: false, updatedAt: null };

function brandLogoUrl() {
  return `/api/branding/logo?v=${encodeURIComponent(branding.updatedAt || "1")}`;
}

function paintBrandMarks(root = document) {
  root.querySelectorAll("[data-brand-mark]").forEach((mark) => {
    const img = mark.querySelector(".brand-logo");
    const letter = mark.querySelector(".brand-letter");
    letter.textContent = (branding.name || "Q").trim().charAt(0).toUpperCase() || "Q";
    mark.classList.toggle("has-logo", branding.hasLogo);
    img.classList.toggle("hidden", !branding.hasLogo);
    if (branding.hasLogo) img.src = brandLogoUrl();
    else img.removeAttribute("src");
  });
}

function applyBranding() {
  document.querySelectorAll("[data-brand-name]").forEach((el) => { el.textContent = branding.name; });
  document.querySelectorAll("[data-brand-preview-name]").forEach((el) => { el.textContent = branding.name; });
  paintBrandMarks();
  document.title = branding.name;
  document.querySelector("#favicon")?.setAttribute("href", branding.hasLogo ? brandLogoUrl() : "data:,");
}

async function loadBranding() {
  try {
    const res = await fetch("/api/branding");
    if (res.ok) branding = await res.json();
  } catch { /* brend yuklanmasa standart nom qoladi */ }
  applyBranding();
}

const brandingDialog = document.querySelector("#branding-dialog");
const brandForm = document.querySelector("#brand-form");
const brandNameInput = brandForm.elements.name;
const logoStatus = document.querySelector("#logo-status");

function paintBrandingDialog() {
  const current = document.querySelector("#logo-current");
  current.classList.toggle("hidden", !branding.hasLogo);
  document.querySelector("#logo-empty").classList.toggle("hidden", branding.hasLogo);
  document.querySelector("#logo-remove").classList.toggle("hidden", !branding.hasLogo);
  if (branding.hasLogo) current.src = brandLogoUrl();
  document.querySelector("#brand-count").textContent = `${brandNameInput.value.length}/40`;
}

document.querySelector("#open-branding").addEventListener("click", () => {
  document.querySelector(".account").classList.remove("open");
  brandNameInput.value = branding.name;
  document.querySelector("#brand-error").textContent = "";
  logoStatus.textContent = "";
  paintBrandingDialog();
  brandingDialog.showModal();
});
document.querySelector("#close-branding").addEventListener("click", () => brandingDialog.close());

// nom yozilayotganda ko'rinish darhol yangilanadi
brandNameInput.addEventListener("input", () => {
  const preview = brandNameInput.value.trim() || "Qabul paneli";
  document.querySelectorAll("[data-brand-preview-name]").forEach((el) => { el.textContent = preview; });
  const letter = brandingDialog.querySelector(".brand-preview .brand-letter");
  if (letter) letter.textContent = preview.charAt(0).toUpperCase();
  document.querySelector("#brand-count").textContent = `${brandNameInput.value.length}/40`;
});

brandForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = document.querySelector("#brand-save");
  button.disabled = true;
  const res = await fetch("/api/branding", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: brandNameInput.value }),
  });
  button.disabled = false;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    document.querySelector("#brand-error").textContent = data.error || "Saqlanmadi";
    return;
  }
  branding = data;
  brandNameInput.value = branding.name;
  applyBranding();
  button.textContent = "Saqlandi ✓";
  setTimeout(() => { button.textContent = "Nomni saqlash"; }, 1500);
});

document.querySelector("#logo-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    logoStatus.textContent = "Faqat PNG, JPG yoki WEBP rasm.";
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    logoStatus.textContent = "Rasm 2 MB dan katta bo‘lmasin.";
    return;
  }
  logoStatus.textContent = "Yuklanmoqda...";
  const res = await fetch("/api/branding/logo", { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    logoStatus.textContent = data.error || "Logo saqlanmadi";
    return;
  }
  branding = data;
  applyBranding();
  paintBrandingDialog();
  logoStatus.textContent = "Logo saqlandi ✓";
});

document.querySelector("#logo-remove").addEventListener("click", async () => {
  if (!confirm("Logo olib tashlansinmi? O‘rniga nomning birinchi harfi chiqadi.")) return;
  const res = await fetch("/api/branding/logo", { method: "DELETE" });
  if (!res.ok) return;
  branding = await res.json();
  applyBranding();
  paintBrandingDialog();
  logoStatus.textContent = "Logo olib tashlandi";
});

await loadBranding();

const me = await fetch("/api/me");
const session = await me.json();
if (session.ok) {
  currentUser = session.user;
  showApp();
  await loadApplications();
} else {
  showLogin();
}
