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
            venik: initVenikSession(),
            step: 'start'
        }
    })
}));

// ===== 6. Добавляем обработчик вебхука =====
app.use(express.json());
app.use(bot.webhookCallback('/webhook'));

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

// Инициализация веников в сессии (ОСТАВЛЯЕМ ТОЛЬКО ОДИН ЭКЗЕМПЛЯР)
function initVenikSession() {
  return {
    dub: { type: 'Дубовый', count: 0, price: 400 },
    bereza: { type: 'Берёзовый', count: 0, price: 350 },
    step: 'select', // 'select' → 'quantity' → 'confirm'
    selectedType: null
  };
}

// Сброс брони
function resetBooking(ctx) {
    ctx.session.booking = {
        bath: null,
        date: null,
        time: null,
        hours: null,
        kupel: null,
        venik: initVenikSession(),
        step: 'start'
    };
}

// Функция для получения текста сводки по веникам
function getVenikSummary(venikSession) {
  let summary = '📊 *Ваш выбор веников:*\n';
  let totalCount = 0;
  let totalPrice = 0;
  
  if (venikSession.dub.count > 0) {
    summary += `• ${venikSession.dub.type}: ${venikSession.dub.count} шт. (${venikSession.dub.price * venikSession.dub.count} руб)\n`;
    totalCount += venikSession.dub.count;
    totalPrice += venikSession.dub.price * venikSession.dub.count;
  }
  
  if (venikSession.bereza.count > 0) {
    summary += `• ${venikSession.bereza.type}: ${venikSession.bereza.count} шт. (${venikSession.bereza.price * venikSession.bereza.count} руб)\n`;
    totalCount += venikSession.bereza.count;
    totalPrice += venikSession.bereza.price * venikSession.bereza.count;
  }
  
  if (totalCount === 0) {
    summary += '• Веники не выбраны\n';
  } else {
    summary += `\n*Итого:* ${totalCount} шт. на сумму ${totalPrice} руб`;
  }
  
  return summary;
}

// КЛАВИАТУРЫ
function mainKeyboard() {
  return Markup.keyboard([
    ['✅ Забронировать'],
    ['👀 Обзор бань'],
    ['💰 Цены'],
    ['📍 Как добраться']
  ]).resize();
}

function bathKeyboard() {
  return Markup.keyboard([
    ['🤴🏻 Царь баня', '🟢 Богатырская баня'],
    ['🔙 В меню']
  ]).resize();
}

function hoursKeyboard() {
  return Markup.keyboard([
    ['2 часа', '3 часа'],
    ['4 часа', 'Более 4х'],
    ['🔙 Назад']
  ]).resize();
}

function kupelKeyboard() {
  return Markup.keyboard([
    ['Да, добавить купель'],
    ['Без купели'],
    ['🔙 Назад']
  ]).resize();
}

function confirmKeyboard() {
  return Markup.keyboard([
    ['✅ Забронировать'],
    ['✏️ Изменить']
  ]).resize();
}

function venikKeyboard(venikSession = null) {
  if (venikSession && venikSession.step === 'confirm') {
    return Markup.keyboard([
      ['✅ Подтвердить веники'],
      ['✏️ Изменить веники'],
      ['🚫 Без веников']
    ]).resize();
  }
  
  return Markup.keyboard([
    ['🌳 Дубовый веник', '🌿 Берёзовый веник'],
    ['📊 Посмотреть выбор', '✅ Готово'],
    ['🚫 Без веников']
  ]).resize();
}

function venikQuantityKeyboard() {
  return Markup.keyboard([
    ['1 шт', '2 шт', '3 шт', '4 шт'],
    ['↩️ Назад к выбору типа']
  ]).resize();
}

// Текст итоговой брони
function bookingSummary(booking, user = null) {
  let summary = '🧾 *ВАША БРОНЬ:*\n';
  summary += `• Баня: ${booking.bath}\n`;
  summary += `• Дата: ${booking.date}\n`;
  summary += `• Время: ${booking.time}\n`;
  summary += `• Часов: ${booking.hours}\n`;
  
  if (booking.bath === 'Царь баня') {
    summary += `• Купель: включена\n`;
  } else if (booking.bath === 'Богатырская баня') {
    const hoursNum = parseInt(booking.hours) || 0;
    if (hoursNum >= 3 || booking.kupel === 'да') {
      summary += `• Купель: включена\n`;
    } else {
      summary += `• Купель: ${booking.kupel || 'нет'}\n`;
    }
  }
  
  summary += `\n📊 *ВЕНИКИ:*\n`;
  if (booking.venik) {
    const venikSummary = getVenikSummary(booking.venik);
    const lines = venikSummary.split('\n');
    summary += lines.slice(1).join('\n');
  } else {
    summary += '• Веники не выбраны\n';
  }
  
  if (user) {
    summary += `\n👤 *КЛИЕНТ:* ${user.first_name}`;
    summary += user.username ? ` (@${user.username})` : '';
    summary += `\n🆔 ID: ${user.id}`;
  }
  
  return summary;
}

// Безопасное обновление сообщений
function safeEditMessage(ctx, additionalText) {
  const originalText = ctx.callbackQuery.message.text;
  
  const cleanText = originalText
    .replace(/\*/g, '')
    .replace(/_/g, '')
    .replace(/`/g, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '');
  
  return `${cleanText}\n\n${additionalText}`;
}

// ===== ОБРАБОТЧИКИ КОМАНД =====
bot.start(async (ctx) => {
  resetBooking(ctx);
  await ctx.replyWithPhoto(
    { url: 'https://ltdfoto.ru/image/nyAdWS' },
    {
      caption: '🔥 Добро пожаловать в Русскую Купель!\n\nВыберите действие:',
      reply_markup: mainKeyboard().reply_markup
    }
  );
});

// ===== ОБРАБОТКА КНОПОК И ТЕКСТА =====
bot.hears('👀 Обзор бань', async (ctx) => {
  await ctx.reply(
    'Выберите баню для просмотра обзора:',
    Markup.keyboard([
      ['🎥 Богатырская баня', '🎥 Царь баня'],
      ['🔙 Назад']
    ]).resize()
  );
});

bot.hears('🎥 Богатырская баня', async (ctx) => {
  await ctx.replyWithVideo(
    'https://t.me/rukupel/4/',
    {
      caption: '🎥 Обзор Богатырской бани\n\nПосле просмотра можете вернуться в меню.',
      reply_markup: Markup.inlineKeyboard([
        Markup.button.callback('Вернуться в меню', 'back_to_menu')
      ]).reply_markup
    }
  );
});

bot.hears('🎥 Царь баня', async (ctx) => {
  await ctx.replyWithVideo(
    'https://t.me/rukupel/3/',
    {
      caption: '🎥 Обзор Царь бани\n\nПосле просмотра можете вернуться в меню.',
      reply_markup: Markup.inlineKeyboard([
        Markup.button.callback('Вернуться в меню', 'back_to_menu')
      ]).reply_markup
    }
  );
});

bot.action('back_to_menu', async (ctx) => {
  await ctx.deleteMessage();
  await ctx.reply('Возвращаю в главное меню:', mainKeyboard());
});

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

bot.hears('📍 Как добраться', async (ctx) => {
  await ctx.replyWithVideo(
    'https://t.me/rukupel/6/',
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

bot.action('call_us', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('📞 Наш телефон: +7 (966) 500-39-30\nЗвоните с 8:00 до 22:00!');
});

// Кнопка «Забронировать»
bot.hears('✅ Забронировать', async (ctx) => {
  const booking = ctx.session.booking || {};
  const step = booking.step || 'start';

  if (step === 'start') {
    booking.step = 'bath';
    ctx.session.booking = booking;
    return ctx.reply('Выберите баню:', bathKeyboard());
  }

  if (step === 'confirm') {
    booking.step = 'done';
    ctx.session.booking = booking;

    await ctx.reply(
      '🔥 Спасибо! Ваша бронь принята.\nАдминистратор свяжется с вами в ближайшее время для подтверждения.',
      mainKeyboard()
    );

    try {
      const userInfo = ctx.from;
      const adminMessage = `📞 *НОВАЯ БРОНЬ!*\n\n${bookingSummary(booking, userInfo)}\n\n⏰ ${new Date().toLocaleString('ru-RU')}`;
      
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
                { text: '💬 Открыть бота', url: `https://t.me/Rrukupel_bot` }
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
    
    resetBooking(ctx);
    return;
  }

  return ctx.reply('Давайте сначала закончим текущую бронь 🙂');
});

bot.hears('✏️ Изменить', async (ctx) => {
  resetBooking(ctx);
  ctx.session.booking.step = 'bath';
  await ctx.reply('Хорошо, давайте оформим бронь заново.\nВыберите баню:', bathKeyboard());
});

// Выбор бани
bot.hears(['🤴🏻 Царь баня', '🟢 Богатырская баня'], async (ctx) => {
  const booking = ctx.session.booking || {};
  booking.bath = ctx.message.text
    .replace('🤴🏻 ', '')
    .replace('🟢 ', '')
    .trim();
  booking.step = 'date';
  ctx.session.booking = booking;
  
  await ctx.reply('Введите желаемую дату (например, 12.12.25 или 12 декабря):');
});

bot.hears('🔙 В меню', async (ctx) => {
  resetBooking(ctx);
  await ctx.reply('Главное меню:', mainKeyboard());
});

bot.hears('🔙 Назад', async (ctx) => {
  const booking = ctx.session.booking || {};
  
  if (booking.step && booking.step !== 'start') {
    booking.step = 'bath';
    booking.date = null;
    booking.time = null;
    booking.hours = null;
    booking.kupel = null;
    booking.venik = initVenikSession();
    ctx.session.booking = booking;
    
    await ctx.reply('Вернулись к выбору бани:', bathKeyboard());
  } else {
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
  const hoursNum = parseInt(booking.hours) || 0;
  ctx.session.booking = booking;

  if (booking.bath === 'Богатырская баня') {
    if (hoursNum < 3) {
      booking.step = 'kupel';
      ctx.session.booking = booking;
      return ctx.reply('Добавить купель?', kupelKeyboard());
    } else {
      booking.kupel = 'да (автоматически)';
      booking.step = 'venik';
      ctx.session.booking = booking;
      return ctx.reply('✅ Купель автоматически включена (от 3-х часов).\n\nВыберите вариант веника:', venikKeyboard());
    }
  } else if (booking.bath === 'Царь баня') {
    booking.kupel = 'включена';
    booking.step = 'venik';
    ctx.session.booking = booking;
    return ctx.reply('Выберите вариант веника:', venikKeyboard());
  }
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
bot.hears(['🌳 Дубовый веник', '🌿 Берёзовый веник'], async (ctx) => {
  const booking = ctx.session.booking || {};
  if (booking.step !== 'venik' || !booking.venik) {
    return;
  }

  const venikType = ctx.message.text.includes('Дубовый') ? 'dub' : 'bereza';
  booking.venik.selectedType = venikType;
  booking.venik.step = 'quantity';
  ctx.session.booking = booking;

  await ctx.reply(
    `Сколько ${venikType === 'dub' ? 'дубовых' : 'берёзовых'} веников добавить? (можно от 1 до 4)`,
    venikQuantityKeyboard()
  );
});

bot.hears(['1 шт', '2 шт', '3 шт', '4 шт'], async (ctx) => {
  const booking = ctx.session.booking || {};
  if (booking.step !== 'venik' || !booking.venik || booking.venik.step !== 'quantity') {
    return;
  }

  const count = parseInt(ctx.message.text);
  const venikType = booking.venik.selectedType;
  
  if (venikType === 'dub') {
    booking.venik.dub.count = count;
  } else if (venikType === 'bereza') {
    booking.venik.bereza.count = count;
  }
  
  booking.venik.step = 'select';
  booking.venik.selectedType = null;
  ctx.session.booking = booking;

  const summary = getVenikSummary(booking.venik);
  await ctx.reply(
    `${summary}\n\nПродолжайте выбирать веники или нажмите "✅ Готово"`,
    venikKeyboard(booking.venik)
  );
});

bot.hears(['📊 Посмотреть выбор', '✅ Готово', '✏️ Изменить веники', '🚫 Без веников', '↩️ Назад к выбору типа'], async (ctx) => {
  const booking = ctx.session.booking || {};
  if (booking.step !== 'venik') {
    return;
  }

  const action = ctx.message.text;

  if (action === '📊 Посмотреть выбор') {
    const summary = getVenikSummary(booking.venik);
    await ctx.reply(summary, { parse_mode: 'Markdown' });
    return;
  }

  if (action === '✅ Готово' || action === '✅ Подтвердить веники') {
    booking.venik.step = 'confirm';
    ctx.session.booking = booking;
    
    const summary = getVenikSummary(booking.venik);
    await ctx.reply(
      `${summary}\n\nВыбор веников завершен!`,
      venikKeyboard(booking.venik)
    );
    
    booking.step = 'confirm';
    ctx.session.booking = booking;
    
    const totalSummary = bookingSummary(booking);
    await ctx.reply(
      totalSummary + '\n\nЕсли всё верно — нажмите «Забронировать».\nЧтобы изменить — нажмите «Изменить».',
      confirmKeyboard()
    );
    return;
  }

  if (action === '✏️ Изменить веники') {
    booking.venik.step = 'select';
    ctx.session.booking = booking;
    await ctx.reply('Выберите веники:', venikKeyboard());
    return;
  }

  if (action === '🚫 Без веников') {
    booking.venik = initVenikSession();
    booking.venik.step = 'confirm';
    ctx.session.booking = booking;
    
    booking.step = 'confirm';
    ctx.session.booking = booking;
    
    const totalSummary = bookingSummary(booking);
    await ctx.reply(
      totalSummary + '\n\nЕсли всё верно — нажмите «Забронировать».\nЧтобы изменить — нажмите «Изменить».',
      confirmKeyboard()
    );
    return;
  }

  if (action === '↩️ Назад к выбору типа') {
    booking.venik.step = 'select';
    booking.venik.selectedType = null;
    ctx.session.booking = booking;
    await ctx.reply('Выберите тип веника:', venikKeyboard());
    return;
  }
});

// ===== ОБРАБОТКА КНОПОК АДМИНА =====
bot.action(/^confirm_(\d+)_(\d+)$/, async (ctx) => {
  const userId = ctx.match[1];
  const adminUsername = ctx.from.username || 'администратора';

  await ctx.answerCbQuery('✅ Бронь подтверждена!');
  
  const newText = safeEditMessage(ctx, `✅ Подтверждено @${adminUsername}`);
  
  try {
    await ctx.editMessageText(newText);
  } catch (editError) {
    console.log('Не удалось обновить сообщение');
  }

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

bot.action(/^reject_(\d+)_(\d+)$/, async (ctx) => {
  const userId = ctx.match[1];
  const adminUsername = ctx.from.username || 'администратора';

  await ctx.answerCbQuery('❌ Бронь отклонена!');
  
  const newText = safeEditMessage(ctx, `❌ Отклонено @${adminUsername}`);
  
  try {
    await ctx.editMessageText(newText);
  } catch (editError) {
    console.log('Не удалось обновить сообщение');
  }

  try {
    await ctx.telegram.sendMessage(
      userId,
      '❌ *К сожалению, администратор отклонил вашу бронь.*\n\nПожалуйста, свяжитесь с нами для уточнения.',
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Не удалось уведомить клиента:', error);
  }
});

// ... остальные обработчики admin кнопок ...

// ===== ОБРАБОТКА ПРОСТОГО ТЕКСТА =====
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  const booking = ctx.session.booking || {};

  if (!booking.step) {
    resetBooking(ctx);
    return ctx.reply('Нажмите кнопку «Забронировать», чтобы начать.', mainKeyboard());
  }

  // Обработка даты
  if (booking.step === 'date') {
    if (!text.match(/^\d{1,2}\.\d{1,2}\.\d{2,4}$|^\d{1,2}\s*[а-яА-Я]+$/)) {
      return ctx.reply('❌ Введите дату в формате ДД.ММ.ГГ (например, 25.12.24)');
    }
    booking.date = text;
    booking.step = 'time';
    ctx.session.booking = booking;
    return ctx.reply('📅 Дата принята! Введите время начала (например, 17:00):');
  }

  // Обработка времени
  if (booking.step === 'time') {
    if (!text.match(/^\d{1,2}:\d{2}$/)) {
      return ctx.reply('❌ Введите время в формате ЧЧ:ММ (например, 17:00)');
    }
    booking.time = text;
    booking.step = 'hours';
    ctx.session.booking = booking;
    return ctx.reply('⏱ Сколько часов бронируем?', hoursKeyboard());
  }

  // Подсказки для других шагов
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
