import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { db } from './firebase-admin.js';
import { handleRegister } from './src/commands/register.js';
import { handleMood, handleMoodReply } from './src/commands/mood.js';
import { handleRitual } from './src/commands/ritual.js';
import { handleCreateRitual, handleRitualCreationStep, handleRitualCreationCallback } from './src/commands/createRitual.js';
import { handleEnhancedSubmit } from './src/commands/enhancedSubmit.js';
import { handleContract, handleContractCallback, handleContractCreationStep } from './src/commands/contract.js';
import { getTokenBalance } from './src/services/tokenService.js';

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Command handlers
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

bot.onText(/\/create_ritual/, (msg) => {
  handleCreateRitual(bot, msg);
});

bot.onText(/\/submit/, (msg) => {
  handleEnhancedSubmit(bot, msg);
});

bot.onText(/\/contract/, (msg) => {
  handleContract(bot, msg);
});

bot.onText(/\/tokens/, async (msg) => {
  const username = msg.from.username || `user_${msg.from.id}`;
  const chatId = msg.chat.id;
  
  try {
    const balance = await getTokenBalance(username);
    bot.sendMessage(chatId, `💰 Your current token balance: ${balance}`);
  } catch (error) {
    console.error('Error getting token balance:', error);
    bot.sendMessage(chatId, 'There was an error retrieving your token balance.');
  }
});

bot.onText(/\/help/, (msg) => {
  const helpText = `
*RitualWare Bot Commands:*

/register - Register as a Domme or submissive
/ritual - View your current ritual task
/submit - Submit evidence for your current task
/contract - Manage your contracts
/create_ritual - Create a new ritual (Dommes only)
/mood - Log your current mood
/tokens - Check your token balance
/help - Show this help message

For more information, visit [ritualware.app](https://ritualware.app)
`;

  bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
});

// Handle non-command messages
bot.on('message', (msg) => {
  // Skip commands
  if (msg.text && msg.text.startsWith('/')) return;
  
  // Check if this is a ritual creation step
  if (handleRitualCreationStep(bot, msg)) return;
  
  // Check if this is a contract creation step
  if (handleContractCreationStep(bot, msg)) return;
  
  // Otherwise, check if it's a mood reply
  handleMoodReply(bot, msg);
});

// Handle callback queries
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const { data } = query;
  
  // Handle ritual creation callbacks
  if (handleRitualCreationCallback(bot, query)) return;
  
  // Handle contract callbacks
  if (handleContractCallback(bot, query)) return;
  
  // Handle role selection callbacks
  if (data.startsWith('role_')) {
    const [, role, callbackUserId] = data.split('_');
    const telegramUserId = String(query.from.id);
    const username = query.from.username || `user_${query.from.id}`;

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
          userType: role.toLowerCase(),
          createdAt: new Date(),
          tokenBalance: 0,
        });

      bot.sendMessage(chatId, `Welcome to RitualWare, ${role}! You're now registered.`);
      bot.answerCallbackQuery(query.id, { text: 'Role set!' });
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, 'Something went wrong saving your role.');
    }
  }
});

console.log('RitualWare bot is running...');