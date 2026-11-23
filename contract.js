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

function textQuestion(id, label, text, test, error, normalize = (value) => value) {
  return {
    id,
    label,
    kind: "text",
    text,
    check(message) {
      const raw = String(message?.text || "").replace(/\s+/g, " ").trim();
      if (!raw || raw === SKIP_TEXT || !test(raw)) return { ok: false, error };
      return { ok: true, value: normalize(raw) };
    },
  };
}

const fullNameQuestion = () =>
  textQuestion(
    "fullName",
    "F.I.Sh",
    "✍️ Familiya, ism va otangizning ismini pasportdagidek yozing.\nMisol: Olimova Shirinxon Bobur qizi",
    (v) => v.split(" ").length >= 3 && /^[^\d]+$/.test(v),
    "❌ Familiya, ism va otangizning ismini to'liq yozing (kamida 3 so'z, raqamsiz).\nMisol: Olimova Shirinxon Bobur qizi",
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

export const studentQuestions = [
  fileQuestion("passportFront", "Pasport oldi", true, "ID karta bo'lsa — old tomoni."),
  fileQuestion("passportBack", "Pasport orqasi", true, "ID karta bo'lsa — orqa tomoni."),
  fileQuestion("birthCertificate", "Tug'ilganlik guvohnomasi", false),
  fullNameQuestion(),
  birthdayQuestion(),
  textQuestion(
    "course",
    "Kurs",
    "📚 Qaysi kursda o'qiysiz?\nMisol: Ingliz tili, Matematika, IT",
    (v) => v.length >= 2 && v.length <= 80,
    "❌ Kurs nomini yozing. Misol: Ingliz tili",
  ),
  ...passportQuestions(),
  phoneQuestion(),
];

const FLOWS = {
  staff: {
    questions: contractQuestions,
    title: "📄 <b>Xodim shartnomasi</b>",
  },
  student: {
    questions: studentQuestions,
    title: "🎓 <b>O'quvchi shartnomasi</b>",
  },
};

function flowOf(session) {
  return FLOWS[session?.flow] || FLOWS.staff;
}

function keyboardFor(question) {
  if (question.kind === "contact") return { reply_markup: phoneKeyboard };
  if (question.kind === "file" && !question.required) return { reply_markup: skipKeyboard };
  return { reply_markup: { remove_keyboard: true } };
}

async function ask(ctx, session) {
  const { questions } = flowOf(session);
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
    .filter((q) => q.kind !== "file")
    .map((q) => `<b>${q.label}:</b> ${escapeHtml(answers[q.id])}`)
    .join("\n");
  return `📋 <b>Ma'lumotlaringizni tekshiring</b>\n\n${files}\n\n${rows}\n\nHammasi to'g'rimi?`;
}

function newSession(flow) {
  return { kind: "contract", flow, step: 0, answers: {}, questions: FLOWS[flow].questions };
}

// saveContract / notify — { staff: fn, student: fn }
export function registerContractFlow(bot, { sessions, ack, saveContract, notify }) {
  bot.action("contract", async (ctx) => {
    await ack(ctx);
    sessions.delete(ctx.from.id);
    await ctx.reply(
      "📄 <b>Shartnoma qilish</b>\n\nKim uchun shartnoma tuzamiz?",
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("👔 Xodim (ishga kirgan)", "contract:staff")],
          [Markup.button.callback("🎓 O'quvchilar shartnoma qilish", "contract:student")],
        ]),
      },
    );
  });

  bot.action(/^contract:(staff|student)$/, async (ctx) => {
    await ack(ctx);
    const flow = ctx.match[1];
    const session = newSession(flow);
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
    const session = newSession(previous?.kind === "contract" ? previous.flow || "staff" : "staff");
    sessions.set(ctx.from.id, session);
    await ctx.reply("🔁 Boshidan boshlaymiz.");
    await ask(ctx, session);
  });

  bot.action("contractConfirm", async (ctx) => {
    await ack(ctx);
    const session = sessions.get(ctx.from.id);
    if (session?.kind !== "contract" || session.step < flowOf(session).questions.length) {
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
    const { questions } = flowOf(session);
    if (session.step >= questions.length) {
      return ctx.reply("Iltimos, yuqoridagi «✅ Tasdiqlash» yoki «🔁 Qaytadan» tugmasini bosing.");
    }
    const question = questions[session.step];
    const result = question.check(ctx.message, ctx);
    if (!result.ok) {
      return ctx.reply(result.error, keyboardFor(question));
    }
    session.answers[question.id] = result.value;
    session.step += 1;
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
