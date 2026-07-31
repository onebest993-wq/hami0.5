/**
 * فتحات وفاة الخصوم على المسار البارد — تُشغّل الجسر عند النية ثم تنفّذ الإجراء الحقيقي.
 * لا stubs صامتة: إما تشغيل فوري بعد التحميل أو توست + إعادة بعد الجاهزية.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { PartyDeathSavePayload } from '@/app/components/lawyer/execution/PartyDeathReportModal';
import {
    getCreditorHeirSubstitutionRequestStatus,
    getDebtorHeirSubstitutionRequestStatus,
} from '@/app/utils/executorDecisionReadQueries';

export type PartyDeathLiveHandlers = {
    handlePartyDeathSave: (payload: PartyDeathSavePayload) => boolean;
    handleAlimonyBeneficiaryDeathConfirm: (input: unknown) => boolean;
    handleRequestDebtorSubstitution: () => boolean;
    handleRequestCreditorSubstitution: () => boolean;
    handleCreditorDeathMenuAction: () => void;
    handleDebtorDeathMenuAction: () => void;
};

export type UseExecutionDashboardPartyDeathOpenersParams = {
    decisionsStorageExecutionId: string;
    decisionsReloadEpoch: number;
    executionId: string | undefined;
    executionDataId: string | undefined;
    executionDataRef: MutableRefObject<{ id?: string } | null | undefined>;
    partyDeathModalParty: 'creditor' | 'debtor' | null;
    setPartyDeathModalParty: (party: 'creditor' | 'debtor' | null) => void;
    setPartyDeathModalDecisionId: (id: string | null) => void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    onPartyDeathHandlersReady?: (handlers: PartyDeathLiveHandlers) => void;
};

export function useExecutionDashboardPartyDeathOpeners({
    decisionsStorageExecutionId,
    decisionsReloadEpoch,
    executionId,
    executionDataId,
    executionDataRef,
    partyDeathModalParty,
    setPartyDeathModalParty,
    setPartyDeathModalDecisionId,
    showToast,
    onPartyDeathHandlersReady,
}: UseExecutionDashboardPartyDeathOpenersParams) {
    const [partyDeathHandlersIntent, setPartyDeathHandlersIntent] = useState(
        () => Boolean(partyDeathModalParty),
    );
    const liveRef = useRef<PartyDeathLiveHandlers | null>(null);
    const pendingRef = useRef<(() => void) | null>(null);

    const commitLiveHandlers = useCallback(
        (handlers: PartyDeathLiveHandlers) => {
            liveRef.current = handlers;
            onPartyDeathHandlersReady?.(handlers);
            const pending = pendingRef.current;
            pendingRef.current = null;
            if (pending) {
                try {
                    pending();
                } catch {
                    /* ignore */
                }
            }
        },
        [onPartyDeathHandlersReady],
    );

    const armIntent = useCallback((thenRun?: () => void) => {
        if (thenRun) pendingRef.current = thenRun;
        setPartyDeathHandlersIntent(true);
    }, []);

    useEffect(() => {
        if (partyDeathModalParty) setPartyDeathHandlersIntent(true);
    }, [partyDeathModalParty]);

    useEffect(() => {
        const openHandler = (e: Event) => {
            const ce = e as CustomEvent<{
                executionId?: string;
                party?: 'creditor' | 'debtor';
                decisionId?: string;
            }>;
            const detailId = String(ce.detail?.executionId ?? '').trim();
            const knownIds = [
                executionDataId,
                executionId,
                executionDataRef.current?.id,
                decisionsStorageExecutionId,
            ]
                .map((v) => String(v ?? '').trim())
                .filter((v) => v && v !== 'default' && v !== 'undefined');
            if (!detailId || !knownIds.includes(detailId)) return;
            const p = ce.detail?.party;
            if (p !== 'creditor' && p !== 'debtor') return;
            setPartyDeathHandlersIntent(true);
            setPartyDeathModalParty(p);
            const did = String(ce.detail?.decisionId ?? '').trim();
            setPartyDeathModalDecisionId(did || null);
        };
        window.addEventListener('hami-open-party-death-modal', openHandler as EventListener);
        return () =>
            window.removeEventListener('hami-open-party-death-modal', openHandler as EventListener);
    }, [
        decisionsStorageExecutionId,
        executionDataId,
        executionDataRef,
        executionId,
        setPartyDeathModalDecisionId,
        setPartyDeathModalParty,
    ]);

    const debtorSubstitutionRequestStatus = useMemo(
        () => getDebtorHeirSubstitutionRequestStatus(decisionsStorageExecutionId),
        [decisionsStorageExecutionId, decisionsReloadEpoch],
    );
    const creditorSubstitutionRequestStatus = useMemo(
        () => getCreditorHeirSubstitutionRequestStatus(decisionsStorageExecutionId),
        [decisionsStorageExecutionId, decisionsReloadEpoch],
    );

    const runOrArm = useCallback(
        (key: keyof PartyDeathLiveHandlers) => {
            const live = liveRef.current;
            if (live && typeof live[key] === 'function') {
                (live[key] as () => void)();
                return;
            }
            armIntent(() => {
                const next = liveRef.current;
                if (next && typeof next[key] === 'function') {
                    (next[key] as () => void)();
                }
            });
        },
        [armIntent],
    );

    const handlePartyDeathSave = useCallback(
        (payload: PartyDeathSavePayload): boolean => {
            const live = liveRef.current;
            if (live?.handlePartyDeathSave) {
                return live.handlePartyDeathSave(payload);
            }
            armIntent(() => {
                liveRef.current?.handlePartyDeathSave?.(payload);
            });
            showToast('جاري تجهيز أداة الإبلاغ عن الوفاة — أعد الحفظ بعد لحظة.', 'info');
            return false;
        },
        [armIntent, showToast],
    );

    const handleAlimonyBeneficiaryDeathConfirm = useCallback(
        (input: unknown): boolean => {
            const live = liveRef.current;
            if (live?.handleAlimonyBeneficiaryDeathConfirm) {
                return live.handleAlimonyBeneficiaryDeathConfirm(input);
            }
            armIntent(() => {
                liveRef.current?.handleAlimonyBeneficiaryDeathConfirm?.(input);
            });
            showToast('جاري تجهيز أداة إبلاغ النفقة — أعد المحاولة بعد لحظة.', 'info');
            return false;
        },
        [armIntent, showToast],
    );

    const partyDeathHandlers = useMemo(
        () => ({
            handlePartyDeathSave,
            handleAlimonyBeneficiaryDeathConfirm,
            handleRequestDebtorSubstitution: () => runOrArm('handleRequestDebtorSubstitution'),
            handleRequestCreditorSubstitution: () => runOrArm('handleRequestCreditorSubstitution'),
            handleCreditorDeathMenuAction: () => runOrArm('handleCreditorDeathMenuAction'),
            handleDebtorDeathMenuAction: () => runOrArm('handleDebtorDeathMenuAction'),
            debtorSubstitutionRequestStatus,
            creditorSubstitutionRequestStatus,
            prefetchPartyDeathHandlers: () => setPartyDeathHandlersIntent(true),
        }),
        [
            creditorSubstitutionRequestStatus,
            debtorSubstitutionRequestStatus,
            handleAlimonyBeneficiaryDeathConfirm,
            handlePartyDeathSave,
            runOrArm,
        ],
    );

    const loadPartyDeathHandlerCluster =
        partyDeathHandlersIntent || Boolean(partyDeathModalParty);

    return {
        partyDeathHandlers,
        loadPartyDeathHandlerCluster,
        commitLiveHandlers,
    };
}
