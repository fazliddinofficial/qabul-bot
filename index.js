import https from "https";
import { Markup, Telegraf } from "telegraf";
import { config as dotenv } from "dotenv";
import { POSITION_KEYBOARD } from "./constants.js";
import {
  completedEducationQuestions,
  incompleteEducationQuestions,
  questions,
} from "./questions.js";
import { addJobToUser, connectDb, createUser, getUserById, saveApplication } from "./db.js";
import { startWeb } from "./web/server.js";
import { CronosExpression, CronosTask } from "cronosjs";

dotenv();

const token = process.env.BOT_TOKEN;
const CHANNEL_OR_GROUP_TOKEN = process.env.CHANNEL_OR_GROUP_TOKEN;

const bot = new Telegraf(token, {
  telegram: {
    agent: new https.Agent({ keepAlive: false }),
  },
});

const originalCallApi = bot.telegram.callApi.bind(bot.telegram);
bot.telegram.callApi = async (method, payload, options) => {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await originalCallApi(method, payload, options);
    } catch (error) {
      lastError = error;
      const message = error?.message || "";
      const transient = /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ECONNREFUSED|socket hang up|FetchError|network/i.test(message);
      if (!transient || attempt === 3 || error?.name === "AbortError") throw error;
      console.error(`${method} qayta uriniladi (${attempt}/3):`, message);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError;
};

const sessions = new Map();

async function ack(ctx) {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("Tugma javobi yuborilmadi:", error.message);
  }
}

const expression4h = CronosExpression.parse("0 0 */10 * * *");

// Check once an hour; the message itself goes out only at 09:00 Tashkent.
const dailyStatusExpression = CronosExpression.parse("0 0 * * * *");

const task2 = new CronosTask(dailyStatusExpression);

const task = new CronosTask(expression4h);

const botStartedAt = Date.now();
const STATUS_CHAT_ID = "1328121428";
let lastDailyStatusDate = "";

process.on("unhandledRejection", (err) => {
  console.error("🔥 Unhandled rejection:", err.message);
});

task.on("run", async () => {
  console.log("🔍 Checking inactive users at:", new Date().toLocaleString());
  await checkInactiveUsers();
});

task2.on("run", async () => {
  await sendDailyStatus();
});

task.start();

task2.start();

function normalizePhone(num) {
  let digits = (num || "").replace(/\D/g, "");
  if (digits.length > 9) {
    digits = digits.slice(-9);
  }
  return digits;
}

function phonesMatch(a, b) {
  const left = normalizePhone(a);
  const right = normalizePhone(b);
  return Boolean(left && right && left === right);
}

const phoneKeyboard = {
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
};

function formatUptime(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days} kun`);
  if (hours) parts.push(`${hours} soat`);
  parts.push(`${minutes} daqiqa`);
  return parts.join(" ");
}

function tashkentNow(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tashkent",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    label: date.toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" }),
  };
}

async function sendDailyStatus() {
  const now = tashkentNow();
  if (now.hour !== 9 || lastDailyStatusDate === now.dateKey) return;

  console.log("Sending daily bot status.");
  const openApplications = [...sessions.values()].filter((session) => {
    const total = session.questions?.length || questions.length;
    return session.step < total;
  }).length;

  try {
    await bot.telegram.sendMessage(
      STATUS_CHAT_ID,
      `📊 <b>Kunlik bot holati</b>\n\n` +
        `✅ Bot ishlayapti\n` +
        `📅 ${now.label}\n` +
        `⏱ Uzluksiz ishlagan: ${formatUptime(Date.now() - botStartedAt)}\n` +
        `📝 Tugallanmagan arizalar: ${openApplications}`,
      { parse_mode: "HTML" },
    );
    lastDailyStatusDate = now.dateKey;
  } catch (err) {
    console.error(`❌ Daily status failed: ${err.message}`);
  }
}

async function checkInactiveUsers() {
  for (const [userId, session] of sessions.entries()) {
    const progress = Math.round((session.step / questions.length) * 100);

    if (session.step >= questions.length) {
      console.log(`⏭️ User ${userId}: Form already completed`);
      sessions.delete(userId);
      continue;
    }

    try {
      await bot.telegram.sendMessage(
        userId,
        `⏰ <b>Eslatma!</b>\n\n` +
          `Arizangiz tugallanmagan.\n` +
          `📊 Progress: ${progress}% (${session.step}/${questions.length})\n\n` +
          `Davom etish uchun javob yuboring!`,
        { parse_mode: "HTML" },
      );
      console.log(`✅ Reminded user ${userId}`);
    } catch (err) {
      console.error(`❌ Failed to message ${userId}: ${err.message}`);

      if (
        err.description?.includes("bot was blocked") ||
        err.description?.includes("chat not found") ||
        err.description?.includes("user is deactivated")
      ) {
        console.log(`🗑️ Removing unreachable user ${userId} from sessions`);
        sessions.delete(userId);
      }
    }
  }
}

bot.start(async (ctx) => {
  try {
    sessions.set(ctx.from.id, {
      step: 0,
      answers: {},
      questions: [...questions],
    });

    await ctx.reply(
      `Assalomu alaykum! Botimizga xush kelibsiz. Botimizdan ishga birinchi marta topshirayapsizmi?`,
      Markup.inlineKeyboard([
        Markup.button.callback("✅ Ha, birinchi marta", "firstTime"),
        Markup.button.callback("❌ Yo'q, avval topshirganman", "secondTime"),
      ]),
    );
  } catch (error) {
    console.log(`❌ Start failed for ${ctx.from.id}: ${error.message}`);
    sessions.delete(ctx.from.id);
  }
});

bot.action("firstTime", async (ctx) => {
  await ack(ctx);
  const session = sessions.get(ctx.from.id);
  if (!session) {
    await ctx.reply("Iltimos, /start buyrug'ini bosing.");
    return;
  }

  let firstQuestion = questions[0];
  await ctx.reply(firstQuestion.text);
});

bot.action("secondTime", async (ctx) => {
  await ack(ctx);
  sessions.delete(ctx.from.id);
  await ctx.reply(
    "Agar oldin ishga topshirgan bo'lsangiz tez orada siz bilan bog'lanamiz✅",
  );
});

bot.action("oliy", async (ctx) => {
  await ack(ctx);
  const session = sessions.get(ctx.from.id);
  if (!session) {
    await ctx.reply("Iltimos, /start buyrug'ini bosing.");
    return;
  }

  session.answers["education"] = "Oliy";
  session.questions = [
    ...questions.slice(0, 6),
    ...completedEducationQuestions,
    ...questions.slice(7),
  ];
  session.step = 6;

  await ctx.reply(completedEducationQuestions[0].text, {
    reply_markup: { remove_keyboard: true },
  });
});
bot.action("orta", async (ctx) => {
  await ack(ctx);
  const session = sessions.get(ctx.from.id);
  if (!session) {
    await ctx.reply("Iltimos, /start buyrug'ini bosing.");
    return;
  }

  session.answers["education"] = "o'rta";
  session.questions = [
    ...questions.slice(0, 6),
    ...completedEducationQuestions,
    ...questions.slice(7),
  ];
  session.step = 6;

  await ctx.reply(completedEducationQuestions[0].text, {
    reply_markup: { remove_keyboard: true },
  });
});
bot.action("incomplete", async (ctx) => {
  await ack(ctx);
  const session = sessions.get(ctx.from.id);
  if (!session) {
    await ctx.reply("Iltimos, /start buyrug'ini bosing.");
    return;
  }

  session.answers["education"] = "Tugallanmagan oliy";

  session.questions = [
    ...questions.slice(0, 6),
    ...incompleteEducationQuestions,
    ...questions.slice(7),
  ];
  session.step = 6;

  await ctx.reply(incompleteEducationQuestions[0].text, {
    reply_markup: { remove_keyboard: true },
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

  const extractedValue = currentQuestion.extract(ctx);

  if (
    currentQuestion.id === "phone" &&
    phonesMatch(extractedValue, session.answers.parentPhone)
  ) {
    return ctx.reply(
      "❌ Bu raqam qo'shimcha yoki ota-ona raqamingiz bilan bir xil! Iltimos, o'zingizning shaxsiy raqamingizni kiriting.",
      { reply_markup: phoneKeyboard },
    );
  }

  session.answers[currentQuestion.id] = extractedValue;
  if (currentQuestion.id === "photo") {
    session.answers.photoKind = ctx.message?.photo ? "photo" : "document";
  }
  session.step++;

  if (session.step < session.questions.length) {
    const nextQuestion = session.questions[session.step];

    if (nextQuestion.type === "contact") {
      return ctx.reply(nextQuestion.text, {
        reply_markup: phoneKeyboard,
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
      return ctx.reply(
        nextQuestion.text,
        Markup.inlineKeyboard([
          Markup.button.callback("Oliy", "oliy"),
          Markup.button.callback(`O'rta`, "orta"),
          Markup.button.callback("Tugallanmagan oliy", "incomplete"),
        ]),
      );
    }

    if (nextQuestion.id === "workHours") {
      return ctx.reply(nextQuestion.text, {
        reply_markup: {
          keyboard: [
            [{ text: "1-smena" }],
            [{ text: "2-smena" }],
            [{ text: "to'liq smena" }],
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

  const jobs = Array.isArray(session.answers.position)
    ? session.answers.position
    : [session.answers.position];

  const foundUser = await getUserById(userId);

  if (!foundUser) {
    await createUser({
      userId,
      jobsTitle: jobs,
    });
    sessions.delete(ctx.from.id);
  } else {
    const user = foundUser.jobsTitle.includes(session.answers.position);
    if (user) {
      ctx.reply(`Siz bu yo'nalishda allaqachon ishga topshirib bo'lgansiz`);
      sessions.delete(ctx.from.id);
      return;
    } else {
      await addJobToUser(userId, session.answers.position);
      await persistApplication(ctx, session);
      await sendToRecruiter(ctx, session);
      sessions.delete(ctx.from.id);
      return;
    }
  }

  await persistApplication(ctx, session);
  await sendToRecruiter(ctx, session);
  sessions.delete(ctx.from.id);
});

async function persistApplication(ctx, session) {
  try {
    await saveApplication({
      telegramUserId: ctx.from.id,
      username: ctx.from.username || "",
      answers: session.answers,
    });
  } catch (error) {
    console.error("Ariza bazaga yozilmadi:", error.message);
  }
}

function splitTelegramText(text, limit = 4000) {
  const parts = [];
  let rest = String(text || "");
  while (rest.length > limit) {
    let cut = rest.lastIndexOf("\n", limit);
    if (cut < Math.floor(limit / 2)) cut = limit;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n/, "");
  }
  if (rest.trim()) parts.push(rest);
  return parts;
}

async function sendRecruitmentFile(ctx, fileId, opts, asDocument) {
  if (asDocument) {
    await ctx.telegram.sendDocument(CHANNEL_OR_GROUP_TOKEN, fileId, opts);
    return;
  }
  await ctx.telegram.sendPhoto(CHANNEL_OR_GROUP_TOKEN, fileId, opts);
}

async function sendRecruitmentText(ctx, text) {
  let sent = false;
  for (const part of splitTelegramText(text)) {
    try {
      await ctx.telegram.sendMessage(CHANNEL_OR_GROUP_TOKEN, part, {
        parse_mode: "HTML",
      });
      sent = true;
    } catch (error) {
      console.error(
        "Matn yuborilmadi:",
        error.response?.description || error.message,
      );
      try {
        await ctx.telegram.sendMessage(CHANNEL_OR_GROUP_TOKEN, part);
        sent = true;
      } catch (err2) {
        console.error(
          "Matn qayta yuborilmadi:",
          err2.response?.description || err2.message,
        );
      }
    }
  }
  return sent;
}

async function sendToRecruiter(ctx, session) {
  const answers = session.answers;

  const msg = `
📩 <b>Yangi ish so'rov</b>

👔 <b>#${answers.position}</b>
👤 <b>I.F.Sh:</b> ${answers.fullName}
🗓️ <b>Tug'ilgan sanasi:</b> ${answers.birthday}
📍 <b>Manzil:</b> ${answers.address}
📞 <b>Telefon:</b> ${normalizePhone(answers.phone)}
👨‍👩‍👦 <b>Qo'shimcha yoki ota-ona telefoni:</b> ${normalizePhone(answers.parentPhone)}
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
`;

  const caption = `📩 <b>Yangi ish so'rov</b>\n👤 ${answers.fullName || ""}\n👔 ${answers.position || ""}`.slice(0, 1000);
  const opts = { caption, parse_mode: "HTML" };
  const preferDocument = answers.photoKind === "document";
  let sent = false;

  try {
    await sendRecruitmentFile(ctx, answers.photo, opts, preferDocument);
    sent = true;
  } catch (error) {
    console.error(
      "Rasm yuborilmadi:",
      error.response?.description || error.message,
    );
    try {
      await sendRecruitmentFile(ctx, answers.photo, opts, !preferDocument);
      sent = true;
    } catch (err2) {
      console.error(
        "Rasm qayta yuborilmadi:",
        err2.response?.description || err2.message,
      );
    }
  }

  const textSent = await sendRecruitmentText(ctx, msg);

  if (sent || textSent) {
    ctx.reply("✅ So'rovingiz qabul qilindi! Tez orada siz bilan bog'lanamiz.");
  } else {
    ctx.reply(
      "⚠️ Faylni yuborishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
    );
  }

  sessions.delete(ctx.from.id);
}

if (!process.env.DASHBOARD_TOKEN) {
  console.error("DASHBOARD_TOKEN yo'q");
  process.exit(1);
}

try {
  await connectDb(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/qabul");
} catch (error) {
  console.error("MongoDB ulanmadi:", error.message);
  process.exit(1);
}

await startWeb();

bot.catch((error) => {
  console.error("Bot xatosi, ishlashda davom etadi:", error?.message || error);
});

let stopping = false;

async function runBot() {
  while (!stopping) {
    try {
      await bot.launch();
    } catch (error) {
      console.error("Bot uzildi:", error?.message || error);
    }
    if (stopping) break;
    console.error("Bot 5 soniyadan keyin qayta ulanadi");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

runBot();
console.log("🤖 Bot is running!");

process.once("SIGINT", () => {
  stopping = true;
  bot.stop("SIGINT");
});
process.once("SIGTERM", () => {
  stopping = true;
  bot.stop("SIGTERM");
});
