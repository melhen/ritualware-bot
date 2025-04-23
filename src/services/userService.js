import { db } from '../../firebase-admin.js';

export async function getUserById(userId) {
  const ref = db.collection('users').doc(userId);
  const snap = await ref.get();
  return snap.exists ? snap.data() : null;
}

export async function updateUserProfile(userId, data) {
  const ref = db.collection('users').doc(userId);
  await ref.set(data, { merge: true });
}
