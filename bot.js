import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { db } from './firebase-admin.js';
import { handleRegister } from './src/commands/register.js';
import { handleMood, handleMoodReply } from './src/commands/mood.js';
import { handleRitual } from './src/commands/ritual.js';
import { handleTaskSubmission } from './src/services/taskService.js';

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Welcome to RitualWare Bot. Use /register to begin.');
});

bot.onText(/\/register/, (msg) => {
  handleRegister(bot, msg);
});

bot.onText(/\/mood/, (msg) => {
  handleMood(bot, msg);
});

bot.onText(/\/ritual/, (msg) => {
  handleRitual(bot, msg);
});

bot.on('message', (msg) => {
  const isCommand = msg.text && msg.text.startsWith('/');
  if (!isCommand) {
    handleMoodReply(bot, msg);
  }
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const telegramUserId = String(query.from.id);
  const username = query.from.username || `user_${query.from.id}`;
  const { data } = query;

  if (data.startsWith('role_')) {
    const [, role, callbackUserId] = data.split('_');

    if (telegramUserId !== callbackUserId) {
      return bot.answerCallbackQuery(query.id, {
        text: "This button isn't for you.",
      });
    }

    try {
      await db
        .collection('users')
        .doc(username)
        .set({
          username,
          telegramUserId,
          displayName: query.from.first_name || 'User',
          userType: role,
          createdAt: new Date(),
          tokenBalance: 0,
        });

      bot.sendMessage(chatId, `Welcome to RitualWare, ${role}! You’re now registered.`);
      bot.answerCallbackQuery(query.id, { text: 'Role set!' });
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, 'Something went wrong saving your role.');
    }
  }

  if (data.startsWith('submit_')) {
    const [_, callbackUsername] = data.split('_');

    if (callbackUsername !== username) {
      return bot.answerCallbackQuery(query.id, {
        text: "This button isn't for you.",
      });
    }

    bot.sendMessage(chatId, 'Please reply to this message with a photo or text as your task evidence.')
      .then((sentMsg) => {
        bot.once('message', async (reply) => {
          if (reply.reply_to_message?.message_id === sentMsg.message_id) {
            await handleTaskSubmission(bot, reply, username);
          }
        });
      });

    return bot.answerCallbackQuery(query.id);
  }
});