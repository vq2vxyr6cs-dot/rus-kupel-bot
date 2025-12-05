import { Telegraf, Markup } from "telegraf";
import express from "express";

const bot = new Telegraf(process.env.BOT_TOKEN);

// === КНОПКИ ===

bot.start((ctx) =>
  ctx.reply(
    "Привет! Я бот Русской Купели. Чтобы начать запись, нажмите «Забронировать».",
    Markup.keyboard([["Забронировать", "Обзор бань"]]).resize()
  )
);

bot.hears("Забронировать", (ctx) => {
  ctx.reply(
    "Выберите баню:",
    Markup.keyboard([["Царь баня"], ["Богатырская баня"], ["Назад"]]).resize()
  );
});

bot.hears("Обзор бань", (ctx) => {
  ctx.reply(
    "1) Царь баня — 2 этажа, много пара\n2) Богатырская — классика, купель",
    Markup.keyboard([["Забронировать"], ["Назад"]]).resize()
  );
});

bot.hears("Царь баня", (ctx) => {
  ctx.reply("Введите желаемую дату и время (например, 12 декабря 18:00)");
});

bot.hears("Богатырская баня", (ctx) => {
  ctx.reply("Введите желаемую дату и время (например, 12 декабря 18:00)");
});

// === WEBHOOK ДЛЯ RENDER ===

const app = express();
app.use(express.json());

app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
  bot.handleUpdate(req.body, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Bot webhook is running on port", PORT);
});

// === УСТАНОВКА WEBHOOK ===
bot.telegram.setWebhook(
  `https://rus-kupel-bot.onrender.com/bot${process.env.BOT_TOKEN}`
);
