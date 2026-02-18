import { Telegraf } from "telegraf";
import { config as dotenv } from "dotenv";
import { VALID_POSITIONS, POSITION_KEYBOARD } from "./constants.js";
import { questions } from "./questions.js";
import { checkUserExist, checkUserPositions, connectDB } from "./db.js";

dotenv();

const token = process.env.BOT_TOKEN;
const CHANNEL_OR_GROUP_TOKEN = process.env.CHANNEL_OR_GROUP_TOKEN;

const bot = new Telegraf(token);

const sessions = new Map();

bot.start(async (ctx) => {
  await checkUserExist(ctx.from.id);
  sessions.set(ctx.from.id, { step: 0, answers: {} });
  ctx.reply(
    `Assalomu alaykum! Botimizga xush kelibsiz. \n\n` + questions[0].text,
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
  const canUserApply = await checkUserPositions(
    userId,
    session.answers.position,
  );
  if (canUserApply.status) {
    await sendToRecruiter(ctx, session);
  } else {
    ctx.reply(
      `Siz ${session.answers.position} yo'nalish bo'yicha resume yuborib bo'lgansiz, /start buyrug'ini bosing va boshqa o'zingizga mos yo'nalishni tanlang!`,
    );
  }
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
👔 <b>#${answers.position}</b>
`;

  try {
    await ctx.telegram.sendDocument(CHANNEL_OR_GROUP_TOKEN, answers.photo, {
      caption: msg,
      parse_mode: "HTML",
    });

    ctx.reply("✅ So'rovingiz qabul qilindi! Tez orada siz bilan bog'lanamiz.");
  } catch (error) {
    await ctx.telegram.sendPhoto(CHANNEL_OR_GROUP_TOKEN, answers.photo, {
      caption: msg,
      parse_mode: "HTML",
    });
    ctx.reply("✅ So'rovingiz qabul qilindi! Tez orada siz bilan bog'lanamiz.");
    console.log("catch worked");
  }
  sessions.delete(ctx.from.id);
}

async function startBot() {
  try {
    await connectDB();

    await bot.launch();
    console.log("🤖 Bot is running!");

    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
  } catch (error) {
    console.error("Failed to start bot:", error);
    process.exit(1);
  }
}

startBot();
