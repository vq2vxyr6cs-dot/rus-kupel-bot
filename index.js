import { Telegraf, session } from 'telegraf';
import http from 'http';

// ===== Настройки бота =====
const bot = new Telegraf(process.env.BOT_TOKEN);

// Включаем сессии, чтобы помнить выбор пользователя между сообщениями
bot.use(session());

// Гарантируем, что у каждого пользователя своя сессия-объект
bot.use((ctx, next) => {
  if (!ctx.session) {
    ctx.session = {};
  }
  return next();
});

// ===== Тексты кнопок (чтобы не ошибаться в написании) =====
const BTN_BOOK_NOW = 'Сразу забронировать';
const BTN_SHOW_BATHS = 'Обзор бань';
const BTN_TSAR = 'Царь баня';
const BTN_BOGATYR = 'Богатырская баня';
const BTN_2H = '2 часа';
const BTN_3H = '3 часа';
const BTN_4H = '4 часа';
const BTN_KUPEL_YES = 'Да, нужна купель';
const BTN_KUPEL_NO = 'Нет, без купели';
const BTN_VENIK_OAK = 'Дуб';
const BTN_VENIK_BIRCH = 'Берёза';
const BTN_VENIK_NONE = 'Без веников';

// Сброс сессии
function resetSession(ctx) {
  ctx.session = {
    step: null,
    bath: null,
    datetime: null,
    duration: null,
    kupel: null,
    venik: null,
  };
}

// Стартовый вопрос – что делаем?
function askWhatToDo(ctx) {
  resetSession(ctx);
  ctx.session.step = 'choose_mode';

  return ctx.reply(
    'Привет! Я бот Русской Купели.\n' +
      'Могу помочь забронировать время.\n\n' +
      'Что вы хотите сделать?',
    {
      reply_markup: {
        keyboard: [
          [{ text: BTN_BOOK_NOW }],
          [{ text: BTN_SHOW_BATHS }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  );
}

// Выбор бани
function askBath(ctx, prefixText = '') {
  ctx.session.step = 'choose_bath';
  return ctx.reply(
    (prefixText ? prefixText + '\n\n' : '') + 'Какую баню будем бронировать?',
    {
      reply_markup: {
        keyboard: [
          [{ text: BTN_TSAR }],
          [{ text: BTN_BOGATYR }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  );
}

// Спрашиваем дату и время
function askDateTime(ctx) {
  ctx.session.step = 'ask_datetime';
  return ctx.reply(
    'На какую дату и время планируете приход?\n' +
      'Напишите текстом, например:\n' +
      '«10 декабря с 19 до 21».'
  );
}

// Спрашиваем длительность (для Богатырской)
function askDuration(ctx) {
  ctx.session.step = 'ask_duration';
  return ctx.reply('На сколько часов хотите забронировать Богатырскую баню?', {
    reply_markup: {
      keyboard: [
        [{ text: BTN_2H }],
        [{ text: BTN_3H }],
        [{ text: BTN_4H }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

// Спрашиваем про купель
function askKupel(ctx) {
  ctx.session.step = 'ask_kupel';
  return ctx.reply('Для Богатырской бани на 2 часа нужна ли купель?', {
    reply_markup: {
      keyboard: [
        [{ text: BTN_KUPEL_YES }],
        [{ text: BTN_KUPEL_NO }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

// Спрашиваем про веники
function askVenik(ctx) {
  ctx.session.step = 'ask_venik';
  return ctx.reply('Нужны ли веники?', {
    reply_markup: {
      keyboard: [
        [{ text: BTN_VENIK_OAK }],
        [{ text: BTN_VENIK_BIRCH }],
        [{ text: BTN_VENIK_NONE }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

// Показываем итог брони
function showSummary(ctx) {
  ctx.session.step = 'finished';

  const {
    bath,
    datetime,
    duration,
    kupel,
    venik,
  } = ctx.session;

  let text = '✅ Черновик брони:\n\n';
  text += `Баня: ${bath || '—'}\n`;
  text += `Дата и время: ${datetime || '—'}\n`;

  if (bath === BTN_BOGATYR && duration) {
    text += `Длительность: ${duration}\n`;
  }

  if (bath === BTN_BOGATYR && duration === BTN_2H) {
    text += `Купель: ${kupel || '—'}\n`;
  }

  text += `Веники: ${venik || '—'}\n\n`;
  text +=
    'Если всё верно, просто отправьте это сообщение администратору ' +
    'или напишите свои пожелания.';

  return ctx.reply(text);
}

// ===== Команды =====

// /start
bot.start((ctx) => {
  return askWhatToDo(ctx);
});

// /book
bot.command('book', (ctx) => {
  return askWhatToDo(ctx);
});

// /cancel – на всякий случай
bot.command('cancel', (ctx) => {
  resetSession(ctx);
  return ctx.reply('Диалог сброшен. Напишите /book, чтобы начать заново.');
});

// Также реагируем на слово "забронировать"
bot.hears(/забронировать/i, (ctx) => {
  return askWhatToDo(ctx);
});

// ===== Обработка кнопок и шагов =====

// 1. Выбор режима (сразу бронировать или обзор)
bot.hears([BTN_BOOK_NOW, BTN_SHOW_BATHS], (ctx) => {
  if (ctx.session.step !== 'choose_mode') {
    // Если человек нажал кнопку вне сценария – начинаем заново
    return askWhatToDo(ctx);
  }

  if (ctx.message.text === BTN_SHOW_BATHS) {
    // Короткий обзор
    ctx.reply(
      'Краткий обзор:\n\n' +
        '🟣 Царь баня — просторная, классическая русская парная.\n' +
        '🟣 Богатырская баня — большая мужская парная, хорошо подходит для компании.'
    );
    return askBath(ctx, 'Теперь выберите баню:');
  }

  // Сразу бронировать
  return askBath(ctx);
});

// 2. Выбор бани
bot.hears([BTN_TSAR, BTN_BOGATYR], (ctx) => {
  if (ctx.session.step !== 'choose_bath') {
    // Если человек тыкнул кнопку не в тот момент – запускаем сценарий заново
    return askWhatToDo(ctx);
  }

  ctx.session.bath = ctx.message.text;
  return askDateTime(ctx);
});

// 3. Пользователь пишет дату и время
bot.on('text', (ctx, next) => {
  // Если мы на шаге выбора даты
  if (ctx.session.step === 'ask_datetime') {
    ctx.session.datetime = ctx.message.text;

    if (ctx.session.bath === BTN_BOGATYR) {
      // Для Богатырской нужно спросить длительность
      return askDuration(ctx);
    } else {
      // Для Царь бани – сразу к веникам
      return askVenik(ctx);
    }
  }

  // Если мы на другом шаге, передаём дальше (к hears для кнопок и т.д.)
  return next();
});

// 4. Длительность (только для Богатырской)
bot.hears([BTN_2H, BTN_3H, BTN_4H], (ctx) => {
  if (ctx.session.step !== 'ask_duration') {
    return askWhatToDo(ctx);
  }

  ctx.session.duration = ctx.message.text;

  if (ctx.message.text === BTN_2H) {
    // Если 2 часа – спрашиваем про купель
    return askKupel(ctx);
  } else {
    // 3 или 4 часа – сразу к веникам
    return askVenik(ctx);
  }
});

// 5. Купель
bot.hears([BTN_KUPEL_YES, BTN_KUPEL_NO], (ctx) => {
  if (ctx.session.step !== 'ask_kupel') {
    return askWhatToDo(ctx);
  }

  ctx.session.kupel = ctx.message.text;
  return askVenik(ctx);
});

// 6. Веники
bot.hears([BTN_VENIK_OAK, BTN_VENIK_BIRCH, BTN_VENIK_NONE], (ctx) => {
  if (ctx.session.step !== 'ask_venik') {
    return askWhatToDo(ctx);
  }

  ctx.session.venik = ctx.message.text;
  return showSummary(ctx);
});

// ===== Запасной обработчик сообщений =====
bot.on('message', (ctx) => {
  // Если сценарий ещё не начат
  if (!ctx.session.step || ctx.session.step === 'finished') {
    return ctx.reply(
      'Я могу помочь с бронированием.\n' +
        'Напишите /book или «забронировать», чтобы начать.'
    );
  }

  // Если непонятное сообщение в середине сценария
  return ctx.reply(
    'Продолжайте по кнопкам, пожалуйста. Если хотите начать заново, ' +
      'напишите /cancel и затем /book.'
  );
});

// ===== HTTP-сервер для Render =====
const PORT = process.env.PORT || 10000;

http
  .createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok' }));
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Rus Kupel bot is running');
  })
  .listen(PORT, () => {
    console.log('Server is listening on port', PORT);
  });

// Стартуем бота
bot.launch()
  .then(() => console.log('Bot started'))
  .catch((err) => console.error('Bot launch error:', err));
