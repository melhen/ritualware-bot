// src/commands/createRitual.js
import { createEnhancedRitual } from '../services/enhancedRitualService.js';
import { getUserById } from '../services/userService.js';
import { db } from '../../firebase-admin.js';

// Session storage for ritual creation wizards
const ritualCreationSessions = new Map();

export async function handleCreateRitual(bot, msg) {
  const userId = String(msg.from.id);
  const chatId = msg.chat.id;
  const username = msg.from.username || `user_${msg.from.id}`;
  
  try {
    // Verify user is a Domme or Switch
    const user = await getUserById(username);
    
    if (!user) {
      return bot.sendMessage(
        chatId,
        "You need to register first. Use /register to begin."
      );
    }
    
    if (user.userType !== 'domme' && user.userType !== 'switch') {
      return bot.sendMessage(
        chatId,
        "Only Dommes or Switches can create rituals."
      );
    }
    
    // Start the ritual creation wizard
    ritualCreationSessions.set(userId, {
      step: 'init',
      ritual: {
        title: '',
        description: '',
        tasks: [],
        conditions: []
      }
    });
    
    // Ask for ritual title
    bot.sendMessage(
      chatId,
      "Let's create a new ritual. What would you like to title it?"
    );
    
  } catch (error) {
    console.error('Error starting ritual creation:', error);
    bot.sendMessage(chatId, "There was an error starting ritual creation.");
  }
}

export function handleRitualCreationStep(bot, msg) {
  const userId = String(msg.from.id);
  const chatId = msg.chat.id;
  const text = msg.text;
  
  // Check if user is in a ritual creation session
  const session = ritualCreationSessions.get(userId);
  if (!session) return false;
  
  // Process current step
  switch (session.step) {
    case 'init':
      // Save ritual title
      session.ritual.title = text;
      session.step = 'description';
      
      bot.sendMessage(
        chatId,
        "Great! Now provide a description for the ritual:"
      );
      break;
      
    case 'description':
      // Save ritual description
      session.ritual.description = text;
      session.step = 'task_count';
      
      bot.sendMessage(
        chatId,
        "How many tasks will this ritual have? (Enter a number between 1-10)"
      );
      break;
      
    case 'task_count':
      // Validate and save task count
      const taskCount = parseInt(text);
      if (isNaN(taskCount) || taskCount < 1 || taskCount > 10) {
        bot.sendMessage(
          chatId,
          "Please enter a valid number between 1 and 10."
        );
        return true;
      }
      
      session.taskCount = taskCount;
      session.currentTaskIndex = 0;
      session.step = 'task_title';
      
      bot.sendMessage(
        chatId,
        `Let's define Task 1. What is the title for this task?`
      );
      break;
      
    case 'task_title':
      // Save current task title
      if (!session.ritual.tasks[session.currentTaskIndex]) {
        session.ritual.tasks[session.currentTaskIndex] = {};
      }
      
      session.ritual.tasks[session.currentTaskIndex].title = text;
      session.step = 'task_description';
      
      bot.sendMessage(
        chatId,
        "Enter the instructions for this task:"
      );
      break;
      
    case 'task_description':
      // Save current task description
      session.ritual.tasks[session.currentTaskIndex].description = text;
      session.step = 'task_evidence';
      
      bot.sendMessage(
        chatId,
        "What type of evidence is required for this task?",
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Text', callback_data: `ev_text_${userId}` },
                { text: 'Photo', callback_data: `ev_photo_${userId}` },
                { text: 'None', callback_data: `ev_none_${userId}` }
              ]
            ]
          }
        }
      );
      break;
      
    case 'task_tokens':
      // Save token reward for task
      const tokens = parseInt(text);
      if (isNaN(tokens) || tokens < 0) {
        bot.sendMessage(
          chatId,
          "Please enter a valid number of tokens (0 or greater)."
        );
        return true;
      }
      
      session.ritual.tasks[session.currentTaskIndex].tokenReward = tokens;
      
      // Move to next task or finish tasks
      session.currentTaskIndex++;
      if (session.currentTaskIndex < session.taskCount) {
        session.step = 'task_title';
        bot.sendMessage(
          chatId,
          `Let's define Task ${session.currentTaskIndex + 1}. What is the title for this task?`
        );
      } else {
        session.step = 'add_condition';
        bot.sendMessage(
          chatId,
          "Do you want to add conditional logic to this ritual?",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Yes', callback_data: `cond_yes_${userId}` },
                  { text: 'No', callback_data: `cond_no_${userId}` }
                ]
              ]
            }
          }
        );
      }
      break;
      
    case 'condition_type':
      // This step handled by callback
      break;
      
    case 'condition_value':
      // Save condition value
      session.currentCondition.value = text;
      session.step = 'action_type';
      
      bot.sendMessage(
        chatId,
        "What action should happen when this condition is met?",
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Reward Tokens', callback_data: `act_reward_${userId}` },
                { text: 'Penalty Tokens', callback_data: `act_penalty_${userId}` }
              ],
              [
                { text: 'Send Notification', callback_data: `act_notify_${userId}` }
              ]
            ]
          }
        }
      );
      break;
      
    case 'action_value':
      // Save action value
      if (session.currentCondition.action.type === 'notification') {
        session.currentCondition.action.value = text;
      } else {
        const value = parseInt(text);
        if (isNaN(value) || value <= 0) {
          bot.sendMessage(
            chatId,
            "Please enter a valid number greater than 0."
          );
          return true;
        }
        session.currentCondition.action.value = value;
      }
      
      // Add condition to ritual
      session.ritual.conditions.push({
        type: session.currentCondition.type,
        operator: session.currentCondition.operator,
        value: session.currentCondition.value,
        actions: [session.currentCondition.action]
      });
      
      session.step = 'add_condition';
      bot.sendMessage(
        chatId,
        "Condition added! Do you want to add another condition?",
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Yes', callback_data: `cond_yes_${userId}` },
                { text: 'No', callback_data: `cond_no_${userId}` }
              ]
            ]
          }
        }
      );
      break;
      
    case 'assign_submissive':
      // Find submissive by username
      const submissiveUsername = text.startsWith('@') ? text.substring(1) : text;
      
      findSubmissive(submissiveUsername)
        .then(submissive => {
          if (!submissive) {
            bot.sendMessage(
              chatId,
              "Submissive not found. Please check the username and try again."
            );
            return;
          }
          
          session.submissiveId = submissive.username;
          completeRitualCreation(bot, msg, session);
        })
        .catch(error => {
          console.error('Error finding submissive:', error);
          bot.sendMessage(
            chatId,
            "There was an error finding the submissive."
          );
        });
      break;
      
    default:
      return false;
  }
  
  // Update session
  ritualCreationSessions.set(userId, session);
  return true;
}

export function handleRitualCreationCallback(bot, query) {
  const callbackData = query.data;
  const userId = String(query.from.id);
  const chatId = query.message.chat.id;
  
  // Check if user is in a ritual creation session
  const session = ritualCreationSessions.get(userId);
  if (!session) return false;
  
  // Process callback based on prefix
  if (callbackData.startsWith('ev_')) {
    // Evidence type selection
    const [, evidenceType] = callbackData.split('_');
    
    session.ritual.tasks[session.currentTaskIndex].evidenceType = evidenceType;
    session.step = 'task_tokens';
    
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(
      chatId,
      "How many tokens should be rewarded for completing this task? (Enter 0 for none)"
    );
    
  } else if (callbackData.startsWith('cond_')) {
    // Add condition decision
    const [, decision] = callbackData.split('_');
    
    if (decision === 'yes') {
      session.step = 'condition_type';
      session.currentCondition = {};
      
      bot.answerCallbackQuery(query.id);
      bot.sendMessage(
        chatId,
        "What type of condition do you want to add?",
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Task Completion', callback_data: `ct_completion_${userId}` },
                { text: 'Mood', callback_data: `ct_mood_${userId}` }
              ],
              [
                { text: 'Streak', callback_data: `ct_streak_${userId}` }
              ]
            ]
          }
        }
      );
    } else {
      session.step = 'assign_submissive';
      
      bot.answerCallbackQuery(query.id);
      bot.sendMessage(
        chatId,
        "Please enter the username of the submissive to assign this ritual to:"
      );
    }
    
  } else if (callbackData.startsWith('ct_')) {
    // Condition type selection
    const [, conditionType] = callbackData.split('_');
    
    session.currentCondition.type = conditionType;
    session.step = 'condition_operator';
    
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(
      chatId,
      "Select the condition operator:",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Equal to (==)', callback_data: `op_eq_${userId}` },
              { text: 'Not equal to (!=)', callback_data: `op_neq_${userId}` }
            ],
            [
              { text: 'Greater than (>)', callback_data: `op_gt_${userId}` },
              { text: 'Less than (<)', callback_data: `op_lt_${userId}` }
            ]
          ]
        }
      }
    );
    
  } else if (callbackData.startsWith('op_')) {
    // Operator selection
    const [, operatorType] = callbackData.split('_');
    
    const operatorMap = {
      'eq': '==',
      'neq': '!=',
      'gt': '>',
      'lt': '<'
    };
    
    session.currentCondition.operator = operatorMap[operatorType];
    session.step = 'condition_value';
    
    let valuePrompt = '';
    switch (session.currentCondition.type) {
      case 'completion':
        valuePrompt = "Enter the task index (0 for first task, 1 for second, etc):";
        break;
      case 'mood':
        valuePrompt = "Enter the mood value (e.g., 'happy', 'sad', etc):";
        break;
      case 'streak':
        valuePrompt = "Enter the streak count:";
        break;
    }
    
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(chatId, valuePrompt);
    
  } else if (callbackData.startsWith('act_')) {
    // Action type selection
    const [, actionType] = callbackData.split('_');
    
    session.currentCondition.action = { type: actionType };
    session.step = 'action_value';
    
    let valuePrompt = '';
    switch (actionType) {
      case 'reward':
        valuePrompt = "Enter the number of tokens to reward:";
        break;
      case 'penalty':
        valuePrompt = "Enter the number of tokens to deduct:";
        break;
      case 'notify':
        valuePrompt = "Enter the notification message:";
        break;
    }
    
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(chatId, valuePrompt);
  }
  
  // Update session
  ritualCreationSessions.set(userId, session);
  return true;
}

async function findSubmissive(username) {
  try {
    const userRef = db.collection('users').where('username', '==', username).limit(1);
    const snapshot = await userRef.get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const userData = snapshot.docs[0].data();
    
    // Check if user is a submissive or switch
    if (userData.userType !== 'submissive' && userData.userType !== 'switch') {
      return null;
    }
    
    return userData;
  } catch (error) {
    console.error('Error finding submissive:', error);
    throw error;
  }
}

async function completeRitualCreation(bot, msg, session) {
  const chatId = msg.chat.id;
  const username = msg.from.username || `user_${msg.from.id}`;
  
  try {
    // Create the ritual
    const ritualId = await createEnhancedRitual(
      username,
      session.submissiveId,
      session.ritual
    );
    
    // Clear session
    ritualCreationSessions.delete(String(msg.from.id));
    
    bot.sendMessage(
      chatId,
      `✅ Ritual "${session.ritual.title}" created and assigned to @${session.submissiveId}!`
    );
  } catch (error) {
    console.error('Error completing ritual creation:', error);
    bot.sendMessage(
      chatId,
      "There was an error creating the ritual. Please try again."
    );
  }
}