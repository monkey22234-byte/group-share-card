import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { QuestionCard, QuestionStage, WeeklyTopic, ActionCommitment } from '../types';

// Reuse existing Firebase app instance
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory (never localStorage per security rules)
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

/**
 * Initialize auth state listener. Call this on app load.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Trigger popup Google Sign-In with Sheets & Drive scopes.
 * Must be called from a user interaction (button click).
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('未取得 Google 存取金鑰，請重新登入授權。');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export interface LinkedSpreadsheetInfo {
  id: string;
  url: string;
  title: string;
  lastUpdated?: number;
}

const LINKED_SHEET_KEY = 'group_deck_linked_sheet';

export function getLinkedSpreadsheetInfo(): LinkedSpreadsheetInfo | null {
  try {
    const raw = localStorage.getItem(LINKED_SHEET_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse linked sheet info:', e);
  }
  return null;
}

export function setLinkedSpreadsheetInfo(info: LinkedSpreadsheetInfo | null) {
  try {
    if (info) {
      localStorage.setItem(LINKED_SHEET_KEY, JSON.stringify(info));
    } else {
      localStorage.removeItem(LINKED_SHEET_KEY);
    }
  } catch (e) {
    console.warn('Failed to save linked sheet info:', e);
  }
}

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentGoogleUser = (): User | null => {
  return cachedUser;
};

export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedUser = null;
};

/**
 * Helper to extract spreadsheet ID from either a raw ID or full Google Sheet URL
 */
export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Parse stage name in Chinese or English
 */
function mapStageName(rawStage: string): QuestionStage {
  const s = rawStage.trim().toLowerCase();
  if (s.includes('破冰') || s.includes('ice')) return 'icebreaker';
  if (s.includes('回顧') || s.includes('review') || s.includes('選擇')) return 'review';
  if (s.includes('思想') || s.includes('反思') || s.includes('reflection') || s.includes('why')) return 'reflection';
  if (s.includes('應用') || s.includes('行動') || s.includes('application') || s.includes('how')) return 'application';
  return 'reflection';
}

/**
 * Create a new Google Spreadsheet directly in the user's Google Drive with formatted headers and sample questions
 */
export async function createGroupQuestionsSpreadsheet(
  customTitle?: string
): Promise<{ id: string; url: string; title: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('尚未登入 Google 帳號，請先點擊「登入 Google 授權」。');
  }

  const title = customTitle?.trim() || `小組每週分享題庫範本 - ${new Date().toLocaleDateString('zh-TW')}`;

  // 1. Create the new Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: '本週題目',
            gridProperties: {
              frozenRowCount: 1,
              columnCount: 10,
              rowCount: 30,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `建立 Google 試算表失敗 (${createRes.status})`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const sheetId = sheetData.sheets?.[0]?.properties?.sheetId || 0;

  // 2. Populate initial rows with headers & structured sample questions
  const initialValues = [
    ['階段', '小標題', '題目本文', '提示/解析', '選項A', '選項B', '選項C', '選項D', '正確答案(0-3)', '經文出處'],
    ['破冰', '近況暖身', '這週生活中有哪件事讓你最感恩或感到喜樂？', '引導每位組員輪流發言約1~2分鐘', '', '', '', '', '', ''],
    ['破冰', '心情量度', '若用一種天氣形容你這週的心情狀態，會是什麼？為什麼？', '輕鬆分享，營造安全溫暖的分享氛圍', '', '', '', '', '', ''],
    ['回顧', '經文複習', '本週信息中，耶穌在哪裡平息暴風雨？', '馬可福音第4章核心信息', '加利利海', '地中海', '紅海', '死海', '0', '可 4:35-41'],
    ['回顧', '門徒反應', '當暴風狂浪拍打船隻時，耶穌正在船尾做什麼？', '信息第一點回顧', '划船', '睡覺', '禱告', '呼求', '1', '可 4:38'],
    ['思想', '信心省察', '當生活中突然面臨突發狀況或風浪時，你第一時間的本能反應通常是什麼？', '連結生活或職場中的具體經歷，引導深入反思', '', '', '', '', '', '可 4:40'],
    ['思想', '經歷同在', '在過去的經歷中，上帝曾如何帶領你走過看似不可能平息的風暴？', '數算恩典，彼此堅固信心', '', '', '', '', '', '詩 46:1'],
    ['應用', '本週行動', '這週你決定把心中哪一件最掛慮或放不下的事交託給主？', '寫下具體每日禱告與放手的操練行動', '', '', '', '', '', '腓 4:6-7'],
    ['應用', '肢體關懷', '本週你渴望主動關心、代禱或祝福哪一位小組員或身邊的朋友？', '在週五前發出問候訊息或相約喝咖啡', '', '', '', '', '', '帖前 5:11'],
  ];

  const valueRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:J9?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: initialValues,
      }),
    }
  );

  if (!valueRes.ok) {
    console.warn('Values insert warning:', await valueRes.text());
  }

  // 3. Format header row with emerald background, bold white text, and optimal column widths
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          // Header formatting
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 10,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.05, green: 0.38, blue: 0.25 }, // Dark Emerald
                  horizontalAlignment: 'CENTER',
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                    fontSize: 11,
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
          // Auto resize / set column dimensions
          {
            updateDimensionProperties: {
              range: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 1,
              },
              properties: { pixelSize: 70 }, // 階段
              fields: 'pixelSize',
            },
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex: 1,
                endIndex: 2,
              },
              properties: { pixelSize: 110 }, // 小標題
              fields: 'pixelSize',
            },
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex: 2,
                endIndex: 3,
              },
              properties: { pixelSize: 320 }, // 題目本文
              fields: 'pixelSize',
            },
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex: 3,
                endIndex: 4,
              },
              properties: { pixelSize: 220 }, // 提示/解析
              fields: 'pixelSize',
            },
          },
        ],
      }),
    });
  } catch (fmtErr) {
    console.warn('Styling format non-fatal error:', fmtErr);
  }

  const resultInfo = {
    id: spreadsheetId,
    url: spreadsheetUrl,
    title,
  };

  setLinkedSpreadsheetInfo({
    id: spreadsheetId,
    url: spreadsheetUrl,
    title,
    lastUpdated: Date.now(),
  });

  return resultInfo;
}

/**
 * Fetch rows from an existing Google Spreadsheet directly using Google Sheets REST API
 */
export async function fetchQuestionsFromGoogleSheet(
  spreadsheetIdOrUrl: string
): Promise<{ title: string; cards: QuestionCard[] }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('尚未登入 Google 帳號，請先授權存取 Google 試算表。');
  }

  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  if (!spreadsheetId) {
    throw new Error('無效的 Google 試算表網址或 ID');
  }

  // 1. Get spreadsheet metadata to know the first tab name
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `無法讀取此 Google 試算表 (${metaRes.status})，請確認檔案共用權限。`);
  }

  const metaData = await metaRes.json();
  const title = metaData.properties?.title || 'Google 試算表題庫';
  const firstSheetTitle = metaData.sheets?.[0]?.properties?.title || 'Sheet1';

  // 2. Fetch cell values from the first tab
  const range = `'${firstSheetTitle}'!A1:J100`;
  const valuesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!valuesRes.ok) {
    const err = await valuesRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || '讀取試算表儲存格資料失敗');
  }

  const valuesData = await valuesRes.json();
  const rows: string[][] = valuesData.values || [];

  if (rows.length <= 1) {
    throw new Error('試算表中沒有足夠的題目列（至少需有第 1 列標題與後續題目）');
  }

  const cards: QuestionCard[] = [];

  rows.forEach((cols, idx) => {
    // Skip header row
    if (idx === 0) return;
    if (!cols || cols.length < 3) return;

    const rawStage = cols[0] || 'reflection';
    const subTitle = cols[1]?.trim() || `第 ${cards.length + 1} 題`;
    const question = cols[2]?.trim() || '';
    const hint = cols[3]?.trim() || undefined;

    const optA = cols[4]?.trim();
    const optB = cols[5]?.trim();
    const optC = cols[6]?.trim();
    const optD = cols[7]?.trim();
    const rawCorrect = cols[8]?.trim();
    const scriptureRef = cols[9]?.trim();

    const options: string[] = [];
    if (optA) options.push(`A. ${optA}`);
    if (optB) options.push(`B. ${optB}`);
    if (optC) options.push(`C. ${optC}`);
    if (optD) options.push(`D. ${optD}`);

    let correctIndex = undefined;
    if (rawCorrect !== undefined && rawCorrect !== '') {
      const parsedIdx = parseInt(rawCorrect, 10);
      if (!isNaN(parsedIdx) && parsedIdx >= 0 && parsedIdx <= 3) {
        correctIndex = parsedIdx;
      } else {
        const letter = rawCorrect.toUpperCase();
        if (letter === 'A') correctIndex = 0;
        if (letter === 'B') correctIndex = 1;
        if (letter === 'C') correctIndex = 2;
        if (letter === 'D') correctIndex = 3;
      }
    }

    if (question) {
      const stage = mapStageName(rawStage);
      cards.push({
        id: `q-gsheet-${Date.now()}-${cards.length}`,
        stage,
        title: subTitle,
        question,
        hint,
        options: options.length > 0 ? options : undefined,
        correctAnswerIndex: correctIndex,
        explanation: hint,
        scriptureReference: scriptureRef,
        timeSuggestionMinutes: stage === 'review' ? 2 : 3,
      });
    }
  });

  if (cards.length === 0) {
    throw new Error('未能從試算表中解析出題目，請確認欄位格式：階段、小標題、題目本文...');
  }

  setLinkedSpreadsheetInfo({
    id: spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    title,
    lastUpdated: Date.now(),
  });

  return { title, cards };
}

/**
 * Fetch Architecture A database from Google Sheet:
 * Reads "每週主題" tab and "題庫明細" tab, returning a complete WeeklyTopic[] list.
 */
export async function fetchDatabaseFromGoogleSheet(
  spreadsheetIdOrUrl: string
): Promise<{ title: string; topics: WeeklyTopic[] }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('尚未登入 Google 帳號，請先授權存取 Google 試算表。');
  }

  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  if (!spreadsheetId) {
    throw new Error('無效的 Google 試算表網址或 ID');
  }

  // 1. Fetch spreadsheet metadata to check available tabs
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `無法讀取此 Google 試算表 (${metaRes.status})，請確認檔案共用權限。`);
  }

  const metaData = await metaRes.json();
  const spreadsheetTitle = metaData.properties?.title || '小組題庫資料庫';
  const sheetList: string[] = (metaData.sheets || []).map((s: any) => s.properties?.title || '');

  // Locate "每週主題" and "題庫明細" tabs
  const topicTabName = sheetList.find((name) => name.includes('主題') || name.includes('Topic')) || sheetList[0] || '每週主題';
  const detailTabName = sheetList.find((name) => name.includes('題庫') || name.includes('明細') || name.includes('Question'));

  // 2. Fetch "每週主題" rows
  const topicRange = `'${topicTabName}'!A1:F100`;
  const topicRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(topicRange)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!topicRes.ok) {
    const err = await topicRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `讀取【${topicTabName}】工作表資料失敗`);
  }

  const topicValuesData = await topicRes.json();
  const topicRows: string[][] = topicValuesData.values || [];

  if (topicRows.length <= 1) {
    throw new Error(`【${topicTabName}】分頁中沒有足夠的資料列（需有標題與主題資料）`);
  }

  // 3. Fetch "題庫明細" rows if present
  let questionRows: string[][] = [];
  if (detailTabName) {
    try {
      const detailRange = `'${detailTabName}'!A1:K300`;
      const detailRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(detailRange)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        questionRows = detailData.values || [];
      }
    } catch (qErr) {
      console.warn('Could not read question detail tab:', qErr);
    }
  }

  // Parse questions by topicId
  const questionsByTopic: Record<string, QuestionCard[]> = {};
  if (questionRows.length > 1) {
    questionRows.forEach((cols, qIdx) => {
      if (qIdx === 0) return; // Skip header
      if (!cols || cols.length < 3) return;

      const topicId = cols[0]?.trim();
      const rawStage = cols[1]?.trim() || 'reflection';
      const questionText = cols[2]?.trim() || '';
      const subTitle = cols[3]?.trim() || `討論題目 ${qIdx}`;
      const hint = cols[4]?.trim() || undefined;
      const scriptureRef = cols[5]?.trim() || undefined;

      const optA = cols[6]?.trim();
      const optB = cols[7]?.trim();
      const optC = cols[8]?.trim();
      const optD = cols[9]?.trim();
      const rawCorrect = cols[10]?.trim();

      const options: string[] = [];
      if (optA) options.push(`A. ${optA}`);
      if (optB) options.push(`B. ${optB}`);
      if (optC) options.push(`C. ${optC}`);
      if (optD) options.push(`D. ${optD}`);

      let correctIndex = undefined;
      if (rawCorrect !== undefined && rawCorrect !== '') {
        const parsedIdx = parseInt(rawCorrect, 10);
        if (!isNaN(parsedIdx) && parsedIdx >= 0 && parsedIdx <= 3) {
          correctIndex = parsedIdx;
        } else {
          const letter = rawCorrect.toUpperCase();
          if (letter === 'A') correctIndex = 0;
          if (letter === 'B') correctIndex = 1;
          if (letter === 'C') correctIndex = 2;
          if (letter === 'D') correctIndex = 3;
        }
      }

      if (topicId && questionText) {
        if (!questionsByTopic[topicId]) {
          questionsByTopic[topicId] = [];
        }
        const stage = mapStageName(rawStage);
        questionsByTopic[topicId].push({
          id: `q-${topicId}-${qIdx}`,
          stage,
          title: subTitle,
          question: questionText,
          hint,
          options: options.length > 0 ? options : undefined,
          correctAnswerIndex: correctIndex,
          explanation: hint,
          scriptureReference: scriptureRef,
          timeSuggestionMinutes: stage === 'review' ? 2 : 3,
        });
      }
    });
  }

  // Parse topics
  const parsedTopics: WeeklyTopic[] = [];

  topicRows.forEach((cols, idx) => {
    if (idx === 0) return; // Skip header
    if (!cols || cols.length < 3) return;

    const topicId = cols[0]?.trim() || `topic-${idx}`;
    const date = cols[1]?.trim() || new Date().toISOString().split('T')[0];
    const rawTitle = cols[2]?.trim() || `第 ${idx} 週信息`;
    const scripture = cols[3]?.trim() || '聖經';
    const speaker = cols[4]?.trim() || '';
    const summary = cols[5]?.trim() || '';

    // Title format
    const displayTitle = rawTitle.includes('：') || rawTitle.includes(' ')
      ? rawTitle
      : `${date.slice(5).replace('-', '/')} ${rawTitle}`;

    // Get questions for this topic or create default 4-stage questions from topic info
    let questions = questionsByTopic[topicId] || [];

    if (questions.length === 0) {
      questions = [
        {
          id: `q-${topicId}-ice-1`,
          stage: 'icebreaker',
          title: '生活近況暖身',
          question: `這週生活中有沒有任何讓你印象深刻、感到感恩或有趣的小插曲？`,
          subtitle: '輕鬆開場，彼此敞開交流',
          timeSuggestionMinutes: 2,
        },
        {
          id: `q-${topicId}-rev-1`,
          stage: 'review',
          title: '【信息回顧】本週主要經文',
          question: `本週信息經文為【${scripture}】，核心信息摘要：「${summary || '對準神的心意活出命定'}」，你印象最深刻的一個詞句是什麼？`,
          subtitle: '回顧真理重點',
          scriptureReference: scripture,
          timeSuggestionMinutes: 2,
        },
        {
          id: `q-${topicId}-ref-1`,
          stage: 'reflection',
          title: '省察與心靈共鳴',
          question: `針對本週主題「${rawTitle}」，在你的日常工作、家庭或人際關係中，神透過這篇信息光照了你哪一個領域？`,
          subtitle: '深入思想，連結生命真實光景',
          timeSuggestionMinutes: 4,
        },
        {
          id: `q-${topicId}-app-1`,
          stage: 'application',
          title: '本週微小行動承諾',
          question: `這週你決定採取哪一個具體微小的行動，來回應「${rawTitle}」這份信息？`,
          subtitle: '在下方輸入行動方案，小組長將一鍵記錄至試算表！',
          timeSuggestionMinutes: 3,
        },
      ];
    }

    parsedTopics.push({
      id: topicId,
      title: displayTitle,
      date,
      category: 'sermon',
      speaker,
      mainScripture: scripture,
      summary,
      keyPoints: summary ? [summary] : ['活出神的心意'],
      questions,
    });
  });

  if (parsedTopics.length === 0) {
    throw new Error('未能從【每週主題】分頁中解析出主題資料');
  }

  // Save linked spreadsheet
  setLinkedSpreadsheetInfo({
    id: spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    title: spreadsheetTitle,
    lastUpdated: Date.now(),
  });

  return { title: spreadsheetTitle, topics: parsedTopics };
}

/**
 * Export current group action commitments to the linked Google Spreadsheet
 * into a dedicated tab named "行動方案與追蹤記錄", ensuring long-term tracking.
 */
export async function exportActionPlansToGoogleSheet(
  spreadsheetIdOrUrl: string,
  topic: WeeklyTopic,
  actions: ActionCommitment[]
): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  addedCount: number;
  sheetTabTitle: string;
}> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('尚未登入 Google 帳號，請先登入以取得試算表寫入授權。');
  }

  if (!actions || actions.length === 0) {
    throw new Error('目前沒有任何行動方案可匯出，請先新增至少一筆行動方案。');
  }

  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  if (!spreadsheetId) {
    throw new Error('無效的 Google 試算表網址或 ID');
  }

  const sheetTabTitle = '行動方案與追蹤記錄';

  // 1. Fetch spreadsheet metadata to check if the tab exists
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || `無法讀取 Google 試算表 (${metaRes.status})，請確認您擁有該檔案之編輯權限。`
    );
  }

  const metaData = await metaRes.json();
  const spreadsheetTitle = metaData.properties?.title || '小組分享題庫';
  const existingTab = metaData.sheets?.find(
    (s: any) => s.properties?.title === sheetTabTitle
  );

  // 2. If the tab does not exist yet, create it and format the header row
  if (!existingTab) {
    const addSheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetTabTitle,
                  gridProperties: {
                    frozenRowCount: 1,
                    columnCount: 8,
                    rowCount: 100,
                  },
                  tabColor: { red: 0.05, green: 0.45, blue: 0.3 },
                },
              },
            },
          ],
        }),
      }
    );

    if (!addSheetRes.ok) {
      const err = await addSheetRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || '建立「行動方案與追蹤記錄」分頁失敗');
    }

    const addSheetData = await addSheetRes.json();
    const newSheetId = addSheetData.replies?.[0]?.addSheet?.properties?.sheetId || 0;

    // Header values
    const headerValues = [
      ['記錄時間', '主題名稱', '主要經文', '組員姓名', '具體行動方案', '目標完成時間', '代禱事項', '執行進度/狀態'],
    ];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(
        sheetTabTitle
      )}'!A1:H1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: headerValues }),
      }
    );

    // Format header style & column widths
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: newSheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 8,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.05, green: 0.38, blue: 0.25 }, // Deep Emerald
                    horizontalAlignment: 'CENTER',
                    textFormat: {
                      foregroundColor: { red: 1, green: 1, blue: 1 },
                      bold: true,
                      fontSize: 11,
                    },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
              },
            },
            {
              updateDimensionProperties: {
                range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
                properties: { pixelSize: 140 }, // 記錄時間
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 },
                properties: { pixelSize: 180 }, // 主題名稱
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 },
                properties: { pixelSize: 130 }, // 主要經文
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 },
                properties: { pixelSize: 100 }, // 組員姓名
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 },
                properties: { pixelSize: 320 }, // 具體行動方案
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 5, endIndex: 6 },
                properties: { pixelSize: 120 }, // 目標完成時間
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 6, endIndex: 7 },
                properties: { pixelSize: 220 }, // 代禱事項
                fields: 'pixelSize',
              },
            },
            {
              updateDimensionProperties: {
                range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 7, endIndex: 8 },
                properties: { pixelSize: 110 }, // 執行進度
                fields: 'pixelSize',
              },
            },
          ],
        }),
      });
    } catch (fmtErr) {
      console.warn('Header formatting error:', fmtErr);
    }
  }

  // 3. Prepare row values to append
  const nowFormatted = new Date().toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const rowsToAppend = actions.map((act) => [
    nowFormatted,
    topic.title,
    topic.mainScripture || '生活應用',
    act.memberName,
    act.actionText,
    act.targetDate || '本週完成',
    act.prayerNeeds || '無特別事項',
    act.isCompleted ? '已落實' : '進行中 / 代禱守望',
  ]);

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(
      sheetTabTitle
    )}'!A:H:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `'${sheetTabTitle}'!A:H`,
        majorDimension: 'ROWS',
        values: rowsToAppend,
      }),
    }
  );

  if (!appendRes.ok) {
    const err = await appendRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `儲存行動方案到試算表失敗 (${appendRes.status})`);
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Update linked spreadsheet cache
  setLinkedSpreadsheetInfo({
    id: spreadsheetId,
    url: spreadsheetUrl,
    title: spreadsheetTitle,
    lastUpdated: Date.now(),
  });

  return {
    spreadsheetId,
    spreadsheetUrl,
    spreadsheetTitle,
    addedCount: actions.length,
    sheetTabTitle,
  };
}
