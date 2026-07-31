import React from 'react';
import { useLitePerformanceActive } from '@/app/hooks/useLitePerformanceActive';
import { EXECUTION_DOSSIER_TEST_IDS } from '@/app/components/lawyer/ExecutionDashboard/executionDossierTestIds';

/** إطار ملء الشاشة — بدون blur على الأجهزة الخفيفة. z فوق مخزن التنفيذ (220). */
export function ExecutionDashboardRootFrame({ children }: { children: React.ReactNode }) {
    const lite = useLitePerformanceActive();

    return (
        <div
            className={
                lite
                    ? 'fixed inset-0 bg-slate-950 z-[230] flex items-center justify-center p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]'
                    : 'fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 backdrop-blur-3xl z-[230] flex items-center justify-center p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]'
            }
            dir="rtl"
            data-testid={EXECUTION_DOSSIER_TEST_IDS.dossier}
        >
            {children}
        </div>
    );
}
