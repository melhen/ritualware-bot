import { admin, db } from '../../firebase-admin.js';

export async function handleRegister(bot, msg) {
  const username = msg.from.username || `user_${msg.from.id}`;
  const chatId = msg.chat.id;

  // Ensure a Firebase Auth user exists
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

  // Your existing registration logic follows here (e.g., role buttons)
  bot.sendMessage(chatId, 'Choose your role to complete registration.', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Domme', callback_data: `role_Domme_${msg.from.id}` },
          { text: 'Submissive', callback_data: `role_Submissive_${msg.from.id}` },
        ],
      ],
    },
  });
}
