import { useCallback, useEffect, useState } from 'react';
import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';
import { CaseShareApiService } from '@/app/services/caseShare/caseShareApiService';
import { CASE_SHARE_CHANGED_EVENT } from '@/app/services/caseShare/caseShareSession';
import { TIMING } from '@/app/utils/constants';
import { STAGGERED_BOOT_IDLE_EVENT } from '@/app/bootstrap/staggeredBootOrchestrator';

const CASE_SHARE_CHANGED = CASE_SHARE_CHANGED_EVENT;

export type UseIncomingCaseSharesOptions = {
    /** null = بدون interval — أحداث + visibility فقط (شارة الجرس) */
    pollIntervalMs?: number | null;
    /** يؤجل أول fetch حتى اكتمال موجة boot المؤجّلة */
    deferInitialFetch?: boolean;
};

export function useIncomingCaseShares(
    userId: string | null,
    enabled = true,
    options?: UseIncomingCaseSharesOptions,
) {
    const pollIntervalMs = options?.pollIntervalMs ?? TIMING.NOTIFICATION_POLL;
    const [shares, setShares] = useState<CaseShareRecord[]>([]);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!userId) {
            setShares([]);
            return;
        }
        setLoading(true);
        try {
            const rows = await CaseShareApiService.listShares(userId);
            setShares(rows);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (!enabled || !userId) {
            setShares([]);
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
    const pendingCount = pending.length;
    const activeSessions = shares.filter(
        (s) => s.status === 'accepted' && (s.ownerId === userId || s.recipientId === userId),
    );

    return { shares, incoming, pending, pendingCount, activeSessions, loading, refresh };
}
