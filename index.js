import { Telegraf, Markup } from "telegraf";
import http from "http";

const bot = new Telegraf(process.env.BOT_TOKEN);

// ----- Клавиатуры -----
const mainKeyboard = Markup.keyboard([
  ["Забронировать баню"],
  ["Обзор бань"]
]).resize();

const bookingKeyboard = Markup.keyboard(
  [
    ["Царь баня 3 часа", "Царь баня 4 часа"],
    ["Богатырская 2 часа", "Богатырская 3 часа"],
    ["Отмена"]
  ]
).resize();

const kupelKeyboard = Markup.keyboard([
  ["Да, добавить купель"],
  ["Нет, без купели"],
  ["Отмена"]
]).resize();

const venikiKeyboard = Markup.keyboard([
  ["Без веников"],
  ["Дуб"],
  ["Берёза"],
  ["Дуб и берёза"],
  ["Отмена"]
]).resize();

// ----- Команды -----

bot.start((ctx) => {
  ctx.reply(
    "Привет! Я бот Русской Купели. Могу помочь забронировать время.\nЧто вы хотите сделать?",
    mainKeyboard
  );
});

bot.command("book", (ctx) => {
  ctx.reply("Что вы хотите сделать?", mainKeyboard);
});

// ----- Обработка кнопок и текста -----

bot.on("text", async (ctx) => {
  const text = ctx.message.text;

  // Главное меню
  if (text === "Забронировать баню") {
    await ctx.reply("Выберите баню и длительность:", bookingKeyboard);
    return;
  }

  if (text === "Обзор бань") {
    await ctx.reply(
      "Царь баня — большая просторная баня.\n" +
        "Богатырская баня — баня с возможностью добавить купель.\n\n" +
        "Чтобы забронировать, нажмите «Забронировать баню».",
      mainKeyboard
    );
    return;
  }

  if (text === "Отмена") {
    await ctx.reply("Отменил. Возвращаю в главное меню.", mainKeyboard);
    return;
  }

  // Выбор бани и времени
  if (
    text === "Царь баня 3 часа" ||
    text === "Царь баня 4 часа" ||
    text === "Богатырская 2 часа" ||
    text === "Богатырская 3 часа"
  ) {
    // Если Богатырская на 2 часа — спрашиваем про купель
    if (text === "Богатырская 2 часа") {
      await ctx.reply(
        "Для Богатырской бани на 2 часа могу добавить купель. Нужна купель?",
        kupelKeyboard
      );
      return;
    }

    // Для всех остальных сразу к веникам
    await ctx.reply(
      "Записал: " +
        text +
        ".\nТеперь выберите, нужны ли веники:",
      venikiKeyboard
    );
    return;
  }

  // Купель
  if (text === "Да, добавить купель" || text === "Нет, без купели") {
    let kupelText =
      text === "Да, добавить купель"
        ? "с купелью"
        : "без купели";

    await ctx.reply(
      "Записал: Богатырская баня 2 часа, " +
        kupelText +
        ".\nТеперь выберите, нужны ли веники:",
      venikiKeyboard
    );
    return;
  }

  // Веники
  if (
    text === "Без веников" ||
    text === "Дуб" ||
    text === "Берёза" ||
    text === "Дуб и берёза"
  ) {
    await ctx.reply(
      "Спасибо! Ваша заявка принята: " +
        text +
        ". Администратор свяжется с вами для подтверждения.",
      mainKeyboard
    );
    return;
  }

  // На всякий случай — если текст непонятен
  await ctx.reply(
    "Я вас не понял. Нажмите кнопку ниже:",
    mainKeyboard
  );
});

// ----- Запуск бота (polling) -----
bot.launch().then(() => {
  console.log("Bot started");
}).catch((err) => {
  console.error("Bot start error:", err);
});

// ----- HTTP-сервер для Render (чтобы был открыт порт) -----
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Rus Kupel bot is running");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

export default server;
