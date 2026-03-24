import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: Attempted to access:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center space-y-6 max-w-sm">
        <div className="w-24 h-24 rounded-3xl bg-gradient-hero flex items-center justify-center mx-auto">
          <span className="text-4xl font-black text-primary-foreground">٤٠٤</span>
        </div>
        <div>
          <h1 className="text-3xl font-black mb-2">الصفحة غير موجودة</h1>
          <p className="text-muted-foreground">
            عذراً، الصفحة التي تبحث عنها غير موجودة أو ربما تم نقلها.
          </p>
        </div>
        <Link
          to="/"
          className="inline-block bg-gradient-hero text-primary-foreground px-8 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          العودة للصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
