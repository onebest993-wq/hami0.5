import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { flushSync } from 'react-dom';

import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { concealSettingsWarmShell } from '@/app/runtime/settingsInstantPaint';
import { revealProfileWarmShell } from '@/app/runtime/profileInstantPaint';
import { primeProfileForOpen } from '@/app/runtime/profileShellPrime';
import { loadProfileHubModule, prefetchProfileHubModule } from '@/app/runtime/profileHubLoader';
import { loadProfileTabModule } from '@/app/runtime/profileTabModuleLoader';
import {
    clearProfilePerfMarks,
    markProfilePerfPhase,
} from '@/app/services/profile/profilePerfMetrics';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import {
    loadProfileWarmCache,
    prefetchProfileShellChunks,
} from '@/app/hooks/lawyerDashboard/profile/profileLazyImports';

export type CommitProfileOpenParams = {
    userId: string | null;
    openInFlightRef: MutableRefObject<boolean>;
    setProfileHostMounted: Dispatch<SetStateAction<boolean>>;
    setShowCommunity: (open: boolean) => void;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
    setProfileOpenEpoch: Dispatch<SetStateAction<number>>;
};

function applyProfileOpenReactState({
    userId: _userId,
    setProfileHostMounted,
    setShowCommunity,
    setActiveTab,
    setProfileOpenEpoch,
}: CommitProfileOpenParams): void {
    setProfileHostMounted(true);
    setShowCommunity(false);
    setActiveTab('profile');
    setProfileOpenEpoch((epoch) => epoch + 1);
}

function runProfileOpenSideEffects(userId: string | null): void {
    markProfilePerfPhase('chunk-ready');
    prefetchProfileShellChunks();
    primeProfileForOpen(userId);
    void loadProfileWarmCache()
        .then((m) => m.ensureProfilePaintReady(userId))
        .catch(() => undefined);
}

function deferProfileOpenWarmWork(userId: string | null): void {
    queueMicrotask(() => {
        prefetchProfileHubModule();
        void loadProfileHubModule().catch(() => undefined);
        void loadProfileTabModule().catch(() => undefined);
        runProfileOpenSideEffects(userId);
    });
}

/** فتح الملف: تبديل التبويب فوراً — التسخين بعد الإطار التالي */
export function commitProfileOpen(params: CommitProfileOpenParams): void {
    const { openInFlightRef } = params;

    if (openInFlightRef.current) return;
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

        concealSettingsWarmShell();
        dismissTransientOverlays('profile');

        flushSync(() => {
            applyProfileOpenReactState(params);
        });

        revealProfileWarmShell();
        deferProfileOpenWarmWork(params.userId);
    } finally {
        openInFlightRef.current = false;
    }
}
