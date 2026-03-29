import { useEffect, useState } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay } from "date-fns";
import { ar } from "date-fns/locale";

export function ProgressChart({ userId, details = false }: { userId: string, details?: boolean }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      const { data: logs, error } = await supabase
        .from("student_activity_log")
        .select("created_at, xp_earned")
        .eq("student_id", userId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error);
        return;
      }

      // Process data: Group by date and accumulate XP
      const dailyXP: Record<string, number> = {};
      
      // Initialize last 7 days with 0 if no logs (or more for details)
      const daysToLookBack = details ? 30 : 7;
      for (let i = daysToLookBack; i >= 0; i--) {
        const dateStr = format(subDays(new Date(), i), "yyyy-MM-dd");
        dailyXP[dateStr] = 0;
      }

      logs?.forEach(log => {
        const dateStr = format(new Date(log.created_at), "yyyy-MM-dd");
        if (dailyXP[dateStr] !== undefined) {
          dailyXP[dateStr] += log.xp_earned || 0;
        }
      });

      const chartData = Object.entries(dailyXP).map(([date, xp]) => ({
        date: format(new Date(date), "MMM d", { locale: ar }),
        xp
      }));

      setData(chartData);
      setLoading(false);
    }

    fetchActivity();
  }, [userId, details]);

  if (loading) return <div className="w-full h-full bg-muted/20 animate-pulse rounded-2xl" />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
        <XAxis 
          dataKey="date" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
          dy={10}
        />
        <YAxis 
          hide 
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: "hsl(var(--card))", 
            borderRadius: "12px", 
            border: "1px solid hsl(var(--border))",
            fontSize: "12px",
            fontWeight: "bold"
          }} 
          itemStyle={{ color: "var(--primary)" }}
        />
        <Area 
          type="monotone" 
          dataKey="xp" 
          stroke="var(--primary)" 
          strokeWidth={3}
          fillOpacity={1} 
          fill="url(#colorXp)" 
          animationDuration={1500}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
