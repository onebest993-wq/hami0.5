// @ts-nocheck
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { TimelineEvent } from '@/app/types/execution';
import SecureStoreService from '@/app/services/SecureStoreService';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { evictionInclusiveCalendarDays } from '../../helpers/dateUtils';
import {
    buildAppointmentReminderStoreKey,
    buildEvictionGraceReminderStoreKey,
    buildEvictionGraceReminderToastMessage,
    parseAppointmentEventTitle,
    parseAppointmentEventYmd,
    planTimelineDedupePersist,
    shouldEndGracePeriodFromExecutionStatus,
    shouldShowEvictionGraceReminderToast,
} from './executionDashboardTimelineAndGraceSync';

export function useExecutionDashboardEvictionGraceUiState(
    executionData: { id?: string } | null | undefined,
    executionId: string | undefined,
) {
    const graceUiExecutionKey = String(executionData?.id ?? executionId ?? '').trim();
    const gracePinnedKey = graceUiExecutionKey ? `hami_eviction_grace_pinned_${graceUiExecutionKey}` : '';
    const graceHiddenKey = graceUiExecutionKey ? `hami_eviction_grace_hidden_${graceUiExecutionKey}` : '';

    const [evictionGracePinned, setEvictionGracePinned] = useState<boolean>(() => {
        if (!gracePinnedKey) return true;
        try {
            const raw = SecureStoreService.getItemSync(gracePinnedKey);
            if (raw === null) return true;
            return raw === '1';
        } catch {
            return true;
        }
    });

    const [evictionGraceHidden, setEvictionGraceHidden] = useState<boolean>(() => {
        if (!graceHiddenKey) return false;
        try {
            return SecureStoreService.getItemSync(graceHiddenKey) === '1';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        if (!gracePinnedKey || !graceHiddenKey) return;
        try {
            const p = SecureStoreService.getItemSync(gracePinnedKey);
            setEvictionGracePinned(p === null ? true : p === '1');
            setEvictionGraceHidden(SecureStoreService.getItemSync(graceHiddenKey) === '1');
        } catch {
            /* ignore */
        }
    }, [gracePinnedKey, graceHiddenKey]);

    const toggleEvictionGracePinned = useCallback(() => {
        setEvictionGracePinned((v) => {
            const next = !v;
            if (gracePinnedKey) {
                try {
                    SecureStoreService.setItemSync(gracePinnedKey, next ? '1' : '0');
                } catch {
                    /* ignore */
                }
            }
            return next;
        });
    }, [gracePinnedKey]);

    return {
        evictionGracePinned,
        setEvictionGracePinned,
        evictionGraceHidden,
        setEvictionGraceHidden,
        toggleEvictionGracePinned,
        gracePinnedKey,
        graceHiddenKey,
    };
}

export function useExecutionDashboardTimelineDedupeSync({
    executionData,
    timelineEvents,
    activeSubFileId,
    parentDossierId,
    setTimelineEvents,
    persistExecutionMerge,
}: {
    executionData: { id?: string } | null | undefined;
    timelineEvents: TimelineEvent[];
    activeSubFileId: string | null | undefined;
    parentDossierId: string;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
}) {
    const dedupeSigRef = useRef('');

    useEffect(() => {
        const plan = planTimelineDedupePersist({
            timelineEvents,
            executionId: String(executionData?.id || ''),
            activeSubFileId,
            parentDossierId,
            previousSignature: dedupeSigRef.current,
        });
        if (!plan) return;
        dedupeSigRef.current = plan.signature;
        if (plan.skipPersistBecauseAlreadyRaw) return;
        setTimelineEvents(plan.cleaned);
        persistExecutionMerge({ timelineEvents: plan.cleaned });
    }, [executionData?.id, persistExecutionMerge, timelineEvents, activeSubFileId, parentDossierId, setTimelineEvents]);
}

export function useExecutionDashboardGraceLifecycleEffects({
    executionStatus,
    gracePeriodEnded,
    setGracePeriodEnded,
    setGracePeriodActive,
    timelineEventsRef,
    todayYmd,
    executionData,
    executionId,
    showToastRef,
    evictionGraceBadgeInfo,
    showToast,
}: {
    executionStatus: string | undefined;
    gracePeriodEnded: boolean;
    setGracePeriodEnded: Dispatch<SetStateAction<boolean>>;
    setGracePeriodActive: Dispatch<SetStateAction<boolean>>;
    timelineEventsRef: MutableRefObject<TimelineEvent[]>;
    todayYmd: string;
    executionData: { id?: string } | null | undefined;
    executionId: string | undefined;
    showToastRef: MutableRefObject<(message: string, type?: string) => void>;
    evictionGraceBadgeInfo: { remainingDays?: number; endYmd?: string } | null | undefined;
    showToast: (message: string, type?: string) => void;
}) {
    useEffect(() => {
        if (!shouldEndGracePeriodFromExecutionStatus(executionStatus, gracePeriodEnded)) return;
        setGracePeriodEnded(true);
        setGracePeriodActive(false);
    }, [executionStatus, gracePeriodEnded, setGracePeriodActive, setGracePeriodEnded]);

    useEffect(() => {
        const appts = (timelineEventsRef.current || []).filter(
            (ev) => String(ev?.type || '') === 'appointment',
        );
        const executionKey = String(executionData?.id ?? executionId ?? 'x');
        for (const ev of appts) {
            const ymd = parseAppointmentEventYmd(ev);
            if (!ymd || ymd < todayYmd) continue;
            const daysUntil = Math.max(0, evictionInclusiveCalendarDays(todayYmd, ymd) - 1);
            if (daysUntil > 1) continue;
            const title = parseAppointmentEventTitle(ev);
            const key = String(ev.id || `${ymd}-${title}`);
            const toastSig = buildAppointmentReminderStoreKey(executionKey, key, todayYmd);
            try {
                if (SecureStoreService.getItemSync(toastSig)) continue;
                SecureStoreService.setItemSync(toastSig, '1');
            } catch {
                /* ignore */
            }
            showToastRef.current(`موعد قريب: ${title} — ${ymd}`, 'info');
        }
    }, [todayYmd, executionData?.id, executionId, showToastRef, timelineEventsRef]);

    useEffect(() => {
        if (!evictionGraceBadgeInfo) return;
        if (
            !shouldShowEvictionGraceReminderToast({
                remainingDays: evictionGraceBadgeInfo.remainingDays,
            })
        ) {
            return;
        }
        const rem = Number(evictionGraceBadgeInfo.remainingDays ?? 0);
        const endYmd = String(evictionGraceBadgeInfo.endYmd ?? '');
        const persistKey = String(executionData?.id ?? executionId ?? '').trim();
        if (!persistKey || !endYmd) return;
        const today = getLocalTodayYmd();
        const storeKey = buildEvictionGraceReminderStoreKey(persistKey, endYmd);
        try {
            const last = String(SecureStoreService.getItemSync(storeKey) || '').trim();
            if (last === today) return;
            SecureStoreService.setItemSync(storeKey, today);
        } catch {
            /* ignore */
        }
        showToast(buildEvictionGraceReminderToastMessage(rem, endYmd), 'warning');
    }, [
        evictionGraceBadgeInfo?.endYmd,
        evictionGraceBadgeInfo?.remainingDays,
        executionData?.id,
        executionId,
        showToast,
    ]);
}
