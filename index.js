import { Telegraf } from "telegraf";
import { config as dotenv } from "dotenv";

dotenv();

const bot = new Telegraf(process.env.BOT_TOKEN);
const RECRUITER_GROUP = "@recruting_group";

const sessions = new Map();

const questions = [
  "To'liq ismingizni kiriting!",
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

  session.answers.push(ctx.message.text);
  session.step++;

  if (session.step < questions.length) {
    return ctx.reply(questions[session.step]);
  }

  const [name, age, profession, exp, photo] = session.answers;

  const msg = `
📩 <b>Yangi ish so'rov</b>
👤 Ismi: ${name}
🎂 Yoshi: ${age}
💼 Kasbi: ${profession}
⏳ Tajribasi: ${exp}
🆔 Telegram: @${ctx.from.username || "N/A"}
`;

  await ctx.telegram.sendMessage(RECRUITER_GROUP, msg, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });

  if (photo.fileId) {
    await ctx.telegram.sendPhoto(RECRUITER_GROUP, photo.fileId, {
      caption: `📸${name.text} rasmi`,
    });
    console.log(photo);
  }

  ctx.reply("So'rovingiz qabul qilindi✅");
  sessions.delete(userId);
});

bot.launch();
console.log("Bot is up and running!");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
