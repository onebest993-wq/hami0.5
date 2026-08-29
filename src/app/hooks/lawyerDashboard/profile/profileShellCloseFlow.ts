/**
 * إغلاق الملف: طلاء DOM فوري + flushSync للرئيسية —
 * لا double-rAF: كان يترك --active يغطي الشاشة بعد مسح inline → هيدر+سواد.
 */

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { flushSync } from 'react-dom';

import { clearPersistedLawyerProfileTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { concealProfileWarmShell } from '@/app/runtime/profileInstantPaint';
import { executeProfileOverlayClose } from '@/app/runtime/overlaySnapClose';
import { clearProfileShellClosing } from '@/app/services/profile/profileShellSnap';
import { blurFocusWithin } from '@/app/utils/inertProps';
import { clearProfileOpenedThisPage } from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';
import { beginProfileShellExit } from '@/app/hooks/lawyerDashboard/profile/profileShellExit';

const PROFILE_SURFACE_SELECTOR = '[data-testid="lawyer-dashboard-profile-surface"]';

function blurProfileSurfaceFocus(): void {
    if (typeof document === 'undefined') return;
    const surface = document.querySelector(PROFILE_SURFACE_SELECTOR);
    if (!(surface instanceof HTMLElement)) return;
    blurFocusWithin(surface);
}

export type CommitProfileCloseParams = {
    closeSettings?: () => void;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
    openInFlightRef?: MutableRefObject<boolean>;
};

function runProfileClosePaint(openInFlightRef?: MutableRefObject<boolean>): void {
    if (openInFlightRef) openInFlightRef.current = false;
    clearProfileOpenedThisPage();
    blurProfileSurfaceFocus();
    concealProfileWarmShell();
}

export function commitProfileClose({
    closeSettings,
    setActiveTab,
    openInFlightRef,
}: CommitProfileCloseParams): void {
    beginProfileShellExit(() => {
        executeProfileOverlayClose({
            conceal: () => {
                runProfileClosePaint(openInFlightRef);
            },
            commit: () => {
                try {
                    flushSync(() => {
                        clearPersistedLawyerProfileTab();
                        setActiveTab('home');
                    });
                } finally {
                    clearProfileShellClosing();
                }
            },
            releaseScrollLock: true,
        });

        queueMicrotask(() => {
            closeSettings?.();
        });
    });
}

export function commitProfileOverlayDismiss({
    closeSettings,
    setActiveTab,
    openInFlightRef,
}: CommitProfileCloseParams): void {
    beginProfileShellExit(() => {
        executeProfileOverlayClose({
            conceal: () => {
                runProfileClosePaint(openInFlightRef);
            },
            commit: () => {
                try {
                    flushSync(() => {
                        setActiveTab((tab) => (tab === 'profile' ? 'home' : tab));
                    });
                } finally {
                    clearProfileShellClosing();
                }
            },
            releaseScrollLock: true,
        });

        queueMicrotask(() => {
            closeSettings?.();
        });
    });
}
