import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DEFAULT_TOPICS } from './data/defaultTopics';
import { 
  WeeklyTopic, 
  QuestionStage, 
  QuestionCard, 
  ActionCommitment, 
  GroupMember,
  LiveRoomState,
  LiveReactionEvent,
  LiveAnswerVote
} from './types';
import { Header } from './components/Header';
import { StageNav } from './components/StageNav';
import { CardDeck } from './components/CardDeck';
import { ReactionFloatingBar } from './components/ReactionFloatingBar';
import { ActionPlansSection } from './components/ActionPlansSection';
import { TopicSelectorModal } from './components/TopicSelectorModal';
import { ManualAddQuestionModal } from './components/ManualAddQuestionModal';
import { GoogleSheetDatabaseModal } from './components/GoogleSheetDatabaseModal';
import { SpeakerTimerModal } from './components/SpeakerTimerModal';
import { MemberManagerModal } from './components/MemberManagerModal';
import { RoomSyncModal } from './components/RoomSyncModal';
import { setSoundMuted, getSoundMuted, playStageChime, playTimerFinishChime } from './utils/audio';
import { 
  subscribeToRoom, 
  subscribeToLiveActions, 
  subscribeToLiveReactions, 
  updateRoomNavState, 
  submitLiveAction,
  sendLiveReaction,
  joinLiveRoom
} from './services/firebaseSync';

const STORAGE_KEYS = {
  TOPICS: 'smallgroup_topics_v1',
  CURRENT_TOPIC_ID: 'smallgroup_cur_topic_v1',
  ACTIONS: 'smallgroup_actions_v1',
  MEMBERS: 'smallgroup_members_v1',
  USER_NAME: 'smallgroup_user_name_v1',
  LAST_ROOM_CODE: 'smallgroup_last_room_code_v1',
};

const DEFAULT_MEMBERS: GroupMember[] = [
  { id: 'm-1', name: '小明', avatarColor: '#3B82F6', hasShared: false },
  { id: 'm-2', name: '小華', avatarColor: '#10B981', hasShared: false },
  { id: 'm-3', name: '雅各', avatarColor: '#F59E0B', hasShared: false },
  { id: 'm-4', name: '佳恩', avatarColor: '#EC4899', hasShared: false },
  { id: 'm-5', name: '約翰', avatarColor: '#8B5CF6', hasShared: false },
  { id: 'm-6', name: '宣宣', avatarColor: '#06B6D4', hasShared: false },
];

export default function App() {
  // Current User Identity in Live Room
  const [currentUserName, setCurrentUserName] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.USER_NAME) || '組員';
  });
  const [currentUserRole, setCurrentUserRole] = useState<'host' | 'member'>('member');

  // Live Room State
  const [liveRoom, setLiveRoom] = useState<LiveRoomState | null>(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);

  // Topics Database (Loaded from Google Sheet database or default authentic topics)
  const [topics, setTopics] = useState<WeeklyTopic[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TOPICS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasAuthentic = parsed.some((t: any) => t.id === '2026-W35' || t.id === '2026-W34');
          if (hasAuthentic) return parsed;
        }
      }
    } catch {}
    return DEFAULT_TOPICS;
  });

  const [currentTopicId, setCurrentTopicId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_TOPIC_ID);
      if (saved && (saved === '2026-W35' || saved === '2026-W34')) return saved;
    } catch {}
    return DEFAULT_TOPICS[0].id;
  });

  // Current stage & Card index
  const [currentStage, setCurrentStage] = useState<QuestionStage | 'summary'>('icebreaker');
  const [cardIndexByStage, setCardIndexByStage] = useState<Record<QuestionStage, number>>({
    icebreaker: 0,
    review: 0,
    reflection: 0,
    application: 0,
  });

  // Actions / Commitments state
  const [actions, setActions] = useState<ActionCommitment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIONS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'act-demo-1',
        memberName: '小明',
        actionText: '這週每天早晨晨禱5分鐘，並背誦馬可福音4:39經文',
        prayerNeeds: '為本週新專案報告求平靜心緒',
        targetDate: '本週每日',
        timestamp: Date.now() - 3600000,
      },
      {
        id: 'act-demo-2',
        memberName: '佳恩',
        actionText: '主動打電話關心一位最近沒來小組的姊妹並為她祝福',
        targetDate: '本週三前',
        timestamp: Date.now() - 1800000,
      },
    ];
  });

  // Group Members state
  const [members, setMembers] = useState<GroupMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_MEMBERS;
  });

  const [activeSpeakerName, setActiveSpeakerName] = useState<string>('小明');

  // Sound Muted state
  const [isMuted, setIsMuted] = useState(false);

  // Timer State
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState<number>(120);

  // Modals
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isManualAddModalOpen, setIsManualAddModalOpen] = useState(false);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  // Ref to skip sync loop when local update originates from remote
  const isRemoteUpdatingRef = useRef(false);

  // Auto-connect if room code in URL query string (e.g. ?room=GRP-123)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && !liveRoom) {
      joinLiveRoom(roomParam, currentUserName).then((roomState) => {
        if (roomState) {
          setLiveRoom(roomState);
          setCurrentUserRole('member');
        }
      });
    }
  }, []);

  // Firebase Real-time Room Sync Listener
  useEffect(() => {
    if (!liveRoom?.roomCode) return;

    // 1. Listen to room navigation changes (Current Topic, Stage, Card Index)
    const unsubRoom = subscribeToRoom(liveRoom.roomCode, (remoteRoom) => {
      if (!remoteRoom) return;

      isRemoteUpdatingRef.current = true;
      setLiveRoom(remoteRoom);

      // Sync active topic if changed by host
      if (remoteRoom.currentTopicId && remoteRoom.currentTopicId !== currentTopicId) {
        setCurrentTopicId(remoteRoom.currentTopicId);
      }

      // Sync stage
      if (remoteRoom.currentStage && remoteRoom.currentStage !== currentStage) {
        setCurrentStage(remoteRoom.currentStage);
      }

      // Sync card index
      if (remoteRoom.currentCardIndex !== undefined && remoteRoom.currentStage) {
        setCardIndexByStage((prev) => ({
          ...prev,
          [remoteRoom.currentStage as QuestionStage]: remoteRoom.currentCardIndex,
        }));
      }

      // Sync member list into local member picker
      if (Array.isArray(remoteRoom.members)) {
        setMembers((prev) => {
          const existingNames = new Set(prev.map((m) => m.name));
          const additions: GroupMember[] = [];
          remoteRoom.members.forEach((mName) => {
            if (!existingNames.has(mName)) {
              additions.push({
                id: `m-live-${Date.now()}-${mName}`,
                name: mName,
                avatarColor: '#10B981',
                hasShared: false,
              });
            }
          });
          return additions.length > 0 ? [...prev, ...additions] : prev;
        });
      }

      setTimeout(() => {
        isRemoteUpdatingRef.current = false;
      }, 50);
    });

    // 2. Listen to live action submissions
    const unsubActions = subscribeToLiveActions(liveRoom.roomCode, (remoteActions) => {
      if (remoteActions.length > 0) {
        setActions(remoteActions);
      }
    });

    return () => {
      unsubRoom();
      unsubActions();
    };
  }, [liveRoom?.roomCode, currentTopicId, currentStage]);

  // Persist storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(topics));
  }, [topics]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_TOPIC_ID, currentTopicId);
  }, [currentTopicId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify(actions));
  }, [actions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USER_NAME, currentUserName);
  }, [currentUserName]);

  // Current active topic
  const currentTopic = useMemo(() => {
    return topics.find((t) => t.id === currentTopicId) || topics[0] || DEFAULT_TOPICS[0];
  }, [topics, currentTopicId]);

  // Filter cards by current stage
  const cardsInCurrentStage = useMemo(() => {
    if (currentStage === 'summary') return [];
    return currentTopic.questions.filter((q) => q.stage === currentStage);
  }, [currentTopic, currentStage]);

  // Progress for all stages
  const stageProgress = useMemo(() => {
    const calc = (stg: QuestionStage) => {
      const list = currentTopic.questions.filter((q) => q.stage === stg);
      const curr = cardIndexByStage[stg] || 0;
      return { current: Math.min(curr, Math.max(0, list.length - 1)), total: list.length };
    };
    return {
      icebreaker: calc('icebreaker'),
      review: calc('review'),
      reflection: calc('reflection'),
      application: calc('application'),
    };
  }, [currentTopic, cardIndexByStage]);

  // Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSecondsLeft !== null && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft((prev) => {
          if (prev === null || prev <= 1) {
            setIsTimerRunning(false);
            playTimerFinishChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSecondsLeft]);

  // Push local changes to Firebase room if user is host or room is active
  const syncNavToRoom = (nextStage: QuestionStage | 'summary', nextCardIdx: number, topicId?: string) => {
    if (liveRoom && !isRemoteUpdatingRef.current) {
      if (nextStage !== 'summary') {
        updateRoomNavState(liveRoom.roomCode, {
          currentStage: nextStage,
          currentCardIndex: nextCardIdx,
          currentTopicId: topicId || currentTopicId,
        }).catch(console.error);
      }
    }
  };

  // Handle stage selection
  const handleSelectStage = (stage: QuestionStage | 'summary') => {
    setCurrentStage(stage);
    playStageChime();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (stage !== 'summary') {
      const targetIdx = cardIndexByStage[stage] || 0;
      syncNavToRoom(stage, targetIdx);
    }
  };

  // Card Navigation
  const currentCardIndex = currentStage !== 'summary' ? cardIndexByStage[currentStage] || 0 : 0;

  const handleNextCard = () => {
    if (currentStage === 'summary') return;
    if (currentCardIndex < cardsInCurrentStage.length - 1) {
      const nextIdx = currentCardIndex + 1;
      setCardIndexByStage((prev) => ({
        ...prev,
        [currentStage]: nextIdx,
      }));
      syncNavToRoom(currentStage, nextIdx);
    }
  };

  const handlePrevCard = () => {
    if (currentStage === 'summary') return;
    if (currentCardIndex > 0) {
      const prevIdx = currentCardIndex - 1;
      setCardIndexByStage((prev) => ({
        ...prev,
        [currentStage]: prevIdx,
      }));
      syncNavToRoom(currentStage, prevIdx);
    }
  };

  const handleSelectCardIndex = (index: number) => {
    if (currentStage === 'summary') return;
    setCardIndexByStage((prev) => ({
      ...prev,
      [currentStage]: index,
    }));
    syncNavToRoom(currentStage, index);
  };

  const handleRandomCard = () => {
    if (currentStage === 'summary' || cardsInCurrentStage.length <= 1) return;
    const nextIdx = Math.floor(Math.random() * cardsInCurrentStage.length);
    setCardIndexByStage((prev) => ({
      ...prev,
      [currentStage]: nextIdx,
    }));
    syncNavToRoom(currentStage, nextIdx);
  };

  const handleGoToNextStage = () => {
    const stageOrder: Array<QuestionStage | 'summary'> = [
      'icebreaker',
      'review',
      'reflection',
      'application',
      'summary',
    ];
    const currentIndex = stageOrder.indexOf(currentStage);
    if (currentIndex < stageOrder.length - 1) {
      handleSelectStage(stageOrder[currentIndex + 1]);
    }
  };

  // Sound Toggle
  const handleToggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    setSoundMuted(next);
  };

  // Timer Controls
  const handleStartTimer = (duration: number) => {
    setTotalDurationSeconds(duration);
    setTimerSecondsLeft(duration);
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResumeTimer = () => {
    setIsTimerRunning(true);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimerSecondsLeft(totalDurationSeconds);
  };

  // Action Commitments Handlers
  const handleAddAction = (action: Omit<ActionCommitment, 'id' | 'timestamp'>) => {
    const newAction: ActionCommitment = {
      ...action,
      id: `act-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };

    setActions((prev) => [newAction, ...prev]);

    // If connected to Firebase room, push to Cloud Database
    if (liveRoom?.roomCode) {
      submitLiveAction(liveRoom.roomCode, action).catch(console.error);
    }

    // Also mark this member as has shared
    setMembers((prev) =>
      prev.map((m) => (m.name === action.memberName ? { ...m, hasShared: true } : m))
    );
  };

  const handleDeleteAction = (id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  const handleClearAllActions = () => {
    setActions([]);
  };

  // Member Handlers
  const handleAddMember = (name: string) => {
    const newMember: GroupMember = {
      id: `m-${Date.now()}`,
      name,
      avatarColor: '#3B82F6',
      hasShared: false,
    };
    setMembers((prev) => [...prev, newMember]);
  };

  const handleRemoveMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleToggleShared = (id: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, hasShared: !m.hasShared } : m))
    );
  };

  // Topic Handlers
  const handleSelectTopic = (topicId: string) => {
    setCurrentTopicId(topicId);
    setCurrentStage('icebreaker');
    setCardIndexByStage({
      icebreaker: 0,
      review: 0,
      reflection: 0,
      application: 0,
    });
    syncNavToRoom('icebreaker', 0, topicId);
  };

  const handleTopicsUpdated = (newTopics: WeeklyTopic[]) => {
    setTopics(newTopics);
    localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(newTopics));
    if (newTopics.length > 0 && !newTopics.some((t) => t.id === currentTopicId)) {
      setCurrentTopicId(newTopics[0].id);
      localStorage.setItem(STORAGE_KEYS.CURRENT_TOPIC_ID, newTopics[0].id);
    }
  };

  const handleAddManualQuestion = (cardData: Omit<QuestionCard, 'id'>) => {
    const newCard: QuestionCard = {
      ...cardData,
      id: `q-manual-${Date.now()}`,
    };

    setTopics((prevTopics) => {
      const updated = prevTopics.map((topic) => {
        if (topic.id === currentTopicId) {
          return {
            ...topic,
            questions: [...topic.questions, newCard],
          };
        }
        return topic;
      });
      localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(updated));
      return updated;
    });

    // Jump directly to that stage and select this newly added card
    setCurrentStage(newCard.stage);
    const countInStage = cardsInCurrentStage.length;
    setCardIndexByStage((prev) => ({ ...prev, [newCard.stage]: countInStage }));
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-between text-stone-800 antialiased selection:bg-amber-200">
      {/* Top Header */}
      <Header
        currentTopic={currentTopic}
        onOpenTopicModal={() => setIsTopicModalOpen(true)}
        onOpenTimerModal={() => setIsTimerModalOpen(true)}
        onOpenMembersModal={() => setIsMembersModalOpen(true)}
        onOpenSummaryTab={() => handleSelectStage('summary')}
        onOpenRoomModal={() => setIsRoomModalOpen(true)}
        onOpenSheetModal={() => setIsSheetModalOpen(true)}
        liveRoom={liveRoom}
        currentUserRole={currentUserRole}
        isMuted={isMuted}
        onToggleSound={handleToggleSound}
        timerSecondsLeft={timerSecondsLeft}
        isTimerRunning={isTimerRunning}
        activeSpeakerName={activeSpeakerName}
        actionCount={actions.length}
      />

      {/* Stage Step Tabs */}
      <StageNav
        currentStage={currentStage}
        onSelectStage={handleSelectStage}
        stageProgress={stageProgress}
        actionCount={actions.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col py-2 sm:py-4">
        {currentStage === 'summary' ? (
          <ActionPlansSection
            topic={currentTopic}
            actions={actions}
            onAddAction={handleAddAction}
            onDeleteAction={handleDeleteAction}
            onClearAllActions={handleClearAllActions}
            onBackToCards={() => handleSelectStage('application')}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
          />
        ) : (
          <CardDeck
            currentStage={currentStage}
            currentCardIndex={currentCardIndex}
            cardsInStage={cardsInCurrentStage}
            onNextCard={handleNextCard}
            onPrevCard={handlePrevCard}
            onSelectCardIndex={handleSelectCardIndex}
            onRandomCard={handleRandomCard}
            onGoToNextStage={handleGoToNextStage}
            topic={currentTopic}
            onAddActionCommitment={handleAddAction}
            actionCount={actions.length}
          />
        )}
      </main>

      {/* Floating Emotional Value Cheering Bar */}
      <ReactionFloatingBar
        activeSpeakerName={activeSpeakerName}
        onOpenTimerModal={() => setIsTimerModalOpen(true)}
      />

      {/* Live Room Sync Modal */}
      <RoomSyncModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        currentRoom={liveRoom}
        currentUserRole={currentUserRole}
        currentUserName={currentUserName}
        onSetCurrentUserName={setCurrentUserName}
        onJoinRoomSuccess={(room, role) => {
          setLiveRoom(room);
          setCurrentUserRole(role);
        }}
        onLeaveRoom={() => setLiveRoom(null)}
        currentTopicId={currentTopicId}
      />

      {/* Modals */}
      <TopicSelectorModal
        isOpen={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        topics={topics}
        currentTopicId={currentTopicId}
        onSelectTopic={handleSelectTopic}
        onOpenSheetDatabase={() => setIsSheetModalOpen(true)}
        onOpenManualAdd={() => setIsManualAddModalOpen(true)}
      />

      <GoogleSheetDatabaseModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        onTopicsUpdated={handleTopicsUpdated}
      />

      <ManualAddQuestionModal
        isOpen={isManualAddModalOpen}
        onClose={() => setIsManualAddModalOpen(false)}
        topicTitle={currentTopic.title}
        onAddQuestion={handleAddManualQuestion}
      />

      <SpeakerTimerModal
        isOpen={isTimerModalOpen}
        onClose={() => setIsTimerModalOpen(false)}
        timerSecondsLeft={timerSecondsLeft}
        isTimerRunning={isTimerRunning}
        totalDurationSeconds={totalDurationSeconds}
        onStartTimer={handleStartTimer}
        onPauseTimer={handlePauseTimer}
        onResumeTimer={handleResumeTimer}
        onResetTimer={handleResetTimer}
        activeSpeakerName={activeSpeakerName}
        onSelectSpeakerName={(name) => setActiveSpeakerName(name)}
        members={members}
      />

      <MemberManagerModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        members={members}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        onToggleShared={handleToggleShared}
        onSelectActiveSpeaker={(name) => {
          setActiveSpeakerName(name);
          setIsMembersModalOpen(false);
        }}
        activeSpeakerName={activeSpeakerName}
      />
    </div>
  );
}
