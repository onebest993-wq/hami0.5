import { useRef, type MutableRefObject } from 'react';
import {
    asHandlerClusterSpreads,
    collectFullHandlerClusterContext,
    readHandlerClusterContextValue,
    type HandlerClusterBridgeInput,
} from './handlerClusterContextShared';
import {
    useExecutionDashboardPartyDeathHandlers,
    type UseExecutionDashboardPartyDeathHandlersParams,
} from './useExecutionDashboardPartyDeathHandlers';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';
import type { ExecutionFile } from '@/app/types/execution';

export type ExecutionDashboardHandlerClusterPartyDeathBridgeProps = {
    input: HandlerClusterBridgeInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

function isMutableRef(value: unknown): value is MutableRefObject<unknown> {
    return Boolean(value) && typeof value === 'object' && 'current' in (value as object);
}

function asFn<T extends (...args: never[]) => unknown>(
    value: unknown,
    fallback: T,
): T {
    return typeof value === 'function' ? (value as T) : fallback;
}

/**
 * جسر وفاة الخصوم — يُحمَّل عند نية القائمة ⋮ / نافذة الوفاة فقط،
 * لا على cold-open الإضبارة.
 */
export function ExecutionDashboardHandlerClusterPartyDeathBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterPartyDeathBridgeProps) {
    const c = collectFullHandlerClusterContext(asHandlerClusterSpreads(input)) as Record<
        string,
        unknown
    >;
    const heirSubThrottleRef = useRef({ debtor: 0, creditor: 0 });
    const fallbackExecutionDataRef = useRef<ExecutionFile | null | undefined>(null);
    const read = <K extends keyof UseExecutionDashboardPartyDeathHandlersParams>(key: K) =>
        (c[key] ??
            readHandlerClusterContextValue(
                input,
                key,
            )) as UseExecutionDashboardPartyDeathHandlersParams[K];

    const executionData = read('executionData');
    fallbackExecutionDataRef.current = executionData ?? fallbackExecutionDataRef.current ?? null;
    const executionDataRefRaw = read('executionDataRef');
    const executionDataRef = isMutableRef(executionDataRefRaw)
        ? (executionDataRefRaw as MutableRefObject<ExecutionFile | null | undefined>)
        : fallbackExecutionDataRef;

    const handlers = useExecutionDashboardPartyDeathHandlers({
        executionDataRef,
        executionData,
        executionId: read('executionId'),
        claimType: read('claimType'),
        creditors: read('creditors') ?? [],
        debtors: read('debtors') ?? [],
        decisionsStorageExecutionId: String(read('decisionsStorageExecutionId') ?? ''),
        decisionsReloadEpoch: Number(read('decisionsReloadEpoch') ?? 0),
        partyDeathModalParty: read('partyDeathModalParty') ?? null,
        setPartyDeathModalParty: asFn(read('setPartyDeathModalParty'), () => undefined),
        partyDeathModalDecisionId: read('partyDeathModalDecisionId') ?? null,
        setPartyDeathModalDecisionId: asFn(read('setPartyDeathModalDecisionId'), () => undefined),
        setAlimonyBeneficiaryDeathModalProfile: asFn(
            read('setAlimonyBeneficiaryDeathModalProfile'),
            () => undefined,
        ),
        setAlimonyBeneficiaryDeathModalOpen: asFn(
            read('setAlimonyBeneficiaryDeathModalOpen'),
            () => undefined,
        ),
        lastHeirSubRequestAtRef: isMutableRef(read('lastHeirSubRequestAtRef'))
            ? (read('lastHeirSubRequestAtRef') as MutableRefObject<{
                  debtor: number;
                  creditor: number;
              }>)
            : heirSubThrottleRef,
        creditorDeathMarked: Boolean(read('creditorDeathMarked')),
        debtorDeathMarked: Boolean(read('debtorDeathMarked')),
        heirSubstitutionAllowed: Boolean(read('heirSubstitutionAllowed')),
        ongoingAlimonyClaim: Boolean(read('ongoingAlimonyClaim')),
        alimonyBeneficiaryProfile: read('alimonyBeneficiaryProfile'),
        nextTimelineId: asFn(read('nextTimelineId'), () => `party-death-${Date.now()}`),
        persistExecutionMerge: asFn(read('persistExecutionMerge'), () => false),
        showToast: asFn(read('showToast'), () => undefined),
        setTimelineEvents: asFn(read('setTimelineEvents'), () => undefined),
    });

    usePublishHandlerClusterWhenFingerprintChanges(
        handlers as Record<string, unknown>,
        [
            ...handlerBagKeyFingerprint(handlers as Record<string, unknown>),
            handlers.debtorSubstitutionRequestStatus,
            handlers.creditorSubstitutionRequestStatus,
        ],
        onCluster,
    );

    return null;
}
