// src/services/tokenService.js
import { db } from '../../firebase-admin.js';

/**
 * Record a token transaction and update user balances
 */
export async function processTokenTransaction(type, senderId, receiverId, amount, description, relatedEntityType, relatedEntityId) {
  try {
    // Validate inputs
    if (!type || amount <= 0 || (!senderId && !receiverId)) {
      throw new Error('Invalid transaction parameters');
    }
    
    // Start a transaction to ensure data consistency
    return db.runTransaction(async (transaction) => {
      // Handle sender (if applicable)
      if (senderId) {
        const senderRef = db.collection('users').doc(senderId);
        const senderDoc = await transaction.get(senderRef);
        
        if (!senderDoc.exists) {
          throw new Error('Sender not found');
        }
        
        const senderData = senderDoc.data();
        const currentBalance = senderData.tokenBalance || 0;
        
        // Ensure sender has enough tokens (if not a system-generated reward)
        if (type !== 'reward' && currentBalance < amount) {
          throw new Error('Insufficient token balance');
        }
        
        // Deduct from sender
        transaction.update(senderRef, { 
          tokenBalance: currentBalance - amount 
        });
      }
      
      // Handle receiver (if applicable)
      if (receiverId) {
        const receiverRef = db.collection('users').doc(receiverId);
        const receiverDoc = await transaction.get(receiverRef);
        
        if (!receiverDoc.exists) {
          throw new Error('Receiver not found');
        }
        
        const receiverData = receiverDoc.data();
        const currentBalance = receiverData.tokenBalance || 0;
        
        // Add to receiver
        transaction.update(receiverRef, { 
          tokenBalance: currentBalance + amount 
        });
      }
      
      // Create transaction record
      const transactionRef = db.collection('tokenTransactions').doc();
      
      transaction.set(transactionRef, {
        transactionId: transactionRef.id,
        type,
        senderId: senderId || null,
        receiverId: receiverId || null,
        amount,
        description: description || `${type} transaction`,
        relatedEntityType: relatedEntityType || null,
        relatedEntityId: relatedEntityId || null,
        timestamp: new Date()
      });
      
      return transactionRef.id;
    });
  } catch (error) {
    console.error('Error processing token transaction:', error);
    throw error;
  }
}

/**
 * Get token balance for a user
 */
export async function getTokenBalance(userId) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    return userData.tokenBalance || 0;
  } catch (error) {
    console.error('Error getting token balance:', error);
    throw error;
  }
}

/**
 * Get transaction history for a user
 */
export async function getTransactionHistory(userId, limit = 10) {
  try {
    // Query for transactions where user is sender or receiver
    const senderQuery = db.collection('tokenTransactions')
      .where('senderId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit);
      
    const receiverQuery = db.collection('tokenTransactions')
      .where('receiverId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit);
      
    const [senderSnapshot, receiverSnapshot] = await Promise.all([
      senderQuery.get(),
      receiverQuery.get()
    ]);
    
    // Combine results
    const transactions = [
      ...senderSnapshot.docs.map(doc => doc.data()),
      ...receiverSnapshot.docs.map(doc => doc.data())
    ];
    
    // Sort by timestamp (descending)
    transactions.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());
    
    // Take only the top 'limit' transactions
    return transactions.slice(0, limit);
  } catch (error) {
    console.error('Error getting transaction history:', error);
    throw error;
  }
}

/**
 * Award tokens for task completion
 */
export async function awardTaskCompletionTokens(submissiveId, taskId, amount, ritualId) {
  try {
    return processTokenTransaction(
      'reward',
      null,  // No sender (system-generated)
      submissiveId,
      amount,
      'Task completion reward',
      'task',
      taskId
    );
  } catch (error) {
    console.error('Error awarding task completion tokens:', error);
    throw error;
  }
}

/**
 * Process tribute payment
 */
export async function processTribute(submissiveId, dommeId, amount, description) {
  try {
    return processTokenTransaction(
      'tribute',
      submissiveId,
      dommeId,
      amount,
      description || 'Tribute payment',
      'tribute',
      null
    );
  } catch (error) {
    console.error('Error processing tribute:', error);
    throw error;
  }
}

/**
 * Apply penalty for task failure or rule violation
 */
export async function applyPenalty(submissiveId, amount, reason, relatedEntityType, relatedEntityId) {
  try {
    return processTokenTransaction(
      'penalty',
      submissiveId,
      null,  // No receiver (tokens are removed from system)
      amount,
      reason || 'Penalty',
      relatedEntityType,
      relatedEntityId
    );
  } catch (error) {
    console.error('Error applying penalty:', error);
    throw error;
  }
}