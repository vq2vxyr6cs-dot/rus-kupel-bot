import { Telegraf } from "telegraf";

const bot = new Telegraf(process.env.BOT_TOKEN);

// Команда для бронирования
bot.command("book", (ctx) => {
  ctx.reply(
    "Вы у нас были раньше?\n\nВыберите вариант:",
    {
      reply_markup: {
        keyboard: [
          ["Да, был!"],
          ["Нет, впервые"]
        ],
        one_time_keyboard: true,
        resize_keyboard: true
      }
    }
  );
});

// Healthcheck для Render
export default {
  port: Number(process.env.PORT) || 3000,
  fetch: () => new Response("ok")
};

bot.launch();
