import React, { Suspense } from 'react';

import { FollowupModalStoreProvider, type FollowupModalSnapshot } from '../followupModalContext';
import { EXEC_MODAL_BACKDROP_STRONG, EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';

import { prefetchExecutionFollowupTab } from '../executionFollowupTabPrefetch';
import { LazyExecutionFollowupModalPortal } from '../executionFollowupModalLazy';

type ExecutionFollowupModalHostProps = {
    open: boolean;
    snapshot: FollowupModalSnapshot;
};

/** غلاف ثابت أثناء تحميل chunk المحضر — لا يُظهر الإضبارة خلفه */
function ExecutionFollowupModalPortalShellFallback() {
    return (
        <div
            className={`fixed inset-0 ${EXEC_MODAL_BACKDROP_STRONG}`}
            style={{ zIndex: EXEC_MODAL_Z.unifiedFollowUp }}
            role="presentation"
            aria-busy="true"
            aria-label="جاري تحميل محضر المتابعة"
        >
            <div className="w-full">
                <div className="relative mx-auto flex h-[min(90vh,920px)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 shadow-[0_8px_32px_rgba(0,0,0,0.5)] ring-1 ring-white/5 backdrop-blur-3xl">
                    <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3 backdrop-blur-3xl">
                        <span className="w-9" aria-hidden />
                        <h2 className="text-lg font-bold tracking-wide text-amber-200">محضر المتابعة</h2>
                        <span className="w-9" aria-hidden />
                    </div>
                    <div className="min-h-0 flex-1 animate-pulse bg-white/[0.03] p-6" />
                </div>
            </div>
        </div>
    );
}

/** UNIFIED EXECUTION & ASSETS MODAL — lazy + prefetch عند الفتح */
export function ExecutionFollowupModalHost({ open, snapshot }: ExecutionFollowupModalHostProps) {
    if (!open) return null;

    const tabToPrefetch =
        typeof snapshot.unifiedModalTab === 'string' && snapshot.unifiedModalTab.length > 0
            ? String(snapshot.unifiedModalTab)
            : 'seizure_requests';
    prefetchExecutionFollowupTab(tabToPrefetch);

    return (
        <FollowupModalStoreProvider snapshot={snapshot}>
            <Suspense fallback={<ExecutionFollowupModalPortalShellFallback />}>
                <LazyExecutionFollowupModalPortal />
            </Suspense>
        </FollowupModalStoreProvider>
    );
}

