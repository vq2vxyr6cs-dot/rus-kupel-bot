import { Telegraf, Markup, session } from 'telegraf';
import express from 'express';

// Создаём бота с токеном из переменной окружения
const bot = new Telegraf(process.env.BOT_TOKEN);

// Подключаем сессии, чтобы помнить выбор пользователя
bot.use(session());

// ====== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ СБРОСА БРОНИ ======
function resetBooking(ctx) {
  ctx.session.booking = {
    bath: null,   // баня
    date: null,   // дата
    time: null,   // время начала
    hours: null,  // длительность
    kupel: null,  // купель
    venik: null,  // веник
    step: 'start' // текущий шаг
  };
}

// ====== КЛАВИАТУРЫ ======

// Главная клавиатура
function mainKeyboard() {
  return Markup.keyboard([['✅ Забронировать']]).resize();
}

// Выбор бани
function bathKeyboard() {
  return Markup.keyboard([
    ['🟢 Царь баня', '🟢 Богатырская баня'],
    ['🔙 Назад']
  ]).resize();
}

// Выбор количества часов
function hoursKeyboard() {
  return Markup.keyboard([
    ['2 часа', '3 часа'],
    ['4 часа', 'Более 4х'],
    ['🔙 Назад']
  ]).resize();
}

// Веники
function venikKeyboard() {
  return Markup.keyboard([
    ['Дубовый веник', 'Березовый веник'],
    ['Без веника'],
    ['🔙 Назад']
  ]).resize();
}

// Подтверждение / изменение
function confirmKeyboard() {
  return Markup.keyboard([
    ['✅ Подтвердить бронь'],
    ['✏️ Изменить']
  ]).resize();
}

// Клавиатура для купели (только для Богатырской бани, 2 часа)
function kupelKeyboard() {
  return Markup.keyboard([
    ['Купель да', 'Купель нет'],
    ['🔙 Назад']
  ]).resize();
}

// ====== СТАРТ ======

bot.start(async (ctx) => {
  resetBooking(ctx);
  await ctx.reply(
    'Привет! Я бот Русской Купели.\nЧтобы начать запись, нажмите «Забронировать».',
    mainKeyboard()
  );
});

// ====== ГЛАВНАЯ КНОПКА «Забронировать» ======

bot.hears('✅ Забронировать', async (ctx) => {
  resetBooking(ctx);
  ctx.session.booking.step = 'bath';
  await ctx.reply('Выберите баню:', bathKeyboard());
});

// ====== НАЗАД – ПРОСТО В НАЧАЛО ======

bot.hears('🔙 Назад', async (ctx) => {
  resetBooking(ctx);
  await ctx.reply(
    'Вернулись в начало.\nЧтобы оформить бронь, нажмите «Забронировать».',
    mainKeyboard()
  );
});

// ====== ВЫБОР БАНИ ======

bot.hears(['🟢 Царь баня', '🟢 Богатырская баня'], async (ctx) => {
  const booking = ctx.session.booking || {};
  if (booking.step !== 'bath') return;

  const text = ctx.message.text;
  booking.bath =
    text === '🟢 Царь баня' ? 'Царь баня' : 'Богатырская баня';
  booking.step = 'date';
  ctx.session.booking = booking;

  await ctx.reply('Введите желаемую дату (например, 12.12.2025):');
});

// ====== ОБРАБОТКА ТЕКСТА (ДАТА / ВРЕМЯ И ПРОЧЕЕ) ======

bot.on('text', async (ctx) => {
  const booking = ctx.session.booking || {};
  const step = booking.step;
  const text = ctx.message.text;

  // Все кнопки, которые обрабатываются отдельными handlers
  const buttonTexts = [
    '✅ Забронировать',
    '🟢 Царь баня',
    '🟢 Богатырская баня',
    '🔙 Назад',
    '2 часа',
    '3 часа',
    '4 часа',
    'Более 4х',
    'Купель да',
    'Купель нет',
    'Дубовый веник',
    'Березовый веник',
    'Без веника',
    '✅ Подтвердить бронь',
    '✏️ Изменить'
  ];

  // Если это кнопка или команда — не обрабатываем тут
  if (buttonTexts.includes(text) || text.startsWith('/')) {
    return;
  }

  // Шаг выбора даты
  if (step === 'date') {
    booking.date = text;
    booking.step = 'time';
    ctx.session.booking = booking;
    await ctx.reply('Введите время начала (например, 18:00):');
    return;
  }

  // Шаг выбора времени
  if (step === 'time') {
    booking.time = text;
    booking.step = 'hours';
    ctx.session.booking = booking;
    await ctx.reply('Сколько часов бронируем?', hoursKeyboard());
    return;
  }

  // Если мы ни в каком шаге — просто подсказываем, что делать
  if (!step || step === 'start') {
    await ctx.reply(
      'Чтобы оформить бронь, нажмите кнопку «Забронировать».',
      mainKeyboard()
    );
    return;
  }
});

// ====== ВЫБОР КОЛИЧЕСТВА ЧАСОВ ======

bot.hears(['2 часа', '3 часа', '4 часа', 'Более 4х'], async (ctx) => {
  const booking = ctx.session.booking || {};
  if (booking.step !== 'hours') return;

  const text = ctx.message.text;
  booking.hours = text;

  // Если Богатырская баня и 2 часа — предлагаем купель
  if (booking.bath === 'Богатырская баня' && text === '2 часа') {
    booking.step = 'kupel';
    ctx.session.booking = booking;
    await ctx.reply('Добавить купель?', kupelKeyboard());
  } else {
    booking.kupel = 'нет';
    booking.step = 'venik';
    ctx.session.booking = booking;
    await ctx.reply('Выберите веник:', venikKeyboard());
  }
});

// ====== КУПЕЛЬ (ТОЛЬКО ДЛЯ БОГАТЫРСКОЙ БАНИ 2 ЧАСА) ======

bot.hears(['Купель да', 'Купель нет'], async (ctx) => {
  const booking = ctx.session.booking || {};
  if (booking.step !== 'kupel') return;

  booking.kupel = ctx.message.text === 'Купель да' ? 'да' : 'нет';
  booking.step = 'venik';
  ctx.session.booking = booking;

  await ctx.reply('Выберите веник:', venikKeyboard());
});

// ====== ВЕНИК ======

bot.hears(['Дубовый веник', 'Березовый веник', 'Без веника'], async (ctx) => {
  const booking = ctx.session.booking || {};
  if (booking.step !== 'venik') return;

  booking.venik = ctx.message.text;
  booking.step = 'confirm';
  ctx.session.booking = booking;

  const summary =
    'Ваша бронь:\n' +
    `Баня: ${booking.bath}\n` +
    `Дата: ${booking.date}\n` +
    `Время начала: ${booking.time}\n` +
    `Длительность: ${booking.hours}\n` +
    `Купель: ${booking.kupel || 'нет'}\n` +
    `Веник: ${booking.venik}\n\n` +
    'Все верно?';

  await ctx.reply(summary, confirmKeyboard());
});

// ====== ПОДТВЕРЖДЕНИЕ БРОНИ ======

bot.hears('✅ Подтвердить бронь', async (ctx) => {
  const booking = ctx.session.booking || {};
  if (booking.step !== 'confirm') return;

  const adminUsername = 'Ru_kupel'; // без @

  const adminText =
    '🔥 Новая бронь\n\n' +
    `Клиент: @${ctx.from.username || '-'}\n` +
    `Имя: ${ctx.from.first_name || ''} ${ctx.from.last_name || ''}\n\n` +
    `Баня: ${booking.bath}\n` +
    `Дата: ${booking.date}\n` +
    `Время начала: ${booking.time}\n` +
    `Длительность: ${booking.hours}\n` +
    `Купель: ${booking.kupel || 'нет'}\n` +
    `Веник: ${booking.venik}`;

  // Сообщение администратору
  try {
    await bot.telegram.sendMessage(`@${adminUsername}`, adminText);
  } catch (e) {
    console.error('Не удалось отправить администратору:', e.message);
  }

  await ctx.reply(
    '🙏 Спасибо! Ваша бронь подтверждена.\nАдминистратор свяжется с вами в ближайшее время.',
    mainKeyboard()
  );

  resetBooking(ctx);
});

// ====== ИЗМЕНИТЬ БРОНЬ – НАЧАТЬ ЗАНОВО ======

bot.hears('✏️ Изменить', async (ctx) => {
  resetBooking(ctx);
  ctx.session.booking.step = 'bath';
  await ctx.reply('Хорошо, давайте оформим бронь заново.\nВыберите баню:', bathKeyboard());
});

// ====== ЗАПУСК БОТА И EXPRESS-СЕРВЕРА ДЛЯ RENDER ======

bot.launch();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.get('/', (req, res) => {
  res.send('OK');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
