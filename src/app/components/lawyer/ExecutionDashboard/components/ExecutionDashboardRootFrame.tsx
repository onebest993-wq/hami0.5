import React from 'react';
import { useLitePerformanceActive } from '@/app/hooks/useLitePerformanceActive';

/** إطار ملء الشاشة — بدون blur على الأجهزة الخفيفة */
export function ExecutionDashboardRootFrame({ children }: { children: React.ReactNode }) {
    const lite = useLitePerformanceActive();

    return (
        <div
            className={
                lite
                    ? 'fixed inset-0 bg-slate-950 z-[100] flex items-center justify-center p-0'
                    : 'fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 backdrop-blur-3xl z-[100] flex items-center justify-center p-0'
            }
            dir="rtl"
        >
            {children}
        </div>
    );
}
