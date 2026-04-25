import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, BookOpen, Loader2, CheckCircle, XCircle, FileText, Ban, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, Link } from "react-router-dom";
import { CountryGradePicker } from "@/components/CountryGradePicker";

interface TextbookRow {
  id: string;
  title: string;
  grade: string;
  status: string;
  processing_progress: number;
  created_at: string;
  metadata: any;
}

export default function TextbookUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [inputMode, setInputMode] = useState<"pdf" | "text">("pdf");
  const [title, setTitle] = useState("");
  const [countryCode, setCountryCode] = useState<string>(() => localStorage.getItem("textbook_country") || "DZ");
  const [grade, setGrade] = useState<string>(() => localStorage.getItem("textbook_grade") || "");
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [textbooks, setTextbooks] = useState<TextbookRow[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadTextbooks();
  }, []);

  useEffect(() => {
    if (!processing) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from("textbooks").select("*").order("created_at", { ascending: false }).limit(10);
      if (data) {
        setTextbooks(data as any);
        const active = data.find((t: any) => t.status === "processing");
        if (active) {
          setProgress((active as any).processing_progress || 0);
        } else {
          setProcessing(false);
          setProcessingId(null);
          const done = data.find((t: any) => t.status === "completed");
          if (done) toast.success("✅ تم تحويل الكتاب بنجاح!");
          const failed = data.find((t: any) => t.status === "failed");
          if (failed) toast.error("❌ فشل تحويل الكتاب");
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [processing]);

  async function loadTextbooks() {
    const { data } = await supabase.from("textbooks").select("*").order("created_at", { ascending: false }).limit(20);
    if (data) setTextbooks(data as any);
  }

  async function handleCancel(id: string) {
    const { error } = await supabase
      .from("textbooks")
      .update({ status: "failed", processing_log: [{ error: "Cancelled by user", at: new Date().toISOString() }] } as any)
      .eq("id", id);
    if (error) {
      toast.error("فشل الإلغاء");
    } else {
      toast.info("تم إلغاء التحويل");
      setProcessing(false);
      setProcessingId(null);
      await loadTextbooks();
    }
  }

  async function handleUpload() {
    if (inputMode === "pdf" && !file) {
      toast.error("يرجى اختيار ملف PDF");
      return;
    }
    if (inputMode === "text" && !pastedText.trim()) {
      toast.error("يرجى لصق محتوى الكتاب");
      return;
    }
    if (!title || !grade) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("يرجى تسجيل الدخول"); return; }

    setUploading(true);
    try {
      let filePath: string | null = null;

      if (inputMode === "pdf" && file) {
        filePath = `textbooks/${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("educational-materials")
          .upload(filePath, file);
        if (uploadErr) throw uploadErr;
      }

      const { data: textbook, error: insertErr } = await supabase
        .from("textbooks")
        .insert({
          user_id: user.id,
          title,
          grade,
          country_code: countryCode,
          file_path: filePath,
          status: "pending",
          subject: "math",
          is_public: true,
        } as any)
        .select()
        .single();
      if (insertErr) throw insertErr;

      const tbId = (textbook as any).id;
      setProcessing(true);
      setProcessingId(tbId);
      setProgress(0);

      const body: any = { textbook_id: tbId };
      if (inputMode === "text" && pastedText.trim()) {
        body.raw_text = pastedText.trim();
      }

      const { error: fnErr } = await supabase.functions.invoke("parse-textbook", { body });
      if (fnErr) throw fnErr;

      await loadTextbooks();
      setFile(null);
      setPastedText("");
      setTitle("");
    } catch (e: any) {
      toast.error(e.message || "خطأ في الرفع");
      setProcessing(false);
      setProcessingId(null);
    } finally {
      setUploading(false);
    }
  }

  const statusIcon = (s: string) => {
    if (s === "completed") return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (s === "processing") return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    if (s === "failed") return <XCircle className="w-4 h-4 text-red-500" />;
    return <FileText className="w-4 h-4 text-muted-foreground" />;
  };

  const isReady = inputMode === "pdf" ? !!file && !!title && !!grade : !!pastedText.trim() && !!title && !!grade;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-2xl font-black text-foreground">📚 تحويل الكتاب المدرسي</h1>
              <p className="text-sm text-muted-foreground">ارفع كتاب المنهاج كـ PDF أو الصق محتواه النصي وسيتم تحويله إلى نسخة ويب تفاعلية</p>
            </div>
          </div>
          <Link to="/textbooks">
            <Button variant="outline" className="gap-2">
              <BookOpen className="w-4 h-4" /> المكتبة العامة
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📤 رفع كتاب جديد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">عنوان الكتاب</label>
              <Input
                placeholder="مثال: كتاب الرياضيات السنة الرابعة متوسط"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="rounded-xl border border-border p-4 bg-muted/30">
              <CountryGradePicker
                countryCode={countryCode}
                gradeCode={grade}
                onChange={(c, g) => {
                  setCountryCode(c);
                  setGrade(g);
                  localStorage.setItem("textbook_country", c);
                  if (g) localStorage.setItem("textbook_grade", g);
                }}
              />
            </div>

            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "pdf" | "text")} dir="rtl">
              <TabsList className="w-full">
                <TabsTrigger value="pdf" className="flex-1 gap-2">
                  <Upload className="w-4 h-4" /> رفع PDF
                </TabsTrigger>
                <TabsTrigger value="text" className="flex-1 gap-2">
                  <ClipboardPaste className="w-4 h-4" /> لصق النص
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pdf">
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label htmlFor="pdf-upload" className="cursor-pointer">
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-foreground">
                      {file ? `📄 ${file.name}` : "انقر لاختيار ملف PDF"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">الحد الأقصى: 20MB</p>
                  </label>
                </div>
              </TabsContent>

              <TabsContent value="text">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground block">محتوى الكتاب (نص)</label>
                  <Textarea
                    placeholder="الصق هنا محتوى الكتاب المدرسي كنص... يمكنك نسخ المحتوى من PDF أو أي مصدر آخر"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="min-h-[200px] text-sm leading-relaxed"
                    dir="rtl"
                  />
                  <p className="text-xs text-muted-foreground">
                    {pastedText.length > 0
                      ? `${pastedText.length.toLocaleString("ar")} حرف · ~${Math.ceil(pastedText.split(/\s+/).length / 250)} صفحة`
                      : "الصق محتوى الكتاب هنا — يُفضل أن يشمل عناوين الفصول والدروس والتمارين"}
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {processing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-medium text-foreground">جاري التحويل...</span>
                  <span className="text-xs text-muted-foreground mr-auto">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="grid grid-cols-4 gap-2 text-[10px] text-muted-foreground">
                  <span className={progress >= 10 ? "text-primary font-bold" : ""}>📤 رفع</span>
                  <span className={progress >= 30 ? "text-primary font-bold" : ""}>🤖 تحليل AI</span>
                  <span className={progress >= 60 ? "text-primary font-bold" : ""}>📦 حفظ البنية</span>
                  <span className={progress >= 90 ? "text-primary font-bold" : ""}>🔗 ربط المهارات</span>
                </div>
                {processingId && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => handleCancel(processingId)}
                  >
                    <Ban className="w-4 h-4 ml-2" />
                    إلغاء التحويل
                  </Button>
                )}
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={uploading || processing || !isReady}
              className="w-full"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Upload className="w-4 h-4 ml-2" />}
              {uploading ? "جاري الرفع..." : processing ? "جاري التحويل..." : "رفع وتحويل"}
            </Button>
          </CardContent>
        </Card>

        {textbooks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📖 الكتب المحولة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {textbooks.map((tb) => (
                  <div
                    key={tb.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 cursor-pointer transition-colors"
                    onClick={() => tb.status === "completed" && navigate(`/textbook/${tb.id}`)}
                  >
                    {statusIcon(tb.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{tb.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {tb.grade} · {new Date(tb.created_at).toLocaleDateString("ar")}
                        {tb.metadata?.chapters_count && ` · ${tb.metadata.chapters_count} فصل`}
                        {tb.metadata?.activities_count && ` · ${tb.metadata.activities_count} نشاط`}
                      </p>
                    </div>
                    {tb.status === "processing" && (
                      <div className="flex items-center gap-2">
                        <Progress value={tb.processing_progress} className="w-24 h-1.5" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive h-7 w-7 p-0"
                          onClick={(e) => { e.stopPropagation(); handleCancel(tb.id); }}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                    {tb.status === "completed" && (
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/textbook/${tb.id}`); }}>
                        عرض
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
