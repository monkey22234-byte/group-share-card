import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  arrayUnion,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { LiveRoomState, ActionCommitment, LiveReactionEvent, LiveAnswerVote, WeeklyTopic } from '../types';

// Initialize Firebase App safely (singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with configured databaseId if present, otherwise default
const configDbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = configDbId ? getFirestore(app, configDbId) : getFirestore(app);

/**
 * Wrap a promise with a timeout to prevent UI hanging indefinitely when offline/disabled
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs = 5000, errorMsg = '連線雲端資料庫逾時（Cloud Firestore 尚未啟用或無法連線）'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    ),
  ]);
}

/**
 * Generate a random 4-digit room code (1000 - 9999)
 */
export function generateRoomCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return num.toString();
}

/**
 * Create a new Live Fellowship Room
 */
export async function createLiveRoom(
  roomCode: string,
  roomName: string,
  hostName: string,
  initialTopicId: string
): Promise<string> {
  const cleanCode = (roomCode || generateRoomCode()).trim().replace(/\s+/g, '');
  const roomRef = doc(db, 'rooms', cleanCode);
  
  const initialData: LiveRoomState = {
    roomId: cleanCode,
    roomCode: cleanCode,
    roomName: roomName || `${hostName}的小組聚會`,
    currentTopicId: initialTopicId,
    currentStage: 'icebreaker',
    currentCardIndex: 0,
    hostName: hostName || '小組長',
    members: [hostName || '小組長'],
    status: 'waiting', // 組長開房後預設進入等待室
    updatedAt: Date.now(),
  };

  await withTimeout(
    setDoc(roomRef, initialData, { merge: true }),
    5000,
    '連線雲端資料庫逾時（Cloud Firestore 尚未啟用或權限不足）'
  );
  return cleanCode;
}

/**
 * Join an existing room
 */
export async function joinLiveRoom(roomCode: string, memberName: string): Promise<LiveRoomState | null> {
  const cleanCode = (roomCode || '').trim().replace(/\s+/g, '');
  if (!cleanCode) return null;
  const roomRef = doc(db, 'rooms', cleanCode);
  const snap = await withTimeout(
    getDoc(roomRef),
    5000,
    '連線雲端資料庫逾時（Cloud Firestore 尚未啟用或權限不足）'
  );

  if (!snap.exists()) {
    return null;
  }

  // Add member name to room
  if (memberName && memberName.trim()) {
    try {
      await withTimeout(
        updateDoc(roomRef, {
          members: arrayUnion(memberName.trim()),
          updatedAt: Date.now(),
        }),
        3000
      );
    } catch (e) {
      console.warn('Could not add member to room in Firestore:', e);
    }
  }

  return snap.data() as LiveRoomState;
}

/**
 * Host opens the room from waiting room (transitions from 'waiting' to 'active')
 */
export async function openLiveRoom(roomCode: string): Promise<void> {
  const cleanCode = (roomCode || '').trim().replace(/\s+/g, '');
  const roomRef = doc(db, 'rooms', cleanCode);
  await withTimeout(
    updateDoc(roomRef, {
      status: 'active',
      updatedAt: Date.now(),
    }),
    4000,
    '開啟房間失敗，請檢查網路連線'
  );
}

/**
 * Update Room Navigation State (Current Stage / Current Card / Active Topic)
 */
export async function updateRoomNavState(
  roomCode: string,
  updates: Partial<LiveRoomState>
) {
  const formattedCode = roomCode.trim().toUpperCase();
  const roomRef = doc(db, 'rooms', formattedCode);
  try {
    await withTimeout(
      updateDoc(roomRef, {
        ...updates,
        updatedAt: Date.now(),
      }),
      3000
    );
  } catch (err) {
    console.warn('Failed to sync room nav state to Firestore:', err);
  }
}

/**
 * Broadcast an emoji reaction to all room members
 */
export async function sendLiveReaction(
  roomCode: string,
  reaction: { emoji: string; label: string; userName: string }
) {
  const formattedCode = roomCode.trim().toUpperCase();
  const reactionsRef = collection(db, 'rooms', formattedCode, 'reactions');
  try {
    await withTimeout(
      addDoc(reactionsRef, {
        ...reaction,
        timestamp: Date.now(),
      }),
      3000
    );
  } catch (err) {
    console.warn('Failed to send live reaction to Firestore:', err);
  }
}

/**
 * Submit or update a live Action commitment in Firestore
 */
export async function submitLiveAction(
  roomCode: string,
  action: Omit<ActionCommitment, 'id' | 'timestamp'>
) {
  const formattedCode = roomCode.trim().toUpperCase();
  const actionsRef = collection(db, 'rooms', formattedCode, 'actions');
  const docRef = await withTimeout(
    addDoc(actionsRef, {
      ...action,
      timestamp: Date.now(),
      isCompleted: false,
    }),
    4000,
    '儲存行動目標失敗（雲端資料庫連線逾時）'
  );
  return docRef.id;
}

/**
 * Submit a multiple-choice vote/answer in real-time
 */
export async function submitLiveQuizAnswer(
  roomCode: string,
  cardId: string,
  userName: string,
  optionIndex: number
) {
  const formattedCode = roomCode.trim().toUpperCase();
  const answerDocId = `${cardId}_${userName.trim()}`;
  const answerRef = doc(db, 'rooms', formattedCode, 'answers', answerDocId);
  try {
    await withTimeout(
      setDoc(answerRef, {
        cardId,
        userName: userName.trim(),
        optionIndex,
        timestamp: Date.now(),
      }),
      3000
    );
  } catch (err) {
    console.warn('Failed to submit quiz answer to Firestore:', err);
  }
}

/**
 * Subscribe to Room State in real time
 */
export function subscribeToRoom(
  roomCode: string,
  onUpdate: (state: LiveRoomState | null) => void
) {
  const formattedCode = roomCode.trim().toUpperCase();
  const roomRef = doc(db, 'rooms', formattedCode);
  return onSnapshot(
    roomRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as LiveRoomState);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn('subscribeToRoom warning (offline/permission):', err);
    }
  );
}

/**
 * Subscribe to Live Actions in real time
 */
export function subscribeToLiveActions(
  roomCode: string,
  onUpdate: (actions: ActionCommitment[]) => void
) {
  const formattedCode = roomCode.trim().toUpperCase();
  const actionsRef = collection(db, 'rooms', formattedCode, 'actions');
  const q = query(actionsRef, orderBy('timestamp', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const actions: ActionCommitment[] = [];
      snapshot.forEach((doc) => {
        actions.push({ id: doc.id, ...doc.data() } as ActionCommitment);
      });
      onUpdate(actions);
    },
    (err) => {
      console.warn('subscribeToLiveActions warning (offline/permission):', err);
    }
  );
}

/**
 * Subscribe to Live Reactions in real time (last 10 reactions)
 */
export function subscribeToLiveReactions(
  roomCode: string,
  onReaction: (reaction: LiveReactionEvent) => void
) {
  const formattedCode = roomCode.trim().toUpperCase();
  const reactionsRef = collection(db, 'rooms', formattedCode, 'reactions');
  const q = query(reactionsRef, orderBy('timestamp', 'desc'), limit(1));

  let initialLoad = true;
  return onSnapshot(
    q,
    (snapshot) => {
      if (initialLoad) {
        initialLoad = false;
        return;
      }
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          onReaction({
            id: change.doc.id,
            emoji: data.emoji,
            label: data.label,
            userName: data.userName || '組員',
            timestamp: data.timestamp || Date.now(),
          });
        }
      });
    },
    (err) => {
      console.warn('subscribeToLiveReactions warning (offline/permission):', err);
    }
  );
}

/**
 * Subscribe to Live Quiz answers for the current room
 */
export function subscribeToLiveAnswers(
  roomCode: string,
  onUpdate: (answers: LiveAnswerVote[]) => void
) {
  const formattedCode = roomCode.trim().toUpperCase();
  const answersRef = collection(db, 'rooms', formattedCode, 'answers');
  return onSnapshot(
    answersRef,
    (snapshot) => {
      const list: LiveAnswerVote[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as LiveAnswerVote);
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('subscribeToLiveAnswers warning (offline/permission):', err);
    }
  );
}

/**
 * Clean topics to ensure strictly 1 question for the application stage
 */
export function sanitizeWeeklyTopic(topic: WeeklyTopic): WeeklyTopic {
  const rawQuestions = topic.questions || [];
  const nonAppQuestions = rawQuestions.filter((q) => q.stage !== 'application');
  const appQuestions = rawQuestions.filter((q) => q.stage === 'application');
  // Strict rule: application stage must only have 1 question
  const finalAppQuestions = appQuestions.slice(0, 1);

  return {
    ...topic,
    questions: [...nonAppQuestions, ...finalAppQuestions],
  };
}

/**
 * Subscribe to Weekly Topics in Cloud Firestore database
 * Automatically synchronizes whenever topics are added or modified in Firestore.
 */
export function subscribeToCloudTopics(
  onUpdate: (topics: WeeklyTopic[]) => void
): () => void {
  const topicsRef = collection(db, 'topics');

  return onSnapshot(
    topicsRef,
    async (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
        return;
      }

      const list: WeeklyTopic[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as WeeklyTopic;
        list.push(sanitizeWeeklyTopic({ ...data, id: docSnap.id }));
      });

      // Sort by date descending (latest first)
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      onUpdate(list);
    },
    (err) => {
      console.warn('Firestore topics subscription warning (offline or permission):', err);
      onUpdate([]);
    }
  );
}

/**
 * Seed or update topics to Cloud Firestore database
 */
export async function seedCloudTopics(topics: WeeklyTopic[]): Promise<void> {
  for (const topic of topics) {
    const cleaned = sanitizeWeeklyTopic(topic);
    const docRef = doc(db, 'topics', cleaned.id);
    await setDoc(docRef, cleaned, { merge: true });
  }
}

/**
 * Save or update a single topic in Cloud Firestore database
 */
export async function saveTopicToCloud(topic: WeeklyTopic): Promise<void> {
  const cleaned = sanitizeWeeklyTopic(topic);
  const docRef = doc(db, 'topics', cleaned.id);
  await setDoc(docRef, cleaned, { merge: true });
}

/**
 * Delete a topic from Cloud Firestore database
 */
export async function deleteTopicFromCloud(topicId: string): Promise<void> {
  const docRef = doc(db, 'topics', topicId);
  await deleteDoc(docRef);
}
