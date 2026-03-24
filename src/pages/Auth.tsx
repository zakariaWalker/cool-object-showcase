import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, Users, Star, LogIn, UserPlus, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { AppRole } from '@/integrations/supabase/types';
import { toast } from 'sonner';

const roleOptions: { value: AppRole; label: string; icon: typeof GraduationCap; color: string }[] = [
  { value: 'student', label: 'طالب', icon: GraduationCap, color: 'bg-primary' },
  { value: 'teacher', label: 'معلم', icon: BookOpen, color: 'bg-secondary' },
  { value: 'admin', label: 'مدير', icon: Users, color: 'bg-accent' },
  { value: 'parent', label: 'ولي أمر', icon: Star, color: 'bg-success' },
];

const roleRedirects: Record<AppRole, string> = {
  student: '/student',
  teacher: '/teacher',
  admin: '/admin',
  parent: '/parent',
};

const Auth = () => {
  const { user, role, loading, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('student');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && role) {
    return <Navigate to={roleRedirects[role]} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message === 'Invalid login credentials' ? 'بيانات الدخول غير صحيحة' : error.message);
      }
    } else {
      if (!fullName.trim()) {
        toast.error('الرجاء إدخال الاسم الكامل');
        setSubmitting(false);
        return;
      }
      const { error } = await signUp(email, password, fullName, selectedRole);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن');
        setIsLogin(true);
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Right decorative panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-hero items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 80 + 20,
                height: Math.random() * 80 + 20,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.3,
              }}
            />
          ))}
        </div>
        <div className="text-center text-white relative z-10 p-12">
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl font-black">ر+</span>
          </div>
          <h2 className="text-4xl font-black mb-4">رياضيات+</h2>
          <p className="text-white/80 text-lg max-w-sm">منصة تعليم الرياضيات التفاعلية بالذكاء الاصطناعي</p>
        </div>
      </div>

      {/* Auth form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">ر+</span>
            </div>
            <span className="text-xl font-bold">رياضيات+</span>
          </div>

          <h1 className="text-2xl font-black mb-2">{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}</h1>
          <p className="text-muted-foreground mb-8">
            {isLogin ? 'أدخل بياناتك للوصول إلى المنصة' : 'انضم إلى مجتمع رياضيات+ التعليمي'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">الاسم الكامل</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="أدخل اسمك الكامل"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">اختر دورك</label>
                  <div className="grid grid-cols-2 gap-3">
                    {roleOptions.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setSelectedRole(r.value)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          selectedRole === r.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg ${r.color} flex items-center justify-center`}>
                          <r.icon className="w-4 h-4 text-primary-foreground" />
                        </div>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="example@email.com"
                dir="ltr"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="••••••••"
                dir="ltr"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-hero text-primary-foreground py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isLogin ? (
                <>
                  <LogIn className="w-5 h-5" />
                  دخول
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  إنشاء حساب
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? 'ليس لديك حساب؟ أنشئ حساباً جديداً' : 'لديك حساب؟ سجل الدخول'}
            </button>
          </div>

          <div className="mt-4 text-center">
            <a href="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              العودة للرئيسية
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
