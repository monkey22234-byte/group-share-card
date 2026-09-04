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
  arrayUnion
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { LiveRoomState, ActionCommitment, LiveReactionEvent, LiveAnswerVote } from '../types';

// Initialize Firebase App safely (singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with configured databaseId if present
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-3039834d-1d9d-45e5-bd59-c07e0b529206');

/**
 * Generate a friendly 6-char room code (e.g., GR-829, JOY-77)
 */
export function generateRoomCode(prefix = 'GRP'): string {
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${num}`;
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
  const formattedCode = roomCode.trim().toUpperCase();
  const roomRef = doc(db, 'rooms', formattedCode);
  
  const initialData: LiveRoomState = {
    roomId: formattedCode,
    roomCode: formattedCode,
    roomName: roomName || `${hostName}的小組聚會`,
    currentTopicId: initialTopicId,
    currentStage: 'icebreaker',
    currentCardIndex: 0,
    hostName: hostName || '小組長',
    members: [hostName || '小組長'],
    updatedAt: Date.now(),
  };

  await setDoc(roomRef, initialData, { merge: true });
  return formattedCode;
}

/**
 * Join an existing room
 */
export async function joinLiveRoom(roomCode: string, memberName: string): Promise<LiveRoomState | null> {
  const formattedCode = roomCode.trim().toUpperCase();
  const roomRef = doc(db, 'rooms', formattedCode);
  const snap = await getDoc(roomRef);

  if (!snap.exists()) {
    return null;
  }

  // Add member name to room
  if (memberName && memberName.trim()) {
    await updateDoc(roomRef, {
      members: arrayUnion(memberName.trim()),
      updatedAt: Date.now(),
    });
  }

  return snap.data() as LiveRoomState;
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
  await updateDoc(roomRef, {
    ...updates,
    updatedAt: Date.now(),
  });
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
  await addDoc(reactionsRef, {
    ...reaction,
    timestamp: Date.now(),
  });
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
  const docRef = await addDoc(actionsRef, {
    ...action,
    timestamp: Date.now(),
    isCompleted: false,
  });
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
  await setDoc(answerRef, {
    cardId,
    userName: userName.trim(),
    optionIndex,
    timestamp: Date.now(),
  });
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
  return onSnapshot(roomRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as LiveRoomState);
    } else {
      onUpdate(null);
    }
  });
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

  return onSnapshot(q, (snapshot) => {
    const actions: ActionCommitment[] = [];
    snapshot.forEach((doc) => {
      actions.push({ id: doc.id, ...doc.data() } as ActionCommitment);
    });
    onUpdate(actions);
  });
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
  return onSnapshot(q, (snapshot) => {
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
  });
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
  return onSnapshot(answersRef, (snapshot) => {
    const list: LiveAnswerVote[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as LiveAnswerVote);
    });
    onUpdate(list);
  });
}
