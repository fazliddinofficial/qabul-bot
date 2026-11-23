// "📄 Shartnoma qilish" — bot orqali shartnoma uchun hujjat rasmlari va pasport ma'lumotlari.
// Ikki xil: xodim (ishga olingan) — ma'lumotlar paneldagi arizaning "Mehnat shartnomasi"
// kartalariga tushadi; o'quvchi — panelning "O'quvchilar shartnomasi" bo'limiga tushadi.
import { Markup } from "telegraf";
import { isOwnContact } from "./questions.js";

const SKIP_TEXT = "⏭ O'tkazib yuborish";
const MAX_DOC_BYTES = 3 * 1024 * 1024; // Mongo hujjati 16 MB dan oshmasligi uchun (bir nechta fayl bitta yozuvda)
const DATE_RE = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(19|20)\d{2}$/;

const skipKeyboard = {
  keyboard: [[{ text: SKIP_TEXT }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

const phoneKeyboard = {
  keyboard: [[{ text: "📞 Telefon raqamni ulashish", request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

function docKind(document) {
  if (!document) return "";
  const mime = String(document.mime_type || "").toLowerCase();
  const name = String(document.file_name || "").toLowerCase();
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(mime)) return "image";
  if ([".jpg", ".jpeg", ".png", ".webp"].some((ext) => name.endsWith(ext))) return "image";
  return "";
}

function fileQuestion(id, label, required, hint = "") {
  return {
    id,
    label,
    kind: "file",
    required,
    text: `📎 ${label} rasmini yuboring${required ? " (majburiy)" : ""}.${hint ? `\n${hint}` : ""}\n\nRasm yoki PDF bo'lishi mumkin.${
      required ? "" : `\nAgar yo'q bo'lsa, «${SKIP_TEXT}» tugmasini bosing.`
    }`,
    check(message) {
      if (!required && message?.text?.trim() === SKIP_TEXT) return { ok: true, value: null };
      if (message?.photo?.length) {
        const best = message.photo[message.photo.length - 1];
        return { ok: true, value: { fileId: best.file_id, fileName: "", kind: "photo" } };
      }
      const kind = docKind(message?.document);
      if (kind) {
        if (message.document.file_size > MAX_DOC_BYTES) {
          return { ok: false, error: "❌ Fayl juda katta (3 MB dan oshmasin). Rasm sifatida yuboring." };
        }
        return {
          ok: true,
          value: { fileId: message.document.file_id, fileName: message.document.file_name || "", kind },
        };
      }
      return {
        ok: false,
        error: required
          ? `❌ Iltimos, ${label.toLowerCase()} rasmini yuboring (rasm yoki PDF). Bu majburiy.`
          : `❌ Iltimos, ${label.toLowerCase()} rasmini yuboring yoki «${SKIP_TEXT}» tugmasini bosing.`,
      };
    },
  };
}

function textQuestion(id, label, text, test, error, normalize = (value) => value, optional = false) {
  return {
    id,
    label,
    kind: "text",
    optional,
    text: optional ? `${text}\nAgar yo'q bo'lsa, «${SKIP_TEXT}» tugmasini bosing.` : text,
    check(message) {
      const raw = String(message?.text || "").replace(/\s+/g, " ").trim();
      if (optional && raw === SKIP_TEXT) return { ok: true, value: "" };
      if (!raw || raw === SKIP_TEXT || !test(raw)) return { ok: false, error };
      return { ok: true, value: normalize(raw) };
    },
  };
}

function choiceQuestion(id, label, text, options) {
  return {
    id,
    label,
    kind: "choice",
    text,
    options,
    check(message) {
      const raw = String(message?.text || "").trim();
      const hit = options.find((option) => option.label === raw || option.label.replace(/^\S+\s/, "").toLowerCase() === raw.toLowerCase());
      if (!hit) return { ok: false, error: "❌ Pastdagi tugmalardan birini tanlang." };
      return { ok: true, value: hit.value, extra: hit.extra };
    },
  };
}

// Kichik harflarda yozilsa — bosh harflarni kattalashtiramiz ("qizi", "o'g'li" kichik qoladi)
const KEEP_LOWER = new Set(["qizi", "o'g'li", "ogli", "o'gli", "ugli", "og'li"]);
function capFirst(word) {
  const chars = [...word];
  return chars.length ? chars[0].toLocaleUpperCase("uz") + chars.slice(1).join("") : word;
}
export function capitalizeName(value) {
  return String(value || "")
    .split(" ")
    .map((word) => (KEEP_LOWER.has(word.toLowerCase().replace(/[‘’ʻ`]/g, "'")) ? word.toLowerCase() : capFirst(word)))
    .join(" ");
}
export function capitalizeFirst(value) {
  return capFirst(String(value || ""));
}

// Manzil va organ nomi: joy nomlari bosh harf bilan, umumiy so‘zlar kichik, qisqartmalar katta
const PLACE_LOWER = new Set([
  "sh", "sh.", "shahar", "shahri", "shahrida", "t", "t.", "tuman", "tumani", "vil", "vil.", "viloyat", "viloyati",
  "mahalla", "mahallasi", "mfy", "ko'cha", "ko'chasi", "k.", "berk", "tor", "uy", "uyi", "uy.", "xonadon", "kv", "kv.",
  "kvartira", "dom", "qishloq", "qishlog'i", "q.", "mavze", "mavzesi", "massiv", "massivi", "bo'limi", "bo'lim",
  "ko'chasi,", "mahallasi,", "uy,", "sh.,", "tumani,", "viloyati,", "shahar,", "va", "yo'q",
]);
const PLACE_UPPER = { iib: "IIB", iiv: "IIV", iiib: "IIIB", fhdyo: "FHDYo", "fhdyo,": "FHDYo,", mfy: "MFY", fvv: "FVV", iibb: "IIBB", yhxb: "YHXB" };
export function capitalizePlace(value) {
  return String(value || "")
    .split(" ")
    .map((word, index) => {
      const key = word.toLowerCase().replace(/[‘’ʻ`]/g, "'");
      if (PLACE_UPPER[key]) return PLACE_UPPER[key];
      if (/^\d/.test(word)) return word;
      if (index > 0 && PLACE_LOWER.has(key)) return word.toLowerCase();
      return capFirst(word);
    })
    .join(" ");
}

const fullNameQuestion = () =>
  textQuestion(
    "fullName",
    "F.I.Sh",
    "✍️ Familiya, ism va otangizning ismini pasportdagidek yozing.\nMisol: Olimova Shirinxon Bobur qizi",
    (v) => v.split(" ").length >= 3 && /^[^\d]+$/.test(v),
    "❌ Familiya, ism va otangizning ismini to'liq yozing (kamida 3 so'z, raqamsiz).\nMisol: Olimova Shirinxon Bobur qizi",
    capitalizeName,
  );

const birthdayQuestion = () =>
  textQuestion(
    "birthday",
    "Tug'ilgan sana",
    "🎂 Tug'ilgan sanangiz (KK.OO.YYYY).\nMisol: 23.06.2007",
    (v) => DATE_RE.test(v),
    "❌ Sana KK.OO.YYYY ko'rinishida bo'lsin. Misol: 23.06.2007",
  );

const passportQuestions = () => [
  textQuestion(
    "passportSeries",
    "Pasport seriyasi va raqami",
    "🪪 Pasport (yoki ID karta) seriyasi va raqami.\nMisol: AD1234567",
    (v) => /^[A-Z]{2}\d{7}$/.test(v.replace(/\s/g, "").toUpperCase()),
    "❌ Seriya 2 ta harf va 7 ta raqam bo'lsin. Misol: AD1234567",
    (v) => v.replace(/\s/g, "").toUpperCase(),
  ),
  textQuestion(
    "passportIssued",
    "Pasport berilgan sana",
    "📅 Pasport berilgan sana (KK.OO.YYYY).\nMisol: 05.02.2025",
    (v) => DATE_RE.test(v),
    "❌ Sana KK.OO.YYYY ko'rinishida bo'lsin. Misol: 05.02.2025",
  ),
  textQuestion(
    "passportIssuer",
    "Pasport bergan organ",
    "🏛 Pasportni kim bergan? (pasportda yozilganidek)\nMisol: IIV 8213 yoki Jizzax viloyati IIB",
    (v) => v.length >= 3 && v.length <= 120,
    "❌ Pasport bergan organni yozing. Misol: IIV 8213",
    capitalizePlace,
  ),
  textQuestion(
    "jshshir",
    "JSHSHIR",
    "🔢 JSHSHIR (PINFL) — 14 ta raqam. Pasportning ichki sahifasida yoki ID karta orqasida yozilgan.",
    (v) => /^\d{14}$/.test(v.replace(/\s/g, "")),
    "❌ JSHSHIR aniq 14 ta raqamdan iborat bo'lsin.",
    (v) => v.replace(/\s/g, ""),
  ),
  textQuestion(
    "address",
    "Manzil",
    "🏠 Doimiy yashash manzilingiz (pasportdagi propiska).\nMisol: Jizzax sh., Qaliya mahallasi, Navoiy ko'chasi 12-uy",
    (v) => v.length >= 5 && v.length <= 300,
    "❌ Manzilni to'liqroq yozing (viloyat/shahar, mahalla, ko'cha, uy).",
    capitalizePlace,
  ),
];

const phoneQuestion = () => ({
  id: "phone",
  label: "Telefon",
  kind: "contact",
  text: "📞 Telefon raqamingiz. Yozib yuboring (misol: +998901234567) yoki «📞 Telefon raqamni ulashish» tugmasini bosing.",
  check(message, ctx) {
    if (message?.contact?.phone_number) {
      if (!isOwnContact(ctx)) {
        return { ok: false, error: "❌ Bu sizning kontaktingiz emas. Tugmani bosing yoki raqamingizni yozing." };
      }
      return { ok: true, value: message.contact.phone_number };
    }
    const phone = String(message?.text || "").replace(/[\s()-]/g, "");
    if (/^\+?\d{9,13}$/.test(phone)) return { ok: true, value: phone };
    return { ok: false, error: "❌ Noto'g'ri raqam. Misol: +998901234567 yoki 901234567" };
  },
});

export const contractQuestions = [
  fileQuestion("passportFront", "Pasport oldi", true, "ID karta bo'lsa — old tomoni."),
  fileQuestion("passportBack", "Pasport orqasi", true, "ID karta bo'lsa — orqa tomoni."),
  fileQuestion("diploma", "Diplom", false),
  fileQuestion("diplomaAppendix", "Diplom ilovasi", false),
  fileQuestion("certificate", "Sertifikat", false),
  fullNameQuestion(),
  birthdayQuestion(),
  ...passportQuestions(),
  phoneQuestion(),
];

export const DOC_TYPES = [
  { value: "id", label: "🪪 ID karta" },
  { value: "passport", label: "📘 Pasport" },
  { value: "birth", label: "📄 Tug'ilganlik guvohnomasi" },
];

const docTypeQuestion = () =>
  choiceQuestion(
    "docType",
    "Hujjat",
    "🪪 Qaysi hujjatingiz bilan shartnoma tuzasiz?\nPastdagi tugmalardan birini tanlang.",
    DOC_TYPES,
  );

const courseQuestion = () =>
  textQuestion(
    "course",
    "Kurs",
    "📚 Qaysi kursda o'qiysiz?\nMisol: Ingliz tili, Matematika, IT",
    (v) => v.length >= 2 && v.length <= 80,
    "❌ Kurs nomini yozing. Misol: Ingliz tili",
    capitalizeFirst,
  );

const issuedQuestion = (label, example) =>
  textQuestion(
    "passportIssued",
    `${label} berilgan sana`,
    `📅 ${label} berilgan sana (KK.OO.YYYY).\nMisol: ${example}`,
    (v) => DATE_RE.test(v),
    `❌ Sana KK.OO.YYYY ko'rinishida bo'lsin. Misol: ${example}`,
  );

const jshshirQuestion = (where, optional = false) =>
  textQuestion(
    "jshshir",
    "JSHSHIR",
    `🔢 JSHSHIR (PINFL) — 14 ta raqam. ${where}`,
    (v) => /^\d{14}$/.test(v.replace(/\s/g, "")),
    "❌ JSHSHIR aniq 14 ta raqamdan iborat bo'lsin.",
    (v) => v.replace(/\s/g, ""),
    optional,
  );

const cardSeriesQuestion = (label) =>
  textQuestion(
    "passportSeries",
    `${label} seriyasi va raqami`,
    `🔤 ${label} seriyasi va raqami.\nMisol: AD1234567`,
    (v) => /^[A-Z]{2}\d{7}$/.test(v.replace(/\s/g, "").toUpperCase()),
    "❌ Seriya 2 ta harf va 7 ta raqam bo'lsin. Misol: AD1234567",
    (v) => v.replace(/\s/g, "").toUpperCase(),
  );

const addressQuestion = () => passportQuestions().find((q) => q.id === "address");

const OTHER_COURSE = "other";

function courseQuestions(answers, courses) {
  if (!courses?.length) return [courseQuestion()];
  const pick = choiceQuestion(
    "courseId",
    "Kurs",
    "📚 Qaysi kursda o'qiysiz? Pastdagi ro'yxatdan tanlang.",
    [
      ...courses.map((course) => ({ value: course.id, label: `📚 ${course.name}`, extra: { course: course.name } })),
      { value: OTHER_COURSE, label: "✍️ Boshqa kurs", extra: { course: "" } },
    ],
  );
  return answers.courseId === OTHER_COURSE ? [pick, courseQuestion()] : [pick];
}

function studentQuestionsFor(answers = {}, session = {}) {
  const doc = answers.docType || "id";
  const common = [fullNameQuestion(), birthdayQuestion(), ...courseQuestions(answers, session.courses)];
  if (doc === "birth") {
    return [
      docTypeQuestion(),
      fileQuestion("birthCertificate", "Tug'ilganlik guvohnomasi", true, "Guvohnomaning yozuvlari aniq ko'rinsin."),
      ...common,
      textQuestion(
        "passportSeries",
        "Guvohnoma seriyasi va raqami",
        "🔤 Tug'ilganlik guvohnomasining seriyasi va raqami (guvohnomada yozilganidek).\nMisol: I-JZ 1234567",
        (v) => /^[A-ZА-ЯЁЎҚҒҲ0-9][A-ZА-ЯЁЎҚҒҲ0-9 \-№]{4,24}$/i.test(v),
        "❌ Seriya va raqamni guvohnomadagidek yozing. Misol: I-JZ 1234567",
        (v) => v.toUpperCase().replace(/\s+/g, " "),
      ),
      issuedQuestion("Guvohnoma", "15.03.2012"),
      textQuestion(
        "passportIssuer",
        "Guvohnomani bergan organ",
        "🏛 Guvohnomani qaysi organ bergan? (guvohnomada yozilganidek)\nMisol: Jizzax shahar FHDYo bo'limi",
        (v) => v.length >= 3 && v.length <= 120,
        "❌ Guvohnomani bergan organni yozing. Misol: Jizzax shahar FHDYo bo'limi",
        capitalizePlace,
      ),
      jshshirQuestion("Guvohnomada yozilgan (14 ta raqam)."),
      addressQuestion(),
      phoneQuestion(),
    ];
  }
  if (doc === "passport") {
    return withOcr(answers, session, [
      docTypeQuestion(),
      fileQuestion(
        "passportFront",
        "Pasportning ochilgan ikki sahifasi",
        true,
        "Pasportni ochib, rasmli sahifani va uning ustidagi «Kim tomonidan berilgan» sahifasini birga — bitta rasmga tushiring. Pastidagi <<< belgili qatorlar ham aniq ko'rinsin.",
      ),
      fileQuestion("passportBack", "Pasportning propiska (ro'yxat) sahifasi", true),
      ...common,
      cardSeriesQuestion("Pasport"),
      issuedQuestion("Pasport", "05.02.2020"),
      textQuestion(
        "passportIssuer",
        "Pasportni bergan organ",
        "🏛 Pasportni kim bergan? (pasportda yozilganidek)\nMisol: Jizzax shahar IIB",
        (v) => v.length >= 3 && v.length <= 120,
        "❌ Pasportni bergan organni yozing. Misol: Jizzax shahar IIB",
        capitalizePlace,
      ),
      jshshirQuestion("Pasportning rasmli sahifasida yozilgan."),
      addressQuestion(),
      phoneQuestion(),
    ]);
  }
  return withOcr(answers, session, [
    docTypeQuestion(),
    fileQuestion("passportFront", "ID karta old tomoni", true, "Ism-familiyangiz aniq ko'rinsin."),
    fileQuestion("passportBack", "ID karta orqa tomoni", true, "Pastidagi <<< belgili qatorlar ham aniq ko'rinsin."),
    ...common,
    cardSeriesQuestion("ID karta"),
    issuedQuestion("ID karta", "05.02.2025"),
    textQuestion(
      "passportIssuer",
      "ID kartani bergan organ",
      "🏛 ID kartani kim bergan? (orqa tomonida yozilgan)\nMisol: IIV 8213",
      (v) => v.length >= 2 && v.length <= 120,
      "❌ ID kartani bergan organni yozing. Misol: IIV 8213",
      capitalizePlace,
    ),
    jshshirQuestion("ID karta orqa tomonida yozilgan."),
    addressQuestion(),
    phoneQuestion(),
  ]);
}

// ---------- Hujjat rasmidan avtomatik o'qilgan ma'lumotlar ----------
export const OCR_FIELDS = [
  ["fullName", "👤 F.I.Sh"],
  ["birthday", "🎂 Tug'ilgan sana"],
  ["passportSeries", "🔤 Seriya va raqam"],
  ["passportIssued", "📅 Berilgan sana"],
  ["passportIssuer", "🏛 Bergan organ"],
  ["jshshir", "🔢 JSHSHIR"],
];
const OK_TEXT = "✅ To'g'ri";

function ocrFound(session) {
  return OCR_FIELDS.filter(([key]) => session?.ocr?.[key]);
}

// Topilgan qiymat bilan savol: "✅ To'g'ri" — o'sha qiymat, yoki o'quvchi to'g'risini yozadi
function prefilled(question, value) {
  return {
    ...question,
    prefill: value,
    text: `${question.text}\n\n🔎 Hujjatdan topildi: ${value}\nTo'g'ri bo'lsa «${OK_TEXT}» tugmasini bosing, aks holda to'g'risini yozing.`,
    check(message, ctx) {
      if (String(message?.text || "").trim() === OK_TEXT) return { ok: true, value };
      return question.check(message, ctx);
    },
  };
}

function withOcr(answers, session, list) {
  const found = ocrFound(session);
  if (!found.length) return list;
  const confirm = choiceQuestion(
    "ocrConfirm",
    "Hujjatdan o'qilgan",
    `🔎 Hujjatingizdan quyidagilar o'qildi:\n\n${found.map(([key, label]) => `${label}: ${session.ocr[key]}`).join("\n")}\n\nHammasi to'g'rimi?${
      found.length < OCR_FIELDS.length ? "\n(Topilmaganlari keyin so'raladi.)" : ""
    }`,
    [
      { value: "accept", label: "✅ Hammasi to'g'ri", extra: Object.fromEntries(found.map(([key]) => [key, session.ocr[key]])) },
      { value: "fix", label: "✏️ Tuzatish" },
    ],
  );
  const lastPhoto = list.map((q) => q.kind).lastIndexOf("file");
  const out = [];
  list.forEach((question, index) => {
    const value = session.ocr[question.id];
    if (value && answers.ocrConfirm === "accept") return; // tasdiqlangan — qayta so'ralmaydi
    out.push(value && answers.ocrConfirm === "fix" ? prefilled(question, value) : question);
    if (index === lastPhoto) out.push(confirm);
  });
  return out;
}

const FLOWS = {
  staff: {
    questions: contractQuestions,
    title: "📄 <b>Xodim shartnomasi</b>",
  },
  student: {
    questions: studentQuestionsFor,
    title: "🎓 <b>O'quvchi shartnomasi</b>",
  },
};

function flowOf(session) {
  return FLOWS[session?.flow] || FLOWS.staff;
}

// O‘quvchi savollari tanlangan hujjat turiga qarab o‘zgaradi
function questionsOf(session) {
  const questions = flowOf(session).questions;
  return typeof questions === "function" ? questions(session?.answers || {}, session || {}) : questions;
}

function keyboardFor(question) {
  if (question.prefill) {
    return { reply_markup: { keyboard: [[{ text: OK_TEXT }]], resize_keyboard: true, one_time_keyboard: true } };
  }
  if (question.kind === "contact") return { reply_markup: phoneKeyboard };
  if (question.kind === "choice") {
    return {
      reply_markup: {
        keyboard: question.options.map((option) => [{ text: option.label }]),
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };
  }
  if ((question.kind === "file" && !question.required) || (question.kind === "text" && question.optional)) {
    return { reply_markup: skipKeyboard };
  }
  return { reply_markup: { remove_keyboard: true } };
}

async function ask(ctx, session) {
  const questions = questionsOf(session);
  const question = questions[session.step];
  await ctx.reply(`(${session.step + 1}/${questions.length}) ${question.text}`, keyboardFor(question));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function contractSummary(answers, questions = contractQuestions) {
  const files = questions
    .filter((q) => q.kind === "file")
    .map((q) => `${answers[q.id] ? "✅" : "➖"} ${q.label}`)
    .join("\n");
  const rows = questions
    .filter((q) => q.kind !== "file" && q.id !== "ocrConfirm" && !(q.kind === "choice" && answers[q.id] === "other"))
    .map((q) => {
      const value = q.kind === "choice" ? q.options.find((o) => o.value === answers[q.id])?.label : answers[q.id];
      return `<b>${q.label}:</b> ${escapeHtml(value || "—")}`;
    })
    .join("\n");
  // Hujjatdan o'qilib tasdiqlangan maydonlar savol bo'lib so'ralmagan — ularni ham ko'rsatamiz
  const asked = new Set(questions.map((q) => q.id));
  const fromDoc = OCR_FIELDS.filter(([key]) => !asked.has(key) && answers[key])
    .map(([key, label]) => `<b>${label.replace(/^\S+\s/, "")}:</b> ${escapeHtml(answers[key])}`)
    .join("\n");
  return `📋 <b>Ma'lumotlaringizni tekshiring</b>\n\n${files}\n\n${fromDoc ? `${fromDoc}\n` : ""}${rows}\n\nHammasi to'g'rimi?`;
}

function newSession(flow) {
  const session = { kind: "contract", flow, step: 0, answers: {} };
  session.questions = questionsOf(session);
  return session;
}

// saveContract / notify — { staff: fn, student: fn }
export function registerContractFlow(bot, { sessions, ack, saveContract, notify, listCourses, readDocument }) {
  // ID karta / pasportning oxirgi rasmi kelgach — rasmlardan ma'lumotlarni o'qib olamiz
  async function runOcr(ctx, session) {
    session.ocr = {};
    const { docType, passportFront, passportBack } = session.answers;
    const usable = (file) => (file && file.kind !== "pdf" ? file : null);
    if (!readDocument || !usable(passportFront)) return;
    await ctx.reply("⏳ Hujjatingiz o'qilmoqda, 10–20 soniya kuting…", { reply_markup: { remove_keyboard: true } });
    try {
      await ctx.sendChatAction("typing").catch(() => {});
      session.ocr = (await readDocument({ docType, front: usable(passportFront), back: usable(passportBack) })) || {};
    } catch (error) {
      console.error("Hujjat o'qilmadi:", error?.message || error);
      session.ocr = {};
    }
    if (!ocrFound(session).length) {
      await ctx.reply("ℹ️ Rasmdan avtomatik o'qib bo'lmadi — ma'lumotlarni o'zingiz yozasiz.");
    }
  }

  async function startSession(flow) {
    const session = newSession(flow);
    if (flow === "student" && listCourses) {
      try {
        session.courses = await listCourses();
      } catch (error) {
        console.error("Kurslar ro'yxati olinmadi:", error?.message || error);
      }
      session.questions = questionsOf(session);
    }
    return session;
  }

  bot.action("contract", async (ctx) => {
    await ack(ctx);
    sessions.delete(ctx.from.id);
    await ctx.reply(
      "📄 <b>Shartnoma qilish</b>\n\nKim uchun shartnoma tuzamiz?",
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("📄 Xodim shartnomasi", "contract:staff")],
          [Markup.button.callback("🎓 O'quvchi shartnomasi", "contract:student")],
        ]),
      },
    );
  });

  bot.action(/^contract:(staff|student)$/, async (ctx) => {
    await ack(ctx);
    const flow = ctx.match[1];
    const session = await startSession(flow);
    sessions.set(ctx.from.id, session);
    await ctx.reply(
      `${FLOWS[flow].title}\n\nHujjatlaringiz rasmlari va pasport ma'lumotlaringizni yuborasiz. Ma'lumotlar pasportdagidek, xatosiz yozilsin.`,
      { parse_mode: "HTML" },
    );
    await ask(ctx, session);
  });

  bot.action("contractRestart", async (ctx) => {
    await ack(ctx);
    const previous = sessions.get(ctx.from.id);
    const session = await startSession(previous?.kind === "contract" ? previous.flow || "staff" : "staff");
    sessions.set(ctx.from.id, session);
    await ctx.reply("🔁 Boshidan boshlaymiz.");
    await ask(ctx, session);
  });

  bot.action("contractConfirm", async (ctx) => {
    await ack(ctx);
    const session = sessions.get(ctx.from.id);
    if (session?.kind !== "contract" || session.step < questionsOf(session).length) {
      await ctx.reply("Iltimos, /start buyrug'ini bosing va «📄 Shartnoma qilish» ni tanlang.");
      return;
    }
    if (session.saving) return;
    session.saving = true;
    const flow = session.flow || "staff";
    try {
      await ctx.editMessageReplyMarkup(undefined).catch(() => {});
      await ctx.reply("⏳ Saqlanmoqda...");
      const result = await saveContract[flow]({
        telegramUserId: ctx.from.id,
        username: ctx.from.username || "",
        answers: session.answers,
      });
      sessions.delete(ctx.from.id);
      await ctx.reply(
        "✅ Rahmat! Ma'lumotlaringiz qabul qilindi. Shartnomangiz tayyorlanadi, tez orada siz bilan bog'lanamiz.",
        { reply_markup: { remove_keyboard: true } },
      );
      try {
        await notify?.[flow]?.(session.answers, result);
      } catch (error) {
        console.error("Shartnoma xabari guruhga yuborilmadi:", error?.message || error);
      }
    } catch (error) {
      session.saving = false;
      console.error("Shartnoma ma'lumotlari saqlanmadi:", error?.message || error);
      await ctx.reply("⚠️ Saqlashda xatolik bo'ldi. Iltimos, «✅ Tasdiqlash» ni qayta bosing.");
    }
  });

  // index.js dagi umumiy xabar ishlovchisi shartnoma sessiyasini shu yerga uzatadi
  return async function handleContractMessage(ctx, session) {
    let questions = questionsOf(session);
    if (session.step >= questions.length) {
      return ctx.reply("Iltimos, yuqoridagi «✅ Tasdiqlash» yoki «🔁 Qaytadan» tugmasini bosing.");
    }
    const question = questions[session.step];
    const result = question.check(ctx.message, ctx);
    if (!result.ok) {
      return ctx.reply(result.error, keyboardFor(question));
    }
    session.answers[question.id] = result.value;
    if (result.extra) Object.assign(session.answers, result.extra);
    session.step += 1;
    const docType = session.answers.docType;
    if (session.flow === "student" && question.id === "passportBack" && (docType === "id" || docType === "passport") && !session.ocr) {
      await runOcr(ctx, session);
    }
    questions = questionsOf(session);
    session.questions = questions;
    if (session.step < questions.length) return ask(ctx, session);

    await ctx.reply("👍 Barcha ma'lumotlar olindi.", { reply_markup: { remove_keyboard: true } });
    return ctx.reply(contractSummary(session.answers, questions), {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("✅ Tasdiqlash", "contractConfirm")],
        [Markup.button.callback("🔁 Qaytadan", "contractRestart")],
      ]),
    });
  };
}
