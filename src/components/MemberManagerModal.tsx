import React, { useState } from 'react';
import { Users, X, Plus, Trash2, CheckCircle2, Circle, Shuffle, Mic, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GroupMember } from '../types';
import { playStageChime } from '../utils/audio';

interface MemberManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: GroupMember[];
  onAddMember: (name: string) => void;
  onRemoveMember: (id: string) => void;
  onToggleShared: (id: string) => void;
  onSelectActiveSpeaker: (name: string) => void;
  activeSpeakerName?: string;
}

export const MemberManagerModal: React.FC<MemberManagerModalProps> = ({
  isOpen,
  onClose,
  members,
  onAddMember,
  onRemoveMember,
  onToggleShared,
  onSelectActiveSpeaker,
  activeSpeakerName,
}) => {
  const [newMemberName, setNewMemberName] = useState('');
  const [isPickingRandom, setIsPickingRandom] = useState(false);
  const [pickedResult, setPickedResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    onAddMember(newMemberName.trim());
    setNewMemberName('');
  };

  const handleRandomPick = () => {
    const unshared = members.filter((m) => !m.hasShared);
    const pool = unshared.length > 0 ? unshared : members;

    if (pool.length === 0) return;

    setIsPickingRandom(true);
    let count = 0;
    const interval = setInterval(() => {
      const randomMember = pool[Math.floor(Math.random() * pool.length)];
      setPickedResult(randomMember.name);
      count++;
      if (count > 15) {
        clearInterval(interval);
        const finalWinner = pool[Math.floor(Math.random() * pool.length)];
        setPickedResult(finalWinner.name);
        onSelectActiveSpeaker(finalWinner.name);
        setIsPickingRandom(false);
        playStageChime();
        confetti({
          particleCount: 50,
          spread: 50,
          origin: { y: 0.5 },
        });
      }
    }, 80);
  };

  const sharedCount = members.filter((m) => m.hasShared).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 bg-stone-900 text-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-base font-bold text-stone-100">小組成員與分享輪序</h3>
              <p className="text-[11px] text-stone-400">
                已分享 {sharedCount} / {members.length} 人
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Random Picker Action Banner */}
        <div className="p-4 bg-sky-50 border-b border-sky-100 flex items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-sky-900 block">🎲 下一位分享者抽籤</span>
            {pickedResult ? (
              <span className="text-xs text-sky-700 font-bold">
                🎉 抽中：<span className="text-sm text-sky-950 underline">{pickedResult}</span>
              </span>
            ) : (
              <span className="text-[11px] text-sky-700">隨機挑選一位尚未分享的夥伴</span>
            )}
          </div>

          <button
            onClick={handleRandomPick}
            disabled={isPickingRandom || members.length === 0}
            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 active:scale-95"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>{isPickingRandom ? '抽籤中...' : '抽下一位'}</span>
          </button>
        </div>

        {/* Add Member Form */}
        <form onSubmit={handleAddSubmit} className="p-4 border-b border-stone-200 bg-stone-50 flex gap-2">
          <input
            type="text"
            placeholder="輸入新成員姓名 (例: 小華)"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            type="submit"
            disabled={!newMemberName.trim()}
            className="px-3 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 disabled:opacity-50 transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>加入</span>
          </button>
        </form>

        {/* Member List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {members.map((member) => {
            const isSpeaking = activeSpeakerName === member.name;
            return (
              <div
                key={member.id}
                className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2 ${
                  isSpeaking
                    ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/40 shadow-xs'
                    : 'bg-stone-50 border-stone-200/80 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => onToggleShared(member.id)}
                    className="text-stone-400 hover:text-emerald-600 transition"
                    title={member.hasShared ? '已完成分享 (點擊取消)' : '尚未分享 (點擊標記已分享)'}
                  >
                    {member.hasShared ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                    ) : (
                      <Circle className="w-5 h-5 text-stone-300" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <span
                      className={`text-sm font-bold block truncate ${
                        member.hasShared ? 'line-through text-stone-400' : 'text-stone-900'
                      }`}
                    >
                      {member.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onSelectActiveSpeaker(member.name)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      isSpeaking
                        ? 'bg-amber-500 text-stone-950 font-bold'
                        : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>{isSpeaking ? '發言中' : '指定發言'}</span>
                  </button>

                  <button
                    onClick={() => onRemoveMember(member.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                    title="移除成員"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {members.length === 0 && (
            <div className="py-8 text-center text-xs text-stone-400">
              尚無小組成員名單，請在上方輸入夥伴姓名！
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-200 bg-stone-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold transition"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
