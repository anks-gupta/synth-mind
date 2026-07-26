# ⚡ SynthMind — AI Grounded Research Assistant & Multi-Source Synthesis Engine

**SynthMind** is a production-grade AI research assistant and knowledge synthesis workspace inspired by Google NotebookLM. It allows users to ingest 5 distinct knowledge source formats (PDFs, YouTube Videos, Web URLs, VTT Transcripts, and Plain Text), ask questions grounded in those sources, and receive answers with precise numerical citations `[1]`, `[2]`.

When a citation is clicked, SynthMind's **Deep-Linked Source Viewer** automatically seeks embedded YouTube videos to the exact cited timestamp (`t=seconds`) or highlights PDF pages!

---

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20SynthMind-10B981?style=for-the-badge)](https://synth-mind-ai.vercel.app)

## 🌟 Key Features

1. 📚 **Multi-Notebook Workspace Management:** Isolated knowledge bases per notebook with scoped loading, workspace skeletons, and Neon Postgres DB persistence.
2. 📥 **5-in-1 Source Ingestion Engine & 4-Tier YouTube Caption Extractor:**
   - 📄 **PDF Documents:** Extracts text & page numbers.
   - 🎥 **YouTube Videos (4-Tier Resilient Caption Extraction):** Combines direct watch-page requests (with `CONSENT` cookies to bypass Vercel/Render datacenter IP blocking), mobile/desktop User-Agent fallbacks, `youtube-caption-extractor` (iOS/Android InnerTube profiles), and `youtube-transcript`.
   - 🌐 **Web URL Scraper:** Clean HTML body extraction via Cheerio with deep text fragment anchors.
   - ⏱️ **VTT Transcripts:** Parses timestamped subtitle files.
   - 📝 **Plain Text / MD:** Normalizes raw text notes.
3. ⚡ **Asynchronous Task Queue System (`TaskQueue`):**
   - **Concurrency Management:** Limits active background ingestion workers (max 3 concurrent jobs) to prevent memory or API rate-limit exhaustion.
   - **Exponential Backoff Retries:** Automatically retries transient job failures up to 3 times.
   - **Serverless Execution Protection:** Dynamically leverages Vercel's `waitUntil` to guarantee background jobs complete reliably on cloud serverless infrastructure without getting terminated early.
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

    subgraph QueueLayer ["Async Queue & Background Job Layer"]
        TaskQueue["TaskQueue Manager (Concurrency Control)"]
        IngestionQueue["Ingestion Job Queue (3 Retries & Exponential Backoff)"]
        ServerlessGuard["Serverless waitUntil Execution Guard"]
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
    Clerk --> TaskQueue
    TaskQueue --> IngestionQueue
    IngestionQueue --> ServerlessGuard
    ServerlessGuard --> Qdrant
    ServerlessGuard --> NeonDB
    
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

## 🛠️ Environment Variables Setup (`.env.local`)

Create a `.env.local` file in the root directory:

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
