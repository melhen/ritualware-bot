// src/services/contractService.js
import { db } from '../../firebase-admin.js';

/**
 * Create a new contract between a Domme and submissive
 */
export async function createContract(contractData) {
  try {
    const { dommeId, submissiveId, title, description, terms, startDate, endDate, consequences } = contractData;
    
    // Validate users exist and have the correct roles
    const dommeRef = db.collection('users').doc(dommeId);
    const subRef = db.collection('users').doc(submissiveId);
    
    const [dommeSnap, subSnap] = await Promise.all([
      dommeRef.get(),
      subRef.get()
    ]);
    
    if (!dommeSnap.exists || !subSnap.exists) {
      throw new Error('One or more users not found');
    }
    
    const domme = dommeSnap.data();
    const sub = subSnap.data();
    
    if (domme.userType !== 'domme' && domme.userType !== 'switch') {
      throw new Error('Contract creator must be a Domme or Switch');
    }
    
    if (sub.userType !== 'submissive' && sub.userType !== 'switch') {
      throw new Error('Contract target must be a Submissive or Switch');
    }
    
    // Create contract document
    const contractRef = db.collection('contracts').doc();
    const contractId = contractRef.id;
    
    // Process dates
    const now = new Date();
    const parsedStartDate = startDate ? new Date(startDate) : now;
    const parsedEndDate = endDate ? new Date(endDate) : null;
    
    // Create default signatures object
    const signatures = {
      domme: {
        signed: true, // Domme automatically signs upon creation
        timestamp: now
      },
      submissive: {
        signed: false,
        timestamp: null
      }
    };
    
    // Create contract
    await contractRef.set({
      contractId,
      dommeId,
      submissiveId,
      title,
      description,
      terms: terms || [],
      status: 'pending', // Starts pending until submissive accepts
      createdAt: now,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      linkedRituals: [],
      consequences: consequences || {
        forCompliance: {},
        forBreach: {}
      },
      signatures,
      reviews: {
        schedule: {},
        history: []
      }
    });
    
    // Log contract creation
    await db.collection('activityLogs').add({
      userId: dommeId,
      targetId: submissiveId,
      action: 'created_contract',
      entityType: 'contract',
      entityId: contractId,
      timestamp: now
    });
    
    return contractId;
  } catch (error) {
    console.error('Error creating contract:', error);
    throw error;
  }
}

/**
 * Accept a contract (for submissive)
 */
export async function acceptContract(contractId, submissiveId) {
  try {
    const contractRef = db.collection('contracts').doc(contractId);
    const contractSnap = await contractRef.get();
    
    if (!contractSnap.exists) {
      throw new Error('Contract not found');
    }
    
    const contract = contractSnap.data();
    
    // Verify submissive is the intended target
    if (contract.submissiveId !== submissiveId) {
      throw new Error('This contract is not for you');
    }
    
    // Verify contract is in pending state
    if (contract.status !== 'pending') {
      throw new Error('This contract is not pending acceptance');
    }
    
    // Update contract status and signature
    await contractRef.update({
      status: 'active',
      'signatures.submissive': {
        signed: true,
        timestamp: new Date()
      }
    });
    
    // Log contract acceptance
    await db.collection('activityLogs').add({
      userId: submissiveId,
      targetId: contract.dommeId,
      action: 'accepted_contract',
      entityType: 'contract',
      entityId: contractId,
      timestamp: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error accepting contract:', error);
    throw error;
  }
}

/**
 * Reject a contract (for submissive)
 */
export async function rejectContract(contractId, submissiveId) {
  try {
    const contractRef = db.collection('contracts').doc(contractId);
    const contractSnap = await contractRef.get();
    
    if (!contractSnap.exists) {
      throw new Error('Contract not found');
    }
    
    const contract = contractSnap.data();
    
    // Verify submissive is the intended target
    if (contract.submissiveId !== submissiveId) {
      throw new Error('This contract is not for you');
    }
    
    // Verify contract is in pending state
    if (contract.status !== 'pending') {
      throw new Error('This contract is not pending acceptance');
    }
    
    // Update contract status
    await contractRef.update({
      status: 'rejected'
    });
    
    // Log contract rejection
    await db.collection('activityLogs').add({
      userId: submissiveId,
      targetId: contract.dommeId,
      action: 'rejected_contract',
      entityType: 'contract',
      entityId: contractId,
      timestamp: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error rejecting contract:', error);
    throw error;
  }
}

/**
 * Link a ritual to a contract
 */
export async function linkRitualToContract(contractId, ritualId, userId) {
  try {
    const contractRef = db.collection('contracts').doc(contractId);
    const contractSnap = await contractRef.get();
    
    if (!contractSnap.exists) {
      throw new Error('Contract not found');
    }
    
    const contract = contractSnap.data();
    
    // Verify user is either the Domme or submissive in this contract
    if (contract.dommeId !== userId && contract.submissiveId !== userId) {
      throw new Error('You do not have permission to modify this contract');
    }
    
    // Verify ritual exists
    const ritualRef = db.collection('rituals').doc(ritualId);
    const ritualSnap = await ritualRef.get();
    
    if (!ritualSnap.exists) {
      throw new Error('Ritual not found');
    }
    
    // Link ritual to contract
    await contractRef.update({
      linkedRituals: admin.firestore.FieldValue.arrayUnion(ritualId)
    });
    
    return true;
  } catch (error) {
    console.error('Error linking ritual to contract:', error);
    throw error;
  }
}

/**
 * Get active contracts for a user
 */
export async function getActiveContracts(userId) {
  try {
    // Query for contracts where user is either Domme or submissive
    const dommeContractsQuery = db.collection('contracts')
      .where('dommeId', '==', userId)
      .where('status', '==', 'active');
      
    const subContractsQuery = db.collection('contracts')
      .where('submissiveId', '==', userId)
      .where('status', '==', 'active');
      
    const [dommeContracts, subContracts] = await Promise.all([
      dommeContractsQuery.get(),
      subContractsQuery.get()
    ]);
    
    // Combine results
    const contracts = [
      ...dommeContracts.docs.map(doc => doc.data()),
      ...subContracts.docs.map(doc => doc.data())
    ];
    
    return contracts;
  } catch (error) {
    console.error('Error getting active contracts:', error);
    throw error;
  }
}

/**
 * Get pending contracts for a user
 */
export async function getPendingContracts(userId) {
  try {
    // Query for contracts where user is submissive and status is pending
    const pendingContractsQuery = db.collection('contracts')
      .where('submissiveId', '==', userId)
      .where('status', '==', 'pending');
      
    const snapshot = await pendingContractsQuery.get();
    
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Error getting pending contracts:', error);
    throw error;
  }
}

/**
 * Check if a contract is breached
 */
export async function checkContractBreach(contractId, reason) {
  try {
    const contractRef = db.collection('contracts').doc(contractId);
    const contractSnap = await contractRef.get();
    
    if (!contractSnap.exists) {
      throw new Error('Contract not found');
    }
    
    const contract = contractSnap.data();
    
    // Only active contracts can be breached
    if (contract.status !== 'active') {
      throw new Error('Only active contracts can be breached');
    }
    
    // Record breach
    await contractRef.update({
      status: 'breached',
      breachReason: reason,
      breachedAt: new Date()
    });
    
    // Execute breach consequences if any
    if (contract.consequences && contract.consequences.forBreach) {
      // Implement consequence logic here
      // This could involve token penalties, unlocking punishment rituals, etc.
    }
    
    // Log breach
    await db.collection('activityLogs').add({
      userId: contract.dommeId,
      targetId: contract.submissiveId,
      action: 'breached_contract',
      entityType: 'contract',
      entityId: contractId,
      metadata: { reason },
      timestamp: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error recording contract breach:', error);
    throw error;
  }
}

/**
 * Complete a contract
 */
export async function completeContract(contractId, userId) {
  try {
    const contractRef = db.collection('contracts').doc(contractId);
    const contractSnap = await contractRef.get();
    
    if (!contractSnap.exists) {
      throw new Error('Contract not found');
    }
    
    const contract = contractSnap.data();
    
    // Verify user is either the Domme or submissive in this contract
    if (contract.dommeId !== userId && contract.submissiveId !== userId) {
      throw new Error('You do not have permission to modify this contract');
    }
    
    // Only active contracts can be completed
    if (contract.status !== 'active') {
      throw new Error('Only active contracts can be completed');
    }
    
    // Record completion
    await contractRef.update({
      status: 'completed',
      completedAt: new Date()
    });
    
    // Execute completion consequences if any
    if (contract.consequences && contract.consequences.forCompliance) {
      // Implement consequence logic here
      // This could involve token rewards, unlocking new rituals, etc.
    }
    
    // Log completion
    await db.collection('activityLogs').add({
      userId,
      targetId: userId === contract.dommeId ? contract.submissiveId : contract.dommeId,
      action: 'completed_contract',
      entityType: 'contract',
      entityId: contractId,
      timestamp: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error completing contract:', error);
    throw error;
  }
}