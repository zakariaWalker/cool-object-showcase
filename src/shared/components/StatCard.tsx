import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  colorClass?: string;
}

const StatCard = ({ title, value, icon, colorClass = "bg-primary" }: StatCardProps) => {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${colorClass} text-white shadow-lg shadow-${colorClass.split("-")[1]}/20`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-black">{value}</p>
      </div>
    </div>
  );
};

export default StatCard;
