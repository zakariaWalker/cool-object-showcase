// Mandatory gate: ensures every user has chosen a country + grade BEFORE
// using the platform. Triggered when profile fields are missing.
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CountryGradePicker } from "@/components/CountryGradePicker";
import { Button } from "@/components/ui/button";
import { QEDLogo } from "@/components/QEDLogo";
import { toast } from "@/hooks/use-toast";
import { GraduationCap } from "lucide-react";

export default function Onboarding() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/home";
  const [countryCode, setCountryCode] = useState("DZ");
  const [gradeCode, setGradeCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data } = await (supabase as any)
        .from("profiles")
        .select("country_code, grade_code")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.country_code && data?.grade_code) {
        navigate(redirect);
        return;
      }
      if (data?.country_code) setCountryCode(data.country_code);
      if (data?.grade_code) setGradeCode(data.grade_code);
      setChecking(false);
    })();
  }, [navigate, redirect]);

  const handleSave = async () => {
    if (!countryCode || !gradeCode) {
      toast({ title: "اختر البلد والمستوى", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ country_code: countryCode, grade_code: gradeCode })
      .eq("id", user.id);
    setLoading(false);
    if (error) {
      toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم الحفظ ✓", description: "سيتم تخصيص المنصة لمنهجك الدراسي." });
    navigate(redirect);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">جارٍ التحقق...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-6"><QEDLogo size="xl" /></div>
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          <div className="text-center mb-6">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-primary/10 text-primary items-center justify-center mb-3">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black text-foreground mb-1">أكمل بياناتك الدراسية</h1>
            <p className="text-sm text-muted-foreground">
              نحتاج معرفة بلدك ومستواك لتخصيص التقييم، التمارين، ومسار التعلم وفق منهجك الرسمي.
            </p>
          </div>

          <CountryGradePicker
            countryCode={countryCode}
            gradeCode={gradeCode}
            onChange={(c, g) => { setCountryCode(c); setGradeCode(g); }}
          />

          <Button
            onClick={handleSave}
            disabled={loading || !countryCode || !gradeCode}
            className="w-full h-12 text-base font-bold mt-6"
          >
            {loading ? "جارٍ الحفظ..." : "متابعة ←"}
          </Button>
        </div>
      </div>
    </div>
  );
}
