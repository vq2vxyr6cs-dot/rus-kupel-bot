import { Telegraf, Markup } from "telegraf";

const bot = new Telegraf(process.env.BOT_TOKEN);

// Главное меню
const mainMenu = Markup.keyboard([
  ["Забронировать"],
  ["Обзор бань"]
]).resize();

// Старт
bot.start((ctx) => {
  ctx.reply(
    "Привет! Я бот Русской Купели. Чтобы начать запись, нажмите «Забронировать».",
    mainMenu
  );
});

// Обзор бань
bot.hears("Обзор бань", (ctx) => {
  ctx.reply(
    "1) Царь баня — 2 этажа, много пара\n2) Богатырская баня — классика, купель.",
    mainMenu
  );
});

// Нажали «Забронировать»
bot.hears("Забронировать", (ctx) => {
  ctx.reply(
    "Выберите баню:",
    Markup.keyboard([
      ["Царь баня", "Богатырская баня"],
      ["Назад в меню"]
    ]).resize()
  );
});

// Выбор бани
bot.hears(["Царь баня", "Богатырская баня"], (ctx) => {
  const bath = ctx.message.text;
  ctx.reply(
    `Вы выбрали: ${bath}\n\nВведите желаемую дату и время (например, 12 декабря, 18:00).`,
    mainMenu
  );
});

// Кнопка «Назад»
bot.hears("Назад в меню", (ctx) => {
  ctx.reply("Что вы хотите сделать?", mainMenu);
});

// Healthcheck для Render
export default {
  port: Number(process.env.PORT) || 3000,
  fetch: () => new Response("ok"),
};

bot.launch();
