import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Settings, LogOut, Brain, Target, Award, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useCountryGrades } from "@/hooks/useCountryGrades";

export function ProfileHeader({ user, dbProfile, progress, cognitiveProfile }: any) {
  const navigate = useNavigate();
  const countryCode = dbProfile?.country_code || user?.user_metadata?.country_code || "DZ";
  const { labelOf: resolveGradeLabel } = useCountryGrades(countryCode);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const fullName = dbProfile?.full_name || user?.user_metadata?.full_name || "تلميذ QED";
  const xp = progress?.xp || 0;
  const level = progress?.level || 1;
  // ✅ FIX: was dbProfile?.grade — field is grade_code in the profiles table
  const grade = dbProfile?.grade_code || user?.user_metadata?.grade_code || user?.user_metadata?.grade;
  const gradeLabel = resolveGradeLabel(grade);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-card border border-border rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-primary/5 overflow-hidden"
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl -ml-20 -mb-20" />

      <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
        {/* Avatar & Level Badge */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-cyan-400 rounded-full blur opacity-25 group-hover:opacity-40 transition-opacity" />
          <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-background overflow-hidden shadow-2xl">
            <img
              src={dbProfile?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.id}`}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-primary text-white w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-black text-lg md:text-xl shadow-lg border-4 border-background">
            {level}
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1 text-center md:text-right space-y-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h1 className="text-3xl md:text-5xl font-black text-foreground">{fullName}</h1>
              {cognitiveProfile && (
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 px-3 py-1 rounded-full flex items-center gap-1.5 h-8"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> نمط{" "}
                  {cognitiveProfile === "strategic" ? "استراتيجي" : cognitiveProfile}
                </Badge>
              )}
            </div>
            <p className="text-lg text-muted-foreground font-medium">
              {gradeLabel} • شعبة {user?.user_metadata?.stream || "عامة"}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
            <div className="flex flex-col items-center md:items-start">
              <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                مجموع الثقافة (XP)
              </span>
              <span className="text-2xl font-black text-primary">{xp.toLocaleString()}</span>
            </div>
            <div className="w-px h-10 bg-border hidden md:block" />
            <div className="flex flex-col items-center md:items-start">
              <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                الرتبة المعرفية
              </span>
              <span className="text-2xl font-black text-foreground">
                {level > 10 ? "حكيم" : level > 5 ? "خبير" : "مستكشف"}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex md:flex-col gap-3">
          <Button
            variant="outline"
            size="icon"
            className="w-12 h-12 rounded-2xl border-2 hover:bg-primary/5 hover:border-primary transition-all"
          >
            <Settings className="w-5 h-5" />
          </Button>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="icon"
            className="w-12 h-12 rounded-2xl border-2 hover:bg-destructive/5 hover:border-destructive hover:text-destructive transition-all"
          >
            <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-destructive" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
