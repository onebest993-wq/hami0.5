import type { Dispatch, SetStateAction } from 'react';

import { clearPersistedLawyerProfileTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { concealProfileWarmShell } from '@/app/runtime/profileInstantPaint';
import { executeOverlaySnapClose } from '@/app/runtime/overlaySnapClose';

export type CommitProfileCloseParams = {
    closeSettings?: () => void;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
};

/** إغلاق الملف: إخفاء DOM فوراً ثم commit React — مثل التقويم (بلا flushSync). */
export function commitProfileClose({ closeSettings, setActiveTab }: CommitProfileCloseParams): void {
    executeOverlaySnapClose({
        conceal: () => {
            concealProfileWarmShell();
        },
        commit: () => {
            clearPersistedLawyerProfileTab();
            closeSettings?.();
            setActiveTab('home');
        },
    });
}

/** إغلاق من منسّق overlays — بلا مسح الجلسة إن كان التبويب غير نشط. */
export function commitProfileOverlayDismiss({
    closeSettings,
    setActiveTab,
}: CommitProfileCloseParams): void {
    executeOverlaySnapClose({
        conceal: () => {
            concealProfileWarmShell();
        },
        commit: () => {
            closeSettings?.();
            setActiveTab((tab) => (tab === 'profile' ? 'home' : tab));
        },
    });
}
