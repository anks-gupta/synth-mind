# Technical Design Document: SynthMind (HLD & LLD)

**Author:** Senior Technical Architect & Product Engineering Team  
**System:** SynthMind - AI-Powered Grounded Research Assistant  
**Stack:** Next.js (App Router), Clerk Auth, Neon Serverless Postgres (Prisma ORM), Qdrant Cloud Vector DB, BullMQ + Redis Queue System, OpenAI / Gemini APIs, Render / Docker  

---

## 1. High-Level Design (HLD)

### 1.1 System Architecture Overview

The system follows a production-grade, decoupled microservices-ready architecture. Heavy document ingestion tasks (PDF extraction, YouTube caption parsing with oEmbed title resolution, vector embedding, and Qdrant upserts) are decoupled from HTTP API routes using a **Production-Grade BullMQ + Redis Task Queue System** (`src/queue/`). Jobs are stored persistently in Redis (Render Redis / Upstash / AWS ElastiCache), enabling queue durability across Docker container restarts and deployments. Retrieval uses **The Hybrid Mix RAG Engine** combining Query Deconstruction, HyDE, Multi-Query, and Reciprocal Rank Fusion (RRF).

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer Browser"]
        UI["Next.js React Frontend"]
        Viewer["Deep-Linked Source Viewer - PDF / YouTube"]
        Confetti["Canvas Celebration Confetti Engine"]
    end

    subgraph GatewayLayer ["Security & API Gateway Layer"]
        Clerk["Clerk Auth Cloud & Middleware"]
        RouteHandlers["Next.js App Router API Handlers"]
        Guardrails["Input & Output Guardrail Checkers"]
    end

    subgraph QueueLayer ["Persistent Queue & Background Worker Subsystem"]
        BaseQueue["BaseQueue Abstraction (BullMQ Queue)"]
        BaseWorker["BaseWorker Abstraction (3 Concurrent Workers, 5-Min Lock)"]
        BaseEvents["BaseQueueEvents Real-time Event Monitor"]
        RedisStorage[("Redis Persistent Storage - Render / Upstash / Local")]
    end

    subgraph HybridRAGEngine ["The Hybrid Mix RAG Engine"]
        Deconstruct["Query Deconstruction"]
        HyDE["HyDE Generator"]
        MultiQuery["Multi-Query Expansion"]
        RRF["Reciprocal Rank Fusion (RRF)"]
    end

    subgraph DataLayer ["Cloud Data Layer"]
        NeonDB[("Neon Postgres Cloud DB - Prisma")]
        Qdrant[("Qdrant Cloud Vector DB")]
    end

    subgraph ExternalLayer ["External AI APIs"]
        OpenAI["OpenAI / Gemini API"]
    end

    UI --> Clerk
    Clerk --> RouteHandlers
    RouteHandlers --> BaseQueue
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
    RRF --> OpenAI
    OpenAI --> Guardrails
    Guardrails --> UI

    Viewer <--> UI
    Confetti <--> UI
```

---

### 1.2 Core Subsystem Boundaries

#### 1. Auth & Identity Subsystem (Clerk Cloud & Modular Middleware)
- Manages user identity, OAuth providers (Google/GitHub), JWT session tokens, and path-matched route protection via `middleware.ts`.
- Every incoming API handler delegates authorization to `authorizeNotebookAccess` (`src/lib/auth-helpers.ts`) to enforce strict tenant isolation boundaries across database and vector queries.

#### 2. Persistent Task Queue Subsystem (`src/queue/` & BullMQ + Redis)
- Decouples long-running ingestion operations from HTTP request cycles.
- **Queue Core Architecture:**
  - [`src/queue/redis.ts`](file:///Users/anks/Documents/projects/notebookllm/src/queue/redis.ts): ioredis connection factory parsing `REDIS_URL` or host/port parameters with automatic Upstash SSL/TLS (`rediss://`) support and exponential backoff retry strategy.
  - [`src/queue/queue.ts`](file:///Users/anks/Documents/projects/notebookllm/src/queue/queue.ts): `BaseQueue<TData>` wrapper encapsulating BullMQ `Queue` with job retention (last 50 completed, last 100 failed).
  - [`src/queue/worker.ts`](file:///Users/anks/Documents/projects/notebookllm/src/queue/worker.ts): `BaseWorker<TData>` wrapper configuring 3 concurrent workers, 5-minute lock duration (`lockDurationMs: 300000`), and `SIGINT`/`SIGTERM` process exit signal handling.
  - [`src/queue/events.ts`](file:///Users/anks/Documents/projects/notebookllm/src/queue/events.ts): Real-time progress and status event monitoring.
  - [`src/queue/index.ts`](file:///Users/anks/Documents/projects/notebookllm/src/queue/index.ts): Lazy singleton proxy (`documentIngestionQueue`) preventing Next.js static build phase socket connections.

#### 3. Multi-Source Ingestion & Binary Storage Subsystem
- Responsible for fetching, extracting, and normalizing content from 5 input types:
  1. **PDF Files:** Extracted via `pdf-parse` retaining page numbers.
  2. **Plain Text / MD:** Directly normalized.
  3. **Web URLs:** Scraped using `cheerio` + HTML text sanitization.
  4. **YouTube Videos:** Fetches video metadata + original video title via oEmbed API (`youtube.com/oembed`) + timestamped transcript captions (`start`, `duration`).
  5. **VTT / Transcript Files:** Regex parsing of WebVTT format capturing timestamps (`00:01:20 --> 00:01:45`).
- Maintains ingestion lifecycle states in Neon DB: `pending` ➔ `indexing` ➔ `ready` | `error`.
- Dual Binary Storage: Generates 15-minute expiring AWS S3 presigned URLs when AWS S3 is enabled, with automatic local disk storage fallback (`./uploads/sources/`) for local offline environments.

#### 4. Vector Indexing Subsystem (Qdrant Cloud)
- Chunks raw text into overlapping windows (600 tokens, 100 overlap).
- Generates 1536-dimensional embeddings using OpenAI `text-embedding-3-small`.
- Upserts vectors into Qdrant Cloud collection `notebook_chunks` with rich payload tags:
  `{ notebook_id, source_id, source_type, text, page_number, start_time }`.

#### 5. The Hybrid Mix RAG & Citation Engine
- **Query Deconstruction:** Splits compound user queries into single-intent sub-questions.
- **HyDE & Multi-Query Expansion:** Generates 3 semantic variations + a hypothetical document excerpt to bridge layman-to-jargon vocabulary gaps.
- **Reciprocal Rank Fusion (RRF):** Scores and fuses retrieved candidate chunk lists ($K=60$).
- **Streaming & Citations:** Streams tokens with numerical citation badges `[1]`, `[2]`.

#### 6. Dual-Voice Audio Podcast Subsystem & Length Selector
- **Synthesizer API (`/api/audio-overview`):** Accepts `length` parameter (`short`, `medium`, `long`).
- Dynamically configures LLM turn length instructions (4-6 turns for `short`, 8-10 for `medium`, 12-16 for `long`).

#### 7. 3D Flashcards & Confetti Celebration Engine (`src/lib/confetti.ts`)
- Zero-dependency canvas confetti rendering engine.
- Triggers particle explosion physics when user masters 100% of a flashcard deck or completes 100% of a study plan roadmap.

---

## 2. Low-Level Design (LLD)

### 2.1 Database Schema (Prisma ORM for Neon Postgres)

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
