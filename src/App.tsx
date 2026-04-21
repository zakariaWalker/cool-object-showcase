import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import ExercisePage from "./pages/Exercise";
import AdminKBPage from "./pages/AdminKB";
import AdminKBUpload from "./pages/AdminKBUpload";
import CurriculumManager from "./admin/pages/CurriculumManager";
import UserManagement from "./admin/pages/UserManagement";
import ContentReview from "./admin/pages/ContentReview";
import BillingPage from "./admin/pages/Billing";
import PlatformAnalytics from "./admin/pages/PlatformAnalytics";
import PlatformConfig from "./admin/pages/PlatformConfig";
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
import UnifiedKBPage from "./pages/UnifiedKB";
import TextbookUpload from "./pages/TextbookUpload";
import TextbookViewer from "./pages/TextbookViewer";

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
            <Route path="/onboarding" element={<Onboarding />} />
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
            <Route path="/admin/kb/upload" element={<AdminKBUpload />} />
            <Route path="/admin/curricula" element={<CurriculumManager />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/content" element={<ContentReview />} />
            <Route path="/admin/billing" element={<BillingPage />} />
            <Route path="/admin/analytics" element={<PlatformAnalytics />} />
            <Route path="/admin/config" element={<PlatformConfig />} />
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
            <Route path="/unified-kb" element={<UnifiedKBPage />} />
            <Route path="/textbook-upload" element={<TextbookUpload />} />
            <Route path="/textbook/:id" element={<TextbookViewer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
