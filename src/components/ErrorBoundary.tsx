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
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full border">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              An unexpected error occurred in the application.
            </p>
            
            {this.state.error && (
                <div className="bg-gray-100 p-4 rounded-md text-left mb-6 overflow-auto max-h-32 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Error Details:</p>
                    <code className="text-xs text-red-700 break-words font-mono">
                        {this.state.error.message}
                    </code>
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => window.location.reload()} className="flex-1">
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh Page
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/'} className="flex-1">
                    <Home className="mr-2 h-4 w-4" /> Go Home
                </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}