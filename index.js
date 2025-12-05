import { Telegraf, Markup, session } from 'telegraf';
import express from 'express';

// ================== НАСТРОЙКИ ==================

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || ''; // сюда потом внесём id админа

if (!BOT_TOKEN) {
  throw new Error('Не задан BOT_TOKEN в переменных окружения');
}

const bot = new Telegraf(BOT_TOKEN);

// ================== СЕССИИ ==================

bot.use(session());

function resetBooking(ctx) {
  ctx.session.booking = {
    bath: null,
    date: null,
    time: null,
    hours: null,
    kupel: null,
    venik: null,
    step: 'start',
  };
}

// ================== КЛАВИАТУРЫ ==================

function mainKeyboard() {
  return Markup.keyboard([['🟢 Забронировать']]).resize();
}

function bathKeyboard() {
  return Markup.keyboard([
    ['🟢 Царь баня'],
    ['🟢 Богатырская баня'],
    ['🔴 Назад'],
  ]).resize();
}

function hoursKeyboard() {
  return Markup.keyboard([
    ['2 часа', '3 часа'],
    ['4 часа', 'Более 4-х часов'],
    ['🔴 Назад'],
  ]).resize();
}

function kupelKeyboard() {
  return Markup.keyboard([
    ['Да, добавить купель'],
    ['Нет, без купели'],
    ['🔴 Назад'],
  ]).resize();
}

function venikKeyboard() {
  return Markup.keyboard([
    ['Дубовый веник'],
    ['Берёзовый веник'],
    ['Без веника'],
    ['🔴 Назад'],
  ]).resize();
}

function confirmKeyboard() {
  return Markup.keyboard([
    ['✅ Подтвердить бронь'],
    ['✏️ Изменить'],
  ]).resize();
}

// ================== ПОМОЩНИК: ТЕКСТ ПОДТВЕРЖДЕНИЯ ==================

function buildUserSummaryText(booking) {
  const kupelText =
    booking.bath === 'Богатырская баня'
      ? booking.kupel || 'нет'
      : '-';

  const venikText = booking.venik || 'нет';

  return (
    'Ваша бронь:\n\n' +
    `Баня: ${booking.bath}\n` +
    `Дата: ${booking.date}\n` +
    `Время начала: ${booking.time}\n` +
    `Длительность: ${booking.hours}\n` +
    `Купель: ${kupelText}\n` +
    `Веник: ${venikText}\n\n` +
    'Если всё верно — нажмите «✅ Подтвердить бронь».\n' +
    'Если хотите изменить — нажмите «✏️ Изменить».'
  );
}

function buildAdminText(booking, ctx) {
  const kupelText =
    booking.bath === 'Богатырская баня'
      ? booking.kupel || 'нет'
      : '-';

  const venikText = booking.venik || 'нет';

  const userName = ctx.from.username
    ? '@' + ctx.from.username
    : `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim() || 'без имени';

  return (
    '🔥 Новая бронь\n\n' +
    `Баня: ${booking.bath}\n` +
    `Дата: ${booking.date}\n` +
    `Время начала: ${booking.time}\n` +
    `Длительность: ${booking.hours}\n` +
    `Купель: ${kupelText}\n` +
    `Веник: ${venikText}\n\n` +
    `Клиент: ${userName}\n` +
    `ID: ${ctx.from.id}`
  );
}

// ================== КОМАНДЫ ==================

// /start
bot.start(async (ctx) => {
  resetBooking(ctx);
  await ctx.reply(
    'Привет! Я бот Русской Купели. Чтобы начать запись, нажмите «Забронировать».',
    mainKeyboard()
  );
});

// Доп. команда /book
bot.command('book', async (ctx) => {
  resetBooking(ctx);
  ctx.session.booking.step = 'bath';
  await ctx.reply(
    'Выберите баню:\n1) Царь баня — 2 этажа, много пара\n2) Богатырская баня — классика, купель.',
    bathKeyboard()
  );
});

// ================== ОБРАБОТКА КНОПОК ==================

// Главная кнопка «Забронировать»
bot.hears('🟢 Забронировать', async (ctx) => {
  resetBooking(ctx);
  ctx.session.booking.step = 'bath';
  await ctx.reply(
    'Выберите баню:\n1) Царь баня — 2 этажа, много пара\n2) Богатырская баня — классика, купель.',
    bathKeyboard()
  );
});

// Кнопка «Назад» — возврат в самое начало
bot.hears('🔴 Назад', async (ctx) => {
  resetBooking(ctx);
  await ctx.reply(
    'Вернулись в начало. Нажмите «Забронировать», чтобы оформить новую бронь.',
    mainKeyboard()
  );
});

// Выбор «Царь баня»
bot.hears(/Царь баня/, async (ctx) => {
  const booking = ctx.session.booking || {};
  booking.bath = 'Царь баня';
  booking.step = 'date';
  ctx.session.booking = booking;

  await ctx.reply(
    'Отлично, Царь баня.\n' +
      'Введите, пожалуйста, дату бронирования (например, 12.12.2025 или 12 декабря):'
  );
});

// Выбор «Богатырская баня»
bot.hears(/Богатырская баня/, async (ctx) => {
  const booking = ctx.session.booking || {};
  booking.bath = 'Богатырская баня';
  booking.step = 'date';
  ctx.session.booking = booking;

  await ctx.reply(
    'Отлично, Богатырская баня.\n' +
      'Введите, пожалуйста, дату бронирования (например, 12.12.2025 или 12 декабря):'
  );
});

// Выбор количества часов — 2 часа
bot.hears(/2 часа/, async (ctx) => {
  const booking = ctx.session.booking || {};

  if (!booking.bath || booking.step !== 'hours') {
    await ctx.reply('Сначала выберите баню и укажите дату/время.', mainKeyboard());
    return;
  }

  booking.hours = '2 часа';

  // Если Богатырская баня — спрашиваем про купель
  if (booking.bath === 'Богатырская баня') {
    booking.step = 'kupel';
    ctx.session.booking = booking;
    await ctx.reply('Хотите добавить купель к Богатырской бане?', kupelKeyboard());
  } else {
    booking.step = 'venik';
    ctx.session.booking = booking;
    await ctx.reply('Нужны ли вам веники?', venikKeyboard());
  }
});

// Выбор количества часов — 3 часа
bot.hears(/3 часа/, async (ctx) => {
  const booking = ctx.session.booking || {};

  if (!booking.bath || booking.step !== 'hours') {
    await ctx.reply('Сначала выберите баню и укажите дату/время.', mainKeyboard());
    return;
  }

  booking.hours = '3 часа';
  booking.step = 'venik';
  ctx.session.booking = booking;

  await ctx.reply('Нужны ли вам веники?', venikKeyboard());
});

// Выбор количества часов — 4 часа
bot.hears(/4 часа/, async (ctx) => {
  const booking = ctx.session.booking || {};

  if (!booking.bath || booking.step !== 'hours') {
    await ctx.reply('Сначала выберите баню и укажите дату/время.', mainKeyboard());
    return;
  }

  booking.hours = '4 часа';
  booking.step = 'venik';
  ctx.session.booking = booking;

  await ctx.reply('Нужны ли вам веники?', venikKeyboard());
});

// Выбор количества часов — более 4-х
bot.hears(/Более 4-х часов/, async (ctx) => {
  const booking = ctx.session.booking || {};

  if (!booking.bath || booking.step !== 'hours') {
    await ctx.reply('Сначала выберите баню и укажите дату/время.', mainKeyboard());
    return;
  }

  booking.hours = 'Более 4-х часов';
  booking.step = 'venik';
  ctx.session.booking = booking;

  await ctx.reply('Нужны ли вам веники?', venikKeyboard());
});

// Купель — да
bot.hears('Да, добавить купель', async (ctx) => {
  const booking = ctx.session.booking || {};

  if (booking.step !== 'kupel') {
    await ctx.reply('Сначала дойдите до шага с выбором купели.');
    return;
  }

  booking.kupel = 'да';
  booking.step = 'venik';
  ctx.session.booking = booking;

  await ctx.reply('Нужны ли вам веники?', venikKeyboard());
});

// Купель — нет
bot.hears('Нет, без купели', async (ctx) => {
  const booking = ctx.session.booking || {};

  if (booking.step !== 'kupel') {
    await ctx.reply('Сначала дойдите до шага с выбором купели.');
    return;
  }

  booking.kupel = 'нет';
  booking.step = 'venik';
  ctx.session.booking = booking;

  await ctx.reply('Нужны ли вам веники?', venikKeyboard());
});

// Веники
bot.hears('Дубовый веник', async (ctx) => {
  const booking = ctx.session.booking || {};
  booking.venik = 'дубовый';
  booking.step = 'confirm';
  ctx.session.booking = booking;

  await ctx.reply(buildUserSummaryText(booking), confirmKeyboard());
});

bot.hears('Берёзовый веник', async (ctx) => {
  const booking = ctx.session.booking || {};
  booking.venik = 'берёзовый';
  booking.step = 'confirm';
  ctx.session.booking = booking;

  await ctx.reply(buildUserSummaryText(booking), confirmKeyboard());
});

bot.hears('Без веника', async (ctx) => {
  const booking = ctx.session.booking || {};
  booking.venik = 'без веника';
  booking.step = 'confirm';
  ctx.session.booking = booking;

  await ctx.reply(buildUserSummaryText(booking), confirmKeyboard());
});

// Подтверждение брони
bot.hears('✅ Подтвердить бронь', async (ctx) => {
  const booking = ctx.session.booking || {};

  if (booking.step !== 'confirm') {
    await ctx.reply('Сначала заполните данные брони. Нажмите «Забронировать».', mainKeyboard());
    return;
  }

  // Сообщение админу
  if (ADMIN_CHAT_ID) {
    try {
      await ctx.telegram.sendMessage(ADMIN_CHAT_ID, buildAdminText(booking, ctx));
    } catch (e) {
      console.error('Ошибка отправки админу:', e);
    }
  }

  // Сообщение клиенту
  await ctx.reply(
    '✅ Спасибо! Ваша бронь подтверждена.\n' +
      'Администратор свяжется с вами в ближайшее время.',
    mainKeyboard()
  );

  resetBooking(ctx);
});

// Кнопка «Изменить» — новый цикл брони
bot.hears('✏️ Изменить', async (ctx) => {
  resetBooking(ctx);
  ctx.session.booking.step = 'bath';
  await ctx.reply('Хорошо, давайте оформим бронь заново.\nВыберите баню:', bathKeyboard());
});

// ================== ОБРАБОТКА ПРОСТОГО ТЕКСТА (дата/время) ==================

bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();

  // Команды (типа /start, /book) уже обработаны выше
  if (text.startsWith('/')) {
    return;
  }

  const booking = ctx.session.booking || {};
  const step = booking.step || 'start';

  // Ожидаем дату
  if (step === 'date') {
    booking.date = text;
    booking.step = 'time';
    ctx.session.booking = booking;

    await ctx.reply(
      'Теперь введите время начала (например, 18:00):'
    );
    return;
  }

  // Ожидаем время
  if (step === 'time') {
    booking.time = text;
    booking.step = 'hours';
    ctx.session.booking = booking;

    await ctx.reply('Сколько часов бронируем?', hoursKeyboard());
    return;
  }

  // Если пользователь пишет своё в других шагах
  if (step === 'start' || !step) {
    await ctx.reply(
      'Чтобы оформить бронь, нажмите кнопку «Забронировать».',
      mainKeyboard()
    );
  } else {
    await ctx.reply('Пожалуйста, используйте кнопки под полем ввода.');
  }
});

// ================== ЗАПУСК БОТА И СЕРВЕРА ДЛЯ RENDER ==================

bot.launch().then(() => {
  console.log('Bot started');
});

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('OK');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
