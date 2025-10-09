import { Telegraf, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { config as dotenv } from "dotenv";

dotenv();

const bot = new Telegraf(process.env.BOT_TOKEN);

const keyBoard = Markup.inlineKeyboard([
  Markup.button.callback("Button 1", "button"),
  Markup.button.callback("Button 2", "button2"),
]).resize();

bot.command("start", (ctx) => {
  ctx.reply("Siz hozir qaysi davlatdan biriga o'qishga topshirmoqchisiz?", {
    reply_markup: {
      keyboard: [
        [{ text: "Koreadan" }, { text: "O'zbekistondan" }],
        [{ text: "Qirg'iziston va boshqa" }],
      ],
      resize_keyboard: true,
    },
  });
});

bot.action("button", (ctx) => {
  ctx.reply(" button clicked");
});

bot.action("button2", (ctx) => {
  ctx.reply(" button 2 clicked");
});

bot.hears("Koreadan", (ctx) => {
  ctx.reply("Qanday vizalardasiz?");
});

bot.hears("O'zbekistondan", (ctx) => {
  ctx.reply("Qaysi bosqichga kirmoqchisiz?", {
    reply_markup: {
      keyboard: [
        [{ text: "Til kursi" }, { text: "Kollej" }],
        [{ text: "Bakalavr" }, { text: "Magistratura" }],
      ],
      resize_keyboard: true,
    },
  });
});

bot.launch(() => {
  console.log("Bot is up and running!");
});
