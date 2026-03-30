import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AdminLess critical error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
          <div className="bg-card text-card-foreground p-8 rounded-2xl shadow-2xl max-w-md w-full border border-border">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-foreground mb-2">System Error</h1>
            <p className="text-muted-foreground mb-6 text-sm">
              An unexpected error occurred. Our team has been notified.
            </p>
            
            {this.state.error && (
                <div className="bg-muted p-4 rounded-lg text-left mb-6 overflow-auto max-h-32 border border-border">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Technical Details:</p>
                    <code className="text-[10px] text-destructive break-words font-mono">
                        {this.state.error.message}
                    </code>
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => window.location.reload()} className="flex-1 font-bold">
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh Page
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/'} className="flex-1 font-bold">
                    <Home className="mr-2 h-4 w-4" /> Return Home
                </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}