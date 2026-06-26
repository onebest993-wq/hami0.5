import React, { Suspense } from 'react';
import type { MutableRefObject } from 'react';
import {
    EXEC_SECTION_LAZY_FALLBACK,
    LazyExecutionDashboardPhoneBody,
    LazyExecutionDashboardShellOverlays,
} from '../executionDashboardLazyShell';
import { ExecutionDashboardChunkScopeProvider } from '../hooks/executionDashboardChunkScope';

const PHONE_BODY_PLACEHOLDER_CLASS =
    'bg-slate-900/95 w-full max-w-md h-full flex flex-col shadow-2xl border border-slate-700/30';

function PhoneBodyLoadingShell() {
    return (
        <div className={PHONE_BODY_PLACEHOLDER_CLASS} dir="rtl" aria-busy="true" aria-label="جاري تحميل الإضبارة">
            <div className="flex flex-1 flex-col gap-3 p-4">{EXEC_SECTION_LAZY_FALLBACK}</div>
        </div>
    );
}

export type ExecutionDashboardChunkHostProps = {
    phoneBodyReady: boolean;
    shellOverlaysReady: boolean;
    chunkScopeRef: MutableRefObject<Record<string, unknown>>;
    phoneBodyFingerprint: string;
    showUnifiedExecutionModal: boolean;
};

/** جسم الإضبارة lazy + shell overlays عند الحاجة */
export function ExecutionDashboardChunkHost({
    phoneBodyReady,
    shellOverlaysReady,
    chunkScopeRef,
    phoneBodyFingerprint,
    showUnifiedExecutionModal,
}: ExecutionDashboardChunkHostProps) {
    if (!phoneBodyReady && !shellOverlaysReady) {
        return <PhoneBodyLoadingShell />;
    }

    return (
        <ExecutionDashboardChunkScopeProvider scopeRef={chunkScopeRef}>
            {shellOverlaysReady ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardShellOverlays
                        showUnifiedExecutionModal={showUnifiedExecutionModal}
                    />
                </Suspense>
            ) : null}
            {phoneBodyReady ? (
                <Suspense fallback={<PhoneBodyLoadingShell />}>
                    <LazyExecutionDashboardPhoneBody renderFingerprint={phoneBodyFingerprint} />
                </Suspense>
            ) : (
                <PhoneBodyLoadingShell />
            )}
        </ExecutionDashboardChunkScopeProvider>
    );
}