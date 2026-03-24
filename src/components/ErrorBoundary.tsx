import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full bg-card rounded-2xl border border-border p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold">حدث خطأ غير متوقع</h2>
            <p className="text-muted-foreground text-sm">
              يرجى إعادة تحميل الصفحة أو التواصل مع الدعم إذا استمر الخطأ.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left mt-4">
                <summary className="text-xs text-muted-foreground cursor-pointer">تفاصيل الخطأ (وضع التطوير)</summary>
                <pre className="mt-2 text-xs bg-muted p-3 rounded-lg overflow-auto text-destructive">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.assign("/")}
              className="bg-gradient-hero text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium w-full"
            >
              العودة للصفحة الرئيسية
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
