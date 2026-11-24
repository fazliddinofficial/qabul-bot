// ID karta / pasport rasmidan ma'lumotlarni o'qish (serverning o'zida, tashqi xizmatsiz).
// Faqat tekshiruvdan o'tgan qiymatlar qaytariladi — shubhalisi o'quvchidan so'raladi.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { capitalizePlace } from "./contract.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
let workerPromise = null;
let queue = Promise.resolve();

const CACHE_DIR = path.join(ROOT, ".ocr-cache");

function getWorker() {
  if (!workerPromise) {
    // tesseract.js til faylini shu papkaga saqlaydi, lekin papkani o'zi yaratmaydi
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    workerPromise = createWorker("eng", 1, { cachePath: CACHE_DIR }).catch((error) => {
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

// Rasmni kattalashtirib, kulrang qilamiz. Kontrastni cho'zish (normalize) bir xil fonli rasmni buzib yuborishi
// mumkin — shuning uchun u faqat zaxira variantda ishlatiladi.
async function prepare(buffer) {
  const img = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  const width = meta.width && meta.width < 1600 ? 1800 : Math.min(meta.width || 1800, 2400);
  const gray = await img.resize({ width }).grayscale().png().toBuffer();
  return deskew(gray);
}

// Telefonda qiyshiq tushirilgan rasm: matn qatorlari gorizontal bo'ladigan burchakni topib, to'g'rilaymiz.
// Usul: kichraytirilgan rasmni har xil burchakka burib, qatorlar bo'yicha "siyoh" yig'indisi eng keskin bo'lganini tanlaymiz.
async function deskew(gray) {
  // "Siyoh" — atrofidan sezilarli qoraroq piksel (mahalliy o'rtachaga nisbatan): stol, ramka, soya kabi
  // katta bir xil joylar hisobga kirmaydi, faqat harflar qoladi
  const small = sharp(gray).resize({ width: 640 }).grayscale();
  const { data: px, info } = await small.clone().raw().toBuffer({ resolveWithObject: true });
  const { data: mean } = await small.clone().blur(6).raw().toBuffer({ resolveWithObject: true });
  const data = Buffer.alloc(info.width * info.height);
  for (let i = 0; i < data.length; i += 1) data[i] = mean[i * info.channels] - px[i * info.channels] > 22 ? 255 : 0;
  info.channels = 1;
  const score = async (angle) => {
    const rotated = angle
      ? await sharp(data, { raw: { width: info.width, height: info.height, channels: 1 } })
          .rotate(angle, { background: "#000000" })
          .raw()
          .toBuffer({ resolveWithObject: true })
      : { data, info };
    const { width, height } = rotated.info;
    const channels = rotated.info.channels;
    let total = 0;
    for (let y = 0; y < height; y += 1) {
      let row = 0;
      for (let x = 0; x < width; x += 1) if (rotated.data[(y * width + x) * channels] > 127) row += 1;
      total += row * row;
    }
    return total;
  };
  const base = await score(0);
  let best = { angle: 0, value: base };
  for (let angle = -12; angle <= 12; angle += 1) {
    if (!angle) continue;
    const value = await score(angle);
    if (value > best.value) best = { angle, value };
  }
  for (const step of [-0.5, 0.5, -0.25, 0.25]) {
    const angle = best.angle + step;
    const value = await score(angle);
    if (value > best.value) best = { angle, value };
  }
  // Juda kichik og'ish yoki sezilarsiz yaxshilanish — rasmga tegmaymiz
  if (Math.abs(best.angle) < 0.5 || best.value < base * 1.04) return gray;
  if (process.env.OCR_DEBUG) console.error(`[ocr] deskew ${best.angle}°`);
  return sharp(gray).rotate(best.angle, { background: "#ffffff" }).png().toBuffer();
}

const letterCount = (text) => (String(text || "").match(/[A-Za-z]/g) || []).length;

// To'liq matn: avval oddiy, juda kam harf chiqsa — kontrast cho'zilgan holda qayta
async function recognizeText(img) {
  const plain = await recognize(img);
  if (letterCount(plain) >= 25) return plain;
  const boosted = await recognize(await sharp(img).normalize().sharpen().png().toBuffer());
  return letterCount(boosted) > letterCount(plain) ? boosted : plain;
}

// Hujjatning yuqori qismi (MRZ siz) — orqa tomondagi naqshli fon matnni buzadi, shuning uchun
// bir necha xil ishlov bilan o'qib, natijalarni birlashtiramiz (yorliq va qiymatlar shu matndan qidiriladi)
async function recognizeTopVariants(img, docType) {
  const meta = await sharp(img).metadata();
  // ID karta orqasida MRZ pastki ~38%, pasport sahifasida ~22%
  // Pasport ko'pincha ikki sahifa (yuqorida "Kim tomonidan berilgan", pastda rasmli sahifa) — MRZ eng pastda
  const share = docType === "front" ? 1 : docType === "passport" ? 0.9 : 0.62;
  const topPart = () => sharp(img).extract({ left: 0, top: 0, width: meta.width, height: Math.round(meta.height * share) });
  const variants = [
    { make: () => topPart(), psm: "3" },
    { make: () => topPart().threshold(100), psm: "11" },
    { make: () => topPart().threshold(120), psm: "3" },
  ];
  // ID kartaning old tomoni (rasm ustida naqsh): kontrastni cho'zib, alohida so'zlar rejimida ham o'qiymiz
  if (docType === "front") variants.push({ make: () => topPart().normalize().sharpen(), psm: "11" });
  const texts = [];
  for (const variant of variants) {
    texts.push(await recognize(await variant.make().png().toBuffer(), { psm: variant.psm }));
  }
  return texts.join("\n");
}

async function recognize(buffer, { mrzOnly = false, width = 1400, threshold = 0, boost = true, psm = "3" } = {}) {
  const worker = await getWorker();
  await worker.setParameters(
    mrzOnly
      ? { tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<", tessedit_pageseg_mode: "6" }
      : { tessedit_char_whitelist: "", tessedit_pageseg_mode: psm },
  );
  let image = buffer;
  if (mrzOnly) {
    // MRZ — pastki qism: kesib, kattalashtirib, oq-qora qilamiz (OCR-B shrifti aniqroq o'qiladi)
    const meta = await sharp(buffer).metadata();
    const top = Math.round(meta.height * 0.55);
    let crop = sharp(buffer).extract({ left: 0, top, width: meta.width, height: meta.height - top }).resize({ width }).grayscale();
    if (boost) crop = crop.normalize();
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
  else out.seriesRaw = l1.slice(5, 15);
  const pin = digits(l1.slice(15, 30)).match(/\d{14}/)?.[0];
  if (pin) out.pinflMrz = pin;
  const dobRaw = digits(l2.slice(0, 6));
  if (/^\d{6}$/.test(dobRaw) && checkDigit(dobRaw) === digits(l2[6] || "")) {
    out.birthday = yymmddToDate(dobRaw);
    if (/^[MF]$/.test(l2[7] || "")) out.sex = l2[7]; // jins faqat qator to'g'ri o'qilganda (sana tekshiruvdan o'tsa)
  }
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
  else out.seriesRaw = l2.slice(0, 10);
  const dobRaw = digits(l2.slice(13, 19));
  if (/^\d{6}$/.test(dobRaw) && checkDigit(dobRaw) === digits(l2[19] || "")) {
    out.birthday = yymmddToDate(dobRaw);
    if (/^[MF]$/.test(l2[20] || "")) out.sex = l2[20];
  }
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

const LABEL_WORDS = /SURNAME|GIVEN|NAME|PATRONYMIC|FAMILIYA|\bISMI?\b|OTASINING|DATE|SANA|NATIONALITY|FUQARO|JINSI/;
// Yorliq qatoridagi yorliq so'zlari (OTASINING ISMI / PATRONYMIC) — qiymat deb olinmasin
const LABEL_STRIP = /\b(OTASINING|[I1]{0,2}[S5][MW][I1!]?|PATRONYMIC|FAMILIYASI?|SURNAME|GIVEN|NAMES?|I)\b/gi;
const VALUE_RE = /[A-ZʻʼО'‘’`]{2,}(?:[ -][A-ZʻʼО'‘’`]{2,})*/;

function labelValue(rawLines, labelRe) {
  return labelValues(rawLines, labelRe)[0] || "";
}

// Yorliqning barcha uchragan joylaridagi qiymatlar (pasportda ism ikki sahifada: o'zbekcha va inglizcha yozuvda)
function labelValues(rawLines, labelRe) {
  const found = [];
  for (let i = 0; i < rawLines.length; i += 1) {
    const one = labelValueAt(rawLines, i, labelRe);
    if (one) found.push(one);
  }
  return found;
}

function labelValueAt(rawLines, i, labelRe) {
  {
    const line = rawLines[i];
    const m = line.match(labelRe);
    if (!m) return "";
    // Qiymat yorliq bilan bir qatorda (katta harflarda) bo'lishi mumkin
    const rest = nameish(line.slice(m.index + m[0].length)).replace(LABEL_STRIP, " ").replace(/^[\s/:.-]+/, "").trim();
    const restUpper = rest.match(VALUE_RE)?.[0];
    if (restUpper && restUpper.length >= 3 && !LABEL_WORDS.test(restUpper)) return restUpper.trim();
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

// Otasining ismi: barcha o'qishlardan "...O'G'LI / QIZI / ...VICH / ...VNA" bilan tugaganini tanlaymiz,
// qo'shimchadan keyingi shovqin ("O'G'LI EL") kesiladi; qo'shimchasizlardan esa eng ko'p takrorlangani
function patronymicShape(raw) {
  const words = String(raw || "").toUpperCase().replace(/[‘’ʻ`]/g, "'").replace(/[^A-Z' ]/g, " ").split(/\s+/).filter(Boolean);
  const end = words.findIndex((w, i) => i > 0 && (suffixFix(w) || /(OVICH|EVICH|OVNA|EVNA)$/.test(w)));
  if (end > 0) return { value: words.slice(0, end + 1).join(" "), score: 2 };
  const long = words.filter((w) => w.length >= 4);
  return { value: long.join(" "), score: long.length ? 1 : 0 };
}

function pickPatronymic(lines) {
  const raw = labelValues(lines, /(otasining\b|patronym)/i);
  for (const l of lines) if (/\b(QIZI|O['‘’ʻ`]?G['‘’ʻ`]?LI|UGLI)\b/i.test(l)) raw.push(nameish(l).toUpperCase());
  const votes = new Map();
  for (const r of raw) {
    const { value, score } = patronymicShape(r);
    if (!score) continue;
    const cur = votes.get(value) || { score, n: 0 };
    cur.n += 1;
    votes.set(value, cur);
  }
  return [...votes.entries()].sort((a, b) => b[1].score - a[1].score || b[1].n - a[1].n)[0]?.[0] || "";
}

// Otasining ismi oxiri yopiq ro'yxat: OCR xatolarini to'g'rilaymiz (QIZL, QIZZI → qizi; OGLI, 0G'LI → o'g'li)
function suffixFix(word) {
  if (/^q[il1]?z+[il1]{1,2}$/i.test(word)) return "qizi";
  if (/^[ou0]{0,2}'?g'?l[il1y]$/i.test(word)) return "o'g'li";
  return "";
}

// ---------- ism-familiyani tanlash: bir necha o'qish + MRZ bilan solishtirish ----------
const APOS = /[‘’ʻʼ`´]/g;

// MRZ'da Y va apostrof tushib qoladi (TURSUNBOEV, MAMAQOZIEVA): solishtirish uchun ularsiz ko'rinish
const bareY = (s) => String(s || "").toUpperCase().replace(/[^A-Z]/g, "").replace(/Y(?=[AEIOU])/g, "");

// MRZ yozuvini o'zbekcha ko'rinishga yaqinlashtiramiz: unli + E → unli + YE (BOEV → BOYEV, ALIEVA → ALIYEVA)
function uzbekify(name) {
  return String(name || "").toUpperCase().replace(/([AEIOU])E/g, "$1YE");
}

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
}

// Yorliq yonidan olingan qiymatning birinchi so'zi (yon ustundagi "ERKAK" kabi so'zlar tushib qoladi)
function nameWord(raw) {
  const word = nameish(raw).toUpperCase().replace(APOS, "'").replace(/[^A-Z' ]/g, " ").trim().split(/\s+/)[0] || "";
  return word.replace(/^'+|'+$/g, "");
}

// Eng ko'p uchragani; teng bo'lsa — harflari ko'prog'i (Y va apostrof saqlangani)
function mostVoted(words) {
  const counts = new Map();
  for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0]?.[0] || "";
}

/**
 * Familiya yoki ism: hujjatdagi bosma yozuv (apostrof va Y bilan) afzal, lekin faqat MRZ bilan mos kelsa.
 * fromText — yorliq yonidan topilganlar, allWords — matndagi barcha so'zlar, mrz — { value, votes }
 */
function chooseName(fromText, allWords, mrz) {
  const cands = fromText.map(nameWord).filter((w) => w.replace(/'/g, "").length >= 2 && !LABEL_WORDS.test(w));
  if (!mrz?.value) {
    const solid = cands.filter((w) => w.replace(/'/g, "").length >= 3);
    return mostVoted(solid.length ? solid : cands);
  }
  // MRZ'da "<<" ba'zan "<K" bo'lib o'qiladi (KBEKZOD) — boshidagi K/L ni olib tashlangan ko'rinishi ham nomzod
  const targets = [bareY(mrz.value)];
  if (/^[KL]/.test(mrz.value)) targets.push(bareY(mrz.value.slice(1)));
  const fits = (w) => targets.includes(bareY(w));
  // 1) yorliq yonidagi qiymat MRZ bilan aynan mos  2) matnning istalgan joyidagi mos so'z.
  // Pasportda ism ikki sahifada (o'zbekcha TURSUNBOYEV, inglizcha TURSUNBOEV) — harflari ko'prog'i (o'zbekchasi) olinadi
  const longest = (list) => [...list].sort((a, b) => b.length - a.length || list.filter((x) => x === b).length - list.filter((x) => x === a).length)[0];
  const exact = cands.filter(fits);
  if (exact.length) return longest(exact);
  const anywhere = allWords.filter(fits);
  if (anywhere.length) return longest(anywhere);
  // Bosma yozuv MRZ'ga yaqin (1–2 harf farq) — bosma yozuv ko'pincha aniqroq; MRZ — faqat bosma yozuv umuman boshqacha bo'lsa
  const near = cands.filter((w) => targets.some((t) => editDistance(bareY(w), t) <= 2));
  if (near.length) return mostVoted(near);
  const fromMrz = mrz.value; // KARIMOV kabi K bilan boshlanadigan familiyalar ham bor — K ni o'zboshimcha olib tashlamaymiz
  return mrz.votes >= 2 || !cands.length ? uzbekify(fromMrz) : mostVoted(cands);
}

// Otasining ismi + qo'shimcha: MRZ'dagi jins bo'yicha qo'shimcha to'ldiriladi/tuzatiladi (IXTIYOR → IXTIYOR O'G'LI)
function finishPatronymic(value, sex) {
  const words = String(value || "").toUpperCase().replace(APOS, "'").split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  if (words.length === 1 && /(OVICH|EVICH|OVNA|EVNA)$/.test(words[0])) return words[0];
  const last = words[words.length - 1];
  const hasSuffix = words.length > 1 && suffixFix(last);
  const want = sex === "F" ? "QIZI" : sex === "M" ? "O'G'LI" : "";
  if (hasSuffix) {
    if (!want) return words.join(" ");
    return [...words.slice(0, -1), want].join(" ");
  }
  // Qo'shimchasiz: jins ma'lum bo'lsa — birinchi so'z (otaning ismi) + qo'shimcha; aks holda ishonchsiz
  if (want && words[0].replace(/'/g, "").length >= 3) return `${words[0]} ${want}`;
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
  // Sana nuqta bilan ham (20.01.2017), bo'shliq bilan ham (pasportda: 20 01 2017) yozilishi mumkin
  return [...String(text || "").matchAll(/\b(0[1-9]|[12]\d|3[01])\s?[.\/,\- ]\s?(0[1-9]|1[0-2])\s?[.\/,\- ]\s?((?:19|20)\d{2})\b/g)].map((m) => `${m[1]}.${m[2]}.${m[3]}`);
}
const dateKey = (d) => d.split(".").reverse().join("");

// "IIV 8401": OCR "IV 8401", "WV 8401", "nv 8401", "I1V 8401" deb o'qishi mumkin — hammasi IIV
function issuerIn(text) {
  const m = String(text || "").toUpperCase().match(/(?:^|[^A-Z0-9])[IWNL1|!]{0,2}\s?([VB])\s*[-:№.]?\s*(\d{4,6})\b/);
  return m ? `II${m[1]} ${m[2]}` : "";
}

// Butun matndan qidirishda qattiqroq: V oldida kamida bitta I-ga o'xshash harf bo'lsin, faqat IIV
function issuerInStrict(text) {
  const m = String(text || "").toUpperCase().match(/(?:^|[^A-Z0-9])[IWNL1|!]{1,2}\s?V\s*[-:№.]?\s*(\d{4,6})\b/);
  return m ? `IIV ${m[1]}` : "";
}

const DATE_RE_G = /\b(0[1-9]|[12]\d|3[01])\s?[.\/,\- ]\s?(0[1-9]|1[0-2])\s?[.\/,\- ]\s?((?:19|20)\d{2})\b/;
const ISSUE_LABEL = /(berilgan\s*sana\w*|date\s*of\s*issue|issued?\s*on|date\s*of\s*iss)/i;
// ID karta orqasida "Berilgan joyi / Place of issue", pasportda "Kim tomonidan berilgan / Authority"
const AUTHORITY_LABEL = /(kim\s*tomonidan(\s*berilgan)?|authority|berilgan\s*j\s*o\s*y\w*|place\s*o[fi]\s*iss?ue)/i;
const LABEL_NOISE = /(BERILGAN|SANASI|DATE|ISSUE|KIM|TOMONIDAN|AUTHORITY|AMAL|QILISH|MUDDATI|EXPIRY|JSHSHIR|PINFL|TUG'?ILGAN|JOYI|PLACE|BIRTH|SHAXSIY|RAQAM|PERSONAL|NO\.?)\b/g;

const BIRTH_LABEL = /(tug['‘’`]?\s?i?l?gan\s*sanas\w*|date\s*of\s*birth)/i;

// Yorliq yonidagi (yoki ostidagi) qiymat: "Berilgan sanasi / Date of issue" → 01.09.2022
function issuedByLabel(lines) {
  return dateByLabel(lines, ISSUE_LABEL);
}

function dateByLabel(lines, ISSUE_LABEL) {
  for (let i = 0; i < lines.length; i += 1) {
    if (!ISSUE_LABEL.test(lines[i])) continue;
    const after = lines[i].slice(lines[i].search(ISSUE_LABEL));
    const same = after.match(DATE_RE_G);
    if (same) return `${same[1]}.${same[2]}.${same[3]}`;
    for (let j = i + 1; j < Math.min(lines.length, i + 3); j += 1) {
      // Ikki ustunli joylashuv: "01.09.2022   IIV 8213" — yorliq qaysi ustunda bo'lsa, o'sha tomondagi sana
      const dates = [...lines[j].matchAll(new RegExp(DATE_RE_G, "g"))];
      if (dates.length) {
        const pick = dates.length > 1 && lines[i].search(ISSUE_LABEL) > lines[i].length / 2 ? dates[dates.length - 1] : dates[0];
        return `${pick[1]}.${pick[2]}.${pick[3]}`;
      }
    }
  }
  return "";
}

// Pasport daftarchasi: "KIM TOMONIDAN BERILGAN" ostida organ nomi bir necha qatorda bo'ladi:
// "JIZZAX VILOYATI ZOMIN" / "TUMANI IIB" → "Jizzax viloyati Zomin tumani IIB"
// OCR "TOMONIDAH", "T0MONIDAN", "KIMTOMONIDANBERILGAN" deb ham o'qiydi
const KIM_LABEL = /(k\w{0,3}\s*t[o0]m[o0]n\w{3,4}|t[o0]m[o0]nida\w\s*ber\w*)/i;
const ISSUER_END = /^(IIB|IIV|IIBB|IIIB|IIO|FHDYO|BO'LIMI|BOLIMI|VAZIRLIGI|BOSHQARMASI|IIVB)$/;
// Yon ustundan aralashib qoladigan qiymat/yorliq so'zlari
const ISSUER_SKIP = /^(([O0]'?)?ZBEK|ERKAK|AYOL|MILLATI?|KIM|TOMONIDAN|B?ERILGAN|KIMTOMONIDANBERILGAN|RESPUBLIKASI|PASPORT|PASSPORT)$/;
const ISSUER_STOP = /(SANAS|JOY[I1!}]?\b|DATE|SEX|JINSI|NAME|SURNAME|FAMILIYA|SIGNATURE|IMZO|MUDDAT)/i;

function issuerWords(line) {
  // Faqat KATTA harfli so'zlar: organ nomi katta harfda bosiladi, fon "shovqini" esa odatda kichik harf bo'lib o'qiladi.
  // IIB/IIV ko'pincha "118B", "I1B", "IIV" kabi o'qiladi — tiklaymiz
  const fixed = String(line)
    .replace(/[‘’ʻ`]/g, "'")
    .replace(/(^|[^A-Z0-9])[I1l|]{1,3}[8B]{1,2}(?![A-Z0-9])/g, "$1IIB")
    .replace(/(^|[^A-Z0-9])[I1l|]{1,3}V(?![A-Z0-9])/g, "$1IIV");
  // 3 harfli tasodifiy "so'zlar" (LIC, CIC) shovqin bo'ladi — faqat ma'lum qisqartmalar qoladi
  return (fixed.match(/[A-Z][A-Z']+\.?/g) || [])
    .map((w) => w.replace(/\.$/, ""))
    .filter((w) => (w.length >= 4 || w === "SH" || ISSUER_END.test(w)) && !ISSUER_SKIP.test(w));
}

function issuerAfterKim(lines) {
  const votes = new Map();
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(KIM_LABEL);
    if (!m) continue;
    const words = [];
    const rest = lines[i].slice(m.index + m[0].length).replace(/^\s*berilgan/i, "");
    const following = [rest, ...lines.slice(i + 1, i + 7)];
    let done = false;
    for (let j = 0; j < following.length && !done; j += 1) {
      if (j > 0 && ISSUER_STOP.test(following[j])) break;
      for (const w of issuerWords(following[j])) {
        words.push(w);
        if (ISSUER_END.test(w)) {
          done = true;
          break;
        }
      }
    }
    if (!done || words.length < 2) continue;
    const value = capitalizePlace(words.join(" ").toLowerCase());
    votes.set(value, (votes.get(value) || 0) + 1);
  }
  // Bir necha xil o'qishdan eng ko'p takrorlangani; teng bo'lsa — uzunrog'i (to'liqrog'i)
  return [...votes.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0]?.[0] || "";
}

// "Kim tomonidan berilgan / Authority" → "IIV 26283" yoki "Jizzax shahar IIB"
function authorityByLabel(lines) {
  const kim = issuerAfterKim(lines);
  if (kim) return kim;
  for (let i = 0; i < lines.length; i += 1) {
    const at = lines[i].search(AUTHORITY_LABEL);
    if (at < 0) continue;
    const candidates = [lines[i].slice(at).replace(AUTHORITY_LABEL, ""), ...lines.slice(i + 1, i + 3)];
    for (const raw of candidates) {
      const coded = issuerIn(raw);
      if (coded) return coded;
      const text = raw
        .toUpperCase()
        .replace(new RegExp(DATE_RE_G, "g"), " ")
        .replace(LABEL_NOISE, " ")
        .replace(/[^A-Z0-9'‘’ʻ`. -]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      // Joy nomi + IIB/IIV/IIBB kabi qisqartma bo'lsa — matnli organ nomi
      if (text.length >= 5 && /\b(IIB|IIV|IIBB|IIIB|FHDYO|BO'LIMI|BOLIMI|VAZIRLIGI|BOSHQARMASI|IIO)\b/.test(text)) {
        return capitalizePlace(text.toLowerCase());
      }
    }
  }
  return "";
}

// MRZ'dagi seriya suv belgisi tufayli xato o'qilsa — sahifadagi bosma raqamdan ("PASPORT RAQAMI  AB5710342").
// Ishonchli deb olinadi: MRZ tekshiruv raqamiga mos kelsa, MRZ'dagidan ko'pi bilan 2 belgi farq qilsa yoki matnda 2+ marta uchrasa
function seriesFromText(text, raws) {
  const counts = new Map();
  for (const m of String(text || "").toUpperCase().matchAll(/(?:^|[^A-Z0-9])([A-Z]{2})\s?(\d{7})(?![0-9])/g)) {
    const s = m[1] + m[2];
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  const diff = (a, b) => [...a].filter((ch, i) => ch !== b[i]).length;
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [s, n] of ranked) {
    const mrzOk = raws.some((raw) => {
      const r = String(raw || "");
      return (r.length >= 10 && checkDigit(s) === digits(r[9])) || (r.length >= 9 && diff(s, r.slice(0, 9)) <= 2);
    });
    if (mrzOk || n >= 2) return s;
  }
  return "";
}

function pinflIn(text) {
  const m = String(text || "").replace(/(\d)\s+(?=\d)/g, "$1").match(/\b[3-6]\d{13}\b/);
  return m ? m[0] : "";
}

// Matndagi barcha 14 xonali JSHSHIR nomzodlari (bir necha xil o'qishdan)
function pinflAllIn(text) {
  return [...new Set([...String(text || "").replace(/(\d)\s+(?=\d)/g, "$1").matchAll(/\b[3-6]\d{13}\b/g)].map((m) => m[0]))];
}

// MRZ qatorida belgilar siljib o'qilsa JSHSHIR uzun raqamlar qatori ichida qoladi —
// har 14 xonali bo'lakni o'z tekshiruv raqami bilan tekshiramiz
function pinflWindows(text) {
  const out = new Set();
  for (const run of String(text || "").match(/\d{14,}/g) || []) {
    for (let i = 0; i + 14 <= run.length; i += 1) {
      const w = run.slice(i, i + 14);
      if (pinflValid(w)) out.add(w);
    }
  }
  return [...out];
}

// JSHSHIR'ning oxirgi raqami — tekshiruv raqami: dastlabki 13 raqam × 7,3,1,7,3,1… yig'indisining oxirgi raqami
export function pinflValid(pin) {
  if (!/^[3-6]\d{13}$/.test(String(pin || ""))) return false;
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < 13; i += 1) sum += Number(pin[i]) * weights[i % 3];
  return sum % 10 === Number(pin[13]);
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
    const seriesRaws = [];
    let zoneText = "";
    const main = docType === "passport" ? front : back;
    if (main) {
      const img = await prepare(main);
      // Matn (yorliqlar, JSHSHIR, bergan organ) — yuqori qismdan bir necha xil ishlov bilan
      const full = await recognizeTopVariants(img, docType);
      texts.push(full);
      // OCR natijasi rasm o'lchamiga sezgir: muhim maydon topilmasa — boshqa o'lchamda yana bir bor o'qiymiz
      if (docType === "passport") {
        const lines1 = full.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (!issuerAfterKim(lines1) || !pickPatronymic(lines1)) {
          const w = (await sharp(img).metadata()).width || 1800;
          texts.push(await recognizeTopVariants(await sharp(img).resize({ width: w > 1500 ? 1250 : 2200 }).png().toBuffer(), docType));
        }
      }
      // MRZ ni bir necha sozlamada o'qiymiz; har bir maydon tekshiruv raqami bilan tasdiqlanadi, natijalar birlashtiriladi
      const zones = [
        await recognize(img, { mrzOnly: true, width: 1400, boost: false }),
        await recognize(img, { mrzOnly: true, width: 1400 }),
        await recognize(img, { mrzOnly: true, width: 1000, threshold: 140 }),
        await recognize(img, { mrzOnly: true, width: 1800 }),
      ];
      zoneText = zones.join("\n");
      const parse = docType === "passport" ? parseTd3 : parseTd1;
      // Ism, familiya va jinsda tekshiruv raqami yo'q — o'qishlar bo'yicha ovoz beramiz
      const VOTED = ["surname", "given", "sex"];
      const votes = Object.fromEntries(VOTED.map((key) => [key, []]));
      for (const zone of zones) {
        const found = parse(mrzLines(zone));
        for (const [key, value] of Object.entries(found)) {
          if (!value) continue;
          if (VOTED.includes(key)) votes[key].push(value);
          else if (!mrz[key]) mrz[key] = value;
        }
        if (found.seriesRaw) seriesRaws.push(found.seriesRaw);
      }
      for (const key of VOTED) {
        const list = votes[key].filter((v) => key === "sex" || v.length >= 2);
        const value = mostVoted(list);
        if (value) {
          mrz[key] = value;
          mrz[`${key}Votes`] = list.filter((v) => v === value).length;
        }
      }
      if (process.env.OCR_DEBUG) console.error("[ocr] zones:", JSON.stringify(zones.slice(0, 2)));
    }
    let frontText = docType === "passport" ? texts.join("\n") : "";
    if (docType !== "passport" && front) {
      // ID karta old tomoni: ism-familiya shu yerda — bir necha xil ishlov bilan o'qib, ovoz beramiz
      const img = await prepare(front);
      frontText = [await recognizeText(img), await recognizeTopVariants(img, "front")].join("\n");
      texts.push(frontText);
    }
    const allText = texts.join("\n");
    const frontLines = frontText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (process.env.OCR_DEBUG) console.error("[ocr] front:", JSON.stringify(frontLines), "\n[ocr] mrz:", JSON.stringify(mrz));

    // Ism-familiya: old tomondagi yozuv (apostrof bilan), MRZ bilan solishtiriladi
    // Pasportda ism ikki joyda: o'zbekcha sahifada (TURSUNBOYEV) va inglizcha sahifada (TURSUNBOEV).
    // MRZ bilan mos (Y hisobga olinmaganda) nomzodlardan o'zbekcha — harflari ko'prog'i olinadi
    // Matndagi barcha so'zlar (yorliq o'qilmay qolsa ham MRZ'dagi ismga mos so'zni topish uchun);
    // OCR so'z ichiga bo'shliq qo'yishi mumkin (TURSU NBOYEV) — qo'shni ikki so'zni birlashtirib ham qaraymiz
    const allWords = [];
    for (const line of frontLines) {
      const words = nameish(line).toUpperCase().replace(APOS, "'").replace(/[^A-Z' ]/g, " ").split(/\s+/).filter((w) => w.length >= 2);
      words.forEach((w, i) => {
        allWords.push(w);
        if (words[i + 1]) allWords.push(w + words[i + 1]);
      });
    }
    const surname = chooseName(labelValues(frontLines, /(fam[il1]\w*|surname)/i), allWords, mrz.surname && { value: mrz.surname, votes: mrz.surnameVotes });
    const given = chooseName(labelValues(frontLines, /(\bism[il1]?\b|given\s*name)/i), allWords, mrz.given && { value: mrz.given, votes: mrz.givenVotes });
    // O'zbek lotin yozuvida unlidan keyin "e" emas, "ye" yoziladi — faqat inglizcha sahifa o'qilgan bo'lsa ham to'g'ri chiqadi
    if (surname) out.surname = titleCase(uzbekify(surname));
    if (given) out.given = titleCase(uzbekify(given));
    // Otasining ismi MRZ'da yo'q — bir necha o'qishdan ovoz bilan; qo'shimchasi jinsga qarab to'g'rilanadi
    const patronymicClean = finishPatronymic(pickPatronymic(frontLines).replace(/[^A-Z'‘’ʻʼ` ]/gi, " ").replace(/\s+/g, " ").trim(), mrz.sex);
    if (patronymicClean.replace(/[^A-Z]/gi, "").length >= 3) out.patronymic = titleCase(patronymicClean);
    if (out.surname && out.given && out.patronymic) out.fullName = `${out.surname} ${out.given} ${out.patronymic}`;

    const series = mrz.series || seriesFromText(allText, seriesRaws);
    if (series) out.passportSeries = series;
    if (mrz.birthday) out.birthday = mrz.birthday;
    // MRZ'dan chiqmasa — "Tug'ilgan sanasi / Date of birth" yorlig'i yonidagi sana (JSHSHIR bilan quyida tekshiriladi)
    const birthLabel = out.birthday ? "" : dateByLabel(allText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean), BIRTH_LABEL);

    // JSHSHIR: o'z tekshiruv raqami (7-3-1) to'g'ri bo'lsa, tug'ilgan sana bilan mos bo'lsa yoki MRZ va matnda bir xil bo'lsa
    const pinTexts = pinflAllIn(allText);
    const candidates = [mrz.pinflMrz, ...pinTexts, mrz.pinflMrzWeak].filter(Boolean);
    const knownBirthday = out.birthday || birthLabel;
    // Uzun raqamlar ichidan topilgani faqat tug'ilgan sanaga mos kelsa olinadi
    const windowPin = knownBirthday ? pinflWindows(`${zoneText}\n${allText}`).find((p) => pinflMatchesBirthday(p, knownBirthday)) : "";
    const pin =
      candidates.find((p) => pinflValid(p) && (!knownBirthday || pinflMatchesBirthday(p, knownBirthday))) ||
      windowPin ||
      candidates.find((p) => pinflMatchesBirthday(p, knownBirthday)) ||
      (mrz.pinflMrz && pinTexts.includes(mrz.pinflMrz) ? mrz.pinflMrz : "");
    if (pin) out.jshshir = pin;
    if (!out.birthday && pin) {
      const dd = pin.slice(1, 3);
      const mm = pin.slice(3, 5);
      const yy = pin.slice(5, 7);
      const century = { 3: 1900, 4: 1900, 5: 2000, 6: 2000 }[pin[0]];
      if (century) out.birthday = `${dd}.${mm}.${century + Number(yy)}`;
    }
    if (!out.birthday && birthLabel) out.birthday = birthLabel;

    // Berilgan sana va bergan organ: avval yorliq yonidan, topilmasa butun matndan
    const allLines = allText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const todayKey = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const plausibleIssue = (d) => d && dateKey(d) <= todayKey && (!out.birthday || dateKey(d) > dateKey(out.birthday));
    let issued = issuedByLabel(allLines);
    if (!plausibleIssue(issued)) {
      // tug'ilgan sanadan keyingi, bugungi kundan oldingi eng so'nggi sana (amal qilish muddati kelajakda bo'ladi)
      const dates = [...new Set(datesIn(allText))].filter((d) => d !== out.birthday).sort((a, b) => dateKey(a).localeCompare(dateKey(b)));
      issued = dates.filter(plausibleIssue).pop() || "";
    }
    if (issued) out.passportIssued = issued;
    let issuer = authorityByLabel(allLines) || issuerInStrict(allText);
    // Pasport daftarchasida "Kim tomonidan berilgan" rasmli sahifaning ustidagi sahifada bo'ladi.
    // Rasmli sahifada topilmasa — ikkinchi yuborilgan rasmdan ham qidiramiz
    if (!issuer && docType === "passport" && back) {
      const backLines = (await recognizeTopVariants(await prepare(back), "passport")).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      issuer = issuerAfterKim(backLines);
    }
    if (issuer) out.passportIssuer = issuer;
    return out;
  });
}

// Server ishga tushganda tilni oldindan yuklab qo'yish (birinchi o'quvchi kutib qolmasin)
export function warmUpOcr() {
  getWorker().catch((error) => console.error("OCR tayyorlanmadi:", error?.message || error));
}
