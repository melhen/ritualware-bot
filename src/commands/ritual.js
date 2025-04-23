import { getAssignedRitual, getCurrentTask } from '../services/ritualService.js';
import { admin } from '../../firebase-admin.js';

export async function handleRitual(bot, msg) {
  const username = msg.from.username || `user_${msg.from.id}`;
  const chatId = msg.chat.id;

  // Ensure Firebase Auth user exists
  try {
    await admin.auth().getUser(username);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      await admin.auth().createUser({
        uid: username,
        email: `${username}@ritualware.fake`,
        displayName: username,
      });
    } else {
      console.error('Error checking Firebase user:', error);
    }
  }

  const ritualData = await getAssignedRitual(username);
  if (!ritualData) {
    return bot.sendMessage(chatId, 'You have no assigned ritual yet.');
  }

  const task = await getCurrentTask(ritualData.ritualId, ritualData.currentTaskIndex || 0);
  if (!task) {
    return bot.sendMessage(chatId, 'No tasks found in your ritual.');
  }

  bot.sendMessage(chatId, `📿 *Your Ritual Task*\n\n*${task.title}*\n${task.description}`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Submit Evidence', callback_data: `submit_${username}` }]
      ]
    }
  });
}