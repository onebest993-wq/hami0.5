import { useCallback, useEffect, useState } from 'react';
import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';
import { CASE_SHARE_CHANGED_EVENT } from '@/app/services/caseShare/caseShareSession';
import { peekCaseSharePendingCount } from '@/app/services/caseShare/caseSharePeekLite';
import { TIMING } from '@/app/utils/constants';
import { STAGGERED_BOOT_IDLE_EVENT } from '@/app/bootstrap/staggeredBootEvents';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';

const CASE_SHARE_CHANGED = CASE_SHARE_CHANGED_EVENT;

type UseIncomingCaseSharesOptions = {
    /** null = بدون interval — أحداث + visibility فقط (شارة الجرس) */
    pollIntervalMs?: number | null;
    /** يؤجل أول fetch حتى اكتمال موجة boot المؤجّلة */
    deferInitialFetch?: boolean;
    /**
     * شارة الجرس على الرئيسية: قراءة محلية فقط — بلا `/api/case-share` ولا توقيع WIFE.
     * الشبكة تبقى للوحة الإشعارات المفتوحة ومسار الاستشارة الصريح.
     */
    localPeekOnly?: boolean;
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
    const localPeekOnly = options?.localPeekOnly === true;
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
        if (localPeekOnly) {
            setPendingCountLite(peekCaseSharePendingCount(userId));
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
    }, [localPeekOnly, userId]);

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

        if (localPeekOnly) {
            /* الشارة من peek — بلا مؤقت ولا /api/case-share */
        } else if (options?.deferInitialFetch) {
            window.addEventListener(STAGGERED_BOOT_IDLE_EVENT, onBootIdle, { once: true });
            bootIdleTimer = window.setTimeout(onBootIdle, 18_000);
        } else {
            runInitialFetch();
        }

        const onChanged = () => {
            setPendingCountLite(peekCaseSharePendingCount(userId));
            if (!localPeekOnly) void refresh();
        };
        window.addEventListener(CASE_SHARE_CHANGED, onChanged);

        const onVisibility = () => {
            if (document.visibilityState === 'visible' && !localPeekOnly) void refresh();
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            cancelled = true;
            if (bootIdleTimer !== undefined) window.clearTimeout(bootIdleTimer);
            window.removeEventListener(STAGGERED_BOOT_IDLE_EVENT, onBootIdle);
            window.removeEventListener(CASE_SHARE_CHANGED, onChanged);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [enabled, localPeekOnly, options?.deferInitialFetch, userId, refresh]);

    useVisibilityAwareInterval(
        () => {
            void refresh();
        },
        pollIntervalMs ?? 0,
        enabled && Boolean(userId) && !localPeekOnly && pollIntervalMs != null && pollIntervalMs > 0,
    );

    const incoming = shares.filter((s) => s.recipientId === userId);
    const pending = incoming.filter((s) => s.status === 'pending');
    const pendingCount = shares.length > 0 ? pending.length : pendingCountLite;
    const activeSessions = shares.filter(
        (s) => s.status === 'accepted' && (s.ownerId === userId || s.recipientId === userId),
    );

    return { shares, incoming, pending, pendingCount, activeSessions, loading, refresh };
}
