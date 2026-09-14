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
import { 
  CSV_STORAGE_KEYS, 
  syncTopicsFromCSV, 
  syncGoogleSheetWithTabs,
  getEffectiveCsvConfig 
} from './services/csvTopicService';
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
import { WaitingLobby } from './components/WaitingLobby';
import confetti from 'canvas-confetti';
import { FileSpreadsheet } from 'lucide-react';
import { setSoundMuted, getSoundMuted, playStageChime, playTimerFinishChime } from './utils/audio';
import { 
  subscribeToRoom, 
  subscribeToLiveActions, 
  subscribeToLiveReactions, 
  updateRoomNavState, 
  submitLiveAction,
  sendLiveReaction,
  joinLiveRoom,
  openLiveRoom,
  subscribeToCloudTopics,
  saveTopicToCloud,
  seedCloudTopics
} from './services/firebaseSync';

const STORAGE_KEYS = {
  TOPICS: 'smallgroup_topics_v1',
  CURRENT_TOPIC_ID: 'smallgroup_cur_topic_v1',
  ACTIONS: 'smallgroup_actions_v1',
  MEMBERS: 'smallgroup_members_v1',
  USER_NAME: 'currentUserName',
  LEGACY_USER_NAME: 'smallgroup_user_name_v1',
  LAST_ROOM_CODE: 'smallgroup_last_room_code_v1',
};

const getStoredUserName = (): string => {
  try {
    const direct = localStorage.getItem('currentUserName');
    if (direct && direct.trim()) return direct.trim();
    const legacy = localStorage.getItem('smallgroup_user_name_v1');
    if (legacy && legacy.trim() && legacy !== '組員') return legacy.trim();
  } catch {}
  return '';
};

const DEFAULT_MEMBERS: GroupMember[] = [];

export default function App() {
  // Check localStorage for currentUserName on startup
  const [currentUserName, setCurrentUserName] = useState<string>(() => {
    return getStoredUserName();
  });
  const [currentUserRole, setCurrentUserRole] = useState<'host' | 'member'>('member');

  // Track if user has completed the mandatory name & room joining
  const [hasJoinedRoom, setHasJoinedRoom] = useState<boolean>(() => {
    return Boolean(getStoredUserName());
  });

  // Live Room State
  const [liveRoom, setLiveRoom] = useState<LiveRoomState | null>(null);
  const liveRoomRef = useRef<LiveRoomState | null>(null);
  useEffect(() => {
    liveRoomRef.current = liveRoom;
  }, [liveRoom]);

  // If currentUserName is not found in localStorage at startup, force auto-open RoomSyncModal
  const [isRoomModalOpen, setIsRoomModalOpen] = useState<boolean>(() => {
    return !getStoredUserName();
  });

  // Close is disabled until the user inputs their name and joins a room
  const isCloseDisabled = !hasJoinedRoom || !currentUserName.trim() || !liveRoom;

  // Topics Database (Loaded dynamically with DEFAULT_TOPICS as robust fallback for incognito / first-load)
  const [topics, setTopics] = useState<WeeklyTopic[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TOPICS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Guarantee strictly card limits per stage: 1 破冰, 5 回顧, 1 思想, 1 應用
          return parsed.map((t: WeeklyTopic) => ({
            ...t,
            questions: [
              ...t.questions.filter((q) => q.stage === 'icebreaker').slice(0, 1),
              ...t.questions.filter((q) => q.stage === 'review').slice(0, 5),
              ...t.questions.filter((q) => q.stage === 'reflection').slice(0, 1),
              ...t.questions.filter((q) => q.stage === 'application').slice(0, 1),
            ],
          }));
        }
      }
    } catch {}
    return DEFAULT_TOPICS;
  });

  const [currentTopicId, setCurrentTopicId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_TOPIC_ID);
      if (saved) return saved;
    } catch {}
    return DEFAULT_TOPICS[0]?.id || '';
  });

  // Current stage & Card index
  const [currentStage, setCurrentStage] = useState<QuestionStage | 'summary'>('icebreaker');
  const [cardIndexByStage, setCardIndexByStage] = useState<Record<QuestionStage, number>>({
    icebreaker: 0,
    review: 0,
    reflection: 0,
    application: 0,
  });

  // Actions / Commitments state (strictly clean from mock data)
  const [actions, setActions] = useState<ActionCommitment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (a: any) => a && !String(a.id).startsWith('act-demo-') && a.memberName !== '小明' && a.memberName !== '佳恩'
          );
        }
      }
    } catch {}
    return [];
  });

  // Group Members state (strictly only real users who entered their names)
  const [members, setMembers] = useState<GroupMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (m: any) =>
              m &&
              m.name &&
              !['小明', '小華', '雅各', '佳恩', '約翰', '宣宣'].includes(m.name) &&
              !String(m.id).startsWith('m-1') &&
              !String(m.id).startsWith('m-2') &&
              !String(m.id).startsWith('m-3') &&
              !String(m.id).startsWith('m-4') &&
              !String(m.id).startsWith('m-5') &&
              !String(m.id).startsWith('m-6')
          );
          if (cleaned.length > 0) return cleaned;
        }
      }
    } catch {}
    const myName = getStoredUserName();
    return myName
      ? [{ id: `m-self`, name: myName, avatarColor: '#3B82F6', hasShared: false }]
      : [];
  });

  const [activeSpeakerName, setActiveSpeakerName] = useState<string>(() => {
    return getStoredUserName() || '';
  });

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
    const storedName = getStoredUserName();
    if (roomParam && !liveRoom && storedName) {
      joinLiveRoom(roomParam, storedName).then((roomState) => {
        if (roomState) {
          setLiveRoom(roomState);
          setCurrentUserRole('member');
          setHasJoinedRoom(true);
        }
      });
    }
  }, []);

  // Real-time Cloud Topics from Firestore Database
  useEffect(() => {
    const unsubTopics = subscribeToCloudTopics((cloudTopics) => {
      if (cloudTopics && cloudTopics.length > 0) {
        setTopics(cloudTopics);
        try {
          localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(cloudTopics));
        } catch {}
      }
    });

    return () => {
      unsubTopics();
    };
  }, []);

  // Dynamically sync from Google Sheet CSV on launch (using effective config with fallback)
  useEffect(() => {
    const config = getEffectiveCsvConfig();
    if (config.questionsUrl && config.questionsUrl.trim()) {
      syncGoogleSheetWithTabs({
        questionsUrl: config.questionsUrl.trim(),
        questionsGid: config.questionsGid || undefined,
        topicsUrl: config.topicsUrl || undefined,
        topicsGid: config.topicsGid || undefined,
        syncTopicsTab: config.syncTopicsTab,
        existingTopics: topics,
      })
        .then((result) => {
          if (result && result.topics.length > 0) {
            setTopics(result.topics);
            try {
              localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(result.topics));
            } catch {}
          }
        })
        .catch((err) => {
          // Gracefully log warning without blocking or freezing the UI
          console.warn('Google Sheet CSV auto-sync warning (fallback to current topics):', err?.message || err);
        });
    }
  }, []);

  // Auto-select first available topic when topics change if none is selected
  useEffect(() => {
    if (topics.length > 0) {
      const active = topics.find((t) => t.id === currentTopicId);
      if (!active || (active.questions.length === 0 && topics.some((t) => t.questions.length > 0))) {
        const best = topics.find((t) => t.questions.length > 0) || topics[0];
        setCurrentTopicId(best.id);
        try {
          localStorage.setItem(STORAGE_KEYS.CURRENT_TOPIC_ID, best.id);
        } catch {}
      }
    }
  }, [topics, currentTopicId]);

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
      if (
        remoteRoom.currentCardIndex !== undefined &&
        remoteRoom.currentStage &&
        remoteRoom.currentStage !== 'summary'
      ) {
        setCardIndexByStage((prev) => ({
          ...prev,
          [remoteRoom.currentStage as QuestionStage]: remoteRoom.currentCardIndex,
        }));
      }

      // Detect when leader opened room (waiting -> active)
      if (liveRoomRef.current?.status === 'waiting' && remoteRoom.status === 'active') {
        playStageChime();
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      // Sync member list into local member picker - strictly mirror remoteRoom.members
      if (Array.isArray(remoteRoom.members)) {
        const palette = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#6366F1', '#14B8A6'];
        setMembers((prev) => {
          const prevMap = new Map(prev.map((m) => [m.name, m]));
          return remoteRoom.members.map((mName, idx) => {
            const existing = prevMap.get(mName);
            if (existing) return existing;
            return {
              id: `m-room-${mName}`,
              name: mName,
              avatarColor: palette[idx % palette.length],
              hasShared: false,
            };
          });
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
    if (currentUserName && currentUserName.trim()) {
      try {
        localStorage.setItem('currentUserName', currentUserName.trim());
        localStorage.setItem(STORAGE_KEYS.USER_NAME, currentUserName.trim());
        localStorage.setItem(STORAGE_KEYS.LEGACY_USER_NAME, currentUserName.trim());
      } catch {}
    }
  }, [currentUserName]);

  // Current active topic
  const currentTopic = useMemo(() => {
    if (!topics || topics.length === 0) return null;
    return topics.find((t) => t.id === currentTopicId) || topics[0] || null;
  }, [topics, currentTopicId]);

  // Filter cards by current stage (Application strictly 1 question from authentic database)
  const cardsInCurrentStage = useMemo(() => {
    if (currentStage === 'summary' || !currentTopic) return [];
    const list = currentTopic.questions.filter((q) => q.stage === currentStage);
    if (currentStage === 'application') {
      return list.slice(0, 1);
    }
    return list;
  }, [currentTopic, currentStage]);

  // Progress for all stages
  const stageProgress = useMemo(() => {
    const calc = (stg: QuestionStage) => {
      let list = currentTopic ? currentTopic.questions.filter((q) => q.stage === stg) : [];
      if (stg === 'application') {
        list = list.slice(0, 1);
      }
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
      updateRoomNavState(liveRoom.roomCode, {
        currentStage: nextStage,
        currentCardIndex: nextCardIdx,
        currentTopicId: topicId || currentTopicId,
      }).catch(console.error);
    }
  };

  // Handle stage selection
  const handleSelectStage = (stage: QuestionStage | 'summary') => {
    setCurrentStage(stage);
    playStageChime();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const targetIdx = stage !== 'summary' ? (cardIndexByStage[stage] || 0) : 0;
    syncNavToRoom(stage, targetIdx);
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
    const finalMemberName = action.memberName?.trim() || currentUserName?.trim() || '組員';
    const newAction: ActionCommitment = {
      ...action,
      memberName: finalMemberName,
      id: `act-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };

    setActions((prev) => [newAction, ...prev]);

    // Keep currentUserName updated
    if (finalMemberName && (!currentUserName || !currentUserName.trim())) {
      setCurrentUserName(finalMemberName);
      try {
        localStorage.setItem('currentUserName', finalMemberName);
        localStorage.setItem(STORAGE_KEYS.USER_NAME, finalMemberName);
        localStorage.setItem(STORAGE_KEYS.LEGACY_USER_NAME, finalMemberName);
      } catch {}
    }

    // If connected to Firebase room, push to Cloud Database
    if (liveRoom?.roomCode) {
      submitLiveAction(liveRoom.roomCode, {
        ...action,
        memberName: finalMemberName,
      }).catch(console.error);
    }

    // Also mark this member as has shared
    setMembers((prev) =>
      prev.map((m) => (m.name === finalMemberName ? { ...m, hasShared: true } : m))
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
    try {
      localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(newTopics));
    } catch {}
    seedCloudTopics(newTopics).catch((err) => {
      console.warn('Failed to sync updated topics to Firestore:', err);
    });
    if (newTopics.length > 0) {
      const active = newTopics.find((t) => t.id === currentTopicId);
      if (!active || (active.questions.length === 0 && newTopics.some((t) => t.questions.length > 0))) {
        const best = newTopics.find((t) => t.questions.length > 0) || newTopics[0];
        setCurrentTopicId(best.id);
        try {
          localStorage.setItem(STORAGE_KEYS.CURRENT_TOPIC_ID, best.id);
        } catch {}
      }
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
          const updatedTopic = {
            ...topic,
            questions: [...topic.questions, newCard],
          };
          saveTopicToCloud(updatedTopic).catch((err) => {
            console.warn('Failed to save manual question to Firestore:', err);
          });
          return updatedTopic;
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

  const handleOpenRoom = async () => {
    if (!liveRoom?.roomCode) return;
    try {
      await openLiveRoom(liveRoom.roomCode);
      setLiveRoom((prev) => (prev ? { ...prev, status: 'active' } : null));
      playStageChime();
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error('Failed to open room:', err);
    }
  };

  const handleLeaveRoom = () => {
    setLiveRoom(null);
    setCurrentUserRole('member');
    setHasJoinedRoom(false);
    if (currentUserName) {
      setMembers([
        {
          id: 'm-self',
          name: currentUserName,
          avatarColor: '#3B82F6',
          hasShared: false,
        },
      ]);
      setActiveSpeakerName(currentUserName);
    } else {
      setMembers([]);
      setActiveSpeakerName('');
    }
    setIsRoomModalOpen(true);
  };

  const handleJoinRoomSuccess = (room: LiveRoomState, role: 'host' | 'member') => {
    setLiveRoom(room);
    setCurrentUserRole(role);
    setHasJoinedRoom(true);
    setIsRoomModalOpen(false);

    // Sync member list strictly from room.members
    const roomMembers = Array.isArray(room.members) && room.members.length > 0
      ? room.members
      : [room.hostName || currentUserName || '我'];
    const palette = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#6366F1', '#14B8A6'];
    setMembers(
      roomMembers.map((name, idx) => ({
        id: `m-room-${name}`,
        name,
        avatarColor: palette[idx % palette.length],
        hasShared: false,
      }))
    );
    setActiveSpeakerName(roomMembers[0] || currentUserName || '');
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
        onOpenSheetDatabase={() => setIsSheetModalOpen(true)}
        liveRoom={liveRoom}
        currentUserRole={currentUserRole}
        isMuted={isMuted}
        onToggleSound={handleToggleSound}
        timerSecondsLeft={timerSecondsLeft}
        isTimerRunning={isTimerRunning}
        activeSpeakerName={activeSpeakerName}
        actionCount={actions.length}
      />

      {/* If connected to live room and status is waiting, display WaitingLobby */}
      {liveRoom && liveRoom.status === 'waiting' ? (
        <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6">
          <WaitingLobby
            room={liveRoom}
            currentUserRole={currentUserRole}
            currentUserName={currentUserName}
            currentTopicTitle={currentTopic?.title || '聚會分享'}
            onOpenRoom={handleOpenRoom}
            onLeaveRoom={handleLeaveRoom}
          />
        </main>
      ) : (
        <>
          {/* Stage Step Tabs */}
          <StageNav
            currentStage={currentStage}
            onSelectStage={handleSelectStage}
            stageProgress={stageProgress}
            actionCount={actions.length}
          />

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col py-2 sm:py-4">
            {!currentTopic ? (
              <div className="w-full max-w-md mx-auto my-8 p-8 bg-white rounded-3xl border border-stone-200 text-center shadow-sm">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-stone-900 mb-2">尚未載入 Google 試算表題庫</h3>
                <p className="text-stone-500 mb-6 text-xs sm:text-sm leading-relaxed">
                  本系統已徹底移除預設備用題庫，100% 依據您的 Google 試算表 CSV 動態載入題目。<br />
                  請點擊下方按鈕連結試算表 CSV 網址或貼上內容。
                </p>
                <button
                  onClick={() => setIsSheetModalOpen(true)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition text-xs sm:text-sm shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>立即設定 / 同步 Google 試算表 CSV</span>
                </button>
              </div>
            ) : currentStage === 'summary' ? (
              <ActionPlansSection
                topic={currentTopic}
                actions={actions}
                onAddAction={handleAddAction}
                onDeleteAction={handleDeleteAction}
                onClearAllActions={handleClearAllActions}
                onBackToCards={() => handleSelectStage('application')}
                currentUserName={currentUserName}
                onSetCurrentUserName={(name) => {
                  const trimmed = name.trim();
                  setCurrentUserName(trimmed);
                  if (trimmed) {
                    try {
                      localStorage.setItem('currentUserName', trimmed);
                      localStorage.setItem(STORAGE_KEYS.USER_NAME, trimmed);
                      localStorage.setItem(STORAGE_KEYS.LEGACY_USER_NAME, trimmed);
                    } catch {}
                  }
                }}
                roomCode={liveRoom?.roomCode}
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
                actions={actions}
                currentUserName={currentUserName}
                onSetCurrentUserName={(name) => {
                  const trimmed = name.trim();
                  setCurrentUserName(trimmed);
                  if (trimmed) {
                    try {
                      localStorage.setItem('currentUserName', trimmed);
                      localStorage.setItem(STORAGE_KEYS.USER_NAME, trimmed);
                      localStorage.setItem(STORAGE_KEYS.LEGACY_USER_NAME, trimmed);
                    } catch {}
                  }
                }}
              />
            )}
          </main>

          {/* Floating Emotional Value Cheering Bar */}
          <ReactionFloatingBar
            activeSpeakerName={activeSpeakerName}
            onOpenTimerModal={() => setIsTimerModalOpen(true)}
          />
        </>
      )}

      {/* Live Room Sync Modal */}
      <RoomSyncModal
        isOpen={isRoomModalOpen}
        onClose={() => {
          setIsRoomModalOpen(false);
        }}
        disableClose={false}
        currentRoom={liveRoom}
        currentUserRole={currentUserRole}
        currentUserName={currentUserName}
        onSetCurrentUserName={(name) => {
          const trimmed = name.trim();
          setCurrentUserName(trimmed);
          if (trimmed) {
            try {
              localStorage.setItem('currentUserName', trimmed);
              localStorage.setItem(STORAGE_KEYS.USER_NAME, trimmed);
              localStorage.setItem(STORAGE_KEYS.LEGACY_USER_NAME, trimmed);
            } catch {}
          }
        }}
        onJoinRoomSuccess={(room, role) => {
          handleJoinRoomSuccess(room, role);
        }}
        onLeaveRoom={handleLeaveRoom}
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
        existingTopics={topics}
      />

      <ManualAddQuestionModal
        isOpen={isManualAddModalOpen}
        onClose={() => setIsManualAddModalOpen(false)}
        topicTitle={currentTopic?.title || '小組分享'}
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
