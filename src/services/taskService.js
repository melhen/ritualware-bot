import { db, storage, admin } from '../../firebase-admin.js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export async function handleTaskSubmission(bot, msg, username) {
  const chatId = msg.chat.id;

  // Ensure Firebase Auth user exists
  try {
    await admin.auth().getUser(username);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      await admin.auth().createUser({
        uid: username,
        email: `${username}@ritualware.fake`,
        displayName: username,
      });
    } else {
      console.error('Error checking Firebase user:', error);
    }
  }

  const assignmentRef = db.collection('ritualAssignments').doc(username);
  const assignmentDoc = await assignmentRef.get();

  if (!assignmentDoc.exists) {
    return bot.sendMessage(chatId, 'You are not assigned to a ritual.');
  }

  const { ritualId, currentTaskIndex } = assignmentDoc.data();
  const timestamp = new Date();
  const logData = {
    username,
    ritualId,
    taskIndex: currentTaskIndex,
    timestamp,
  };

  if (msg.photo) {
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
      logData.photo = publicUrl;
    } catch (err) {
      console.error('Photo upload failed:', err);
      return bot.sendMessage(chatId, 'Failed to upload your photo. Try again.');
    }
  } else if (msg.text) {
    logData.text = msg.text;
  }

  await db
    .collection('taskLogs')
    .doc(username)
    .collection('entries')
    .add(logData);

  await assignmentRef.update({
    currentTaskIndex: currentTaskIndex + 1,
  });

  bot.sendMessage(chatId, '✅ Submission received! You’ve progressed to the next task.');
}