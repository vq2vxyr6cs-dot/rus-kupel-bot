import { Telegraf, Markup, session } from 'telegraf';
import express from 'express';

// Создаём бота
const bot = new Telegraf(process.env.BOT_TOKEN);

// Включаем сессии, чтобы помнить выбор пользователя
bot.use(session());

// Удобный сброс брони
function resetBooking(ctx) {
  ctx.session.booking = {
    bath: null,   // какая баня
    date: null,   // дата
    time: null,   // время
    hours: null,  // количество часов
    kupel: null,  // купель (да/нет)
    venik: null,  // веник
    step: 'main', // текущий шаг
  };
}

// Гарантируем, что booking есть
function ensureBooking(ctx) {
  if (!ctx.session.booking) {
    resetBooking(ctx);
  }
}

// --- Клавиатуры ---

// Главная клавиатура
function mainKeyboard() {
  return Markup.keyboard([
    ['🟩 Забронировать'],
  ]).resize();
}

// Клавиатура выбора бани
function bathKeyboard() {
  return Markup.keyboard([
    ['🟩 Царь баня', '🟢 Богатырская баня'],
    ['🟥 Назад'],
  ]).resize();
}

// Клавиатура выбора количества часов
function hoursKeyboard() {
  return Markup.keyboard([
    ['2 часа', '3 часа'],
    ['4 часа', 'Более 4х'],
    ['🟥 Назад'],
  ]).resize();
}

// Клавиатура купели (только для Богатырской при 2 часах)
function kupelKeyboard() {
  return Markup.keyboard([
    ['Добавить купель'],
    ['Без купели'],
    ['🟥 Назад'],
  ]).resize();
}

// Клавиатура веников
function venikKeyboard() {
  return Markup.keyboard([
    ['Дубовый веник', 'Березовый веник'],
    ['Без веника'],
    ['🟥 Назад'],
  ]).resize();
}

// --- Обработчики ---

// /start
bot.start((ctx) => {
  ensureBooking(ctx);
  resetBooking(ctx);
  return ctx.reply(
    'Привет! Я бот Русской Купели. Чтобы начать запись, нажмите «Забронировать».',
    mainKeyboard(),
  );
});

// /book
bot.command('book', (ctx) => {
  ensureBooking(ctx);
  resetBooking(ctx);
  return ctx.reply(
    'Что вы хотите сделать?',
    mainKeyboard(),
  );
});

// Кнопка "Забронировать"
bot.hears('🟩 Забронировать', (ctx) => {
  ensureBooking(ctx);
  ctx.session.booking.step = 'bath';
  return ctx.reply(
    'Выберите баню:',
    bathKeyboard(),
  );
});

// Назад
bot.hears('🟥 Назад', (ctx) => {
  ensureBooking(ctx);
  resetBooking(ctx);
  return ctx.reply('Вернулись в начало. Что вы хотите сделать?', mainKeyboard());
});

// Выбор бани
bot.hears('🟩 Царь баня', (ctx) => {
  ensureBooking(ctx);
  ctx.session.booking.bath = 'Царь баня';
  ctx.session.booking.step = 'date';
  return ctx.reply(
    'Вы выбрали «Царь баня».\n\nВведите дату бронирования в формате ДД.ММ (например, 12.12):',
  );
});

bot.hears('🟢 Богатырская баня', (ctx) => {
  ensureBooking(ctx);
  ctx.session.booking.bath = 'Богатырская баня';
  ctx.session.booking.step = 'date';
  return ctx.reply(
    'Вы выбрали «Богатырская баня».\n\nВведите дату бронирования в формате ДД.ММ (например, 12.12):',
  );
});

// Универсальный обработчик текста по шагам
bot.on('text', (ctx) => {
  ensureBooking(ctx);
  const booking = ctx.session.booking;
  const text = (ctx.message.text || '').trim();

  // Если только что нажали кнопку — это уже обработано выше
  if (['🟩 Забронировать', '🟩 Царь баня', '🟢 Богатырская баня', '🟥 Назад',
       '2 часа', '3 часа', '4 часа', 'Более 4х',
       'Добавить купель', 'Без купели',
       'Дубовый веник', 'Березовый веник', 'Без веника'].includes(text)) {
    return;
  }

  switch (booking.step) {
    case 'date': {
      // Проверяем дату
      const dateRegex = /^\d{1,2}\.\d{1,2}(\.\d{2,4})?$/;
      if (!dateRegex.test(text)) {
        return ctx.reply('Пожалуйста, введите дату в формате ДД.MM (например, 12.12):');
      }
      booking.date = text;
      booking.step = 'time';
      return ctx.reply(
        'Отлично! Теперь введите время начала в формате ЧЧ:ММ (например, 17:00):',
      );
    }

    case 'time': {
      const timeRegex = /^\d{1,2}:\d{2}$/;
      if (!timeRegex.test(text)) {
        return ctx.reply('Пожалуйста, введите время в формате ЧЧ:ММ (например, 17:00):');
      }
      booking.time = text;
      booking.step = 'hours';
      return ctx.reply('На сколько часов бронируем?', hoursKeyboard());
    }

    default: {
      // Если шаг не определён — отправляем к началу
      if (!booking.step || booking.step === 'main') {
        return ctx.reply('Чтобы начать, нажмите «Забронировать».', mainKeyboard());
      }
    }
  }
});

// Выбор часов
bot.hears(['2 часа', '3 часа', '4 часа', 'Более 4х'], (ctx) => {
  ensureBooking(ctx);
  const booking = ctx.session.booking;
  booking.hours = ctx.message.text;

  // Если Богатырская + 2 часа — задаём вопрос про купель
  if (booking.bath === 'Богатырская баня' && booking.hours === '2 часа') {
    booking.step = 'kupel';
    return ctx.reply(
      'К Богатырской бане на 2 часа можно добавить купель. Нужна купель?',
      kupelKeyboard(),
    );
  }

  // Иначе сразу к веникам
  booking.step = 'venik';
  return ctx.reply('Нужен ли веник?', venikKeyboard());
});

// Купель
bot.hears('Добавить купель', (ctx) => {
  ensureBooking(ctx);
  const booking = ctx.session.booking;
  booking.kupel = 'С купелью';
  booking.step = 'venik';
  return ctx.reply('Отлично, добавляем купель. Нужен ли веник?', venikKeyboard());
});

bot.hears('Без купели', (ctx) => {
  ensureBooking(ctx);
  const booking = ctx.session.booking;
  booking.kupel = 'Без купели';
  booking.step = 'venik';
  return ctx.reply('Принято. Нужен ли веник?', venikKeyboard());
});

// Веники
bot.hears(['Дубовый веник', 'Березовый веник', 'Без веника'], (ctx) => {
  ensureBooking(ctx);
  const booking = ctx.session.booking;
  booking.venik = ctx.message.text;
  booking.step = 'done';

  const summary =
    `✅ Бронирование:\n` +
    `Баня: ${booking.bath}\n` +
    `Дата: ${booking.date}\n` +
    `Время начала: ${booking.time}\n` +
    `Длительность: ${booking.hours}\n` +
    (booking.kupel ? `Купель: ${booking.kupel}\n` : '') +
    `Веник: ${booking.venik}\n\n` +
    `Мы свяжемся с вами для подтверждения.`;

  ctx.reply(summary, mainKeyboard());
  resetBooking(ctx);
});

// --- Express для Render (порт + healthcheck) ---

const app = express();
app.get('/', (_req, res) => {
  res.send('OK');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Запуск бота
bot.launch().then(() => {
  console.log('Bot started');
});

// Корректная остановка
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
