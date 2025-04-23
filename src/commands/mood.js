import { logMood } from '../services/moodService.js';

const moodSessions = new Map(); // In-memory session tracking

export function handleMood(bot, msg) {
  const userId = String(msg.from.id);
  const chatId = msg.chat.id;

  // Step 1: Ask how they feel
  bot.sendMessage(chatId, 'How are you feeling right now?');
  moodSessions.set(userId, true);
}

export function handleMoodReply(bot, msg) {
  const userId = String(msg.from.id);
  const chatId = msg.chat.id;

  if (!moodSessions.get(userId)) return false;

  const mood = msg.text;
  logMood(userId, mood)
    .then(() => {
      bot.sendMessage(chatId, 'Thank you. Your mood has been recorded.');
    })
    .catch((err) => {
      console.error(err);
      bot.sendMessage(chatId, 'There was an error logging your mood.');
    });

  moodSessions.delete(userId);
  return true;
}
