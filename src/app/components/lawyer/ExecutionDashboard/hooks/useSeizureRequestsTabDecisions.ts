/** Decisions sync + salary/asset request openers for SeizureRequestsTab */
import React from 'react';
import type { TimelineEvent } from '@/app/types/execution';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import {
    closeSeizureSubtypeDecisionCycle,
    getGoverningSeizureDecisionBySubtype,
    isExecutorRowRejectedAndFinal,
    isGuarantorRequestDecisionRow,
    type SeizureRequestSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isSalarySeizureAsset } from '@/app/components/lawyer/ExecutionDashboard/hooks/useSeizureRegistryAssets';
import { isSalarySeizureLaneOccupied } from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureTabUtils';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    isSeizureRegistrationComplete,
    isSeizureRequestFullyRegistered,
    openUnifiedSeizureLogTab,
    resolveGoverningSalaryDecision,
    SEIZURE_LOG_TAB_SUBTYPE,
    type UnifiedSeizureLogTab,
} from '../components/seizureRequestsTabHelpers';
import type {
    PropertyCompletionDraft,
    VehicleCompletionDraft,
} from '../components/SeizureRequestCompletionForms';
import { useSeizureInlineFocusBridge } from '@/app/components/lawyer/ExecutionDashboard/hooks/useSeizureInlineFocusBridge';
import {
    resolveGoverningMovableDecision,
    resolveGoverningPropertyDecision,
} from '@/app/components/lawyer/ExecutionDashboard/utils/seizureInlineFocusUtils';
import { submitBasicSeizurePendingRequest } from '@/app/domain/seizure/seizureBasicRequestService';
import {
    buildPendingSeizureDraftAsset,
    dispatchOpenSeizureCompletion,
    mergeSeizureDraftPatch,
} from '@/app/components/lawyer/ExecutionDashboard/utils/seizureSalaryRequestFlow';

export type {
    SeizureDecisionRow,
    UseSeizureRequestsTabDecisionsParams,
} from './useSeizureRequestsTabDecisions.types';
import {
    decisionRowId,
    type SeizureDecisionRow,
    type UseSeizureRequestsTabDecisionsParams,
} from './useSeizureRequestsTabDecisions.types';
import { useSeizureRequestsTabDecisionsSync } from './useSeizureRequestsTabDecisionsSync';
import { openSalarySeizureRequestFlow } from './openSalarySeizureRequestFlow';
import { useSeizureRequestsTabOpeners } from './useSeizureRequestsTabOpeners';

export function useSeizureRequestsTabDecisions(p: UseSeizureRequestsTabDecisionsParams) {
    const {
        executionId,
        executionData,
        seizureActionsDisabled,
        coerciveUiLocked,
        showToast,
        saveCoerciveAction,
        pushTimelineEvent,
        nextTimelineId,
        inlineActionGateKey,
        setInlineActionGateKey,
        activeDebtorIsDeceased = false,
        persistExecutionMerge,
    } = p;

    const normalizeExecutionId = React.useCallback((v: unknown): string => {
        const s = String(v ?? '').trim();
        if (!s) return '';
        if (s === 'undefined' || s === 'null') return '';
        return s;
    }, []);
    const executionIdsForDecisions = React.useMemo(() => {
        const parentDossierId = normalizeExecutionId(
            (executionData as { parentDossierId?: unknown } | null | undefined)?.parentDossierId,
        );
        const ids = [
            normalizeExecutionId(executionId),
            normalizeExecutionId(executionData?.id),
            parentDossierId,
        ]
            .map((x) => String(x || '').trim())
            .filter(Boolean);
        return Array.from(new Set(ids));
    }, [executionData, executionId, normalizeExecutionId]);
    const resolvedExecutionId = executionIdsForDecisions[0] || '';

    const { inlineFocusMovableDecisionId, inlineFocusPropertyDecisionId } = useSeizureInlineFocusBridge({
        executionIds: executionIdsForDecisions,
    });

    const [guarantorExistingWarningOpen, setGuarantorExistingWarningOpen] = React.useState(false);
    const [lastSalaryDecisionId, setLastSalaryDecisionId] = React.useState('');

    const decisions = useSeizureRequestsTabDecisionsSync(executionIdsForDecisions);

    const [thirdPartyNameDraft, setThirdPartyNameDraft] = React.useState('');
    const [thirdPartyAmountDraft, setThirdPartyAmountDraft] = React.useState('');
    const [propertyDetailsDraftByDecisionId, setPropertyDetailsDraftByDecisionId] = React.useState<
        Record<string, PropertyCompletionDraft>
    >({});
    const [vehicleDetailsDraftByDecisionId, setVehicleDetailsDraftByDecisionId] = React.useState<
        Record<string, VehicleCompletionDraft>
    >({});

    const { openAppeals, openDecisions, openGuarantorDetails } =
        useSeizureRequestsTabOpeners(resolvedExecutionId);

    const findLatestGuarantorDecision = React.useMemo((): SeizureDecisionRow | null => {
        const row = decisions.find((r) => isGuarantorRequestDecisionRow(r));
        return (row as SeizureDecisionRow | undefined) ?? null;
    }, [decisions]);

    const acknowledgeSeizureRequestFromLog = React.useCallback(
        (tab: UnifiedSeizureLogTab) => {
            if (!resolvedExecutionId) return;
            openUnifiedSeizureLogTab(tab);
            window.setTimeout(() => {
                closeSeizureSubtypeDecisionCycle({
                    executionId: resolvedExecutionId,
                    subtype: SEIZURE_LOG_TAB_SUBTYPE[tab],
                });
            }, 0);
        },
        [resolvedExecutionId]
    );

    const thirdPartyDecision = React.useMemo(
        () => getGoverningSeizureDecisionBySubtype(resolvedExecutionId, 'third_party', decisions),
        [resolvedExecutionId, decisions]
    );
    const salaryDecision = React.useMemo(
        () => resolveGoverningSalaryDecision(resolvedExecutionId, decisions),
        [resolvedExecutionId, decisions]
    );

    React.useEffect(() => {
        const did = decisionRowId(salaryDecision);
        if (!did) return;
        setLastSalaryDecisionId(did);
    }, [salaryDecision]);
    const propertyDecision = React.useMemo(
        () =>
            resolveGoverningPropertyDecision(
                resolvedExecutionId,
                decisions,
                inlineFocusPropertyDecisionId,
            ),
        [resolvedExecutionId, decisions, inlineFocusPropertyDecisionId],
    );
    const movableDecision = React.useMemo(
        () =>
            resolveGoverningMovableDecision(
                resolvedExecutionId,
                decisions,
                inlineFocusMovableDecisionId,
            ),
        [resolvedExecutionId, decisions, inlineFocusMovableDecisionId],
    );

    const submitBasicSeizureRequest = React.useCallback(
        (args: {
            actionType: 'salary' | 'property' | 'vehicle' | 'third_party';
            title: string;
            body: string;
            subtype: SeizureRequestSubtype | string;
        }) => {
            if (
                args.actionType === 'salary' &&
                isSalarySeizureLaneOccupied({
                    seizedAssets: executionData?.seizedAssets,
                    seizureDraftsByDecisionId: executionData?.seizureDraftsByDecisionId as
                        | Record<string, import('@/app/types/execution').SeizedAsset>
                        | undefined,
                })
            ) {
                showToast('يوجد حجز راتب نشط أو طلب قيد البت — لا يمكن التكرار قبل فك الحجز.', 'warning');
                return null;
            }
            const result = submitBasicSeizurePendingRequest({
                dossierInput: {
                    executionId: resolvedExecutionId,
                    executionDataId: executionData?.id,
                    executionData: executionData as Record<string, unknown> | null,
                },
                title: args.title,
                body: args.body,
                subtype: String(args.subtype || ''),
                decisions,
            });
            if (result.error === 'invalid_dossier') {
                showToast('تعذّر إرسال الطلب — معرّف الإضبارة غير جاهز', 'error');
                return null;
            }
            if (!result.ok || !result.decisionId) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning');
                return null;
            }
            const decisionId = result.decisionId;
            const nowIso = new Date().toISOString();
            const timelineEvent: TimelineEvent = {
                id: nextTimelineId(),
                type: 'decision',
                title: `📋 ${args.title} — قيد البت`,
                description: args.body,
                date: nowIso.slice(0, 10),
                timestamp: nowIso,
                source: 'التنفيذ والمحجوزات',
                metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
            };
            pushTimelineEvent(timelineEvent);
            showToast('تم إنشاء الطلب — قرار المنفذ يظهر هنا مباشرة.', 'success');
            if (persistExecutionMerge && decisionId) {
                const uiActionType =
                    args.actionType === 'vehicle' ? 'vehicle' : args.actionType === 'salary' ? 'salary' : 'property';
                const draft = buildPendingSeizureDraftAsset({
                    decisionId,
                    actionType: uiActionType,
                    activeDebtorIsDeceased,
                });
                const nextDrafts = mergeSeizureDraftPatch(
                    executionData?.seizureDraftsByDecisionId as
                        | Record<string, import('@/app/types/execution').SeizedAsset>
                        | undefined,
                    decisionId,
                    draft,
                );
                persistExecutionMerge({ seizureDraftsByDecisionId: nextDrafts });
            }
            return decisionId;
        },
        [
            activeDebtorIsDeceased,
            decisions,
            executionData,
            nextTimelineId,
            persistExecutionMerge,
            pushTimelineEvent,
            resolvedExecutionId,
            showToast,
        ],
    );

    const salaryRowForUi = React.useMemo((): SeizureDecisionRow | null => {
        const direct = salaryDecision as SeizureDecisionRow | null;
        if (direct?.id) return direct;
        const did = String(lastSalaryDecisionId || '').trim();
        if (!did) return null;
        const found = decisions.find((r) => decisionRowId(r) === did) as SeizureDecisionRow | undefined;
        if (found?.id) return found;
        const placeholder: SeizureDecisionRow = {
            id: did,
            title: activeDebtorIsDeceased ? 'طلب حجز الحوافز والمخصصات' : 'طلب حجز راتب',
            requestKind: 'seizure',
            seizureSubtype: 'salary',
            executorOutcome: 'pending',
        };
        return placeholder;
    }, [activeDebtorIsDeceased, decisions, lastSalaryDecisionId, salaryDecision]);

    const hasActiveSalarySeizure = React.useMemo(
        () =>
            (executionData?.seizedAssets || []).some(
                (a) => isSalarySeizureAsset(a) && String(a.status || '') === 'seized'
            ),
        [executionData?.seizedAssets]
    );

    const salaryLaneOccupied = React.useMemo(
        () =>
            isSalarySeizureLaneOccupied({
                seizedAssets: executionData?.seizedAssets,
                seizureDraftsByDecisionId: executionData?.seizureDraftsByDecisionId as
                    | Record<string, import('@/app/types/execution').SeizedAsset>
                    | undefined,
            }),
        [executionData?.seizedAssets, executionData?.seizureDraftsByDecisionId]
    );

    const salaryRequestOpen = React.useMemo(() => {
        const row = salaryRowForUi;
        if (!row?.id) return salaryLaneOccupied;
        if (isExecutorRowRejectedAndFinal(row)) return false;
        const pending =
            String(row.executorOutcome ?? 'pending') === 'pending' ||
            String(row.executorOutcome ?? '') === '';
        const approvedNotSaved =
            isExecutorRowApprovedWorkflowActive(row, decisions) &&
            !String(row.seizureRequestSavedAt || '').trim();
        return salaryLaneOccupied || pending || approvedNotSaved;
    }, [decisions, salaryLaneOccupied, salaryRowForUi]);

    const salaryRequestSettled = React.useMemo(
        () =>
            hasActiveSalarySeizure ||
            (salaryRowForUi ? isSeizureRequestFullyRegistered(salaryRowForUi, decisions) : false),
        [decisions, hasActiveSalarySeizure, salaryRowForUi]
    );
    const salaryLogReady = React.useMemo(
        () =>
            hasActiveSalarySeizure ||
            (salaryRowForUi ? isSeizureRegistrationComplete(salaryRowForUi, decisions) : false),
        [decisions, hasActiveSalarySeizure, salaryRowForUi]
    );
    const salaryRegistrationAckReady = React.useMemo(
        () => Boolean(salaryRowForUi && isSeizureRegistrationComplete(salaryRowForUi, decisions)),
        [decisions, salaryRowForUi]
    );

    const openSalarySeizureRequest = React.useCallback(async () => {
        await openSalarySeizureRequestFlow({
            seizureActionsDisabled,
            hasActiveSalarySeizure,
            salaryRowForUi,
            openDecisions,
            resolvedExecutionId,
            decisions,
            coerciveUiLocked,
            setInlineActionGateKey,
        });
    }, [
        coerciveUiLocked,
        decisions,
        hasActiveSalarySeizure,
        openDecisions,
        resolvedExecutionId,
        salaryRowForUi,
        seizureActionsDisabled,
        setInlineActionGateKey,
    ]);

    const salaryRequestTitle = activeDebtorIsDeceased
        ? 'طلب حجز الحوافز والمخصصات'
        : 'طلب حجز راتب';

    const sharedAssetProps = {
        seizureActionsDisabled,
        decisions,
        resolvedExecutionId,
        inlineActionGateKey,
        setInlineActionGateKey,
        acknowledgeSeizureRequestFromLog,
        submitBasicSeizureRequest,
        openAppeals,
        saveCoerciveAction,
        showToast,
    };

    return {
        resolvedExecutionId,
        decisions,
        guarantorExistingWarningOpen,
        setGuarantorExistingWarningOpen,
        setLastSalaryDecisionId,
        thirdPartyNameDraft,
        setThirdPartyNameDraft,
        thirdPartyAmountDraft,
        setThirdPartyAmountDraft,
        propertyDetailsDraftByDecisionId,
        setPropertyDetailsDraftByDecisionId,
        vehicleDetailsDraftByDecisionId,
        setVehicleDetailsDraftByDecisionId,
        openAppeals,
        openDecisions,
        openGuarantorDetails,
        findLatestGuarantorDecision,
        acknowledgeSeizureRequestFromLog,
        thirdPartyDecision,
        propertyDecision,
        movableDecision,
        submitBasicSeizureRequest,
        salaryRowForUi,
        hasActiveSalarySeizure,
        salaryRequestOpen,
        salaryRequestSettled,
        salaryLogReady,
        salaryRegistrationAckReady,
        openSalarySeizureRequest,
        salaryRequestTitle,
        sharedAssetProps,
    };
}
