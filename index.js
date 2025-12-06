import { Telegraf, Markup, session } from 'telegraf';
import express from 'express';

// Создаём бота с токеном из переменной окружения
const bot = new Telegraf(process.env.BOT_TOKEN);

// Подключаем сессии, чтобы помнить выбор пользователя
bot.use(session());

// ===== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ СБРОСА БРОНИ =====
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

// ===== КЛАВИАТУРЫ =====

// Главная клавиатура
function mainKeyboard() {
  return Markup.keyboard([['✅ Забронировать']]).resize();
}

// Клавиатура выбора бани
function bathKeyboard() {
  return Markup.keyboard([
    ['🟢 Царь баня', '🟢 Богатырская баня'],
    ['🔙 Назад']
  ]).resize();
}

// Клавиатура выбора количества часов
function hoursKeyboard() {
  return Markup.keyboard([
    ['2 часа', '3 часа'],
    ['4 часа', 'Более 4х'],
    ['🔙 Назад']
  ]).resize();
}

// Клавиатура купели (только для Богатырской при 2-х часах)
function kupelKeyboard() {
  return Markup.keyboard([
    ['Да, добавить купель'],
    ['Без купели'],
    ['🔙 Назад']
  ]).resize();
}

// Клавиатура веника
function venikKeyboard() {
  return Markup.keyboard([
    ['Дубовый веник', 'Берёзовый веник'],
    ['Без веника'],
    ['🔙 Назад']
  ]).resize();
}

// Клавиатура подтверждения
function confirmKeyboard() {
  return Markup.keyboard([
    ['✅ Забронировать'],
    ['✏️ Изменить']
  ]).resize();
}

// Текст итоговой брони
function bookingSummary(booking) {
  return (
    '🧾 Ваша бронь:\n' +
    `Баня: ${booking.bath}\n` +
    `Дата: ${booking.date}\n` +
    `Время начала: ${booking.time}\n` +
    `Длительность: ${booking.hours}\n` +
    `Купель: ${booking.kupel || 'нет'}\n` +
    `Веник: ${booking.venik || 'нет'}`
  );
}

// ===== ОБРАБОТЧИКИ КОМАНД =====

// /start
bot.start(async (ctx) => {
  resetBooking(ctx);
  await ctx.reply(
    'Привет! Я бот Русской Купели. Чтобы начать запись, нажмите «Забронировать».',
    mainKeyboard()
  );
});

// ===== ОБРАБОТКА КНОПОК И ТЕКСТА =====

// Кнопка «Забронировать»
bot.hears('✅ Забронировать', async (ctx) => {
  const booking = ctx.session.booking || {};
  const step = booking.step || 'start';

  // Если мы ещё не начали оформление — запускаем выбор бани
  if (step === 'start') {
    booking.step = 'bath';
    ctx.session.booking = booking;
    return ctx.reply('Выберите баню:', bathKeyboard());
  }

  // Если мы на шаге подтверждения — считаем, что бронь подтверждена
  if (step === 'confirm') {
    booking.step = 'done';
    ctx.session.booking = booking;

    // Сообщение клиенту
    await ctx.reply(
      '🔥 Спасибо! Ваша бронь подтверждена.\nАдминистратор свяжется с вами в ближайшее время.',
      mainKeyboard()
    );

    // 👉 Тут можно отправлять администратору (пока закомментировано)
    // const adminChatId = 123456789; // сюда потом подставишь ID админа
    // await ctx.telegram.sendMessage(adminChatId, `Новая бронь:\n${bookingSummary(booking)}`);

    // Сбрасываем состояние
    resetBooking(ctx);
    return;
  }

  // На других шагах просим двигаться по логике
  return ctx.reply('Давайте сначала закончим текущую бронь 🙂');
});

// Кнопка «Изменить» — возвращаемся в начало оформления
bot.hears('✏️ Изменить', async (ctx) => {
  resetBooking(ctx);
  ctx.session.booking.step = 'bath';
  await ctx.reply('Хорошо, давайте оформим бронь заново.\nВыберите баню:', bathKeyboard());
});

// Выбор бани
bot.hears(['🟢 Царь баня', '🟢 Богатырская баня'], async (ctx) => {
  const booking = ctx.session.booking || {};
  booking.bath = ctx.message.text.replace('🟢 ', '');
  booking.step = 'date';
  ctx.session.booking = booking;

  await ctx.reply(
    'Введите желаемую дату (например, 12.12.25 или 12 декабря):'
  );
});

// Кнопка «Назад»
bot.hears('🔙 Назад', async (ctx) => {
  // Для простоты — всегда возвращаемся к выбору бани
  const booking = ctx.session.booking || {};
  booking.step = 'bath';
  booking.date = null;
  booking.time = null;
  booking.hours = null;
  booking.kupel = null;
  booking.venik = null;
  ctx.session.booking = booking;

  await ctx.reply('Вернулись к выбору бани. Пожалуйста, выберите баню:', bathKeyboard());
});

// Выбор количества часов
bot.hears(['2 часа', '3 часа', '4 часа', 'Более 4х'], async (ctx) => {
  const booking = ctx.session.booking || {};
  if (booking.step !== 'hours') {
    return;
  }

  booking.hours = ctx.message.text;
  ctx.session.booking = booking;

  // Если Богатырская баня и 2 часа — предлагаем купель
  if (booking.bath === 'Богатырская баня' && booking.hours === '2 часа') {
    booking.step = 'kupel';
    ctx.session.booking = booking;
    return ctx.reply('Добавить купель?', kupelKeyboard());
  }

  // Иначе сразу переходим к веникам
  booking.kupel = booking.kupel || 'нет';
  booking.step = 'venik';
  ctx.session.booking = booking;

  return ctx.reply('Выберите вариант веника:', venikKeyboard());
});

// Выбор купели
bot.hears(['Да, добавить купель', 'Без купели'], async (ctx) => {
  const booking = ctx.session.booking || {};
  if (booking.step !== 'kupel') {
    return;
  }

  booking.kupel = ctx.message.text === 'Да, добавить купель' ? 'да' : 'нет';
  booking.step = 'venik';
  ctx.session.booking = booking;

  await ctx.reply('Выберите вариант веника:', venikKeyboard());
});

// Выбор веника
bot.hears(['Дубовый веник', 'Берёзовый веник', 'Без веника'], async (ctx) => {
  const booking = ctx.session.booking || {};
  if (booking.step !== 'venik') {
    return;
  }

  if (ctx.message.text === 'Без веника') {
    booking.venik = 'нет';
  } else {
    booking.venik = ctx.message.text;
  }

  booking.step = 'confirm';
  ctx.session.booking = booking;

  const summary = bookingSummary(booking);

  await ctx.reply(
    summary + '\n\nЕсли всё верно — нажмите «Забронировать».\nЧтобы изменить — нажмите «Изменить».',
    confirmKeyboard()
  );
});

// ===== ОБРАБОТКА ПРОСТОГО ТЕКСТА (ДАТА/ВРЕМЯ) =====
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  const booking = ctx.session.booking || {};

  // Если сессии ещё не было — инициализируем
  if (!booking.step) {
    resetBooking(ctx);
    return ctx.reply('Нажмите кнопку «Забронировать», чтобы начать.', mainKeyboard());
  }

  // Если ждём дату
  if (booking.step === 'date') {
    booking.date = text;
    booking.step = 'time';
    ctx.session.booking = booking;
    return ctx.reply('Введите время начала (например, 17:00):');
  }

  // Если ждём время
  if (booking.step === 'time') {
    booking.time = text;
    booking.step = 'hours';
    ctx.session.booking = booking;
    return ctx.reply('Сколько часов бронируем?', hoursKeyboard());
  }

  // Если ждём выбор по кнопкам — подсказываем
  if (booking.step === 'hours') {
    return ctx.reply('Пожалуйста, выберите количество часов с помощью кнопок ниже.', hoursKeyboard());
  }

  if (booking.step === 'kupel') {
    return ctx.reply('Пожалуйста, выберите вариант купели с помощью кнопок.', kupelKeyboard());
  }

  if (booking.step === 'venik') {
    return ctx.reply('Пожалуйста, выберите веник с помощью кнопок.', venikKeyboard());
  }

  if (booking.step === 'confirm') {
    return ctx.reply('Подтвердите или измените бронь с помощью кнопок.', confirmKeyboard());
  }

  // На всякий случай — дефолт
  return ctx.reply('Нажмите «Забронировать», чтобы начать оформление.', mainKeyboard());
});

// ===== ЗАПУСК БОТА И СЕРВЕРА ДЛЯ RENDER =====

bot.launch();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.get('/', (req, res) => {
  res.send('OK');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
