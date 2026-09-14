import React from 'react';
import { 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Timer, 
  Users, 
  Share2, 
  ChevronDown,
  BookOpen,
  Radio,
  FileSpreadsheet
} from 'lucide-react';
import { WeeklyTopic, LiveRoomState } from '../types';

interface HeaderProps {
  currentTopic: WeeklyTopic | null;
  onOpenTopicModal: () => void;
  onOpenTimerModal: () => void;
  onOpenMembersModal: () => void;
  onOpenSummaryTab: () => void;
  onOpenRoomModal: () => void;
  onOpenSheetDatabase?: () => void;
  liveRoom: LiveRoomState | null;
  currentUserRole: 'host' | 'member';
  isMuted: boolean;
  onToggleSound: () => void;
  timerSecondsLeft: number | null;
  isTimerRunning: boolean;
  activeSpeakerName?: string;
  actionCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTopic,
  onOpenTopicModal,
  onOpenTimerModal,
  onOpenMembersModal,
  onOpenSummaryTab,
  onOpenRoomModal,
  onOpenSheetDatabase,
  liveRoom,
  currentUserRole,
  isMuted,
  onToggleSound,
  timerSecondsLeft,
  isTimerRunning,
  activeSpeakerName,
  actionCount,
}) => {
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <header className="sticky top-0 z-40 bg-stone-900/95 backdrop-blur-md text-stone-100 border-b border-stone-800 shadow-md touch-manipulation">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-inner text-stone-950 font-bold shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-stone-950" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-lg tracking-tight text-stone-50 truncate">
                小組分享卡
              </span>
              {liveRoom ? (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  ● {liveRoom.roomCode}
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Quality Time
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Current Topic Selector Button */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            id="btn-select-topic"
            onClick={onOpenTopicModal}
            style={{ touchAction: 'manipulation' }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[40px] sm:min-h-[38px] rounded-xl bg-stone-800/95 hover:bg-stone-750 border border-stone-700/90 text-stone-200 transition-all text-xs sm:text-sm font-semibold hover:border-amber-400/50 min-w-0 max-w-[140px] xs:max-w-[190px] sm:max-w-xs md:max-w-sm truncate group shadow-xs active:scale-95 cursor-pointer touch-manipulation"
            title="點擊切換分享主題"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 group-hover:scale-125 transition-transform" />
            <span className="truncate">{currentTopic ? currentTopic.title : '選擇/同步試算表主題'}</span>
            <ChevronDown className="w-4 h-4 text-stone-400 group-hover:text-amber-300 transition-colors shrink-0" />
          </button>
        </div>

        {/* Right: Quick Utilities */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Google Sheet CSV Button */}
          {onOpenSheetDatabase && (
            <button
              id="btn-sheet-csv"
              onClick={onOpenSheetDatabase}
              style={{ touchAction: 'manipulation' }}
              className="px-2 sm:px-2.5 py-1.5 min-h-[38px] rounded-xl bg-stone-800 hover:bg-stone-750 border border-emerald-500/40 text-emerald-300 transition-colors text-xs sm:text-sm font-semibold flex items-center gap-1.5 active:scale-95 shadow-xs cursor-pointer touch-manipulation"
              title="動態讀取 Google 試算表 CSV 題庫"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="hidden md:inline">試算表 CSV</span>
            </button>
          )}

          {/* Live Sync Room Button */}
          <button
            id="btn-live-room"
            onClick={onOpenRoomModal}
            style={{ touchAction: 'manipulation' }}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 min-h-[38px] rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer touch-manipulation ${
              liveRoom
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/60 shadow-xs'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-750 border border-stone-700'
            }`}
            title={liveRoom ? `已連線到房間 ${liveRoom.roomCode}` : '建立或加入即時小組房間'}
          >
            <Radio className={`w-4 h-4 shrink-0 ${liveRoom ? 'text-emerald-400 animate-pulse' : 'text-stone-400'}`} />
            <span className="hidden xs:inline">
              {liveRoom ? liveRoom.roomCode : '房間'}
            </span>
          </button>

          {/* Active Speaker / Timer Widget */}
          <button
            id="btn-timer-widget"
            onClick={onOpenTimerModal}
            style={{ touchAction: 'manipulation' }}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 min-h-[38px] rounded-xl text-xs sm:text-sm font-medium transition-all active:scale-95 cursor-pointer touch-manipulation ${
              isTimerRunning
                ? 'bg-amber-500/20 border border-amber-500 text-amber-300 animate-pulse'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-750 border border-stone-700'
            }`}
            title="分享計時器"
          >
            <Timer className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-mono font-semibold text-xs sm:text-sm">
              {timerSecondsLeft !== null ? formatTimer(timerSecondsLeft) : '計時'}
            </span>
          </button>

          {/* Group Members Manager */}
          <button
            id="btn-members-manager"
            onClick={onOpenMembersModal}
            style={{ touchAction: 'manipulation' }}
            className="p-1.5 sm:px-3 sm:py-1.5 min-h-[38px] rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-750 border border-stone-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5 active:scale-95 cursor-pointer touch-manipulation"
            title="小組成員與抽籤輪序"
          >
            <Users className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="hidden sm:inline">成員</span>
          </button>

          {/* Action Summary / LINE Export Badge */}
          <button
            id="btn-summary-badge"
            onClick={onOpenSummaryTab}
            style={{ touchAction: 'manipulation' }}
            className="relative px-2 sm:px-3 py-1.5 min-h-[38px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation"
            title="查看本週行動彙整與LINE分享"
          >
            <Share2 className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline">彙整</span>
            {actionCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 text-xs font-black flex items-center justify-center font-mono shadow-xs">
                {actionCount}
              </span>
            )}
          </button>

          {/* Sound Toggle */}
          <button
            id="btn-sound-toggle"
            onClick={onToggleSound}
            style={{ touchAction: 'manipulation' }}
            className="p-1.5 sm:p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-stone-800/80 hover:bg-stone-750 text-stone-400 hover:text-stone-200 transition-colors active:scale-95 cursor-pointer touch-manipulation"
            title={isMuted ? '開啟音效' : '靜音'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
