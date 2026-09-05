import { useMemo, useRef } from 'react';
import type { FollowupTabPanelKey } from './components/FollowupTabKeepAlivePanel';
import { resolveLegacyFollowupTabRuntimeRedirect } from './utils/followupLegacyTabNormalization';

export function resolveFollowupActivePanelKey(args: {
    unifiedModalTab: string;
    showPersonalCoerciveFollowupTab: boolean;
    hideFollowupCoerciveTab?: boolean;
    effectiveFollowupSectionTabOrder?: readonly string[];
}): FollowupTabPanelKey {
    const chip = resolveActiveFollowupChipTabId(args);
    if (chip === 'personal') return 'personal';
    if (chip === 'coercive') return 'coercive';
    return chip as FollowupTabPanelKey;
}

/** التبويب الظاهر في شريط المحضر (قد يختلف عن unifiedModalTab عند legacy personal) */
export function resolveActiveFollowupChipTabId(args: {
    unifiedModalTab: string;
    showPersonalCoerciveFollowupTab: boolean;
    hideFollowupCoerciveTab?: boolean;
    effectiveFollowupSectionTabOrder?: readonly string[];
}): string {
    const { unifiedModalTab, showPersonalCoerciveFollowupTab, hideFollowupCoerciveTab } = args;
    const legacyRedirect = resolveLegacyFollowupTabRuntimeRedirect({
        unifiedModalTab,
        effectiveFollowupSectionTabOrder: args.effectiveFollowupSectionTabOrder ?? [],
        hideFollowupCoerciveTab: Boolean(hideFollowupCoerciveTab),
    });
    const effectiveTab = legacyRedirect ?? unifiedModalTab;
    if (effectiveTab === 'personal' && showPersonalCoerciveFollowupTab) return 'personal';
    if (
        !hideFollowupCoerciveTab &&
        (effectiveTab === 'coercive' ||
            (effectiveTab === 'personal' && !showPersonalCoerciveFollowupTab))
    ) {
        return 'coercive';
    }
    return effectiveTab;
}

/** التبويبات التي زُرتها تبقى مركّبة ومخفية — لا إعادة تحميل عند العودة. غير المزار لا يُركَّب.
 * تبديل الإضبارة يصفّر المجموعة حتى لا تبقى ألواح الملف السابق. */
export function useFollowupModalTabKeepAlive(
    activePanelKey: FollowupTabPanelKey,
    dossierKeepAliveKey?: string,
) {
    const visitedRef = useRef<Set<FollowupTabPanelKey>>(new Set());
    const dossierKeyRef = useRef(dossierKeepAliveKey);
    if (dossierKeepAliveKey !== dossierKeyRef.current) {
        dossierKeyRef.current = dossierKeepAliveKey;
        visitedRef.current = new Set();
    }
    if (!visitedRef.current.has(activePanelKey)) {
        visitedRef.current.add(activePanelKey);
    }
    const visitedCount = visitedRef.current.size;
    return useMemo(
        () => new Set(visitedRef.current),
        [activePanelKey, visitedCount, dossierKeepAliveKey],
    );
}
