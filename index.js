import { Telegraf } from "telegraf";

// создаём бота
const bot = new Telegraf(process.env.BOT_TOKEN);

// Команда /book
bot.command("book", (ctx) => {
  ctx.reply(
    "Во сколько вы были раньше?\n\nВыберите вариант:",
    {
      reply_markup: {
        keyboard: [
          ["До 6ам!"],
          ["Нет, впервые"]
        ],
        one_time_keyboard: true,
        resize_keyboard: true
      }
    }
  );
});

// Можно добавить /start для проверки
bot.start((ctx) => ctx.reply("Привет! Я бот Русской Купели. Напиши /book, чтобы забронировать время."));

// Мини-сервер для Render — просто говорит "бот жив"
import http from "http";
http
  .createServer((req, res) => {
    res.end("Bot running");
  })
  .listen(process.env.PORT || 3000);

// Запускаем бота
bot.launch();
