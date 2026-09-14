import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radio, 
  Users, 
  Copy, 
  Check, 
  Sparkles, 
  LogIn, 
  PlusCircle, 
  X, 
  Wifi, 
  ShieldCheck, 
  QrCode, 
  Share2,
  LogOut,
  Flame,
  ArrowRight
} from 'lucide-react';
import { LiveRoomState } from '../types';
import { createLiveRoom, joinLiveRoom, generateRoomCode } from '../services/firebaseSync';

interface RoomSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoom: LiveRoomState | null;
  currentUserRole: 'host' | 'member';
  currentUserName: string;
  onSetCurrentUserName: (name: string) => void;
  onJoinRoomSuccess: (room: LiveRoomState, role: 'host' | 'member') => void;
  onLeaveRoom: () => void;
  currentTopicId: string;
  disableClose?: boolean;
}

export const RoomSyncModal: React.FC<RoomSyncModalProps> = ({
  isOpen,
  onClose,
  currentRoom,
  currentUserRole,
  currentUserName,
  onSetCurrentUserName,
  onJoinRoomSuccess,
  onLeaveRoom,
  currentTopicId,
  disableClose = false,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('join');
  const [inputRoomCode, setInputRoomCode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return (params.get('room') || '').toUpperCase();
    } catch {
      return '';
    }
  });
  const [inputRoomName, setInputRoomName] = useState('恩典小組聚會');
  const [inputMemberName, setInputMemberName] = useState(currentUserName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMemberName.trim()) {
      setErrorMessage('請輸入你的暱稱（小組長姓名）');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const newCode = generateRoomCode();
      await createLiveRoom(newCode, inputRoomName.trim(), inputMemberName.trim(), currentTopicId);
      
      const newRoomState: LiveRoomState = {
        roomId: newCode,
        roomCode: newCode,
        roomName: inputRoomName.trim() || `${inputMemberName.trim()}的小組`,
        currentTopicId,
        currentStage: 'icebreaker',
        currentCardIndex: 0,
        hostName: inputMemberName.trim(),
        members: [inputMemberName.trim()],
        status: 'waiting',
        updatedAt: Date.now(),
      };

      onSetCurrentUserName(inputMemberName.trim());
      onJoinRoomSuccess(newRoomState, 'host');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || '建立房間失敗，請檢查網路連線');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputRoomCode.trim().replace(/\D/g, '').slice(0, 4) || inputRoomCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('請輸入 4 位數字房間代碼（例如 5821）');
      return;
    }
    if (!inputMemberName.trim()) {
      setErrorMessage('請輸入你的姓名或暱稱');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const roomState = await joinLiveRoom(cleanCode, inputMemberName.trim());
      if (!roomState) {
        setErrorMessage(`找不到代碼為「${cleanCode}」的房間，請向小組長確認 4 位數字代碼。`);
        setIsLoading(false);
        return;
      }

      onSetCurrentUserName(inputMemberName.trim());
      onJoinRoomSuccess(roomState, 'member');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || '加入房間失敗，請重試');
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback to local mode if Cloud Firestore is unavailable or disabled
  const handleEnterLocalMode = () => {
    if (!inputMemberName.trim()) {
      setErrorMessage('請先輸入你的姓名或暱稱');
      return;
    }
    const cleanCode = inputRoomCode.trim().replace(/\D/g, '').slice(0, 4) || generateRoomCode();
    const localRoomState: LiveRoomState = {
      roomId: cleanCode,
      roomCode: cleanCode,
      roomName: inputRoomName.trim() || `${inputMemberName.trim()}的小組聚會`,
      currentTopicId,
      currentStage: 'icebreaker',
      currentCardIndex: 0,
      hostName: inputMemberName.trim(),
      members: [inputMemberName.trim()],
      status: 'active',
      updatedAt: Date.now(),
    };

    onSetCurrentUserName(inputMemberName.trim());
    onJoinRoomSuccess(localRoomState, tab === 'create' ? 'host' : 'member');
    onClose();
  };

  const copyRoomCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyRoomShareLink = () => {
    if (!currentRoom) return;
    const url = new URL(window.location.href);
    url.searchParams.set('room', currentRoom.roomCode);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 to-stone-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-1.5">
                <span>Firebase 即時小組連動</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                  LIVE
                </span>
              </h3>
              <p className="text-[11px] text-stone-400">
                全組手機毫秒級同步題目・即時按讚・行動代禱
              </p>
            </div>
          </div>

          <button
            id="btn-room-modal-close"
            onClick={() => {
              if (!disableClose) {
                onClose();
              }
            }}
            disabled={disableClose}
            title={disableClose ? '請先輸入名字並加入房間以繼續' : '關閉'}
            className={`p-1.5 rounded-full transition ${
              disableClose
                ? 'text-stone-600 opacity-25 cursor-not-allowed pointer-events-none'
                : 'text-stone-400 hover:text-white hover:bg-stone-700 cursor-pointer'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mandatory Setup Banner when disableClose is active */}
        {disableClose && (
          <div className="mx-4 sm:mx-5 mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
            <span className="text-base leading-none">👋</span>
            <div className="space-y-0.5">
              <p className="font-bold text-amber-950">初次使用請先加入小組房間</p>
              <p className="text-amber-800/90 leading-relaxed">
                請輸入你的姓名與房間代碼（或由小組長開房），完成後即可開啟即時小組連動！
              </p>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Active Room Info Card */}
          {currentRoom ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-bold text-emerald-900">連線中房間</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {currentUserRole === 'host' ? '👑 主持人/小組長' : '🙋 組員'}
                  </span>
                </div>

                <div className="text-center my-3 bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="text-[11px] text-stone-400 font-medium">4 位數字房間代碼</span>
                    {currentRoom.status === 'waiting' && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded-full font-bold">
                        等待室中
                      </span>
                    )}
                  </div>
                  <span className="text-3xl font-black font-mono tracking-widest text-emerald-800 select-all">
                    {currentRoom.roomCode}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copyRoomCode}
                    className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-emerald-100/60 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? '已複製代碼！' : '複製 4 位代碼'}</span>
                  </button>

                  <button
                    onClick={copyRoomShareLink}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? '已複製連結！' : '分享加入連結'}</span>
                  </button>
                </div>

                {/* Return to waiting room button if in waiting state */}
                {currentRoom.status === 'waiting' && (
                  <div className="mt-3 pt-3 border-t border-emerald-200/80">
                    <button
                      onClick={onClose}
                      className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                      <span>回到聚會等待室</span>
                    </button>
                  </div>
                )}

                {/* Member count & list preview */}
                <div className="mt-3 pt-3 border-t border-emerald-200/80 flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-700" />
                    <span>線上成員 ({currentRoom.members?.length || 1} 人)</span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-mono">
                    主持人: {currentRoom.hostName}
                  </span>
                </div>
              </div>

              {/* Leave Room Button */}
              <button
                onClick={() => {
                  onLeaveRoom();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>離開此即時房間</span>
              </button>
            </div>
          ) : (
            <>
              {/* Tab Selector: Join vs Create */}
              <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-2xl border border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setTab('join');
                    setErrorMessage('');
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    tab === 'join'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5 text-amber-500" />
                  <span>輸入 4 位代碼加入</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('create');
                    setErrorMessage('');
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    tab === 'create'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>我是小組長開房</span>
                </button>
              </div>

              {/* Join Form */}
              {tab === 'join' ? (
                <form onSubmit={handleJoinRoom} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      4 位數字房間代碼
                    </label>
                    <input
                      type="text"
                      placeholder="例如: 5821"
                      maxLength={4}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={inputRoomCode}
                      onChange={(e) => setInputRoomCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 font-mono font-bold tracking-widest text-center placeholder:font-normal placeholder:tracking-normal placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-lg sm:text-xl"
                      required
                    />
                    <p className="text-[11px] text-stone-400 mt-1">
                      請輸入小組長畫面上的 4 位數字代碼即可進入等待區
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      你的名字 / 暱稱
                    </label>
                    <input
                      type="text"
                      placeholder="例如: 雅各 / 小美"
                      value={inputMemberName}
                      onChange={(e) => setInputMemberName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                      required
                    />
                  </div>

                  {errorMessage && (
                    <div className="space-y-2">
                      <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                        ⚠️ {errorMessage}
                      </p>
                      <button
                        type="button"
                        onClick={handleEnterLocalMode}
                        className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        <span>📱 改以單機模式直接開始（免雲端連線）</span>
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isLoading ? '連線中...' : '進入房間等待區'}</span>
                  </button>
                </form>
              ) : (
                /* Create Room Form */
                <form onSubmit={handleCreateRoom} className="space-y-3 pt-1">
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      建立房間後，系統將<strong>自動生成隨機 4 位數字代碼</strong>並帶您進入等待室。組員輸入 4 位代碼加入後，您可確認全員到齊再一鍵開啟聚會！
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      小組長姓名 / 暱稱
                    </label>
                    <input
                      type="text"
                      placeholder="例如: 大衛小組長"
                      value={inputMemberName}
                      onChange={(e) => setInputMemberName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      聚會名稱
                    </label>
                    <input
                      type="text"
                      placeholder="例如: 青年週六小組"
                      value={inputRoomName}
                      onChange={(e) => setInputRoomName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      required
                    />
                  </div>

                  {errorMessage && (
                    <div className="space-y-2">
                      <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                        ⚠️ {errorMessage}
                      </p>
                      <button
                        type="button"
                        onClick={handleEnterLocalMode}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        <span>📱 改以單機模式直接開房（免雲端連線）</span>
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{isLoading ? '建立中...' : '建立房間並進入等待室'}</span>
                  </button>
                </form>
              )}

              {/* Offline fallback button when not in error state */}
              {!errorMessage && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleEnterLocalMode}
                    className="text-xs text-stone-500 hover:text-stone-800 underline underline-offset-2 transition"
                  >
                    不需要多裝置同步？點此直接以「單機模式」開始聚會
                  </button>
                </div>
              )}
            </>
          )}

          {/* Feature Highlight Pills */}
          <div className="pt-2 border-t border-stone-100 grid grid-cols-2 gap-2 text-[11px] text-stone-600">
            <div className="p-2 bg-stone-50 rounded-xl border border-stone-200/70 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>完全免費 Spark 配額</span>
            </div>
            <div className="p-2 bg-stone-50 rounded-xl border border-stone-200/70 flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>即時同步選擇題與答案</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
