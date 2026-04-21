import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/engine/profile-store";
import {
  User,
  Settings,
  LogOut,
  LayoutDashboard,
  Target,
  Award,
  TrendingUp,
  History,
  AlertCircle,
  Brain,
  Zap,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// Sub-components (we'll define them in separate files later or inline for now)
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { StatsGrid } from "@/components/profile/StatsGrid";
import { ProgressChart } from "@/components/profile/ProgressChart";
import { KnowledgeGaps } from "@/components/profile/KnowledgeGaps";
import { AchievementGallery } from "@/components/profile/AchievementGallery";

import { getGradeLabel } from "@/lib/grade-utils";

export default function StudentProfile() {
  const navigate = useNavigate();
  const { profile: cognitiveProfile } = useProfile();
  const [user, setUser] = useState<any>(null);
  const [dbProfile, setDbProfile] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [gaps, setGaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);

      // ✅ FIX: was .eq("user_id", user.id) — profiles.id is the auth user's UUID
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setDbProfile(profileData);

      // Fetch Progress
      const { data: progressData } = await supabase
        .from("student_progress")
        .select("*")
        .eq("student_id", user.id)
        .maybeSingle();
      setProgress(progressData);

      // Fetch Knowledge Gaps
      const { data: gapsData } = await supabase
        .from("student_knowledge_gaps")
        .select("*")
        .eq("student_id", user.id)
        .order("detected_at", { ascending: false });
      setGaps(gapsData || []);

      setLoading(false);
    }

    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-primary font-black text-2xl"
        >
          QED
        </motion.div>
      </div>
    );
  }

  // ✅ FIX: was dbProfile?.grade — field is grade_code in the profiles table
  const userGrade = dbProfile?.grade_code || user?.user_metadata?.grade_code || user?.user_metadata?.grade || "N/A";
  const gradeLabel = getGradeLabel(userGrade);
  const isSecondary = userGrade.startsWith("secondary") || userGrade === "3AS";

  return (
    <div className="min-h-screen bg-background/50 pb-20 pt-6 px-4 md:px-8 mt-16" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <ProfileHeader user={user} dbProfile={dbProfile} progress={progress} cognitiveProfile={cognitiveProfile} />

        {/* Stats Quick Grid */}
        <StatsGrid progress={progress} gapsCount={gaps.length} />

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-card border border-border p-1 rounded-2xl h-14 w-full md:w-auto overflow-x-auto justify-start md:justify-center">
            <TabsTrigger
              value="overview"
              className="gap-2 px-6 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <LayoutDashboard className="w-4 h-4" /> لوحة التحكم
            </TabsTrigger>
            <TabsTrigger
              value="progress"
              className="gap-2 px-6 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <TrendingUp className="w-4 h-4" /> التطور الدراسي
            </TabsTrigger>
            <TabsTrigger
              value="gaps"
              className="gap-2 px-6 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Zap className="w-4 h-4" /> الفجوات المعرفية
            </TabsTrigger>
            <TabsTrigger
              value="achievements"
              className="gap-2 px-6 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Award className="w-4 h-4" /> الإنجازات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Development Chart (Preview) */}
              <Card className="md:col-span-2 rounded-3xl border-border/40 shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-black">تحليل منحنى التعلم</CardTitle>
                    <CardDescription>كيف تطور أداؤك خلال آخر ٣٠ يوماً</CardDescription>
                  </div>
                  <TrendingUp className="text-primary w-5 h-5" />
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ProgressChart userId={user.id} />
                </CardContent>
              </Card>

              {/* Current Math Path */}
              <Card className="rounded-3xl border-border/40 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" /> المسار الحالي
                  </CardTitle>
                  <CardDescription>أنت تدرس حالياً برنامج {gradeLabel}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-2xl bg-muted/50 border border-border/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-muted-foreground">وحدة الأعداد والحساب</span>
                      <span className="text-xs font-black text-primary">٦٥%</span>
                    </div>
                    <Progress value={65} className="h-2 rounded-full" />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl border-dashed border-2 hover:bg-primary/5 hover:text-primary transition-all"
                  >
                    عرض الخطة الدراسية كاملة
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="outline-none">
            <Card className="rounded-3xl border-border/40 shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-black">النمو المعرفي</CardTitle>
              </CardHeader>
              <CardContent className="h-[500px]">
                <ProgressChart userId={user.id} details />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gaps" className="outline-none">
            <KnowledgeGaps gaps={gaps} />
          </TabsContent>

          <TabsContent value="achievements" className="outline-none">
            <AchievementGallery progress={progress} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
