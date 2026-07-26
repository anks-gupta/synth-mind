# Submission-Ready Product Requirement Document (PRD): SynthMind

## Executive Summary
This document outlines the product requirements and feature specifications for **SynthMind**—an AI-powered research assistant and multi-source synthesis engine built specifically to fulfill and exceed all 120-mark evaluation criteria for the assignment.

**SynthMind** features **Clerk Authentication** for user management, **Neon Serverless Postgres (Prisma ORM)** for relational metadata, **Qdrant Vector Database** for high-performance payload-filtered RAG vector search, **The Hybrid Mix RAG Engine** (Query Deconstruction, HyDE, Multi-Query, RRF Fusion), **Input & Output Guardrail Checkers**, ingestion of 5 distinct source types (PDF, Plain Text, Web URLs, YouTube Videos with oEmbed title fetching, and VTT/Transcript files), a grounded RAG query engine with streaming, deep-linked citations (including YouTube video timestamp jumping), dual-voice AI Audio Podcast Overviews with episode length selection (`Short`, `Medium`, `Detailed`), **3D Interactive Flashcards with Grounding Links & Canvas Confetti Rewards**, and a **Sequential Multi-Source Study Plan & Roadmap Generator** pinpointed to exact pages and video timestamps.

---

## 1. Rubric Mapping & Score Alignment (120 Total Marks)

| Evaluation Parameter | Marks | Architectural & Feature Implementation Strategy |
| :--- | :---: | :--- |
| **1. Notebook Management** | 10 | Multi-notebook CRUD (Create, Rename, Delete). **Clerk Auth** + **Neon Postgres DB** + **Qdrant namespace isolation** + **Scoped Panel Loaders** during notebook switching. |
| **2. Source Ingestion** | 20 | Ingest 5 required formats: **PDF, Plain Text, Website URL, YouTube Video (oEmbed Title Resolution), VTT/Transcript**. Asynchronous status pipeline (`pending` ➔ `indexing` ➔ `ready`). S3 presigned URLs + local disk storage fallback. |
| **3. RAG Pipeline** | 20 | **The Hybrid Mix RAG Engine:** Query Deconstruction + HyDE + Multi-Query Reformulation + Reciprocal Rank Fusion (RRF) + Qdrant vector payload filtering. |
| **4. AI Responses** | 15 | Grounded prompt design, streaming responses via Vercel AI SDK (`streamText`), `gpt-4o-mini` / Gemini 2.5 Flash for minimal cost & zero hallucination. |
| **5. Citations & Attribution**| 15 | Strict markdown citations `[1]`, `[2]`. Unified Source Viewer (`SourceViewer.tsx`): YouTube embeds jump to exact timestamp `t=sec`, PDFs show page number (`#page=N`), VTT/Text highlight chunk. |
| **6. Architecture & Code Quality**| 10 | Clean Next.js 16 App Router, TypeScript, **Prisma + Neon Postgres**, **Qdrant Client**, **Clerk Middleware**, modular services (`lib/auth-helpers.ts`, `lib/hybrid-retriever.ts`, `lib/guardrails.ts`, `lib/confetti.ts`). |
| **7. UI & UX** | 10 | Modern dark glassmorphic design system ("Midnight Obsidian & Electric Emerald"), responsive 3-pane layout, interactive 3D flashcards, celebration confetti, podcast length controls. |
| **8. README & Docs** | 10 | Thorough `README.md` and `docs/` folder with system architecture mermaid diagrams, database ERD, environment variable table, and RAG retrieval flow explanations. |
| **9. Demo Video Guide** | 10 | Script and guide to capture end-to-end features, user login, RAG citations, YouTube timestamp jump, roadmap completion, and podcast length generation. |
| **10. Overall Engineering** | 10 | Production Cloud DB (Neon) + Vector DB (Qdrant) + Auth (Clerk), Input/Output Guardrails, Self-Correction Retries, local fallback storage, optimized for $3 OpenAI credit limit. |

---

## 2. RAG Strategy: The Hybrid Mix Engine

SynthMind combines 5 advanced RAG techniques into a single pipeline:
1. **Input Guardrail Checker (`validateInputQuery`):** Rejects prompt injection attempts, API key theft instructions, and unreadable gibberish.
2. **Query Deconstruction (`deconstructQuery`):** Splits compound user questions into single-intent sub-questions.
3. **Multi-Query Expansion (`generateMultiQueries`):** Generates 3 semantic variations using alternate technical phrasing.
4. **HyDE (`generateHyDeAnswer`):** Generates a hypothetical 2-sentence document/transcript excerpt to match vector embeddings even when users use layman phrasing.
5. **Reciprocal Rank Fusion (`applyReciprocalRankFusion`):** Fuses and re-ranks candidate chunk lists ($K=60$).
6. **Output Faithfulness Guardrail & Self-Correction Retry (`verifyAnswerGrounding`):** Verifies that every claim in the LLM answer has numerical citation badges `[1]`, `[2]`, executing a self-correction retry if badges are missing.

---

## 3. Signature "Our Touch" Features

### Feature 1: Sequential Multi-Source Study Plan & Curriculum Roadmap Generator 🎓
- Automatically analyzes all uploaded sources in a notebook and generates a structured, step-by-step sequential learning curriculum.
- Includes click-to-open links pinpointed to exact PDF pages (e.g. Page 14) and YouTube timestamps (e.g. 04:15) with progress tracking and Canvas Confetti completion rewards.

### Feature 2: 3D Interactive Flashcards with Citation Grounding & Confetti 🎴
- Interactive 3D flip-cards with front/back toggles, progress tracking, mastered states, `Source Reference [N]` clickable links, and celebratory Canvas Confetti rewards upon deck completion.

### Feature 3: Dual-Voice AI Audio Podcast Overview & Length Selector 🎙️
- Synthesizes a 2-host podcast conversation (Alex & Blake) with synchronized transcript playback and flexible episode duration options (`Short ~1-2m`, `Medium ~3-4m`, `Detailed ~5-8m`).

---

## 4. UI Layout & Visual Theme ("Midnight Obsidian & Electric Emerald")

- **Background:** `#0B0F17` (Midnight Slate)
- **Glassmorphic Containers:** `#111827` with 70% opacity & `#1E293B` borders
- **Primary Accent / CTAs:** `#10B981` (Electric Emerald) & `#8B5CF6` (Electric Violet)
- **Citation Badges:** `#F59E0B` (Amber Gold) & `#6366F1` (Indigo Blue)
