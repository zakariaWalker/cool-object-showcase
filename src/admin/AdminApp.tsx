import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/shared/components/DashboardLayout";
import {
  LayoutDashboard,
  Users,
  FileCheck,
  CreditCard,
  BarChart3,
  Settings,
  Globe,
  ShieldQuestion,
} from "lucide-react";

import AdminHome from "./pages/Dashboard";
import UserManagement from "./pages/UserManagement";
import ContentReview from "./pages/ContentReview";
import BillingPage from "./pages/Billing";
import PlatformAnalytics from "./pages/PlatformAnalytics";
import PlatformConfig from "./pages/PlatformConfig";
import CurriculumManager from "./pages/CurriculumManager";
import DiagnosticQA from "./pages/DiagnosticQA";

const navItems = [
  { path: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/admin/users", label: "إدارة المستخدمين", icon: Users },
  { path: "/admin/content", label: "مراجعة المحتوى", icon: FileCheck },
  { path: "/admin/diagnostic-qa", label: "جودة التشخيص", icon: ShieldQuestion },
  { path: "/admin/curricula", label: "المناهج والدول", icon: Globe },
  { path: "/admin/billing", label: "الفوترة والخطط", icon: CreditCard },
  { path: "/admin/analytics", label: "التحليلات", icon: BarChart3 },
  { path: "/admin/config", label: "إعدادات المنصة", icon: Settings },
];

const AdminApp = () => {
  return (
    <DashboardLayout
      title="لوحة المدير"
      navItems={navItems}
      accentColor="bg-accent"
      roleName="مدير"
    >
      <Routes>
        <Route index element={<AdminHome />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="content" element={<ContentReview />} />
        <Route path="diagnostic-qa" element={<DiagnosticQA />} />
        <Route path="curricula" element={<CurriculumManager />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="analytics" element={<PlatformAnalytics />} />
        <Route path="config" element={<PlatformConfig />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default AdminApp;
