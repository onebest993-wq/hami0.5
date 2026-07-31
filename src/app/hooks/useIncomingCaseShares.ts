import { useCallback, useEffect, useState } from 'react';
import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';
import { CASE_SHARE_CHANGED_EVENT } from '@/app/services/caseShare/caseShareSession';
import { peekCaseSharePendingCount } from '@/app/services/caseShare/caseSharePeekLite';
import { TIMING } from '@/app/utils/constants';
import { STAGGERED_BOOT_IDLE_EVENT } from '@/app/bootstrap/staggeredBootEvents';

const CASE_SHARE_CHANGED = CASE_SHARE_CHANGED_EVENT;

export type UseIncomingCaseSharesOptions = {
    /** null = بدون interval — أحداث + visibility فقط (شارة الجرس) */
    pollIntervalMs?: number | null;
    /** يؤجل أول fetch حتى اكتمال موجة boot المؤجّلة */
    deferInitialFetch?: boolean;
};

function loadCaseShareApiService() {
    return import('@/app/services/caseShare/caseShareApiService');
}

export function useIncomingCaseShares(
    userId: string | null,
    enabled = true,
    options?: UseIncomingCaseSharesOptions,
) {
    const pollIntervalMs = options?.pollIntervalMs ?? TIMING.NOTIFICATION_POLL;
    const [shares, setShares] = useState<CaseShareRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [pendingCountLite, setPendingCountLite] = useState(() =>
        peekCaseSharePendingCount(userId),
    );

    useEffect(() => {
        setPendingCountLite(peekCaseSharePendingCount(userId));
    }, [userId]);

    const refresh = useCallback(async () => {
        if (!userId) {
            setShares([]);
            setPendingCountLite(0);
            return;
        }
        setLoading(true);
        try {
            const { CaseShareApiService } = await loadCaseShareApiService();
            const rows = await CaseShareApiService.listShares(userId);
            setShares(rows);
            setPendingCountLite(
                rows.filter((s) => s.recipientId === userId && s.status === 'pending').length,
            );
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (!enabled || !userId) {
            setShares([]);
            setPendingCountLite(0);
            return;
        }

        let cancelled = false;
        let bootIdleTimer: number | undefined;

        const runInitialFetch = () => {
            if (!cancelled) void refresh();
        };

        const onBootIdle = () => runInitialFetch();

        if (options?.deferInitialFetch) {
            window.addEventListener(STAGGERED_BOOT_IDLE_EVENT, onBootIdle, { once: true });
            bootIdleTimer = window.setTimeout(onBootIdle, 18_000);
        } else {
            runInitialFetch();
        }

        const intervalId =
            pollIntervalMs != null && pollIntervalMs > 0
                ? window.setInterval(() => {
                      void refresh();
                  }, pollIntervalMs)
                : null;

        const onChanged = () => {
            setPendingCountLite(peekCaseSharePendingCount(userId));
            void refresh();
        };
        window.addEventListener(CASE_SHARE_CHANGED, onChanged);

        const onVisibility = () => {
            if (document.visibilityState === 'visible') void refresh();
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            cancelled = true;
            if (bootIdleTimer !== undefined) window.clearTimeout(bootIdleTimer);
            window.removeEventListener(STAGGERED_BOOT_IDLE_EVENT, onBootIdle);
            if (intervalId != null) window.clearInterval(intervalId);
            window.removeEventListener(CASE_SHARE_CHANGED, onChanged);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [enabled, options?.deferInitialFetch, pollIntervalMs, userId, refresh]);

    const incoming = shares.filter((s) => s.recipientId === userId);
    const pending = incoming.filter((s) => s.status === 'pending');
    const pendingCount = shares.length > 0 ? pending.length : pendingCountLite;
    const activeSessions = shares.filter(
        (s) => s.status === 'accepted' && (s.ownerId === userId || s.recipientId === userId),
    );

    return { shares, incoming, pending, pendingCount, activeSessions, loading, refresh };
}
