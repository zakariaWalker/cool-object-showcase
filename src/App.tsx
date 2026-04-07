import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import ExercisePage from "./pages/Exercise";
import AdminKBPage from "./pages/AdminKB";
import GapDetector from "./pages/GapDetector";
import AITutor from "./pages/AITutor";
import StudentSolver from "./pages/StudentSolver";
import LearningPath from "./pages/LearningPath";
import VisualExplorer from "./pages/VisualExplorer";
import WhatIf from "./pages/WhatIf";
import ExamBuilderPage from "./pages/ExamBuilder";
import ExamKBPage from "./pages/ExamKB";
import AdminReports from "./pages/AdminReports";
import DiagnosticExam from "./pages/DiagnosticExam";
import StudentProfile from "@/pages/StudentProfile";
import NotFound from "./pages/NotFound";
import ExamArchive from "./pages/ExamArchive";
import ExamArchiveSolver from "./pages/ExamArchiveSolver";
import SkillsKBPage from "./pages/SkillsKB";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/home" element={<Home />} />
            <Route path="/exercises" element={<ExercisePage />} />
            <Route path="/tma/:questionId" element={<ExercisePage />} />
            <Route path="/algebra" element={<ExercisePage />} />
            <Route path="/geometry" element={<ExercisePage />} />
            <Route path="/statistics" element={<ExercisePage />} />
            <Route path="/probability" element={<ExercisePage />} />
            <Route path="/functions" element={<ExercisePage />} />
            <Route path="/admin" element={<AdminKBPage />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/gaps" element={<GapDetector />} />
            <Route path="/tutor" element={<AITutor />} />
            <Route path="/solve/:id" element={<StudentSolver />} />
            <Route path="/learn" element={<LearningPath />} />
            <Route path="/explore" element={<VisualExplorer />} />
            <Route path="/whatif" element={<WhatIf />} />
            <Route path="/exams" element={<ExamBuilderPage />} />
            <Route path="/exam-kb" element={<ExamKBPage />} />
            <Route path="/annales" element={<ExamArchive />} />
            <Route path="/archive-solve/:examId" element={<ExamArchiveSolver />} />
            <Route path="/diagnostic" element={<DiagnosticExam />} />
            <Route path="/profile" element={<StudentProfile />} />
            <Route path="/skills-kb" element={<SkillsKBPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
