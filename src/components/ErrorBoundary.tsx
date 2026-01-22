import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

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
        error: null
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
                <div className="p-6 bg-red-50 border border-red-200 rounded-xl flex items-start gap-4">
                    <div className="p-2 bg-red-100 rounded-lg text-red-600">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h2 className="text-red-800 font-bold mb-1">시스템 오류가 발생했습니다</h2>
                        <p className="text-red-600 text-sm mb-4">
                            보고서 생성 중 문제가 발생하여 화면을 표시할 수 없습니다.
                        </p>
                        <div className="bg-white p-3 rounded-lg border border-red-100 text-xs text-slate-500 font-mono overflow-auto max-w-lg">
                            {this.state.error?.message}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            이 에러 메시지를 캡처하여 개발자에게 전달해주세요.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
