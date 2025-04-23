// src/commands/enhancedSubmit.js
import { completeRitualTask, getCurrentRitualTask } from '../services/enhancedRitualService.js';
import { awardTaskCompletionTokens } from '../services/tokenService.js';
import { db, storage, admin } from '../../firebase-admin.js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export async function handleEnhancedSubmit(bot, msg) {
  const username = msg.from.username || `user_${msg.from.id}`;
  const chatId = msg.chat.id;

  try {
    // Get current task information
    const taskInfo = await getCurrentRitualTask(username);
    
    if (!taskInfo) {
      return bot.sendMessage(chatId, 'You have no active ritual task to submit evidence for.');
    }
    
    const { ritual, currentTask, taskIndex } = taskInfo;
    
    // Ask for evidence submission
    bot.sendMessage(
      chatId, 
      `📝 Submit evidence for: *${currentTask.title}*\n\nPlease reply to this message with your evidence ${
        currentTask.evidenceType === 'photo' ? '(photo)' : 
        currentTask.evidenceType === 'text' ? '(text)' : 
        '(text or photo)'
      }.`,
      { parse_mode: 'Markdown' }
    ).then(sentMsg => {
      // Create one-time handler for the reply
      const replyListener = (reply) => {
        if (reply.reply_to_message && reply.reply_to_message.message_id === sentMsg.message_id) {
          // Remove this listener after handling the reply
          bot.removeListener('message', replyListener);
          
          // Process the submission
          processEvidenceSubmission(bot, reply, username, ritual.ritualId, taskIndex, currentTask);
        }
      };
      
      // Add the one-time listener
      bot.on('message', replyListener);
      
      // Set a timeout to remove the listener after 30 minutes
      setTimeout(() => {
        bot.removeListener('message', replyListener);
      }, 30 * 60 * 1000);
    });
  } catch (error) {
    console.error('Error handling enhanced submit:', error);
    bot.sendMessage(chatId, 'There was an error processing your command. Please try again.');
  }
}

async function processEvidenceSubmission(bot, msg, username, ritualId, taskIndex, task) {
  const chatId = msg.chat.id;
  
  try {
    // Prepare evidence data
    const evidenceData = {
      type: msg.photo ? 'photo' : 'text',
      submittedAt: new Date()
    };
    
    // Handle photo evidence
    if (msg.photo && (task.evidenceType === 'photo' || task.evidenceType === 'any')) {
      const photo = msg.photo[msg.photo.length - 1];
      const fileId = photo.file_id;

      try {
        const fileLink = await bot.getFileLink(fileId);
        const response = await axios.get(fileLink, { responseType: 'stream' });

        const fileName = `${uuidv4()}.jpg`;
        const filePath = `submissions/${username}/${fileName}`;
        const file = storage.bucket().file(filePath);

        const stream = file.createWriteStream({
          metadata: {
            contentType: 'image/jpeg',
            metadata: {
              firebaseStorageDownloadTokens: uuidv4(),
            },
          },
        });

        await new Promise((resolve, reject) => {
          response.data.pipe(stream)
            .on('finish', resolve)
            .on('error', reject);
        });

        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${storage.bucket().name}/o/${encodeURIComponent(filePath)}?alt=media`;
        evidenceData.content = publicUrl;
      } catch (err) {
        console.error('Photo upload failed:', err);
        return bot.sendMessage(chatId, 'Failed to upload your photo. Try again.');
      }
    } 
    // Handle text evidence
    else if (msg.text && (task.evidenceType === 'text' || task.evidenceType === 'any')) {
      evidenceData.content = msg.text;
    }
    // Invalid evidence type
    else {
      return bot.sendMessage(
        chatId, 
        `This task requires ${task.evidenceType} evidence. Please try again with the correct type.`
      );
    }
    
    // Complete the task with evidence
    const result = await completeRitualTask(ritualId, username, taskIndex, evidenceData);
    
    // Award tokens if task has reward
    if (task.tokenReward && task.tokenReward > 0) {
      await awardTaskCompletionTokens(username, task.id, task.tokenReward, ritualId);
    }
    
    // Prepare response message
    let responseMessage = '✅ Evidence submitted successfully!';
    
    // Add token info if applicable
    if (task.tokenReward && task.tokenReward > 0) {
      responseMessage += `\n\n+${task.tokenReward} tokens added to your balance.`;
    }
    
    // Add actions info if any were triggered
    if (result.actionsExecuted && result.actionsExecuted.length > 0) {
      responseMessage += '\n\n📊 Results:';
      
      for (const action of result.actionsExecuted) {
        switch (action.type) {
          case 'reward':
            responseMessage += `\n• Bonus reward: +${action.value} tokens`;
            break;
          case 'penalty':
            responseMessage += `\n• Penalty: -${action.value} tokens`;
            break;
          case 'notification':
            responseMessage += `\n• Message: "${action.value}"`;
            break;
          case 'unlock_task':
            responseMessage += `\n• Special task unlocked!`;
            break;
        }
      }
    }
    
    // Add next steps info
    if (result.isComplete) {
      responseMessage += '\n\n🎉 Congratulations! You have completed the entire ritual.';
    } else {
      responseMessage += `\n\nProgress: ${taskIndex + 1}/${
        result.isComplete ? taskIndex + 1 : taskIndex + 2
      } tasks completed.`;
      responseMessage += '\n\nUse /ritual to see your next task.';
    }
    
    bot.sendMessage(chatId, responseMessage);
    
  } catch (error) {
    console.error('Error processing evidence submission:', error);
    bot.sendMessage(chatId, 'There was an error processing your submission. Please try again.');
  }
}