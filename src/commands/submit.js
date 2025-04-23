import { handleTaskSubmission } from '../services/taskService.js';

export async function handleSubmit(bot, msg) {
  const username = msg.from.username || `user_${msg.from.id}`;
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, 'Please reply to this message with a photo or text as your task evidence.');
  bot.once('message', async (reply) => {
    if (reply.reply_to_message && reply.reply_to_message.message_id === msg.message_id) {
      await handleTaskSubmission(bot, reply, username);
    }
  });
}