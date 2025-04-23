import { db } from '../../firebase-admin.js';

export async function handleRegister(bot, msg) {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);

  try {
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      return bot.sendMessage(
        chatId,
        "You're already registered. Use /setrole to change your role.",
      );
    }

    // Ask for role selection
    bot.sendMessage(chatId, 'Select your role:', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Domme', callback_data: `role_domme_${userId}` },
            { text: 'Submissive', callback_data: `role_submissive_${userId}` },
            { text: 'Switch', callback_data: `role_switch_${userId}` },
          ],
        ],
      },
    });
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, 'Oops, registration failed.');
  }
}
