import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { config as dotenv } from "dotenv";

dotenv();

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
