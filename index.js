import https from "https";
import { Markup, Telegraf } from "telegraf";
import { config as dotenv } from "dotenv";
import { POSITION_KEYBOARD } from "./constants.js";
import {
  completedEducationQuestions,
  incompleteEducationQuestions,
  questions,
  WORK_SHIFTS,
  isOwnContact,
} from "./questions.js";
import { addJobToUser, connectDb, createUser, getUserById, saveApplication, saveContractSubmission, saveStudentContract, listStudentCourses } from "./db.js";
import { registerContractFlow } from "./contract.js";
import { startWeb } from "./web/server.js";
import { CronosExpression, CronosTask } from "cronosjs";

dotenv();

const token = process.env.BOT_TOKEN;
const CHANNEL_OR_GROUP_TOKEN = process.env.CHANNEL_OR_GROUP_TOKEN;

// Ulanishlar qayta ishlatiladi: har javob uchun yangi TLS ulanish ochilmaydi (tezroq).
// Eskirgan ulanishdan chiqadigan ECONNRESET quyidagi qayta urinish bilan yopiladi.
const bot = new Telegraf(token, {
  telegram: {
    agent: new https.Agent({ keepAlive: true, keepAliveMsecs: 15000, maxSockets: 25 }),
  },
});

// Telegraf har so'rovga 500 000 ms (8+ daqiqa) kutadi. Telegram bilan aloqa osilib qolsa,
// bot shuncha vaqt "qotib" turardi. Endi so'rov chegaralangan va vaqti o'tsa qayta yuboriladi.
function callTimeoutMs(method) {
  return method === "getUpdates" ? 65000 : 20000;
}

const originalCallApi = bot.telegram.callApi.bind(bot.telegram);
bot.telegram.callApi = async (method, payload, options = {}) => {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const timeoutSignal = AbortSignal.timeout(callTimeoutMs(method));
    const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
    try {
      return await originalCallApi(method, payload, { ...options, signal });
    } catch (error) {
      lastError = error;
      // Bot to'xtatilayotgan bo'lsa (tashqi signal) — qayta urinmaymiz
      if (options.signal?.aborted) throw error;
      const timedOut = error?.name === "AbortError" && timeoutSignal.aborted;
      const message = `${error?.message || ""} ${error?.cause?.message || ""} ${error?.code || ""}`;
      const status = error?.response?.error_code;
      const transient =
        timedOut ||
        status === 429 ||
        status >= 500 ||
        /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ECONNREFUSED|socket hang up|FetchError|network|failed, reason|EPIPE|UND_ERR/i.test(message);
      if (!transient || attempt === 3) throw error;
      console.error(`${method} qayta uriniladi (${attempt}/3):`, timedOut ? "javob kelmadi (vaqt tugadi)" : message);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError;
};

// Telegraf bir guruh xabarni to'liq qayta ishlamaguncha keyingilarini olmaydi — bitta
// sekin foydalanuvchi (masalan, anketani yuborayotgan) hammani kutdirardi.
// Endi har bir foydalanuvchining xabarlari o'z navbatida, boshqalarni to'xtatmay bajariladi.
const userQueues = new Map();
bot.use((ctx, next) => {
  const key = ctx.from?.id ?? ctx.chat?.id ?? "umumiy";
  const previous = userQueues.get(key) || Promise.resolve();
  const run = previous
    .then(() => next())
    .catch((error) => console.error("Bot xatosi, ishlashda davom etadi:", error?.message || error));
  userQueues.set(key, run);
  run.finally(() => {
    if (userQueues.get(key) === run) userQueues.delete(key);
  });
  // ataylab kutmaymiz: polling darhol keyingi xabarlarni oladi
});

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
    const total = session.questions?.length || questions.length;
    const progress = Math.round((session.step / total) * 100);

    if (session.step >= total) {
      console.log(`⏭️ User ${userId}: Form already completed`);
      sessions.delete(userId);
      continue;
    }

    try {
      await bot.telegram.sendMessage(
        userId,
        `⏰ <b>Eslatma!</b>\n\n` +
          `Arizangiz tugallanmagan.\n` +
          `📊 Progress: ${progress}% (${session.step}/${total})\n\n` +
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
        [
          Markup.button.callback("✅ Ha, birinchi marta", "firstTime"),
          Markup.button.callback("❌ Yo'q, avval topshirganman", "secondTime"),
        ],
        [Markup.button.callback("📄 Xodim shartnomasi", "contract:staff")],
        [Markup.button.callback("🎓 O'quvchi shartnomasi", "contract:student")],
      ]),
    );
  } catch (error) {
    console.log(`❌ Start failed for ${ctx.from.id}: ${error.message}`);
    sessions.delete(ctx.from.id);
  }
});

const handleContractMessage = registerContractFlow(bot, {
  sessions,
  ack,
  saveContract: { staff: saveContractSubmission, student: saveStudentContract },
  listCourses: async () =>
    (await listStudentCourses({ activeOnly: true })).map((course) => ({ id: String(course._id), name: course.name })),
  notify: {
    staff: async (answers, result) => {
      if (!CHANNEL_OR_GROUP_TOKEN) return;
      const docs = ["passportFront", "passportBack", "diploma", "diplomaAppendix", "certificate"].filter((key) => answers[key]).length;
      await bot.telegram.sendMessage(
        CHANNEL_OR_GROUP_TOKEN,
        `📄 <b>Xodim shartnomasi uchun ma'lumot keldi</b>\n\n` +
          `👤 ${clipText(answers.fullName, 80)}\n` +
          `📞 ${normalizePhone(answers.phone)}\n` +
          `📎 Hujjatlar: ${docs} ta\n` +
          `${result?.created ? "🆕 Avval ariza topshirmagan — panelda yangi ariza ochildi" : "🗂 Paneldagi arizasiga qo'shildi"}`,
        { parse_mode: "HTML" },
      );
    },
    student: async (answers) => {
      if (!CHANNEL_OR_GROUP_TOKEN) return;
      await bot.telegram.sendMessage(
        CHANNEL_OR_GROUP_TOKEN,
        `🎓 <b>O'quvchi shartnomasi uchun ma'lumot keldi</b>\n\n` +
          `👤 ${clipText(answers.fullName, 80)}\n` +
          `📚 Kurs: ${clipText(answers.course, 80)}\n` +
          `📞 ${normalizePhone(answers.phone)}\n` +
          `🗂 Panel → «O'quvchilar» bo'limi`,
        { parse_mode: "HTML" },
      );
    },
  },
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

  if (session.kind === "contract") {
    return handleContractMessage(ctx, session);
  }

  const currentQuestion = session.questions[session.step];

  // 📎 orqali boshqa odamning kontakti yuborilsa — aniq sababini aytamiz
  if (
    currentQuestion.id === "phone" &&
    ctx.message?.contact?.phone_number &&
    !isOwnContact(ctx)
  ) {
    return ctx.reply(
      "❌ Bu sizning kontaktingiz emas. Pastdagi «📞 Telefon raqamni ulashish» tugmasini bosing yoki o'zingizning raqamingizni yozib yuboring.",
      { reply_markup: phoneKeyboard },
    );
  }

  if (!currentQuestion.validate(ctx)) {
    try {
      // Telefon savolida "ulashish" tugmasi yana ko'rinib tursin
      await ctx.reply(
        currentQuestion.errorMsg,
        currentQuestion.type === "contact" ? { reply_markup: phoneKeyboard } : undefined,
      );
    } catch (error) {
      console.error("Xato javobi yuborilmadi:", error?.message || error);
    }
    return;
  }

  const extractedValue = currentQuestion.extract(ctx);

  // Shaxsiy va qo'shimcha raqam bir xil bo'lmasin (qaysi biri avval so'ralishidan qat'i nazar)
  if (
    (currentQuestion.id === "phone" && phonesMatch(extractedValue, session.answers.parentPhone)) ||
    (currentQuestion.id === "parentPhone" && phonesMatch(extractedValue, session.answers.phone))
  ) {
    return ctx.reply(
      currentQuestion.id === "phone"
        ? "❌ Bu raqam qo'shimcha yoki ota-ona raqamingiz bilan bir xil! Iltimos, o'zingizning shaxsiy raqamingizni kiriting."
        : "❌ Bu sizning shaxsiy raqamingiz! Iltimos, boshqa qo'shimcha raqam yoki ota-onangizning raqamini kiriting.",
      currentQuestion.type === "contact" ? { reply_markup: phoneKeyboard } : undefined,
    );
  }

  session.answers[currentQuestion.id] = extractedValue;
  if (currentQuestion.id === "phone") {
    // Guruhdagi xabarda raqam qanday kelganini ko'rsatish uchun
    session.answers.phoneSource = ctx.message?.contact ? "telegram" : "typed";
  }
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
          keyboard: WORK_SHIFTS.map((shift) => [{ text: shift }]),
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

async function sendRecruitmentFile(ctx, fileId, opts, asDocument) {
  if (asDocument) {
    await ctx.telegram.sendDocument(CHANNEL_OR_GROUP_TOKEN, fileId, opts);
    return;
  }
  await ctx.telegram.sendPhoto(CHANNEL_OR_GROUP_TOKEN, fileId, opts);
}

function clipText(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function recruitmentCaption(answers, ctx) {
  const limits = {
    prevJob: 500,
    address: 220,
    institution: 160,
    foundResource: 80,
  };

  const build = () =>
    `
📩 <b>Yangi ish so'rov</b>

👔 <b>#${clipText(answers.position, 80)}</b>
👤 <b>I.F.Sh:</b> ${clipText(answers.fullName, 80)}
🗓️ <b>Tug'ilgan sanasi:</b> ${clipText(answers.birthday, 20)}
📍 <b>Manzil:</b> ${clipText(answers.address, limits.address)}
📞 <b>Telefon:</b> ${normalizePhone(answers.phone)}${answers.phoneSource === "telegram" ? " (Telegram akkauntidan)" : ""}
👨‍👩‍👦 <b>Qo'shimcha yoki ota-ona telefoni:</b> ${normalizePhone(answers.parentPhone)}
🌍 <b>Millati:</b> ${clipText(answers.nation, 40)}

💼 <b>Yo'nalish:</b> ${clipText(answers.position, 80)}
🎓 <b>Ma'lumot:</b> ${clipText(answers.education, 40)}
🎓 <b>Oliygoh nomi va yo'nalishi:</b> ${clipText(answers.institution, limits.institution)}
🎓 <b>Tugatish yoki tugallagan yil:</b> ${clipText(answers.graduationYear, 40)}
🌐 <b>Til darajasi:</b> ${clipText(answers.languageLevel, 40)}
💻 <b>Kompyuter:</b> ${clipText(answers.computerSkills, 40)}

📋 <b>Oldingi ish:</b> ${clipText(answers.prevJob, limits.prevJob)}
💰 <b>Oxirgi oylik:</b> ${clipText(answers.lastSalary, 30)}
💵 <b>Kutilayotgan oylik:</b> ${clipText(answers.expectedSalary, 30)}

💑 <b>Oilaviy holat:</b> ${clipText(answers.maritalStatus, 40)}
⏰ <b>Ish vaqti:</b> ${clipText(answers.workHours, 40)}
📅 <b>Ishlash davomiyligi:</b> ${clipText(answers.workDuration, 80)}
🌐 <b>Ishni topgan manbalar: #${clipText(answers.foundResource, limits.foundResource)}</b>

🆔 <b>Telegram username:</b> @${ctx.from.username || "N/A"}
🆔 <b>Telegram id:</b> ${ctx.from.id || "N/A"}
`.trim();

  let caption = build();
  while (caption.length > 1024 && limits.prevJob > 40) {
    limits.prevJob -= 40;
    caption = build();
  }
  while (caption.length > 1024 && limits.address > 40) {
    limits.address -= 20;
    caption = build();
  }
  while (caption.length > 1024 && limits.institution > 40) {
    limits.institution -= 20;
    caption = build();
  }
  return caption.length > 1024 ? caption.slice(0, 1024) : caption;
}

async function sendToRecruiter(ctx, session) {
  const answers = session.answers;
  const opts = { caption: recruitmentCaption(answers, ctx), parse_mode: "HTML" };
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

  if (sent) {
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

// WEB_ONLY=1 bo'lsa faqat panel ishlaydi: server'dagi bot bilan to'qnashmaslik uchun (409 Conflict)
if (process.env.WEB_ONLY === "1") {
  console.log("🌐 Faqat panel rejimi (WEB_ONLY=1): Telegram bot ishga tushirilmadi");
} else {
  runBot();
  console.log("🤖 Bot is running!");
}

process.once("SIGINT", () => {
  stopping = true;
  bot.stop("SIGINT");
});
process.once("SIGTERM", () => {
  stopping = true;
  bot.stop("SIGTERM");
});
