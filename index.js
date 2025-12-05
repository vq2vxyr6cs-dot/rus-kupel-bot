import { Telegraf, Markup, session } from 'telegraf';
import express from 'express';

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = 8123590904; // твой Telegram ID (@Ru_kupel)

// ----------------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ -----------------

// Сброс брони
function resetBooking(ctx) {
  ctx.session.booking = {
    bath: null,
    date: null,
    time: null,
    hours: null,
    kupel: null,
    venik: null,
  step: 'main',
  step: 'start',
  };
}

// Главная клавиатура
function mainKeyboard() {
  return Markup.keyboard([
    ['🟢 Забронировать'],
  ]).resize();
}

// Клавиатура выбора бани
// Главная клавиатура (после итога)
function mainKeyboard() {
  return Markup.keyboard([
    ['🟢 Забронировать'],
    ['✏️ Изменить'],
  ]).resize();
}

// Клавиатура выбора часов
function hoursKeyboard() {
  return Markup.keyboard([
    ['2 часа'],
    ['3 часа'],
    ['4 часа'],
    ['Более 4х'],
    ['🔴 Назад'],
  ]).resize();
}

// Клавиатура купели (только для Богатырской при 2 часах)
function kupelKeyboard() {
  return Markup.keyboard([
    ['🟢 Добавить купель'],
    ['Без купели'],
    ['🔴 Назад'],
  ]).resize();
}

// Клавиатура веников
function venikKeyboard() {
  return Markup.keyboard([
    ['Дубовый веник'],
    ['Березовый веник'],
    ['Без веника'],
    ['🔴 Начать заново'],
  ]).resize();
}

// Итоговое сообщение
function buildSummary(ctx) {
  const b = ctx.session.booking;

  const bathName =
    b.bath === 'czar' ? 'Царь баня' :
    b.bath === 'bogatyr' ? 'Богатырская баня' :
    '—';

  const kupelText =
    b.kupel === true ? 'нужна' :
    b.kupel === false ? 'не нужна' :
    '—';

  const venikText =
    b.venik === 'oak' ? 'дубовый' :
    b.venik === 'birch' ? 'берёзовый' :
    'без веника';

  return (
    '✅ Ваша бронь:\n\n' +
    `Баня: ${bathName}\n` +
    `Дата: ${b.date || '—'}\n` +
    `Время: ${b.time || '—'}\n` +
    `Длительность: ${
      b.hours === 'more' ? 'более 4 часов' :
      b.hours ? b.hours + ' ч.' :
      '—'
    }\n` +
    (b.bath === 'bogatyr' ? `Купель: ${kupelText}\n` : '') +
    `Веник: ${venikText}\n\n` +
    'Проверьте, всё ли верно.\n' +
    '🟢 Нажмите «Забронировать» чтобы подтвердить.\n' +
    '✏️ Или «Изменить» чтобы исправить.'
  );
}

// ----------------- НАСТРОЙКА БОТА -----------------

bot.use(session());

// Инициализация сессии
bot.use((ctx, next) => {
  if (!ctx.session) ctx.session = {};
  if (!ctx.session.booking) {
    resetBooking(ctx);
  }
  return next();
});

// Старт
bot.start((ctx) => {
  resetBooking(ctx);
  ctx.session.booking.step = 'start';
  return ctx.reply(
    'Привет! Я бот Русской Купели. Чтобы начать запись, нажмите «Забронировать».',
    mainKeyboard()
  );
});

// Команда /book
bot.command('book', (ctx) => {
  resetBooking(ctx);
  ctx.session.booking.step = 'bath';
  return ctx.reply(
    'Выберите баню:',
    bathKeyboard()
  );
});

// ----------------- ОБРАБОТКА КНОПОК И ТЕКСТА -----------------

// Главная кнопка «Забронировать»
// Кнопка «Забронировать»
// 1) если шаг "done" — подтверждаем бронь
// 2) иначе — начинаем новую
// Кнопка «Забронировать»
// Кнопка «Забронировать» – подтверждаем бронь
bot.hears('✅ Забронировать', async (ctx) => {
  const booking = ctx.session.booking || {};

  // Проверяем, что мы реально на шаге подтверждения
  if (booking.step !== 'confirm') {
    return;
  }

  // Текст для администратора
  const adminText =
    '🔥 Новая бронь\n\n' +
    `Баня: ${booking.bath}\n` +
    `Дата: ${booking.date}\n` +
    `Время начала: ${booking.time}\n` +
    `Длительность: ${booking.hours} часа(ов)\n` +
    `Купель: ${booking.kupel || 'нет'}\n` +
    `Веник: ${booking.venik || 'нет'}\n\n` +
    `Имя: ${ctx.from.first_name || ''} ${ctx.from.last_name || ''}\n` +
    `Username: @${ctx.from.username || 'нет'}`;

  // Отправляем бронь тебе, как админу
  await ctx.telegram.sendMessage('@Ru_kupel', adminText);

  // Отвечаем клиенту
  await ctx.reply(
    'Спасибо! Ваша бронь отправлена администратору. ' +
      'С вами свяжутся в ближайшее время 🙌',
    mainKeyboard()
  );

  // Сбрасываем данные брони
  resetBooking(ctx);
});
  // Подтверждение готовой брони
  if (step === 'done') {
    await ctx.reply(
      '🙏 Спасибо! Ваша бронь подтверждена.\nАдминистратор свяжется с вами в ближайшее время.',
      mainKeyboard()
    );

    resetBooking(ctx);
    ctx.session.booking.step = 'start';
    return;
  }

  // Начало новой брони
  resetBooking(ctx);
  ctx.session.booking.step = 'bath';
  return ctx.reply('Выберите баню:', bathKeyboard());
});
// Кнопка «Изменить» — возвращаемся в начало оформления
// Кнопка «Изменить»
bot.hears('🔄 Изменить', async (ctx) => {
  resetBooking(ctx);
  await ctx.reply(
    'Хорошо, давайте начнём заново. Нажмите «Забронировать».',
    mainKeyboard()
  );
});
// Обработка любого текста
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  const booking = ctx.session.booking || {};

  // Кнопки "Назад" / "Начать заново"
  if (text === '🔴 Начать заново') {
    resetBooking(ctx);
    ctx.session.booking.step = 'bath';
    return ctx.reply('Начнём заново.\nВыберите баню:', bathKeyboard());
  }

  if (text === '🔴 Назад') {
    // Простой вариант: возвращаемся к выбору бани
    ctx.session.booking.step = 'bath';
    return ctx.reply('Вернулись к выбору бани. Выберите баню:', bathKeyboard());
  }

  // Шаг: выбор бани
  if (booking.step === 'bath') {
    if (text.includes('Царь баня')) {
      booking.bath = 'tsar';
    } else if (text.includes('Богатырская баня')) {
      booking.bath = 'bogatyr';
    } else {
      return ctx.reply('Пожалуйста, выберите баню по кнопке.', bathKeyboard());
    }

    booking.step = 'date';
    return ctx.reply(
      'Введите желаемую дату (например: 12.12.25):',
      Markup.removeKeyboard()
    );
  }

  // Шаг: дата
  if (booking.step === 'date') {
    booking.date = text.trim();
    booking.step = 'time';
    return ctx.reply(
      'Теперь введите время начала (например: 17:00):'
    );
  }

  // Шаг: время
  if (booking.step === 'time') {
    booking.time = text.trim();
    booking.step = 'hours';
    return ctx.reply(
      'Сколько часов бронируем?',
      hoursKeyboard()
    );
  }

  // Шаг: часы
  if (booking.step === 'hours') {
    if (text === '2 часа') booking.hours = 2;
    else if (text === '3 часа') booking.hours = 3;
    else if (text === '4 часа') booking.hours = 4;
    else if (text === 'Более 4х') booking.hours = 'more';
    else {
      return ctx.reply('Пожалуйста, выберите вариант по кнопке.', hoursKeyboard());
    }

    // Если Богатырская и ровно 2 часа — спрашиваем про купель
    if (booking.bath === 'bogatyr' && booking.hours === 2) {
      booking.step = 'kupel';
      return ctx.reply(
        'Нужна ли купель?',
        kupelKeyboard()
      );
    }

    // Иначе — сразу к веникам
    booking.step = 'venik';
    return ctx.reply(
      'Выберите вариант по веникам:',
      venikKeyboard()
    );
  }

  // Шаг: купель (только Богатырская 2 часа)
  if (booking.step === 'kupel') {
    if (text === '🟢 Добавить купель') {
      booking.kupel = true;
    } else if (text === 'Без купели') {
      booking.kupel = false;
    } else {
      return ctx.reply('Пожалуйста, выберите по кнопке.', kupelKeyboard());
    }

    booking.step = 'venik';
    return ctx.reply(
      'Выберите вариант по веникам:',
      venikKeyboard()
    );
  }

  // Шаг: веники
  if (booking.step === 'venik') {
    if (text === 'Дубовый веник') booking.venik = 'oak';
    else if (text === 'Березовый веник') booking.venik = 'birch';
    else if (text === 'Без веника') booking.venik = 'none';
    else {
      return ctx.reply('Пожалуйста, выберите по кнопке.', venikKeyboard());
    }

    booking.step = 'done';

    // Итог
    await ctx.reply(buildSummary(ctx), mainKeyboard());
    return;
  }

  // Если шаг неизвестен — начнём заново
  resetBooking(ctx);
  ctx.session.booking.step = 'bath';
  return ctx.reply('Что-то пошло не так, начнём заново. Выберите баню:', bathKeyboard());
});

// ----------------- EXPRESS ДЛЯ RENDER -----------------

const app = express();
app.get('/', (req, res) => {
  res.send('Rus Kupel bot is running');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log('Server listening on port', PORT);
});

// Запуск бота
bot.launch().then(() => {
  console.log('Bot started');
});

// Корректная остановка
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
