# AI-Powered Learning Management System with Local RAG Architecture

## Abstract

This project presents a full-stack Learning Management System (LMS) augmented by a local Retrieval-Augmented Generation (RAG) pipeline. The system enables educators to upload PDF course materials, which are automatically processed into vector embeddings, semantically chunked, and stored in a PostgreSQL database with pgvector extensions. A local large language model (LLM) running through Ollama generates structured educational content — learning units, summaries, quizzes, and explanations — grounded exclusively in the uploaded materials. An AI tutor provides context-aware answers via the same RAG pipeline. Every AI operation runs entirely on local hardware with no external API dependencies, ensuring data privacy and offline capability suitable for university environments.

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

The system follows a three-tier monorepo architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  Vite + TypeScript + TailwindCSS + TanStack Query       │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐  │
│  │Teacher  │ │Student   │ │AI Tutor│ │Unit Test     │  │
│  │Dashboard│ │Courses   │ │Chat    │ │Interface     │  │
│  └────┬────┘ └────┬─────┘ └───┬────┘ └──────┬───────┘  │
│       └───────────┴───────────┴──────────────┘          │
│                        │ HTTP/JSON                      │
└────────────────────────┼────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────┐
│              API Server (Node.js + Express)              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌─────┐ │
│  │Course│ │Upload│ │Gener-│ │Review│ │Tutor │ │Prog-│ │
│  │Routes│ │Routes│ │ate   │ │Routes│ │Routes│ │ress │ │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬──┘ │
│     └────────┴────────┴────────┴────────┴─────────┘     │
│                        │                                │
│  ┌─────────────────────┴──────────────────────────┐     │
│  │           Core Libraries                       │     │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────────┐  │     │
│  │  │ PDF      │ │Chunking  │ │Prompt         │  │     │
│  │  │Extraction│ │+Filtering│ │Templates      │  │     │
│  │  └──────────┘ └──────────┘ └───────────────┘  │     │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────────┐  │     │
│  │  │ Ollama   │ │ RAG      │ │Safe JSON      │  │     │
│  │  │ Client   │ │Retrieval │ │Parse          │  │     │
│  │  └──────────┘ └──────────┘ └───────────────┘  │     │
│  └────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────┐
│           Database (PostgreSQL + pgvector)              │
│  ┌─────────┐ ┌──────┐ ┌──────────┐ ┌──────┐ ┌───────┐ │
│  │ courses │ │units │ │questions │ │chunks│ │progress│ │
│  │ (core)  │ │(gen) │ │(gen)     │ │(vec) │ │(track)│ │
│  └─────────┘ └──────┘ └──────────┘ └──────┘ └───────┘ │
└─────────────────────────────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────┐
│              Local AI (Ollama)                          │
│  ┌─────────────────┐   ┌──────────────────────────┐    │
│  │ nomic-embed-text │   │ qwen2.5 / llama3.1       │   │
│  │ (embeddings)     │   │ (text generation)        │   │
│  │ 768-dim vectors  │   │ 7B parameters            │   │
│  └─────────────────┘   └──────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | React 19 + TypeScript | UI components and state management |
| Build Tool | Vite 7 | Development server and production bundling |
| Styling | TailwindCSS 4 | Utility-first CSS framework |
| API Client | TanStack Query 5 | Server state management, caching, mutation |
| Routing | wouter | Lightweight hash-based client routing |
| UI Components | shadcn/ui (Radix primitives) | Accessible UI component library |
| Backend Framework | Express 5 + TypeScript | HTTP server and routing |
| Database ORM | Drizzle ORM | Type-safe SQL query builder |
| Database | PostgreSQL 15 + pgvector | Relational storage and vector similarity search |
| Database Hosting | Supabase | Managed PostgreSQL hosting with pgvector support |
| AI Embeddings | Ollama + nomic-embed-text | 768-dimensional text embeddings |
| AI Generation | Ollama + qwen2.5 / llama3.1 | Local LLM for content generation |
| PDF Parsing | pdf-parse (pdfjs-dist) | Server-side PDF text extraction |
| Package Manager | pnpm | Monorepo workspace management |
| Build System | esbuild | Fast TypeScript compilation for API server |

### 1.3 Monorepo Structure

```
├── package.json              # Root workspace config
├── pnpm-workspace.yaml       # Workspace package definitions
├── tsconfig.base.json        # Shared TypeScript configuration
│
├── lib/
│   └── db/                   # Shared database library
│       └── src/
│           ├── db.ts                 # PostgreSQL pool + Drizzle client
│           ├── migrate.ts            # Schema migration runner
│           ├── index.ts              # Public exports
│           └── schema/               # Database table definitions
│               ├── index.ts
│               ├── users.ts
│               ├── courses.ts
│               ├── uploaded_files.ts
│               ├── document_chunks.ts
│               ├── course_units.ts
│               ├── course_questions.ts
│               ├── student_progress.ts
│               ├── test_attempts.ts
│               ├── tutor_conversations.ts
│               └── tutor_messages.ts
│
├── artifacts/
│   ├── api-server/           # Backend API server
│   │   └── src/
│   │       ├── index.ts              # Server entry point with migration runner
│   │       ├── app.ts                # Express app config (CORS, middleware, error handling)
│   │       ├── routes/               # HTTP route handlers
│   │       │   ├── index.ts
│   │       │   ├── health.ts
│   │       │   ├── courses.ts
│   │       │   ├── saved-courses.ts
│   │       │   ├── upload.ts
│   │       │   ├── generate.ts
│   │       │   ├── review.ts
│   │       │   ├── tutor.ts
│   │       │   ├── progress.ts
│   │       │   └── debug.ts
│   │       └── lib/                  # Core libraries
│   │           ├── ollama.ts
│   │           ├── chunking.ts
│   │           ├── extract-pdf.ts
│   │           ├── rag.ts
│   │           ├── prompt-templates.ts
│   │           ├── safe-json-parse.ts
│   │           ├── route-error.ts
│   │           └── logger.ts
│   │
│   └── edugenai/             # Frontend application
│       └── src/
│           ├── App.tsx               # Root component with routing
│           ├── context/
│           │   └── CourseContext.tsx  # Global course state management
│           ├── lib/
│           │   └── api.ts            # API client (typed HTTP requests)
│           ├── components/
│           │   ├── ui/               # shadcn/ui components
│           │   └── layout.tsx        # Shared layout shell
│           └── pages/
│               ├── teacher-dashboard.tsx
│               ├── pdf-upload.tsx
│               ├── course-generation.tsx
│               ├── teacher-review.tsx
│               ├── student-courses.tsx
│               ├── student-course.tsx
│               ├── ai-tutor.tsx
│               └── unit-test.tsx
```

---

## 2. Database Schema

The database uses 10 tables managed through Drizzle ORM. All tables use PostgreSQL's `SERIAL` primary keys and `TIMESTAMP WITH TIME ZONE` for temporal data.

### 2.1 Entity Relationship Summary

```
users ──1:N──> courses ──1:N──> uploaded_files
                            ──1:N──> document_chunks
                            ──1:N──> course_units ──1:N──> course_questions
                            ──1:N──> student_progress
                            ──1:N──> test_attempts
                            ──1:N──> tutor_conversations ──1:N──> tutor_messages
```

### 2.2 Table Specifications

**users** — System users with role-based access (`student`, `teacher`). Minimal profile storage (name, email, role).

**courses** — Core course entity. Contains AI-generated `units` and `questions` as JSONB snapshots for legacy compatibility alongside normalized `course_units` and `course_questions` tables. Tracks status lifecycle through `status` and `processingStage` fields. Stores raw `pdfText` and `filename`. Error states captured in `processingError` and `generationError`.

**uploaded_files** — Tracks uploaded PDF files per course. Stores original filename, server path, file size, MIME type, and processing status (`processed`, `chunkCount`).

**document_chunks** — Central to the RAG pipeline. Each row stores one text chunk with its 768-dimensional pgvector embedding. Indexed on `course_id` and `file_id` for efficient retrieval filtering. Metadata JSONB stores page number and character offsets.

**course_units** — AI-generated learning units. Each belongs to a course and carries title, description, content, order index, and review status (`pending_review`, `approved`). Supports teacher notes for regeneration instructions.

**course_questions** — AI-generated multiple-choice questions. Each belongs to a unit within a course. Stores question text, options array, correct answer letter, explanation, chunk reference, and review status.

**student_progress** — Per-student, per-unit progress tracking. Records completion status, score, and total possible score.

**test_attempts** — Stores complete test submission history per student per unit. Includes answers array (question ID, selected answer, correctness), score, total, and optional feedback.

**tutor_conversations** — AI tutor chat sessions scoped to a course and student.

**tutor_messages** — Individual messages within a tutor conversation. Stores role (`user`/`assistant`), content, and source citations (array of chunk references with similarity scores and excerpts).

### 2.3 Vector Storage Design

The `document_chunks.embedding` column uses the `vector(768)` type from pgvector, matching the output dimensionality of `nomic-embed-text`. The pgvector extension enables cosine distance computation directly in SQL via the `<=>` operator:

```sql
SELECT id, content, 1 - (embedding <=> '[0.1, 0.2, ...]'::vector) AS similarity
FROM document_chunks
WHERE course_id = $1
  AND 1 - (embedding <=> '[0.1, 0.2, ...]'::vector) >= $2
ORDER BY similarity DESC
LIMIT $3;
```

Two B-tree indexes on `course_id` and `file_id` accelerate the initial filter step. An IVFFlat index on the embedding column is omitted because the dataset per course is typically small (under 200 chunks), making brute-force cosine similarity acceptable.

---

## 3. PDF Extraction Pipeline

### 3.1 Architecture

The PDF extraction pipeline is implemented in `artifacts/api-server/src/lib/extract-pdf.ts` and operates as follows:

```
PDF File (Buffer)
    │
    ▼
pdf-parse with custom pagerender
    │
    ├── Page 1: getTextContent() → text items
    │   ├── Item 1: { str: "GIS", transform: [10, 0, 0, 12, 50, 700], width: 30 }
    │   ├── Item 2: { str: "Masoud", transform: [10, 0, 0, 12, 85, 700], width: 50 }
    │   └── buildPageText() → "GIS Masoud" (space inserted due to gap detection)
    │
    ├── Page 2: ...
    │
    └── Page N: ...
           │
           ▼
    ExtractedPage[] (per-page text)
           │
           ▼
    ExtractionQuality assessment
           │
           ├── PASS: continue to cleaning + chunking
           │
           └── FAIL: throw error with quality report
```

### 3.2 The Spacing Problem

The default `pdf-parse` render function concatenates text items on the same line with no separator: `text += item.str`. This causes adjacent text fragments — which represent separate words in the PDF — to merge into tokens like `"GISMasoud"` instead of `"GIS Masoud"`.

The fix in `buildPageText()` computes the horizontal gap between consecutive text items on the same Y baseline:

```
gap = currentItem.x - (previousItem.x + previousItem.width)
spaceThreshold = fontHeight × 0.15
if gap > spaceThreshold AND currentItem.str not in [".", ",", ";", ":"]:
    result += " " + currentItem.str
else:
    result += currentItem.str
```

This preserves reading order while inserting spaces at word boundaries. The 0.15× font-height threshold accounts for PDF sub-word positioning without over-splitting.

### 3.3 Scanned PDF Detection

`isScannedPdf()` identifies image-only PDFs by two heuristics:
- Less than 30% of pages contain more than 20 characters of extractable text
- Average text per page is below 30 characters

If a PDF fails this check, the quality assessment returns a failure message directing the user to upload a text-based PDF or enable OCR support.

### 3.4 Extraction Quality Assessment

`assessExtractionQuality()` computes six metrics before any chunking or embedding occurs:

| Metric | Threshold | Purpose |
|--------|-----------|---------|
| Total character count | < 100 → fail | Detect empty/near-empty extractions |
| Word count | < 20 → fail | Detect insufficient content |
| Average word length | > 20 → fail | Detect merged-word corruption |
| Lines-with-spaces ratio | < 0.3 → fail (if >5 lines) | Detect line-break corruption |
| Coherent paragraphs | 0 despite >50 chars → fail | Detect fragmented extraction |
| Scanned PDF probability | true → fail | Detect image-only PDFs |

If any metric fails, processing halts with the message: *"The PDF text could not be extracted cleanly. [specific reasons]. Please upload a text-based PDF or enable OCR support."*

---

## 4. Text Cleaning and Chunk Filtering

### 4.1 Cleaning Pipeline

After extraction, text passes through two cleaning stages in `chunking.ts`:

**Stage 1 — `cleanText()`:**
- Normalizes line endings (`\r\n` → `\n`, `\r` → `\n`)
- Replaces tabs and form feeds with spaces
- Removes control characters (null bytes, ASCII 0x00–0x1F)
- Filters out lines that are: single characters, pure numbers, page numbers, short reference/bibliography headers
- Collapses multiple spaces and excessive newlines
- Normalizes bullet characters (• ● ▪ ➢ → ⇒ → ASCII `-`)

**Stage 2 — `fixMergedWords()`:**
- Inserts spaces at camelCase boundaries: `"GeographicInformationSystem"` → `"Geographic Information System"`
- Handles transitions between uppercase runs and lowercase: `"GISMasoud"` → `"GIS Masoud"`
- Handles transitions between lowercase and uppercase runs: `"dataFlow"` → `"data Flow"`

### 4.2 Chunk Quality Filter

After chunking, `filterChunks()` evaluates each chunk against seven rejection criteria:

| Criterion | Threshold | Rationale |
|-----------|-----------|-----------|
| Too short | < 30 characters | Insufficient semantic content for embedding |
| Too few words | < 5 words | Fragment, not meaningful text |
| Merged words | Avg word length > 15 | Failed spacing correction |
| Char-to-word ratio | < 2.0 avg | Mostly whitespace or symbols |
| Reference section | >50% lines match citation pattern | Bibliography/references, not educational content |
| Citation-heavy | >20% of words match citation patterns | Academic citations, not course material |
| Mostly punctuation | >40% non-alphabetic characters | Equation fragments, page numbers, noise |

Rejected chunks are logged with index, preview, and rejection reason. If all chunks are rejected, processing stops with an error explaining the cause. This prevents low-quality or noisy text from being embedded and polluting the vector database.

---

## 5. RAG Pipeline

### 5.1 Embedding Generation

Embeddings are generated using the `nomic-embed-text` model via Ollama's HTTP API (`/api/embeddings`). Each chunk produces a 768-dimensional float vector. The connection pattern uses per-chunk connection acquisition and release to prevent timeout issues during long embedding runs:

```
for each chunk:
    client = pool.connect()
    embedding = await generateEmbedding(chunk.content)
    INSERT INTO document_chunks (embedding, content, ...)
    client.release()
```

### 5.2 Retrieval Flow

```
User Query (e.g., "What is GIS?")
    │
    ▼
generateEmbedding(query) → 768-dim vector
    │
    ▼
SELECT id, content, 1 - (embedding <=> query_vector) AS similarity
FROM document_chunks
WHERE course_id = $1              ← MANDATORY course filter
  AND similarity >= threshold     ← similarity floor (default 0.4)
ORDER BY similarity DESC
LIMIT topK                        ← default 5
    │
    ▼
Validation loop:
    for each retrieved chunk:
        if chunk.courseId !== requestedCourseId:
            throw CRITICAL ERROR (cross-course data leak)
    │
    ▼
Return RetrievedChunk[] with content, similarity, metadata
```

Key design decisions:

**Course ID filter is mandatory.** Every `SELECT` on `document_chunks` includes `WHERE course_id = $1`. This is enforced at the application layer, not relied upon solely from database indexing. A post-retrieval validation loop double-checks that every returned chunk belongs to the requested course and throws a critical error if any mismatch is found.

**Similarity threshold prevents low-quality matches.** The default threshold of 0.4 (cosine similarity) ensures retrieved chunks bear meaningful semantic similarity to the query. Lower thresholds return more results but with diminishing relevance.

**Top-K limits context window.** The default of 5 chunks keeps the LLM context window manageable while providing sufficient source material.

### 5.3 Delete-Before-Insert Strategy

When a course is re-processed (new PDF upload), the system deletes ALL existing data for that course before inserting new data:

```
1. deleteAllCourseChunks(courseId)     ← all document_chunks for course
2. DELETE FROM course_questions WHERE course_id = $1
3. DELETE FROM course_units WHERE course_id = $1
4. Insert new chunks from new PDF
5. Generate new units and questions
```

This prevents stale chunks from a previous upload from being retrieved during generation of the new content. The deletion is course-scoped, not file-scoped, ensuring no orphan chunks remain.

### 5.4 Retrieval for Tutor Chat

The AI tutor endpoint (`POST /api/tutor/chat`) performs RAG retrieval before generating each response:

1. User sends a question with `courseId`
2. System generates embedding of the question
3. System retrieves top-5 chunks from `document_chunks` filtered by `courseId`
4. If no chunks meet the similarity threshold, responds: *"The uploaded course material does not contain enough information to answer this question."*
5. Otherwise, chunks are formatted into a context prompt and sent to the LLM alongside the conversation history
6. The LLM response is streamed via Server-Sent Events (SSE) back to the frontend
7. Retrieved chunks are stored as `sources` in the `tutor_messages` table and displayed to the student

---

## 6. Local AI Integration

### 6.1 Ollama Client Architecture

The Ollama client (`ollama.ts`) communicates with the local Ollama instance over HTTP. Key components:

| Function | Endpoint | Model | Purpose |
|----------|----------|-------|---------|
| `checkOllamaHealth()` | `GET /api/tags` | — | Health check on startup |
| `generateEmbedding(text)` | `POST /api/embeddings` | nomic-embed-text | Convert text to 768-dim vector |
| `generateText(prompt)` | `POST /api/chat` | qwen2.5 / llama3.1 | Synchronous text generation |
| `streamChat(messages)` | `POST /api/chat (stream: true)` | qwen2.5 / llama3.1 | Streaming text generation for tutor |

Model selection is configurable via environment variables:

```
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_GENERATION_MODEL=qwen2.5:7b
OLLAMA_BASE_URL=http://localhost:11434
```

### 6.2 Generation Parameters

```
Temperature: 0.3     ← Low temperature for factual, deterministic output
Max tokens: 4096     ← Sufficient for unit content generation
Context window: 2048 ← Adequate for tutor chat with sources
```

The low temperature (0.3) is a deliberate choice for educational content generation. Higher temperatures produce more creative but less reliable output. Since the system requires factual grounding in source materials, low temperature reduces hallucination risk at the cost of some variability.

### 6.3 Privacy Advantages of Local AI

All AI inference runs on the local machine with no external API calls. This provides:

- **Data sovereignty:** Student and course data never leaves the institution's network
- **Offline capability:** No internet connection required for core functionality
- **No API costs:** No per-token billing from cloud providers
- **FERPA/GDPR compliance:** Educational data remains under institutional control
- **Customization:** Models can be swapped or fine-tuned without vendor lock-in

---

## 7. Content Generation Pipeline

### 7.1 Course Generation Flow

The generation process (`POST /api/courses/:courseId/generate`) runs asynchronously after the PDF has been processed into chunks. The flow:

```
1. Validate course status (must be "ready", "draft", or "failed")
2. Verify chunks exist (getCourseChunkCount > 0)
3. Delete old units and questions (clean slate)
4. Set generationStatus = "generating_units"
5. Retrieve ALL course chunks (threshold=0.0, topK=200)
6. Sort chunks by chunkIndex
7. Group chunks:
   unitCount = ceil(chunkCount / 3), clamped to [2, 5]
   chunksPerUnit = ceil(chunkCount / unitCount)
8. For each group of chunks:
   a. Build unit generation prompt with chunk content
   b. Call generateText() → AI returns JSON
   c. Parse with safeJsonParse()
   d. Validate unit (title length, content length, objectives)
   e. If valid → use AI unit
   f. If invalid/parse error → create fallback unit from chunk text
9. Insert all validated units into course_units (status = "pending_review")
10. For each inserted unit:
    a. Build question generation prompt with unit content + chunks
    b. Call generateText() → AI returns JSON questions
    c. Validate each question (text, options, correctAnswer)
    d. Insert validated questions into course_questions
    e. If < 2 valid questions → generate fallback questions
11. Set course status = "review_pending", generationStatus = "completed"
```

### 7.2 Unit Grouping Logic

Chunks are grouped by sequential index (not by semantic clustering). This decision was made for simplicity and reliability: sequential PDF chunks naturally correspond to sequential course sections. The chunk count determines unit count:

```
unitCount = max(2, min(5, ceil(totalChunks / 3)))
```

For a course with 18 chunks: `unitCount = ceil(18/3) = 6` → clamped to 5 → 5 groups of ~3–4 chunks each.

### 7.3 Fallback Generation

When AI generation fails (malformed JSON, empty response, validation failure), the system falls back to deterministic extraction from chunk text:

- **Fallback units:** Extract first heading-like line as title, first 2 sentences as description, concatenated chunk text as content, generic learning objectives
- **Fallback questions:** Extract a meaningful sentence from chunk content as the question premise, generate generic options, mark "A" as correct with the extracted sentence as explanation

This ensures the generation pipeline never produces zero output even when the local LLM produces unusable responses.

### 7.4 Safe JSON Parsing

AI-generated JSON is notoriously unreliable. The `safeJsonParse()` function handles common failure modes:

1. Strips markdown code fences (```json ... ```)
2. Extracts first JSON object or array from text (handles leading/trailing text)
3. Escapes unescaped backslashes
4. Removes ASCII control characters
5. First attempt: `JSON.parse(candidate)`
6. On failure: replaces literal newlines with `\n` escapes and retries
7. On second failure: returns `{ success: false, error, raw }` for fallback handling

---

## 8. API Architecture

### 8.1 Route Map

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| GET | `/api/healthz` | health.ts | Server + Ollama health check |
| GET | `/api/courses` | courses.ts | List all courses |
| GET | `/api/courses/published` | courses.ts | List published courses |
| GET | `/api/courses/teacher/:id` | courses.ts | List teacher's courses |
| GET | `/api/courses/:id` | courses.ts | Get single course |
| POST | `/api/courses` | courses.ts | Create course |
| PUT | `/api/courses/:id/publish` | courses.ts | Publish approved course |
| DELETE | `/api/courses/:id` | courses.ts | Delete course with all related data |
| POST | `/api/courses/:id/upload` | upload.ts | Upload PDF file |
| GET | `/api/courses/:id/files` | upload.ts | List course files |
| POST | `/api/courses/:id/process` | upload.ts | Process uploaded PDF (extract → chunk → embed) |
| POST | `/api/courses/:id/generate` | generate.ts | Generate course content (units + questions) |
| GET | `/api/courses/:id/units` | review.ts | List course units with questions |
| PUT | `/api/courses/:id/units/:uid/approve` | review.ts | Approve a unit |
| POST | `/api/courses/:id/units/:uid/regenerate` | generate.ts | Regenerate a unit |
| GET | `/api/courses/:id/questions` | review.ts | List course questions |
| GET | `/api/courses/:id/units/:uid/questions` | review.ts | List unit questions |
| PUT | `/api/courses/:id/questions/:qid/approve` | review.ts | Approve a question |
| POST | `/api/courses/:id/questions/:qid/regenerate` | generate.ts | Regenerate a question |
| PUT | `/api/courses/:id/approve` | review.ts | Approve entire course |
| POST | `/api/tutor/chat` | tutor.ts | AI tutor chat (SSE stream) |
| GET | `/api/progress/:courseId` | progress.ts | Get student progress |
| PUT | `/api/progress` | progress.ts | Save/update progress |
| POST | `/api/tests/:courseId/attempts` | progress.ts | Submit test attempt |
| GET | `/api/tests/:courseId/attempts` | progress.ts | List test attempts |
| GET | `/api/debug/integrity` | debug.ts | Debug: full system integrity check |
| GET | `/api/debug/courses/:id/integrity` | debug.ts | Debug: per-course integrity |

### 8.2 Background Processing Pattern

Upload processing and content generation follow the same pattern:

1. **Immediate response:** The endpoint validates inputs and returns HTTP 202 (Accepted) with `{ message: "Processing started" }`
2. **Async execution:** The heavy work runs in a `.catch()` handler after the response is sent
3. **Status polling:** The frontend polls `GET /api/courses/:id` to check `status`, `processingStage`, `processingError`, `generationStatus`, `generationError`
4. **Error persistence:** Failures are written to the database (`processingError` or `generationError`) so they survive server restarts

This prevents HTTP timeouts during long operations (PDF processing can take 30–120 seconds; content generation can take 2–10 minutes depending on chunk count).

### 8.3 Error Handling

Route handlers use `handleRouteError()` which logs the error via pino and returns a structured JSON response with status 500. Background operations use `handleBackgroundError()` which logs but cannot send an HTTP response. The global Express error handler (line 49 of `app.ts`) catches unhandled errors and returns a 500 response with optional stack trace in non-production environments.

---

## 9. Frontend Architecture

### 9.1 Component Tree

```
App
└── QueryClientProvider
    └── TooltipProvider
        └── CourseProvider (React Context for course state)
            └── WouterRouter
                └── Layout (shared navigation shell)
                    ├── TeacherDashboard  (/)        → list courses, create, delete
                    ├── PdfUpload         (/upload)   → upload + process PDF
                    ├── CourseGeneration   (/generate) → trigger generation, monitor status
                    ├── TeacherReview     (/review)   → approve units/questions, regenerate
                    ├── StudentCourses    (/courses)  → browse published courses
                    ├── StudentCourse     (/student-course) → view units, study content
                    ├── AiTutor           (/tutor)    → chat with AI tutor
                    └── UnitTest          (/test)     → take unit tests
```

### 9.2 State Management

The application uses two complementary state management strategies:

**React Context (`CourseContext`):** Manages globally shared course state — the active `courseId`, the `GeneratedCourse` object (title, units, questions), `pdfText`, `filename`, and processing statuses. The `setCourseId` function includes a guard that clears all stale course data when the user navigates to a different course, preventing display of units from a previously viewed course.

**TanStack Query:** Manages server state for course listings, progress data, and test attempts. Query keys follow the pattern `["api", "courses", ...]` and are invalidated after mutations (e.g., after publishing a course, the courses list query is invalidated to trigger a refetch).

### 9.3 Course Context Scoping

The `setCourseId` function uses a functional updater pattern to compare the previous and new course IDs:

```typescript
const setCourseId = (id: number | null) => {
  setCourseIdState((prev) => {
    if (prev !== null && id !== null && prev !== id) {
      setCourse(null);
      setPdfText("");
      setFilename("");
      setProcessingStatus("");
      setGenerationStatus("");
    }
    return id;
  });
};
```

This ensures that when a student navigates from one course page to another, the UI does not briefly flash stale data from the previous course while the new data loads.

### 9.4 Content Display

Rendered unit content (`student-course.tsx`) uses the `renderUnitContent()` function which:
- Splits content on double newlines (`\n\n`) for paragraph boundaries (not single `\n`)
- Detects bullet lists (lines starting with `-` or `*`) and renders them as `<ul>` with `<li>` items
- Detects numbered lists (lines starting with `\d+.`) and renders them as `<ol>`
- Falls back to `<p>` tags for plain paragraphs

This replaces a naive `split("\n")` approach that created a new paragraph for every line break, including mid-paragraph line wraps.

### 9.5 Page Navigation with Course ID

Frontend navigation passes `courseId` as a URL query parameter: `/student-course?courseId=22`. Pages resolve the course ID from the URL using `useMemo` with `URLSearchParams`, falling back to the context value. `useEffect` dependencies include `resolvedCourseId` to trigger re-fetching when the user navigates between courses.

---

## 10. Teacher Workflow

### 10.1 Course Creation

```
Teacher Dashboard (/) → "Create New Course" → POST /api/courses → 201 Created
```

The teacher enters a title and optional description. The course is created with `status = "draft"`.

### 10.2 PDF Upload and Processing

```
Course Card → "Upload" → /upload → POST /api/courses/:id/upload (multipart PDF)
                                         → POST /api/courses/:id/process (async)
                                              → extract-pdf.ts (page-level extraction)
                                              → cleanText() + fixMergedWords()
                                              → assessExtractionQuality() ← fails here if low quality
                                              → chunkText() (1500-char chunks, 250-char overlap)
                                              → filterChunks() ← rejects low-quality chunks
                                              → storeChunks() ← generate embeddings, insert to pgvector
                                              → status = "ready"
```

During processing, the frontend polls `GET /api/courses/:id` every 2 seconds and displays:
- Progress bar with stage labels: "Extracting text..." → "Chunking..." → "Generating embeddings..." → "Storing vectors..."
- Error display if processing fails (scanned PDF, insufficient text, etc.)
- Toast notifications on completion

### 10.3 Content Generation

```
"Ready" status → "Generate" button → POST /api/courses/:id/generate (async)
                                         → generateCourseContent()
                                              → Delete old units/questions
                                              → Generate units (AI per chunk group)
                                              → Generate questions (AI per unit)
                                              → Insert into course_units + course_questions
                                              → status = "review_pending"
```

The frontend polls for status changes and shows a generation progress indicator.

### 10.4 Review and Approval

```
/review page → GET /api/courses/:id/units
                   → Units displayed with expandable content
                   → Each unit shows its questions with options
                         ↓
              Approve Unit → PUT /api/courses/:id/units/:uid/approve
              Regenerate Unit → POST /api/courses/:id/units/:uid/regenerate
              Approve Question → PUT /api/courses/:id/questions/:qid/approve
              Regenerate Question → POST /api/courses/:id/questions/:qid/regenerate
                         ↓
              "Approve Course" → PUT /api/courses/:id/approve
                         ↓
              "Publish Course" → PUT /api/courses/:id/publish → status = "published"
```

The teacher reviews each unit and question, approves acceptable content, regenerates unsatisfactory content, and finally approves the entire course. Only then can the course be published and made visible to students.

### 10.5 Why Teacher Review Is Mandatory

AI-generated educational content requires human validation for several reasons:

- **Factual accuracy:** Local LLMs can hallucinate facts not present in the source material
- **Pedagogical quality:** AI may misjudge the appropriate depth or scope for a given educational level
- **Alignment with curriculum:** The AI cannot know the external curriculum context or prerequisite knowledge
- **Cultural and linguistic appropriateness:** Automated generation may produce culturally insensitive content
- **Legal liability:** Educational institutions must verify materials before publishing

---

## 11. Student Workflow

### 11.1 Course Browsing

```
/courses → GET /api/courses/published → List of published courses
            Course card: title, description, assessment plan, unit/question counts
            Click → store courseId in context + URL → navigate to /student-course
```

### 11.2 Course Study

```
/student-course → GET /api/courses/:id (course details)
                  GET /api/courses/:id/units (units with questions)
                  GET /api/progress/:courseId?studentId=X (student progress)
                       ↓
            Unit list with completion status
                       ↓
            Select unit → view:
              - Unit objectives
              - Unit content (formatted paragraphs + bullet lists)
              - Associated questions
              - "Take Test" button
              - "AI Tutor" button
```

### 11.3 Unit Testing

```
/unit-test?courseId=X&unitId=Y → GET /api/courses/:courseId/units/:unitId/questions
                                       ↓
            Radio group with question options
            Submit → POST /api/tests/:courseId/attempts
                  → PUT /api/progress (mark unit completed)
                  → Show score + correct/incorrect feedback
```

### 11.4 AI Tutoring

```
/tutor?courseId=X → POST /api/tutor/chat (SSE stream)
                     ↓
            Chat interface with streaming response
            Retrieved sources shown in collapsible panel
            Conversation history maintained in-memory for session
            Sources stored in tutor_messages table for audit
```

---

## 12. Course Status Lifecycle

```
                        ┌──────────┐
                        │  draft   │ (initial creation)
                        └────┬─────┘
                             │ upload PDF
                        ┌────▼─────┐
                        │ uploaded  │
                        └────┬─────┘
                             │ process
                        ┌────▼─────┐
                        │processing│ (extracting → chunking → embedding)
                        └────┬─────┘
                   ┌─────────┴──────────┐
                   ▼                    ▼
             ┌──────────┐         ┌──────────┐
             │  ready   │         │  failed  │
             └────┬─────┘         └──────────┘
                  │ generate        │ retry
             ┌────▼─────┐          │
             │generating│          │
             └────┬─────┘          │
        ┌────────┴────────┐        │
        ▼                 ▼        │
  ┌──────────┐      ┌──────────┐   │
  │review_pend│      │  failed  │   │
  │ ing      │      │ (generat)│   │
  └────┬─────┘      └──────────┘   │
       │ approve       │           │
  ┌────▼─────┐         └───────────┘
  │ approved  │
  └────┬─────┘
       │ publish
  ┌────▼─────┐
  │published │ (visible to students)
  └──────────┘
```

---

## 13. Course Isolation Architecture

### 13.1 The Isolation Problem

In a multi-course RAG system, the most critical failure mode is cross-course data leakage — retrieving document chunks from Course A when generating content for Course B. This would cause the AI to generate units based on unrelated materials, producing nonsensical or plagiarized content.

### 13.2 Isolation Mechanisms

The system implements course isolation at three layers:

**Database layer:** Every `document_chunks` row carries a `course_id` foreign key. All retrieval queries include `WHERE course_id = $1`.

**Application layer:** The `retrieveRelevantChunks()` function validates each returned chunk:

```typescript
for (const c of retrieved) {
  if (c.courseId !== courseId) {
    throw new Error(
      `CRITICAL: Retrieved chunk id=${c.id} has courseId=${c.courseId} ` +
      `but requested courseId=${courseId}. This indicates a cross-course ` +
      `data leak bug that must be fixed immediately.`
    );
  }
}
```

**Content generation layer:** The `generateCourseContent()` function deletes all existing units and questions for a course before regenerating, ensuring no stale cross-course data persists in the teaching interface.

**Frontend layer:** The `CourseContext.setCourseId()` function clears all cached course data when the course ID changes, preventing stale frontend state from displaying previous course content.

### 13.3 Integrity Verification

The debug endpoints (`/api/debug/integrity` and `/api/debug/courses/:courseId/integrity`) provide a queryable view of data distribution across courses. They return chunk counts, unit counts, question counts, and file counts grouped by `course_id`, enabling manual verification of isolation.

---

## 14. Prompt Engineering

### 14.1 Tutor System Prompt

The tutor uses a system prompt that:
1. Identifies itself as an AI tutor for the specific course title
2. Restricts answers exclusively to provided course material
3. Specifies a fallback response when information is unavailable
4. Instructs the AI to handle broken PDF extraction text (merged words, incomplete sentences, bibliography fragments)

### 14.2 Unit Generation Prompt

The unit generation prompt includes:
1. The chunk context (source material)
2. Strict rules about using only provided material
3. Explicit JSON output format specification
4. Instructions for handling broken text (infer correct word separation, ignore bibliography fragments, rewrite into clean paragraphs)
5. Minimum content length requirement (300 words)

### 14.3 Question Generation Prompt

The question generation prompt specifies:
1. Exactly 2 questions per unit
2. Different concepts per question
3. 4 options labeled A–D
4. Correct answer as a letter
5. Explanations referencing specific material
6. Instructions to ignore bibliography and page numbers in context

---

## 15. Implementation Challenges

### 15.1 PDF Extraction Quality

Academic PDFs (especially lecture slides and scanned textbooks) produce notoriously poor text extraction. The `pdf-parse` library's default render function concatenates text items without spaces, causing merged words. Slide-based PDFs often position text unpredictably, breaking reading order. The solution was a custom page renderer with horizontal gap detection, but this remains imperfect — some PDFs use character-level positioning that defeats gap-based spacing.

### 15.2 Malformed AI JSON

Local LLMs frequently produce malformed JSON — missing closing braces, unescaped strings, trailing commas, markdown code fences, or explanatory text surrounding the JSON. The `safeJsonParse()` function with its two-stage retry and code fence stripping handles most cases, but some generations are completely unrecoverable, requiring fallback to deterministic content.

### 15.3 Poor Chunk Quality

When PDF extraction is poor, chunks contain garbled text. Embedding garbage text produces garbage vectors, which retrieve garbage content, which causes the AI to generate garbage units. The chunk quality filter (`filterChunks()`) rejects obviously bad chunks, but the line between "poor but salvageable" and "unusable" is blurry. The extraction quality assessment catches many cases early, but some poor extractions pass through to produce low-quality output.

### 15.4 Vector Retrieval Mistakes

Semantic similarity does not always align with pedagogical relevance. A chunk containing a tangential mention of a concept may score higher than a chunk explaining it in depth. The system compensates with chunk grouping (sequential indices) for generation and similarity threshold filtering for tutor retrieval, but these heuristics are imperfect.

### 15.5 Stale Frontend State

When a student navigates from one course to another, the TanStack Query cache may briefly serve stale data from the previous course. The fix required making `useEffect` dependencies include `resolvedCourseId` and clearing context state on course ID changes. This was a recurring bug during development.

### 15.6 Incorrect Course Isolation

Early versions of the retrieval query omitted the `WHERE course_id = $1` clause, retrieving chunks from all courses. This was caught during testing and fixed, but it highlighted the danger of implicit assumptions about data isolation in a shared-database RAG system.

### 15.7 Local Model Limitations

Seven-billion parameter models (qwen2.5, llama3.1) running on laptop hardware have limited reasoning capability compared to cloud models like GPT-4. Generation quality suffers on complex or highly technical content. The low temperature (0.3) reduces creativity but also makes the model more repetitive. Context window limits (2048–4096 tokens) restrict how many chunks can be included in a single generation prompt.

### 15.8 Performance Limitations

On a typical laptop, PDF processing (extraction + embedding generation) takes 30–120 seconds for a 200-page textbook. Content generation (5 units, 10 questions) takes 2–10 minutes. The per-chunk connection release pattern in `storeChunks()` was required because holding a database connection open for the duration of embedding generation caused Supabase pooler timeouts.

### 15.9 Scanned PDFs and OCR Limitations

Image-based PDFs (scanned documents, some lecture slides) produce zero or near-zero extractable text. The system detects these via the extraction quality check and returns a clear error, but this is a limitation rather than a solution. Full OCR integration (Tesseract, OCRmyPDF, or document intelligence APIs) would be needed to handle scanned documents, which is noted as future work.

---

## 16. Future Improvements

### 16.1 OCR Support

Integrate Tesseract.js or OCRmyPDF to extract text from scanned/image-based PDFs. This would require detecting image-only pages and routing them through the OCR pipeline while handling text-based pages normally.

### 16.2 Multimodal Learning

Extend the system to handle figures, diagrams, and tables embedded in PDFs. Current extraction discards all visual information. A multimodal approach could extract figure captions, table text, and diagram labels as contextual metadata.

### 16.3 Better Adaptive Testing

Implement computerized adaptive testing (CAT) where question difficulty adjusts based on student performance. The current system uses fixed question sets per unit. An adaptive approach would select questions dynamically based on demonstrated knowledge.

### 16.4 Analytics Dashboard

Add teacher-facing analytics: per-unit completion rates, question difficulty analysis, time-spent tracking, common wrong answers, and student progress heatmaps. This would require additional data collection and a dashboard interface.

### 16.5 Collaborative Learning

Add discussion forums, peer review, or group study features. The current system is single-student. Collaborative features would require real-time messaging, moderation, and group management.

### 16.6 Multilingual Support

The current system operates in one language (determined by the uploaded PDF and the LLM's training). Adding translation or multilingual model support would enable courses in multiple languages, though the local LLM's language capabilities may be limited for less common languages.

### 16.7 Better Chunk Ranking

Replace sequential chunk grouping with semantic clustering or hierarchical retrieval. Current grouping assumes sequential PDF pages correspond to sequential course sections, which is not always true. Hierarchical retrieval could select representative chunks from each semantic cluster for generation.

### 16.8 Fine-Tuned Local Models

Fine-tune the local LLM on educational content generation tasks. A model fine-tuned specifically for curriculum design, quiz generation, and educational explanation would produce higher quality output than general-purpose models. LoRA (Low-Rank Adaptation) fine-tuning is feasible on consumer hardware.

### 16.9 Agentic Educational Workflows

Implement multi-step AI agents for complex educational tasks:
- **Curriculum design agent:** Analyzes PDF table of contents to determine optimal unit structure
- **Assessment agent:** Designs question difficulty curves across units
- **Remediation agent:** Identifies struggling students and suggests targeted review materials
- **Socratic tutor agent:** Guides students through problems with leading questions instead of direct answers

---

## 17. Security and Privacy Considerations

### 17.1 Data Flow

```
Student PDF    →  Local File System  →  Database (Supabase)
                                              ↓
                                      Vector Search (local)
                                              ↓
                                      LLM Generation (local Ollama)
                                              ↓
                                      Response → Frontend
```

No data leaves the local network. The database can be self-hosted or use a managed service with network isolation.

### 17.2 Threats and Mitigations

| Threat | Mitigation |
|--------|-----------|
| Cross-course data leak | Course ID filter at DB + application + validation layers |
| SQL injection | Parameterized queries via Drizzle ORM and raw `pg` with `$1` placeholders |
| PDF-borne malware | Multer file filter (PDF only), server-side buffer validation |
| Unauthorized course access | Status-based access control (published vs. draft) |
| AI hallucination | Teacher review gating + retrieval grounding + low temperature |
| Supply chain attack | pnpm minimum release age (1440 min), dependency lockfile |
| Database credential leak | DATABASE_URL environment variable, redaction in pino logs |

### 17.3 University Privacy Advantages

For university deployment, the local AI architecture provides:
- No student data sent to third-party AI providers
- No API usage records created by cloud AI services
- No model training on institutional data
- Compliance with institutional data retention policies
- Ability to audit all AI inputs and outputs (stored in database)
- Operation in isolated/air-gapped networks

---

## 18. Environment Configuration

The system is configured through environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | (required) | API server port |
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_EMBEDDING_MODEL` | `nomic-embed-text` | Embedding model name |
| `OLLAMA_GENERATION_MODEL` | `llama3.1` | Generation model name |
| `RAG_TOP_K` | `5` | Retrieved chunks per query |
| `RAG_SIMILARITY_THRESHOLD` | `0.5` | Cosine similarity minimum |
| `MAX_CHUNKS_FOR_DEMO` | `200` | Maximum chunks per course |
| `RUN_MIGRATIONS_ON_STARTUP` | `true` | Auto-run DB migrations |
| `NODE_ENV` | (unset) | `production` disables stack traces |
| `LOG_LEVEL` | `info` | Pino log level |

---

## 19. Development and Build

### 19.1 Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+ with pgvector extension
- Ollama with nomic-embed-text and qwen2.5/llama3.1 models pulled

### 19.2 Setup

```bash
pnpm install
cp .env.example .env   # Configure DATABASE_URL, PORT, etc.
pnpm run build         # Type-check + build all packages
```

### 19.3 Build Commands

```
pnpm run build          # Full build (type-check + compile all packages)
pnpm run typecheck      # TypeScript type-check only
pnpm run typecheck:libs # Type-check shared libraries
```

### 19.4 Package Architecture

Three workspaces under the monorepo:

- `lib/db` — Shared database library (Drizzle schema, pg pool, migrations)
- `artifacts/api-server` — Express API server (esbuild bundled)
- `artifacts/edugenai` — React frontend (Vite bundled)

Shared dependencies are catalog-managed via `pnpm-workspace.yaml` to ensure version consistency across packages.

---

## 20. Conclusion

This project demonstrates a fully functional AI-powered Learning Management System with local RAG architecture. The system successfully grounds AI-generated educational content in teacher-provided materials, maintains strict course isolation, and operates entirely on local hardware with no external AI dependencies.

The architecture addresses the core challenge of educational AI — generating accurate, contextualized, and pedagogically sound content from domain-specific materials — while maintaining data privacy and institutional control. The teacher-in-the-loop review process provides quality assurance, while the local RAG pipeline ensures AI responses remain grounded in source materials.

Limitations in PDF extraction quality, local model capability, and OCR support represent the primary areas for future work. The modular architecture allows each subsystem (extraction, chunking, retrieval, generation) to be improved independently as better tools and models become available.
