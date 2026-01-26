import { Telegraf, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { config as dotenv } from "dotenv";

dotenv();

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.action("button", (ctx) => {
  ctx.reply(" button clicked");
});

bot.launch(() => {
  console.log("Bot is up and running!");
});
