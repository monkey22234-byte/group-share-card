import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Copy, 
  Share2, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  MessageSquare, 
  Sparkles, 
  Calendar, 
  Heart, 
  Send, 
  BookOpen, 
  ArrowRight, 
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  Check,
  AlertCircle,
  Link as LinkIcon,
  FolderPlus,
  RefreshCw,
  Clock,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { WeeklyTopic, ActionCommitment } from '../types';
import { formatLineGroupMessage, copyToClipboard, getLineShareUrl } from '../utils/lineFormatter';
import { playStageChime } from '../utils/audio';
import {
  getLinkedSpreadsheetInfo,
  setLinkedSpreadsheetInfo,
  exportActionPlansToGoogleSheet,
  googleSignIn,
  getAccessToken,
  createGroupQuestionsSpreadsheet,
  extractSpreadsheetId,
  LinkedSpreadsheetInfo
} from '../services/googleWorkspace';

interface ActionPlansSectionProps {
  topic: WeeklyTopic;
  actions: ActionCommitment[];
  onAddAction: (action: Omit<ActionCommitment, 'id' | 'timestamp'>) => void;
  onDeleteAction: (id: string) => void;
  onUpdateAction?: (id: string, updated: Partial<ActionCommitment>) => void;
  onClearAllActions: () => void;
  onBackToCards: () => void;
  onOpenSheetModal?: () => void;
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
  onOpenSheetModal,
}) => {
  const [memberName, setMemberName] = useState('');
  const [actionText, setActionText] = useState('');
  const [prayerNeeds, setPrayerNeeds] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showRawLinePreview, setShowRawLinePreview] = useState(false);

  // Google Sheet export state
  const [linkedSheet, setLinkedSheet] = useState<LinkedSpreadsheetInfo | null>(() => getLinkedSpreadsheetInfo());
  const [isExportingSheet, setIsExportingSheet] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportSuccessInfo, setExportSuccessInfo] = useState<{
    count: number;
    url: string;
    title: string;
    tab: string;
    time: string;
  } | null>(null);

  // Linking modal state
  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);
  const [customSheetUrl, setCustomSheetUrl] = useState('');
  const [isCreatingNewSheet, setIsCreatingNewSheet] = useState(false);
  const [newSheetTitle, setNewSheetTitle] = useState(() => `小組生活應用與行動方案追蹤 - ${new Date().toLocaleDateString('zh-TW')}`);

  useEffect(() => {
    const saved = getLinkedSpreadsheetInfo();
    if (saved) {
      setLinkedSheet(saved);
    }
  }, []);

  const formattedLineMessage = formatLineGroupMessage(topic, actions);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim() || !actionText.trim()) return;

    onAddAction({
      memberName: memberName.trim(),
      actionText: actionText.trim(),
      prayerNeeds: prayerNeeds.trim() || undefined,
      targetDate: targetDate.trim() || undefined,
    });

    setActionText('');
    setPrayerNeeds('');
    setTargetDate('');
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

  // Perform export to a given spreadsheet ID or URL
  const performExport = async (sheetTarget: string) => {
    if (actions.length === 0) {
      setExportError('目前尚未登記任何行動方案，請先新增夥伴的具體行動承諾。');
      return;
    }

    setExportError('');
    setIsExportingSheet(true);

    try {
      // Check auth
      let token = await getAccessToken();
      if (!token) {
        const signinRes = await googleSignIn();
        if (!signinRes) {
          throw new Error('未取得 Google 授權，無法匯出至 Google 試算表。');
        }
      }

      const res = await exportActionPlansToGoogleSheet(sheetTarget, topic, actions);
      
      const newLinkedInfo: LinkedSpreadsheetInfo = {
        id: res.spreadsheetId,
        url: res.spreadsheetUrl,
        title: res.spreadsheetTitle,
        lastUpdated: Date.now(),
      };
      setLinkedSheet(newLinkedInfo);
      setLinkedSpreadsheetInfo(newLinkedInfo);

      setExportSuccessInfo({
        count: res.addedCount,
        url: res.spreadsheetUrl,
        title: res.spreadsheetTitle,
        tab: res.sheetTabTitle,
        time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      });

      playStageChime();
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      console.error('Export to Google Sheet error:', err);
      setExportError(err?.message || '匯出至 Google 試算表失敗，請確認已登入且具備試算表編輯權限。');
    } finally {
      setIsExportingSheet(false);
    }
  };

  // Trigger quick export
  const handleQuickExportToSheet = async () => {
    setExportError('');
    if (actions.length === 0) {
      setExportError('目前尚未登記任何行動方案，請先新增夥伴的具體行動承諾！');
      return;
    }

    const currentLinked = linkedSheet || getLinkedSpreadsheetInfo();
    if (!currentLinked) {
      // If no linked sheet is set yet, show the linking modal so user can choose or create
      setIsLinkingModalOpen(true);
      return;
    }

    await performExport(currentLinked.id);
  };

  // Handle creating a new sheet from modal and immediately exporting
  const handleCreateAndExport = async () => {
    setExportError('');
    setIsCreatingNewSheet(true);

    try {
      let token = await getAccessToken();
      if (!token) {
        const signinRes = await googleSignIn();
        if (!signinRes) {
          throw new Error('未完成 Google 授權');
        }
      }

      const created = await createGroupQuestionsSpreadsheet(newSheetTitle);
      const newLinked: LinkedSpreadsheetInfo = {
        id: created.id,
        url: created.url,
        title: created.title,
        lastUpdated: Date.now(),
      };
      setLinkedSheet(newLinked);
      setLinkedSpreadsheetInfo(newLinked);
      setIsLinkingModalOpen(false);

      // Now export actions to this newly created sheet
      await performExport(created.id);
    } catch (err: any) {
      setExportError(err?.message || '建立試算表或匯出失敗');
    } finally {
      setIsCreatingNewSheet(false);
    }
  };

  // Handle linking existing sheet from modal and exporting
  const handleLinkExistingAndExport = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customSheetUrl.trim();
    if (!trimmed) return;

    const sheetId = extractSpreadsheetId(trimmed);
    if (!sheetId) {
      setExportError('請輸入有效的 Google 試算表網址或 ID');
      return;
    }

    setIsLinkingModalOpen(false);
    await performExport(sheetId);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-stone-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl mb-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>小組生活應用與守望彙整</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            📝 本週生活行動方案彙整
          </h2>
          <p className="text-emerald-100/90 text-sm sm:text-base max-w-2xl leading-relaxed">
            每位夥伴輸入具體承諾，小組長一鍵複製成 LINE 格式發送群組，亦可一鍵保存至 Google 試算表進行長期追蹤！
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              id="btn-copy-line-top"
              onClick={handleCopyLine}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-white text-emerald-850 font-bold text-xs sm:text-sm shadow-md hover:bg-emerald-50 transition active:scale-95 shrink-0"
            >
              {copySuccess ? (
                <>
                  <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                  <span>已複製 LINE 格式！</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-emerald-700" />
                  <span>複製 LINE 格式 ({actions.length} 筆)</span>
                </>
              )}
            </button>

            <button
              id="btn-export-sheet-top"
              onClick={handleQuickExportToSheet}
              disabled={isExportingSheet}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-400/60 text-emerald-200 hover:text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 disabled:opacity-60 shrink-0"
              title={linkedSheet ? `一鍵匯出保存至「${linkedSheet.title}」` : '匯出至 Google 試算表以供長期追蹤'}
            >
              {isExportingSheet ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                  <span>儲存至試算表...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>
                    {linkedSheet ? '一鍵保存至 Google 試算表' : '匯出至 Google 試算表'}
                  </span>
                </>
              )}
            </button>

            <button
              id="btn-open-line-app"
              onClick={handleOpenLineApp}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white font-medium text-xs sm:text-sm shadow-xs transition active:scale-95 shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>傳送 LINE</span>
            </button>

            <button
              onClick={onBackToCards}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-200 hover:text-white transition shrink-0"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              <span>返回卡片</span>
            </button>
          </div>
        </div>

        {/* Decorative Watermark */}
        <div className="absolute right-4 bottom-2 text-white/5 pointer-events-none text-8xl font-serif">
          Amen
        </div>
      </div>

      {/* Export Result Notification Banner */}
      {exportSuccessInfo && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <span>已成功匯出 {exportSuccessInfo.count} 筆行動承諾！</span>
                <span className="text-[11px] font-normal text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {exportSuccessInfo.time}
                </span>
              </p>
              <p className="text-xs text-emerald-800 mt-0.5">
                已記錄至試算表「{exportSuccessInfo.title}」的【{exportSuccessInfo.tab}】分頁，便於後續持續關心與追蹤。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <a
              href={exportSuccessInfo.url}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>在 Google 試算表開啟 ↗</span>
            </a>
            <button
              onClick={() => setExportSuccessInfo(null)}
              className="p-1.5 text-emerald-600 hover:text-emerald-900 rounded-lg hover:bg-emerald-100 transition"
              title="關閉通知"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Export Error Alert Banner */}
      {exportError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-900">匯出至試算表時發生問題：</p>
              <p className="text-xs text-rose-700 mt-0.5">{exportError}</p>
            </div>
          </div>
          <button
            onClick={() => setExportError('')}
            className="p-1 text-rose-400 hover:text-rose-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm">
            <h3 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>夥伴輸入行動方案</span>
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  你的姓名 / 暱稱 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="例如：小明、雅各"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  本週具體行動方案 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="例如：每天早起默禱5分鐘、寫一張感謝卡給同事..."
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Preset suggestion chips */}
              <div>
                <span className="text-[11px] font-semibold text-stone-500 block mb-1.5">
                  💡 點擊套用靈感範例：
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ACTION_SUGGESTION_PRESETS.slice(0, 4).map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActionText(preset)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 text-stone-600 transition text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  代禱事項 (選填)
                </label>
                <input
                  type="text"
                  placeholder="例如：請為本週工作面試平靜平安代禱"
                  value={prayerNeeds}
                  onChange={(e) => setPrayerNeeds(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  目標完成時間 (選填)
                </label>
                <input
                  type="text"
                  placeholder="例如：本週五前、每日早晨"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={!memberName.trim() || !actionText.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>加入本週行動列表</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Google Sheet Tracking Card + Submitted List & LINE Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Google Sheets Long-Term Tracking Card */}
          <div className="bg-gradient-to-br from-emerald-900/90 via-teal-950 to-stone-900 text-white rounded-3xl p-5 sm:p-6 border border-emerald-700/40 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                    <span>Google 試算表長期追蹤記錄</span>
                    {linkedSheet ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-200 border border-emerald-600/50">
                        已連結
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-700 text-stone-300">
                        尚未連結
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    自動保存於【行動方案與追蹤記錄】分頁，便於按週回顧與關懷守望
                  </p>
                </div>
              </div>

              {linkedSheet && (
                <button
                  onClick={() => setIsLinkingModalOpen(true)}
                  className="text-xs text-emerald-300 hover:text-emerald-100 underline decoration-dotted transition shrink-0"
                >
                  更換試算表
                </button>
              )}
            </div>

            {linkedSheet ? (
              <div className="bg-stone-850/90 rounded-2xl p-3.5 border border-stone-750 space-y-3 mb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-semibold text-xs text-stone-200 truncate" title={linkedSheet.title}>
                      {linkedSheet.title}
                    </span>
                  </div>

                  <a
                    href={linkedSheet.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-400 hover:text-emerald-200 flex items-center gap-1 shrink-0 font-medium"
                  >
                    <span>開啟試算表</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-800">
                  <span className="text-[11px] text-stone-400">
                    目前已登記 {actions.length} 筆行動方案
                  </span>
                  
                  <button
                    id="btn-export-sheet-panel"
                    onClick={handleQuickExportToSheet}
                    disabled={isExportingSheet || actions.length === 0}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
                  >
                    {isExportingSheet ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>儲存至工作表...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>一鍵匯出保存本週行動方案</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-stone-850/80 rounded-2xl p-4 border border-stone-750 text-center space-y-3 mb-3">
                <p className="text-xs text-stone-300 leading-relaxed">
                  將本週小組行動與代禱事項保存至 Google 試算表，自動記錄時間、主題、經文、姓名與行動內容，建立完整的成長檔案！
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setIsLinkingModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition active:scale-95"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>連結或建立 Google 試算表</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Items List */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-stone-900">
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
                  className="text-xs text-stone-400 hover:text-rose-600 transition"
                >
                  清空列表
                </button>
              )}
            </div>

            {actions.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-stone-200 rounded-2xl p-6">
                <MessageSquare className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <p className="text-stone-500 font-medium text-sm mb-1">
                  目前還沒有人輸入行動方案
                </p>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  請大家在左側打字，或在第4階段「生活應用題」卡片下方快速輸入！
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {actions.map((act) => (
                  <div
                    key={act.id}
                    className="p-4 rounded-2xl bg-stone-50 border border-stone-200/90 hover:border-emerald-300 transition-colors flex items-start justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">
                        {act.memberName.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-stone-900">
                            {act.memberName}
                          </span>
                          {act.targetDate && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 font-medium">
                              {act.targetDate}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-stone-800 font-medium mt-1 leading-relaxed">
                          📌 {act.actionText}
                        </p>

                        {act.prayerNeeds && (
                          <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
                            <Heart className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>代禱：{act.prayerNeeds}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteAction(act.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 opacity-80 group-hover:opacity-100 transition"
                      title="刪除此項"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LINE Group Message Preview Accordion */}
          <div className="bg-stone-900 text-stone-100 rounded-3xl p-5 border border-stone-800 shadow-md">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h4 className="text-sm font-bold text-stone-100">
                  📱 LINE 群組發送預覽格式
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-copy-line-bottom"
                  onClick={handleCopyLine}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>一鍵複製</span>
                </button>

                <button
                  onClick={() => setShowRawLinePreview(!showRawLinePreview)}
                  className="text-xs text-stone-400 hover:text-stone-200 font-medium"
                >
                  {showRawLinePreview ? '隱藏預覽' : '展開預覽'}
                </button>
              </div>
            </div>

            {showRawLinePreview ? (
              <pre className="p-4 rounded-xl bg-stone-950 text-emerald-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed border border-stone-800 select-all">
                {formattedLineMessage}
              </pre>
            ) : (
              <p className="text-xs text-stone-400 leading-relaxed">
                包含當週主題（{topic.title}）、經文亮光、全體夥伴行動承諾與結尾鼓勵經文。點擊「一鍵複製」即可直接貼到 LINE 小組聊天室！
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Linking Modal Dialog */}
      {isLinkingModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-stone-200 relative">
            <button
              onClick={() => setIsLinkingModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  連結 Google 試算表以保存行動方案
                </h3>
                <p className="text-xs text-stone-500">
                  請選擇要在雲端硬碟建立新試算表，或連結現有的試算表
                </p>
              </div>
            </div>

            {linkedSheet && (
              <div className="p-3.5 mb-5 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-600">
                <div className="font-semibold text-stone-900 mb-1 flex items-center justify-between">
                  <span>目前連結的試算表：</span>
                  <a
                    href={linkedSheet.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 hover:underline flex items-center gap-1 font-normal"
                  >
                    開啟 ↗
                  </a>
                </div>
                <p className="truncate text-emerald-850 font-medium">{linkedSheet.title}</p>
              </div>
            )}

            <div className="space-y-5">
              {/* Option 1: Create New Sheet in Google Drive */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 space-y-3">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                  <FolderPlus className="w-4 h-4 text-emerald-700" />
                  <span>方法 1：在我的 Google 雲端硬碟建立新試算表</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  系統將自動建立排版完整的 Google 試算表，並直接將目前 {actions.length} 筆行動方案記錄至工作表中。
                </p>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    試算表標題：
                  </label>
                  <input
                    type="text"
                    value={newSheetTitle}
                    onChange={(e) => setNewSheetTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCreateAndExport}
                  disabled={isCreatingNewSheet}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 active:scale-95"
                >
                  {isCreatingNewSheet ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>正在建立試算表並匯出...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>在 Google 雲端硬碟建立並匯出 ({actions.length} 筆)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Option 2: Paste Existing Sheet URL */}
              <form onSubmit={handleLinkExistingAndExport} className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-3">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                  <LinkIcon className="w-4 h-4 text-stone-600" />
                  <span>方法 2：貼上現有 Google 試算表網址</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  貼上現有試算表網址，系統將在該檔案中建立或追加至【行動方案與追蹤記錄】工作表分頁。
                </p>

                <div>
                  <input
                    type="text"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={customSheetUrl}
                    onChange={(e) => setCustomSheetUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!customSheetUrl.trim() || isExportingSheet}
                  className="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-900 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 active:scale-95"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>連結此試算表並匯出行動方案</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
