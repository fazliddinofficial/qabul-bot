import { Telegraf } from "telegraf";
import { config as dotenv } from "dotenv";

dotenv();

const bot = new Telegraf(process.env.BOT_TOKEN);
const RECRUITER_GROUP = "@recruting_group";
const sessions = new Map();

const questions = [
  "Foto suratingizni yuboring. (oxirgi 3oy ichida tushurilgan)",
  "Qaysi yo'nalishda ishlay olasiz? (Fan o'qituvchi, admin)",
  "I.F.Sh kiriting: (Ism Familiya Sharif)",
  "Doimiy yashash manzilingizni kiriting: ",
  "Ma'lumoti (Oliy, o'rta): ",
  "Oldingi ish joyingiz va lavozimingiz haqida ma'lumot kiriting: (qachon, qayerda, kim bo'lib, qancha vaqt) \n Misol: 2020-yil, Toshkent, ingliz tili o'qituvchisi, 2 yil",
  "Oilaviy axvolingizni yozing: (turmush qurgan, yoki turmush qurmagan)",
  "Kompyuterda ishlay olasizmi? (excel, word)",
  "Oxirgi ishlagan ishingizda oylik maoshingiz: (summa)",
  "Bizning korxonada qancha muddat ishlay olasiz?",
  "Otangizni yoki onangizni telefon raqamini kiriting: ",
  "Til bilish darajangiz: (IELTSda yoki CEFRda,)",
  "Soat nechidan nechigacha ishlay olasiz?",
  "Bizda qancha oylikga ishlamoqchisiz?",
  "Telefon raqamingizni kiriting: ",
];

bot.start((ctx) => {
  sessions.set(ctx.from.id, { step: 0, answers: [] });
  ctx.reply("Assalomu alaykum! Botimizga xush kelibsiz.\n\n" + questions[0]);
});

// Handle text messages (steps 1-14 are all text)
bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const session = sessions.get(userId);

  if (!session) return;

  // Step 0 MUST be a photo
  if (session.step === 0) {
    return ctx.reply("❌ Iltimos, avval foto suratingizni yuboring!");
  }

  // Save text answer
  session.answers.push(ctx.message.text);
  session.step++;

  // Check if more questions remain
  if (session.step < questions.length) {
    return ctx.reply(questions[session.step]);
  }

  // All questions answered - send to recruiter
  await sendToRecruiter(ctx, session);
});

// Handle photo messages (only step 0)
bot.on("photo", async (ctx) => {
  const userId = ctx.from.id;
  const session = sessions.get(userId);

  if (!session) return;

  // Only accept photo at step 0
  if (session.step !== 0) {
    return ctx.reply("❌ Hozir matn javob kutilmoqda, rasm emas.");
  }

  // Save photo file_id
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  session.answers.push(photo.file_id);
  session.step++;

  // Ask next question
  if (session.step < questions.length) {
    return ctx.reply(questions[session.step]);
  }
});

bot.on("document", async (ctx) => {
  const userId = ctx.from.id;
  const session = sessions.get(userId);

  if (!session) return;

  // Only accept at step 0
  if (session.step !== 0) {
    return ctx.reply("❌ Hozir matn javob kutilmoqda, rasm emas.");
  }

  const doc = ctx.message.document;

  // Check if it's an image file
  const imageTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/gif",
    "image/webp",
  ];

  if (!imageTypes.includes(doc.mime_type)) {
    return ctx.reply("❌ Iltimos, faqat rasm formatida yuboring (JPG, PNG).");
  }

  // Save document file_id (works same as photo)
  session.answers.push(doc.file_id);
  session.step++;

  // Ask next question
  if (session.step < questions.length) {
    return ctx.reply(questions[session.step]);
  }
});

// Function to send application to recruiter
async function sendToRecruiter(ctx, session) {
  const [
    photoFileId, // 0 - Photo
    position, // 1
    fullName, // 2
    address, // 3
    education, // 4
    prevJob, // 5
    maritalStatus, // 6
    computerSkills, // 7
    lastSalary, // 8
    workDuration, // 9
    parentPhone, // 10
    languageLevel, // 11
    workHours, // 12
    expectedSalary, // 13
    phone, // 14
  ] = session.answers;

  const msg = `
📩 <b>Yangi ish so'rov</b>

👤 <b>I.F.Sh:</b> ${fullName}
📍 <b>Manzil:</b> ${address}
📞 <b>Telefon:</b> ${phone}
👨‍👩‍👦 <b>Ota-ona telefoni:</b> ${parentPhone}

💼 <b>Yo'nalish:</b> ${position}
🎓 <b>Ma'lumot:</b> ${education}
🌐 <b>Til darajasi:</b> ${languageLevel}
💻 <b>Kompyuter:</b> ${computerSkills}

📋 <b>Oldingi ish:</b> ${prevJob}
💰 <b>Oxirgi oylik:</b> ${lastSalary}
💵 <b>Kutilayotgan oylik:</b> ${expectedSalary}

💑 <b>Oilaviy holat:</b> ${maritalStatus}
⏰ <b>Ish vaqti:</b> ${workHours}
📅 <b>Ishlash davomiyligi:</b> ${workDuration}

🆔 <b>Telegram:</b> @${ctx.from.username || "N/A"}
`;

  // Send photo with caption
  await ctx.telegram.sendPhoto(RECRUITER_GROUP, photoFileId, {
    caption: msg,
    parse_mode: "HTML",
  });

  ctx.reply("✅ So'rovingiz qabul qilindi! Tez orada siz bilan bog'lanamiz.");
  sessions.delete(ctx.from.id);
}

bot.launch();
console.log("Bot is up and running!");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
