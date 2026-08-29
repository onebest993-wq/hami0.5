import { useCallback, useEffect, useState } from 'react';
import type { AdminTabId } from '@/app/components/admin/hqTabs';

const USERS_WARM_IDLE_MS = 400;

/**
 * يُركَّب التبويب عند أول زيارة (أو تسخين) ويبقى مخفياً — بلا إعادة جلب عند الرجوع.
 * القوانين لا تُسخَّن مسبقاً (مقطع lazy ثقيل).
 */
export function useHqTabKeepAlive(
    activeTab: AdminTabId,
    opts?: { allowWarm?: boolean },
): {
    isMounted: (id: AdminTabId) => boolean;
    warmTab: (id: AdminTabId) => void;
} {
    const allowWarm = opts?.allowWarm !== false;
    const [mounted, setMounted] = useState(() => new Set<AdminTabId>([activeTab]));

    const mountTab = useCallback((id: AdminTabId) => {
        setMounted((prev) => {
            if (prev.has(id)) return prev;
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    }, []);

    useEffect(() => {
        mountTab(activeTab);
    }, [activeTab, mountTab]);

    useEffect(() => {
        if (!allowWarm || activeTab !== 'monitor') return;
        const warmUsers = () => mountTab('users');
        const ric = window.requestIdleCallback;
        if (typeof ric === 'function') {
            const idleId = ric(warmUsers, { timeout: 800 });
            return () => {
                const cancel = window.cancelIdleCallback;
                if (typeof cancel === 'function') cancel(idleId);
            };
        }
        const timer = window.setTimeout(warmUsers, USERS_WARM_IDLE_MS);
        return () => window.clearTimeout(timer);
    }, [activeTab, mountTab, allowWarm]);

    const warmTab = useCallback(
        (id: AdminTabId) => {
            if (id === 'laws') return;
            mountTab(id);
        },
        [mountTab],
    );

    const isMounted = useCallback((id: AdminTabId) => mounted.has(id), [mounted]);

    return { isMounted, warmTab };
}
