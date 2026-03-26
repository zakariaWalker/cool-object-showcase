import { useState } from "react";
import { Exercise, Pattern, Deconstruction } from "./useAdminKBStore";

interface Props {
  exercises: Exercise[];
  patterns: Pattern[];
  deconstructions: Deconstruction[];
}

const PAGE_SIZE = 25;

export function AdminKBViewer({ exercises, patterns, deconstructions }: Props) {
  const [tab, setTab] = useState<"exercises" | "patterns" | "decons">("exercises");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const tabs = [
    { id: "exercises" as const, label: "التمارين", count: exercises.length },
    { id: "patterns" as const, label: "الأنماط", count: patterns.length },
    { id: "decons" as const, label: "التفكيكات", count: deconstructions.length },
  ];

  // Current data based on tab
  const currentItems = (() => {
    switch (tab) {
      case "exercises":
        return exercises
          .filter(e => !search || e.text.toLowerCase().includes(search.toLowerCase()))
          .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      case "patterns":
        return patterns
          .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
          .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      case "decons":
        return deconstructions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      default:
        return [];
    }
  })();

  const totalCount = tab === "exercises" ? exercises.length : tab === "patterns" ? patterns.length : deconstructions.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleExport = () => {
    const data = { exercises, patterns, deconstructions, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `math-kb-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 items-center">
        {tabs.map(t => (
          <button key={t.id}
            onClick={() => { setTab(t.id); setPage(1); setSearch(""); }}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all border"
            style={{
              background: tab === t.id ? "hsl(var(--primary))" : "hsl(var(--card))",
              color: tab === t.id ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
              borderColor: tab === t.id ? "hsl(var(--primary))" : "hsl(var(--border))",
            }}>
            {t.label} ({t.count})
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={handleExport}
          className="px-4 py-2 rounded-lg text-sm font-semibold border border-border text-foreground bg-card">
          ↓ تصدير JSON
        </button>
      </div>

      {/* Search */}
      <input type="text" placeholder="بحث..." value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm" />

      {/* Table */}
      <div className="glass-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "hsl(var(--muted))" }}>
                {tab === "exercises" && (
                  <>
                    <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">ID</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">النص</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">النوع</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">المستوى</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">الفصل</th>
                  </>
                )}
                {tab === "patterns" && (
                  <>
                    <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">الاسم</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">النوع</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">الخطوات</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">التاريخ</th>
                  </>
                )}
                {tab === "decons" && (
                  <>
                    <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">التمرين</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">النمط</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">ملاحظات</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">التاريخ</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {tab === "exercises" && (currentItems as Exercise[]).map(e => (
                <tr key={e.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{e.id.slice(0, 8)}</td>
                  <td className="px-4 py-2.5 text-xs text-foreground max-w-[300px] truncate" dir="rtl">{e.text}</td>
                  <td className="px-4 py-2.5"><span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{e.type}</span></td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{e.grade}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{e.chapter}</td>
                </tr>
              ))}
              {tab === "patterns" && (currentItems as Pattern[]).map(p => (
                <tr key={p.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs font-medium text-foreground">{p.name}</td>
                  <td className="px-4 py-2.5"><span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">{p.type}</span></td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.steps.length} خطوات</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("ar")}</td>
                </tr>
              ))}
              {tab === "decons" && (currentItems as Deconstruction[]).map(d => (
                <tr key={d.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-foreground font-mono">{d.exerciseId.slice(0, 12)}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{d.patternId || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">{d.notes || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString("ar")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {currentItems.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">لا توجد بيانات</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="text-sm text-primary disabled:text-muted-foreground">← السابق</button>
          <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="text-sm text-primary disabled:text-muted-foreground">التالي →</button>
        </div>
      )}
    </div>
  );
}
