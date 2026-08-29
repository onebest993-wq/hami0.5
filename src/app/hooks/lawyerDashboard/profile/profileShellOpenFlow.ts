/**
 * فتح الملف المهني:
 * 1) تركيب Host + تبويب فوراً — صفحة الفتح الكاملة تغطي Suspense (مثل رادار الجدول)
 * 2) كشف DOM بعد أن الصفحة في السطح — لا انتظار شبكة/Royal
 * 3) اعتماد الشجرة الحية تحت الغطاء
 */

import { flushSync } from 'react-dom';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { concealSettingsWarmShell } from '@/app/runtime/settingsInstantPaint';
import { revealProfileWarmShell } from '@/app/runtime/profileInstantPaint';
import { primeProfileForOpen } from '@/app/runtime/profileShellPrime';
import { hydrateProfileWarmCachePeekSync } from '@/app/services/profile/profileWarmCache';
import {
    clearProfilePerfMarks,
    markProfilePerfPhase,
} from '@/app/services/profile/profilePerfMetrics';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import {
    loadProfileWarmCache,
    prefetchProfileShellChunks,
} from '@/app/hooks/lawyerDashboard/profile/profileLazyImports';
import { markProfileOpenedThisPage } from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';

export type CommitProfileOpenParams = {
    userId: string | null;
    openInFlightRef: MutableRefObject<boolean>;
    setProfileHostMounted: Dispatch<SetStateAction<boolean>>;
    setShowCommunity: (open: boolean) => void;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
    setProfileOpenEpoch: Dispatch<SetStateAction<number>>;
};

function applyProfileOpenReactState(params: CommitProfileOpenParams): void {
    const { setProfileHostMounted, setShowCommunity, setActiveTab, setProfileOpenEpoch } = params;
    setProfileHostMounted(true);
    setShowCommunity(false);
    setActiveTab('profile');
    setProfileOpenEpoch((epoch) => epoch + 1);
}

function runProfileOpenSideEffects(userId: string | null): void {
    prefetchProfileShellChunks();
    primeProfileForOpen(userId);
    void loadProfileWarmCache()
        .then((m) => m.ensureProfilePaintReady(userId))
        .catch(() => undefined);
}

function deferProfileOpenWarmWork(userId: string | null): void {
    queueMicrotask(() => {
        runProfileOpenSideEffects(userId);
    });
}

/** بذرة كاش — قبل رسم صفحة الفتح */
export function prepareProfileOpenPaint(userId: string | null): void {
    try {
        hydrateProfileWarmCachePeekSync(userId);
    } catch {
        /* ignore */
    }
}

/**
 * فتح مثل الجدول: React يرسم الصفحة الكاملة أولاً، ثم snap DOM.
 */
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

        markProfileOpenedThisPage();
        prepareProfileOpenPaint(params.userId);
        flushSync(() => {
            applyProfileOpenReactState(params);
        });
        revealProfileWarmShell();

        try {
            concealSettingsWarmShell();
        } catch {
            /* ignore */
        }

        try {
            markProfilePerfPhase('chunk-ready');
        } catch {
            /* ignore */
        }

        queueMicrotask(() => {
            prefetchProfileShellChunks();
            void import('@/app/runtime/royalLawyerProfileLoader')
                .then((m) => {
                    m.prefetchProfileHubModule();
                    return m.loadProfileHubModule();
                })
                .catch(() => undefined);
            dismissTransientOverlays('profile');
            deferProfileOpenWarmWork(params.userId);
            openInFlightRef.current = false;
        });
    } catch {
        openInFlightRef.current = false;
    }
}
