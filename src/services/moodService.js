import { db } from '../../firebase-admin.js';

export async function logMood(userId, moodText) {
  const timestamp = new Date();
  const entryRef = db.collection('moodLogs').doc(userId).collection('entries').doc();

  await entryRef.set({
    mood: moodText,
    createdAt: timestamp,
  });

  return true;
}
