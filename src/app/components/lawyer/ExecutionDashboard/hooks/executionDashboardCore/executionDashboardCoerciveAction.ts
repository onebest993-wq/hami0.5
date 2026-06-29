// @ts-nocheck
/** حفظ إجراءات الحجز/الإكراه — chunk execution-hooks (منفصل عن core) */
import type { MutableRefObject } from 'react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { promptSettlementSalaryConflictChoice } from '@/app/components/lawyer/FinancialOperationsCenter/settlementSalaryExclusion';
import {
    buildSalarySeizureDescriptionText,
    resolveSalarySeizureSubject,
} from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureDisplayUtils';
import { isSalarySeizureLaneOccupied } from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureTabUtils';
import {
    appendPendingExecutorSeizureDecision,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    upsertSeizedMovableFromDetails,
    upsertSeizedPropertyFromDetails,
} from '../../helpers';
import { buildInitialExecutorSeizureDetails } from '../../helpers/buildInitialExecutorSeizureDetails';
import type {
    ExecutionFile,
    SeizedAsset,
    SeizedMovable,
    SeizedProperty,
    TimelineEvent,
} from '@/app/types/execution';

export type CoerciveSubjectRef = MutableRefObject<{ id?: string; name?: string }>;

export type SaveCoerciveActionDeps = {
    setShowCoerciveActionForm: (v: null) => void;
    settlementGuarantorGate: { pendingSettlement?: boolean };
    clearSettlementFromLedger: () => void;
    seizureDetailCompletion: {
        actionType: string;
        decisionRowId: string;
        assetId?: string;
    } | null;
    setSeizureDetailCompletion: (v: null) => void;
    seizedAssets: SeizedAsset[];
    setSeizedAssets: (assets: SeizedAsset[]) => void;
    activeDebtorIsDeceased: boolean;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string | undefined;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    activeWorkspaceDebtorForFollowup: { isPrimary?: boolean; key?: string } | null | undefined;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    nextTimelineId: () => string;
    timelineEvents: TimelineEvent[];
    setTimelineEvents: (events: TimelineEvent[]) => void;
    seizureDraftsByDecisionId: Record<string, SeizedAsset>;
    setSeizureDraftsByDecisionId: (drafts: Record<string, SeizedAsset>) => void;
    seizureDraftsByDecisionIdRef: MutableRefObject<Record<string, SeizedAsset>>;
    coerciveSubjectRef: CoerciveSubjectRef;
    showToast: (
        message: string,
        type?: string,
        opts?: { decisionsLink?: boolean },
    ) => void;
    setLastActionDate: (ymd: string) => void;
};

export function createSaveCoerciveAction(deps: SaveCoerciveActionDeps) {
    const saveCoerciveAction = (
        actionType: string,
        details: Record<string, string>,
        opts?: { skipSettlementConflictCheck?: boolean },
    ) => {
        const {
            setShowCoerciveActionForm,
            settlementGuarantorGate,
            clearSettlementFromLedger,
            seizureDetailCompletion,
            setSeizureDetailCompletion,
            seizedAssets,
            setSeizedAssets,
            activeDebtorIsDeceased,
            executionData,
            executionId,
            decisionsStorageExecutionId,
            executionDataRef,
            activeWorkspaceDebtorForFollowup,
            persistExecutionMerge,
            nextTimelineId,
            timelineEvents,
            setTimelineEvents,
            seizureDraftsByDecisionId,
            setSeizureDraftsByDecisionId,
            seizureDraftsByDecisionIdRef,
            coerciveSubjectRef,
            showToast,
            setLastActionDate,
        } = deps;

        setShowCoerciveActionForm(null);

        const directDecisionRowId =
            (actionType === 'salary' || actionType === 'property' || actionType === 'vehicle') &&
            /\S/.test(String((details as any).decisionRowId || '').trim())
                ? String((details as any).decisionRowId || '').trim()
                : '';

        if (
            actionType === 'salary' &&
            directDecisionRowId &&
            !opts?.skipSettlementConflictCheck &&
            settlementGuarantorGate.pendingSettlement
        ) {
            void (async () => {
                const choice = await promptSettlementSalaryConflictChoice(SmartDialog.confirm);
                if (choice === 'keep_settlement') {
                    showToast('تم الإبقاء على التسوية — أُلغي إكمال حجز الراتب.', 'info');
                    return;
                }
                clearSettlementFromLedger();
                saveCoerciveAction(actionType, details, { skipSettlementConflictCheck: true });
            })();
            return;
        }

        if (
            (seizureDetailCompletion &&
                (actionType === 'salary' || actionType === 'property' || actionType === 'vehicle') &&
                seizureDetailCompletion.actionType === actionType) ||
            directDecisionRowId
        ) {
            const decisionRowId = directDecisionRowId || seizureDetailCompletion!.decisionRowId;
            const existingByDecisionRowId = seizedAssets.find(
                (a) => String((a.details as any)?.decisionRowId || '') === String(decisionRowId),
            );
            const assetId =
                directDecisionRowId && existingByDecisionRowId?.id
                    ? existingByDecisionRowId.id
                    : seizureDetailCompletion?.assetId || `sz_${String(decisionRowId)}_${Date.now()}`;
            if (seizureDetailCompletion && !directDecisionRowId) {
                setSeizureDetailCompletion(null);
            }

            let mergedDesc = (details.description || '').trim();
            if (!mergedDesc && actionType === 'salary') {
                const dedRaw = String((details as any).monthlyDeductionIqd || '').trim();
                const parsedDeductionEarly = Number(dedRaw.replace(/,/g, ''));
                mergedDesc = buildSalarySeizureDescriptionText({
                    employerName: String(details.employerName || ''),
                    salaryAmount: String(details.salaryAmount || ''),
                    monthlyDeductionIqd:
                        Number.isFinite(parsedDeductionEarly) && parsedDeductionEarly > 0
                            ? Math.trunc(parsedDeductionEarly)
                            : undefined,
                    activeDebtorIsDeceased,
                    subject: resolveSalarySeizureSubject(
                        {
                            details: {
                                ...details,
                                decisionRowId: String(decisionRowId),
                            },
                        },
                        executionData ?? null,
                        String(decisionsStorageExecutionId ?? executionId ?? '').trim() || undefined,
                    ),
                });
            } else if (!mergedDesc && actionType === 'property') {
                mergedDesc = `رقم العقار: ${details.propertyNumber || ''}\nالمقاطعة: ${details.propertyDistrict || ''}\nالنوع: ${details.propertyType || ''}`.trim();
            } else if (!mergedDesc && actionType === 'vehicle') {
                const cust = String(details.judicialCustodianName || '').trim();
                mergedDesc = [
                    `وصف المال المنقول: ${String(details.movableDescription || details.movableAssetType || details.vehicleDescription || '').trim()}`,
                    `المكان: ${String(details.movableLocation || '').trim()}`,
                    cust ? `الحارس القضائي: ${cust}` : null,
                ]
                    .filter(Boolean)
                    .join('\n')
                    .trim();
            }

            const baseAssetType =
                actionType === 'salary' ? 'salary' : actionType === 'property' ? 'real_estate' : 'movable';
            const today = getLocalTodayYmd();
            const nextAssets = (() => {
                const existing = seizedAssets.find((a) => a.id === assetId);
                if (!existing) {
                    const next = [
                        {
                            id: assetId,
                            type: baseAssetType,
                            description: mergedDesc || undefined,
                            status: 'seized',
                            seizureDate: today,
                            details: {
                                ...details,
                                decisionRowId: String(decisionRowId),
                                seizureUiKind: actionType,
                            } as any,
                        },
                        ...seizedAssets,
                    ];
                    return next as any;
                }
                return seizedAssets.map((a) => {
                    if (a.id !== assetId) return a;
                    const prevDetails =
                        typeof a.details === 'object' && a.details && !Array.isArray(a.details)
                            ? (a.details as Record<string, unknown>)
                            : {};
                    return {
                        ...a,
                        type: String((a as any).type || '').trim() ? (a as any).type : baseAssetType,
                        status: String((a as any).status || '').trim() ? (a as any).status : 'seized',
                        seizureDate: (a as any).seizureDate || today,
                        description: mergedDesc || a.description,
                        estimatedValue: a.estimatedValue,
                        notes: a.notes,
                        details: {
                            ...prevDetails,
                            ...details,
                            decisionRowId: String(decisionRowId),
                            seizureUiKind: actionType,
                        },
                    };
                });
            })();
            setSeizedAssets(nextAssets);

            const now = new Date().toISOString();
            const titleAr =
                actionType === 'salary'
                    ? activeDebtorIsDeceased
                        ? '💼 حجز الحوافز والمخصصات'
                        : '💼 حجز الراتب'
                    : actionType === 'property'
                      ? '🏠 تثبيت بيانات حجز العقار'
                      : '📦 تثبيت بيانات حجز مال منقول';
            const descLines = mergedDesc;
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: titleAr,
                description: descLines || undefined,
                type: 'coercive',
                source: 'محضر المتابعة — الحجز المالي',
                metadata: {
                    timelineThreadKey: `seizure_details_saved:${assetId}`,
                    seizureAssetId: assetId,
                    decisionRowId,
                },
            };
            const nextTimeline = [ev, ...timelineEvents];
            setTimelineEvents(nextTimeline);

            const persistPatch: Record<string, unknown> = { seizedAssets: nextAssets, timelineEvents: nextTimeline };
            if (actionType === 'property') {
                const prevProps = (executionDataRef.current?.seizedProperties || []) as SeizedProperty[];
                persistPatch.seizedProperties = upsertSeizedPropertyFromDetails(prevProps, decisionRowId, {
                    propertyNumber: String(details.propertyNumber || '').trim(),
                    propertyDistrict: String(details.propertyDistrict || '').trim(),
                    propertyType: String(details.propertyType || '').trim(),
                });
            }
            if (actionType === 'vehicle') {
                const prevMov = (executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
                persistPatch.seizedMovables = upsertSeizedMovableFromDetails(prevMov, decisionRowId, {
                    movableDescription: String(
                        details.movableDescription || details.movableAssetType || details.vehicleDescription || '',
                    ).trim(),
                    movableLocation: String(details.movableLocation || '').trim(),
                    judicialCustodianName: String(details.judicialCustodianName || '').trim(),
                });
            }
            if (actionType === 'salary' && /\S/.test(String(details.salaryAmount || '').trim())) {
                const parsedSalary = Number(String(details.salaryAmount || '').replace(/,/g, '').trim());
                if (Number.isFinite(parsedSalary) && parsedSalary > 0) {
                    const garnishment = parsedSalary / 5;
                    if (activeWorkspaceDebtorForFollowup?.isPrimary) {
                        persistPatch.employeeSalary = parsedSalary;
                        persistPatch.garnishmentAmount = garnishment;
                    } else if (activeWorkspaceDebtorForFollowup?.key) {
                        const debtorKey = String(activeWorkspaceDebtorForFollowup.key);
                        persistPatch.perDebtorSalaries = {
                            ...(executionData?.perDebtorSalaries || {}),
                            [debtorKey]: String(parsedSalary),
                        };
                        persistPatch.perDebtorGarnishments = {
                            ...(executionData?.perDebtorGarnishments || {}),
                            [debtorKey]: String(garnishment),
                        };
                    }
                }
            }
            const parsedDeduction = Number(
                String((details as any).monthlyDeductionIqd || '').replace(/,/g, '').trim(),
            );
            if (actionType === 'salary' && Number.isFinite(parsedDeduction) && parsedDeduction > 0) {
                const nextAssetsWithDed = (persistPatch.seizedAssets as typeof nextAssets) ?? nextAssets;
                persistPatch.seizedAssets = (nextAssetsWithDed as typeof nextAssets).map((a) => {
                    if (a.id !== assetId) return a;
                    const prevDetails =
                        typeof a.details === 'object' && a.details && !Array.isArray(a.details)
                            ? (a.details as Record<string, unknown>)
                            : {};
                    return {
                        ...a,
                        details: {
                            ...prevDetails,
                            monthlyDeductionIqd: Math.trunc(parsedDeduction),
                        },
                    };
                });
            }
            persistExecutionMerge(persistPatch);
            const nextDraftsAfterSave = { ...seizureDraftsByDecisionIdRef.current };
            if (nextDraftsAfterSave[decisionRowId]) {
                delete nextDraftsAfterSave[decisionRowId];
                setSeizureDraftsByDecisionId(nextDraftsAfterSave);
                persistExecutionMerge({ seizureDraftsByDecisionId: nextDraftsAfterSave });
            }
            patchExecutorDecisionRow(decisionsStorageExecutionId, decisionRowId, {
                seizureRequestSavedAt: now,
                seizureRequestDetails: descLines || mergedDesc || undefined,
            });
            showToast('تم حفظ تفاصيل الحجز بعد موافقة المنفذ.', 'success');
            setLastActionDate(getLocalTodayYmd());
            return;
        }

        const actionLabels: Record<string, string> = {
            salary: activeDebtorIsDeceased ? 'حجز المخصصات والمكافاة' : 'طلب حجز راتب',
            property: 'طلب حجز عقار',
            vehicle: 'طلب حجز مال منقول',
            travel: 'منع سفر',
            imprisonment: 'طلب حبس',
        };

        const now = new Date().toISOString();
        const label = actionLabels[actionType] || actionType;
        const isSeizureRequest = ['salary', 'property', 'vehicle'].includes(actionType);
        const salaryGarnishmentRoutingNote =
            actionType === 'salary' &&
            executionData?.garnishment_target === 'national_retirement_board'
                ? '\n\nوجهة قانونية إلزامية: هيئة التقاعد الوطنية (وليس جهة العمل السابقة).'
                : '';
        const subj = coerciveSubjectRef.current;
        const targetLead = subj.name
            ? `توجيه الإجراء ضد: ${subj.name}${subj.id ? ` (معرّف: ${subj.id})` : ''}. `
            : '';
        const descBase = targetLead + (details.description || '');
        const descWithRouting = descBase + salaryGarnishmentRoutingNote;

        let seizureDecisionId: string | null = null;
        if (isSeizureRequest) {
            if (
                actionType === 'salary' &&
                isSalarySeizureLaneOccupied({
                    seizedAssets,
                    seizureDraftsByDecisionId: seizureDraftsByDecisionId as Record<string, SeizedAsset>,
                })
            ) {
                showToast('يوجد حجز راتب نشط أو طلب قيد البت — لا يمكن التكرار قبل فك الحجز.', 'warning');
                return;
            }
            const seizureBody = [
                `طلب ${label} بشأن المدين${subj.name ? ` (${subj.name})` : ''}.`,
                descWithRouting.trim() || null,
            ]
                .filter(Boolean)
                .join('\n');
            const payloadJson =
                actionType === 'vehicle'
                    ? JSON.stringify({
                          movableDescription: String(details.movableDescription || '').trim(),
                          movableLocation: String(details.movableLocation || '').trim(),
                          judicialCustodianName: String(details.judicialCustodianName || '').trim(),
                          subject: String(label || '').trim(),
                      })
                    : undefined;
            seizureDecisionId = appendPendingExecutorSeizureDecision({
                executionId: decisionsStorageExecutionId,
                requestTitle: `${label} — قيد البت لدى المنفذ`,
                requestBody: seizureBody,
                seizureSubtype:
                    actionType === 'salary' ? 'salary' : actionType === 'vehicle' ? ('movable_auction' as any) : 'property',
                ...(payloadJson ? { seizurePayloadJson: payloadJson } : {}),
            });
        }

        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: isSeizureRequest ? `📋 ${label} — قيد البت` : `⚖️ ${label}`,
            description: isSeizureRequest
                ? [`طلب ${label} بشأن المدين${subj.name ? ` (${subj.name})` : ''}.`, descWithRouting.trim() || null]
                      .filter(Boolean)
                      .join('\n')
                : `${label}.${descWithRouting ? ` ${descWithRouting}` : ''}`,
            type: 'coercive',
            source: 'التنفيذ والمحجوزات',
            metadata:
                seizureDecisionId != null
                    ? {
                          timelineThreadKey: `executor_decision:${seizureDecisionId}`,
                          decisionRowId: seizureDecisionId,
                      }
                    : undefined,
        };
        let nextDrafts = seizureDraftsByDecisionId;
        if (isSeizureRequest && seizureDecisionId) {
            const dayYmd = now.slice(0, 10);
            const detailsWithDecision: Record<string, string> = {
                ...details,
                decisionRowId: seizureDecisionId,
            };
            const newAsset: SeizedAsset = {
                id: `draft_${seizureDecisionId}`,
                type:
                    actionType === 'salary'
                        ? 'طلب حجز راتب (قيد البت)'
                        : actionType === 'vehicle'
                          ? 'طلب حجز مال منقول (قيد البت)'
                          : 'طلب حجز عقار (قيد البت)',
                details: detailsWithDecision,
                status: 'pending',
                seizureDate: dayYmd,
            };
            if (details.description?.trim()) {
                newAsset.description = details.description.trim();
            }
            nextDrafts = { ...seizureDraftsByDecisionId, [seizureDecisionId]: newAsset };
            setSeizureDraftsByDecisionId(nextDrafts);
        }
        const nextTimeline = [newEvent, ...timelineEvents];
        setTimelineEvents(nextTimeline);

        const persistPatch: Record<string, unknown> = { timelineEvents: nextTimeline };
        if (isSeizureRequest && seizureDecisionId) {
            persistPatch.seizureDraftsByDecisionId = nextDrafts;
        }
        if (actionType === 'salary' && /\S/.test(String(details.salaryAmount || '').trim())) {
            const parsedSalary = Number(String(details.salaryAmount || '').replace(/,/g, '').trim());
            if (Number.isFinite(parsedSalary) && parsedSalary > 0) {
                const garnishment = parsedSalary / 5;
                if (activeWorkspaceDebtorForFollowup?.isPrimary) {
                    persistPatch.employeeSalary = parsedSalary;
                    persistPatch.garnishmentAmount = garnishment;
                } else if (activeWorkspaceDebtorForFollowup?.key) {
                    const debtorKey = String(activeWorkspaceDebtorForFollowup.key);
                    persistPatch.perDebtorSalaries = {
                        ...(executionData?.perDebtorSalaries || {}),
                        [debtorKey]: String(parsedSalary),
                    };
                    persistPatch.perDebtorGarnishments = {
                        ...(executionData?.perDebtorGarnishments || {}),
                        [debtorKey]: String(garnishment),
                    };
                }
            }
        }
        persistExecutionMerge(persistPatch);

        const msgQueuedExecutor =
            'تم حفظ الطلب بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ';
        if (isSeizureRequest) {
            showToast(msgQueuedExecutor, 'success', { decisionsLink: true });
        } else {
            showToast(`تم تسجيل ${label}`, 'success');
        }
        setLastActionDate(getLocalTodayYmd());
    };

    return saveCoerciveAction;
}
