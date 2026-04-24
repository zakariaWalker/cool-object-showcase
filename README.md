# QED — Next-Generation AI Mathematics Platform

> **Mission:** Transform mathematics education in the Arab world through a transparent, knowledge-graph-driven AI tutor that deconstructs problems into atomic pedagogical patterns rather than acting as a black box.

QED (formerly *Math Flow Arabia*) is a State-of-the-Art (SOTA) educational platform engineered for **multi-country curricula** (Algeria BAC/BEM, and beyond), with first-class support for **Arabic typography**, **Right-to-Left (RTL)** layouts, and rigorous mathematical rendering.

---

## 🌟 Core Vision

QED is built on three foundational pillars:

1. **Knowledge-Base First**: Every exercise, pattern, and skill is stored in a **structured Knowledge Graph** (KB) — not as flat text. AI is used to *map onto* this graph, not to invent answers.
2. **Pedagogical Transparency**: Students see *why* a step works (Logic Stack, Deconstruction View) — not just the answer.
3. **Adaptive & Diagnostic**: Real-time gap detection drives a personalized learning path with spaced repetition (SM-2 algorithm).

---

## 👥 Roles & Modules

QED is a multi-role platform. Each role has a dedicated dashboard with role-specific permissions.

| Role | Path | Purpose |
|------|------|---------|
| 🎓 **Student** | `/student` | Learning path, exercises, flashcards, badges, class enrollment |
| 👨‍🏫 **Teacher** | `/teacher` | Curriculum builder, lesson editor, class management, performance monitoring |
| 👪 **Parent** | `/parent` | View child's progress, weak areas, activity log (formal Arabic UX) |
| 🛡️ **Admin** | `/admin` | User management, content review, billing, platform analytics, curriculum configuration |

---

## 🧭 Key Features

### 1. 🎯 Adaptive Diagnostic Engine (`/diagnostic`, `/gaps`)
- **Real-Time Gap Detection** via the `DiagnosticProfiler` and `MisconceptionDetector`.
- **Adaptive Rounds** that re-calibrate difficulty based on prior performance.
- **AI-powered correction** through the `ai-correct-diagnostic` edge function with graceful fallback to a static pool when rate-limited (429/503).
- Identifies issues like `sign_error`, `distribution_error`, `bracket_error`, `exponent_error`, `missing_term`.

### 2. 📚 Intelligent Exercise Library (`/exercises`)
- Custom **`MathExerciseRenderer`** — high-fidelity mixed Arabic + LaTeX rendering via KaTeX.
- **Automatic Question Splitting**: crowded problem statements are reformatted into a vertical, scannable list.
- **Data Highlighting**: numeric tokens and key mathematical terms are visually emphasized.
- Backed by `kb_exercises` table with cognitive metadata (Bloom level, step count, difficulty).

### 3. ✍️ Step-by-Step Editors
- **Algebra Editor**: live LaTeX preview, level-aware toolbar (Primary / Middle / BAC).
- **Geometry Editor / Workspace**: analytic + synthetic geometry construction.
- **Functions, Probability, Statistics Workspaces**: each with a dedicated specialized engine in `src/engine/`.

### 4. 🧠 Pedagogical SOTA Engine
- **Logic Stack** (`LogicStack.tsx`): visualizes the chain of inference between steps.
- **Deconstruction View** (`KBDeconstructionView`, `FreeDeconstruct`): breaks an exercise into `Needs`, `Concepts`, and `Patterns`.
- **Knowledge Graph 3D** (`KnowledgeGraph3D`, `KBNetworkGraph`): admin-side visualization of the skill dependency network.

### 5. 🏆 Gamification Ecosystem
- **XP, Levels, Streaks** (`gamification.ts` + `student_progress` table).
- **Badges & Achievements** (`AchievementGallery`).
- **Daily challenges** with rotating exercises.

### 6. 📝 Exam System (BAC, BEM, Devoirs)
- **Exam Builder** (`ExamBuilder`, `ExamBuilderPanel`): manual + AI-assisted assembly from the KB.
- **Auto-Corrector** (`ExamCorrectorPanel`): grades student submissions.
- **Confidence Analysis** ("Break the Fear"): data-driven debunking of exam hype.
- **Bloom Taxonomy Analysis**: cognitive profile per exam.
- **Blueprint Engine** (`exam_blueprints`): aggregates topic distribution / difficulty patterns across years.
- **PDF Import** (`parse-exam-pdf`): bulk parallel ingestion with metadata extraction (year, session, stream).
- **Comparison Engine** (`compare-exams`): side-by-side official vs. generated exam analytics.

### 7. 📖 Textbook Pipeline
- Upload PDF textbooks → `parse-textbook` → structured `textbook_chapters` → `textbook_lessons` → `textbook_activities`.
- Skills auto-linked via `textbook_skill_links` and `extract-skills` edge function.

### 8. 🔍 RAG Pipeline (Retrieval-Augmented Generation)
- `kb_embeddings` table with **pgvector + HNSW index**.
- `generate-embeddings` populates vectors; `rag-retrieve` performs semantic search.
- Used by the AI Tutor and exam/exercise generators for grounded answers.

### 9. 🌍 Multi-Country Curriculum
- `countries`, `country_grades`, `curriculum_mappings` tables.
- `CountryGradePicker` + `CurriculumGuard` enforce that students only see content for their declared country/grade.
- Skills marked `is_universal` are shared across curricula.

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite 5 + TypeScript 5 (strict) |
| **Styling** | Tailwind CSS v3 + semantic HSL design tokens (`index.css`) |
| **Animations** | Framer Motion |
| **Math Rendering** | KaTeX + MathLive (custom `MathContent` wrapper) |
| **UI Primitives** | shadcn/ui + Radix |
| **Backend** | Lovable Cloud (managed Supabase) |
| **Database** | PostgreSQL + pgvector (HNSW) |
| **Auth** | Supabase Auth (Email + Google OAuth) |
| **Edge Runtime** | Deno (Supabase Edge Functions) |
| **AI Provider** | Google Gemini (via shared `_shared/gemini.ts` with retry + fallback chain) |
| **Routing** | React Router v6 |
| **State** | Zustand stores (`useAdminKBStore`, `useExamKBStore`) |
| **Testing** | Vitest + Playwright |

---

## 📂 Project Structure

```
src/
├── admin/             # Admin role app + pages (UserManagement, Billing, Analytics)
├── teacher/           # Teacher role app + pages (CurriculumBuilder, ClassMonitor)
├── student/           # Student role app + pages (LearningPath, FlashcardReview)
├── parent/            # Parent role app + pages (WeakAreas, ActivityLog)
├── pages/             # Shared/public pages (Landing, Auth, Diagnostic, ExamBuilder)
├── components/        # Reusable components
│   ├── ui/            # shadcn primitives
│   ├── admin/         # Admin-specific (KBNetworkGraph, KnowledgeGraph3D)
│   ├── exam/          # Exam tooling (Builder, Corrector, KB importers)
│   └── profile/       # Profile widgets
├── engine/            # Core math + pedagogical logic
│   ├── geometry/      # Geometry engine
│   ├── knowledge/     # KB analyzer + store
│   ├── rules/         # Algebra rule set
│   └── *.ts           # parser, tokenizer, scoring, gamification, misconception-detector
├── hooks/             # useAuth, useUserCurriculum, useCountryGrades
├── shared/            # DashboardLayout, ProtectedRoute, MathText, StatCard
├── lib/               # gemini client, tma utils, grade utils
├── integrations/
│   └── supabase/      # client.ts + types.ts (auto-generated, DO NOT EDIT)
└── index.css          # HSL design tokens (semantic only)

supabase/
├── functions/         # Edge functions (Deno)
│   ├── _shared/       # Shared gemini.ts helper (retry + JSON sanitization)
│   ├── ai-tutor/
│   ├── ai-deconstruct/
│   ├── ai-correct-diagnostic/
│   ├── compare-exams/
│   ├── generate-automated-exam/
│   ├── generate-diagnostic-assessment/
│   ├── generate-embeddings/
│   ├── parse-exam-pdf/
│   ├── parse-textbook/
│   ├── rag-retrieve/
│   └── extract-skills/
├── migrations/        # SQL migrations (managed by Lovable Cloud)
└── config.toml
```

---

## 🗄️ Database Schema Highlights

### Knowledge Base (Source of Truth)
- `kb_skills` — atomic skills (universal or curriculum-specific) with Bloom level, difficulty, domain.
- `kb_exercises` — exercises with cognitive metadata and country code.
- `kb_patterns` — reusable solution patterns with steps + concepts.
- `kb_deconstructions` — links exercises to patterns + needed concepts.
- `kb_embeddings` — pgvector embeddings (HNSW) for RAG.
- `kb_skill_dependencies` — directed prerequisite graph.
- `kb_skill_exercise_links`, `kb_skill_pattern_links`, `kb_course_skill_links` — many-to-many graph edges.

### Exam System
- `exam_uploads` → `exam_extracted_questions` → analytics.
- `exam_kb_entries` → `exam_kb_questions` → `exam_kb_question_skill_links`.
- `built_exams`, `exam_corrections`, `exam_blueprints`.

### Student Progress
- `profiles` (country_code + grade_code).
- `student_progress` (XP, level, streak, mastery JSON, badges).
- `student_sm2` (SM-2 spaced-repetition scheduling).
- `student_knowledge_gaps`, `student_activity_log`.
- `attempts` — every exercise attempt.

### Multi-Country
- `countries`, `country_grades`, `curriculum_mappings`.

### Class & Parent Linking
- `classes`, `class_enrollments`, `parent_students`, `student_join_codes`.

> **All tables enforce Row-Level Security (RLS).** Public read for shared KB content; user-scoped writes for personal data. Roles never live on `profiles` — see `<user-roles>` convention.

---

## 🔐 Authentication & Authorization

- **Email + Password** + **Google OAuth** (no anonymous sign-ups).
- Email verification required (auto-confirm disabled by default).
- **Public routes**: `/`, `/auth`, `/annales`, `/archive-solve`, `/diagnostic` (anonymous diagnostic flow).
- **Protected routes**: enforced by `ProtectedRoute` component.
- **Admin identity**: `admin@mathkb.com` is the designated primary admin.
- **Curriculum guard**: `CurriculumGuard` redirects users with no country/grade to `/onboarding`.

---

## 🤖 AI Infrastructure

All AI calls flow through `supabase/functions/_shared/gemini.ts`, which provides:

- **Multi-model fallback chain**: `gemini-2.5-flash` → `gemini-2.5-flash-lite` → `gemini-2.0-flash` → `gemini-2.0-flash-lite` on 503/500/504.
- **Exponential backoff** on 429 (1.5s → 3s).
- **JSON sanitization**: state-aware escape fixer for malformed LaTeX in AI JSON responses.
- **Strict JSON mode**: `responseMimeType: "application/json"` enforced for structured outputs.
- **Time-budget guards**: 130s soft timeout to stay under the 150s edge function limit; long jobs return `truncated: true` for client-side batching.

### AI-Powered Edge Functions
| Function | Purpose |
|----------|---------|
| `ai-tutor` | Conversational step-by-step tutoring |
| `ai-deconstruct` | Decomposes exercises into needs / patterns / steps |
| `ai-correct-diagnostic` | Grades diagnostic answers + identifies misconceptions |
| `ai-improve-patterns` | Refines pattern descriptions in the KB |
| `generate-automated-exam` | Builds exams from the KB matching a blueprint |
| `generate-diagnostic-assessment` | Creates personalized diagnostic batteries (with static fallback) |
| `compare-exams` | Side-by-side analytics for two exam JSON payloads |
| `parse-exam-pdf` | Extracts structured questions from uploaded PDFs |
| `parse-textbook` / `extract-textbook-pdf` | Ingests textbook PDFs into chapters → lessons → activities |
| `extract-skills` | Pulls skill candidates from raw lesson text |
| `generate-embeddings` | Populates `kb_embeddings` |
| `rag-retrieve` | Semantic search over the KB |

---

## 🎨 Design System

- **High-contrast light mode** with a warm off-white background (`HSL 40 30% 97%`).
- **All colors live in `src/index.css`** as HSL tokens — never hard-coded in components.
- **Typography**: Tajawal / Inter optimized for Arabic + math clarity.
- **Section gradients**: distinct color-coded headers (Diagnostic = Blue/Indigo, Exam = Amber, Learning Path = Gold/Blue/Green/Purple/Orange/Pink).
- **Audio**: subtle, natural cues only — no game/arcade sounds.
- **RTL-first**: every layout, animation, and icon is RTL-aware.

---

## 🌍 Localization

- **Primary language**: Modern Standard Arabic (formal tone for Parent module, accessible tone for Student).
- **Secondary**: French + English support for some labels.
- **Math notation**: LaTeX rendered via KaTeX with smart Arabic/Latin direction handling.

---

## 🏁 Getting Started

### Prerequisites
- Node.js 18+ or [Bun](https://bun.sh)
- A Lovable Cloud–enabled project (backend is auto-provisioned)

### Installation
```bash
# Install dependencies
bun install

# Start the dev server
bun run dev
```

### Environment Variables
Auto-provisioned via Lovable Cloud — **never edit `.env` manually**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Edge function secrets (managed in Cloud settings):
- `GEMINI_API_KEY`

---

## 🧪 Testing

```bash
# Unit tests
bunx vitest run

# E2E tests (Playwright)
bunx playwright test
```

---

## 🚀 Deployment

The project deploys via **Lovable Cloud**:
- **Preview**: `https://id-preview--<project-id>.lovable.app`
- **Production**: `https://mathkb.lovable.app`
- **Custom domain**: configurable in Cloud settings.

Edge functions deploy automatically on save — no manual `supabase functions deploy` required.

---

## 📋 Conventions & Critical Rules

1. **Never edit auto-generated files**: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`, `supabase/migrations/*`.
2. **Roles in a separate table** (`user_roles`) with a `has_role()` SECURITY DEFINER function — never on `profiles`.
3. **All colors must be HSL semantic tokens** from `index.css`.
4. **Validation triggers, not CHECK constraints**, for time-based DB rules (CHECK must be immutable).
5. **All persistence goes through Lovable Cloud** — no `localStorage` for canonical state.
6. **AI calls must use `_shared/gemini.ts`** for retry / fallback / JSON sanitization.

---

## 📜 License

Proprietary — © 2026 QED Platform. All rights reserved.

---

*Built with focus on SOTA Excellence • 2026*
*Crafted for the next generation of Arab mathematicians.* 🇩🇿 🇲🇦 🇹🇳 🇸🇦 🇪🇬
