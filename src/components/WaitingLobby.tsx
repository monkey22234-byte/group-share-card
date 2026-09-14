import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Copy, 
  Check, 
  Share2, 
  Sparkles, 
  LogOut, 
  Radio, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  UserCheck, 
  PlayCircle,
  HelpCircle,
  QrCode
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LiveRoomState } from '../types';
import { playStageChime } from '../utils/audio';

interface WaitingLobbyProps {
  room: LiveRoomState;
  currentUserRole: 'host' | 'member';
  currentUserName: string;
  currentTopicTitle: string;
  onOpenRoom: () => Promise<void>;
  onLeaveRoom: () => void;
}

export const WaitingLobby: React.FC<WaitingLobbyProps> = ({
  room,
  currentUserRole,
  currentUserName,
  currentTopicTitle,
  onOpenRoom,
  onLeaveRoom,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Extract digits for individual 4-digit card presentation
  const rawCode = (room.roomCode || '').replace(/\D/g, '').slice(0, 4);
  const digits = rawCode.length === 4 ? rawCode.split('') : (room.roomCode || '----').padEnd(4, '-').slice(0, 4).split('');

  const membersList = Array.isArray(room.members) ? room.members : [room.hostName || currentUserName];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', room.roomCode);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleStartFellowship = async () => {
    setIsOpening(true);
    setErrorMsg('');
    try {
      playStageChime();
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
      });
      await onOpenRoom();
    } catch (err: any) {
      setErrorMsg(err.message || '開啟房間失敗，請檢查網路連線');
      setIsOpening(false);
    }
  };

  const avatarColors = [
    'bg-amber-500 text-stone-950',
    'bg-emerald-600 text-white',
    'bg-sky-600 text-white',
    'bg-indigo-600 text-white',
    'bg-rose-500 text-white',
    'bg-teal-600 text-white',
    'bg-purple-600 text-white',
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 max-w-2xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full bg-white rounded-3xl shadow-xl border border-stone-200/80 overflow-hidden"
      >
        {/* Top Header Banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-800 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg sm:text-xl tracking-tight text-stone-50">
                  {room.roomName || '小組聚會等待室'}
                </h2>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  WAITING LOBBY
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 truncate max-w-xs sm:max-w-md mt-0.5">
                預定分享主題：<span className="text-amber-300 font-semibold">{currentTopicTitle}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onLeaveRoom}
            className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-rose-900/60 hover:text-rose-200 text-stone-300 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition"
            title="離開房間"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">離開</span>
          </button>
        </div>

        {/* 4-Digit Room Code Section */}
        <div className="p-5 sm:p-8 text-center bg-gradient-to-b from-amber-50/50 via-stone-50/40 to-white border-b border-stone-200/80">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-900 text-xs sm:text-sm font-bold border border-amber-300 mb-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            {currentUserRole === 'host' ? '小組長已開房・4 位數字房間代碼' : '小組 4 位數字房間代碼'}
          </span>

          <p className="text-sm sm:text-base text-stone-700 max-w-md mx-auto mb-4 leading-relaxed">
            {currentUserRole === 'host' ? (
              <span>請將以下 <strong className="text-stone-900 font-bold">4 位數字代碼</strong> 提供給組員，組員輸入後即可直接進入此等待區：</span>
            ) : (
              <span>您已成功進入等待區，以下為本場聚會代碼：</span>
            )}
          </p>

          {/* 4 Big Digit Display Boxes */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 my-4 sm:my-6">
            {digits.map((digit, idx) => (
              <motion.div
                key={idx}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.06 }}
                className="w-16 h-20 sm:w-22 sm:h-26 rounded-2xl bg-white border-2 border-amber-400 shadow-lg flex items-center justify-center text-4xl sm:text-5xl font-black font-mono text-stone-900 select-all transition hover:border-amber-500 hover:shadow-xl"
              >
                {digit}
              </motion.div>
            ))}
          </div>

          {/* Quick Copy & Share Buttons */}
          <div className="flex items-center justify-center gap-2.5 max-w-sm mx-auto mt-4">
            <button
              onClick={handleCopyCode}
              className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-stone-500" />}
              <span>{copiedCode ? '已複製 4 位代碼！' : '複製 4 位代碼'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
            >
              {copiedLink ? <Check className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedLink ? '已複製專屬連結！' : '分享專屬連結'}</span>
            </button>
          </div>
        </div>

        {/* Member Status & Waiting Roster */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Status Indicator Banner */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-stone-800 flex items-center gap-1.5">
                  <span>等待區名單即時連線中</span>
                  <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded-full font-bold">
                    {membersList.length} 人已在室內
                  </span>
                </h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {currentUserRole === 'host'
                    ? '請等待組員陸續輸入 4 位代碼加入，待全員到齊後點擊「開啟房間」。'
                    : `小組長（${room.hostName || '小組長'}）正在確認所有組員就緒中，開啟後畫面將自動進入題目！`}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1 text-[11px] font-mono text-stone-400 bg-white px-2.5 py-1 rounded-xl border border-stone-200">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>即時同步</span>
            </div>
          </div>

          {/* Members Grid (Only self-entered names!) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-stone-500" />
                已進入等待區的組員名單 ({membersList.length} 人)
              </span>
              <span className="text-[11px] text-stone-400">
                僅顯示自行輸入姓名的成員
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
              {membersList.map((mName, idx) => {
                const isHost = mName === room.hostName;
                const isMe = mName === currentUserName;
                const colorClass = avatarColors[idx % avatarColors.length];

                return (
                  <motion.div
                    key={`${mName}-${idx}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-3 sm:p-3.5 rounded-2xl border flex items-center gap-3 shadow-2xs transition ${
                      isMe
                        ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-300'
                        : 'bg-white border-stone-200'
                    }`}
                  >
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base shrink-0 ${colorClass}`}>
                      {mName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm sm:text-base font-bold text-stone-900 truncate block">
                          {mName}
                        </span>
                        {isMe && (
                          <span className="text-xs font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 shrink-0">
                            你
                          </span>
                        )}
                      </div>
                      <span className="text-xs sm:text-sm text-stone-500 block font-medium">
                        {isHost ? '👑 小組長' : '🙋 組員已就緒'}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-700 font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Action Bottom Bar */}
          <div className="pt-4 border-t border-stone-200">
            {currentUserRole === 'host' ? (
              <div className="space-y-2.5">
                <button
                  id="btn-host-open-room"
                  onClick={handleStartFellowship}
                  disabled={isOpening}
                  className="w-full py-4 sm:py-5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base sm:text-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 active:scale-98 disabled:opacity-50"
                >
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
                  <span>
                    {isOpening ? '正在開啟房間...' : '所有組員都已進入・開啟房間開始聚會'}
                  </span>
                </button>
                <p className="text-center text-xs sm:text-sm text-stone-500 font-medium">
                  點擊開啟後，所有已在等待區的組員手機與電腦將同步進入題目討論！
                </p>
              </div>
            ) : (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full border-2 border-amber-600 border-t-transparent animate-spin shrink-0" />
                  <span className="text-sm sm:text-base font-bold text-amber-950">
                    等待小組長開啟房間中...
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-amber-800 font-semibold">
                  開啟後將自動同步進入
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
