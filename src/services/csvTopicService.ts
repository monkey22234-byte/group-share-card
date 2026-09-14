import { WeeklyTopic, QuestionCard, QuestionStage } from '../types';
import { sanitizeWeeklyTopic, seedCloudTopics } from './firebaseSync';

export const CSV_STORAGE_KEYS = {
  CSV_URL: 'smallgroup_csv_url_v1',
  QUESTIONS_URL: 'smallgroup_csv_questions_url_v2',
  QUESTIONS_GID: 'smallgroup_csv_questions_gid_v2',
  TOPICS_URL: 'smallgroup_csv_topics_url_v2',
  TOPICS_GID: 'smallgroup_csv_topics_gid_v2',
  SYNC_TOPICS_TAB: 'smallgroup_csv_sync_topics_tab_v2',
  LAST_SYNC_TIME: 'smallgroup_csv_last_sync_v1',
};

/**
 * Standard CSV Template: Row-Based Questions (題庫明細 - 每列一題)
 * Format: 所屬主題ID, 階段, 題目本文, 小標題, 引導提示, 經文出處, 選項A, 選項B, 選項C, 選項D, 正確答案
 * Strict card quantities:
 * - 破冰 1 題
 * - 回顧 5 題
 * - 思想 1 題
 * - 應用 1 題
 */
export const SAMPLE_ROW_BASED_CSV_TEMPLATE = `所屬主題ID, 階段, 題目本文, 小標題, 引導提示, 經文出處, 選項A, 選項B, 選項C, 選項D, 正確答案
2026-W35, 破冰, 最近生活中有什麼讓你感到平安或感恩的時刻？, 破冰分享, 請每位成員簡短輪流分享1分鐘, 帖撒羅尼迦前書 5:16-18, , , , , 
2026-W35, 回顧, 胡沁柔傳道分享在自責、羞愧等困境中，神給我們什麼信心命令？, 講道重點複習 1, 參考以賽亞書 54:2, 以賽亞書 54:2, 擴張帳幕，不要限止, 停留在原地自怨自艾, 逃避困難隨波逐流, 封閉自己與人隔離, A
2026-W35, 回顧, 信息中提到要深化與神的關係，堅固橛子的三圈模型不包含下列何者？, 講道重點複習 2, 三圈模型包含生活圈、關係圈與信仰圈, 以賽亞書 54:2, 生活圈, 關係圈, 商業投資圈, 信仰圈, C
2026-W35, 回顧, 根據以賽亞書 54:2，「要擴張你帳幕之地，張大你居所的幔子，不要_____」？, 經文填空 3, 請翻開以賽亞書 54:2, 以賽亞書 54:2, 驕傲, 限止, 憂慮, 害怕, B
2026-W35, 回顧, 在日常中自然流露福音，神要我們勇敢預備的是什麼？, 真理核心 4, 信心不是憑眼見, 以賽亞書 54:2, 信心的容器與舞台, 華麗的演講技巧, 大量的金錢物資, 完美的個人履歷, A
2026-W35, 回顧, 當我們身處困境或自覺不配時，信心的起點應當建立在哪裡？, 信心根基 5, 定睛在信實的神身上, 以弗所書 2:10, 自己的能力與表現, 別人的稱讚與肯定, 神信實的應許與恩典, 環境的順遂與順利, C
2026-W35, 思想, 在你的生活圈、關係圈、信仰圈中，你覺得目前哪一個最需要擴張與突破？, 真理思想, 敞開分享目前遇到的卡點與挑戰, 以賽亞書 54:2, , , , , 
2026-W35, 應用, 本週你願意在日常生活中踏出的第一個「堅固橛子、擴張帳幕」具體行動是什麼？, 生活實踐行動, 請寫下本週具體行動並打卡記錄, 雅各書 1:22, , , , , 
2026-W36, 破冰, 生命中是否有某次經歷，因為有特定某人的「親自陪伴」，讓困難的事情變得安心？, 暖身破冰, 輪流簡短分享, 出埃及記 33:14, , , , , 
2026-W36, 回顧, 摩西深知若沒有神的什麼，即便進了應許美地也毫無意義？, 講道重點 1, 出埃及記 33:15, 出埃及記 33:15, 神的同在, 豐富的金銀財寶, 強大的軍隊護送, 美麗的葡萄園, A
2026-W36, 回顧, 出埃及記 33:14 中，耶和華如何向摩西保證祂的帶領？, 應許回顧 2, 耶和華的親自同在帶來安息, 出埃及記 33:14, 我必賜你無數財寶, 我必親自和你同去，使你得安息, 我必免去你所有的征戰, 我必叫眾人懼怕你, B
2026-W36, 回顧, 摩西素常將帳棚支搭在營外，這帳棚被稱為什麼？, 經文考查 3, 凡求告耶和華的都到營外, 出埃及記 33:7, 避難所, 議事殿, 會幕, 守望樓, C
2026-W36, 回顧, 根據出埃及記 33:16，何事才能證明屬神的百姓與地上的萬民有分別？, 真理焦點 4, 唯有神的同行彰顯分別, 出埃及記 33:16, 百姓人數眾多, 祢與我們同去，使我們與萬民有分別, 擁有富饒的土地, 穿戴華麗的祭司袍, B
2026-W36, 回顧, 摩西在會幕中如何與耶和華說話？, 親密團契 5, 出埃及記 33:11, 出埃及記 33:11, 好像法官審問罪犯, 隔著厚帷子不敢發聲, 耶和華與摩西面對面說話，好像人與朋友說話一般, 透過占卜抽籤, C
2026-W36, 思想, 在日常繁雜的生活節奏中，有哪些事情最容易搶奪你安靜來到神面前的專注力？, 真理思想, 誠實省察心中的優先順序, 出埃及記 33:7, , , , , 
2026-W36, 應用, 本週你預備在日常生活中分別出一個怎樣的時間與地點「支搭會幕」，專心享受神同在？, 生活實踐行動, 請寫下本週專屬的親近神計畫, 出埃及記 33:7, , , , , `;

/**
 * Standard CSV Template: Weekly Topics (每週主題 - 第一分頁)
 * Format: 主題ID, 聚會日期, 主題名稱, 主要經文, 講員, 信息摘要
 */
export const SAMPLE_TOPICS_CSV_TEMPLATE = `主題ID, 聚會日期, 主題名稱, 主要經文, 講員, 信息摘要
2026-W35, 2026-08-30, 擴張帳幕，堅固橛子, 以賽亞書 54:2, 胡沁柔傳道, "在自責、羞愧等困境中，神吩咐我們要擴張帳幕、堅固橛子，勇敢跨出信仰與生活的舒適圈。"
2026-W36, 2026-09-06, 祂的同在才是一切的關鍵, 出埃及記 33:7-16, 莊嘉琳牧師, "摩西深知若無神的同在，即便進了應許美地也毫無意義；在日常荒野中支搭會幕，經歷面對面的親密安息。"`;

export const SAMPLE_CSV_TEMPLATE = SAMPLE_ROW_BASED_CSV_TEMPLATE;

/**
 * Robust CSV parser that handles quotes, escaped quotes, and commas within cells
 */
export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  // Normalize newlines
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  // Last row
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * Normalize text for relaxed column matching
 */
function cleanHeader(h: string): string {
  return (h || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-（）()【】\[\]"']/g, '');
}

/**
 * Exact-first header matcher with exclusions to prevent short patterns from falsely matching longer tokens
 */
export function findColumnIndex(
  headers: string[],
  exactCandidates: string[],
  partialCandidates: string[] = [],
  excludePatterns: string[] = []
): number {
  const cleanHeaders = headers.map(cleanHeader);

  // 1. Exact matches
  for (const cand of exactCandidates) {
    const cleanCand = cleanHeader(cand);
    const idx = cleanHeaders.findIndex((h) => h === cleanCand);
    if (idx !== -1) return idx;
  }

  // 2. Partial matches with exclusions
  for (const cand of partialCandidates) {
    const cleanCand = cleanHeader(cand);
    const idx = cleanHeaders.findIndex((h) => {
      if (excludePatterns.some((ex) => h.includes(cleanHeader(ex)))) return false;
      return h.includes(cleanCand);
    });
    if (idx !== -1) return idx;
  }

  return -1;
}

export function findHeaderIndex(
  headers: string[],
  exactCandidates: string[],
  partialCandidates: string[] = []
): number {
  return findColumnIndex(headers, exactCandidates, partialCandidates);
}

/**
 * Parse stage name to internal QuestionStage
 * 『破冰』 -> 破冰卡片 (icebreaker)
 * 『回顧』 -> 回顧選擇題卡片 (review)
 * 『思想』 -> 思想討論題卡片 (reflection)
 * 『應用』 -> 應用行動題卡片 (application)
 */
export function parseStageName(raw: string): QuestionStage | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s.includes('破冰') || s.includes('ice') || s === '1' || s.startsWith('1.')) {
    return 'icebreaker';
  }
  if (s.includes('回顧') || s.includes('review') || s.includes('what') || s.includes('選擇') || s === '2' || s.startsWith('2.')) {
    return 'review';
  }
  if (s.includes('思想') || s.includes('reflection') || s.includes('why') || s.includes('默想') || s === '3' || s.startsWith('3.')) {
    return 'reflection';
  }
  if (s.includes('應用') || s.includes('application') || s.includes('how') || s.includes('行動') || s.includes('實踐') || s === '4' || s.startsWith('4.')) {
    return 'application';
  }
  return null;
}

/**
 * Parse correct answer indicator (A/B/C/D, 1/2/3/4, or text match)
 */
function parseCorrectAnswer(ans: string, options: string[]): number | undefined {
  if (!ans) return undefined;
  const trimmed = ans.trim();
  // Strip parentheses and brackets
  const upper = trimmed.toUpperCase().replace(/[()（）\[\]【】\s.:、]/g, '');

  if (upper === 'A' || upper === '1' || upper === '甲' || upper === '0') return 0;
  if (upper === 'B' || upper === '2' || upper === '乙') return 1;
  if (upper === 'C' || upper === '3' || upper === '丙') return 2;
  if (upper === 'D' || upper === '4' || upper === '丁') return 3;

  const idx = options.findIndex((opt) => {
    const cleanOpt = opt.replace(/^[A-D1-4甲乙丙丁][.、:\s]+/i, '').trim();
    return cleanOpt === trimmed || opt === trimmed || cleanOpt.includes(trimmed) || trimmed.includes(cleanOpt);
  });
  if (idx !== -1) return idx;

  return undefined;
}

/**
 * Approximate Sunday date from week ID (e.g. 2026-W35 -> 2026-08-30)
 */
function deriveDateFromWeekId(id: string): string {
  const match = id.match(/(\d{4})-W(\d{1,2})/i);
  if (!match) return '';
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  } else {
    ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  }
  const sunday = new Date(ISOweekStart);
  sunday.setUTCDate(ISOweekStart.getUTCDate() + 6);
  const yyyy = sunday.getUTCFullYear();
  const mm = String(sunday.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(sunday.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Retrieve any locally saved topics as baseline for metadata preservation
 */
function getStoredTopics(): WeeklyTopic[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('smallgroup_topics_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Parse single-cell options string if options are combined in one column
 * e.g. "A. xxx \n B. yyy \n C. zzz \n D. www" or "xxx | yyy | zzz | www"
 */
function splitOptionsString(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  const text = raw.trim();

  // If separated by newline
  if (text.includes('\n')) {
    return text
      .split('\n')
      .map((s) => s.trim().replace(/^[A-D1-4甲乙丙丁][.、:\s]+/i, ''))
      .filter((s) => s.length > 0);
  }

  // If separated by pipe or slash
  if (text.includes('|') || text.includes('／')) {
    return text
      .split(/[|／]/)
      .map((s) => s.trim().replace(/^[A-D1-4甲乙丙丁][.、:\s]+/i, ''))
      .filter((s) => s.length > 0);
  }

  // If regex matches A. ... B. ...
  const parts = text.split(/(?=[A-D][.、\s])/i).map((s) => s.trim().replace(/^[A-D][.、\s]*/i, '')).filter(Boolean);
  if (parts.length >= 2) {
    return parts;
  }

  return [text];
}

/**
 * Helper to find column index with multiple candidates
 */
function findColIdx(headers: string[], patterns: (string | RegExp)[]): number {
  return headers.findIndex((h) => {
    return patterns.some((p) => {
      if (typeof p === 'string') {
        return h.includes(p);
      }
      return p.test(h);
    });
  });
}

/**
 * 100% Dynamic CSV Topic & Question Parser
 * - Reads ONLY what is provided in the CSV.
 * - ZERO default topics, ZERO mock questions.
 * - If a stage is empty in the CSV for a topic, it produces ZERO questions for that stage.
 * - Card limits enforced:
 *   - 破冰 (icebreaker): max 1 題
 *   - 回顧 (review): max 5 題
 *   - 思想 (reflection): max 1 題
 *   - 應用 (application): max 1 題
 */
/**
 * 100% Dynamic CSV Topic & Question Parser
 * - Reads ONLY what is provided in the CSV.
 * - ZERO default topics, ZERO mock questions.
 * - If a stage is empty in the CSV for a topic, it produces ZERO questions for that stage.
 * - Card limits enforced:
 *   - 破冰 (icebreaker): max 1 題
 *   - 回顧 (review): max 5 題
 *   - 思想 (reflection): max 1 題
 *   - 應用 (application): max 1 題
 */
export function parseTopicsFromCSV(csvText: string, existingTopics?: WeeklyTopic[]): WeeklyTopic[] {
  const rows = parseCSV(csvText);
  if (rows.length === 0) return [];

  const rawHeaders = rows[0];
  const headers = rawHeaders.map(cleanHeader);

  // Check if this CSV is row-based questions (has column for '階段' / 'stage')
  const stageColIdx = findColumnIndex(headers, ['階段', 'stage', '題型', '分類', '卡片階段', '題目階段'], ['階段', 'stage']);
  const isRowBasedQuestions = stageColIdx !== -1;

  if (isRowBasedQuestions) {
    return parseRowBasedQuestionsCSV(rows, headers, stageColIdx, existingTopics);
  } else {
    return parseWideFormatCSV(rows, headers, existingTopics);
  }
}

/**
 * Parse Wide Format CSV: One row per topic with columns for questions
 */
function parseWideFormatCSV(rows: string[][], headers: string[], existingTopics?: WeeklyTopic[]): WeeklyTopic[] {
  // Topic metadata column indices with strict exact matches and exclusion rules
  const idCol = findColumnIndex(headers, ['主題id', 'topicid', '週次', '週別', 'id'], ['主題id', '所屬主題', '週次']);
  const dateCol = findColumnIndex(headers, ['聚會日期', '日期', '時間', 'date'], ['聚會日期', '日期']);
  const titleCol = findColumnIndex(
    headers,
    ['主題名稱', '講題', '聚會主題', 'title'],
    ['主題名稱', '講題', '主題'],
    ['id', '所屬', '代碼', '編號', '週次']
  );
  const scriptureCol = findColumnIndex(headers, ['主要經文', '經文', 'scripture'], ['主要經文', '經文']);
  const speakerCol = findColumnIndex(headers, ['講員', '講道者', '牧師', '傳道', '講員姓名', 'speaker'], ['講員', '講道者']);
  const summaryCol = findColumnIndex(headers, ['信息摘要', '摘要', '大綱', '核心亮光', 'summary'], ['信息摘要', '摘要']);

  // Stage 1: 破冰 1 題
  const iceCol = findColIdx(headers, [
    '破冰題目', '破冰題', '破冰1', '破冰暖身', '破冰問題', '破冰', 'icebreaker', 'ice'
  ]);
  const iceSubCol = findColIdx(headers, ['破冰副標', '破冰說明', '破冰引導']);

  // Stage 2: 回顧 5 題
  // We locate question, options, answer, explanation for up to 5 review questions
  interface ReviewCols {
    qIdx: number;
    optAIdx: number;
    optBIdx: number;
    optCIdx: number;
    optDIdx: number;
    optCombinedIdx: number;
    ansIdx: number;
    expIdx: number;
    scrIdx: number;
  }

  const reviewCols: ReviewCols[] = [];
  for (let i = 1; i <= 5; i++) {
    const numChar = String(i);
    const chineseNum = ['一', '二', '三', '四', '五'][i - 1];

    // Find question column
    const qIdx = findColIdx(headers, [
      new RegExp(`^回顧.*(${numChar}|${chineseNum}).*(題|問題|題目|q)$`),
      new RegExp(`^回顧(${numChar}|${chineseNum})$`),
      new RegExp(`^回顧.*(${numChar}|${chineseNum})`),
      new RegExp(`^review.*${numChar}.*(q|question|title)?$`),
    ]);

    // Options A, B, C, D
    const optAIdx = findColIdx(headers, [
      new RegExp(`回顧.*(${numChar}|${chineseNum}).*(選項a|選項1|opt[a1]|-a)`)
    ]);
    const optBIdx = findColIdx(headers, [
      new RegExp(`回顧.*(${numChar}|${chineseNum}).*(選項b|選項2|opt[b2]|-b)`)
    ]);
    const optCIdx = findColIdx(headers, [
      new RegExp(`回顧.*(${numChar}|${chineseNum}).*(選項c|選項3|opt[c3]|-c)`)
    ]);
    const optDIdx = findColIdx(headers, [
      new RegExp(`回顧.*(${numChar}|${chineseNum}).*(選項d|選項4|opt[d4]|-d)`)
    ]);

    // Combined options column (e.g. 回顧1選項)
    const optCombinedIdx = findColIdx(headers, [
      new RegExp(`回顧.*(${numChar}|${chineseNum}).*(選項|options)$`)
    ]);

    // Answer column
    const ansIdx = findColIdx(headers, [
      new RegExp(`回顧.*(${numChar}|${chineseNum}).*(正解|正確答案|答案|answer|correct)`)
    ]);

    // Explanation column
    const expIdx = findColIdx(headers, [
      new RegExp(`回顧.*(${numChar}|${chineseNum}).*(解析|說明|解釋|explanation)`)
    ]);

    // Scripture column
    const scrIdx = findColIdx(headers, [
      new RegExp(`回顧.*(${numChar}|${chineseNum}).*(經文|出處|scripture)`)
    ]);

    reviewCols.push({
      qIdx,
      optAIdx,
      optBIdx,
      optCIdx,
      optDIdx,
      optCombinedIdx,
      ansIdx,
      expIdx,
      scrIdx,
    });
  }

  // Stage 3: 思想 1 題
  const refCol = findColIdx(headers, [
    '思想題目', '思想題', '思想1', '真理思想', '思想問題', '思想', 'reflection'
  ]);
  const refSubCol = findColIdx(headers, ['思想副標', '思想提示', '思想說明', '思想引導']);

  // Stage 4: 應用 1 題
  const appCol = findColIdx(headers, [
    '應用題目', '應用題', '應用1', '生活應用', '心志行動', '行動題', '應用問題', '應用', 'application'
  ]);
  const appSubCol = findColIdx(headers, ['應用副標', '應用提示', '應用說明', '行動引導']);

  const topics: WeeklyTopic[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const id = (idCol !== -1 ? row[idCol] : row[0])?.trim();
    if (!id) continue;

    const date = (dateCol !== -1 ? row[dateCol] : row[1])?.trim() || '';
    const title = (titleCol !== -1 ? row[titleCol] : row[2])?.trim() || id;
    const mainScripture = (scriptureCol !== -1 ? row[scriptureCol] : row[3])?.trim() || '';
    const speaker = (speakerCol !== -1 ? row[speakerCol] : row[4])?.trim() || '';
    const summary = (summaryCol !== -1 ? row[summaryCol] : row[5])?.trim() || '';

    const questions: QuestionCard[] = [];

    // 1. 破冰暖身題（嚴格 1 題，試算表無填寫則為空）
    if (iceCol !== -1 && row[iceCol]?.trim()) {
      const qText = row[iceCol].trim();
      const subText = iceSubCol !== -1 ? row[iceSubCol]?.trim() : '輕鬆開場，分享生活日常。';
      questions.push({
        id: `q-${id}-ice-1`,
        stage: 'icebreaker',
        title: '破冰暖身題',
        question: qText,
        subtitle: subText || '輕鬆開場，分享生活日常。',
        tags: ['破冰暖身'],
        timeSuggestionMinutes: 2,
      });
    }

    // 2. 主題回顧題（嚴格最多 5 題，試算表無填寫則為空）
    for (let k = 0; k < 5; k++) {
      const col = reviewCols[k];
      if (col.qIdx !== -1 && row[col.qIdx]?.trim()) {
        const qText = row[col.qIdx].trim();

        // Extract options
        let options: string[] = [];
        if (col.optAIdx !== -1 || col.optBIdx !== -1) {
          const optA = col.optAIdx !== -1 ? row[col.optAIdx]?.trim() : '';
          const optB = col.optBIdx !== -1 ? row[col.optBIdx]?.trim() : '';
          const optC = col.optCIdx !== -1 ? row[col.optCIdx]?.trim() : '';
          const optD = col.optDIdx !== -1 ? row[col.optDIdx]?.trim() : '';
          options = [optA, optB, optC, optD].filter(Boolean);
        } else if (col.optCombinedIdx !== -1 && row[col.optCombinedIdx]?.trim()) {
          options = splitOptionsString(row[col.optCombinedIdx]);
        }

        // Format options as A. ... B. ... if not already prefixed
        options = options.map((opt, oIdx) => {
          const prefix = ['A. ', 'B. ', 'C. ', 'D. '][oIdx] || '';
          if (/^[A-D][.、:\s]/i.test(opt)) return opt;
          return `${prefix}${opt}`;
        });

        // Correct Answer
        const rawAns = col.ansIdx !== -1 ? row[col.ansIdx]?.trim() : '';
        const correctIndex = parseCorrectAnswer(rawAns, options);

        // Explanation & Scripture
        const explanation = col.expIdx !== -1 ? row[col.expIdx]?.trim() : undefined;
        const scriptureReference = col.scrIdx !== -1 ? row[col.scrIdx]?.trim() : undefined;

        questions.push({
          id: `q-${id}-rev-${k + 1}`,
          stage: 'review',
          title: `主題回顧 ${k + 1}`,
          question: qText,
          subtitle: scriptureReference ? `${scriptureReference} 經文回顧選擇題` : '講道信息重點選擇題',
          scriptureReference,
          options: options.length > 0 ? options : undefined,
          correctAnswerIndex: correctIndex,
          explanation: explanation || (correctIndex !== undefined ? `正解為 ${['A', 'B', 'C', 'D'][correctIndex]}` : undefined),
          tags: ['主題回顧', '經文問答'],
          timeSuggestionMinutes: 1,
        });
      }
    }

    // 3. 真理思想題（嚴格 1 題，試算表無填寫則為空）
    if (refCol !== -1 && row[refCol]?.trim()) {
      const qText = row[refCol].trim();
      const subText = refSubCol !== -1 ? row[refSubCol]?.trim() : '省察內心，連結生命真實光景。';
      questions.push({
        id: `q-${id}-ref-1`,
        stage: 'reflection',
        title: '真理思想題',
        question: qText,
        subtitle: subText || '省察內心，連結生命真實光景。',
        tags: ['真理思想'],
        timeSuggestionMinutes: 3,
      });
    }

    // 4. 生活應用題（嚴格 1 題，試算表無填寫則為空）
    if (appCol !== -1 && row[appCol]?.trim()) {
      const qText = row[appCol].trim();
      const subText = appSubCol !== -1 ? row[appSubCol]?.trim() : '本週心志行動（具體實踐）。';
      questions.push({
        id: `q-${id}-app-1`,
        stage: 'application',
        title: '生活應用題',
        question: qText,
        subtitle: subText || '本週心志行動（具體實踐）。',
        tags: ['生活應用', '本週行動'],
        timeSuggestionMinutes: 3,
      });
    }

    // If wide format CSV had no questions for this topic, but existingTopics has questions, preserve them
    if (questions.length === 0 && existingTopics && existingTopics.length > 0) {
      const match = existingTopics.find(
        (t) => t.id.trim().toLowerCase() === id.trim().toLowerCase()
      );
      if (match && match.questions && match.questions.length > 0) {
        questions.push(...match.questions);
      }
    }

    topics.push(
      sanitizeWeeklyTopic({
        id,
        date,
        title,
        category: 'sermon',
        speaker,
        mainScripture,
        summary,
        keyPoints: [],
        questions,
      })
    );
  }

  // Also preserve any existing topics not present in this wide format CSV
  if (existingTopics && existingTopics.length > 0) {
    for (const existing of existingTopics) {
      if (!topics.some((t) => t.id.trim().toLowerCase() === existing.id.trim().toLowerCase())) {
        topics.push(existing);
      }
    }
  }

  topics.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return topics;
}

/**
 * Parse Row-based Question CSV: Each row is a question card
 * User Format: 所屬主題ID, 階段, 題目本文, 小標題, 引導提示, 經文出處, 選項A, 選項B, 選項C, 選項D, 正確答案
 */
function parseRowBasedQuestionsCSV(
  rows: string[][],
  headers: string[],
  stageColIdx: number,
  existingTopics?: WeeklyTopic[]
): WeeklyTopic[] {
  // Topic identifier column
  const idCol = findHeaderIndex(
    headers,
    ['所屬主題id', '所屬主題', '主題id', 'topicid', 'topic_id', '所屬週次', '週次', '週別', 'id'],
    ['所屬主題', '主題id', 'topicid']
  );

  const stageCol = stageColIdx !== -1 ? stageColIdx : findHeaderIndex(
    headers,
    ['階段', 'stage', '題型', '分類', '卡片階段', '題目階段'],
    ['階段', 'stage']
  );

  const questionCol = findHeaderIndex(
    headers,
    ['題目本文', '題目', '問題本文', '問題', '內容', '題本文', 'question', 'qtext'],
    ['題目本文', '問題本文', '題目', '問題']
  );

  const subtitleCol = findHeaderIndex(
    headers,
    ['小標題', '子標題', '題目標題', 'subtitle'],
    ['小標題', '子標題']
  );

  const hintCol = findHeaderIndex(
    headers,
    ['引導提示', '提示引導', '引導問題', '帶領提示', '提示', '引導', '心法提示', '備註', 'hint'],
    ['引導提示', '帶領提示', '提示', '引導']
  );

  const scriptureCol = findHeaderIndex(
    headers,
    ['經文出處', '主要經文', '聖經經文', '經文', '出處', 'scripture'],
    ['經文出處', '主要經文', '聖經經文', '經文']
  );

  const optACol = findHeaderIndex(headers, ['選項a', '選項1', 'opta', 'opt1', 'a'], ['選項a', '選項1']);
  const optBCol = findHeaderIndex(headers, ['選項b', '選項2', 'optb', 'opt2', 'b'], ['選項b', '選項2']);
  const optCCol = findHeaderIndex(headers, ['選項c', '選項3', 'optc', 'opt3', 'c'], ['選項c', '選項3']);
  const optDCol = findHeaderIndex(headers, ['選項d', '選項4', 'optd', 'opt4', 'd'], ['選項d', '選項4']);
  const optCombinedCol = findHeaderIndex(headers, ['選項', '所有選項', 'options'], ['選項', 'options']);
  const ansCol = findHeaderIndex(
    headers,
    ['正確答案', '正解', '答案', '標準答案', '正確選項', 'answer', 'correct'],
    ['正確答案', '正解', '答案']
  );
  const expCol = findHeaderIndex(
    headers,
    ['解析', '說明', '解答說明', '真理解析', 'explanation'],
    ['解析', '說明']
  );

  // Optional topic metadata columns if present
  const titleCol = findHeaderIndex(
    headers,
    ['主題名稱', '講題', '聚會主題', '主題名', 'topictitle'],
    ['主題名稱', '講題', '聚會主題']
  );
  const dateCol = findHeaderIndex(headers, ['聚會日期', '日期', '時間', 'date'], ['聚會日期', '日期']);
  const speakerCol = findHeaderIndex(
    headers,
    ['講員', '講道者', '牧師', '傳道', '講員姓名', 'speaker'],
    ['講員', '講道者', '牧師', '傳道']
  );
  const summaryCol = findHeaderIndex(
    headers,
    ['信息摘要', '摘要', '大綱', '核心亮光', 'summary'],
    ['信息摘要', '摘要']
  );

  // Group questions by topicId
  const topicQuestionsMap = new Map<string, QuestionCard[]>();
  const topicMetaMap = new Map<string, Partial<WeeklyTopic>>();
  const topicIdOrder: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || row.every((c) => !c.trim())) continue;

    const topicId = (idCol !== -1 ? row[idCol] : row[0])?.trim();
    if (!topicId) continue;

    if (!topicQuestionsMap.has(topicId)) {
      topicQuestionsMap.set(topicId, []);
      topicIdOrder.push(topicId);
    }

    // Capture metadata if present
    const rowTitle = titleCol !== -1 ? row[titleCol]?.trim() : '';
    const rowDate = dateCol !== -1 ? row[dateCol]?.trim() : '';
    const rowSpeaker = speakerCol !== -1 ? row[speakerCol]?.trim() : '';
    const rowScripture = scriptureCol !== -1 ? row[scriptureCol]?.trim() : '';
    const rowSummary = summaryCol !== -1 ? row[summaryCol]?.trim() : '';

    if (!topicMetaMap.has(topicId)) {
      topicMetaMap.set(topicId, {
        title: rowTitle,
        date: rowDate,
        speaker: rowSpeaker,
        mainScripture: rowScripture,
        summary: rowSummary,
      });
    } else {
      const existingMeta = topicMetaMap.get(topicId)!;
      if (!existingMeta.title && rowTitle) existingMeta.title = rowTitle;
      if (!existingMeta.date && rowDate) existingMeta.date = rowDate;
      if (!existingMeta.speaker && rowSpeaker) existingMeta.speaker = rowSpeaker;
      if (!existingMeta.mainScripture && rowScripture) existingMeta.mainScripture = rowScripture;
      if (!existingMeta.summary && rowSummary) existingMeta.summary = rowSummary;
    }

    // Determine Stage
    const rawStage = (stageCol !== -1 ? row[stageCol] : '')?.trim();
    const stage = parseStageName(rawStage);
    if (!stage) continue;

    // Question content
    const qText = (questionCol !== -1 ? row[questionCol] : '')?.trim();
    if (!qText) continue;

    // Subtitle, hint, and scripture reference
    const subtitle = subtitleCol !== -1 ? row[subtitleCol]?.trim() : '';
    const hint = hintCol !== -1 ? row[hintCol]?.trim() : '';
    const scriptureRef = scriptureCol !== -1 ? row[scriptureCol]?.trim() : '';

    const currentQuestions = topicQuestionsMap.get(topicId)!;
    const existingInStage = currentQuestions.filter((q) => q.stage === stage);

    // Enforce strict limits per stage:
    // 破冰 1 題, 回顧 5 題, 思想 1 題, 應用 1 題
    if (stage === 'icebreaker' && existingInStage.length >= 1) continue;
    if (stage === 'review' && existingInStage.length >= 5) continue;
    if (stage === 'reflection' && existingInStage.length >= 1) continue;
    if (stage === 'application' && existingInStage.length >= 1) continue;

    // Review stage options & answer
    let options: string[] | undefined = undefined;
    let correctIndex: number | undefined = undefined;
    let explanation: string | undefined = undefined;

    if (stage === 'review') {
      let rawOptions: string[] = [];
      if (optACol !== -1 || optBCol !== -1 || optCCol !== -1 || optDCol !== -1) {
        const a = optACol !== -1 ? row[optACol]?.trim() : '';
        const b = optBCol !== -1 ? row[optBCol]?.trim() : '';
        const c = optCCol !== -1 ? row[optCCol]?.trim() : '';
        const d = optDCol !== -1 ? row[optDCol]?.trim() : '';
        rawOptions = [a, b, c, d].filter(Boolean);
      } else if (optCombinedCol !== -1 && row[optCombinedCol]?.trim()) {
        rawOptions = splitOptionsString(row[optCombinedCol]);
      }

      if (rawOptions.length > 0) {
        options = rawOptions.map((opt, oIdx) => {
          const letter = ['A', 'B', 'C', 'D'][oIdx] || `${oIdx + 1}`;
          if (/^[A-D][.、:\s]/i.test(opt)) return opt;
          return `${letter}. ${opt}`;
        });
      }

      const rawAns = ansCol !== -1 ? row[ansCol]?.trim() : '';
      if (rawAns && options) {
        correctIndex = parseCorrectAnswer(rawAns, options);
      }

      const rawExp = expCol !== -1 ? row[expCol]?.trim() : '';
      if (rawExp) {
        explanation = rawExp;
      } else if (correctIndex !== undefined) {
        const letter = ['A', 'B', 'C', 'D'][correctIndex] || `${correctIndex + 1}`;
        explanation = `正解為 ${letter}`;
        if (hint) {
          explanation += `（${hint}）`;
        }
      }
    }

    // Default title for card
    let cardTitle = subtitle;
    if (!cardTitle) {
      if (stage === 'icebreaker') cardTitle = '破冰暖身';
      else if (stage === 'review') cardTitle = `主題回顧 ${existingInStage.length + 1}`;
      else if (stage === 'reflection') cardTitle = '真理思想';
      else cardTitle = '生活應用';
    }

    const card: QuestionCard = {
      id: `q-${topicId}-${stage}-${existingInStage.length + 1}`,
      stage,
      title: cardTitle,
      question: qText,
      subtitle: subtitle || undefined,
      hint: hint || undefined,
      scriptureReference: scriptureRef || undefined,
      options: options && options.length > 0 ? options : undefined,
      correctAnswerIndex: correctIndex,
      explanation: explanation || undefined,
      tags: [
        stage === 'icebreaker' ? '破冰暖身' :
        stage === 'review' ? '主題回顧' :
        stage === 'reflection' ? '真理思想' :
        '生活應用'
      ],
      timeSuggestionMinutes: stage === 'review' ? 1 : stage === 'icebreaker' ? 2 : 3,
    };

    currentQuestions.push(card);
  }

  // Construct WeeklyTopic objects
  const finalTopics: WeeklyTopic[] = [];
  const existingMap = new Map<string, WeeklyTopic>();

  const baselineTopics = existingTopics && existingTopics.length > 0
    ? existingTopics
    : getStoredTopics();

  for (const t of baselineTopics) {
    existingMap.set(t.id.trim().toUpperCase(), t);
  }

  // 1. Build topics that were present in the CSV
  for (const topicId of topicIdOrder) {
    const questions = topicQuestionsMap.get(topicId) || [];
    const meta = topicMetaMap.get(topicId) || {};
    const lookupKey = topicId.trim().toUpperCase();
    const existing = existingMap.get(lookupKey);

    // Main scripture from meta, or existing, or first question with scriptureReference
    const firstScripture = questions.find((q) => q.scriptureReference)?.scriptureReference || '';
    const mainScripture = meta.mainScripture || existing?.mainScripture || firstScripture;

    // Date
    const date = meta.date || existing?.date || deriveDateFromWeekId(topicId);

    // Title: prioritize existing title from Weekly Topics sheet (if defined and not just topic ID), else meta, else fallback
    let title = existing?.title && existing.title.trim() !== existing.id.trim()
      ? existing.title.trim()
      : meta.title || existing?.title;

    if (!title || title === topicId) {
      title = `${topicId} 主日信息與小組分享`;
    }

    const speaker = meta.speaker || existing?.speaker || '';
    const summary = meta.summary || existing?.summary || '';

    const topic: WeeklyTopic = sanitizeWeeklyTopic({
      id: existing?.id || topicId,
      date,
      title,
      category: existing?.category || 'sermon',
      speaker,
      mainScripture,
      summary,
      keyPoints: existing?.keyPoints || [],
      questions,
    });

    finalTopics.push(topic);
    existingMap.delete(lookupKey);
  }

  // 2. Also keep any existing topics that were not in this CSV
  for (const remaining of existingMap.values()) {
    finalTopics.push(remaining);
  }

  // Sort descending by date, then by ID
  finalTopics.sort((a, b) => {
    if (b.date && a.date && b.date !== a.date) {
      return b.date.localeCompare(a.date);
    }
    return b.id.localeCompare(a.id);
  });

  return finalTopics;
}

/**
 * Correlate questions from 『題庫明細』 with topics from 『每週主題』
 */
export function correlateTopicsAndQuestions(
  topics: WeeklyTopic[],
  questionsCsvText: string
): WeeklyTopic[] {
  const rows = parseCSV(questionsCsvText);
  if (rows.length === 0) return topics;

  const rawHeaders = rows[0];
  const headers = rawHeaders.map(cleanHeader);
  const stageColIdx = findColumnIndex(
    headers,
    ['階段', 'stage', '題型', '分類', '卡片階段', '題目階段'],
    ['階段', 'stage']
  );

  return parseRowBasedQuestionsCSV(
    rows,
    headers,
    stageColIdx !== -1 ? stageColIdx : 1,
    topics
  );
}

/**
 * Extract gid parameter from a Google Sheet URL
 */
export function extractGidFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[?&#]gid=([0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Normalize any Google Sheet URL to direct CSV export format with optional explicit gid
 */
export function normalizeGoogleSheetCSVUrl(inputUrl: string, explicitGid?: string | number): string {
  const trimmed = (inputUrl || '').trim();
  if (!trimmed) return '';

  const foundGid = explicitGid !== undefined && String(explicitGid).trim() !== ''
    ? String(explicitGid).trim()
    : extractGidFromUrl(trimmed);

  // 1. Published web URLs (/pubhtml or /pub)
  if (trimmed.includes('/pubhtml') || trimmed.includes('/pub')) {
    let clean = trimmed.replace('/pubhtml', '/pub');
    clean = clean.replace(/#.*$/, '');

    if (!clean.includes('output=csv')) {
      clean = clean.replace(/[?&]output=[^&#]*/, '');
      const sep = clean.includes('?') ? '&' : '?';
      clean = `${clean}${sep}output=csv`;
    }

    if (foundGid !== null) {
      if (/[?&]gid=[0-9]+/.test(clean)) {
        clean = clean.replace(/([?&]gid=)[0-9]+/, `$1${foundGid}`);
      } else {
        clean += `&gid=${foundGid}&single=true`;
      }
    }
    return clean;
  }

  // 2. Standard edit / view URLs (/spreadsheets/d/{ID}/...)
  const sheetIdMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetIdMatch && sheetIdMatch[1]) {
    const sheetId = sheetIdMatch[1];
    let exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    if (foundGid !== null) {
      exportUrl += `&gid=${foundGid}`;
    }
    return exportUrl;
  }

  // 3. Raw Sheet ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    let exportUrl = `https://docs.google.com/spreadsheets/d/${trimmed}/export?format=csv`;
    if (foundGid !== null) {
      exportUrl += `&gid=${foundGid}`;
    }
    return exportUrl;
  }

  // 4. export?format=csv
  if (trimmed.includes('export?format=csv')) {
    let clean = trimmed.replace(/#.*$/, '');
    if (foundGid !== null) {
      if (/[?&]gid=[0-9]+/.test(clean)) {
        clean = clean.replace(/([?&]gid=)[0-9]+/, `$1${foundGid}`);
      } else {
        const sep = clean.includes('?') ? '&' : '?';
        clean = `${clean}${sep}gid=${foundGid}`;
      }
    }
    return clean;
  }

  return trimmed;
}

/**
 * Fetch CSV text dynamically from URL (Direct fetch with server proxy fallback for CORS)
 */
export async function fetchCSVFromUrl(rawUrl: string, explicitGid?: string | number): Promise<string> {
  const normalizedUrl = normalizeGoogleSheetCSVUrl(rawUrl, explicitGid);

  // 1. Try direct fetch first
  try {
    const response = await fetch(normalizedUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/csv, text/plain, */*',
      },
    });

    if (response.ok) {
      const text = await response.text();
      if (text && text.length > 5 && !text.trim().startsWith('<!DOCTYPE html>')) {
        return text;
      }
    }
  } catch (err) {
    console.warn('Direct CSV fetch failed, falling back to server proxy:', err);
  }

  // 2. Fallback to server proxy /api/fetch-csv?url=...
  const proxyUrl = `/api/fetch-csv?url=${encodeURIComponent(normalizedUrl)}`;
  const proxyResponse = await fetch(proxyUrl);
  if (!proxyResponse.ok) {
    const errJson = await proxyResponse.json().catch(() => ({}));
    throw new Error(errJson.error || `載入 CSV 失敗（HTTP ${proxyResponse.status}）`);
  }

  const csvText = await proxyResponse.text();
  if (!csvText || csvText.trim().startsWith('<!DOCTYPE html>')) {
    throw new Error('取得的內容並非有效 CSV，請確認試算表已「發布至網路」為 CSV 格式');
  }

  return csvText;
}

export interface MultiTabSyncOptions {
  questionsUrl: string;
  questionsGid?: string | number;
  topicsUrl?: string;
  topicsGid?: string | number;
  syncTopicsTab?: boolean;
  existingTopics?: WeeklyTopic[];
}

/**
 * Dynamic Multi-Tab Sync:
 * Synchronizes and correlates Google Sheets tabs:
 * - 『題庫明細』 (Question Details) via questionsUrl & questionsGid
 * - 『每週主題』 (Weekly Topics) via topicsUrl & topicsGid
 */
export async function syncGoogleSheetWithTabs(
  options: MultiTabSyncOptions
): Promise<{
  topics: WeeklyTopic[];
  totalQuestions: number;
  topicsCount: number;
}> {
  const {
    questionsUrl,
    questionsGid,
    topicsUrl,
    topicsGid,
    syncTopicsTab = true,
    existingTopics,
  } = options;

  if (!questionsUrl?.trim()) {
    throw new Error('請提供「題庫明細」分頁的發布 CSV 網址或試算表網址');
  }

  // 1. Fetch Questions Tab CSV
  const normalizedQuestionsUrl = normalizeGoogleSheetCSVUrl(questionsUrl, questionsGid);
  const questionsCsvText = await fetchCSVFromUrl(normalizedQuestionsUrl);

  let finalTopics: WeeklyTopic[] = [];

  // 2. Fetch Topics Tab CSV if requested/available
  const effectiveTopicsUrl = topicsUrl?.trim() || (
    syncTopicsTab && (questionsUrl.includes('/spreadsheets/d/') || questionsUrl.includes('/pub'))
      ? questionsUrl.trim()
      : ''
  );

  if (syncTopicsTab && effectiveTopicsUrl) {
    try {
      const normalizedTopicsUrl = normalizeGoogleSheetCSVUrl(effectiveTopicsUrl, topicsGid ?? 0);
      const topicsCsvText = await fetchCSVFromUrl(normalizedTopicsUrl);
      const baseTopics = parseTopicsFromCSV(topicsCsvText, existingTopics);

      if (baseTopics.length > 0) {
        finalTopics = correlateTopicsAndQuestions(baseTopics, questionsCsvText);
      }
    } catch (topicsErr) {
      console.warn('載入每週主題分頁失敗，降級為直接由題庫明細建立主題：', topicsErr);
    }
  }

  // If topics were not built yet, parse questions directly
  if (finalTopics.length === 0) {
    finalTopics = parseTopicsFromCSV(questionsCsvText, existingTopics);
  }

  if (finalTopics.length === 0) {
    throw new Error('試算表讀取成功，但未能解析出任何主題或題目卡片，請確認「所屬主題ID」與「階段」欄位');
  }

  // Save config & sync time locally
  try {
    localStorage.setItem(CSV_STORAGE_KEYS.QUESTIONS_URL, questionsUrl.trim());
    if (questionsGid !== undefined && String(questionsGid).trim() !== '') {
      localStorage.setItem(CSV_STORAGE_KEYS.QUESTIONS_GID, String(questionsGid).trim());
    }
    if (topicsUrl?.trim()) {
      localStorage.setItem(CSV_STORAGE_KEYS.TOPICS_URL, topicsUrl.trim());
    }
    if (topicsGid !== undefined && String(topicsGid).trim() !== '') {
      localStorage.setItem(CSV_STORAGE_KEYS.TOPICS_GID, String(topicsGid).trim());
    }
    localStorage.setItem(CSV_STORAGE_KEYS.CSV_URL, normalizedQuestionsUrl);
    localStorage.setItem(CSV_STORAGE_KEYS.LAST_SYNC_TIME, String(Date.now()));
  } catch {}

  // Sync to Cloud Firestore so all room members get it in real-time
  try {
    await seedCloudTopics(finalTopics);
  } catch (cloudErr) {
    console.warn('Failed to seed cloud topics:', cloudErr);
  }

  const totalQuestions = finalTopics.reduce((acc, t) => acc + t.questions.length, 0);

  return {
    topics: finalTopics,
    totalQuestions,
    topicsCount: finalTopics.length,
  };
}

/**
 * Sync topics from Google Sheet CSV URL, store in Cloud Firestore & localStorage
 */
export async function syncTopicsFromCSV(csvUrl: string, existingTopics?: WeeklyTopic[]): Promise<WeeklyTopic[]> {
  const csvText = await fetchCSVFromUrl(csvUrl);
  const parsedTopics = parseTopicsFromCSV(csvText, existingTopics);

  if (parsedTopics.length === 0) {
    throw new Error('試算表 CSV 解析完成，但未發現任何主題資料，請確認欄位包含「所屬主題ID」或「主題ID」與題目');
  }

  // Save URL and sync time locally
  try {
    localStorage.setItem(CSV_STORAGE_KEYS.CSV_URL, csvUrl.trim());
    localStorage.setItem(CSV_STORAGE_KEYS.LAST_SYNC_TIME, String(Date.now()));
  } catch {}

  // Sync to Cloud Firestore database so all room members get it in real-time
  try {
    await seedCloudTopics(parsedTopics);
  } catch (err) {
    console.warn('Failed to seed parsed CSV topics to Firestore:', err);
  }

  return parsedTopics;
}
