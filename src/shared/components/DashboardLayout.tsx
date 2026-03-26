import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LogOut, 
  Menu, 
  X,
  Bell,
  Search,
  Settings
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  path: string;
  label: string;
  icon: any;
}

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  accentColor?: string;
  title: string;
  roleName: string;
}

const DashboardLayout = ({ 
  children, 
  navItems, 
  accentColor = "bg-primary", 
  title,
  roleName 
}: DashboardLayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-72 flex-col bg-card border-l border-border transition-all">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className={`w-10 h-10 rounded-xl ${accentColor} flex items-center justify-center shadow-lg shadow-primary/20`}>
              <span className="text-white font-black text-xl">M</span>
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight">رياضيات+</h1>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{roleName}</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                    isActive 
                      ? `${accentColor} text-primary-foreground shadow-lg shadow-primary/10` 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-border bg-muted/30">
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden overflow-y-auto">
        <header className="h-20 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-black">{title}</h2>
          </div>

          <div className="flex items-center gap-3">
             <div className="hidden sm:flex relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input placeholder="بحث سريع..." className="bg-muted text-sm px-10 py-2 rounded-full border-none w-64 focus:ring-2 focus:ring-primary/20" />
             </div>
             <button className="p-2.5 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-card" />
             </button>
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent-foreground p-0.5">
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center font-bold text-xs">
                   {user?.email?.[0].toUpperCase() || "A"}
                </div>
             </div>
          </div>
        </header>

        <div className="p-6 pb-24 lg:p-10 max-w-7xl">
          {children}
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="fixed inset-y-0 right-0 w-80 bg-card shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${accentColor} flex items-center justify-center`}>
                    <span className="text-white font-bold tracking-tighter">M</span>
                  </div>
                  <h1 className="font-bold text-xl">رياضيات+</h1>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-4 rounded-xl font-bold bg-muted/50 hover:bg-muted"
                  >
                    <item.icon className="w-5 h-5 text-primary" />
                    {item.label}
                  </Link>
                ))}
              </nav>

              <button
                onClick={() => signOut()}
                className="flex items-center gap-3 w-full mt-8 px-4 py-4 rounded-xl font-bold text-destructive hover:bg-destructive/10 border border-destructive/20 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
