# ⚡ SynthMind — AI Grounded Research Assistant & Multi-Source Synthesis Engine

**SynthMind** is a production-grade AI research assistant and knowledge synthesis workspace inspired by Google NotebookLM. It allows users to ingest 5 distinct knowledge source formats (PDFs, YouTube Videos, Web URLs, VTT Transcripts, and Plain Text), ask questions grounded in those sources, and receive answers with precise numerical citations `[1]`, `[2]`.

When a citation is clicked, SynthMind's **Deep-Linked Source Viewer** automatically seeks embedded YouTube videos to the exact cited timestamp (`t=seconds`) or highlights PDF pages!

---

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20SynthMind-10B981?style=for-the-badge)](https://synth-mind.onrender.com/)

## 🌟 Key Features

1. 📚 **Multi-Notebook Workspace Management:** Isolated knowledge bases per notebook with scoped loading, workspace skeletons, and Neon Postgres DB persistence.
2. 📥 **5-in-1 Source Ingestion Engine & 4-Tier YouTube Caption Extractor:**
   - 📄 **PDF Documents:** Extracts text & page numbers.
   - 🎥 **YouTube Videos (4-Tier Resilient Caption Extraction):** Combines direct watch-page requests (with `CONSENT` cookies to bypass Vercel/Render datacenter IP blocking), mobile/desktop User-Agent fallbacks, `youtube-caption-extractor` (iOS/Android InnerTube profiles), and `youtube-transcript`. NOTE: This working fine on localhost but no on server because of BOT protection, will implement another solution later.
   - 🌐 **Web URL Scraper:** Clean HTML body extraction via Cheerio with deep text fragment anchors.
   - ⏱️ **VTT Transcripts:** Parses timestamped subtitle files.
   - 📝 **Plain Text / MD:** Normalizes raw text notes.
3. ⚡ **Production-Grade BullMQ & Persistent Redis Task Queue System:**
   - **Persistent Redis Storage:** Replaces volatile in-memory queues with persistent Redis storage (Render Redis / Upstash / AWS ElastiCache / Local), ensuring job persistence across Docker container restarts and deployments.
   - **Configurable Concurrency & Backoff:** Limits active ingestion workers (default 3 concurrent workers) with exponential backoff retries (3 attempts).
   - **Long-Running Workload Optimization:** 5-minute lock duration (`lockDurationMs: 300000`) and 10-minute job timeout (`timeoutMs: 600000`) designed for heavy PDF parsing, OCR, and vector embedding indexing.
   - **Job Retention & Debugging:** Retains the last 50 completed jobs (1-hour retention) and last 100 failed jobs for administrative debugging.
   - **Graceful Process Shutdown:** Handles `SIGINT` and `SIGTERM` signals cleanly to ensure in-flight jobs complete before closing Redis sockets.
   - **Build Phase Safety:** Uses lazy JS Proxies so Next.js static build compilation (`npm run build`) never opens Redis connections.
4. 🧠 **The Hybrid Mix RAG Engine:**
   - **Query Deconstruction:** Splits compound questions into single-intent sub-questions.
   - **Multi-Query Expansion:** Generates 3 semantic variations using alternate technical phrasing.
   - **HyDE (Hypothetical Document Embeddings):** Generates a hypothetical excerpt to match vectors even when users use layman phrasing.
   - **Reciprocal Rank Fusion (RRF):** Fuses candidate chunk lists ($K=60$).
5. 🎯 **Deep-Linked Source Viewer & Verified Grounding:**
   - **YouTube Viewer:** Embed player automatically executes `player.seekTo(timestamp)` on citation click.
   - **PDF Viewer:** Highlights page number and exact cited text snippet.
6. 🎓 **Sequential Multi-Source Study Plan & Curriculum Roadmap:** Generates step-by-step learning modules pinned to PDF pages & video timestamps with completion tracking and celebration rewards.
7. 🎴 **3D Interactive Flashcards with Grounding Links:**
   - 3D flip-cards with front/back toggle, progress tracking, mastered states, and `Source Reference [N]` clickable citation links.
   - Celebratory **Canvas Confetti explosion** and trophy banner upon deck mastery.
8. 🎙️ **Dual-Voice AI Audio Podcast Overview & Episode Length Control:**
   - 2-host audio discussion (Alex & Blake) with synchronized transcript playback and variable speeds (`1.0x` to `1.5x`).
   - **Episode Length Selector:** Choose between **`Short (~1-2m)`** (4-6 turns), **`Medium (~3-4m)`** (8-10 turns), or **`Detailed (~5-8m)`** (12-16 turns).
9. 💡 **Proactive Discoveries & Insights Engine:** Autonomous AI Research Analyst cross-reasoning across documents to surface *Contradictions*, *Hidden Relationships*, *Missing Information*, *Trends*, *Surprising Facts*, and *Actionable Insights*.
10. 🎨 **Glassmorphic UI & Workspace Skeleton Loader:** Smooth workspace initialization and routing transitions with `WorkspaceLoader`.

---

## 📐 System Architecture

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer Browser"]
        UI["Next.js React Frontend (Midnight Obsidian Theme)"]
        Viewer["Deep-Linked Source Viewer - PDF / YouTube Player"]
        AudioEngine["Web Speech Dual-Voice Audio Engine"]
        WorkspaceLoader["Glassmorphic Workspace Loader"]
    end

    subgraph QueueLayer ["Persistent Queue & Background Worker Layer"]
        BaseQueue["BaseQueue Abstraction (BullMQ Queue)"]
        BaseWorker["BaseWorker Abstraction (3 Concurrent Workers, 5-Min Lock)"]
        BaseEvents["BaseQueueEvents Monitor"]
        RedisStorage[("Redis Persistent Storage - Render / Upstash / Local")]
    end

    subgraph SecurityLayer ["Security & Gateway Layer"]
        Clerk["Clerk Auth Cloud & Middleware"]
        Guardrails["Input & Output Guardrail Checkers"]
    end

    subgraph HybridRAGEngine ["The Hybrid Mix RAG Engine"]
        Deconstruct["Query Deconstruction"]
        HyDE["HyDE Generator"]
        MultiQuery["Multi-Query Expansion"]
        RRF["Reciprocal Rank Fusion (RRF)"]
    end

    subgraph DataLayer ["Cloud Data Layer"]
        NeonDB[("Neon Postgres Cloud DB - Prisma ORM")]
        Qdrant[("Qdrant Cloud Vector DB")]
        S3[("AWS S3 Object Storage")]
    end

    UI --> Clerk
    Clerk --> BaseQueue
    BaseQueue --> RedisStorage
    RedisStorage --> BaseWorker
    BaseWorker --> BaseEvents
    BaseWorker --> Qdrant
    BaseWorker --> NeonDB
    
    Guardrails --> Deconstruct
    Deconstruct --> HyDE
    Deconstruct --> MultiQuery
    HyDE --> Qdrant
    MultiQuery --> Qdrant
    Qdrant --> RRF
    RRF --> UI

    Viewer <--> UI
    AudioEngine <--> UI
    WorkspaceLoader <--> UI
```

---

## 🗄️ Relational Database Schema (Prisma ORM for Neon Postgres)

```prisma
model Notebook {
  id          String   @id @default(uuid())
  userId      String   // Clerk User ID
  title       String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  sources     Source[]
  notes       Note[]
  studyPlans  StudyPlan[]
}

model Source {
  id           String   @id @default(uuid())
  notebookId   String
  notebook     Notebook @relation(fields: [notebookId], references: [id], onDelete: Cascade)
  title        String
  type         String   // "pdf" | "text" | "url" | "youtube" | "vtt"
  urlOrPath    String?
  s3Key        String?
  s3Url        String?
  status       String   @default("pending") // "pending" | "indexing" | "ready" | "error"
  errorMessage String?
  content      String?  @db.Text
  createdAt    DateTime @default(now())
}
```

---

## 🛠️ Environment Variables Setup (`.env`)

Create a `.env` file in the root directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Neon PostgreSQL Database
DATABASE_URL="postgresql://user:pass@ep-cool-pool.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Qdrant Vector DB
QDRANT_URL="https://your-cluster.us-east-1-0.aws.cloud.qdrant.io:6333"
QDRANT_API_KEY="your-qdrant-api-key"

# OpenAI API Key
OPENAI_API_KEY="sk-..."

# Redis Configuration for BullMQ Queue (Render Redis / Upstash / AWS ElastiCache / Local)
REDIS_URL="rediss://default:password@your-upstash-db.upstash.io:6379"
# Or separate parameters:
# REDIS_HOST="localhost"
# REDIS_PORT=6379
# REDIS_PASSWORD=""
QUEUE_NAME="document-ingestion-queue"

# YouTube Transcript Authenticated Cookies (Optional - for bot/LOGIN_REQUIRED protection)
YT_COOKIES_PATH="/etc/secrets/cookies.txt"

# AWS S3 (Optional Object Storage)
AWS_REGION="ap-south-1"
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
AWS_S3_BUCKET_NAME="bucket-name"
```

---

## 💻 Getting Started Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Production Verification & Build
To verify production bundle compilation:

```bash
npm run build
```

---

## 🚀 Deploying to Render (Docker Web Service)

1. **Connect Repo**: Create a new **Web Service** on Render and connect your GitHub repository.
2. **Environment**: Choose **Docker** as the runtime environment. Render will automatically use the root `Dockerfile`.
3. **Provision Redis**:
   - Create a **Render Redis** instance or use an **Upstash Redis** database.
   - Copy the connection string to `REDIS_URL` in your Render Web Service Environment variables.
4. **Environment Variables**: Add your `.env` variables (`DATABASE_URL`, `QDRANT_URL`, `QDRANT_API_KEY`, `OPENAI_API_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `REDIS_URL`, `QUEUE_NAME`).
5. **Attach Cookies File (Secret Files)**:
   - In Render Dashboard under **Secret Files**, create a secret file named `cookies.txt` containing your Netscape-formatted YouTube cookies.
   - Set Environment Variable: `YT_COOKIES_PATH=/etc/secrets/cookies.txt`.
