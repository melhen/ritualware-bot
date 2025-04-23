// src/models/conditionalRitual.js
// This defines the enhanced ritual model with conditional logic

/**
 * Schema for conditional logic in rituals:
 * 
 * conditions: [
 *   {
 *     type: 'completion' | 'time' | 'mood' | 'streak',
 *     operator: '==' | '!=' | '>' | '<' | '>=' | '<=',
 *     value: any,
 *     actions: [
 *       {
 *         type: 'reward' | 'penalty' | 'unlock_task' | 'lock_task' | 'notification',
 *         value: any, // tokens, taskId, message, etc.
 *       }
 *     ]
 *   }
 * ]
 */

import { db } from '../../firebase-admin.js';

export async function createRitualWithConditions(ritualData) {
  const { dommeId, submissiveId, title, description, tasks, conditions } = ritualData;
  
  // Create a new ritual document
  const ritualRef = db.collection('rituals').doc();
  const ritualId = ritualRef.id;
  
  // Transform tasks to include order and status
  const formattedTasks = tasks.map((task, index) => ({
    ...task,
    order: index,
    status: 'pending'
  }));
  
  // Store the ritual
  await ritualRef.set({
    ritualId,
    dommeId,
    submissiveId,
    title,
    description,
    status: 'active',
    createdAt: new Date(),
    currentTaskIndex: 0,
    conditions: conditions || [],
  });
  
  // Store each task in a subcollection
  const taskPromises = formattedTasks.map(task => 
    ritualRef.collection('tasks').add(task)
  );
  await Promise.all(taskPromises);
  
  // Create ritual assignment for the submissive
  await db.collection('ritualAssignments').doc(submissiveId).set({
    ritualId,
    submissiveId,
    dommeId,
    currentTaskIndex: 0,
    startedAt: new Date(),
    lastUpdated: new Date()
  });
  
  return ritualId;
}

export async function evaluateRitualConditions(ritualId, submissiveId, triggerType, triggerValue) {
  // Get the ritual
  const ritualRef = db.collection('rituals').doc(ritualId);
  const ritualSnap = await ritualRef.get();
  
  if (!ritualSnap.exists) {
    throw new Error('Ritual not found');
  }
  
  const ritual = ritualSnap.data();
  
  // Filter conditions that match the trigger type
  const relevantConditions = (ritual.conditions || []).filter(condition => 
    condition.type === triggerType
  );
  
  // No relevant conditions to evaluate
  if (relevantConditions.length === 0) {
    return [];
  }
  
  // Evaluate each condition
  const actionsToExecute = [];
  
  for (const condition of relevantConditions) {
    const { operator, value, actions } = condition;
    
    let conditionMet = false;
    
    // Evaluate the condition based on operator
    switch (operator) {
      case '==':
        conditionMet = triggerValue == value;
        break;
      case '!=':
        conditionMet = triggerValue != value;
        break;
      case '>':
        conditionMet = triggerValue > value;
        break;
      case '<':
        conditionMet = triggerValue < value;
        break;
      case '>=':
        conditionMet = triggerValue >= value;
        break;
      case '<=':
        conditionMet = triggerValue <= value;
        break;
      default:
        continue;
    }
    
    // If condition is met, add actions to execute
    if (conditionMet) {
      actionsToExecute.push(...actions);
    }
  }
  
  // Execute the actions
  for (const action of actionsToExecute) {
    await executeRitualAction(action, ritualId, submissiveId);
  }
  
  return actionsToExecute;
}

async function executeRitualAction(action, ritualId, submissiveId) {
  const { type, value } = action;
  
  switch (type) {
    case 'reward':
      // Add tokens to submissive
      await updateTokenBalance(submissiveId, value);
      await logTokenTransaction('reward', submissiveId, null, value, 'Ritual condition reward', ritualId);
      break;
      
    case 'penalty':
      // Subtract tokens from submissive
      await updateTokenBalance(submissiveId, -value);
      await logTokenTransaction('penalty', submissiveId, null, value, 'Ritual condition penalty', ritualId);
      break;
      
    case 'unlock_task':
      // Unlock a specific task
      const assignmentRef = db.collection('ritualAssignments').doc(submissiveId);
      await assignmentRef.update({
        unlockedTasks: admin.firestore.FieldValue.arrayUnion(value)
      });
      break;
      
    case 'notification':
      // Log notification to be sent
      await db.collection('notifications').add({
        userId: submissiveId,
        message: value,
        relatedTo: 'ritual',
        relatedId: ritualId,
        createdAt: new Date(),
        read: false
      });
      break;
  }
}

async function updateTokenBalance(userId, amount) {
  const userRef = db.collection('users').doc(userId);
  
  // Use a transaction to ensure accurate updates
  return db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const currentBalance = userData.tokenBalance || 0;
    const newBalance = currentBalance + amount;
    
    transaction.update(userRef, { tokenBalance: newBalance });
    
    return newBalance;
  });
}

async function logTokenTransaction(type, userId, targetId, amount, description, relatedEntityId) {
  return db.collection('tokenTransactions').add({
    type,
    senderId: targetId || null,
    receiverId: userId,
    amount: Math.abs(amount),
    description,
    relatedEntityType: 'ritual',
    relatedEntityId,
    timestamp: new Date()
  });
}