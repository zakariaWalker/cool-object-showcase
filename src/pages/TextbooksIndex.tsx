// ===== Public textbooks — blog-style feed =====
// Each textbook is presented as a long-form article card (cover image, kicker,
// title, lede, byline & meta) instead of a library grid tile.
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Search, Filter, Sparkles, Clock, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";

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

// Deterministic "cover" gradient per textbook id — keeps the feed visually
// varied without needing real cover images.
const COVERS = [
  "from-amber-200 via-rose-200 to-fuchsia-300",
  "from-sky-200 via-indigo-200 to-violet-300",
  "from-emerald-200 via-teal-200 to-cyan-300",
  "from-orange-200 via-red-200 to-pink-300",
  "from-lime-200 via-emerald-200 to-teal-300",
  "from-violet-200 via-purple-200 to-indigo-300",
];
const coverFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COVERS[h % COVERS.length];
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("ar", { day: "numeric", month: "long", year: "numeric" });
  } catch { return ""; }
};

const readingMinutes = (b: PublicTextbook) => {
  const ch = Number(b.metadata?.chapters_count) || 0;
  const ex = Number(b.metadata?.exercises_count) || 0;
  const ac = Number(b.metadata?.activities_count) || 0;
  return Math.max(3, ch * 4 + Math.round((ex + ac) / 3));
};

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

  const grades = useMemo(
    () => Array.from(new Set(books.map((b) => b.grade).filter(Boolean))).sort(),
    [books]
  );

  const filtered = useMemo(() => {
    return books.filter((b) => {
      if (filterCountry !== "all" && b.country_code !== filterCountry) return false;
      if (filterGrade !== "all" && b.grade !== filterGrade) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!b.title.toLowerCase().includes(q) && !(b.description || "").toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [books, filterCountry, filterGrade, search]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  const countryByCode = (code: string | null) => countries.find((c) => c.code === code);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Magazine masthead */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
          <div className="flex items-center gap-2 text-[11px] font-black tracking-widest uppercase text-primary mb-4">
            <span className="w-8 h-px bg-primary" />
            مجلّة الدروس
            <span className="w-8 h-px bg-primary" />
          </div>
          <h1 className="font-black text-foreground text-3xl md:text-5xl leading-tight tracking-tight">
            مقالات تعليميّة من قلب الكتاب المدرسي
          </h1>
          <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
            نأخذ كلّ درس من كتابك ونعيد كتابته كمقال قابل للقراءة: شرح متدفّق، أمثلة محلولة،
            وتمارين تتفاعل معك مباشرة. اقرأ كأنّك تتصفّح مدوّنة — وتعلّم كأنّك في الصفّ.
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Search + filters — minimal blog toolbar */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ابحث في المقالات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 h-11 text-sm bg-card border-border"
            />
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 items-center text-xs">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              البلد
            </span>
            <button
              onClick={() => setFilterCountry("all")}
              className={`pb-0.5 border-b-2 transition-colors font-bold ${
                filterCountry === "all"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              الكلّ
            </button>
            {countries.map((c) => (
              <button
                key={c.code}
                onClick={() => setFilterCountry(c.code)}
                className={`pb-0.5 border-b-2 transition-colors font-bold flex items-center gap-1 ${
                  filterCountry === c.code
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{c.flag_emoji}</span> {c.name_ar}
              </button>
            ))}
          </div>

          {grades.length > 0 && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 items-center text-xs">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                المستوى
              </span>
              <button
                onClick={() => setFilterGrade("all")}
                className={`pb-0.5 border-b-2 transition-colors font-bold ${
                  filterGrade === "all"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                الكلّ
              </button>
              {grades.map((g) => (
                <button
                  key={g}
                  onClick={() => setFilterGrade(g)}
                  className={`pb-0.5 border-b-2 transition-colors font-bold ${
                    filterGrade === g
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto animate-pulse opacity-30" />
            <p className="text-sm mt-3">جاري تحميل المقالات...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Filter className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm mt-3">لا توجد مقالات تطابق هذه المعايير</p>
          </div>
        ) : (
          <>
            {/* Featured / hero article */}
            {featured && <FeaturedArticle book={featured} country={countryByCode(featured.country_code)} />}

            {/* Divider */}
            {rest.length > 0 && (
              <div className="flex items-center gap-3 pt-4">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  المزيد من المقالات
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
            )}

            {/* Feed of articles */}
            <div className="divide-y divide-border">
              {rest.map((b) => (
                <ArticleRow key={b.id} book={b} country={countryByCode(b.country_code)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Featured hero article ────────────────────────────────────────────────
function FeaturedArticle({ book, country }: { book: PublicTextbook; country?: Country }) {
  const cover = coverFor(book.id);
  const exercises = Number(book.metadata?.exercises_count) || 0;
  const activities = Number(book.metadata?.activities_count) || 0;
  const chapters = Number(book.metadata?.chapters_count) || 0;
  const minutes = readingMinutes(book);

  return (
    <Link to={`/textbooks/${book.slug || book.id}`} className="block group">
      <article className="grid md:grid-cols-5 gap-6 md:gap-8 items-center">
        <div
          className={`md:col-span-3 aspect-[16/10] rounded-2xl bg-gradient-to-br ${cover} relative overflow-hidden shadow-sm group-hover:shadow-xl transition-all duration-500`}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-20 h-20 text-foreground/20 group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur text-[10px] font-black tracking-widest uppercase text-primary">
            مقال مميّز
          </div>
        </div>

        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {country && (
              <span className="flex items-center gap-1">
                <span>{country.flag_emoji}</span>
                {country.name_ar}
              </span>
            )}
            {country && <span>•</span>}
            <span>{book.grade}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-foreground leading-tight group-hover:text-primary transition-colors">
            {book.title}
          </h2>
          {book.description && (
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed line-clamp-3">
              {book.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-2">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> ~{minutes} د قراءة
            </span>
            {chapters > 0 && <span>• {chapters} فصل</span>}
            {exercises + activities > 0 && (
              <span className="flex items-center gap-1">
                • <Sparkles className="w-3 h-3" /> {exercises + activities} نشاط
              </span>
            )}
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-black text-primary pt-2 group-hover:gap-3 transition-all">
            اقرأ المقال <ArrowLeft className="w-4 h-4" />
          </div>
        </div>
      </article>
    </Link>
  );
}

// ─── Article row in the feed ──────────────────────────────────────────────
function ArticleRow({ book, country }: { book: PublicTextbook; country?: Country }) {
  const cover = coverFor(book.id);
  const exercises = Number(book.metadata?.exercises_count) || 0;
  const activities = Number(book.metadata?.activities_count) || 0;
  const chapters = Number(book.metadata?.chapters_count) || 0;
  const minutes = readingMinutes(book);

  return (
    <Link to={`/textbooks/${book.slug || book.id}`} className="block group py-7 first:pt-0">
      <article className="grid grid-cols-[1fr_140px] md:grid-cols-[1fr_200px] gap-5 md:gap-8 items-start">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {country && (
              <span className="flex items-center gap-1">
                <span>{country.flag_emoji}</span>
                {country.name_ar}
              </span>
            )}
            {country && <span>•</span>}
            <span>{book.grade}</span>
            <span>•</span>
            <span>{formatDate(book.created_at)}</span>
          </div>
          <h2 className="text-lg md:text-xl font-black text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {book.title}
          </h2>
          {book.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {book.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1.5">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> ~{minutes} د
            </span>
            {chapters > 0 && <span>• {chapters} فصل</span>}
            {exercises + activities > 0 && (
              <span className="flex items-center gap-1">
                • <Sparkles className="w-3 h-3" /> {exercises + activities}
              </span>
            )}
          </div>
        </div>

        <div
          className={`aspect-[4/3] md:aspect-[5/4] rounded-xl bg-gradient-to-br ${cover} relative overflow-hidden shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-300`}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-foreground/25" />
          </div>
        </div>
      </article>
    </Link>
  );
}
