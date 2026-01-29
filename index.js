import { Telegraf } from "telegraf";
import { config as dotenv } from "dotenv";

dotenv();

const bot = new Telegraf(process.env.BOT_TOKEN);
// const RECRUITER_GROUP = -1001943551822;
const RECRUITER_GROUP = "@recruting_group";
const sessions = new Map();

const questions = [
  {
    id: "photo",
    text: "Iltimos savollarga birma-bir javob bering. \n Foto suratingizni yuboring. (oxirgi 3oy ichida tushurilgan, faqat JPG formatida)",
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
    text: "Qaysi yo'nalishda ishlay olasiz? (Fan o'qituvchi, admin)",
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 2,
    errorMsg: "❌ Iltimos, yo'nalishni kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "fullName",
    text: "I.F.Sh kiriting: (Ism Familiya Sharif)",
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
    id: "address",
    text: "Doimiy yashash manzilingizni kiriting:",
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 3,
    errorMsg: "❌ Iltimos, manzilingizni to'liq kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "birthday",
    text: "Tug'ilgan sanangizni kiriting (DD-MM-YYYY):",
    type: "text",
    validate: (ctx) => {
      const text = ctx.message?.text?.trim();
      if (!text) return false;

      const regex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(19|20)\d{2}$/;
      return regex.test(text);
    },
    errorMsg:
      "❌ Sana noto‘g‘ri formatda. Iltimos, DD-MM-YYYY ko‘rinishida kiriting.",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "education",
    text: "Ma'lumoti (Oliy, o'rta):",
    type: "text",
    validate: (ctx) => {
      const text = ctx.message?.text.trim().toLowerCase();
      return ["oliy", "o'rta", "orta", "oʻrta"].includes(text);
    },
    errorMsg: "❌ Iltimos, o'rta yoki oliy deb javob bering!",
    extract: (ctx) => {
      const text = ctx.message?.text.trim().toLowerCase();
      return ["oliy", "o'rta", "orta", "Oʻrta", "oʻrta"].includes(text)
        ? text
        : "mavjud emas";
    },
  },
  {
    id: "prevJob",
    text: `Oldingi ish joyingiz va lavozimingiz haqida ma'lumot kiriting:
(qachon, qayerda, kim bo'lib, qancha vaqt)

📌 Misol: 2020-yil, Toshkent, ingliz tili o'qituvchisi, 2 yil`,
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 10,
    errorMsg:
      "❌ Iltimos, oldingi ish joyingiz haqida to'liqroq ma'lumot bering!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "maritalStatus",
    text: "Oilaviy axvolingizni yozing: (turmush qurgan, yoki yo'q)",
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 0,
    errorMsg: "❌ Iltimos, oilaviy axvolingizni kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "computerSkills",
    text: "Kompyuterda ishlay olasizmi? (exsel, word)",
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 0,
    errorMsg: "❌ Iltimos, kompyuter ko'nikmalaringiz haqida yozing!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "lastSalary",
    text: "Oxirgi ishlagan ishingizda oylik maoshingiz: (summa)",
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 0,
    errorMsg: "❌ Iltimos, oxirgi maoshingizni kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "workDuration",
    text: "Bizning korxonada qancha muddat ishlay olasiz?",
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 0,
    errorMsg: "❌ Iltimos, ishlash muddatini kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "parentPhone",
    text: "Otangizni yoki onangizni telefon raqamini kiriting:",
    type: "text",
    validate: (ctx) => {
      const phone = ctx.message?.text?.replace(/\s/g, "") || "";
      return /^\+?\d{9,13}$/.test(phone);
    },
    errorMsg: "❌ Noto'g'ri telefon raqam! Misol: +998901234567",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "languageLevel",
    text: "Til bilish darajangiz: (IELTSda yoki CEFRda)",
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 0,
    errorMsg: "❌ Iltimos, til bilish darajangizni kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "workHours",
    text: "Soat nechidan nechigacha ishlay olasiz?",
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 0,
    errorMsg: "❌ Iltimos, ish vaqtingizni kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "expectedSalary",
    text: "Bizdan qancha oylikga ishlamoqchisiz?",
    type: "text",
    validate: (ctx) => ctx.message?.text && ctx.message.text.trim().length > 0,
    errorMsg: "❌ Iltimos, kutilayotgan maoshingizni kiriting!",
    extract: (ctx) => ctx.message.text.trim(),
  },
  {
    id: "phone",
    text: "Telefon raqamingizni kiriting:",
    type: "contact",
    validate: (ctx) => {
      return ctx.message?.contact?.phone_number !== undefined;
    },
    errorMsg: "❌ Noto'g'ri telefon raqam! Misol: +998901234567",
    extract: (ctx) => ctx.message.contact.phone_number,
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
    // return ctx.reply(questions[session.step].text);
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

💼 <b>Yo'nalish:</b> ${answers.position}
🎓 <b>Ma'lumot:</b> ${answers.education}
🌐 <b>Til darajasi:</b> ${answers.languageLevel}
💻 <b>Kompyuter:</b> ${answers.computerSkills}

📋 <b>Oldingi ish:</b> ${answers.prevJob}
💰 <b>Oxirgi oylik:</b> ${answers.lastSalary}
💵 <b>Kutilayotgan oylik:</b> ${answers.expectedSalary}

💑 <b>Oilaviy holat:</b> ${answers.maritalStatus}
⏰ <b>Ish vaqti:</b> ${answers.workHours}
📅 <b>Ishlash davomiyligi:</b> ${answers.workDuration}

🆔 <b>Telegram username:</b> @${ctx.from.username || "N/A"}
🆔 <b>Telegram id:</b> ${ctx.from.id || "N/A"}
`;

  try {
    await ctx.telegram.sendPhoto(RECRUITER_GROUP, answers.photo, {
      caption: msg,
      parse_mode: "HTML",
    });

    ctx.reply("✅ So'rovingiz qabul qilindi! Tez orada siz bilan bog'lanamiz.");
  } catch (error) {
    console.error("Error sending to recruiter:", error);
    ctx.reply("❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
  }
  sessions.delete(ctx.from.id);
}

bot.launch();
console.log("Bot is up and running!");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
