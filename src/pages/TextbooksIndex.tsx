// ===== Public textbooks index — browse all completed, public textbooks =====
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Search, Filter, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PublicTextbook {
  id: string;
  slug: string | null;
  title: string;
  grade: string;
  country_code: string | null;
  description: string | null;
  metadata: any;
  created_at: string;
}

interface Country { code: string; name_ar: string; flag_emoji: string | null; }

export default function TextbooksIndex() {
  const [books, setBooks] = useState<PublicTextbook[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterGrade, setFilterGrade] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const [tbRes, cRes] = await Promise.all([
        (supabase as any)
          .from("textbooks")
          .select("id, slug, title, grade, country_code, description, metadata, created_at")
          .eq("status", "completed")
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.from("countries").select("code, name_ar, flag_emoji").eq("is_active", true),
      ]);
      setBooks((tbRes.data as any) || []);
      setCountries((cRes.data as any) || []);
      setLoading(false);
    })();
  }, []);

  const grades = useMemo(() => Array.from(new Set(books.map(b => b.grade).filter(Boolean))).sort(), [books]);

  const filtered = useMemo(() => {
    return books.filter(b => {
      if (filterCountry !== "all" && b.country_code !== filterCountry) return false;
      if (filterGrade !== "all" && b.grade !== filterGrade) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!b.title.toLowerCase().includes(q) && !(b.description || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [books, filterCountry, filterGrade, search]);

  const countryByCode = (code: string | null) => countries.find(c => c.code === code);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-3">
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-black text-foreground">📚 مكتبة الكتب التفاعلية</h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
            تصفّح كتباً مدرسية محوّلة إلى دروس تفاعلية: شروحات، أمثلة محلولة، وتمارين قابلة للحلّ مباشرةً — مفتوحة للجميع.
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ابحث عن كتاب أو موضوع..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterCountry("all")}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${filterCountry === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground"}`}
            >
              🌍 كل البلدان
            </button>
            {countries.map(c => (
              <button
                key={c.code}
                onClick={() => setFilterCountry(c.code)}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${filterCountry === c.code ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground"}`}
              >
                <span>{c.flag_emoji}</span> {c.name_ar}
              </button>
            ))}
          </div>
        </div>

        {grades.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterGrade("all")}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${filterGrade === "all" ? "bg-foreground text-background border-foreground" : "border-border bg-card text-muted-foreground"}`}
            >
              كل المستويات
            </button>
            {grades.map(g => (
              <button
                key={g}
                onClick={() => setFilterGrade(g)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${filterGrade === g ? "bg-foreground text-background border-foreground" : "border-border bg-card text-muted-foreground"}`}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto animate-pulse opacity-30" />
            <p className="text-sm mt-3">جاري التحميل...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Filter className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm mt-3">لا توجد كتب تطابق هذه المعايير</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((b) => {
              const c = countryByCode(b.country_code);
              const chapters = b.metadata?.chapters_count || 0;
              const exercises = b.metadata?.exercises_count || 0;
              const activities = b.metadata?.activities_count || 0;
              return (
                <Link key={b.id} to={`/textbooks/${b.slug || b.id}`}>
                  <Card className="h-full overflow-hidden border-2 hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-lg group">
                    <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <BookOpen className="w-6 h-6 text-primary flex-shrink-0 group-hover:scale-110 transition-transform" />
                        {c && (
                          <Badge variant="outline" className="text-[10px]">
                            {c.flag_emoji} {c.name_ar}
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-base font-black text-foreground line-clamp-2 leading-tight">{b.title}</h2>
                      {b.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{b.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
                        <Badge variant="secondary" className="text-[10px]">{b.grade}</Badge>
                        {chapters > 0 && <Badge variant="outline" className="text-[10px]">📖 {chapters} فصل</Badge>}
                        {(exercises + activities) > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            <Sparkles className="w-2.5 h-2.5 ml-1" /> {exercises + activities} نشاط
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
