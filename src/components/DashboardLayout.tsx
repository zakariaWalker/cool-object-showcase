import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LucideIcon, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  navItems: NavItem[];
  accentColor: string;
  roleName: string;
}

const DashboardLayout = ({ children, title, navItems, accentColor, roleName }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-l border-sidebar-border flex-shrink-0 hidden lg:flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-hero flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">ر+</span>
            </div>
            <span className="text-sidebar-foreground font-bold">رياضيات+</span>
          </Link>
          <div className={`mt-3 text-xs px-2 py-1 rounded-md ${accentColor} text-primary-foreground inline-block`}>
            {roleName}
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== navItems[0]?.path && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border space-y-2">
          {profile && (
            <p className="text-sidebar-foreground/70 text-xs truncate">{profile.full_name}</p>
          )}
          <button onClick={handleSignOut} className="text-sidebar-foreground/50 text-xs hover:text-sidebar-foreground transition-colors flex items-center gap-1.5">
            <LogOut className="w-3.5 h-3.5" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Top bar mobile */}
        <div className="lg:hidden sticky top-0 z-40 glass-card border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">ر+</span>
            </div>
            <span className="font-bold text-sm">{title}</span>
          </div>
          <Link to="/" className="text-muted-foreground text-xs">الرئيسية</Link>
        </div>
        {/* Mobile nav */}
        <div className="lg:hidden overflow-x-auto border-b border-border bg-card">
          <div className="flex gap-1 p-2 min-w-max">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="p-6 lg:p-8">
          <h1 className="text-2xl font-bold mb-6">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
