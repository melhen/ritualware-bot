import { db } from '../../firebase-admin.js';

export async function getAssignedRitual(userId) {
  const ref = db.collection('ritualAssignments').doc(userId);
  const doc = await ref.get();
  return doc.exists ? doc.data() : null;
}

export async function getCurrentTask(ritualId, taskIndex) {
  const taskRef = db
    .collection('rituals')
    .doc(ritualId)
    .collection('tasks')
    .orderBy('order')
    .limit(taskIndex + 1);

  const snapshot = await taskRef.get();
  const tasks = snapshot.docs.map(doc => doc.data());

  return tasks[taskIndex] || null;
}
