import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldAlert, ArrowRight, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Unauthorized = () => {
  const { role } = useAuth();

  const getDashboardPath = () => {
    switch (role) {
      case "student": return "/student";
      case "teacher": return "/teacher";
      case "admin": return "/admin";
      case "parent": return "/parent";
      default: return "/";
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mx-auto mb-8 border border-destructive/20">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        
        <h1 className="text-3xl font-black mb-4">دخول غير مصرح</h1>
        <p className="text-muted-foreground mb-10 leading-relaxed">
          عذراً، ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة. يرجى التأكد من أنك مسجل بالدور الصحيح.
        </p>

        <div className="space-y-4">
          <Link
            to={getDashboardPath()}
            className="w-full bg-gradient-hero text-primary-foreground py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Home className="w-5 h-5" />
            العودة للوحة التحكم
          </Link>
          
          <Link
            to="/"
            className="w-full bg-card border border-border text-foreground py-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors"
          >
            الرئيسية
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Unauthorized;
