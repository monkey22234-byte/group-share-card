import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Copy, 
  Share2, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  MessageSquare, 
  Sparkles, 
  Calendar, 
  Heart, 
  Send, 
  ArrowRight, 
  ExternalLink,
  UserCheck,
  Hash
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { WeeklyTopic, ActionCommitment } from '../types';
import { formatLineGroupMessage, copyToClipboard, getLineShareUrl } from '../utils/lineFormatter';
import { playStageChime } from '../utils/audio';

interface ActionPlansSectionProps {
  topic: WeeklyTopic | null;
  actions: ActionCommitment[];
  onAddAction: (action: Omit<ActionCommitment, 'id' | 'timestamp'>) => void;
  onDeleteAction: (id: string) => void;
  onUpdateAction?: (id: string, updated: Partial<ActionCommitment>) => void;
  onClearAllActions: () => void;
  onBackToCards: () => void;
  currentUserName?: string;
  onSetCurrentUserName?: (name: string) => void;
  roomCode?: string;
}

const ACTION_SUGGESTION_PRESETS = [
  '每天早晨固定靈修與默想經文 15 分鐘',
  '這週主動傳訊息或寫卡片關心一位久未聯絡的朋友',
  '遇到壓力或焦慮時，先暫停深呼吸並默禱 30 秒',
  '每天睡前為小組夥伴與家庭列出 3 件感恩的事',
  '在職場或學校主動幫助一位有需要的同事/同學',
  '本週操練勒住舌頭，不說抱怨與負面的話語',
];

export const ActionPlansSection: React.FC<ActionPlansSectionProps> = ({
  topic,
  actions,
  onAddAction,
  onDeleteAction,
  onClearAllActions,
  onBackToCards,
  currentUserName = '',
  onSetCurrentUserName,
  roomCode,
}) => {
  // Directly use the user's room ID / name entered when joining the room
  const [memberName, setMemberName] = useState(() => currentUserName.trim());
  const [actionText, setActionText] = useState('');
  const [prayerNeeds, setPrayerNeeds] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showRawLinePreview, setShowRawLinePreview] = useState(false);

  // Sync memberName whenever currentUserName updates
  useEffect(() => {
    if (currentUserName && currentUserName.trim()) {
      setMemberName(currentUserName.trim());
    }
  }, [currentUserName]);

  const formattedLineMessage = formatLineGroupMessage(topic, actions);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = memberName.trim() || currentUserName.trim() || '小組夥伴';
    if (!actionText.trim()) return;

    if (onSetCurrentUserName && finalName) {
      onSetCurrentUserName(finalName);
    }

    onAddAction({
      memberName: finalName,
      actionText: actionText.trim(),
      prayerNeeds: prayerNeeds.trim() || undefined,
      targetDate: targetDate.trim() || undefined,
      completed: false,
    });

    setActionText('');
    setPrayerNeeds('');
    setTargetDate('');
    playStageChime();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });
  };

  const handleCopyLine = async () => {
    const success = await copyToClipboard(formattedLineMessage);
    if (success) {
      setCopySuccess(true);
      playStageChime();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  const handleOpenLineApp = () => {
    const shareUrl = getLineShareUrl(formattedLineMessage);
    window.open(shareUrl, '_blank');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-stone-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl mb-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>小組生活應用與守望彙整</span>
            {roomCode && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-900/80 border border-emerald-400/40 text-emerald-200 font-mono text-xs">
                <Hash className="w-3 h-3 text-emerald-400" />
                房間 ID: {roomCode}
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            📝 本週生活行動方案彙整
          </h2>
          <p className="text-emerald-100/90 text-sm sm:text-base max-w-2xl leading-relaxed">
            每位夥伴輸入具體承諾，小組長一鍵複製成 LINE 格式發送群組，持續代禱關心與守望！
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              id="btn-copy-line-top"
              onClick={handleCopyLine}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-sm sm:text-base shadow-md transition active:scale-95 shrink-0"
            >
              {copySuccess ? (
                <>
                  <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                  <span>已複製 LINE 格式！</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 text-emerald-700" />
                  <span>複製 LINE 格式 ({actions.length} 筆)</span>
                </>
              )}
            </button>

            <button
              id="btn-open-line-app"
              onClick={handleOpenLineApp}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-sm sm:text-base shadow-md transition active:scale-95 shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
              <span>傳送至 LINE</span>
            </button>

            <button
              onClick={onBackToCards}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-emerald-200 hover:text-white transition shrink-0 ml-auto sm:ml-0"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span>返回卡片</span>
            </button>
          </div>
        </div>

        {/* Decorative Watermark */}
        <div className="absolute right-4 bottom-2 text-white/5 pointer-events-none text-8xl font-serif">
          Amen
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm">
            <h3 className="text-lg font-bold text-stone-900 mb-3.5 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              <span>夥伴登記行動承諾</span>
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-bold text-stone-800">
                    你的姓名 / 房間 ID <span className="text-rose-500">*</span>
                  </label>
                  {currentUserName && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-emerald-600" />
                      已自動帶入 ID
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="請輸入你的姓名或房間 ID"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-300 bg-emerald-50/30 text-base font-bold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-800 mb-1.5">
                  本週具體行動方案 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="例如：每天早起默禱5分鐘、寫一張感謝卡給同事..."
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Preset suggestion chips */}
              <div>
                <span className="text-xs font-bold text-stone-600 block mb-1.5">
                  💡 點擊套用靈感範例：
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ACTION_SUGGESTION_PRESETS.slice(0, 4).map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActionText(preset)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 text-stone-700 font-medium transition text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-800 mb-1.5">
                  代禱事項 (選填)
                </label>
                <input
                  type="text"
                  placeholder="例如：請為本週工作面試平靜平安代禱"
                  value={prayerNeeds}
                  onChange={(e) => setPrayerNeeds(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-800 mb-1.5">
                  目標完成時間 (選填)
                </label>
                <input
                  type="text"
                  placeholder="例如：本週五前、每日早晨"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={!memberName.trim() || !actionText.trim()}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-base shadow-md transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>加入本週行動列表</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Submitted List & LINE Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Action Items List */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base sm:text-lg font-bold text-stone-900">
                  已登記的行動承諾 ({actions.length})
                </h3>
              </div>

              {actions.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('確定要清空本週所有已記錄的行動方案嗎？')) {
                      onClearAllActions();
                    }
                  }}
                  className="text-xs text-stone-400 hover:text-rose-600 transition font-medium"
                >
                  清空列表
                </button>
              )}
            </div>

            {actions.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-stone-200 rounded-2xl p-6">
                <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-2.5" />
                <p className="text-stone-700 font-bold text-base mb-1">
                  目前還沒有人輸入行動方案
                </p>
                <p className="text-sm text-stone-400 max-w-sm mx-auto">
                  請在左側輸入，或在第4階段「生活應用題」卡片下方快速登記！
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                {actions.map((act) => {
                  const displayName = act.memberName?.trim() || '小組夥伴';
                  return (
                    <div
                      key={act.id}
                      className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 hover:border-emerald-300 transition-colors flex items-start justify-between gap-3 group shadow-2xs"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center shrink-0 text-base shadow-xs">
                          {displayName.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base sm:text-lg text-stone-900">
                              {displayName}
                            </span>
                            {act.targetDate && (
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-700 font-semibold">
                                {act.targetDate}
                              </span>
                            )}
                          </div>

                        <p className="text-base text-stone-900 font-medium mt-1.5 leading-relaxed">
                          📌 {act.actionText}
                        </p>

                        {act.prayerNeeds && (
                          <p className="text-sm text-stone-600 mt-1.5 flex items-center gap-1.5 font-normal">
                            <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                            <span>代禱：{act.prayerNeeds}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteAction(act.id)}
                      className="p-2 text-stone-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 opacity-80 group-hover:opacity-100 transition"
                      title="刪除此項"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* LINE Group Message Preview Card */}
          <div className="bg-stone-900 text-stone-100 rounded-3xl p-5 sm:p-6 border border-stone-800 shadow-md">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h4 className="text-sm sm:text-base font-bold text-stone-100">
                  📱 LINE 群組發送預覽格式
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-copy-line-bottom"
                  onClick={handleCopyLine}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>一鍵複製</span>
                </button>

                <button
                  onClick={() => setShowRawLinePreview(!showRawLinePreview)}
                  className="text-xs text-stone-400 hover:text-stone-200 font-medium px-2 py-1 rounded-lg hover:bg-stone-800"
                >
                  {showRawLinePreview ? '隱藏預覽' : '展開預覽'}
                </button>
              </div>
            </div>

            {showRawLinePreview ? (
              <pre className="p-4 rounded-xl bg-stone-950 text-emerald-300 font-mono text-xs sm:text-sm overflow-x-auto whitespace-pre-wrap leading-relaxed border border-stone-800 select-all">
                {formattedLineMessage}
              </pre>
            ) : (
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                包含當週主題{topic?.title ? `（${topic.title}）` : ''}、經文亮光、全體夥伴行動承諾與結尾鼓勵經文。點擊「一鍵複製」即可直接貼到 LINE 小組聊天室！
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
