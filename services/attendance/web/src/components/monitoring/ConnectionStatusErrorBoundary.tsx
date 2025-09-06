'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ConnectionStatusErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ConnectionStatus Error Boundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div 
            className="p-6 bg-white rounded-lg shadow-md border border-red-200"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-red-800">
                연결 모니터링 오류
              </h3>
              <button
                onClick={this.handleRetry}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                다시 시도
              </button>
            </div>
            <p className="text-red-600 text-sm mb-4">
              실시간 접속 현황을 불러오는 중 오류가 발생했습니다.
            </p>
            {this.state.error && (
              <details className="text-xs text-red-500">
                <summary className="cursor-pointer">기술적 세부사항</summary>
                <pre className="mt-2 p-2 bg-red-50 rounded overflow-x-auto">
                  {this.state.error.message}
                  {this.state.error.stack && (
                    <>
                      {'\n\n'}
                      {this.state.error.stack}
                    </>
                  )}
                </pre>
              </details>
            )}
          </div>
        )
      );
    }

    return this.props.children;
  }
}