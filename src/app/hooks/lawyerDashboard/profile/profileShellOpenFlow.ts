import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { flushSync } from 'react-dom';

import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import {
    scheduleProfileShellReactSync,
    snapProfileShellOpen,
    isProfileShellSnappedOpen,
} from '@/app/services/profile/profileShellSnap';
import {
    clearProfilePerfMarks,
    markProfilePerfPhase,
} from '@/app/services/profile/profilePerfMetrics';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import {
    prefetchProfileShellChunks,
    warmProfileOpenSideEffects,
} from '@/app/hooks/lawyerDashboard/profile/profileLazyImports';

export type CommitProfileOpenParams = {
    userId: string | null;
    openInFlightRef: MutableRefObject<boolean>;
    setProfileHostMounted: Dispatch<SetStateAction<boolean>>;
    setShowCommunity: (open: boolean) => void;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
    setProfileOpenEpoch: Dispatch<SetStateAction<number>>;
};

function syncProfileOpenReactState({
    userId,
    setProfileHostMounted,
    setShowCommunity,
    setActiveTab,
    setProfileOpenEpoch,
    ensureSnapped,
}: CommitProfileOpenParams & { ensureSnapped?: boolean }): void {
    setProfileHostMounted(true);
    setShowCommunity(false);
    setActiveTab('profile');
    setProfileOpenEpoch((epoch) => epoch + 1);
    if (ensureSnapped) snapProfileShellOpen();
    markProfilePerfPhase('chunk-ready');
    prefetchProfileShellChunks();
    dismissTransientOverlays('profile');
    warmProfileOpenSideEffects(userId);
}

/** فتح الملف المهني: snap DOM أولاً ثم مزامنة React. */
export function commitProfileOpen(params: CommitProfileOpenParams): void {
    const { openInFlightRef } = params;

    if (isProfileShellSnappedOpen() || openInFlightRef.current) return;
    openInFlightRef.current = true;
    try {
        try {
            if (typeof performance !== 'undefined') {
                clearProfilePerfMarks();
                markProfilePerfPhase('open-request');
            }
        } catch {
            /* ignore */
        }

        const snapped = snapProfileShellOpen();

        if (!snapped) {
            flushSync(() => {
                params.setProfileHostMounted(true);
            });
            const afterMount = snapProfileShellOpen();
            scheduleProfileShellReactSync(() => {
                syncProfileOpenReactState({
                    ...params,
                    ensureSnapped: !afterMount,
                });
            });
            return;
        }

        scheduleProfileShellReactSync(() => {
            syncProfileOpenReactState({
                ...params,
                ensureSnapped: true,
            });
        });
    } finally {
        openInFlightRef.current = false;
    }
}
