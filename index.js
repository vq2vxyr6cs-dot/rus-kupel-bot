import { Telegraf, Markup, session } from 'telegraf';
import express from 'express';

// ===== 1. Создаём Express-приложение =====
const app = express();

// ===== 2. Получаем токен и ВАЖНАЯ проверка =====
const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;
const ADMIN_ID = 8123590904;

// Логируем для отладки (увидим в логах Railway)
console.log('🔧 Проверка переменных:');
console.log('   PORT:', PORT);
console.log('   BOT_TOKEN задан?', !!BOT_TOKEN ? 'ДА (есть)' : 'НЕТ (пусто!)');

// ===== 3. Проверяем токен =====
if (!BOT_TOKEN) {
    console.error('❌ Бот НЕ создан — нет токена.');
    console.error('   Добавьте BOT_TOKEN в переменные окружения Railway');
    process.exit(1); // Завершаем приложение
}

// ===== 4. Создаём бота =====
const bot = new Telegraf(BOT_TOKEN);
console.log('✅ Бот создан с токеном');
    
// ===== 5. Подключаем сессии =====
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
// ===== 6. Добавляем обработчик вебхука =====
app.use(express.json());
app.use(bot.webhookCallback('/webhook'));

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
// ===== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ =====
// Безопасное обновление сообщений с Markdown разметкой
function safeEditMessage(ctx, additionalText) {
  // Получаем оригинальный текст из callbackQuery
  const originalText = ctx.callbackQuery.message.text;
  
  // Очищаем от Markdown разметки (простой способ)
  const cleanText = originalText
    .replace(/\*/g, '')    // удаляем *
    .replace(/_/g, '')     // удаляем _
    .replace(/`/g, '')     // удаляем `
    .replace(/\[/g, '')    // удаляем [ для ссылок
    .replace(/\]/g, '')    // удаляем ] для ссылок
    .replace(/\(/g, '')    // удаляем ( для ссылок
    .replace(/\)/g, '');   // удаляем ) для ссылок
  
  // Возвращаем безопасный текст
  return `${cleanText}\n\n${additionalText}`;
}

// ===== ОБРАБОТЧИКИ КОМАНД =====
// /start
bot.start(async (ctx) => {
  resetBooking(ctx);
  await ctx.replyWithPhoto(
   { url: 'https://ltdfoto.ru/images/2025/12/08/PRAIS-01.10.2025.png' },
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
  await ctx.reply(
  'https://t.me/rukupel/4/', // ← ДОБАВЬТЕ ЗАПЯТУЮ ЗДЕСЬ!
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
  await ctx.reply(
    'https://t.me/rukupel/3/', // ← ЗАПЯТАЯ!
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
  await ctx.replyWithPhoto(
    { url: 'https://ltdfoto.ru/images/2025/12/08/PRAIS-01.10.2025.png' },
    {
      caption: '💰 *Актуальные цены на бани:*\n\n' +
               '• Богатырская баня: 1200 руб, 1500 руб, 2000 руб \n' +
               '• Царь баня: 3500 руб/час\n' +
               '• Купель: 1000 руб (только к Богатырской на 2 часа)\n' +
               '• Веник: 350-400 руб\n\n' +
               'Минимальное время брони - 2 часа.',
      parse_mode: 'Markdown',
      reply_markup: mainKeyboard().reply_markup
    }
  );
});
  
  

// Обработка кнопки "📍 Как добраться"
bot.hears('📍 Как добраться', async (ctx) => {
  // Отправляем видео с маршрутом
  await ctx.reply(
    'https://t.me/rukupel/6/', // 
    {
      caption: '📍 *Как добраться до Русской Купели:*\n\n' +
               '• Адрес: г. Новосибирск, ул. Советское шоссе 12 к1\n' +
               '• Метро: «Маркса» (25 минут на авто)\n' +
               '• Авто: парковка у входа\n\n' +
               'На видео показан подробный маршрут.',
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        Markup.button.url('🗺️ Открыть в Яндекс.Картах', 'https://yandex.ru/maps/-/CLgxm4OM'),
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
      const userInfo = ctx.from;
      const adminMessage = `📞 *НОВАЯ БРОНЬ!*\n\n${bookingSummary(booking, userInfo)}\n\n⏰ ${new Date().toLocaleString('ru-RU')}`;
      
      // Отправляем сообщение админу с кнопками
      await ctx.telegram.sendMessage(
        ADMIN_ID,
        adminMessage,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Подтвердить', callback_data: `confirm_${ctx.from.id}_${Date.now()}` },
                { text: '❌ Отклонить', callback_data: `reject_${ctx.from.id}_${Date.now()}` }
              ],
              [
                { text: '✏️ Исправить', callback_data: `edit_${ctx.from.id}_${Date.now()}` },
                { text: '💬 Написать', url: `tg://user?id=${ctx.from.id}` }
              ],
              [
                { text: '📞 Позвонить', callback_data: `call_${ctx.from.id}_${Date.now()}` }
              ]
            ]
          }
        }
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
// ===== ОБРАБОТКА КНОПОК АДМИНА =====

// 1. ✅ Подтверждение брони админом
bot.action(/^confirm_(\d+)_(\d+)$/, async (ctx) => {
  const userId = ctx.match[1];
  const adminUsername = ctx.from.username || 'администратора';

  await ctx.answerCbQuery('✅ Бронь подтверждена!');

  // Обновляем сообщение безопасно
  const newText = safeEditMessage(ctx, `✅ Подтверждено @${adminUsername}`);
  await ctx.editMessageText(newText, { parse_mode: null });

  // Уведомляем клиента
  try {
    await ctx.telegram.sendMessage(
      userId,
      '✅ *Ваша бронь подтверждена администратором!*\n\nЖдем вас в указанное время.',
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Не удалось уведомить клиента:', error);
  }
});

// 2. ❌ Отклонение брони админом
bot.action(/^reject_(\d+)_(\d+)$/, async (ctx) => {
  const userId = ctx.match[1];
  const adminUsername = ctx.from.username || 'администратора';

  await ctx.answerCbQuery('❌ Бронь отклонена!');

  // Обновляем сообщение безопасно
  const newText = safeEditMessage(ctx, `❌ Отклонено @${adminUsername}`);
  await ctx.editMessageText(newText, { parse_mode: null });

  // Уведомляем клиента
  try {
    await ctx.telegram.sendMessage(
      userId,
      '❌ *К сожалению, администратор отклонил вашу бронь.*\n\nПожалуйста, свяжитесь с нами для уточнения:\n📞 +7 (XXX) XXX-XX-XX',
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Не удалось уведомить клиента:', error);
  }
});

// 3. ✏️ Редактирование брони админом
bot.action(/^edit_(\d+)_(\d+)$/, async (ctx) => {
  const userId = ctx.match[1];
  const timestamp = ctx.match[2];

  await ctx.answerCbQuery('Открываем меню редактирования...');

  // Отправляем админу меню выбора поля для редактирования
  await ctx.reply(
    `Выберите, что хотите исправить в бронировании (ID клиента: ${userId}):`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📅 Дата и время', callback_data: `editDateTime_${userId}_${timestamp}` }],
          [{ text: '🏠 Тип бани', callback_data: `editBath_${userId}_${timestamp}` }],
          [{ text: '⏱ Часы', callback_data: `editHours_${userId}_${timestamp}` }],
          [{ text: '↩️ Назад', callback_data: `backToView_${userId}_${timestamp}` }]
        ]
      }
    }
  );
});

// 4. 📞 Позвонить (показывает контактную информацию)
bot.action(/^call_(\d+)_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery('📞 Показываю контакты...');

  await ctx.reply(
    '📞 *Контактная информация:*\n\n' +
    '• Телефон компании: +7 (XXX) XXX-XX-XX\n' +
    '• Для связи с клиентом используйте кнопку "💬 Написать"',
    { 
      parse_mode: 'Markdown'
    }
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
  // Простая проверка формата
  if (!text.match(/^\d{1,2}\.\d{1,2}\.\d{2,4}$/)) {
    return ctx.reply('❌ Введите дату в формате ДД.ММ.ГГ (например, 25.12.24)');
  }
  booking.date = text;
  booking.step = 'time';
  ctx.session.booking = booking;
  return ctx.reply('📅 Дата принята! Введите время начала (например, 17:00):');
}
 // Если ждём время
if (booking.step === 'time') {
  if (!text.match(/^\d{1,2}:\d{2}$/)) {
    return ctx.reply('❌ Введите время в формате ЧЧ:ММ (например, 17:00)');
  }
  booking.time = text;
  booking.step = 'hours';
  ctx.session.booking = booking;
  return ctx.reply('⏱ Сколько часов бронируем?', hoursKeyboard());
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

// Команда для админа
bot.command('admin', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    await ctx.reply('⛔ Доступ запрещён');
    return;
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

// ===== ЗАПУСК СЕРВЕРА =====

// Healthcheck для Railway
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Telegram Bot API',
    timestamp: new Date().toISOString()
  });
});

// Запускаем сервер
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`🌐 Webhook доступен по адресу: /webhook`);
  console.log(`🏥 Healthcheck: http://localhost:${PORT}/`);
  console.log(`🤖 Бот готов к работе!`);
});
