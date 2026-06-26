import { useLayoutEffect, useMemo, useState } from 'react';
import type { FollowupTabPanelKey } from './components/FollowupTabKeepAlivePanel';

export function resolveFollowupActivePanelKey(args: {
    unifiedModalTab: string;
    showPersonalCoerciveFollowupTab: boolean;
    hideFollowupCoerciveTab?: boolean;
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
}): string {
    const { unifiedModalTab, showPersonalCoerciveFollowupTab, hideFollowupCoerciveTab } = args;
    if (unifiedModalTab === 'personal' && showPersonalCoerciveFollowupTab) return 'personal';
    if (
        !hideFollowupCoerciveTab &&
        (unifiedModalTab === 'coercive' ||
            (unifiedModalTab === 'personal' && !showPersonalCoerciveFollowupTab))
    ) {
        return 'coercive';
    }
    return unifiedModalTab;
}

/** تبويبات زُرت مرة واحدة تبقى mounted — التبويب النشط يُعرض فوراً */
export function useFollowupModalTabKeepAlive(activePanelKey: FollowupTabPanelKey) {
    const [mountedPanels, setMountedPanels] = useState<Set<FollowupTabPanelKey>>(
        () => new Set([activePanelKey]),
    );

    useLayoutEffect(() => {
        setMountedPanels((prev) => {
            if (prev.has(activePanelKey)) return prev;
            const next = new Set(prev);
            next.add(activePanelKey);
            return next;
        });
    }, [activePanelKey]);

    return useMemo(() => {
        const next = new Set(mountedPanels);
        next.add(activePanelKey);
        return next;
    }, [mountedPanels, activePanelKey]);
}
