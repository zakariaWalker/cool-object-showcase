import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-center">
          <div className="w-20 h-20 bg-destructive/10 rounded-3xl flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-3xl font-black mb-2">عذراً، حدث خطأ ما</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            نعتذر عن هذا الخلل. يمكنك محاولة إعادة تحميل الصفحة أو العودة للرئيسية.
          </p>
          <div className="flex gap-4">
            <Button 
              variant="default" 
              className="font-bold flex items-center gap-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4" />
              إعادة التحميل
            </Button>
            <Button 
              variant="outline" 
              className="font-bold flex items-center gap-2"
              onClick={() => window.location.href = '/'}
            >
              <Home className="w-4 h-4" />
              الرئيسية
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-10 p-4 bg-muted rounded-xl text-left overflow-auto max-w-2xl w-full">
              <p className="text-xs font-mono text-destructive">{this.state.error?.toString()}</p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
