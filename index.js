import { Telegraf, Markup, session } from 'telegraf';
import express from 'express';

// Создаём бота с токеном из переменной окружения
const bot = new Telegraf(process.env.BOT_TOKEN);

// ▼ ВСТАВЬТЕ ЭТУ СТРОКУ ▼
const ADMIN_ID = 8123590904; // Ваш ID
// ▲ ВСТАВЬТЕ ЭТУ СТРОКУ ▲

// Подключаем сессии, чтобы помнить выбор пользователя
// Подключаем сессии
// Добавьте defaultSession
bot.use(session({
  defaultSession: () => ({ 
    booking: {
      bath: null,
      date: null,
      time: null,
      hours: null,
      kupel: null,
      venik: null,
      step: 'start'
    }
  })
}));

// ===== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ СБРОСА БРОНИ =====
function resetBooking(ctx) {
    ctx.session.booking = {
        bath: null,     // баня
        date: null,     // дата
        time: null,     // время начала
        hours: null,    // длительность
        kupel: null,    // купель
        venik: null,    // веник
        step: 'start'   // текущий шаг
    };
}
// Главная клавиатура
function mainKeyboard() {
  return Markup.keyboard([
    ['✅ Забронировать'],
    ['👀 Обзор бань'],
    ['💰 Цены'],
    ['📍 Как добраться']  // Новая кнопка
  ]).resize();
}

// Клавиатура выбора бани
function bathKeyboard() {
  return Markup.keyboard([
    ['🟢 Царь баня', '🟢 Богатырская баня'],
    ['🔙 В меню']  // Изменили текст
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
// Текст итоговой брони (для пользователя и админа)
function bookingSummary(booking, user = null) {
  let summary = '🧾 *ВАША БРОНЬ:*\n';
  summary += `• Баня: ${booking.bath}\n`;
  summary += `• Дата: ${booking.date}\n`;
  summary += `• Время: ${booking.time}\n`;
  summary += `• Часов: ${booking.hours}\n`;
  summary += `• Купель: ${booking.kupel || 'нет'}\n`;
  summary += `• Веник: ${booking.venik || 'нет'}\n`;
  
  if (user) {
    summary += `\n👤 *КЛИЕНТ:* ${user.first_name}`;
    summary += user.username ? ` (@${user.username})` : '';
    summary += `\n🆔 ID: ${user.id}`;
  }
  
  return summary;
}
// ===== ОБРАБОТЧИКИ КОМАНД =====

// /start
bot.start(async (ctx) => {
  resetBooking(ctx);
  await ctx.replyWithPhoto(
   { url: 'https://ltdfoto.ru/images/nuZOOu' }, // 
    {
      caption: '🔥 Добро пожаловать в Русскую Купель!\n\nВыберите действие:',
      reply_markup: mainKeyboard().reply_markup
    }
  );
});
// ===== ОБРАБОТКА КНОПОК И ТЕКСТА =====
// Обработка кнопки "👀 Обзор бань"
bot.hears('👀 Обзор бань', async (ctx) => {
  await ctx.reply(
    'Выберите баню для просмотра обзора:',
    Markup.keyboard([
      ['🎥 Богатырская баня', '🎥 Царь баня'],
      ['🔙 Назад']
    ]).resize()
  );
});
// Обзор Богатырской бани
bot.hears('🎥 Богатырская баня', async (ctx) => {
  await ctx.replyWithVideo(
  'https://rutube.ru/video/9e98c0a3012bd66d879b80dbde3e0bb8/', // ← ДОБАВЬТЕ ЗАПЯТУЮ ЗДЕСЬ!
  {
    caption: '🎥 Обзор Богатырской бани\n\nПосле просмотра можете вернуться в меню.',
    reply_markup: Markup.inlineKeyboard([
      Markup.button.callback('Вернуться в меню', 'back_to_menu')
    ]).reply_markup
  }
);
});

// Обзор Царь бани
bot.hears('🎥 Царь баня', async (ctx) => {
  await ctx.replyWithVideo(
    'https://rutube.ru/video/0b6b92ff325c2d2cba1298e635610f3d/', // ← ЗАПЯТАЯ!
    {
      caption: '🎥 Обзор Царь бани\n\nПосле просмотра можете вернуться в меню.',
      reply_markup: Markup.inlineKeyboard([
        Markup.button.callback('Вернуться в меню', 'back_to_menu')
      ]).reply_markup
    }
  );
});

// Обработка inline-кнопки "Вернуться в меню"
bot.action('back_to_menu', async (ctx) => {
  await ctx.deleteMessage();
  await ctx.reply('Возвращаю в главное меню:', mainKeyboard());
});
// Обработка кнопки "💰 Цены"
bot.hears('💰 Цены', async (ctx) => {
  // Отправляем картинку с ценами
  await ctx.replyWithPhoto(
    { url: 'https://example.com/ваше-фото-цен.jpg' }, // Замените на реальное фото
    {
      caption: '💰 Актуальные цены на бани\n\n• Богатырская баня: X руб/час\n• Царь баня: Y руб/час\n• Купель: Z руб\n• Веники: N руб',
      reply_markup: mainKeyboard().reply_markup
    }
  );
  
  // Или, если нет картинки:
  // await ctx.reply(
  //   '💰 *Актуальные цены:*\n\n' +
  //   '• Богатырская баня:1200,1500,2000 руб/час\n' +
  //   '• Царь баня: 3500 руб/час\n' +
  //   '• Купель: 500 руб (только к Богатырской на 2 часа)\n' +
  //   '• Веник: 350-400 руб\n\n' +
  //   'Минимальное время брони - 2 часа.',
  //   { parse_mode: 'Markdown', ...mainKeyboard() }
  // );
});
// Обработка кнопки "📍 Как добраться"
bot.hears('📍 Как добраться', async (ctx) => {
  // Отправляем видео с маршрутом
  await ctx.replyWithVideo(
    'https://https://rutube.ru/shorts/4ca5cac8a8a2fd485e047390cb98d8c7 // Замените на реальную ссылку
    {
      caption: '📍 *Как добраться до Русской Купели:*\n\n' +
               '• Адрес: г. Новосибирск, ул. Советское шоссе 12 к1\n' +
               '• Метро: «Маркса» (25 минут на авто)\n' +
               '• Авто: парковка у входа\n\n' +
               'На видео показан подробный маршрут.',
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        Markup.button.url('🗺️ Открыть в Яндекс.Картах', 'https://yandex.ru/maps/?text=Русская+Купель+Москва'),
        Markup.button.callback('📞 Позвонить', 'call_us')
      ])
    }
  );
});

// Обработка кнопки "Позвонить"
bot.action('call_us', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('📞 Наш телефон: +7 (XXX) XXX-XX-XX\nЗвоните с 9:00 до 22:00!');
});
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
 // Если мы на шаге подтверждения — считаем, что бронь подтверждена
if (step === 'confirm') {
  booking.step = 'done';
  ctx.session.booking = booking;

  // 1. Сообщение клиенту
  await ctx.reply(
    '🔥 Спасибо! Ваша бронь подтверждена.\nАдминистратор свяжется с вами в ближайшее время.',
    mainKeyboard()
  );

  // 2. Отправляем администратору
  try {
    const userInfo = ctx.from; // Информация о пользователе
    const adminMessage = `📞 *НОВАЯ БРОНЬ!*\n\n${bookingSummary(booking, userInfo)}\n\n⏰ ${new Date().toLocaleString('ru-RU')}`;
    
    await ctx.telegram.sendMessage(
      ADMIN_ID,
      adminMessage,
      { parse_mode: 'Markdown' }
    );
    
    // Кнопки для админа
    await ctx.telegram.sendMessage(
      ADMIN_ID,
      'Действия с бронированием:',
      Markup.inlineKeyboard([
        Markup.button.callback('✅ Подтвердить', `confirm_${ctx.from.id}`),
        Markup.button.callback('❌ Отклонить', `reject_${ctx.from.id}`),
        Markup.button.url('💬 Написать', `tg://user?id=${ctx.from.id}`)
      ])
    );
  } catch (error) {
    console.error('Ошибка отправки админу:', error);
  }

  // 3. Сбрасываем состояние
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
bot.hears('🔙 Назад', async (ctx) => {
  const booking = ctx.session.booking || {};
  
  // Если мы в процессе бронирования — возвращаемся к выбору бани
  if (booking.step && booking.step !== 'start') {
    booking.step = 'bath';
    booking.date = null;
    booking.time = null;
    booking.hours = null;
    booking.kupel = null;
    booking.venik = null;
    ctx.session.booking = booking;
    
    await ctx.reply('Вернулись к выбору бани:', bathKeyboard());
  } else {
    // Иначе возвращаемся в главное меню
    await ctx.reply('Главное меню:', mainKeyboard());
  }
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
// ===== ОБРАБОТКА КНОПОК АДМИНА =====

// Подтверждение брони админом
bot.action(/confirm_(\d+)/, async (ctx) => {
  const userId = ctx.match[1];
  
  await ctx.answerCbQuery('✅ Бронь подтверждена!');
  await ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n✅ Подтверждено администратором`);
  
  // Уведомляем пользователя
  await ctx.telegram.sendMessage(
    userId,
    '✅ Ваша бронь подтверждена администратором! Ждём вас в указанное время.'
  );
});

// Отклонение брони админом
bot.action(/reject_(\d+)/, async (ctx) => {
  const userId = ctx.match[1];
  
  await ctx.answerCbQuery('❌ Бронь отклонена!');
  await ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n❌ Отклонено администратором`);
  
  // Уведомляем пользователя
  await ctx.telegram.sendMessage(
    userId,
    '❌ К сожалению, администратор отклонил вашу бронь. Пожалуйста, свяжитесь с нами для уточнения.'
  );
});
// Команда для админа
bot.command('admin', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply('⛔ Доступ запрещён');
  }
  
  await ctx.reply(
    'Панель администратора:',
    Markup.keyboard([
      ['📊 Статистика', '📋 Активные брони'],
      ['⚙️ Настройки'],
      ['🔙 В меню']
    ]).resize()
  );
});
// ===== ЗАПУСК БОТА И СЕРВЕРА ДЛЯ RENDER =====

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware для парсинга JSON (добавьте эту строку)
app.use(express.json());

// Health check endpoint (оставляем)
app.get('/', (req, res) => {
  res.send('Бот Русской Купели работает! ✅');
});

// Режим разработки или продакшн
if (process.env.NODE_ENV === 'production') {
  // 1. Установите вебхук
  const WEBHOOK_DOMAIN = process.env.RENDER_EXTERNAL_URL || `https://ваш-сервис.onrender.com`;
  
  // 2. Настройте вебхук
  app.use(await bot.createWebhook({
    domain: WEBHOOK_DOMAIN,
    path: '/webhook'  // По умолчанию
  }));
  
  // 3. Запустите сервер
  app.listen(PORT, async () => {
    console.log(`🚀 Бот запущен в продакшн режиме`);
    console.log(`📡 Вебхук: ${WEBHOOK_DOMAIN}/webhook`);
    console.log(`🔗 Порт: ${PORT}`);
  });
} else {
  // Локальная разработка
  bot.launch();
  console.log('🔧 Бот запущен в режиме разработки (polling)');
}

