# QED: Next-Gen AI Mathematics Platform

QED (Math Flow Arabia) is a State-of-the-Art (SOTA) educational platform designed to transform mathematics learning for students in the Arab world, with a primary focus on the Algerian curriculum (BAC 2025 and BEM).

## 🚀 Core Vision
QED moves beyond static content to provide a **Student-Driven, Knowledge-Base-First** learning environment. It leverages AI not as a black box, but as a transparent guide that deconstructs complex mathematical problems into manageable pedagogical patterns and atomic concepts.

---

## 🧭 Key Features

### 1. Adaptive Diagnostic Engine (`/gaps`)
- **Real-Time Gap Detection**: Analyzes student answers to identify specific conceptual weaknesses (e.g., "Linear Functions", "Complex Numbers").
- **Adaptive Rounds**: Each diagnostic round dynamically adjusts its difficulty and focus based on the student's previous performance.

### 2. Intelligent Exercise Library (`/exercises`)
- **SOTA Rendering**: High-fidelity mathematical text rendering using the custom `ExerciseRenderer`.
- **Automatic Splitting**: Complex, crowded question lines are automatically structured into vertical, readable lists.
- **Data Highlighting**: Key numeric data and mathematical terms are visually emphasized for better cognitive focus.

### 3. High-Fidelity Step-by-Step Editor
- **Algebra Editor**: Features a **Live Math Preview** that renders LaTeX symbols into beautiful math instantly as the student types.
- **Geometry Editor**: A comprehensive workspace for geometric construction and analytic geometry.
- **Level-Specific Toolsets**: Toolbars and templates adapt automatically to the student's level (Primary, Middle, or Secondary/BAC).

### 4. Pedagogical SOTA Engine
- **Logic Stacking**: Visualizes the logical flow of a solution, showing how one step leads to the next.
- **Deconstruction View**: Breaks exercises into "Needs", "Concepts", and "Patterns" stored in the centralized Knowledge Base.

### 5. Gamified Learning Ecosystem
- **XP & Levels**: Earn experience points for solving exercises and mastering new concepts.
- **Daily Challenges**: Hourly rotating special exercises to keep the brain sharp.
- **Progression Badges**: Unlock achievements like "Concept Master" or "Streak King".

---

## 🛠️ Technology Stack
- **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/) (Animations)
- **Backend/Auth**: [Supabase](https://supabase.com/)
- **Math Rendering**: [MathLive](https://cortexjs.io/mathlive/) / [KaTeX](https://katex.org/)
- **Language**: TypeScript (Strict Mode)

---

## 📂 Project Structure
- `src/engine/`: Core mathematical logic, exercise parsers, and gamification rules.
- `src/components/`: Reusable UI components (Editors, Renderers, Dashboards).
- `src/pages/`: Main application routes (Learning Path, Gap Detector, Exercise Library).
- `src/hooks/`: Custom React hooks for authentication and data management.
- `supabase/`: Database migrations and edge function definitions.

---

## 🏁 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Bun](https://bun.sh/) or [npm](https://www.npmjs.com/)

### Installation
```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Environment Variables
Create a `.env` file in the root with the following keys:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 🌍 Language & Localization
QED is built with **Right-To-Left (RTL)** support as a first-class citizen, featuring a premium custom Arabic typography (Tajawal/Inter) designed for mathematical clarity.

---
*Created with focus on SOTA Excellence • 2026*
