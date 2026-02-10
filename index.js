import { Telegraf } from "telegraf";
import { config as dotenv } from "dotenv";
import { VALID_POSITIONS, POSITION_KEYBOARD } from "./constants.js";

dotenv();

const token = process.env.BOT_TOKEN;

const bot = new Telegraf(token);
const RECRUITER_GROUP = -1003769309292;
const sessions = new Map();

const questions = [
  {
    id: "photo",
    text: `📝 Iltimos, savollarga birma-bir javob bering.

    📸 1) Foto suratingizni yuboring

    ⚠️ Diqqat:
    • Galereyadan eski rasm yubormang❗
    • Rasmni bevosita kameradan olish majburiy❗
    • Yuzingiz aniq va yorug‘ ko‘rinsin
    • Rasm sifatli bo‘lishi kerak
    `,
    type: "photo",
    validate: (ctx) => {
      if (ctx.message?.photo) return true;

      if (ctx.message?.document) {
        const mimeType = ctx.message.document.mime_type;
        const fileName = ctx.message.document.file_name?.toLowerCase() || "";

        return (
          mimeType === "image/jpg" ||
          mimeType === "image/jpeg" ||
          fileName.endsWith(".jpg") ||
          fileName.endsWith(".jpeg")
        );
      }

      return false;
    },
    errorMsg: "❌ Iltimos, faqat JPG formatidagi rasm yuboring!",
    extract: (ctx) => {
      if (ctx.message.photo) {
        return ctx.message.photo[ctx.message.photo.length - 1].file_id;
      }
      return ctx.message.document.file_id;
    },
  },
  {
    id: "position",
    text: "2) Qaysi yo'nalishda ishlay olasiz? (Fan o'qituvchi, admin)",
    type: "text",
    validate: (ctx) => {
      if (!ctx.message?.text) return false;
      const text = ctx.message.text.trim();
      return VALID_POSITIONS.includes(text);
    },
    errorMsg: "❌ Iltimos, yo'nalishni kiriting!",
    extract: (ctx) => {
      return ctx.message.text.replace(/\s+/g, " ").trim();
    },
  },
  {
    id: "fullName",
    text: "3) I.F.Sh kiriting: (Ism Familiya Sharif)",
    type: "text",
    validate: (ctx) => {
      const parts = ctx.message?.text?.trim().split(/\s+/) || [];
      return parts.length >= 2;
    },
    errorMsg:
      "❌ Iltimos, to'liq ismingizni kiriting (kamida Ism va Familiya)!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "birthday",
    text: "4) Tug'ilgan sanangizni kiriting (DD.MM.YYYY):",
    type: "text",
    validate: (ctx) => {
      const text = ctx.message?.text?.trim();
      if (!text) return false;

      const regex = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(19|20)\d{2}$/;
      return regex.test(text);
    },
    errorMsg:
      "❌ Sana noto‘g‘ri formatda. Iltimos, DD.MM.YYYY ko‘rinishida kiriting.",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "nation",
    text: "5) Millatingizni kiring: ",
    type: "text",
    validate: (ctx) => {
      return ctx.message?.text;
    },
    errorMsg: "❌ Iltimos, millatingizni kiring!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "address",
    text: `6) Doimiy yashash manzilingiz
    (Viloyat, tuman, mahalla, ko‘cha, uy raqami)

    📌 Misol:
    Toshkent viloyati, Chirchiq shahri, Navbahor mahallasi, Mustaqillik ko‘chasi, 25-uy`,
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 3,
    errorMsg: "❌ Iltimos, manzilingizni to'liq kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "education",
    text: "7) Ma'lumoti (Oliy, o'rta, tugallanmagan oliy):",
    type: "text",
    validate: (ctx) => {
      const text = ctx.message?.text?.trim().toLowerCase();
      const valid = ["oliy", "o'rta", "orta", "oʻrta", "tugallanmagan oliy"];
      return valid.some((v) => text.includes(v));
    },
    errorMsg: "❌ Iltimos, o'rta yoki oliy deb javob bering!",
    extract: (ctx) => {
      const text = ctx.message?.text.trim().toLowerCase();
      return [
        "oliy",
        "o'rta",
        "orta",
        "Oʻrta",
        "oʻrta",
        "tugallanmagan oliy",
      ].includes(text)
        ? text
        : "mavjud emas";
    },
  },
  {
    id: "university",
    text: `8) O‘qiyotgan yoki tugatgan oliygohingizni kiriting
    (Oliygoh nomi → yo‘nalish → kursi yoki tugatgan yili ketma-ketlikda yozing)

    📌 Misol:
     • Toshkent davlat iqtisodiyot universiteti → Iqtisodiyot → 3-kurs
     • Samarqand davlat universiteti → Matematika → 2022-yilda tugatgan`,
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 0,
    errorMsg: "❌ Iltimos, oxirgi maoshingizni kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "prevJob",
    text: `9) Oldingi ish tajribangiz
    (Har bir ish joyini alohida qatorda quyidagi tartibda yozing: ish boshlagan va tugatgan yili, tashkilot nomi va joylashuvi, lavozimi, ish muddati)

    📌 Misol:
     1. 2020–2022 — “ABC Education” o‘quv markazi (Toshkent), ingliz tili o‘qituvchisi — 2 yil
     2. 2022–2024 — “XYZ School” (Samarqand), administrator — 1,5 yil`,
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 10,
    errorMsg:
      "❌ Iltimos, oldingi ish joyingiz haqida to'liqroq ma'lumot bering!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "maritalStatus",
    text: "10) Oilaviy axvolingizni yozing: (turmush qurgan, yoki yo'q)",
    type: "text",
    validate: (ctx) => {
      const text = ctx.message?.text?.trim().toLowerCase();
      const valid = ["turmush qurgan", "turmush qurmagan", "ajrashgan"];
      return valid.some((v) => text.includes(v));
    },
    errorMsg: "❌ Iltimos, oilaviy axvolingizni kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "computerSkills",
    text: "11) Kompyuterda ishlay olasizmi?",
    type: "text",
    validate: (ctx) => {
      const text = ctx.message?.text?.trim().toLowerCase() || "";
      const valid = ["ha", "yo'q", "yaxshi", "o'rtacha", "boshlang'ich"];
      return valid.some((v) => text.includes(v));
    },
    errorMsg: "❌ Iltimos, pastdagi tugmalardan birini tanlang!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "lastSalary",
    text: "12) Oxirgi ishlagan ishingizda oylik maoshingiz: (summa)",
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 0,
    errorMsg: "❌ Iltimos, oxirgi maoshingizni kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "workDuration",
    text: "13) Bizning korxonada qancha muddat ishlay olasiz?",
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 0,
    errorMsg: "❌ Iltimos, ishlash muddatini kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "parentPhone",
    text: "14) Otangizni yoki onangizni telefon raqamini kiriting:",
    type: "text",
    validate: (ctx) => {
      const phone = ctx.message?.text?.replace(/\s/g, "") || "";
      return /^\+?\d{9,13}$/.test(phone);
    },
    errorMsg: "❌ Noto'g'ri telefon raqam! Misol: +998901234567 yoki 901234567",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "languageLevel",
    text: "15) Til bilish darajangiz: (IELTSda yoki CEFRda)",
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 0,
    errorMsg: "❌ Iltimos, til bilish darajangizni kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "workHours",
    text: `16) Soat nechidan nechigacha ishlay olasiz?

    📌 Misol:
    09:00 dan 14:00 gacha
    yoki
    14:00 dan 20:00 gacha`,
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 0,
    errorMsg: "❌ Iltimos, ish vaqtingizni kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "expectedSalary",
    text: "17) Bizdan qancha oylikga ishlamoqchisiz?",
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 0,
    errorMsg: "❌ Iltimos, kutilayotgan maoshingizni kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "phone",
    text: "18) Telefon raqamingizni kiriting:",
    type: "contact",
    validate: (ctx) => {
      return (
        ctx.message?.contact?.phone_number !== undefined ||
        ctx.message?.text !== undefined
      );
    },
    errorMsg: "❌ Noto'g'ri telefon raqam! Misol: +998901234567 yoki 901234567",
    extract: (ctx) => {
      if (ctx.message?.contact?.phone_number) {
        return ctx.message.contact.phone_number;
      }

      if (ctx.message?.text) {
        return ctx.message.text.trim();
      }

      return null;
    },
  },
  {
    id: "foundResource",
    text: `
    Ish e’lonini aynan qaysi kanal yoki sahifadan ko‘rdingiz?

    📌 Misol:
     • telegram:@nomi
     • Instagram: @nomi
    `,
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 0,
    errorMsg: "❌ Iltimos, oxirgi maoshingizni kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
];

bot.start((ctx) => {
  sessions.set(ctx.from.id, { step: 0, answers: {} });
  ctx.reply(
    "Assalomu alaykum! Botimizga xush kelibsiz.\n\n" + questions[0].text,
  );
});

bot.on("message", async (ctx) => {
  if (ctx.chat.type === "group" || ctx.chat.type === "supergroup") {
    console.log("Group ID:", ctx.chat.id);
    console.log("Group Title:", ctx.chat.title);
    return;
  }

  if (ctx.chat.type !== "private") {
    return;
  }

  const userId = ctx.from.id;
  const session = sessions.get(userId);

  if (!session) {
    return ctx.reply("Iltimos, /start buyrug'ini bosing.");
  }

  const currentQuestion = questions[session.step];

  if (!currentQuestion.validate(ctx)) {
    return ctx.reply(currentQuestion.errorMsg);
  }

  session.answers[currentQuestion.id] = currentQuestion.extract(ctx);
  session.step++;

  if (session.step < questions.length) {
    const nextQuestion = questions[session.step];

    if (nextQuestion.type === "contact") {
      return ctx.reply(nextQuestion.text, {
        reply_markup: {
          keyboard: [
            [
              {
                text: "📞 Telefon raqamni ulashish",
                request_contact: true,
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
    }

    if (nextQuestion.id === "computerSkills") {
      return ctx.reply(nextQuestion.text, {
        reply_markup: {
          keyboard: [
            [{ text: "✅ Ha, yaxshi bilaman" }],
            [{ text: "📊 O'rtacha" }],
            [{ text: "🔰 Boshlang'ich" }],
            [{ text: "❌ Yo'q, bilmayman" }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
    }

    if (nextQuestion.id === "position") {
      return ctx.reply(nextQuestion.text, {
        reply_markup: {
          keyboard: POSITION_KEYBOARD,
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
    }

    if (nextQuestion.id === "education") {
      return ctx.reply(nextQuestion.text, {
        reply_markup: {
          keyboard: [
            [{ text: "Oliy" }],
            [{ text: "O'rta" }],
            [{ text: "Tugallanmagan oliy" }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
    }

    if (nextQuestion.id === "maritalStatus") {
      return ctx.reply(nextQuestion.text, {
        reply_markup: {
          keyboard: [
            [{ text: "Turmush qurmagan" }],
            [{ text: "Turmush qurgan" }],
            [{ text: "Ajrashgan" }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
    }

    return ctx.reply(nextQuestion.text, {
      reply_markup: { remove_keyboard: true },
    });
  }

  await sendToRecruiter(ctx, session);
});

async function sendToRecruiter(ctx, session) {
  const answers = session.answers;

  const msg = `
📩 <b>Yangi ish so'rov</b>

👤 <b>I.F.Sh:</b> ${answers.fullName}
🗓️ <b>Tug'ilgan sanasi:</b> ${answers.birthday}
📍 <b>Manzil:</b> ${answers.address}
📞 <b>Telefon:</b> ${answers.phone}
👨‍👩‍👦 <b>Ota-ona telefoni:</b> ${answers.parentPhone}
🌍 <b>Millati:</b> ${answers.nation}

💼 <b>Yo'nalish:</b> ${answers.position}
🎓 <b>Ma'lumot:</b> ${answers.education}
🎓 <b>Oliygoh nomi:</b> ${answers.university}
🌐 <b>Til darajasi:</b> ${answers.languageLevel}
💻 <b>Kompyuter:</b> ${answers.computerSkills}

📋 <b>Oldingi ish:</b> ${answers.prevJob}
💰 <b>Oxirgi oylik:</b> ${answers.lastSalary}
💵 <b>Kutilayotgan oylik:</b> ${answers.expectedSalary}

💑 <b>Oilaviy holat:</b> ${answers.maritalStatus}
⏰ <b>Ish vaqti:</b> ${answers.workHours}
📅 <b>Ishlash davomiyligi:</b> ${answers.workDuration}
🌐 <b>Ishni topgan manbalar: #${answers.foundResource}</b>

🆔 <b>Telegram username:</b> @${ctx.from.username || "N/A"}
🆔 <b>Telegram id:</b> ${ctx.from.id || "N/A"}
   <b>#${answers.position}</b>
`;

  try {
    await ctx.telegram.sendDocument(RECRUITER_GROUP, answers.photo, {
      caption: msg,
      parse_mode: "HTML",
    });

    ctx.reply("✅ So'rovingiz qabul qilindi! Tez orada siz bilan bog'lanamiz.");
  } catch (error) {
    await ctx.telegram.sendPhoto(RECRUITER_GROUP, answers.photo, {
      caption: msg,
      parse_mode: "HTML",
    });
    ctx.reply("✅ So'rovingiz qabul qilindi! Tez orada siz bilan bog'lanamiz.");
    console.log("catch worked");
  }
  sessions.delete(ctx.from.id);
}

bot.launch();
console.log("Bot is up and running!");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
