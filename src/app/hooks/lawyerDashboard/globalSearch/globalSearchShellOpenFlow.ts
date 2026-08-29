import type { MutableRefObject } from 'react';

import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { persistGlobalSearchSessionOpen } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { paintGlobalSearchInstantChrome } from '@/app/runtime/globalSearchInstantPaint';
import { takeGlobalSearchDraftQuery } from '@/app/runtime/globalSearchDraftQuery';
import {
    isGlobalSearchOverlayModuleResolved,
    loadGlobalSearchOverlayModule,
    prefetchGlobalSearchSearchEngine,
} from '@/app/runtime/globalSearchLoader';
import { hydrateGlobalSearchShellForInstantOpen } from '@/app/runtime/globalSearchBootHydrator';
import { warmGlobalSearchOnOpen } from '@/app/hooks/lawyerDashboard/globalSearchIntentWarm';
import {
    clearGlobalSearchPerfMarks,
    markGlobalSearchPerfPhase,
} from '@/app/services/search/globalSearchPerfMetrics';

export type CommitGlobalSearchShellOpenParams = {
    querySeed?: string;
    showGlobalSearchRef: MutableRefObject<boolean>;
    setSearchHostMounted: (mounted: boolean) => void;
    setGlobalSearchInitialQuery: (query: string) => void;
    setShowGlobalSearch: (open: boolean) => void;
};

export function commitGlobalSearchShellOpen({
    querySeed,
    showGlobalSearchRef,
    setSearchHostMounted,
    setGlobalSearchInitialQuery,
    setShowGlobalSearch,
}: CommitGlobalSearchShellOpenParams): void {
    try {
        if (typeof performance !== 'undefined') {
            clearGlobalSearchPerfMarks();
            markGlobalSearchPerfPhase('open-request');
        }
    } catch {
        /* ignore */
    }

    const resolvedSeed =
        (typeof querySeed === 'string' && querySeed.trim()) || takeGlobalSearchDraftQuery() || '';

    showGlobalSearchRef.current = true;

    /*
     * طلاء DOM أولاً. بلا flushSync: كان يرمي شجرة الحقل دفعة فوق الستارة
     * ويُسابق IME على أندرويد. التركيز يبقى useGlobalSearchFocusArm (ويب فقط).
     */
    paintGlobalSearchInstantChrome();

    setSearchHostMounted(true);
    setGlobalSearchInitialQuery(resolvedSeed);
    setShowGlobalSearch(true);
    persistGlobalSearchSessionOpen(true);

    if (isGlobalSearchOverlayModuleResolved()) {
        markGlobalSearchPerfPhase('chunk-ready');
    }

    queueMicrotask(() => {
        if (!showGlobalSearchRef.current) return;
        warmGlobalSearchOnOpen();
        dismissTransientOverlays('global-search');
        prefetchGlobalSearchSearchEngine();
        void loadGlobalSearchOverlayModule()
            .catch(() => undefined)
            .then(() => {
                if (showGlobalSearchRef.current) {
                    markGlobalSearchPerfPhase('chunk-ready');
                }
            });
        void hydrateGlobalSearchShellForInstantOpen(true).catch(() => undefined);
    });
}
