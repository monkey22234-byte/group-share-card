import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  RefreshCw, 
  ExternalLink, 
  Check, 
  AlertCircle, 
  Loader2, 
  Link as LinkIcon,
  Database
} from 'lucide-react';
import { 
  getLinkedSpreadsheetInfo, 
  setLinkedSpreadsheetInfo, 
  fetchDatabaseFromGoogleSheet, 
  googleSignIn, 
  getAccessToken,
  extractSpreadsheetId,
  LinkedSpreadsheetInfo 
} from '../services/googleWorkspace';
import { WeeklyTopic } from '../types';

interface GoogleSheetDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTopicsUpdated: (newTopics: WeeklyTopic[]) => void;
}

export const GoogleSheetDatabaseModal: React.FC<GoogleSheetDatabaseModalProps> = ({
  isOpen,
  onClose,
  onTopicsUpdated,
}) => {
  const [linkedInfo, setLinkedInfo] = useState<LinkedSpreadsheetInfo | null>(() => getLinkedSpreadsheetInfo());
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const saved = getLinkedSpreadsheetInfo();
    if (saved) {
      setLinkedInfo(saved);
      if (!inputUrl) {
        setInputUrl(saved.url || saved.id);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncDatabase = async (targetIdOrUrl?: string) => {
    const target = targetIdOrUrl || inputUrl.trim() || linkedInfo?.id;
    if (!target) {
      setErrorMsg('請先輸入 Google 試算表網址或 ID');
      return;
    }

    const cleanId = extractSpreadsheetId(target);
    if (!cleanId) {
      setErrorMsg('請輸入有效的 Google 試算表網址或 ID');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Ensure Google Token
      let token = await getAccessToken();
      if (!token) {
        const signinRes = await googleSignIn();
        if (!signinRes) {
          throw new Error('未取得 Google 帳號授權，請在彈出視窗完成登入');
        }
      }

      // 2. Fetch Architecture A database
      const result = await fetchDatabaseFromGoogleSheet(cleanId);

      const newInfo: LinkedSpreadsheetInfo = {
        id: cleanId,
        url: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
        title: result.title,
        lastUpdated: Date.now(),
      };
      setLinkedInfo(newInfo);
      setLinkedSpreadsheetInfo(newInfo);

      onTopicsUpdated(result.topics);
      setSuccessMsg(`已成功同步 ${result.topics.length} 週主題與題庫卡片！`);
    } catch (err: any) {
      console.error('Database sync error:', err);
      setErrorMsg(err?.message || '同步失敗，請確認 Google 帳號權限與試算表格式是否包含【每週主題】。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-900 text-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">Google 試算表題庫資料庫</h3>
              <p className="text-xs text-stone-400">
                以 Google Sheet 作為無伺服器後台，隨時更新聚會題目
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Status Banner */}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Linked Sheet Info */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-xs font-bold text-stone-900 truncate">
                  {linkedInfo?.title || '尚未連結 Google 試算表'}
                </span>
              </div>

              {linkedInfo?.url && (
                <a
                  href={linkedInfo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 shrink-0"
                >
                  <span>開啟試算表</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed">
              資料庫架構：分頁一【每週主題】（記錄日期、信息名稱、經文、講員）、分頁二【題庫明細】（四階段討論題目）。
            </p>

            <button
              type="button"
              onClick={() => handleSyncDatabase()}
              disabled={isLoading || (!linkedInfo && !inputUrl.trim())}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在連線 Google 試算表讀取中...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>立即從 Google 試算表同步題庫</span>
                </>
              )}
            </button>
          </div>

          {/* Connect / Change Spreadsheet URL */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-stone-500" />
              <span>設定或變更試算表網址：</span>
            </label>
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-stone-800"
            />
            <p className="text-[11px] text-stone-400">
              貼上您建立的 Google 試算表網址或 ID，點擊同步後即可將 App 題目資料與其即時連動。
            </p>
          </div>

          {/* Footer Action */}
          <div className="pt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition"
            >
              關閉視窗
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
