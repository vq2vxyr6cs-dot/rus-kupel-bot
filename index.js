import { Telegraf, Markup, session } from 'telegraf';
import express from 'express';

const bot = new Telegraf(process.env.BOT_TOKEN);

// Если потом захочешь получать заявки в личку администратора —
// создашь переменную окружения ADMIN_CHAT_ID c числовым ID
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || null;

// ---------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------

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

function mainKeyboard() {
  return Markup.keyboard([['🟢 Забронировать']]).resize();
}

function bathKeyboard() {
  return Markup.keyboard([
    ['🟢 Царь баня'],
    ['🟢 Богатырская баня'],
    ['🔙 Назад'],
  ]).resize();
}

function hoursKeyboard() {
  return Markup.keyboard([
    ['2 часа', '3 часа'],
    ['4 часа', 'Более 4х'],
    ['🔙 Назад'],
  ]).resize();
}

function kupelKeyboard() {
  return Markup.keyboard([
    ['💧 С купелью'],
    ['Без купели'],
  ]).resize();
}

function venikKeyboard() {
  return Markup.keyboard([
    ['🌿 Дубовый веник'],
    ['🌿 Берёзовый веник'],
    ['Без веника'],
  ]).resize();
}

function confirmKeyboard() {
  return Markup.keyboard([
    ['✔️ Забронировать'],
    ['🔄 Изменить'],
  ]).resize();
}

function bookingSummary(booking) {
  return (
    'Ваша бронь:\n\n' +
    `Баня: ${booking.bath}\n` +
    `Дата: ${booking.date}\n` +
    `Время начала: ${booking.time}\n` +
    `Длительность: ${booking.hours}\n` +
    `Купель: ${booking.kupel || 'нет'}\n` +
    `Веник: ${booking.venik || 'нет'}`
  );
}

// ---------- НАСТРОЙКА БОТА ----------

bot.use(session());

// /start
bot.start(async (ctx) => {
  resetBooking(ctx);
  ctx.session.booking.step = 'start';

  await ctx.reply(
    'Привет! Я бот Русской Купели.\n' +
      'Помогу забронировать баню.\n\n' +
      'Нажмите «Забронировать», чтобы начать.',
    mainKeyboard()
  );
});

// Главная кнопка "Забронировать"
bot.hears('🟢 Забронировать', async (ctx) => {
  resetBooking(ctx);
  ctx.session.booking.step = 'bath';

  await ctx.reply('Выберите баню:', bathKeyboard());
});

// Выбор бани
bot.hears('🟢 Царь баня', async (ctx) => {
  const booking = ctx.session.booking || {};
  booking.bath = 'Царь баня';
  booking.step = 'date';
  ctx.session.booking = booking;

  await ctx.reply('Введите желаемую дату (например, 12.12.2025):');
});

bot.hears('🟢 Богатырская баня', async (ctx) => {
  const booking = ctx.session.booking || {};
  booking.bath = 'Богатырская баня';
  booking.step = 'date';
  ctx.session.booking = booking;

  await ctx.reply('Введите желаемую дату (например, 12.12.2025):');
});

// Кнопка "Назад" (из выбора бани/часов)
bot.hears('🔙 Назад', async (ctx) => {
  const booking = ctx.session.booking || {};
  // Возвращаем в начало
  resetBooking(ctx);
  ctx.session.booking.step = 'bath';

  await ctx.reply('Хорошо, давайте выберем баню заново.', bathKeyboard());
});

// ---------- ОБЩИЙ ОБРАБОТЧИК ТЕКСТА ПО ШАГАМ ----------

bot.on('text', async (ctx, next) => {
  const text = ctx.message.text;
  const booking = ctx.session.booking || {};

  switch (booking.step) {
    case 'date': {
      booking.date = text;
      booking.step = 'time';
      ctx.session.booking = booking;

      await ctx.reply('Введите время начала (например, 18:00):');
      return;
    }

    case 'time': {
      booking.time = text;
      booking.step = 'hours';
      ctx.session.booking = booking;

      await ctx.reply('Сколько часов бронируем?', hoursKeyboard());
      return;
    }

    default:
      // Если шаг не наш — передаём дальше,
      // чтобы сработали handlers выше (hears на кнопки)
      return next();
  }
});

// Выбор количества часов
bot.hears(['2 часа', '3 часа', '4 часа', 'Более 4х'], async (ctx) => {
  const booking = ctx.session.booking || {};
  if (!booking.bath) {
    // Если почему-то нет бани — отправим в начало
    resetBooking(ctx);
    ctx.session.booking.step = 'bath';
    await ctx.reply('Давайте начнём сначала. Выберите баню:', bathKeyboard());
    return;
  }

  booking.hours = ctx.message.text;
  ctx.session.booking = booking;

  // Если богатырская и ровно 2 часа — спрашиваем про купель
  if (booking.bath === 'Богатырская баня' && booking.hours === '2 часа') {
    booking.step = 'kupel';
    ctx.session.booking = booking;

    await ctx.reply('Нужна ли купель?', kupelKeyboard());
    return;
  }

  // Иначе сразу к веникам
  booking.step = 'venik';
  ctx.session.booking = booking;

  await ctx.reply('Нужен ли веник?', venikKeyboard());
});

// Выбор купели
bot.hears(['💧 С купелью', 'Без купели'], async (ctx) => {
  const booking = ctx.session.booking || {};
  if (booking.step !== 'kupel') {
    return;
  }

  booking.kupel = ctx.message.text === '💧 С купелью' ? 'да' : 'нет';
  booking.step = 'venik';
  ctx.session.booking = booking;

  await ctx.reply('Нужен ли веник?', venikKeyboard());
});

// Выбор веника
bot.hears(
  ['🌿 Дубовый веник', '🌿 Берёзовый веник', 'Без веника'],
  async (ctx) => {
    const booking = ctx.session.booking || {};
    if (booking.step !== 'venik') {
      return;
    }

    if (ctx.message.text === 'Без веника') {
      booking.venik = 'нет';
    } else if (ctx.message.text === '🌿 Дубовый веник') {
      booking.venik = 'дубовый';
    } else if (ctx.message.text === '🌿 Берёзовый веник') {
      booking.venik = 'берёзовый';
    }

    booking.step = 'confirm';
    ctx.session.booking = booking;

    const summary = bookingSummary(booking);

    await ctx.reply(
      summary + '\n\nЕсли всё верно, нажмите «Забронировать».\n' +
        'Если хотите что-то изменить — нажмите «Изменить».',
      confirmKeyboard()
    );
  }
);

// ---------- ПОДТВЕРЖДЕНИЕ / ИЗМЕНЕНИЕ ----------

// Кнопка «Забронировать» в режиме подтверждения
bot.hears('✔️ Забронировать', async (ctx) => {
  const booking = ctx.session.booking || {};

  if (booking.step !== 'confirm') {
    return;
  }

  // Отправляем админу, если указан ADMIN_CHAT_ID
  if (ADMIN_CHAT_ID) {
    const adminText =
      '🔥 Новая бронь\n\n' +
      `Баня: ${booking.bath}\n` +
      `Дата: ${booking.date}\n` +
      `Время начала: ${booking.time}\n` +
      `Длительность: ${booking.hours}\n` +
      `Купель: ${booking.kupel || 'нет'}\n` +
      `Веник: ${booking.venik || 'нет'}\n\n` +
      `От: @${ctx.from.username || 'без username'} (id: ${ctx.from.id})`;

    await ctx.telegram.sendMessage(ADMIN_CHAT_ID, adminText);
  }

  await ctx.reply(
    '🙏 Спасибо! Ваша бронь подтверждена.\n' +
      'Администратор свяжется с вами в ближайшее время.',
    mainKeyboard()
  );

  resetBooking(ctx);
});

// Кнопка «Изменить» — возвращаемся в начало оформления
bot.hears('🔄 Изменить', async (ctx) => {
  resetBooking(ctx);
  ctx.session.booking.step = 'bath';

  await ctx.reply('Хорошо, давайте оформим бронь заново.\nВыберите баню:', bathKeyboard());
});

// ---------- ФОЛЛБЭК, ЕСЛИ ПОЛЬЗОВАТЕЛЬ ПИШЕТ ЧТО-ТО СВОЁ ----------

bot.on('message', async (ctx) => {
  const booking = ctx.session.booking || {};

  if (!booking.step || booking.step === 'start') {
    await ctx.reply(
      'Чтобы оформить бронь, нажмите кнопку «Забронировать».',
      mainKeyboard()
    );
  }
});

// ---------- ЗАПУСК БОТА И СЕРВЕРА ДЛЯ RENDER ----------

bot.launch();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.get('/', (req, res) => {
  res.send('OK');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
