import { useCallback, useEffect, useState } from 'react';
import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';
import { CaseShareApiService } from '@/app/services/caseShare/caseShareApiService';
import { TIMING } from '@/app/utils/constants';

const CASE_SHARE_CHANGED = 'hami:case-share-changed';

export function useIncomingCaseShares(userId: string | null, enabled = true) {
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

        void refresh();

        const intervalId = window.setInterval(() => {
            void refresh();
        }, TIMING.NOTIFICATION_POLL);

        const onChanged = () => {
            void refresh();
        };
        window.addEventListener(CASE_SHARE_CHANGED, onChanged);

        const onVisibility = () => {
            if (document.visibilityState === 'visible') void refresh();
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener(CASE_SHARE_CHANGED, onChanged);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [enabled, userId, refresh]);

    const incoming = shares.filter((s) => s.recipientId === userId);
    const pending = incoming.filter((s) => s.status === 'pending');
    const pendingCount = pending.length;
    const activeSessions = shares.filter(
        (s) => s.status === 'accepted' && (s.ownerId === userId || s.recipientId === userId),
    );

    return { shares, incoming, pending, pendingCount, activeSessions, loading, refresh };
}
