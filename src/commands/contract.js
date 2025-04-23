// src/commands/contract.js
import { createContract, acceptContract, rejectContract, getActiveContracts, getPendingContracts } from '../services/contractService.js';
import { getUserById } from '../services/userService.js';

// Session storage for contract creation wizards
const contractCreationSessions = new Map();

export async function handleContract(bot, msg) {
  const userId = String(msg.from.id);
  const chatId = msg.chat.id;
  const username = msg.from.username || `user_${msg.from.id}`;
  
  try {
    // Get user information
    const user = await getUserById(username);
    
    if (!user) {
      return bot.sendMessage(
        chatId,
        "You need to register first. Use /register to begin."
      );
    }
    
    // Different options based on user type
    if (user.userType === 'domme' || user.userType === 'switch') {
      // Domme options
      bot.sendMessage(
        chatId,
        "📜 *Contract Management*\n\nWhat would you like to do?",
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Create New Contract', callback_data: `contract_create_${userId}` }],
              [{ text: 'View Active Contracts', callback_data: `contract_list_active_${userId}` }]
            ]
          }
        }
      );
    } else if (user.userType === 'submissive') {
      // Submissive options
      bot.sendMessage(
        chatId,
        "📜 *Contract Management*\n\nWhat would you like to do?",
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'View Pending Contracts', callback_data: `contract_list_pending_${userId}` }],
              [{ text: 'View Active Contracts', callback_data: `contract_list_active_${userId}` }]
            ]
          }
        }
      );
    }
  } catch (error) {
    console.error('Error handling contract command:', error);
    bot.sendMessage(chatId, "There was an error processing your request.");
  }
}

export function handleContractCallback(bot, query) {
  const userId = String(query.from.id);
  const chatId = query.message.chat.id;
  const username = query.from.username || `user_${query.from.id}`;
  const callbackData = query.data;
  
  // Process callback based on prefix
  if (callbackData.startsWith('contract_create_')) {
    // Start contract creation wizard
    startContractCreation(bot, query);
    return true;
  } else if (callbackData.startsWith('contract_list_active_')) {
    // List active contracts
    listActiveContracts(bot, query);
    return true;
  } else if (callbackData.startsWith('contract_list_pending_')) {
    // List pending contracts
    listPendingContracts(bot, query);
    return true;
  } else if (callbackData.startsWith('contract_accept_')) {
    // Accept contract
    const contractId = callbackData.split('_')[2];
    acceptContractCallback(bot, query, contractId, username);
    return true;
  } else if (callbackData.startsWith('contract_reject_')) {
    // Reject contract
    const contractId = callbackData.split('_')[2];
    rejectContractCallback(bot, query, contractId, username);
    return true;
  } else if (callbackData.startsWith('contract_view_')) {
    // View contract details
    const contractId = callbackData.split('_')[2];
    viewContractDetails(bot, query, contractId);
    return true;
  } else if (callbackData.startsWith('contract_duration_')) {
    // Handle duration selection
    const duration = parseInt(callbackData.split('_')[2]);
    handleDurationSelection(bot, query, duration);
    return true;
  } else if (callbackData.startsWith('contract_confirm_')) {
    // Confirm contract creation
    completeContractCreation(bot, query);
    return true;
  } else if (callbackData.startsWith('contract_cancel_')) {
    // Cancel contract creation
    cancelContractCreation(bot, query);
    return true;
  }
  
  return false;
}

// Start contract creation wizard
async function startContractCreation(bot, query) {
  const userId = String(query.from.id);
  const chatId = query.message.chat.id;
  const username = query.from.username || `user_${query.from.id}`;
  
  // Initialize contract creation session
  contractCreationSessions.set(userId, {
    step: 'init',
    contract: {
      title: '',
      description: '',
      terms: [],
      duration: 0,
      submissiveId: '',
      dommeId: username
    }
  });
  
  // Answer callback
  bot.answerCallbackQuery(query.id);
  
  // Start wizard
  bot.sendMessage(
    chatId,
    "Let's create a new contract. What would you like to title it?"
  );
}

// List active contracts
async function listActiveContracts(bot, query) {
  const userId = String(query.from.id);
  const chatId = query.message.chat.id;
  const username = query.from.username || `user_${query.from.id}`;
  
  try {
    // Get active contracts
    const contracts = await getActiveContracts(username);
    
    if (!contracts || contracts.length === 0) {
      bot.answerCallbackQuery(query.id);
      return bot.sendMessage(chatId, "You have no active contracts.");
    }
    
    // Create inline keyboard with contracts
    const keyboard = contracts.map(contract => {
      const title = contract.title.length > 30 
        ? contract.title.substring(0, 27) + '...' 
        : contract.title;
      
      return [{ text: title, callback_data: `contract_view_${contract.contractId}` }];
    });
    
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(
      chatId,
      "Your active contracts:",
      {
        reply_markup: {
          inline_keyboard: keyboard
        }
      }
    );
  } catch (error) {
    console.error('Error listing active contracts:', error);
    bot.answerCallbackQuery(query.id, { text: 'Error loading contracts' });
    bot.sendMessage(chatId, "There was an error loading your contracts.");
  }
}

// List pending contracts
async function listPendingContracts(bot, query) {
  const userId = String(query.from.id);
  const chatId = query.message.chat.id;
  const username = query.from.username || `user_${query.from.id}`;
  
  try {
    // Get pending contracts
    const contracts = await getPendingContracts(username);
    
    if (!contracts || contracts.length === 0) {
      bot.answerCallbackQuery(query.id);
      return bot.sendMessage(chatId, "You have no pending contracts.");
    }
    
    // Process each contract
    for (const contract of contracts) {
      let message = `📜 *Contract Offer*\n\n`;
      message += `*Title:* ${contract.title}\n`;
      message += `*From:* @${contract.dommeId}\n\n`;
      message += `*Description:* ${contract.description}\n\n`;
      message += `*Terms:*\n`;
      
      contract.terms.forEach((term, index) => {
        message += `${index + 1}. ${term}\n`;
      });
      
      if (contract.endDate) {
        const endDate = new Date(contract.endDate.toDate());
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        message += `\n*End Date:* ${endDate.toLocaleDateString('en-US', options)}`;
      } else {
        message += `\n*Duration:* No end date`;
      }
      
      message += `\n\nDo you accept these terms?`;
      
      bot.sendMessage(
        chatId,
        message,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Accept', callback_data: `contract_accept_${contract.contractId}` },
                { text: 'Reject', callback_data: `contract_reject_${contract.contractId}` }
              ]
            ]
          }
        }
      );
    }
    
    bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error('Error listing pending contracts:', error);
    bot.answerCallbackQuery(query.id, { text: 'Error loading contracts' });
    bot.sendMessage(chatId, "There was an error loading your contracts.");
  }
}

// Accept contract callback
async function acceptContractCallback(bot, query, contractId, username) {
  const chatId = query.message.chat.id;
  
  try {
    // Accept the contract
    await acceptContract(contractId, username);
    
    bot.answerCallbackQuery(query.id, { text: 'Contract accepted!' });
    bot.sendMessage(
      chatId,
      "✅ Contract accepted! You can view it in your active contracts."
    );
    
    // Update the message to remove buttons
    bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: chatId, message_id: query.message.message_id }
    );
  } catch (error) {
    console.error('Error accepting contract:', error);
    bot.answerCallbackQuery(query.id, { text: 'Error accepting contract' });
    bot.sendMessage(chatId, "There was an error accepting the contract.");
  }
}

// Reject contract callback
async function rejectContractCallback(bot, query, contractId, username) {
  const chatId = query.message.chat.id;
  
  try {
    // Reject the contract
    await rejectContract(contractId, username);
    
    bot.answerCallbackQuery(query.id, { text: 'Contract rejected' });
    bot.sendMessage(
      chatId,
      "Contract rejected. The Domme has been notified."
    );
    
    // Update the message to remove buttons
    bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: chatId, message_id: query.message.message_id }
    );
  } catch (error) {
    console.error('Error rejecting contract:', error);
    bot.answerCallbackQuery(query.id, { text: 'Error rejecting contract' });
    bot.sendMessage(chatId, "There was an error rejecting the contract.");
  }
}

// View contract details
async function viewContractDetails(bot, query, contractId) {
  const chatId = query.message.chat.id;
  
  try {
    // Get contract details
    const contractRef = db.collection('contracts').doc(contractId);
    const contractSnap = await contractRef.get();
    
    if (!contractSnap.exists) {
      bot.answerCallbackQuery(query.id, { text: 'Contract not found' });
      return bot.sendMessage(chatId, "Contract not found.");
    }
    
    const contract = contractSnap.data();
    
    let message = `📜 *Contract Details*\n\n`;
    message += `*Title:* ${contract.title}\n`;
    message += `*Status:* ${contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}\n`;
    message += `*Domme:* @${contract.dommeId}\n`;
    message += `*Submissive:* @${contract.submissiveId}\n\n`;
    message += `*Description:* ${contract.description}\n\n`;
    message += `*Terms:*\n`;
    
    contract.terms.forEach((term, index) => {
      message += `${index + 1}. ${term}\n`;
    });
    
    if (contract.endDate) {
      const endDate = new Date(contract.endDate.toDate());
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      message += `\n*End Date:* ${endDate.toLocaleDateString('en-US', options)}`;
    } else {
      message += `\n*Duration:* No end date`;
    }
    
    if (contract.linkedRituals && contract.linkedRituals.length > 0) {
      message += `\n\n*Linked Rituals:* ${contract.linkedRituals.length}`;
    }
    
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(
      chatId,
      message,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Error viewing contract details:', error);
    bot.answerCallbackQuery(query.id, { text: 'Error loading contract' });
    bot.sendMessage(chatId, "There was an error loading the contract details.");
  }
}

// Handle duration selection
function handleDurationSelection(bot, query, duration) {
  const userId = String(query.from.id);
  const chatId = query.message.chat.id;
  
  // Get session
  const session = contractCreationSessions.get(userId);
  if (!session) {
    bot.answerCallbackQuery(query.id, { text: 'Session expired' });
    return bot.sendMessage(chatId, "Your session has expired. Please start over.");
  }
  
  // Save duration
  session.contract.duration = duration;
  session.step = 'submissive';
  
  // Update session
  contractCreationSessions.set(userId, session);
  
  bot.answerCallbackQuery(query.id);
  bot.sendMessage(
    chatId,
    "Please enter the username of the submissive to assign this contract to:"
  );
}

// Complete contract creation
async function completeContractCreation(bot, query) {
  const userId = String(query.from.id);
  const chatId = query.message.chat.id;
  const username = query.from.username || `user_${query.from.id}`;
  
  // Get session
  const session = contractCreationSessions.get(userId);
  if (!session) {
    bot.answerCallbackQuery(query.id, { text: 'Session expired' });
    return bot.sendMessage(chatId, "Your session has expired. Please start over.");
  }
  
  try {
    // Calculate end date if duration is set
    let endDate = null;
    if (session.contract.duration > 0) {
      endDate = new Date();
      endDate.setDate(endDate.getDate() + session.contract.duration);
    }
    
    // Create contract
    const contractId = await createContract({
      dommeId: username,
      submissiveId: session.contract.submissiveId,
      title: session.contract.title,
      description: session.contract.description,
      terms: session.contract.terms,
      startDate: new Date(),
      endDate: endDate,
      consequences: {
        forCompliance: {},
        forBreach: {}
      }
    });
    
    // Clear session
    contractCreationSessions.delete(userId);
    
    bot.answerCallbackQuery(query.id, { text: 'Contract created!' });
    bot.sendMessage(
      chatId,
      `✅ Contract "${session.contract.title}" created and sent to @${session.contract.submissiveId} for acceptance.`
    );
  } catch (error) {
    console.error('Error creating contract:', error);
    bot.answerCallbackQuery(query.id, { text: 'Error creating contract' });
    bot.sendMessage(chatId, "There was an error creating the contract. Please try again.");
  }
}

// Cancel contract creation
function cancelContractCreation(bot, query) {
  const userId = String(query.from.id);
  const chatId = query.message.chat.id;
  
  // Clear session
  contractCreationSessions.delete(userId);
  
  bot.answerCallbackQuery(query.id);
  bot.sendMessage(chatId, "Contract creation cancelled.");
}

export function handleContractCreationStep(bot, msg) {
  const userId = String(msg.from.id);
  const chatId = msg.chat.id;
  const text = msg.text;
  
  // Check if user is in a contract creation session
  const session = contractCreationSessions.get(userId);
  if (!session) return false;
  
  // Process current step
  switch (session.step) {
    case 'init':
      // Save contract title
      session.contract.title = text;
      session.step = 'description';
      
      bot.sendMessage(
        chatId,
        "Great! Now provide a description for the contract:"
      );
      break;
      
    case 'description':
      // Save contract description
      session.contract.description = text;
      session.step = 'terms';
      
      bot.sendMessage(
        chatId,
        "Please enter the terms of the contract. You can provide multiple terms separated by new lines."
      );
      break;
      
    case 'terms':
      // Save contract terms
      session.contract.terms = text.split('\n').filter(term => term.trim().length > 0);
      
      if (session.contract.terms.length === 0) {
        bot.sendMessage(
          chatId,
          "You must provide at least one term. Please try again."
        );
        return true;
      }
      
      session.step = 'duration';
      
      bot.sendMessage(
        chatId,
        "How long should this contract last? Select an option:",
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '1 week', callback_data: `contract_duration_7_${userId}` },
                { text: '2 weeks', callback_data: `contract_duration_14_${userId}` },
                { text: '1 month', callback_data: `contract_duration_30_${userId}` }
              ],
              [
                { text: '3 months', callback_data: `contract_duration_90_${userId}` },
                { text: 'No end date', callback_data: `contract_duration_0_${userId}` }
              ]
            ]
          }
        }
      );
      break;
      
    case 'submissive':
      // Save submissive username
      const submissiveUsername = text.startsWith('@') ? text.substring(1) : text;
      
      // Find submissive by username
      getUserById(submissiveUsername)
        .then(submissive => {
          if (!submissive) {
            bot.sendMessage(
              chatId,
              "Submissive not found. Please check the username and try again."
            );
            return;
          }
          
          if (submissive.userType !== 'submissive' && submissive.userType !== 'switch') {
            bot.sendMessage(
              chatId,
              "The user you specified is not a submissive or switch. Please enter a valid username."
            );
            return;
          }
          
          session.contract.submissiveId = submissiveUsername;
          
          // Final confirmation
          let confirmationMessage = `📜 *Contract Summary*\n\n`;
          confirmationMessage += `*Title:* ${session.contract.title}\n`;
          confirmationMessage += `*Description:* ${session.contract.description}\n\n`;
          confirmationMessage += `*Terms:*\n`;
          
          session.contract.terms.forEach((term, index) => {
            confirmationMessage += `${index + 1}. ${term}\n`;
          });
          
          confirmationMessage += `\n*Duration:* ${
            session.contract.duration === 0 ? 'No end date' : 
            `${session.contract.duration} days`
          }\n`;
          confirmationMessage += `*Submissive:* @${session.contract.submissiveId}\n\n`;
          
          confirmationMessage += "Create this contract?";
          
          bot.sendMessage(chatId, confirmationMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Confirm', callback_data: `contract_confirm_${userId}` },
                  { text: 'Cancel', callback_data: `contract_cancel_${userId}` }
                ]
              ]
            }
          });
          
          session.step = 'confirm';
        })
        .catch(error => {
          console.error('Error finding submissive:', error);
          bot.sendMessage(chatId, "There was an error finding the submissive.");
        });
      break;
      
    default:
      return false;
  }
  
  // Update session
  contractCreationSessions.set(userId, session);
  return true;