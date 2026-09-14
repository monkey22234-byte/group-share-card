import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized GoogleGenAI
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Proxy endpoint to fetch Google Sheets CSV without CORS restrictions
app.get("/api/fetch-csv", async (req, res) => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).json({ error: "請提供試算表 CSV 網址" });
    }

    const response = await fetch(rawUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SmallGroupApp/1.0)",
        Accept: "text/csv, text/plain, */*",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `載入試算表失敗 (${response.status} ${response.statusText})，請確認連結已「發布至網路」或設為「知道連結的人均可檢視」`,
      });
    }

    const csvText = await response.text();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(csvText);
  } catch (err: any) {
    console.error("Fetch CSV error:", err);
    res.status(500).json({ error: err.message || "讀取 CSV 失敗" });
  }
});

// AI Topic & Question Generator for Small Groups
app.post("/api/generate-topic-cards", async (req, res) => {
  try {
    const { topicTitle, scripture, speaker, notes, groupType } = req.body;

    if (!topicTitle) {
      return res.status(400).json({ error: "請提供主題名稱或主日信息標題" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "尚未設定 GEMINI_API_KEY，請在設定中確認 API 金鑰。",
      });
    }

    const prompt = `你是一位資深的教會小組與團契牧養專家。請根據以下主日信息/靈修主題，為小組分享聚會設計高品質、結構嚴謹且溫暖富啟發性的討論卡片。

信息資料：
- 主題標題：${topicTitle}
- 核心經文：${scripture || "未提供，請根據主題選配合適經文"}
- 講員/來源：${speaker || "主日信息"}
- 備註/信息重點大綱：${notes || "無"}
- 小組族群：${groupType || "一般社青/成年團契小組"}

請務必包含完整的 4 個階段問題：
1. 破冰題 (icebreaker)：2 題。輕鬆自然、安全無壓力、所有人都能輕鬆開口的暖身問題（與主題意象或生活經驗有巧思連結）。
2. 主題回顧題 (review)：3-4 題選擇題！設計趣味 4 選 1 選擇題（含 options 陣列、correctAnswerIndex 正確答案索引 0-3、explanation 答案解析與經文亮光、hint 提示），幫助大家快速複習講道與經文關鍵字。
3. 真理思想題 (reflection)：2 題。深度的 "Why" 與心靈反思，引導成員檢視內心、信仰價值觀、過去掙扎或生命光景。
4. 生活應用題 (application)：1 題。具體的 "How" 實踐，聚焦在「本週生活行動」，具體、可行、可檢驗且可作為 LINE 代禱行動守望的具體方案。

同時請總結 3 個信息核心要點（keyPoints）以及一句簡潔的講道摘要（summary）。`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction:
          "你是一位富有恩膏與親和力的小組教材設計專家，善於引導成員敞開心扉、深入真理並落實生活應用。請以繁體中文回答並輸出 JSON 格式。",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "小組討論完整主題標題" },
            mainScripture: { type: Type.STRING, description: "核心經文章節" },
            scriptureExcerpt: { type: Type.STRING, description: "核心經文內容摘錄" },
            summary: { type: Type.STRING, description: "信息一句話重點摘要" },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3個信息核心要點",
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stage: {
                    type: Type.STRING,
                    description: "階段: 'icebreaker' | 'review' | 'reflection' | 'application'",
                  },
                  title: { type: Type.STRING, description: "卡片簡稱/小標題" },
                  question: { type: Type.STRING, description: "討論問題或選擇題題目" },
                  subtitle: { type: Type.STRING, description: "延伸引導或背景說明" },
                  hint: { type: Type.STRING, description: "引導提示或複習提示" },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "若為 review 主題回顧題，提供4個選項（例如：['A. ...', 'B. ...', 'C. ...', 'D. ...']）",
                  },
                  correctAnswerIndex: {
                    type: Type.INTEGER,
                    description: "正確選項的索引 (0, 1, 2, 3)",
                  },
                  explanation: {
                    type: Type.STRING,
                    description: "解答與經文亮光說明",
                  },
                  scriptureReference: { type: Type.STRING, description: "經文章節出處" },
                  scriptureText: { type: Type.STRING, description: "經文本文" },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "標籤例如：輕鬆暖身、真理對焦、內心剖析、本週行動",
                  },
                  timeSuggestionMinutes: { type: Type.INTEGER, description: "建議分享時間(分鐘)" },
                },
                required: ["stage", "title", "question"],
              },
            },
          },
          required: ["title", "mainScripture", "summary", "keyPoints", "questions"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("未能從 AI 取得有效回應");
    }

    const generatedData = JSON.parse(resultText);
    res.json({ success: true, data: generatedData });
  } catch (error: any) {
    console.error("Generate questions error:", error);
    res.status(500).json({
      error: error.message || "生成問題卡片時發生錯誤，請稍後再試",
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Group sharing app server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
