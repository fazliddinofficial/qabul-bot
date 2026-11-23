// ID karta / pasport rasmidan ma'lumotlarni o'qish (serverning o'zida, tashqi xizmatsiz).
// Faqat tekshiruvdan o'tgan qiymatlar qaytariladi — shubhalisi o'quvchidan so'raladi.
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { createWorker } from "tesseract.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
let workerPromise = null;
let queue = Promise.resolve();

function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("eng", 1, { cachePath: path.join(ROOT, ".ocr-cache") }).catch((error) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

// Bir vaqtda bitta o'qish — server qotib qolmasin
function serial(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function prepare(buffer) {
  const img = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  const width = meta.width && meta.width < 1600 ? 1800 : Math.min(meta.width || 1800, 2400);
  return img.resize({ width }).grayscale().normalize().sharpen().png().toBuffer();
}

async function recognize(buffer, { mrzOnly = false, width = 1400, threshold = 0 } = {}) {
  const worker = await getWorker();
  await worker.setParameters(
    mrzOnly
      ? { tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<", tessedit_pageseg_mode: "6" }
      : { tessedit_char_whitelist: "", tessedit_pageseg_mode: "3" },
  );
  let image = buffer;
  if (mrzOnly) {
    // MRZ — pastki qism: kesib, kattalashtirib, oq-qora qilamiz (OCR-B shrifti aniqroq o'qiladi)
    const meta = await sharp(buffer).metadata();
    const top = Math.round(meta.height * 0.55);
    let crop = sharp(buffer).extract({ left: 0, top, width: meta.width, height: meta.height - top }).resize({ width }).grayscale().normalize();
    if (threshold) crop = crop.threshold(threshold);
    image = await crop.png().toBuffer();
  }
  const { data } = await worker.recognize(image);
  return String(data.text || "");
}

// ---------- MRZ ----------
const TO_DIGIT = { O: "0", Q: "0", D: "0", U: "0", I: "1", L: "1", T: "1", Z: "2", S: "5", B: "8", G: "6", A: "4" };
const TO_LETTER = { 0: "O", 1: "I", 2: "Z", 5: "S", 8: "B", 6: "G", 4: "A" };
const digits = (s) => [...s].map((c) => TO_DIGIT[c] ?? c).join("");
const letters = (s) => [...s].map((c) => TO_LETTER[c] ?? c).join("");

function checkDigit(value) {
  const weights = [7, 3, 1];
  let sum = 0;
  [...value].forEach((ch, i) => {
    let v = 0;
    if (/[0-9]/.test(ch)) v = Number(ch);
    else if (/[A-Z]/.test(ch)) v = ch.charCodeAt(0) - 55;
    sum += v * weights[i % 3];
  });
  return String(sum % 10);
}

function mrzLines(text) {
  return String(text || "")
    .toUpperCase()
    .split(/\r?\n/)
    .map((line) => line.replace(/[«‹(\[{]/g, "<").replace(/\s+/g, "").replace(/[^A-Z0-9<]/g, ""))
    // MRZ qatori odatda "<" bilan to'ldiriladi; pasportning 2-qatori esa to'liq bo'lishi mumkin (44 belgi, "<" siz)
    .filter((line) => (line.length >= 26 && line.includes("<")) || line.length >= 40);
}

function yymmddToDate(yymmdd, past = true) {
  if (!/^\d{6}$/.test(yymmdd)) return "";
  const yy = Number(yymmdd.slice(0, 2));
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return "";
  const nowYY = new Date().getFullYear() % 100;
  const year = past ? (yy > nowYY ? 1900 + yy : 2000 + yy) : 2000 + yy;
  return `${dd}.${mm}.${year}`;
}

function cleanSeries(raw) {
  const s = String(raw || "").replace(/</g, "");
  if (s.length < 9) return "";
  const fixed = letters(s.slice(0, 2)) + digits(s.slice(2, 9));
  return /^[A-Z]{2}\d{7}$/.test(fixed) ? fixed : "";
}

function namesFromMrz(line) {
  const clean = line.replace(/[KL]{3,}$/g, (m) => "<".repeat(m.length)).replace(/<[KL](?=<)/g, "<<");
  const [surname, given = ""] = clean.split(/<<+/);
  const tidy = (s) => s.replace(/[<KL]+$/g, "").replace(/</g, " ").replace(/[^A-Z ]/g, "").trim();
  return { surname: tidy(surname || ""), given: tidy(given).split(" ")[0] || "" };
}

function parseTd1(lines) {
  const i1 = lines.findIndex((l) => /^[IAC][A-Z0-9<][U0][Z2][B8]/.test(l));
  if (i1 < 0) return {};
  const l1 = lines[i1];
  const l2 = lines[i1 + 1] || "";
  const l3 = lines[i1 + 2] || "";
  const out = {};
  const docRaw = l1.slice(5, 14);
  const doc = cleanSeries(docRaw);
  if (doc && checkDigit(doc) === digits(l1[14] || "")) out.series = doc;
  const pin = digits(l1.slice(15, 30)).match(/\d{14}/)?.[0];
  if (pin) out.pinflMrz = pin;
  const dobRaw = digits(l2.slice(0, 6));
  if (/^\d{6}$/.test(dobRaw) && checkDigit(dobRaw) === digits(l2[6] || "")) out.birthday = yymmddToDate(dobRaw);
  if (l3) Object.assign(out, namesFromMrz(l3));
  return out;
}

function parseTd3(lines) {
  // 1-qator: "P<UZB..." — boshidagi P yoki < xato o'qilsa ham "UZB" bo'yicha topamiz
  let i1 = lines.findIndex((l) => /^[PBR][A-Z0-9<][U0][Z2][B8]/.test(l));
  if (i1 < 0) i1 = lines.findIndex((l) => l.length >= 30 && /^.{0,3}[U0][Z2][B8]/.test(l));
  if (i1 < 0) return {};
  const at = lines[i1].search(/[U0][Z2][B8]/);
  const l1 = `P<${lines[i1].slice(at)}`;
  const l2 = lines.slice(i1 + 1).find((l) => l.length >= 40) || "";
  const out = { ...namesFromMrz(l1.slice(5)) };
  const doc = cleanSeries(l2.slice(0, 9));
  if (doc && checkDigit(doc) === digits(l2[9] || "")) out.series = doc;
  const dobRaw = digits(l2.slice(13, 19));
  if (/^\d{6}$/.test(dobRaw) && checkDigit(dobRaw) === digits(l2[19] || "")) out.birthday = yymmddToDate(dobRaw);
  const pin = digits(l2.slice(28, 42));
  if (/^\d{14}$/.test(pin) && checkDigit(pin) === digits(l2[42] || "")) out.pinflMrz = pin;
  else if (/^\d{14}$/.test(pin)) out.pinflMrzWeak = pin;
  return out;
}

// ---------- oddiy matn ----------
const NAME_LINE = /^[A-ZʻʼʼО'‘’` -]{2,}$/;

// Ismlarda raqam bo'lmaydi: OCR adashtirgan raqamlarni harfga qaytaramiz (Q1Z1 → QIZI)
function nameish(line) {
  return String(line || "").replace(/[1|!]/g, "I").replace(/0/g, "O").replace(/5/g, "S").replace(/8/g, "B").replace(/4/g, "A");
}

const LABEL_WORDS = /SURNAME|GIVEN|NAME|PATRONYMIC|FAMILIYA|ISMI|OTASINING|DATE|SANA/;
const VALUE_RE = /[A-ZʻʼО'‘’`]{2,}(?:[ -][A-ZʻʼО'‘’`]{2,})*/;

function labelValue(rawLines, labelRe) {
  for (let i = 0; i < rawLines.length; i += 1) {
    const line = rawLines[i];
    const m = line.match(labelRe);
    if (!m) continue;
    // Qiymat yorliq bilan bir qatorda (katta harflarda) bo'lishi mumkin
    const rest = nameish(line.slice(m.index + m[0].length)).replace(/^[\s/:.-]+/, "").trim();
    const restUpper = rest.match(VALUE_RE)?.[0];
    if (restUpper && restUpper.length >= 3 && !LABEL_WORDS.test(restUpper)) return restUpper;
    // …yoki keyingi qatorda. Ismlar katta harfda bosiladi — OCR kichik o'qisa ham kattalashtiramiz (QiZI → QIZI)
    for (let j = i + 1; j < Math.min(rawLines.length, i + 3); j += 1) {
      const next = nameish(rawLines[j]).toUpperCase().trim();
      if (LABEL_WORDS.test(next)) break;
      const upper = next.match(VALUE_RE)?.[0];
      if (upper && NAME_LINE.test(upper)) return upper;
    }
  }
  return "";
}

// Otasining ismi oxiri yopiq ro'yxat: OCR xatolarini to'g'rilaymiz (QIZL, QIZZI → qizi; OGLI, 0G'LI → o'g'li)
function suffixFix(word) {
  if (/^q[il1]?z+[il1]{1,2}$/i.test(word)) return "qizi";
  if (/^[ou0]?'?g'?l[il1]$/i.test(word)) return "o'g'li";
  return "";
}

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[ʻʼ‘’`]/g, "'")
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i, all) => {
      const fixed = i === all.length - 1 && all.length > 1 ? suffixFix(w) : "";
      return fixed || w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function datesIn(text) {
  return [...String(text || "").matchAll(/\b(0[1-9]|[12]\d|3[01])[.\/,-](0[1-9]|1[0-2])[.\/,-]((?:19|20)\d{2})\b/g)].map((m) => `${m[1]}.${m[2]}.${m[3]}`);
}
const dateKey = (d) => d.split(".").reverse().join("");

function issuerIn(text) {
  const m = String(text || "").toUpperCase().match(/\b[I1L]?[I1L]\s?([VB])\s*[-:№]?\s*(\d{3,6})\b/);
  return m ? `II${m[1]} ${m[2]}` : "";
}

function pinflIn(text) {
  const m = String(text || "").replace(/(\d)\s+(?=\d)/g, "$1").match(/\b[3-6]\d{13}\b/);
  return m ? m[0] : "";
}

// JSHSHIR'ning 2–7-raqamlari = tug'ilgan sana (KKOOYY)
function pinflMatchesBirthday(pin, birthday) {
  if (!pin || !birthday) return false;
  const [dd, mm, yyyy] = birthday.split(".");
  return pin.slice(1, 7) === `${dd}${mm}${yyyy.slice(2)}`;
}

/**
 * files: { front, back } — Buffer (ID karta: old + orqa; pasport: rasmli sahifa = front)
 * Qaytadi: { fullName?, surname?, given?, patronymic?, birthday?, passportSeries?, passportIssued?, passportIssuer?, jshshir? }
 */
export async function readDocument({ docType, front, back }) {
  return serial(async () => {
    const out = {};
    const texts = [];
    let mrz = {};
    const main = docType === "passport" ? front : back;
    if (main) {
      const img = await prepare(main);
      const full = await recognize(img);
      texts.push(full);
      // MRZ ni ikki xil sozlamada o'qiymiz; har bir maydon tekshiruv raqami bilan tasdiqlanadi, natijalar birlashtiriladi
      const zones = [
        await recognize(img, { mrzOnly: true, width: 1400 }),
        await recognize(img, { mrzOnly: true, width: 1000, threshold: 140 }),
        full,
      ];
      const parse = docType === "passport" ? parseTd3 : parseTd1;
      for (const zone of zones) {
        const found = parse(mrzLines(zone));
        for (const [key, value] of Object.entries(found)) if (value && !mrz[key]) mrz[key] = value;
      }
      if (process.env.OCR_DEBUG) console.error("[ocr] zones:", JSON.stringify(zones.slice(0, 2)));
    }
    let frontText = docType === "passport" ? texts[0] || "" : "";
    if (docType !== "passport" && front) {
      frontText = await recognize(await prepare(front));
      texts.push(frontText);
    }
    const allText = texts.join("\n");
    const frontLines = frontText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (process.env.OCR_DEBUG) console.error("[ocr] front:", JSON.stringify(frontLines), "\n[ocr] mrz:", JSON.stringify(mrz));

    // Ism-familiya: old tomondagi yozuv (apostrof bilan), MRZ bilan solishtiriladi
    const surFront = labelValue(frontLines, /(familiya\w*|surname)/i);
    const givenFront = labelValue(frontLines, /(ismi|given\s*name)/i);
    let patronymic = labelValue(frontLines, /(otasining\s*ismi|patronymic)/i);
    if (!patronymic) patronymic = frontLines.map((l) => l.toUpperCase()).find((l) => /\b(QIZI|O['‘’ʻ`]?G['‘’ʻ`]?LI|UGLI)\b/.test(l)) || "";
    // Old tomondagi qalin yozuv aniqroq (apostrof ham bor); MRZ — faqat old tomonda topilmasa
    const surname = surFront || mrz.surname || "";
    const given = givenFront || mrz.given || "";
    if (surname) out.surname = titleCase(surname);
    if (given) out.given = titleCase(given);
    // Yorliq yonidan topilgan otasining ismi har qanday ko'rinishda bo'lishi mumkin: BOBUR QIZI, ALIYEVICH
    const patronymicClean = patronymic.replace(/[^A-ZʻʼО'‘’` ]/gi, " ").replace(/\s+/g, " ").trim();
    if (patronymicClean.length >= 3) out.patronymic = titleCase(patronymicClean);
    if (out.surname && out.given && out.patronymic) out.fullName = `${out.surname} ${out.given} ${out.patronymic}`;

    if (mrz.series) out.passportSeries = mrz.series;
    if (mrz.birthday) out.birthday = mrz.birthday;

    // JSHSHIR: MRZ va matndagi bilan mos kelsa yoki tug'ilgan sana bilan tasdiqlansa
    const pinText = pinflIn(allText);
    const candidates = [mrz.pinflMrz, pinText, mrz.pinflMrzWeak].filter(Boolean);
    const pin =
      candidates.find((p) => pinflMatchesBirthday(p, out.birthday)) ||
      (mrz.pinflMrz && pinText && mrz.pinflMrz === pinText ? pinText : "");
    if (pin) out.jshshir = pin;
    if (!out.birthday && pin) {
      const dd = pin.slice(1, 3);
      const mm = pin.slice(3, 5);
      const yy = pin.slice(5, 7);
      const century = { 3: 1900, 4: 1900, 5: 2000, 6: 2000 }[pin[0]];
      if (century) out.birthday = `${dd}.${mm}.${century + Number(yy)}`;
    }

    // Berilgan sana: tug'ilgan sanadan keyingi, amal qilish muddatidan oldingi sana
    const dates = [...new Set(datesIn(allText))].filter((d) => d !== out.birthday).sort((a, b) => dateKey(a).localeCompare(dateKey(b)));
    const todayKey = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const issued = dates.filter((d) => dateKey(d) <= todayKey && (!out.birthday || dateKey(d) > dateKey(out.birthday))).pop();
    if (issued) out.passportIssued = issued;
    const issuer = issuerIn(allText);
    if (issuer) out.passportIssuer = issuer;
    return out;
  });
}

// Server ishga tushganda tilni oldindan yuklab qo'yish (birinchi o'quvchi kutib qolmasin)
export function warmUpOcr() {
  getWorker().catch((error) => console.error("OCR tayyorlanmadi:", error?.message || error));
}
