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
  Database,
  Clipboard,
  Sparkles,
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { WeeklyTopic } from '../types';
import { 
  fetchCSVFromUrl, 
  parseTopicsFromCSV, 
  syncTopicsFromCSV, 
  syncGoogleSheetWithTabs,
  normalizeGoogleSheetCSVUrl,
  extractGidFromUrl,
  correlateTopicsAndQuestions,
  CSV_STORAGE_KEYS,
  SAMPLE_ROW_BASED_CSV_TEMPLATE,
  SAMPLE_TOPICS_CSV_TEMPLATE
} from '../services/csvTopicService';
import { seedCloudTopics } from '../services/firebaseSync';

interface GoogleSheetDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTopicsUpdated: (newTopics: WeeklyTopic[]) => void;
  existingTopics?: WeeklyTopic[];
}

export const GoogleSheetDatabaseModal: React.FC<GoogleSheetDatabaseModalProps> = ({
  isOpen,
  onClose,
  onTopicsUpdated,
  existingTopics,
}) => {
  // Questions tab (題庫明細)
  const [questionsUrl, setQuestionsUrl] = useState(() => {
    return localStorage.getItem(CSV_STORAGE_KEYS.QUESTIONS_URL) || 
           localStorage.getItem(CSV_STORAGE_KEYS.CSV_URL) || '';
  });
  const [questionsGid, setQuestionsGid] = useState(() => {
    return localStorage.getItem(CSV_STORAGE_KEYS.QUESTIONS_GID) || '';
  });

  // Topics tab (每週主題)
  const [syncTopicsTab, setSyncTopicsTab] = useState(true);
  const [topicsUrl, setTopicsUrl] = useState(() => {
    return localStorage.getItem(CSV_STORAGE_KEYS.TOPICS_URL) || '';
  });
  const [topicsGid, setTopicsGid] = useState(() => {
    return localStorage.getItem(CSV_STORAGE_KEYS.TOPICS_GID) || '0';
  });

  const [lastSyncTime, setLastSyncTime] = useState<number | null>(() => {
    const raw = localStorage.getItem(CSV_STORAGE_KEYS.LAST_SYNC_TIME);
    return raw ? parseInt(raw, 10) : null;
  });

  const [activeTab, setActiveTab] = useState<'url' | 'paste'>('url');
  const [pastedCsv, setPastedCsv] = useState(SAMPLE_ROW_BASED_CSV_TEMPLATE);
  const [pasteType, setPasteType] = useState<'questions' | 'topics'>('questions');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAdvancedGid, setShowAdvancedGid] = useState(false);

  useEffect(() => {
    const savedQ = localStorage.getItem(CSV_STORAGE_KEYS.QUESTIONS_URL) || 
                   localStorage.getItem(CSV_STORAGE_KEYS.CSV_URL);
    if (savedQ) {
      setQuestionsUrl(savedQ);
      const extractedQ = extractGidFromUrl(savedQ);
      const savedQGid = localStorage.getItem(CSV_STORAGE_KEYS.QUESTIONS_GID);
      if (savedQGid) {
        setQuestionsGid(savedQGid);
      } else if (extractedQ) {
        setQuestionsGid(extractedQ);
      }
    }

    const savedT = localStorage.getItem(CSV_STORAGE_KEYS.TOPICS_URL);
    if (savedT) {
      setTopicsUrl(savedT);
      const extractedT = extractGidFromUrl(savedT);
      const savedTGid = localStorage.getItem(CSV_STORAGE_KEYS.TOPICS_GID);
      if (savedTGid) {
        setTopicsGid(savedTGid);
      } else if (extractedT) {
        setTopicsGid(extractedT);
      }
    }

    const savedSyncTab = localStorage.getItem(CSV_STORAGE_KEYS.SYNC_TOPICS_TAB);
    if (savedSyncTab !== null) {
      setSyncTopicsTab(savedSyncTab !== 'false');
    }
  }, [isOpen]);

  // Persist settings to localStorage on any change
  useEffect(() => {
    try {
      if (questionsUrl.trim()) {
        localStorage.setItem(CSV_STORAGE_KEYS.QUESTIONS_URL, questionsUrl.trim());
        localStorage.setItem(CSV_STORAGE_KEYS.CSV_URL, questionsUrl.trim());
      }
      if (questionsGid.trim()) {
        localStorage.setItem(CSV_STORAGE_KEYS.QUESTIONS_GID, questionsGid.trim());
      }
      if (topicsUrl.trim()) {
        localStorage.setItem(CSV_STORAGE_KEYS.TOPICS_URL, topicsUrl.trim());
      }
      if (topicsGid.trim()) {
        localStorage.setItem(CSV_STORAGE_KEYS.TOPICS_GID, topicsGid.trim());
      }
      localStorage.setItem(CSV_STORAGE_KEYS.SYNC_TOPICS_TAB, String(syncTopicsTab));
    } catch {}
  }, [questionsUrl, questionsGid, topicsUrl, topicsGid, syncTopicsTab]);

  // When user pastes/types in questionsUrl, auto-detect gid if present
  const handleQuestionsUrlChange = (val: string) => {
    setQuestionsUrl(val);
    const extracted = extractGidFromUrl(val);
    if (extracted && !questionsGid) {
      setQuestionsGid(extracted);
    }
    try {
      localStorage.setItem(CSV_STORAGE_KEYS.QUESTIONS_URL, val.trim());
      localStorage.setItem(CSV_STORAGE_KEYS.CSV_URL, val.trim());
    } catch {}
  };

  const handleTopicsUrlChange = (val: string) => {
    setTopicsUrl(val);
    const extracted = extractGidFromUrl(val);
    if (extracted) {
      setTopicsGid(extracted);
    }
    try {
      localStorage.setItem(CSV_STORAGE_KEYS.TOPICS_URL, val.trim());
    } catch {}
  };

  if (!isOpen) return null;

  const handleSyncFromUrl = async () => {
    const targetQuestionsUrl = questionsUrl.trim();
    if (!targetQuestionsUrl) {
      setErrorMsg('請輸入「題庫明細」分頁的 Google 試算表 CSV 連結或網址');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const result = await syncGoogleSheetWithTabs({
        questionsUrl: targetQuestionsUrl,
        questionsGid: questionsGid.trim() || undefined,
        topicsUrl: topicsUrl.trim() || undefined,
        topicsGid: topicsGid.trim() || undefined,
        syncTopicsTab,
        existingTopics,
      });

      const { topics: updatedTopics, totalQuestions, topicsCount } = result;

      // Update state in parent
      onTopicsUpdated(updatedTopics);

      const now = Date.now();
      setLastSyncTime(now);

      const topicIds = updatedTopics.map((t) => t.id).slice(0, 4).join('、');
      const moreText = updatedTopics.length > 4 ? ` 等 ${updatedTopics.length} 個主題` : '';
      setSuccessMsg(
        `同步成功！已成功關聯 ${topicsCount} 個主題（${topicIds}${moreText}），共匯入 ${totalQuestions} 道題目卡片（包含破冰、回顧選擇題、思想討論、生活應用），並已更新至雲端即時資料庫！`
      );
    } catch (err: any) {
      console.error('CSV Multi-tab Sync error:', err);
      setErrorMsg(err.message || '連線讀取試算表失敗，請確認該試算表已「發布至網路」為 CSV 格式。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPastedCsv = async () => {
    if (!pastedCsv.trim()) {
      setErrorMsg('請先輸入或貼上 CSV 內容');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let parsedTopics: WeeklyTopic[] = [];

      if (pasteType === 'questions') {
        parsedTopics = parseTopicsFromCSV(pastedCsv.trim(), existingTopics);
      } else {
        parsedTopics = parseTopicsFromCSV(pastedCsv.trim(), existingTopics);
      }

      if (parsedTopics.length === 0) {
        throw new Error('未發現有效資料，請確認包含對應欄位（所屬主題ID或主題ID）');
      }

      await seedCloudTopics(parsedTopics);

      const now = Date.now();
      localStorage.setItem(CSV_STORAGE_KEYS.LAST_SYNC_TIME, String(now));
      setLastSyncTime(now);

      onTopicsUpdated(parsedTopics);
      const totalQ = parsedTopics.reduce((acc, t) => acc + t.questions.length, 0);
      setSuccessMsg(
        `已成功從貼上的 CSV 匯入 ${parsedTopics.length} 個主題（共 ${totalQ} 道題目卡片），並更新至雲端資料庫！`
      );
    } catch (err: any) {
      setErrorMsg(err.message || '解析 CSV 失敗');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-900 text-stone-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">Google 試算表雙分頁 CSV 動態連動</h3>
              <p className="text-xs text-stone-400">
                支援『每週主題』與『題庫明細』雙分頁自動關聯主題 ID 與 4 大階段題型
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

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-200 bg-stone-50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'url'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>動態試算表網址連線（雙分頁/gid）</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'paste'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            <span>直接貼上 CSV 文本</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Status Banners */}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {activeTab === 'url' ? (
            <div className="space-y-4">
              {/* Field 1: Questions Tab (題庫明細) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                    <span>分頁 2：「題庫明細」CSV 網址或含 gid 連結（必填）：</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTutorial(!showTutorial)}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>如何取得分頁 gid 連結？</span>
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/.../pub?gid=...&output=csv 或 .../edit#gid=..."
                  value={questionsUrl}
                  onChange={(e) => handleQuestionsUrlChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-stone-800 bg-stone-50 focus:bg-white"
                />
                <p className="text-[11px] text-stone-500">
                  包含欄位：<b>所屬主題ID, 階段, 題目本文, 小標題, 引導提示, 經文出處, 選項A, 選項B, 選項C, 選項D, 正確答案</b>
                </p>
              </div>

              {/* Field 2: Topics Tab (每週主題) Toggle & Input */}
              <div className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/70 space-y-2.5">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={syncTopicsTab}
                      onChange={(e) => setSyncTopicsTab(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300"
                    />
                    <span className="text-xs font-bold text-stone-800">
                      同時連動分頁 1：「每週主題」
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                    自動關聯主題ID
                  </span>
                </label>

                {syncTopicsTab && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] text-stone-500">
                      若為同一份 Google 試算表的第一分頁（預設 gid=0），可直接留空；亦可貼上專屬發布 CSV 網址：
                    </p>
                    <input
                      type="text"
                      placeholder="留空將自動帶入第一分頁 (gid=0)，或填寫每週主題專屬發布 CSV 網址"
                      value={topicsUrl}
                      onChange={(e) => handleTopicsUrlChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-stone-800 bg-white"
                    />
                    <p className="text-[11px] text-stone-500">
                      包含欄位：<b>主題ID, 聚會日期, 主題名稱, 主要經文, 講員, 信息摘要</b>
                    </p>
                  </div>
                )}
              </div>

              {/* Advanced gid setting toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedGid(!showAdvancedGid)}
                  className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-1 font-semibold"
                >
                  {showAdvancedGid ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>進階分頁 gid 參數設定（選填）</span>
                </button>

                {showAdvancedGid && (
                  <div className="mt-2 grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-stone-100/70 border border-stone-200">
                    <div>
                      <label className="text-[10px] font-bold text-stone-600 block mb-1">
                        題庫明細 gid（例如 123456789）：
                      </label>
                      <input
                        type="text"
                        placeholder="選填，網址若已含可留空"
                        value={questionsGid}
                        onChange={(e) => setQuestionsGid(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 font-mono bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-600 block mb-1">
                        每週主題 gid（預設 0）：
                      </label>
                      <input
                        type="text"
                        placeholder="0"
                        value={topicsGid}
                        onChange={(e) => setTopicsGid(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 font-mono bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Tutorial Box */}
              {showTutorial && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-stone-800 text-xs space-y-2 animate-in fade-in duration-150">
                  <p className="font-bold text-amber-900">📌 如何取得分頁專屬的 CSV 發布網址或 gid：</p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-stone-700 leading-relaxed text-[11px]">
                    <li>
                      <strong>方式 A（直接貼上網址）：</strong>
                      切換到試算表的「題庫明細」分頁，直接複製瀏覽器上方網址列（例如結尾為 <code>...#gid=123456789</code>），系統會自動偵測並轉為 CSV。
                    </li>
                    <li>
                      <strong>方式 B（發布至網路）：</strong>
                      點擊左上角<strong>「檔案」→「共用」→「發布至網路」</strong>。在「發布內容」中選擇<strong>「題庫明細」分頁</strong>，格式選擇<strong>「逗號分隔值 (.csv)」</strong>，點擊發布並複製網址。
                    </li>
                    <li>
                      <strong>自動關聯：</strong>
                      程式會讀取每列的「所屬主題ID」（如 <code>2026-W35</code>、<code>2026-W36</code>），自動將破冰、回顧選擇題（帶入選項 A~D 及答案）、思想、應用卡片歸類到對應的主題週次中！
                    </li>
                  </ol>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800">100% 動態題目歸類規則：</span>
                  {lastSyncTime && (
                    <span className="text-[11px] text-stone-400">
                      上次同步：{new Date(lastSyncTime).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-[11px] text-stone-500">
                  <p>• <b>『破冰』</b> ➜ 破冰卡片（嚴格 1 題）</p>
                  <p>• <b>『回顧』</b> ➜ 回顧選擇題卡片（嚴格 5 題，帶入選項 A~D 及正確答案）</p>
                  <p>• <b>『思想』</b> ➜ 思想討論題卡片（嚴格 1 題）</p>
                  <p>• <b>『應用』</b> ➜ 應用行動題卡片（嚴格 1 題）</p>
                  <p>• <b>『所屬主題ID』</b> ➜ 自動對應到『每週主題』之主題ID，選取該週主題即刻呈現該週全部卡片！</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-emerald-900 bg-emerald-50/90 px-3.5 py-2.5 rounded-xl border border-emerald-200">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>已自動儲存至本機快取（localStorage）。重新開啟或重新整理網頁時，APP 將在背景自動讀取並 Fetch 同步，不需每次手動重新貼上！</span>
              </div>

              <button
                type="button"
                onClick={handleSyncFromUrl}
                disabled={isLoading || !questionsUrl.trim()}
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>正在連動讀取雙分頁 CSV 並關聯主題...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>立即動態連動同步 Google 試算表</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setPasteType('questions');
                      setPastedCsv(SAMPLE_ROW_BASED_CSV_TEMPLATE);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      pasteType === 'questions'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    題庫明細 CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPasteType('topics');
                      setPastedCsv(SAMPLE_TOPICS_CSV_TEMPLATE);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      pasteType === 'topics'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    每週主題 CSV
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPastedCsv(
                      pasteType === 'questions'
                        ? SAMPLE_ROW_BASED_CSV_TEMPLATE
                        : SAMPLE_TOPICS_CSV_TEMPLATE
                    );
                  }}
                  className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>重設範本</span>
                </button>
              </div>

              <textarea
                rows={9}
                value={pastedCsv}
                onChange={(e) => setPastedCsv(e.target.value)}
                placeholder={
                  pasteType === 'questions'
                    ? '所屬主題ID, 階段, 題目本文, 小標題, 引導提示, 經文出處, 選項A, 選項B, 選項C, 選項D, 正確答案...'
                    : '主題ID, 聚會日期, 主題名稱, 主要經文, 講員, 信息摘要...'
                }
                className="w-full p-3 text-xs font-mono rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-800 bg-stone-50 focus:bg-white resize-y leading-relaxed"
              />

              <button
                type="button"
                onClick={handleApplyPastedCsv}
                disabled={isLoading || !pastedCsv.trim()}
                className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>正在解析並寫入雲端資料庫...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>解析並套用此 CSV 至資料庫</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-stone-400">
            即時雲端同步：Firebase Firestore topics 集合
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-200 transition cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};


