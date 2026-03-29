import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertCircle, Flag, Loader2 } from "lucide-react";

interface ExerciseReportModalProps {
  exerciseId: string;
  trigger?: React.ReactNode;
}

export function ExerciseReportModal({ exerciseId, trigger }: ExerciseReportModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [issueType, setIssueType] = useState<string>("");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!user) {
      toast.error("يجب تسجيل الدخول للإبلاغ عن خطأ");
      return;
    }

    if (!issueType) {
      toast.error("يرجى اختيار نوع المشكلة");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("exercise_reports")
        .insert({
          exercise_id: exerciseId,
          student_id: user.id,
          issue_type: issueType,
          description: description,
          status: "pending",
        });

      if (error) throw error;

      toast.success("تم إرسال البلاغ بنجاح. شكراً لك!");
      setOpen(false);
      setIssueType("");
      setDescription("");
    } catch (error) {
      console.error("Error reporting exercise:", error);
      toast.error("عذراً، حدث خطأ أثناء إرسال البلاغ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-destructive gap-1.5">
            <Flag className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold">إبلاغ عن خطأ</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rtl text-right">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <AlertCircle className="h-5 w-5 text-destructive" />
            الإبلاغ عن مشكلة في التمرين
          </DialogTitle>
          <DialogDescription className="text-right">
            ساعدنا في تحسين جودة التمارين من خلال وصف المشكلة التي واجهتها.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-xs font-black text-muted-foreground uppercase">نوع المشكلة:</label>
            <Select onValueChange={setIssueType} value={issueType}>
              <SelectTrigger className="w-full text-right font-bold">
                <SelectValue placeholder="اختر نوع المشكلة..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text_issue" className="text-right">خطأ في نص التمرين (كلمات ناقصة/غير مفهومة)</SelectItem>
                <SelectItem value="math_issue" className="text-right">خطأ في الرموز أو المعادلات الرياضية</SelectItem>
                <SelectItem value="answer_issue" className="text-right">خطأ في الإجابة الصحيحة أو الخيارات</SelectItem>
                <SelectItem value="image_issue" className="text-right">مشكلة في الصورة المرفقة (إن وجدت)</SelectItem>
                <SelectItem value="other" className="text-right">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-muted-foreground uppercase">وصف إضافي (اختياري):</label>
            <Textarea
              placeholder="مثال: السؤال الثاني غير ظاهر بوضوح، أو الناتج الصحيح يجب أن يكون..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none h-24 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-start gap-2">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "إرسال البلاغ"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
