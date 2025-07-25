"use client";

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error details
    console.error('React Error Boundary caught an error:', error);
    console.error('Error info:', errorInfo);
    
    // Check if it's the Zone object error
    if (error.message.includes('Objects are not valid as a React child') && 
        error.message.includes('Zone')) {
      console.error('🚨 ZONE OBJECT ERROR CAUGHT!');
      console.error('Error details:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
    
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-300 bg-red-50 rounded-md">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
          <details className="text-sm text-red-700">
            <summary className="cursor-pointer font-medium">Error Details</summary>
            <pre className="mt-2 whitespace-pre-wrap">
              {this.state.error?.message}
            </pre>
            {this.state.errorInfo && (
              <pre className="mt-2 whitespace-pre-wrap text-xs">
                {this.state.errorInfo.componentStack}
              </pre>
            )}
          </details>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;