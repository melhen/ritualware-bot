// src/services/enhancedRitualService.js
import { db, admin } from '../../firebase-admin.js';
import { createRitualWithConditions, evaluateRitualConditions } from '../models/conditionalRitual.js';

/**
 * Create a new ritual with enhanced features
 */
export async function createEnhancedRitual(dommeId, submissiveId, ritualData) {
  try {
    // Validate that both users exist and have the correct roles
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
      throw new Error('Creator must be a Domme or Switch');
    }
    
    if (sub.userType !== 'submissive' && sub.userType !== 'switch') {
      throw new Error('Target must be a Submissive or Switch');
    }
    
    // Create the ritual with conditions
    const ritualId = await createRitualWithConditions({
      dommeId,
      submissiveId,
      ...ritualData
    });
    
    // Log the creation
    await db.collection('activityLogs').add({
      userId: dommeId,
      targetId: submissiveId,
      action: 'created_ritual',
      entityType: 'ritual',
      entityId: ritualId,
      timestamp: new Date()
    });
    
    return ritualId;
  } catch (error) {
    console.error('Error creating enhanced ritual:', error);
    throw error;
  }
}

/**
 * Get a ritual with all related tasks in the correct order
 */
export async function getEnhancedRitual(ritualId) {
  try {
    const ritualRef = db.collection('rituals').doc(ritualId);
    const ritualSnap = await ritualRef.get();
    
    if (!ritualSnap.exists) {
      return null;
    }
    
    const ritual = ritualSnap.data();
    
    // Get all tasks for this ritual
    const tasksSnap = await ritualRef.collection('tasks')
      .orderBy('order', 'asc')
      .get();
    
    ritual.tasks = tasksSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return ritual;
  } catch (error) {
    console.error('Error getting enhanced ritual:', error);
    throw error;
  }
}

/**
 * Process task completion and trigger condition evaluation
 */
export async function completeRitualTask(ritualId, submissiveId, taskIndex, evidenceData) {
  try {
    const assignmentRef = db.collection('ritualAssignments').doc(submissiveId);
    const assignmentSnap = await assignmentRef.get();
    
    if (!assignmentSnap.exists || assignmentSnap.data().ritualId !== ritualId) {
      throw new Error('Ritual assignment not found');
    }
    
    const assignment = assignmentSnap.data();
    
    // Verify this is the current task
    if (assignment.currentTaskIndex !== taskIndex) {
      throw new Error('Cannot complete task - not the current task');
    }
    
    // Get the ritual and tasks
    const ritual = await getEnhancedRitual(ritualId);
    
    if (!ritual || !ritual.tasks || taskIndex >= ritual.tasks.length) {
      throw new Error('Invalid task index');
    }
    
    const task = ritual.tasks[taskIndex];
    
    // Mark task as completed
    const taskRef = db.collection('rituals').doc(ritualId)
      .collection('tasks').doc(task.id);
    
    await taskRef.update({
      status: 'completed',
      completedAt: new Date()
    });
    
    // Store evidence
    const evidenceRef = db.collection('taskEvidence').doc();
    await evidenceRef.set({
      taskId: task.id,
      ritualId,
      submissiveId,
      ...evidenceData,
      submittedAt: new Date()
    });
    
    // Update assignment to next task
    const nextTaskIndex = taskIndex + 1;
    const isComplete = nextTaskIndex >= ritual.tasks.length;
    
    await assignmentRef.update({
      currentTaskIndex: nextTaskIndex,
      status: isComplete ? 'completed' : 'active',
      lastUpdated: new Date()
    });
    
    // Evaluate conditions related to completion
    const actionsExecuted = await evaluateRitualConditions(
      ritualId, 
      submissiveId,
      'completion', 
      taskIndex
    );
    
    // If ritual is complete, evaluate completion conditions
    if (isComplete) {
      const completionActions = await evaluateRitualConditions(
        ritualId,
        submissiveId,
        'ritual_completion',
        true
      );
      
      actionsExecuted.push(...completionActions);
    }
    
    return {
      success: true,
      nextTaskIndex,
      isComplete,
      actionsExecuted
    };
  } catch (error) {
    console.error('Error completing ritual task:', error);
    throw error;
  }
}

/**
 * Get current task details for a submissive
 */
export async function getCurrentRitualTask(submissiveId) {
  try {
    const assignmentRef = db.collection('ritualAssignments').doc(submissiveId);
    const assignmentSnap = await assignmentRef.get();
    
    if (!assignmentSnap.exists) {
      return null;
    }
    
    const assignment = assignmentSnap.data();
    const { ritualId, currentTaskIndex } = assignment;
    
    if (currentTaskIndex === undefined || currentTaskIndex === null) {
      return null;
    }
    
    const ritual = await getEnhancedRitual(ritualId);
    
    if (!ritual || !ritual.tasks || currentTaskIndex >= ritual.tasks.length) {
      return null;
    }
    
    return {
      ritual,
      currentTask: ritual.tasks[currentTaskIndex],
      taskIndex: currentTaskIndex,
      progress: {
        current: currentTaskIndex + 1,
        total: ritual.tasks.length
      }
    };
  } catch (error) {
    console.error('Error getting current ritual task:', error);
    throw error;
  }
}

/**
 * Log mood and evaluate mood-based conditions
 */
export async function logMoodAndEvaluateConditions(submissiveId, mood) {
  try {
    // Log the mood
    await db.collection('moodLogs').doc(submissiveId).collection('entries').add({
      mood,
      createdAt: new Date()
    });
    
    // Get active ritual for submissive
    const assignmentRef = db.collection('ritualAssignments').doc(submissiveId);
    const assignmentSnap = await assignmentRef.get();
    
    if (!assignmentSnap.exists) {
      return [];
    }
    
    const { ritualId } = assignmentSnap.data();
    
    // Evaluate mood-based conditions
    return evaluateRitualConditions(ritualId, submissiveId, 'mood', mood);
  } catch (error) {
    console.error('Error logging mood and evaluating conditions:', error);
    throw error;
  }
}