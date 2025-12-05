// index.js

import { Telegraf, Markup } from "telegraf";
import http from "http";

// Проверяем, что есть токен
if (!process.env.BOT_TOKEN) {
  console.error("BOT_TOKEN не задан в переменных окружения");
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// Простое хранилище состояния по чатам
const state = {}; // { [chatId]: { step, bath, dateTime, kupel, venik } }

function getChatState(ctx) {
  const id = ctx.chat.id;
  if (!state[id]) state[id] = {};
  return state[id];
}

function clearChatState(ctx) {
  const id = ctx.chat.id;
  delete state[id];
}

// Главное меню бронирования
function sendBookMainMenu(ctx) {
  const chatState = getChatState(ctx);
  chatState.step = "main";

  return ctx.reply(
    "Что вы хотите сделать?",
    Markup.keyboard([["Забронировать"], ["Обзор бань"]])
      .oneTime()
      .resize()
  );
}

// Старт
bot.start((ctx) => {
  clearChatState(ctx);
  return ctx.reply(
    "Привет! Я бот Русской Купели.\nНапишите /book, чтобы забронировать время."
  );
});

// Команда /book
bot.command("book", (ctx) => {
  clearChatState(ctx);
  return sendBookMainMenu(ctx);
});

// Кнопка «Обзор бань»
bot.hears("Обзор бань", (ctx) => {
  const chatState = getChatState(ctx);
  chatState.step = "overview";

  return ctx.reply(
    "Какую баню показать?",
    Markup.keyboard([["Царь баня (обзор)"], ["Богатырская баня (обзор)"]])
      .oneTime()
      .resize()
  );
});

bot.hears("Царь баня (обзор)", (ctx) => {
  ctx.reply(
    "Царь баня — большая просторная парная, отдельная комната отдыха, купель, душ и все удобства."
  );
  return sendBookMainMenu(ctx);
});

bot.hears("Богатырская баня (обзор)", (ctx) => {
  ctx.reply(
    "Богатырская баня — мощная парная на компанию, есть возможность взять купель отдельно, зона отдыха."
  );
  return sendBookMainMenu(ctx);
});

// Кнопка «Забронировать»
bot.hears("Забронировать", (ctx) => {
  const chatState = getChatState(ctx);
  chatState.step = "choose_bath";

  return ctx.reply(
    "Выберите баню:",
    Markup.keyboard([["Царь баня"], ["Богатырская баня"]])
      .oneTime()
      .resize()
  );
});

// Выбор бани
bot.hears(["Царь баня", "Богатырская баня"], (ctx) => {
  const choice = ctx.message.text;
  const chatState = getChatState(ctx);

  if (chatState.step !== "choose_bath") {
    // Если человек нажал это не по сценарию, просто игнорируем
    return;
  }

  chatState.bath = choice;
  chatState.step = "date";

  return ctx.reply(
    "Напишите дату и время бронирования.\nНапример: 10.12 19:00",
    Markup.removeKeyboard()
  );
});

// Обработка текстов — ловим дату/время
bot.on("text", (ctx) => {
  const chatState = getChatState(ctx);
  const text = ctx.message.text;

  // Если сейчас ожидаем дату
  if (chatState.step === "date") {
    chatState.dateTime = text;

    if (chatState.bath === "Богатырская баня") {
      chatState.step = "kupel";
      return ctx.reply(
        "Для Богатырской бани на 2 часа — нужна ли купель?",
        Markup.keyboard([["Да, нужна купель"], ["Нет, без купели"]])
          .oneTime()
          .resize()
      );
    } else {
      // Царь баня — сразу к веникам
      chatState.step = "venik";
      return ctx.reply(
        "Нужны ли веники?",
        Markup.keyboard([["Дуб"], ["Берёза"], ["Без веника"]])
          .oneTime()
          .resize()
      );
    }
  }

  // Если шаг не "date", а это обычный текст — ничего не делаем
});

// Ответ про купель (только для Богатырской)
bot.hears(["Да, нужна купель", "Нет, без купели"], (ctx) => {
  const chatState = getChatState(ctx);

  if (chatState.step !== "kupel") return;

  chatState.kupel = ctx.message.text === "Да, нужна купель" ? "Да" : "Нет";
  chatState.step = "venik";

  return ctx.reply(
    "Нужны ли веники?",
    Markup.keyboard([["Дуб"], ["Берёза"], ["Без веника"]])
      .oneTime()
      .resize()
  );
});

// Выбор веников
bot.hears(["Дуб", "Берёза", "Без веника"], (ctx) => {
  const chatState = getChatState(ctx);

  if (chatState.step !== "venik") return;

  chatState.venik = ctx.message.text;

  // Собираем итог
  const summary =
    `✅ Заявка на бронь:\n` +
    `Баня: ${chatState.bath || "-"}\n` +
    `Дата и время: ${chatState.dateTime || "-"}\n` +
    (chatState.bath === "Богатырская баня"
      ? `Купель: ${chatState.kupel || "-"}\n`
      : "") +
    `Веники: ${chatState.venik || "-"}`;

  clearChatState(ctx);

  return ctx.reply(
    summary +
      "\n\nСпасибо! Администратор свяжется с вами для подтверждения брони.",
    Markup.removeKeyboard()
  );
});

// Запускаем бота (long polling)
bot.launch().then(() => {
  console.log("Bot started");
});

// Простой HTTP-сервер для Render (healthcheck и порт)
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log("Server listening on port", PORT);
});
