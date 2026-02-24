import { Markup, Telegraf } from "telegraf";
import { config as dotenv } from "dotenv";
import { POSITION_KEYBOARD } from "./constants.js";
import { completedEducationQuestions, incompleteEducationQuestions, questions } from "./questions.js";
import { addJobToUser, createUser, getUserById } from "./db.js";
import { CronosExpression, CronosTask } from "cronosjs"

dotenv();

const token = process.env.BOT_TOKEN;
const CHANNEL_OR_GROUP_TOKEN = process.env.CHANNEL_OR_GROUP_TOKEN;

const bot = new Telegraf(token);


const sessions = new Map();

const expression4h = CronosExpression.parse("0 0 */10 * * *");

const task = new CronosTask(expression4h);

task.on('run', async () => {
  console.log('🔍 Checking inactive users at:', new Date().toLocaleString());
  await checkInactiveUsers();
});

task.start();

async function checkInactiveUsers() {
  for (const [userId, session] of sessions.entries()) {
    const progress = Math.round((session.step / questions.length) * 100);
    if (session.step >= questions.length) {
      console.log(`⏭️ User ${userId}: Form already completed`);
      continue
    }
    await bot.telegram.sendMessage(
      userId,
      `⏰ <b>Eslatma!</b>\n\n` +
      `Arizangiz tugallanmagan.\n` +
      `📊 Progress: ${progress}% (${session.step}/${questions.length})\n\n` +
      `Davom etish uchun javob yuboring!`,
      { parse_mode: 'HTML' }
    );
  }
}


bot.start(async (ctx) => {
  sessions.set(ctx.from.id, { step: 0, answers: {} , questions: [...questions]});
  ctx.reply(
    `Assalomu alaykum! Botimizga xush kelibsiz. Botimizdan ishga birinchi marta topshirayapsizmi?`,
    Markup.inlineKeyboard([
      Markup.button.callback("✅ Ha, birinchi marta", "firstTime"),
      Markup.button.callback("❌ Yo'q, avval topshirganman", "secondTime"),
    ]),
  );
});

bot.action("firstTime", async (ctx) => {
  await ctx.answerCbQuery();
  const session = sessions.get(ctx.from.id);
  if (!session) return;

  let firstQuestion = questions[0];
  ctx.reply(firstQuestion.text);
});

bot.action("secondTime", async (ctx) => {
  await ctx.answerCbQuery();
  sessions.delete(ctx.from.id);
  ctx.reply(
    "Agar oldin ishga topshirgan bo'lsangiz tez orada siz bilan bog'lanamiz✅",
  );
});

bot.action("oliy", async (ctx) => {
  await ctx.answerCbQuery();
  const session = sessions.get(ctx.from.id);
  if (!session) return;

  session.answers["education"] = "Oliy";
  session.questions = [...questions.slice(0, 6), ...completedEducationQuestions, ...questions.slice(7)];
  session.step = 6; 

  ctx.reply(completedEducationQuestions[0].text, {
    reply_markup: { remove_keyboard: true }
  });
});
bot.action("orta", async (ctx) => {
  await ctx.answerCbQuery();
  const session = sessions.get(ctx.from.id);
  if (!session) return;

  session.answers["education"] = "Oliy";
  session.questions = [...questions.slice(0, 6), ...completedEducationQuestions, ...questions.slice(7)];
  session.step = 6; 

  ctx.reply(completedEducationQuestions[0].text, {
    reply_markup: { remove_keyboard: true }
  });
});
bot.action("incomplete", async (ctx) => {
  await ctx.answerCbQuery();
  const session = sessions.get(ctx.from.id);
  if (!session) return;

  session.answers["education"] = "Tugallanmagan oliy";

  session.questions = [...questions.slice(0, 6), ...incompleteEducationQuestions, ...questions.slice(7)];
  session.step = 6; 

  ctx.reply(incompleteEducationQuestions[0].text, {
    reply_markup: { remove_keyboard: true }
  });
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

  const currentQuestion = session.questions[session.step];

  if (!currentQuestion.validate(ctx)) {
    return ctx.reply(currentQuestion.errorMsg);
  }

  session.answers[currentQuestion.id] = currentQuestion.extract(ctx);
  session.step++;

  if (session.step < session.questions.length) {
    const nextQuestion = session.questions[session.step];

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
      return ctx.reply(nextQuestion.text,
        Markup.inlineKeyboard([
          Markup.button.callback('Oliy', 'oliy'),
          Markup.button.callback(`O'rta`, 'orta'),
          Markup.button.callback('Tugallanmagan oliy', 'incomplete'),
        ])
      );
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

  const jobs = Array.isArray(session.answers.position)
    ? session.answers.position
    : [session.answers.position];

  const foundUser = getUserById(userId);

  if (!foundUser) {
    createUser({
      userId,
      jobsTitle: jobs
    });
    sessions.delete(ctx.from.id);
  } else {
    const user = foundUser.jobsTitle.includes(session.answers.position);
    if (user) {
      ctx.reply(`Siz bu yo'nalishda allaqachon ishga topshirib bo'lgansiz`);
      sessions.delete(ctx.from.id);
      return;
    } else {
      addJobToUser(userId, session.answers.position);
      await sendToRecruiter(ctx, session);
      sessions.delete(ctx.from.id);
      return;
    }
  }

  await sendToRecruiter(ctx, session);
  sessions.delete(ctx.from.id);
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
🎓 <b>Oliygoh nomi va yo'nalishi:</b> ${answers.institution}
🎓 <b>Tugatish yoki tugallagan yil:</b> ${answers.graduationYear}
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

bot.launch();
console.log("🤖 Bot is running!");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
