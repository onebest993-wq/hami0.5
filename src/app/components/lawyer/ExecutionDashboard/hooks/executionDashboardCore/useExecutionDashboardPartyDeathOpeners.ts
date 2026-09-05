/**
 * فتحات وفاة الخصوم على المسار البارد — تُشغّل الجسر عند النية ثم تنفّذ الإجراء الحقيقي.
 * الضغطة تنتظر المعالج الحي ثم تنفّذه؛ التوست فقط بعد المهلة.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { PartyDeathSavePayload } from '@/app/components/lawyer/execution/PartyDeathReportModal';
import {
    getCreditorHeirSubstitutionRequestStatus,
    getDebtorHeirSubstitutionRequestStatus,
} from '@/app/utils/executorDecisionReadQueries';
import {
    HAMI_OPEN_PARTY_DEATH_MODAL,
    HAMI_PREFETCH_PARTY_DEATH_HANDLERS,
} from '@/app/utils/partyDeathUiEvents';
import {
    invokeMaybeStubFunctionOrWait,
    isExecutionHandlerWaitTimeout,
} from '../executionHandlerClusterStubs';

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
                    showToast('تعذّر تنفيذ الإبلاغ عن الوفاة. أعد المحاولة.', 'error');
                }
            }
        },
        [onPartyDeathHandlersReady, showToast],
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
        window.addEventListener(HAMI_OPEN_PARTY_DEATH_MODAL, openHandler as EventListener);
        return () =>
            window.removeEventListener(HAMI_OPEN_PARTY_DEATH_MODAL, openHandler as EventListener);
    }, [
        decisionsStorageExecutionId,
        executionDataId,
        executionDataRef,
        executionId,
        setPartyDeathModalDecisionId,
        setPartyDeathModalParty,
    ]);

    useEffect(() => {
        const prefetch = () => setPartyDeathHandlersIntent(true);
        window.addEventListener(HAMI_PREFETCH_PARTY_DEATH_HANDLERS, prefetch);
        return () => window.removeEventListener(HAMI_PREFETCH_PARTY_DEATH_HANDLERS, prefetch);
    }, []);

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
            const runLive = (bag: PartyDeathLiveHandlers | null) => {
                if (!bag || typeof bag[key] !== 'function') return false;
                try {
                    (bag[key] as () => void)();
                    return true;
                } catch {
                    showToast('تعذّر تنفيذ إجراء الوفاة/الإحلال. أعد المحاولة.', 'error');
                    return true;
                }
            };
            if (runLive(liveRef.current)) return;
            armIntent(() => {
                if (!runLive(liveRef.current)) {
                    showToast('جاري تجهيز أدوات الوفاة — أعد المحاولة بعد لحظة.', 'info');
                }
            });
        },
        [armIntent, showToast],
    );

    const handlePartyDeathSave = useCallback(
        (payload: PartyDeathSavePayload): boolean | Promise<boolean> => {
            const live = liveRef.current;
            if (live?.handlePartyDeathSave) {
                return live.handlePartyDeathSave(payload);
            }
            armIntent();
            const pending = invokeMaybeStubFunctionOrWait(
                'partyDeathHandlers.handlePartyDeathSave',
                [payload],
                {
                    coalesce: false,
                    readLive: () => liveRef.current?.handlePartyDeathSave,
                },
            );
            return Promise.resolve(pending).then((result) => {
                if (isExecutionHandlerWaitTimeout(result) || result === false) return false;
                return result !== false;
            });
        },
        [armIntent],
    );

    const handleAlimonyBeneficiaryDeathConfirm = useCallback(
        (input: unknown): boolean | Promise<boolean> => {
            const live = liveRef.current;
            if (live?.handleAlimonyBeneficiaryDeathConfirm) {
                return live.handleAlimonyBeneficiaryDeathConfirm(input);
            }
            armIntent();
            const pending = invokeMaybeStubFunctionOrWait(
                'partyDeathHandlers.handleAlimonyBeneficiaryDeathConfirm',
                [input],
                {
                    coalesce: false,
                    readLive: () => liveRef.current?.handleAlimonyBeneficiaryDeathConfirm,
                },
            );
            return Promise.resolve(pending).then((result) => {
                if (isExecutionHandlerWaitTimeout(result) || result === false) return false;
                return result !== false;
            });
        },
        [armIntent],
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
