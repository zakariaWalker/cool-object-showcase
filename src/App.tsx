import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
// import CurriculumGuard from "@/components/CurriculumGuard";
import { CurriculumGuard } from "@/components/CurriculumGuard";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
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
import Onboarding from "./pages/Onboarding";
import ExamCompare from "./admin/pages/ExamCompare";
import GeometryStudio from "./pages/GeometryStudio";

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
            <Route
              path="/exercises"
              element={
                <CurriculumGuard>
                  <ExercisePage />
                </CurriculumGuard>
              }
            />
            <Route
              path="/tma/:questionId"
              element={
                <CurriculumGuard>
                  <ExercisePage />
                </CurriculumGuard>
              }
            />
            <Route
              path="/algebra"
              element={
                <CurriculumGuard>
                  <ExercisePage />
                </CurriculumGuard>
              }
            />
            <Route
              path="/geometry"
              element={
                <CurriculumGuard>
                  <ExercisePage />
                </CurriculumGuard>
              }
            />
            <Route
              path="/statistics"
              element={
                <CurriculumGuard>
                  <ExercisePage />
                </CurriculumGuard>
              }
            />
            <Route
              path="/probability"
              element={
                <CurriculumGuard>
                  <ExercisePage />
                </CurriculumGuard>
              }
            />
            <Route
              path="/functions"
              element={
                <CurriculumGuard>
                  <ExercisePage />
                </CurriculumGuard>
              }
            />
            <Route path="/admin" element={<AdminKBPage />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/kb/upload" element={<AdminKBUpload />} />
            <Route path="/admin/curricula" element={<CurriculumManager />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/content" element={<ContentReview />} />
            <Route path="/admin/billing" element={<BillingPage />} />
            <Route path="/admin/analytics" element={<PlatformAnalytics />} />
            <Route path="/admin/config" element={<PlatformConfig />} />
            <Route path="/admin/exam-compare" element={<ExamCompare />} />
            <Route path="/gaps" element={<GapDetector />} />
            <Route
              path="/tutor"
              element={
                <CurriculumGuard>
                  <AITutor />
                </CurriculumGuard>
              }
            />
            <Route path="/solve/:id" element={<StudentSolver />} />
            <Route
              path="/learn"
              element={
                <CurriculumGuard>
                  <LearningPath />
                </CurriculumGuard>
              }
            />
            <Route path="/explore" element={<VisualExplorer />} />
            <Route path="/whatif" element={<WhatIf />} />
            <Route path="/exams" element={<ExamBuilderPage />} />
            <Route path="/exam-kb" element={<ExamKBPage />} />
            <Route path="/annales" element={<ExamArchive />} />
            <Route path="/archive-solve/:examId" element={<ExamArchiveSolver />} />
            <Route
              path="/diagnostic"
              element={
                <CurriculumGuard>
                  <DiagnosticExam />
                </CurriculumGuard>
              }
            />
            <Route path="/profile" element={<StudentProfile />} />
            <Route path="/skills-kb" element={<SkillsKBPage />} />
            <Route path="/unified-kb" element={<UnifiedKBPage />} />
            <Route path="/textbook-upload" element={<TextbookUpload />} />
            <Route path="/textbook/:id" element={<TextbookViewer />} />
            <Route path="/geometry-studio" element={<GeometryStudio />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
