export type QuestionStage = 'icebreaker' | 'review' | 'reflection' | 'application';

export interface StageMeta {
  id: QuestionStage;
  name: string;
  shortName: string;
  stepNumber: number;
  subtitle: string;
  description: string;
  themeColor: string; // Tailwind color class / hex identifier
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  accentBg: string;
  accentText: string;
  iconName: string;
}

export interface QuestionCard {
  id: string;
  stage: QuestionStage;
  title: string;
  question: string;
  subtitle?: string;
  scriptureReference?: string;
  scriptureText?: string;
  hint?: string; // 小組長引導提示 / 破冰心法 / 複習小提示
  tags?: string[];
  timeSuggestionMinutes?: number;
  // Multiple Choice Review Quiz Fields (主題回顧選擇題)
  options?: string[]; // A, B, C, D 4個選項
  correctAnswerIndex?: number; // 0, 1, 2, 3 正確選項索引
  explanation?: string; // 答案解析與真理重點
}

export interface WeeklyTopic {
  id: string;
  title: string;
  date: string;
  category: 'sermon' | 'devotional' | 'custom';
  speaker?: string;
  mainScripture: string;
  scriptureExcerpt?: string;
  summary: string;
  keyPoints?: string[];
  questions: QuestionCard[];
}

export interface ActionCommitment {
  id: string;
  memberName: string;
  actionText: string;
  targetDate?: string;
  prayerNeeds?: string;
  timestamp: number;
  isCompleted?: boolean;
}

export interface GroupMember {
  id: string;
  name: string;
  avatarColor: string;
  hasShared: boolean;
}

export interface ReactionType {
  id: string;
  emoji: string;
  label: string;
  subText: string;
  color: string;
  bgGradient: string;
  soundPitch: number;
}

export interface FloatingParticle {
  id: string;
  emoji: string;
  label: string;
  x: number; // percentage from left (20-80%)
  size: number;
  rotation: number;
  createdAt: number;
}

export interface LiveRoomState {
  roomId: string;
  roomCode: string;
  roomName: string;
  currentTopicId: string;
  currentStage: QuestionStage;
  currentCardIndex: number;
  hostName: string;
  members: string[]; // member names
  activeSpeakerName?: string;
  timerSeconds?: number;
  timerTimestamp?: number;
  updatedAt?: number;
}

export interface LiveReactionEvent {
  id: string;
  emoji: string;
  label: string;
  userName: string;
  timestamp: number;
}

export interface LiveAnswerVote {
  id: string;
  cardId: string;
  userName: string;
  optionIndex: number;
  timestamp: number;
}

