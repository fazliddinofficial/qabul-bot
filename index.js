import { Telegraf } from "telegraf";
import { config as dotenv } from "dotenv";

dotenv();

const bot = new Telegraf(process.env.BOT_TOKEN);
const RECRUITER_GROUP = "@recruting_group";
const sessions = new Map();

const questions = [
  "Ism familyangizni kiriting!",
  "Yoshingiz nechida?",
  "Kasbingiz nima?",
  "Qancha yil ish tajribangiz bor?",
  "Rasmingizni yuboring",
];

bot.start((ctx) => {
  sessions.set(ctx.from.id, { step: 0, answers: [] });
  ctx.reply("Salom! Botimizga xush kelibsiz.\n\n" + questions[0]);
});

bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const session = sessions.get(userId);

  if (!session) return;

  if (session.step === 4) {
    return ctx.reply("❌ Iltimos, rasm yuboring (matn emas).");
  }

  session.answers.push({ text: ctx.message.text, fileId: null });
  session.step++;

  if (session.step < questions.length) {
    return ctx.reply(questions[session.step]);
  }
});

bot.on("photo", async (ctx) => {
  const userId = ctx.from.id;
  const session = sessions.get(userId);

  if (!session) return;

  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  session.answers.push({ text: "Photo", fileId: photo.file_id });
  session.step++;

  if (session.step < questions.length) {
    return ctx.reply(questions[session.step]);
  }

  const [name, age, profession, exp, photo_data] = session.answers;

  const msg = `
📩 <b>Yangi ish so'rov</b>
👤 Ismi: ${name.text}
🎂 Yoshi: ${age.text}
💼 Kasbi: ${profession.text}
⏳ Tajribasi: ${exp.text}
🆔 Telegram: @${ctx.from.username || "N/A"}
`;

  await ctx.telegram.sendMessage(RECRUITER_GROUP, msg, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });

  if (photo_data.fileId) {
    await ctx.telegram.sendPhoto(RECRUITER_GROUP, photo_data.fileId, {
      caption: `📸 ${name.text} rasmi`,
    });
  }

  ctx.reply("So'rovingiz qabul qilindi✅");
  sessions.delete(userId);
});

bot.launch();
console.log("Bot is up and running!");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
