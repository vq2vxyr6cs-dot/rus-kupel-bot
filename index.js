import { Telegraf } from "telegraf";

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply("Привет! Я бот Русской Купели. Чтобы начать запись, нажмите 'Забронировать'.", {
    reply_markup: {
      keyboard: [["Забронировать"]],
      resize_keyboard: true,
    },
  });
});

bot.hears("Забронировать", (ctx) => {
  ctx.reply("Выберите баню:", {
    reply_markup: {
      keyboard: [["Царь баня", "Богатырская баня"], ["Обзор бань"]],
      resize_keyboard: true,
    },
  });
});

bot.hears("Обзор бань", (ctx) => {
  ctx.reply("1) Царь баня — 2 этажа\n2) Богатырская баня — купель");
});

bot.hears(["Царь баня", "Богатырская баня"], (ctx) => {
  ctx.reply("Введите желаемую дату и время");
});

bot.launch();
