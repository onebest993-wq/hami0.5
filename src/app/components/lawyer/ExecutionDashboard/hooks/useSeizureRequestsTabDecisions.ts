/** Decisions sync + salary/asset request openers for SeizureRequestsTab */
import React from 'react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { DECISIONS_RELOAD_EVENT } from '@/app/utils/executorDecisionContracts';
import {
    closeSeizureSubtypeDecisionCycle,
    getGoverningSeizureDecisionBySubtype,
    isExecutorRowRejectedAndFinal,
    isGuarantorRequestDecisionRow,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
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
import type { InlineActionGateKey } from '../types';
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

export type UseSeizureRequestsTabDecisionsParams = {
    executionId: string | undefined;
    executionData: ExecutionFile | null;
    seizureActionsDisabled: boolean;
    coerciveUiLocked?: boolean;
    showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info', options?: unknown) => void;
    saveCoerciveAction: (actionType: string, details: Record<string, string>) => void;
    pushTimelineEvent: (event: TimelineEvent) => void;
    nextTimelineId: () => string;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    persistExecutionMerge?: (patch: Record<string, unknown>) => void;
    activeDebtorIsDeceased?: boolean;
};

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

    const readAllDecisions = React.useCallback((): Record<string, unknown>[] => {
        const merged: Record<string, unknown>[] = [];
        for (const id of executionIdsForDecisions) {
            merged.push(...readExecutorDecisionsArray(id));
        }
        const byId = new Map<string, Record<string, unknown>>();
        for (const row of merged) {
            const rid = String((row as any)?.id ?? '').trim();
            if (!rid) continue;
            const prev = byId.get(rid);
            if (!prev) {
                byId.set(rid, row);
                continue;
            }
            const a = String((prev as any)?.resolvedAt ?? (prev as any)?.date ?? '');
            const b = String((row as any)?.resolvedAt ?? (row as any)?.date ?? '');
            if (b.localeCompare(a, undefined, { numeric: true }) > 0) byId.set(rid, row);
        }
        return Array.from(byId.values());
    }, [executionIdsForDecisions]);

    const [decisions, setDecisions] = React.useState<Record<string, unknown>[]>(() => readAllDecisions());
    React.useEffect(() => {
        const sync = () => setDecisions(readAllDecisions());
        sync();
        window.addEventListener(DECISIONS_RELOAD_EVENT, sync);
        window.addEventListener('hami-execution-decision-outcome', sync as EventListener);
        window.addEventListener('focus', sync);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, sync);
            window.removeEventListener('hami-execution-decision-outcome', sync as EventListener);
            window.removeEventListener('focus', sync);
        };
    }, [readAllDecisions]);

    const [thirdPartyNameDraft, setThirdPartyNameDraft] = React.useState('');
    const [thirdPartyAmountDraft, setThirdPartyAmountDraft] = React.useState('');
    const [propertyDetailsDraftByDecisionId, setPropertyDetailsDraftByDecisionId] = React.useState<
        Record<string, PropertyCompletionDraft>
    >({});
    const [vehicleDetailsDraftByDecisionId, setVehicleDetailsDraftByDecisionId] = React.useState<
        Record<string, VehicleCompletionDraft>
    >({});

    const openAppeals = React.useCallback(
        (decisionId?: string) => {
            if (!resolvedExecutionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: {
                            executionId: resolvedExecutionId,
                            tab: 'appeals',
                            decisionId: decisionId || undefined,
                        },
                    })
                );
            } catch {}
        },
        [resolvedExecutionId]
    );

    const openDecisions = React.useCallback(
        (decisionId?: string) => {
            if (!resolvedExecutionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: {
                            executionId: resolvedExecutionId,
                            tab: 'current',
                            decisionId: decisionId || undefined,
                        },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [resolvedExecutionId]
    );

    const openGuarantorDetails = React.useCallback(
        (decisionId?: string) => {
            if (!resolvedExecutionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-guarantor-details', {
                        detail: {
                            executionId: resolvedExecutionId,
                            decisionId: decisionId || undefined,
                        },
                    })
                );
            } catch {}
        },
        [resolvedExecutionId]
    );

    const findLatestGuarantorDecision = React.useMemo(() => {
        const row = decisions.find((r) => isGuarantorRequestDecisionRow(r));
        return (row as any) || null;
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
        const did = String((salaryDecision as any)?.id || '').trim();
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
            subtype: any;
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
            pushTimelineEvent(
                {
                    id: nextTimelineId(),
                    type: 'decision',
                    title: `📋 ${args.title} — قيد البت`,
                    description: args.body,
                    date: nowIso.slice(0, 10),
                    timestamp: nowIso,
                    source: 'التنفيذ والمحجوزات',
                    metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
                } as any
            );
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

    const salaryRowForUi = React.useMemo(() => {
        const direct = salaryDecision as any;
        if (direct?.id) return direct;
        const did = String(lastSalaryDecisionId || '').trim();
        if (!did) return null;
        const found = decisions.find((r) => String((r as any)?.id || '').trim() === did) as any;
        if (found?.id) return found;
        return {
            id: did,
            title: activeDebtorIsDeceased ? 'طلب حجز الحوافز والمخصصات' : 'طلب حجز راتب',
            requestKind: 'seizure',
            seizureSubtype: 'salary',
            executorOutcome: 'pending',
        } as any;
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
        if (seizureActionsDisabled) return;
        if (hasActiveSalarySeizure) {
            const open = await SmartDialog.confirm(
                'تم حجز الراتب فعلاً. هل تريد فتح الطلب؟',
                {
                    title: 'حجز الراتب',
                    confirmText: 'فتح الطلب',
                    cancelText: 'إلغاء',
                }
            );
            if (!open) return;
            const did = String(salaryRowForUi?.id || '').trim();
            if (did) {
                openDecisions(did);
                return;
            }
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-unified-seizure-log', { detail: { tab: 'salary' } })
                );
            } catch {
                /* ignore */
            }
            return;
        }
        const did = String(salaryRowForUi?.id || '').trim();
        if (did) {
            const outcome = String(salaryRowForUi?.executorOutcome ?? 'pending').trim();
            const alternative = outcome === 'alternative';
            const rejected = isExecutorRowRejectedAndFinal(salaryRowForUi);
            const approved =
                !rejected &&
                (alternative || isExecutorRowApprovedWorkflowActive(salaryRowForUi, decisions));
            const savedAt = String(salaryRowForUi?.seizureRequestSavedAt || '').trim();
            const needsCompletion = approved && !savedAt;
            if (needsCompletion) {
                const exId = String(resolvedExecutionId || '').trim();
                if (exId && did) dispatchOpenSeizureCompletion(exId, did);
                return;
            }
            if (approved && savedAt) {
                openDecisions(did);
                return;
            }
            openDecisions(did);
            return;
        }
        if (coerciveUiLocked) return;
        setInlineActionGateKey('seizure_salary');
    }, [
        coerciveUiLocked,
        hasActiveSalarySeizure,
        openDecisions,
        resolvedExecutionId,
        salaryRowForUi,
        seizureActionsDisabled,
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
