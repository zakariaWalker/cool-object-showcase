import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, BookOpen, Loader2, CheckCircle, XCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

const GRADES = [
  { value: "1AM", label: "1ère Année Moyenne" },
  { value: "2AM", label: "2ème Année Moyenne" },
  { value: "3AM", label: "3ème Année Moyenne" },
  { value: "4AM", label: "4ème Année Moyenne (BEM)" },
  { value: "1AS", label: "1ère Année Secondaire" },
  { value: "2AS", label: "2ème Année Secondaire" },
  { value: "3AS", label: "3ème Année Secondaire (BAC)" },
];

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
  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState("");
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
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

  async function handleUpload() {
    if (!file || !title || !grade) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("يرجى تسجيل الدخول"); return; }

    setUploading(true);
    try {
      const filePath = `textbooks/${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("educational-materials")
        .upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const { data: textbook, error: insertErr } = await supabase
        .from("textbooks")
        .insert({
          user_id: user.id,
          title,
          grade,
          file_path: filePath,
          status: "pending",
        })
        .select()
        .single();
      if (insertErr) throw insertErr;

      setProcessing(true);
      setProgress(0);

      const { error: fnErr } = await supabase.functions.invoke("parse-textbook", {
        body: { textbook_id: (textbook as any).id },
      });
      if (fnErr) throw fnErr;

      await loadTextbooks();
      setFile(null);
      setTitle("");
    } catch (e: any) {
      toast.error(e.message || "خطأ في الرفع");
      setProcessing(false);
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

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-black text-foreground">📚 تحويل الكتاب المدرسي</h1>
            <p className="text-sm text-muted-foreground">ارفع كتاب المنهاج كـ PDF وسيتم تحويله إلى نسخة ويب تفاعلية</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📤 رفع كتاب جديد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">عنوان الكتاب</label>
                <Input
                  placeholder="مثال: كتاب الرياضيات السنة الرابعة متوسط"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">المستوى</label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger><SelectValue placeholder="اختر المستوى" /></SelectTrigger>
                  <SelectContent>
                    {GRADES.map(g => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

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
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={uploading || processing || !file || !title || !grade}
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
                      <Progress value={tb.processing_progress} className="w-24 h-1.5" />
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
