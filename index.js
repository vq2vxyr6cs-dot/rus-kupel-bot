import { Telegraf } from "telegraf";

const bot = new Telegraf(process.env.BOT_TOKEN);

// Команда /start
bot.start((ctx) => {
  ctx.reply("Привет! Я бот Русской Купели. Чтобы начать запись, нажмите 'Забронировать'.", {
    reply_markup: {
      keyboard: [["Забронировать"]],
      resize_keyboard: true,
    },
  });
});

// Нажали Забронировать
bot.hears("Забронировать", (ctx) => {
  ctx.reply("Выберите баню:", {
    reply_markup: {
      keyboard: [["Царь баня", "Богатырская баня"], ["Обзор бань"]],
      resize_keyboard: true,
    },
  });
});

// Обзор
bot.hears("Обзор бань", (ctx) => {
  ctx.reply("1) Царь баня — 2 этажа, много пара\n2) Богатырская баня — классика, купель.");
});

// Выбор бани
bot.hears(["Царь баня", "Богатырская баня"], (ctx) => {
  ctx.reply("Введите желаемую дату и время (например, 12 декабря 18:00)");
});

// Запуск бота
bot.launch();

export default {
  port: process.env.PORT || 3000,
  fetch: () => new Response("OK"),
};
