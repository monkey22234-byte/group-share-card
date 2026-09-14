import { StageMeta, WeeklyTopic, ReactionType } from '../types';

export const STAGES_CONFIG: Record<string, StageMeta> = {
  icebreaker: {
    id: 'icebreaker',
    name: '破冰暖身題',
    shortName: '破冰',
    stepNumber: 1,
    subtitle: '輕鬆敞開・拉近心與心的距離',
    description: '零門檻的趣味分享，每位成員都能輕鬆分享1-2分鐘，打破沈默與緊張。',
    themeColor: 'sky',
    badgeBg: 'bg-sky-50',
    badgeBorder: 'border-sky-200',
    badgeText: 'text-sky-700',
    accentBg: 'bg-sky-500',
    accentText: 'text-sky-600',
    iconName: 'Sparkles',
  },
  review: {
    id: 'review',
    name: '主題回顧題 (What)',
    shortName: '回顧',
    stepNumber: 2,
    subtitle: '3-4題選擇題複習・點選即時看解析',
    description: '趣味選擇題，回想主日講道重點，點擊選項立即揭曉正解與經文提示！',
    themeColor: 'emerald',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    badgeText: 'text-emerald-700',
    accentBg: 'bg-emerald-500',
    accentText: 'text-emerald-600',
    iconName: 'BookOpenCheck',
  },
  reflection: {
    id: 'reflection',
    name: '真理思想題 (Why)',
    shortName: '思想',
    stepNumber: 3,
    subtitle: '省察內心・連結生命真實光景',
    description: '引導深入探討「這對我的生命意味著什麼？」，剖析日常挑戰、信念與恩典。',
    themeColor: 'amber',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    badgeText: 'text-amber-700',
    accentBg: 'bg-amber-500',
    accentText: 'text-amber-600',
    iconName: 'HeartHandshake',
  },
  application: {
    id: 'application',
    name: '生活應用題 (How)',
    shortName: '應用',
    stepNumber: 4,
    subtitle: '本週行動・化為生活具體見證',
    description: '訂定可行的微小行動方案，打字記錄並一鍵複製為 LINE 群組分享格式。',
    themeColor: 'rose',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    badgeText: 'text-rose-700',
    accentBg: 'bg-rose-500',
    accentText: 'text-rose-600',
    iconName: 'Compass',
  },
};

export const REACTION_TYPES: ReactionType[] = [
  {
    id: 'amen',
    emoji: '❤️',
    label: '阿們扎心',
    subText: '直擊心靈',
    color: '#EF4444',
    bgGradient: 'from-rose-500 to-red-600',
    soundPitch: 523.25, // C5
  },
  {
    id: 'praise',
    emoji: '👏',
    label: '得激勵！',
    subText: '太棒了',
    color: '#F59E0B',
    bgGradient: 'from-amber-500 to-orange-500',
    soundPitch: 587.33, // D5
  },
  {
    id: 'thank_god',
    emoji: '🙌',
    label: '感謝主',
    subText: '榮耀歸神',
    color: '#10B981',
    bgGradient: 'from-emerald-500 to-teal-600',
    soundPitch: 659.25, // E5
  },
  {
    id: 'insight',
    emoji: '💡',
    label: '超有共鳴',
    subText: '有亮光',
    color: '#3B82F6',
    bgGradient: 'from-blue-500 to-indigo-600',
    soundPitch: 698.46, // F5
  },
  {
    id: 'brave',
    emoji: '🔥',
    label: '很有勇氣',
    subText: '為你喝采',
    color: '#EC4899',
    bgGradient: 'from-pink-500 to-rose-600',
    soundPitch: 783.99, // G5
  },
  {
    id: 'pray',
    emoji: '🤗',
    label: '為你禱告',
    subText: '同心守望',
    color: '#8B5CF6',
    bgGradient: 'from-purple-500 to-indigo-600',
    soundPitch: 880.00, // A5
  },
  {
    id: 'peace',
    emoji: '🕊️',
    label: '平安同在',
    subText: '主愛常在',
    color: '#06B6D4',
    bgGradient: 'from-cyan-500 to-blue-500',
    soundPitch: 987.77, // B5
  },
];

/**
 * 每週主日信息主題資料庫（應用階段嚴格維持一題生活實踐題）
 */
export const DEFAULT_TOPICS: WeeklyTopic[] = [];
