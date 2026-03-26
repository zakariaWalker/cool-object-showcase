// ===== Teacher Dashboard — Phase 26 =====
// Real-time class analytics: weaknesses, student performance, gap map.

import { useState, useEffect } from "react";

interface ClassOverview {
  class_code: string; class_name: string; grade_ar: string;
  student_count: number; success_rate: number; active_students_7d: number;
  total_attempts: number;
}
interface Weakness {
  concept: string; students_affected: number; avg_frequency: number; pattern_name?: string;
}
interface Student {
  id: string; name: string; rate: number; gap_count: number;
  last_active: string; status: "ok"|"warn"|"danger";
}
interface ClassData {
  class_code: string; class_name: string; grade_ar: string;
  overview: ClassOverview; weaknesses: Weakness[]; students: Student[];
}
interface DashboardData {
  classes: ClassData[]; total_classes: number;
}

const STATUS = { ok:"🟢", warn:"🟡", danger:"🔴" } as const;
const RATE_COLOR = (r: number) => r >= 65 ? "#166534" : r >= 40 ? "#713f12" : "#881337";
const RATE_BG    = (r: number) => r >= 65 ? "#f0fdf4" : r >= 40 ? "#fefce8" : "#fff1f2";

export default function TeacherDashboard() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeClass, setActiveClass] = useState<string | null>(null);
  const [tab, setTab]         = useState<"overview"|"students"|"gaps">("overview");
  const [teacherId, setTeacherId] = useState("");

  const apiBase = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tid = params.get("teacher_id") || "";
    setTeacherId(tid);
    if (!tid) { setLoading(false); return; }
    fetch(`${apiBase}/api/teacher/dashboard/${tid}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setData(d); setActiveClass(d.classes[0]?.class_code || null); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cls = data?.classes.find(c => c.class_code === activeClass);

  if (loading) return <Centered>⏳ جارٍ تحميل لوحة التحكم...</Centered>;
  if (!teacherId) return <Centered>❌ أضف <code>?teacher_id=...</code> في الرابط</Centered>;
  if (!data || data.total_classes === 0) return (
    <Centered>
      <p>لا توجد فصول بعد.</p>
      <p style={{fontSize:13,color:"#6b7280"}}>استخدم /newclass في البوت لإنشاء فصل.</p>
    </Centered>
  );

  return (
    <div style={{fontFamily:"'Tajawal',sans-serif",direction:"rtl",minHeight:"100vh",background:"var(--color-background-tertiary)"}}>
      {/* Top bar */}
      <div style={{background:"var(--color-background-primary)",borderBottom:"1px solid var(--color-border-tertiary)",padding:"12px 20px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:20}}>👨‍🏫</span>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:"var(--color-text-primary)"}}>لوحة الأستاذ</div>
          <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{data.total_classes} فصل · {data.classes.reduce((s,c)=>s+(c.overview?.student_count||0),0)} طالب</div>
        </div>
      </div>

      <div style={{display:"flex",gap:0,height:"calc(100vh - 57px)"}}>
        {/* Sidebar: class list */}
        <div style={{width:200,borderLeft:"1px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",overflowY:"auto",flexShrink:0}}>
          {data.classes.map(c => {
            const ov = c.overview || {};
            const rate = (ov as any).success_rate || 0;
            return (
              <div key={c.class_code}
                onClick={() => { setActiveClass(c.class_code); setTab("overview"); }}
                style={{padding:"12px 14px",borderBottom:"1px solid var(--color-border-tertiary)",cursor:"pointer",background:activeClass===c.class_code?"var(--color-background-secondary)":"transparent"}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)",marginBottom:2}}>{c.class_name}</div>
                <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{(ov as any).student_count||0} طالب</div>
                <div style={{marginTop:4,height:4,background:"var(--color-border-tertiary)",borderRadius:2}}>
                  <div style={{height:"100%",width:`${rate}%`,background:RATE_COLOR(rate),borderRadius:2,transition:"width .3s"}}/>
                </div>
                <div style={{fontSize:10,color:RATE_COLOR(rate),marginTop:2}}>{rate}% نجاح</div>
              </div>
            );
          })}
        </div>

        {/* Main content */}
        <div style={{flex:1,overflowY:"auto",padding:16}}>
          {cls ? (
            <>
              {/* Class header */}
              <div style={{background:"var(--color-background-primary)",borderRadius:12,padding:"14px 18px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700}}>{cls.class_name}</div>
                  <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{cls.grade_ar} · كود: <code style={{background:"var(--color-background-secondary)",padding:"1px 6px",borderRadius:4}}>{cls.class_code}</code></div>
                </div>
                <div style={{display:"flex",gap:12,textAlign:"center"}}>
                  <Stat label="طلاب" value={cls.overview?.student_count||0}/>
                  <Stat label="نجاح" value={`${cls.overview?.success_rate||0}%`} color={RATE_COLOR(cls.overview?.success_rate||0)}/>
                  <Stat label="نشط ٧أيام" value={cls.overview?.active_students_7d||0}/>
                  <Stat label="محاولات" value={cls.overview?.total_attempts||0}/>
                </div>
              </div>

              {/* Tabs */}
              <div style={{display:"flex",gap:4,marginBottom:12}}>
                {(["overview","students","gaps"] as const).map(t => (
                  <button key={t} onClick={()=>setTab(t)}
                    style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,
                      background:tab===t?"#7c3aed":"var(--color-background-secondary)",
                      color:tab===t?"#fff":"var(--color-text-secondary)"}}>
                    {t==="overview"?"📊 نظرة عامة":t==="students"?"👥 الطلاب":"🧠 الثغرات"}
                  </button>
                ))}
              </div>

              {tab==="overview" && <OverviewTab cls={cls}/>}
              {tab==="students" && <StudentsTab students={cls.students||[]}/>}
              {tab==="gaps"     && <GapsTab weaknesses={cls.weaknesses||[]}/>}
            </>
          ) : <Centered>اختر فصلاً من القائمة</Centered>}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ cls }: { cls: ClassData }) {
  const weak = cls.weaknesses || [];
  const students = cls.students || [];
  const danger = students.filter(s=>s.status==="danger");
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Weaknesses summary */}
      <Card title="⚠️ أضعف المفاهيم في الفصل">
        {weak.length===0 ? <p style={{color:"var(--color-text-secondary)",fontSize:13}}>✅ لا توجد ثغرات جماعية مكتشفة</p> :
        weak.map((w,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<weak.length-1?"1px solid var(--color-border-tertiary)":"none"}}>
            <div style={{minWidth:24,height:24,borderRadius:"50%",background:"#7c3aed",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>{i+1}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600}}>{w.concept.replace(/_/g," ")}</div>
              {w.pattern_name && <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{w.pattern_name}</div>}
            </div>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:12,fontWeight:600,color:"#dc2626"}}>{w.students_affected} طالب</div>
              <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>متوسط {(w.avg_frequency||0).toFixed(1)}× إخفاق</div>
            </div>
          </div>
        ))}
      </Card>
      {/* Danger students */}
      {danger.length>0 && (
        <Card title={`🔴 طلاب يحتاجون تدخلاً فورياً (${danger.length})`}>
          {danger.map(s=>(
            <div key={s.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--color-border-tertiary)"}}>
              <span style={{fontSize:13,fontWeight:600}}>{s.name}</span>
              <span style={{fontSize:12,color:"#dc2626"}}>{s.rate}% · {s.gap_count} ثغرة</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function StudentsTab({ students }: { students: Student[] }) {
  return (
    <Card title={`👥 الطلاب (${students.length})`}>
      <div style={{display:"flex",fontWeight:600,fontSize:12,color:"var(--color-text-secondary)",padding:"4px 0",borderBottom:"1px solid var(--color-border-tertiary)",marginBottom:6,gap:8}}>
        <span style={{flex:2}}>الاسم</span><span style={{width:60,textAlign:"center"}}>النجاح</span><span style={{width:50,textAlign:"center"}}>الثغرات</span><span style={{width:80,textAlign:"center"}}>آخر نشاط</span>
      </div>
      {students.map(s=>(
        <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid var(--color-border-tertiary)"}}>
          <span style={{flex:2,fontSize:13}}>{STATUS[s.status]} {s.name}</span>
          <span style={{width:60,textAlign:"center",fontSize:12,fontWeight:700,color:RATE_COLOR(s.rate),background:RATE_BG(s.rate),padding:"2px 6px",borderRadius:8}}>{s.rate}%</span>
          <span style={{width:50,textAlign:"center",fontSize:12,color:s.gap_count>3?"#dc2626":"var(--color-text-secondary)"}}>{s.gap_count}</span>
          <span style={{width:80,textAlign:"center",fontSize:11,color:"var(--color-text-secondary)"}}>{s.last_active}</span>
        </div>
      ))}
    </Card>
  );
}

function GapsTab({ weaknesses }: { weaknesses: Weakness[] }) {
  if (!weaknesses.length) return <Centered>✅ لا توجد ثغرات جماعية مكتشفة</Centered>;
  const max = weaknesses[0]?.students_affected || 1;
  return (
    <Card title="🧠 خريطة الثغرات الجماعية">
      {weaknesses.map((w,i)=>(
        <div key={i} style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:13,fontWeight:600}}>{w.concept.replace(/_/g," ")}</span>
            <span style={{fontSize:12,color:"#dc2626",fontWeight:600}}>{w.students_affected} طالب</span>
          </div>
          <div style={{height:8,background:"var(--color-border-tertiary)",borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${100*w.students_affected/max}%`,background:"linear-gradient(90deg,#7c3aed,#dc2626)",borderRadius:4,transition:"width .4s"}}/>
          </div>
          {w.pattern_name && <div style={{fontSize:11,color:"var(--color-text-secondary)",marginTop:2}}>{w.pattern_name}</div>}
        </div>
      ))}
    </Card>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Centered({ children }: { children: React.ReactNode }) {
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,color:"var(--color-text-secondary)",fontFamily:"'Tajawal',sans-serif",textAlign:"center",direction:"rtl"}}>{children}</div>;
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{background:"var(--color-background-primary)",borderRadius:12,padding:"14px 18px",border:"1px solid var(--color-border-tertiary)"}}>
      <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>{title}</div>
      {children}
    </div>
  );
}
function Stat({ label, value, color }: { label: string; value: string|number; color?: string }) {
  return (
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:18,fontWeight:800,color:color||"var(--color-text-primary)"}}>{value}</div>
      <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>{label}</div>
    </div>
  );
}
