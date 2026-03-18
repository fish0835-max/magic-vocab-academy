# 🏰 魔法學院英語遊戲 — EnglishCard

> 為小學生設計的魔法主題英語單字學習遊戲。透過三種關卡挑戰，收集咒語書頁、贏得學院獎章！

---

## ✨ 功能特色

| 功能 | 說明 |
|------|------|
| 🔡 拼字挑戰 | 看圖聽音，鍵盤輸入英文單字 |
| 🖼️ 選圖挑戰 | 聽英文發音，從四張圖中選出正確答案 |
| 📜 克漏字挑戰 | 閱讀英文例句，填入缺漏的單字；答對後依序朗讀「慢英文 → 快英文 → 中文整句」 |
| 💀 魂系機制 | 三條命，答錯三次魔力耗盡，當關重來 |
| 📚 咒語書 | 通關後單字自動收錄，永久保存 |
| 🏅 週獎章 | 七天全數通關自動發放週獎章 |
| ☑️ 多選關卡 | 可同時選取多個日期合併挑戰，通關後每天分別標記完成 |
| 📷 題庫工具 | OCR 辨識 + 爬蟲/AI 自動填充，直接匯入遊戲 |
| ✏️ 關卡編輯 | PIN 密碼保護，在關卡選擇頁點 ✏️ 即可編輯當日單字 |
| 🔊 TTS 發音 | Web Speech API，支援 en-US 英文及 zh-TW 中文朗讀 |

---

## 🛠 技術棧

```
前端                           後端（選用）
──────────────────────         ─────────────────────
Vite + React 18 + TypeScript   Python FastAPI
Tailwind CSS v4                httpx（網路爬取）
Framer Motion                  Anthropic SDK (Claude AI)
React Router v6
Vitest + React Testing Library
Web Speech API (TTS)
Tesseract.js (OCR)
localStorage（持久化）
```

---

## 🗂 專案結構

```
EnglishCard/
├── run.bat                     # 🟢 互動式啟動選單（雙擊即可）
├── .gitignore
├── public/
│   └── data/
│       └── words.json          # 預設題庫（fallback）
├── src/
│   ├── types/index.ts          # WordEntry, GameSession, PhaseState…
│   ├── data/
│   │   ├── loader.ts           # groupByDate 等工具
│   │   └── sampleWords.ts      # 開發範例資料
│   ├── store/
│   │   ├── gameReducer.ts      # 遊戲狀態機（3 Phase）
│   │   └── GameContext.tsx     # React Context / startMultiLevel
│   ├── hooks/
│   │   ├── useTTS.ts           # speakClozeSequence / speakTwice
│   │   └── useGameSession.ts   # Context hook
│   ├── utils/
│   │   ├── wordBank.ts         # localStorage CRUD + replaceWordsByIds
│   │   ├── serverApi.ts        # 後端 API（相對路徑，透過 Vite proxy）
│   │   ├── csvParser.ts        # CSV → WordEntry[]
│   │   ├── weekUtils.ts        # ISO 週計算
│   │   └── ocr.ts              # Tesseract.js wrapper
│   ├── components/
│   │   ├── ui/                 # Button, Modal, HeartBar…
│   │   └── game/               # SpellingChallenge, TranslationChallenge, ClozeChallenge
│   └── pages/
│       ├── HomePage.tsx
│       ├── LevelSelectPage.tsx  # 多選模式 + PIN 保護編輯 + server/local-bank 來源徽章
│       ├── GamePage.tsx
│       ├── WeeklyChallengePage.tsx
│       └── tools/PhotoParserPage.tsx
├── server/
│   ├── main.py                 # FastAPI 自動填充後端
│   ├── requirements.txt
│   ├── start.bat               # 僅啟動後端（含防火牆開關）
│   ├── clear.bat               # 清除伺服器資料與 PIN
│   └── data/                   # ⚠️ 使用者資料（已列入 .gitignore）
│       ├── wordbank.json       # 題庫（gitignored）
│       └── config.json         # PIN 設定（gitignored）
├── vite.config.ts              # Proxy /api /uploads → localhost:8000
└── vitest.config.ts
```

---

## 🎮 遊戲流程

```mermaid
flowchart TD
    A([開啟遊戲]) --> B[首頁]
    B --> C[選擇關卡]

    C --> SRC{題庫來源}
    SRC -- server-bank\n後端有題庫 --> D[載入伺服器題庫]
    SRC -- local-bank\n本機有快取 --> D2[載入 localStorage 題庫]
    SRC -- words.json\n無任何題庫 --> D3[載入預設範例題庫]
    D2 --> SYNC[⬆️ 點同步上傳至伺服器]
    SYNC --> D

    D & D2 & D3 --> SEL{選擇模式}
    SEL -- 單日 --> LOAD[載入當日單字]
    SEL -- 多選模式 --> MULTI[勾選多個日期<br>合併單字清單]
    MULTI --> LOAD
    C -- ✏️ + PIN --> EDIT[編輯關卡單字<br>PIN 密碼保護]
    EDIT --> C

    LOAD --> F[建立三組獨立亂序題組]
    F --> G

    subgraph PHASE1["Phase 1：拼字挑戰 ✨"]
        G[看圖 + 聽音<br>鍵盤輸入英文] --> H{正確？}
        H -- ✅ --> I{本階段全部完成？}
        H -- ❌ --> J[生命 -1]
        J --> K{生命 = 0？}
        K -- 是 --> L[💀 魔力耗盡 → 重置]
        L --> G
        K -- 否 --> G
        I -- 否 --> G
        I -- 是 --> N
    end

    subgraph PHASE2["Phase 2：選圖挑戰 🔮"]
        N[聽英文<br>從四張圖選正確] --> O{正確？}
        O -- ✅ --> P{本階段全部完成？}
        O -- ❌ --> J2[生命 -1 → 同上]
        P -- 否 --> N
        P -- 是 --> Q
    end

    subgraph PHASE3["Phase 3：克漏字 📜"]
        Q[閱讀例句<br>填入缺漏單字] --> R{正確？}
        R -- ✅ --> S[🔊 慢EN → 快EN → 中文整句]
        S --> T{本階段全部完成？}
        R -- ❌ --> J3[生命 -1 → 同上]
        T -- 否 --> Q
        T -- 是 --> U
    end

    U[🎉 通關！單字收入咒語書]
    U --> V{本週七天全通關？}
    V -- 是 --> W[🏅 發放週獎章]
    V -- 否 --> X[返回關卡選擇]
    W --> X
```

---

## 📷 題庫製作工具流程

```mermaid
flowchart LR
    A([上傳圖片\n或拖曳]) --> B[Tesseract.js OCR\n辨識英文文字]
    B --> C[自動拆分單字列表\n可手動編輯]
    JSON([載入 words.json]) --> C
    C --> D{選擇填充方式}

    D --> E["🕷 爬蟲填充\n（免費公開 API）"]
    D --> F["🤖 Claude AI\n（Anthropic API Key）"]

    E --> G1["Google Translate dt=t\n中文翻譯"]
    E --> G2["Google Translate dt=ex\n英文例句"]
    E --> G3["Tatoeba API\n例句補充"]
    E --> G4["Unsplash napi\n圖片搜尋"]

    F --> H["Claude 生成\n翻譯 / 例句（3句）/ 圖片"]

    G1 & G2 & G3 & G4 & H --> I[自動填入空白欄位\n已填欄位不覆蓋]
    I --> J[多句例句編輯\n每字可增減例句]
    J --> K["📥 儲存至伺服器題庫\n(server-bank)"]
    K --> L([返回關卡選擇])
```

---

## 🏗 架構圖

```mermaid
flowchart TB
    subgraph DEVICE["📱 使用者裝置（瀏覽器）"]
        USER([👦 使用者])
        subgraph FE["前端 — Vite + React  (port 5173)"]
            REACT["⚛️ React App\n路由 / 遊戲狀態 / UI"]
            LS[("💾 localStorage\n進度 / 獎章 / 咒語書")]
            TTS["🔊 Web Speech API\nen-US + zh-TW TTS"]
            OCR["🔬 Tesseract.js\n圖片 OCR"]
        end
    end

    subgraph HOST["🖥 主機（Windows PC）"]
        subgraph VITE["Vite Dev Server  (port 5173)"]
            PROXY["Proxy\n/api  → :8000\n/uploads → :8000"]
        end
        subgraph BE["Python FastAPI  (port 8000)"]
            API["FastAPI Server\n/api/wordbank\n/api/fill/scrape\n/api/fill/claude\n/uploads/..."]
            DATA[("💾 server/data/\nwordbank.json\nconfig.json")]
            IMGS[("🖼 server/uploads/\n上傳圖片")]
        end
        PROXY --> API
        API <--> DATA
        API <--> IMGS
    end

    subgraph EXT["☁️ 外部服務"]
        GT["Google Translate API"]
        TATOEBA["Tatoeba API"]
        UNSPLASH["Unsplash napi"]
        CLAUDE["Anthropic Claude API"]
    end

    USER -- 操作 --> REACT
    REACT <--> LS
    REACT -- 發音 --> TTS
    REACT -- OCR --> OCR
    REACT -- "API 呼叫 (relative URL)" --> PROXY
    API --> GT
    API --> TATOEBA
    API --> UNSPLASH
    API -- "Claude Key\n(from request body)" --> CLAUDE

    style DEVICE fill:#1e0a3c,stroke:#7c3aed,color:#e9d5ff
    style FE fill:#2d1065,stroke:#a855f7,color:#e9d5ff
    style HOST fill:#1c1917,stroke:#78716c,color:#e7e5e4
    style BE fill:#292524,stroke:#78716c,color:#e7e5e4
    style EXT fill:#0c1a2e,stroke:#3b82f6,color:#bfdbfe
```

> **注意**：前端透過 Vite proxy 轉發 `/api` 與 `/uploads` 請求，手機/平板只需連 port 5173，無需直接存取 port 8000。後端僅在使用「自動填充」或「同步題庫」功能時需要啟動。

---

## 🚀 快速開始

### 前置需求

- Node.js 18+
- Python 3.10+（選用，僅題庫自動填充與伺服器題庫需要）

### 安裝依賴

```bash
# 前端
npm install

# 後端（選用）
cd server
pip install -r requirements.txt
```

### 一鍵啟動（推薦）

雙擊專案根目錄的 **`run.bat`**，從互動選單選擇啟動方式：

```
+------------------------------------------+
|        EnglishCard  Launcher             |
+------------------------------------------+
|  1.  Start All      (recommended)        |
|  2.  Start Client   (frontend)           |
|  3.  Start Server   (backend)            |
|  4.  Help                                |
|                                          |
|  5.  Clear Data / Credentials            |
|  6.  Restore Firewall (remove rules)     |
|                                          |
|  0.  Exit                                |
+------------------------------------------+
```

| 選項 | 說明 | 需要管理員 |
|------|------|:---:|
| 1. Start All | 同時啟動前端與後端（推薦） | ✅ |
| 2. Start Client | 開新視窗啟動 Vite 前端 | ❌ |
| 3. Start Server | 啟動 FastAPI 後端，自動開啟防火牆，結束時自動關閉 | ✅ |
| 4. Help | 顯示說明與手機連線網址 | ❌ |
| 5. Clear Data | 清除伺服器題庫、PIN、上傳圖片，並顯示瀏覽器清除指令 | ❌ |
| 6. Restore Firewall | 手動移除防火牆規則（伺服器異常關閉時使用） | ✅ |

> **注意**：選項 1、3、6 需要以**系統管理員**執行（右鍵 → 以系統管理員身分執行）。防火牆規則在伺服器正常停止（Ctrl+C）時會自動清除；若伺服器異常結束，可用選項 6 手動還原。

### 手動啟動

```bash
# 啟動前端
npm run dev
# → http://localhost:5173

# 啟動後端（另開終端機，選用）
cd server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 從手機/平板連線（LAN）

啟動後終端機會顯示：

```
➜  Hostname:   http://YOUR-PC-NAME:5173/
```

在手機瀏覽器輸入該網址即可（需與 PC 在同一 Wi-Fi）。

### 建置生產版本

```bash
npm run build
# 輸出至 dist/，可部署至任何靜態主機（Nginx、GitHub Pages、Netlify…）
```

---

## 🔒 安全與資料管理

| 項目 | 位置 | 說明 |
|------|------|------|
| Claude API Key | 瀏覽器 localStorage | 僅存於用戶端，不上傳 Git |
| PIN 密碼 | `server/data/config.json` | 已列入 .gitignore |
| 題庫資料 | `server/data/wordbank.json` | 已列入 .gitignore |
| 上傳圖片 | `server/uploads/` | 已列入 .gitignore |

**清除所有資料**：執行 `run.bat` → 選擇 `5. Clear Data / Credentials`，或直接執行 `server/clear.bat`。

---

## 📦 題庫格式

題庫工具會直接儲存至伺服器（`server-bank`）或 localStorage（`local-bank`），也支援匯入 JSON 檔案。

### JSON 格式

```json
[
  {
    "id": "w001",
    "word": "apple",
    "translation": "蘋果",
    "imageUrl": "https://...",
    "date": "2026-03-16",
    "sentence": "I eat an ___ every day.",
    "sentences": [
      "I eat an ___ every day.",
      "The ___ is red and sweet."
    ]
  }
]
```

| 欄位 | 必填 | 說明 |
|------|------|------|
| `id` | ✅ | 唯一識別碼（格式隨意） |
| `word` | ✅ | 英文單字 |
| `translation` | ✅ | 中文翻譯 |
| `imageUrl` | ✅ | 圖片網址或相對路徑 |
| `date` | ✅ | 所屬日期 `YYYY-MM-DD`（決定關卡分組） |
| `sentences` | ☑️ | 多個克漏字例句，每句含 `___`；克漏字時隨機抽取 |
| `sentence` | ☑️ | 單一例句（向下相容舊格式） |

### CSV 格式

欄位：`id, word, translation, imageurl, date, sentences`（`sentences` 欄位以 `;` 分隔多句）

---

## 🔒 關卡編輯 PIN 密碼

| 項目 | 說明 |
|------|------|
| 預設密碼 | `0000` |
| 格式 | 4 碼英數字（大小寫不分） |
| 修改方式 | 題庫製作工具 → ⚙️ 設定 → 修改編輯密碼 |
| 儲存位置 | `server/data/config.json`（伺服器）及 `localStorage: englishcard_pin`（本機快取） |

---

## 🧪 測試

```bash
# 執行全部測試
npm test

# 監看模式
npm run test:watch
```

**測試涵蓋範圍（37 tests）：**

| 測試檔 | 涵蓋內容 |
|--------|----------|
| `utils/csvParser.test.ts` | CSV 解析、錯誤處理、引號逸脫 |
| `utils/weekUtils.test.ts` | ISO 週計算、邊界值 |
| `store/gameReducer.test.ts` | 三階段狀態機、生命值、通關判定 |
| `components/game/SpellingChallenge.test.tsx` | 答對/答錯/Enter 鍵/大小寫 |
| `hooks/useTTS.test.ts` | `speakTwice` 回呼、`speakClozeSequence` 三段佇列 |

---

## 🎨 主題配色

| 用途 | 顏色 |
|------|------|
| 背景主色 | `purple-950` |
| 強調金色 | `amber-300 / amber-400` |
| 咒語光暈 | `rgba(168, 85, 247, 0.5)` |
| 正確回饋 | `green-400` |
| 錯誤回饋 | `red-400` |

---

## 📝 授權

MIT License
