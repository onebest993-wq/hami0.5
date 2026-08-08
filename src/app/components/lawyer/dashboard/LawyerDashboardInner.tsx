import React from 'react';
import { markDashboardInteractiveOnce } from '@/app/bootstrap/dashboardInteractiveMark';
import { preloadHomeDockBootChunk } from '@/app/bootstrap/homeDockBootGate';
import type { LawyerDashboardShellProps } from './LawyerDashboardQuantumShell';
import { LawyerDashboardInnerRuntime } from './LawyerDashboardInnerRuntime';

export type LawyerDashboardInnerProps = LawyerDashboardShellProps;

function warmPostInteractiveDashboardChunks(): void {
    preloadHomeDockBootChunk();
    void import('./LawyerDashboardHomeTab');
    void import('./LawyerDashboardMainView');
}

if (typeof window !== 'undefined') {
    warmPostInteractiveDashboardChunks();
}

/** بلا Suspense إضافي — InnerRuntime يُحمَّل مسبقاً من bootCriticalPreload */
export function LawyerDashboardInner(props: LawyerDashboardInnerProps) {
    markDashboardInteractiveOnce();
    warmPostInteractiveDashboardChunks();
    return <LawyerDashboardInnerRuntime {...props} />;
}
