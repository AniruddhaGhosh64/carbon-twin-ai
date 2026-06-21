import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import logger from "@/lib/logger";

interface Props {
  children?: ReactNode;
  fallbackName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(`ErrorBoundary caught an error in section "${this.props.fallbackName || "unknown"}"`, error, {
      componentStack: errorInfo.componentStack,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center rounded-xl bg-glass border border-error/20 shadow-glow animate-fade-in my-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-error-container/20 border border-error/30 text-error mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>
          
          <h2 className="text-title-md font-bold text-on-surface mb-2">
            Something went wrong in {this.props.fallbackName || "this section"}
          </h2>
          
          <p className="text-body-sm text-on-surface-variant max-w-md mb-6">
            {this.state.error?.message || "An unexpected rendering error occurred. The application sandbox caught the exception to prevent a crash."}
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary font-medium hover:bg-primary/90 transition-all text-body-sm shadow-md cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <a
              href="/dashboard"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-container border border-outline/20 text-on-surface hover:bg-surface-container-high transition-all text-body-sm cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Dashboard Overview
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
