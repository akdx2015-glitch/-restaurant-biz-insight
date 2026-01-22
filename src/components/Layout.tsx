import type { ReactNode } from 'react';

interface LayoutProps {
    children: ReactNode;
    sidebar: ReactNode;
}

export function Layout({ children, sidebar }: LayoutProps) {
    return (
        <div className="flex min-h-screen bg-slate-50">
            {sidebar}
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
                    {children}
                </div>
            </main>
        </div>
    );
}
