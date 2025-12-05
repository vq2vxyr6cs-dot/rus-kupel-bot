import { Telegraf, Markup, session } from 'telegraf';
import express from 'express';

const bot = new Telegraf(process.env.BOT_TOKEN);

// Включаем сессии, чтобы помнить выбор пользователя
bot.use(session());

// Удобный сброс брони
function resetBooking(ctx) {
  ctx.session.booking = {
    bath: null,
    date: null,
    time: null,
    hours: null,
    kupel: null,
    venik: null,
    step: null,
  };
}

// Главная клавиатура
function mainKeyboard() {
  return Markup.keyboard([['🟩 Забронировать']]).resize();
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

// Клавиатура "нужна ли купель"
function kupelKeyboard() {
  return Markup.keyboard([
    ['Купель нужна', 'Купель не нужна'],
    ['🟥 Назад'],
  ]).resize();
}

// Клавиатура выбора веника
function venikKeyboard() {
  return Markup.keyboard([
    ['Дубовый веник', 'Берёзовый веник'],
    ['Без веника'],
    ['🟥 Назад'],
  ]).resize();
}

// Ближайшие 7 дней кнопками
function getNextDays(count = 7) {
  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    days.push(`${dd}.${mm}`);
  }
  return days;
}

function dateKeyboard() {
  const days = getNextDays(7);
  const rows = [];
  for (let i = 0; i < days.length; i += 3) {
    rows.push(days.slice(i, i + 3));
  }
  rows.push(['🟥 Назад']);
  return Markup.keyboard(rows).resize();
}

// Старт: /start и /book
function startFlow(ctx) {
  resetBooking(ctx);
  ctx.session.booking.step = 'start';
  return ctx.reply(
    'Привет! Я бот Русской Купели. Чтобы начать запись, нажмите «Забронировать».',
    mainKeyboard()
  );
}

bot.start(startFlow);
bot.command('book', startFlow);

// Общая кнопка "Назад"
bot.hears('🟥 Назад', (ctx) => {
  resetBooking(ctx);
  ctx.reply('Что вы хотите сделать?', mainKeyboard());
});

// Нажали "Забронировать"
bot.hears('🟩 Забронировать', (ctx) => {
  resetBooking(ctx);
  ctx.session.booking.step = 'choose_bath';
  ctx.reply('Выберите баню:', bathKeyboard());
});

// Выбор бани
bot.hears(['🟩 Царь баня', '🟢 Богатырская баня'], (ctx) => {
  const text = ctx.message.text;
  const booking = ctx.session.booking || {};
  booking.bath = text.includes('Царь') ? 'Царь баня' : 'Богатырская баня';
  booking.step = 'choose_date';
  ctx.session.booking = booking;

  ctx.reply(
    `Вы выбрали: ${booking.bath}\n\nТеперь выберите дату (ближайшие дни):`,
    dateKeyboard()
  );
});

// Выбор даты (формат 12.12)
bot.hears(/^\d{2}\.\d{2}$/, (ctx) => {
  const booking = ctx.session.booking || {};
  if (booking.step !== 'choose_date') return;

  booking.date = ctx.message.text;
  booking.step = 'choose_time';
  ctx.session.booking = booking;

  ctx.reply(
    `Дата выбрана: ${booking.date}\n\nТеперь введите время начала в формате ЧЧ:ММ (например, 17:00).`,
    Markup.keyboard([['🟥 Назад']]).resize()
  );
});

// Ввод времени (любой текст вида 17:00)
bot.hears(/^\d{1,2}:\d{2}$/, (ctx) => {
  const booking = ctx.session.booking || {};
  if (booking.step !== 'choose_time') return;

  booking.time = ctx.message.text;
  booking.step = 'choose_hours';
  ctx.session.booking = booking;

  ctx.reply(
    `Время начала: ${booking.time}\n\nСколько часов бронируем?`,
    hoursKeyboard()
  );
});

// Выбор количества часов
bot.hears(['2 часа', '3 часа', '4 часа', 'Более 4х'], (ctx) => {
  const booking = ctx.session.booking || {};
  if (booking.step !== 'choose_hours') return;

  booking.hours = ctx.message.text;
  ctx.session.booking = booking;

  // Если Богатырская баня и 2 часа — спрашиваем про купель
  if (booking.bath === 'Богатырская баня' && booking.hours === '2 часа') {
    booking.step = 'choose_kupel';
    ctx.session.booking = booking;
    return ctx.reply(
      'Для Богатырской бани на 2 часа можем добавить купель. Нужна купель?',
      kupelKeyboard()
    );
  }

  // Иначе сразу к веникам
  booking.step = 'choose_venik';
  ctx.session.booking = booking;
  ctx.reply('Нужен ли веник?', venikKeyboard());
});

// Ответ про купель
bot.hears(['Купель нужна', 'Купель не нужна'], (ctx) => {
  const booking = ctx.session.booking || {};
  if (booking.step !== 'choose_kupel') return;

  booking.kupel = ctx.message.text;
  booking.step = 'choose_venik';
  ctx.session.booking = booking;

  ctx.reply('Нужен ли веник?', venikKeyboard());
});

// Выбор веника
bot.hears(['Дубовый веник', 'Берёзовый веник', 'Без веника'], (ctx) => {
  const booking = ctx.session.booking || {};
  if (booking.step !== 'choose_venik') return;

  booking.venik = ctx.message.text;
  booking.step = 'done';
  ctx.session.booking = booking;

  let summary = `Бронирование:\n\n` +
    `Баня: ${booking.bath}\n` +
    `Дата: ${booking.date}\n` +
    `Время: ${booking.time}\n` +
    `Длительность: ${booking.hours}\n`;

  if (booking.bath === 'Богатырская баня' && booking.hours === '2 часа') {
    summary += `Купель: ${booking.kupel || 'не указано'}\n`;
  }

  summary += `Веник: ${booking.venik}\n\n`;

  summary += 'Спасибо! Вашу заявку увидит администратор и свяжется с вами для подтверждения.';

  ctx.reply(summary, mainKeyboard());
});

// ----------------- Express для Render -----------------

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('Rus-kupel-bot is running');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  bot.launch().then(() => console.log('Bot started'));
});

process.on('SIGINT', () => bot.stop('SIGINT'));
process.on('SIGTERM', () => bot.stop('SIGTERM'));
