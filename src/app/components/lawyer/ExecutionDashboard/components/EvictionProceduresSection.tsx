import React from 'react';
import { Calendar, Shield, Gavel, UserCheck, Home } from 'lucide-react';
import type { InlineActionGateKey } from '../types';
import type { EvictionTimelineActionId } from '@/app/utils/executionModuleStrategies';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionModuleStrategies';
import type { EvictionRequestKind } from '@/app/utils/executorSeizureDecisionQueue';
import type { EvictionExecutorWorkflowKey } from '@/app/utils/executorApprovalWorkflow';
import {
    dispatchDecisionsReload,
    getGoverningEvictionProcedureRowForBranch,
    isEvictionProcedureRowWorkflowComplete,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    listEvictionProcedureHubRowsForBranch,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import { summarizeExecutorHubRequestLifecycle } from '@/app/utils/executorRequestLifecycle';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { useExecutorDecisions } from '@/app/components/lawyer/ExecutionDashboard/hooks/useExecutorDecisions';
import { FollowupProcedureCard } from './FollowupProcedureCard';
import { MaritalFurnitureDeliveryProcedureCard } from './MaritalFurnitureDeliveryProcedureCard';
import { PoliceAssistanceInlineForm } from '@/app/components/lawyer/execution/PoliceAssistanceInlineForm';
import { BreakInventoryFurnitureInlineForm } from '@/app/components/lawyer/execution/BreakInventoryFurnitureInlineForm';
import { MaritalFurnitureDeliveryInventoryForm } from '@/app/components/lawyer/execution/MaritalFurnitureDeliveryInventoryForm';
import type { BreakInventoryFurnitureSavePayload } from '@/app/utils/executorApprovalWorkflow';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import { SpecificDeliveryPropertyExpertRequestCard } from './SpecificDeliveryPropertyExpertRequestCard';
import { SpecificDeliveryMovableValuationExpertCard } from './SpecificDeliveryMovableValuationExpertCard';
import { SpecificDeliveryConversionRequestCard } from './SpecificDeliveryConversionRequestCard';
import type { SpecificDeliveryCaseExpenseRow } from '@/app/utils/specificDeliveryPropertyExpertRequest';
import {
    MARITAL_FURNITURE_DELIVERY_BRANCH,
    resolveMaritalFurnitureDeliveryState,
} from '@/app/utils/maritalFurnitureDeliveryWorkflow';
import {
    isSpecificDeliveryJudgmentValuePredetermined,
    shouldShowSpecificDeliveryMovableValuationExpert,
    shouldShowSpecificDeliveryPropertyExpert,
} from '@/app/utils/specificDeliveryExpertVisibility';

type ProcedureExpandKey =
    | 'field_visit'
    | 'police'
    | 'break_inventory'
    | 'marital_furniture_delivery'
    | 'custodian'
    | 'forced_eviction';

export interface EvictionProceduresSectionProps {
    executionCoerciveButtonDisabled: boolean;
    inlineActionGateKey: InlineActionGateKey | null;
    gracePeriodEnded: boolean | null | undefined;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    handleEndGracePeriod: () => void;
    appendEvictionProcedure: (procedure: {
        actionId: EvictionTimelineActionId;
        title: string;
        description: string;
        supersedeCompletedHub?: boolean;
    }) => void;
    appendEvictionExecutorRequest: (request: {
        executionId: string;
        title: string;
        body: string;
        requestKind: EvictionRequestKind;
        evictionWorkflowKey?: EvictionExecutorWorkflowKey;
        supersedeCompletedHub?: boolean;
    }) => boolean;
    decisionsStorageExecutionId: string;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        opts?: { decisionsLink?: boolean }
    ) => void;
    EVICTION_TIMELINE_ACTION_IDS: {
        FIELD_VISIT: string;
        POLICE_FORCE: string;
        BREAK_INVENTORY: string;
        CUSTODIAN: string;
    };
    hideEncroachmentEvictionProcedureItems?: boolean;
    hideEvictionCustodianProcedure?: boolean;
    /** موعد ميداني + مفاتحة شرطة — تسليم شيء معين فقط (لا أثاث زوجية ولا تجاوز) */
    showGenericFieldProcedureCards?: boolean;
    showSpecificDeliveryBreakInventoryCard?: boolean;
    showSpecificDeliverySurveyorCard?: boolean;
    showSpecificDeliveryConversionCard?: boolean;
    specificDeliveryItemName?: string;
    specificDeliveryItemNature?: string | null;
    debtAmount?: number | null;
    totalAmount?: number | null;
    specificDeliveryConvertedAmount?: number | null;
    specificDeliveryFinancialized?: boolean;
    onSpecificDeliveryFinancialized?: (amount: number) => void;
    onSpecificDeliveryExpenseRecorded?: (row: SpecificDeliveryCaseExpenseRow) => void;
    openPoliceAssistanceDetails?: (input: { decisionId: string; requestTitle: string }) => void;
    savePoliceAssistance?: (input: {
        decisionId: string;
        agencyName: string;
        linkToTasks: boolean;
    }) => void;
    saveBreakInventoryLedger?: (input: {
        decisionId: string;
        payload: BreakInventoryFurnitureSavePayload;
    }) => void;
    finalizeBreakInventoryRequest?: (input: { decisionId: string }) => void;
    isMaritalFurnitureClaim?: boolean;
    maritalFurnitureItems?: MaritalFurnitureItem[];
    saveMaritalFurnitureDeliveryInventory?: (input: {
        decisionId: string;
        items: MaritalFurnitureItem[];
    }) => void;
    expandProcedureKey?: ProcedureExpandKey | null;
    onExpandProcedureConsumed?: () => void;
}

export const EvictionProceduresSection: React.FC<EvictionProceduresSectionProps> = ({
    executionCoerciveButtonDisabled,
    inlineActionGateKey,
    gracePeriodEnded,
    setInlineActionGateKey,
    handleEndGracePeriod,
    appendEvictionProcedure,
    appendEvictionExecutorRequest,
    decisionsStorageExecutionId,
    showToast,
    EVICTION_TIMELINE_ACTION_IDS,
    hideEncroachmentEvictionProcedureItems = false,
    hideEvictionCustodianProcedure = false,
    showGenericFieldProcedureCards = false,
    showSpecificDeliveryBreakInventoryCard = false,
    showSpecificDeliverySurveyorCard = false,
    showSpecificDeliveryConversionCard = false,
    specificDeliveryItemName = '',
    specificDeliveryItemNature = null,
    debtAmount = 0,
    totalAmount = 0,
    specificDeliveryConvertedAmount = 0,
    specificDeliveryFinancialized = false,
    onSpecificDeliveryFinancialized,
    onSpecificDeliveryExpenseRecorded,
    openPoliceAssistanceDetails,
    savePoliceAssistance,
    saveBreakInventoryLedger,
    finalizeBreakInventoryRequest,
    isMaritalFurnitureClaim = false,
    maritalFurnitureItems = [],
    saveMaritalFurnitureDeliveryInventory,
    expandProcedureKey = null,
    onExpandProcedureConsumed,
}) => {
    const { executionId, decisions } = useExecutorDecisions(decisionsStorageExecutionId);
    const [expandedByKey, setExpandedByKey] = React.useState<Partial<Record<ProcedureExpandKey, boolean>>>({});
    const [fieldVisitDateDraft, setFieldVisitDateDraft] = React.useState('');

    const decisionRows = React.useMemo(
        () => (Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : []),
        [decisions]
    );

    const showPropertyExpertCard = shouldShowSpecificDeliveryPropertyExpert({
        specificDeliveryItemNature,
        showPropertyExpertCardFlag: showSpecificDeliverySurveyorCard,
    });

    const showMovableValuationExpertCard = shouldShowSpecificDeliveryMovableValuationExpert({
        specificDeliveryItemNature,
        specificDeliveryFinancialized,
        debtAmount,
        totalAmount,
        specificDeliveryConvertedAmount,
        decisions: decisionRows,
    });

    const judgmentValuePredetermined = isSpecificDeliveryJudgmentValuePredetermined({
        debtAmount,
        totalAmount,
        specificDeliveryConvertedAmount,
    });

    const openAppeals = React.useCallback(
        (decisionId: string) => {
            if (!executionId || !decisionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: { executionId, tab: 'previous', decisionId },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [executionId]
    );

    const fieldVisitRow = getGoverningEvictionProcedureRowForBranch(decisionRows, 'Field Visit Date');
    const policeRow = getGoverningEvictionProcedureRowForBranch(decisionRows, 'Police Assistance Request');
    const breakInventoryRow = getGoverningEvictionProcedureRowForBranch(
        decisionRows,
        'Lock Breaking & Inventory'
    );
    const maritalDeliveryState = isMaritalFurnitureClaim
        ? resolveMaritalFurnitureDeliveryState(decisionRows)
        : {
              mode: 'none' as const,
              unifiedRow: null,
              fieldVisitRow: null,
              breakInventoryRow: null,
          };
    const custodianRow = getGoverningEvictionProcedureRowForBranch(decisionRows, 'Judicial Custodian');
    const forcedEvictionRow = getGoverningEvictionProcedureRowForBranch(decisionRows, 'Eviction');

    const toggleExpanded = (key: ProcedureExpandKey) => {
        setExpandedByKey((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const procedureWasActiveRef = React.useRef<Partial<Record<ProcedureExpandKey, boolean>>>({});

    React.useEffect(() => {
        if (!expandProcedureKey) return;
        const key =
            isMaritalFurnitureClaim &&
            (expandProcedureKey === 'field_visit' || expandProcedureKey === 'break_inventory')
                ? 'marital_furniture_delivery'
                : expandProcedureKey;
        setExpandedByKey((prev) => ({ ...prev, [key]: true }));
        procedureWasActiveRef.current[key] = true;
        onExpandProcedureConsumed?.();
    }, [expandProcedureKey, onExpandProcedureConsumed, isMaritalFurnitureClaim]);

    const maritalUnifiedId = String(maritalDeliveryState.unifiedRow?.id || '').trim();
    const maritalFvId = String(
        (maritalDeliveryState.fieldVisitRow ?? fieldVisitRow)?.id || ''
    ).trim();
    const maritalBiId = String(
        (maritalDeliveryState.breakInventoryRow ?? breakInventoryRow)?.id || ''
    ).trim();

    React.useEffect(() => {
        const maritalInProgress = isMaritalFurnitureClaim
            ? (() => {
                  const { mode, unifiedRow, fieldVisitRow: fv, breakInventoryRow: bi } =
                      maritalDeliveryState;
                  return (
                      (mode === 'unified' &&
                          unifiedRow?.id &&
                          !isEvictionProcedureRowWorkflowComplete(unifiedRow)) ||
                      (mode === 'legacy' &&
                          ((fv?.id && !isEvictionProcedureRowWorkflowComplete(fv)) ||
                              (bi?.id && !isEvictionProcedureRowWorkflowComplete(bi))))
                  );
              })()
            : false;

        const activeByKey: Partial<Record<ProcedureExpandKey, boolean>> = {
            marital_furniture_delivery: maritalInProgress,
            field_visit:
                !isMaritalFurnitureClaim &&
                Boolean(
                    fieldVisitRow?.id && !isEvictionProcedureRowWorkflowComplete(fieldVisitRow)
                ),
            police: Boolean(
                policeRow?.id && !isEvictionProcedureRowWorkflowComplete(policeRow)
            ),
            break_inventory:
                !isMaritalFurnitureClaim &&
                Boolean(
                    breakInventoryRow?.id &&
                        !isEvictionProcedureRowWorkflowComplete(breakInventoryRow)
                ),
            custodian: Boolean(
                custodianRow?.id && !isEvictionProcedureRowWorkflowComplete(custodianRow)
            ),
            forced_eviction: Boolean(
                forcedEvictionRow?.id && !isEvictionProcedureRowWorkflowComplete(forcedEvictionRow)
            ),
        };

        setExpandedByKey((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const [rawKey, active] of Object.entries(activeByKey)) {
                const key = rawKey as ProcedureExpandKey;
                const wasActive = Boolean(procedureWasActiveRef.current[key]);
                procedureWasActiveRef.current[key] = Boolean(active);
                if (active && !wasActive) {
                    if (!next[key]) {
                        next[key] = true;
                        changed = true;
                    }
                }
            }
            return changed ? next : prev;
        });
    }, [
        isMaritalFurnitureClaim,
        maritalUnifiedId,
        maritalFvId,
        maritalBiId,
        fieldVisitRow?.id,
        policeRow?.id,
        breakInventoryRow?.id,
        custodianRow?.id,
        forcedEvictionRow?.id,
        maritalDeliveryState.mode,
    ]);

    const buildArabicDateLabel = (ymd: string) => {
        try {
            const [y, m, d] = ymd.split('-').map((x) => Number(x));
            return new Date(y, m - 1, d).toLocaleDateString('ar-IQ', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return ymd;
        }
    };

    const saveFieldVisitSchedule = (decisionId: string) => {
        const dateOnly = fieldVisitDateDraft.trim();
        if (!dateOnly) {
            showToast('أدخل تاريخ الموعد الميداني', 'warning');
            return;
        }
        const displayAr = buildArabicDateLabel(dateOnly);
        const ok = patchExecutorDecisionRow(decisionsStorageExecutionId, decisionId, {
            executorScheduleLabel: `مجدول: ${displayAr}`,
        });
        if (!ok) {
            showToast('تعذر حفظ الموعد', 'error');
            return;
        }
        dispatchDecisionsReload();
        setFieldVisitDateDraft('');
        showToast('تم تسجيل موعد الخروج الميداني.', 'success');
    };

    const buildAfterApproveContent = (
        row: Record<string, unknown>,
        branch: string
    ): React.ReactNode => {
        if (!isExecutorRowEffectivelyApproved(row)) return null;
        if (isEvictionProcedureRowWorkflowComplete(row)) return null;
        const decisionId = String(row.id || '').trim();
        if (!decisionId) return null;

        if (branch === 'Field Visit Date') {
            if (String(row.executorScheduleLabel || '').trim()) return null;
            return (
                <div className="space-y-2">
                    <input
                        type="date"
                        value={fieldVisitDateDraft}
                        onChange={(e) => setFieldVisitDateDraft(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100"
                        style={{ direction: 'ltr', textAlign: 'right' }}
                    />
                    <button
                        type="button"
                        onClick={() => saveFieldVisitSchedule(decisionId)}
                        className="w-full rounded-xl bg-gradient-to-l from-amber-500 to-yellow-600 py-2.5 text-[11px] font-black text-[#0A0F1C]"
                    >
                        تأكيد وحفظ الموعد
                    </button>
                </div>
            );
        }

        if (branch === 'Police Assistance Request') {
            if (String(row.policeAssistanceSavedAt || '').trim()) return null;
            if (!savePoliceAssistance) return null;
            return (
                <PoliceAssistanceInlineForm
                    embedded
                    initialAgencyName={String(row.policeAssistanceAgency || '')}
                    disabled={executionCoerciveButtonDisabled}
                    onSave={({ agencyName, linkToTasks }) =>
                        savePoliceAssistance({ decisionId, agencyName, linkToTasks })
                    }
                />
            );
        }

        if (branch === 'Lock Breaking & Inventory') {
            if (String(row.breakInventoryFurnitureFinalizedAt || '').trim()) return null;

            if (isMaritalFurnitureClaim && saveMaritalFurnitureDeliveryInventory) {
                return (
                    <MaritalFurnitureDeliveryInventoryForm
                        items={maritalFurnitureItems}
                        disabled={executionCoerciveButtonDisabled}
                        ledgerSaved={Boolean(
                            String(row.breakInventoryFurnitureLedgerAt || '').trim()
                        )}
                        onSave={(items) =>
                            saveMaritalFurnitureDeliveryInventory({ decisionId, items })
                        }
                        onFinalize={() => finalizeBreakInventoryRequest?.({ decisionId })}
                    />
                );
            }

            if (!saveBreakInventoryLedger || !finalizeBreakInventoryRequest) return null;
            return (
                <BreakInventoryFurnitureInlineForm
                    embedded
                    disabled={executionCoerciveButtonDisabled}
                    ledgerSaved={Boolean(
                        String(row.breakInventoryFurnitureLedgerAt || '').trim()
                    )}
                    onSave={(payload) => saveBreakInventoryLedger({ decisionId, payload })}
                    onFinalize={() => finalizeBreakInventoryRequest({ decisionId })}
                />
            );
        }

        return null;
    };

    const renderProcedurePanel = (
        label: string,
        row: Record<string, unknown> | null,
        branch: string
    ) => {
        if (!row?.id) return null;
        const decisionId = String(row.id || '').trim();
        const rejected = isExecutorRowRejectedAndFinal(row);
        const approved = isExecutorRowEffectivelyApproved(row);
        const pending =
            String(row.executorOutcome ?? 'pending') === 'pending' ||
            String(row.executorOutcome ?? '') === '';
        const workflowComplete = isEvictionProcedureRowWorkflowComplete(row);
        const afterApprove = buildAfterApproveContent(row, branch);

        if (workflowComplete && approved && !rejected) {
            return null;
        }

        const steps: ExecutionInlineStep[] = [
            {
                id: `${decisionId}:sent`,
                title: label,
                subtitle: 'تم إرسال الطلب',
                status: 'done',
                tone: 'success',
            },
            {
                id: `${decisionId}:executor`,
                title: 'قرار المنفذ',
                subtitle: rejected
                    ? 'تم رفض الطلب'
                    : approved
                      ? workflowComplete
                          ? 'تمت الموافقة — اكتمل الإجراء'
                          : 'تمت الموافقة'
                      : pending
                        ? 'قيد البت'
                        : '—',
                status: rejected || pending ? 'active' : 'done',
                tone: rejected ? 'danger' : approved ? 'success' : 'neutral',
                content: rejected ? (
                    <ExecutionInlineExecutorDecisionActions
                        executionId={executionId}
                        decisionId={decisionId}
                        requestKind="eviction_procedure"
                        disabled
                        onOpenAppealCenter={() => openAppeals(decisionId)}
                    />
                ) : pending ? (
                    <ExecutionInlineExecutorDecisionActions
                        executionId={executionId}
                        decisionId={decisionId}
                        requestKind="eviction_procedure"
                    />
                ) : null,
            },
        ];

        if (approved && !rejected && afterApprove && !workflowComplete) {
            steps.push({
                id: `${decisionId}:after`,
                title: 'إكمال البيانات',
                subtitle: 'وسّع لإدخال البيانات المطلوبة',
                status: 'active',
                tone: 'neutral',
                content: afterApprove,
            });
        }

        return (
            <div className="px-3 pb-3 pt-2" dir="rtl">
                <ExecutionInlineAccordion steps={steps} />
            </div>
        );
    };

    const showBreakInventory =
        !hideEncroachmentEvictionProcedureItems || showSpecificDeliveryBreakInventoryCard;

    const procedureIcon = (node: React.ReactNode) => (
        <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 shrink-0">
            {node}
        </span>
    );

    const isRowWorkflowComplete = (row: Record<string, unknown> | null | undefined) =>
        Boolean(
            row?.id &&
                isEvictionProcedureRowWorkflowComplete(row) &&
                !isExecutorRowRejectedAndFinal(row)
        );

    const procedureCardInProgress = (row: Record<string, unknown> | null | undefined) =>
        Boolean(row?.id && !isRowWorkflowComplete(row));

    const lifecycleForBranch = (branch: string) =>
        summarizeExecutorHubRequestLifecycle(
            listEvictionProcedureHubRowsForBranch(decisionRows, branch)
        );

    const resubmitWarning =
        'سبق واتخاذ هذا الإجراء سابقاً في هذه الإضبارة. يمكنك تقديم طلب جديد أو التراجع.';

    return (
        <div className="space-y-2.5">
            <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-stretch">
                {!gracePeriodEnded && !hideEncroachmentEvictionProcedureItems && (
                    <button
                        type="button"
                        disabled={executionCoerciveButtonDisabled}
                        onClick={() => handleEndGracePeriod()}
                        title="مهلة"
                        aria-label="مهلة"
                        className={`w-full sm:w-[108px] sm:shrink-0 text-right rounded-2xl px-4 py-3.5 transition-all border backdrop-blur-xl bg-[#0A1122]/70 border-white/5 hover:border-[#E6C673]/35 ${
                            executionCoerciveButtonDisabled
                                ? 'opacity-45 cursor-not-allowed hover:border-white/5'
                                : ''
                        }`}
                    >
                        <div className="flex flex-row-reverse items-center justify-center gap-2 sm:flex-col sm:gap-1">
                            <Calendar className="shrink-0 text-sky-300" size={20} />
                            <p className="text-sky-100 font-bold text-sm text-center leading-tight">مهلة</p>
                        </div>
                    </button>
                )}
                <div className="relative flex-1 min-w-0">
                    {isMaritalFurnitureClaim ? (
                        <MaritalFurnitureDeliveryProcedureCard
                            executionId={executionId}
                            decisionsStorageExecutionId={decisionsStorageExecutionId}
                            mode={maritalDeliveryState.mode}
                            unifiedRow={maritalDeliveryState.unifiedRow}
                            fieldVisitRow={maritalDeliveryState.fieldVisitRow ?? fieldVisitRow}
                            breakInventoryRow={maritalDeliveryState.breakInventoryRow ?? breakInventoryRow}
                            lifecycleUnified={lifecycleForBranch(MARITAL_FURNITURE_DELIVERY_BRANCH)}
                            lifecycleFieldVisit={lifecycleForBranch('Field Visit Date')}
                            lifecycleBreakInventory={lifecycleForBranch('Lock Breaking & Inventory')}
                            maritalFurnitureItems={maritalFurnitureItems}
                            inlineActionGateKey={inlineActionGateKey}
                            setInlineActionGateKey={setInlineActionGateKey}
                            expanded={Boolean(expandedByKey.marital_furniture_delivery)}
                            onToggleExpanded={() => toggleExpanded('marital_furniture_delivery')}
                            disabled={executionCoerciveButtonDisabled}
                            appendEvictionProcedure={appendEvictionProcedure}
                            maritalDeliveryActionId={
                                EVICTION_TIMELINE_ACTION_IDS.MARITAL_FURNITURE_DELIVERY as EvictionTimelineActionId
                            }
                            saveMaritalFurnitureDeliveryInventory={saveMaritalFurnitureDeliveryInventory}
                            finalizeBreakInventoryRequest={finalizeBreakInventoryRequest}
                            showToast={showToast}
                            openAppeals={openAppeals}
                        />
                    ) : showGenericFieldProcedureCards ? (
                        <FollowupProcedureCard
                            label="طلب تحديد موعد الخروج الميداني"
                            icon={procedureIcon(<Calendar className="w-6 h-6 text-white/70" />)}
                            gateKey="eviction_field_visit"
                            inlineActionGateKey={inlineActionGateKey}
                            setInlineActionGateKey={setInlineActionGateKey}
                            hasActiveRequest={procedureCardInProgress(fieldVisitRow)}
                            expanded={Boolean(expandedByKey.field_visit)}
                            onToggleExpanded={() => toggleExpanded('field_visit')}
                            workflowComplete={isRowWorkflowComplete(fieldVisitRow)}
                            disabled={executionCoerciveButtonDisabled}
                            resubmitWarningMessage={resubmitWarning}
                            onConfirmSend={({ resubmit } = {}) => {
                                appendEvictionProcedure({
                                    actionId: EVICTION_TIMELINE_ACTION_IDS.FIELD_VISIT as EvictionTimelineActionId,
                                    title: '📍 طلب تحديد موعد الخروج الميداني',
                                    description: 'طلب تحديد موعد الخروج الميداني مع منفذ العدل (باشر).',
                                    supersedeCompletedHub: resubmit,
                                });
                            }}
                            panelBody={renderProcedurePanel(
                                'طلب تحديد موعد الخروج الميداني',
                                fieldVisitRow,
                                'Field Visit Date'
                            )}
                        />
                    ) : null}
                </div>
            </div>

            {showGenericFieldProcedureCards ? (
            <FollowupProcedureCard
                label="مفاتحة الشرطة للقوة الإجرائية"
                icon={procedureIcon(<Shield className="w-6 h-6 text-white/70" />)}
                gateKey="eviction_police_force"
                inlineActionGateKey={inlineActionGateKey}
                setInlineActionGateKey={setInlineActionGateKey}
                hasActiveRequest={procedureCardInProgress(policeRow)}
                expanded={Boolean(expandedByKey.police)}
                onToggleExpanded={() => toggleExpanded('police')}
                workflowComplete={isRowWorkflowComplete(policeRow)}
                disabled={executionCoerciveButtonDisabled}
                resubmitWarningMessage={resubmitWarning}
                onConfirmSend={({ resubmit } = {}) =>
                    appendEvictionProcedure({
                        actionId: EVICTION_TIMELINE_ACTION_IDS.POLICE_FORCE as EvictionTimelineActionId,
                        title: '🛡️ مفاتحة الشرطة للقوة الإجرائية',
                        description:
                            'تمت مفاتحة الجهة الأمنية لطلب القوة الإجرائية المساندة للتنفيذ الميداني.',
                        supersedeCompletedHub: resubmit,
                    })
                }
                panelBody={renderProcedurePanel(
                    'مفاتحة الشرطة للقوة الإجرائية',
                    policeRow,
                    'Police Assistance Request'
                )}
            />
            ) : null}

            {showPropertyExpertCard && decisionsStorageExecutionId ? (
                <SpecificDeliveryPropertyExpertRequestCard
                    decisionsStorageExecutionId={decisionsStorageExecutionId}
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    showToast={showToast}
                    specificDeliveryItemName={specificDeliveryItemName}
                    onExpenseRecorded={onSpecificDeliveryExpenseRecorded}
                />
            ) : null}

            {showBreakInventory && !isMaritalFurnitureClaim ? (
                <FollowupProcedureCard
                    label="طلب كسر الأقفال وجرد الأثاث"
                    icon={procedureIcon(<Gavel className="w-6 h-6 text-white/70" />)}
                    gateKey="eviction_break_inventory"
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    hasActiveRequest={procedureCardInProgress(breakInventoryRow)}
                    expanded={Boolean(expandedByKey.break_inventory)}
                    onToggleExpanded={() => toggleExpanded('break_inventory')}
                    workflowComplete={isRowWorkflowComplete(breakInventoryRow)}
                    lifecycleSummary={lifecycleForBranch('Lock Breaking & Inventory')}
                    disabled={executionCoerciveButtonDisabled}
                    resubmitWarningMessage={resubmitWarning}
                    onConfirmSend={({ resubmit } = {}) => {
                        appendEvictionProcedure({
                            actionId: EVICTION_TIMELINE_ACTION_IDS.BREAK_INVENTORY as EvictionTimelineActionId,
                            title: '🔨 طلب كسر الأقفال وجرد الأثاث',
                            description:
                                'طلب عرض على منفذ العدل بشأن كسر الأقفال وجرد محتويات المنقولات في العين المؤجرة.',
                            supersedeCompletedHub: resubmit,
                        });
                    }}
                    panelBody={renderProcedurePanel(
                        'طلب كسر الأقفال وجرد الأثاث',
                        breakInventoryRow,
                        'Lock Breaking & Inventory'
                    )}
                />
            ) : null}

            {!hideEvictionCustodianProcedure ? (
                <FollowupProcedureCard
                    label="تنصيب حارس قضائي"
                    subtitle="بعد طلب الكسر والجرد — يمكن إضافة أكثر من حارس بعد التعيين"
                    icon={procedureIcon(<UserCheck className="w-6 h-6 text-white/70" />)}
                    gateKey="eviction_custodian"
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    hasActiveRequest={procedureCardInProgress(custodianRow)}
                    expanded={Boolean(expandedByKey.custodian)}
                    onToggleExpanded={() => toggleExpanded('custodian')}
                    workflowComplete={isRowWorkflowComplete(custodianRow)}
                    lifecycleSummary={lifecycleForBranch('Judicial Custodian')}
                    disabled={executionCoerciveButtonDisabled}
                    resubmitWarningMessage={resubmitWarning}
                    onConfirmSend={({ resubmit } = {}) => {
                        appendEvictionProcedure({
                            actionId: EVICTION_TIMELINE_ACTION_IDS.CUSTODIAN as EvictionTimelineActionId,
                            title: '👤 طلب تنصيب حارس قضائي',
                            description: 'طلب عرض على منفذ العدل لتنصيب حارس قضائي على العين.',
                            supersedeCompletedHub: resubmit,
                        });
                    }}
                    panelBody={renderProcedurePanel('تنصيب حارس قضائي', custodianRow, 'Judicial Custodian')}
                />
            ) : null}

            {!hideEncroachmentEvictionProcedureItems ? (
                <FollowupProcedureCard
                    label="طلب الإخلاء الجبري"
                    icon={procedureIcon(<Home className="w-6 h-6 text-white/70" />)}
                    gateKey="eviction_forced_eviction"
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    hasActiveRequest={procedureCardInProgress(forcedEvictionRow)}
                    expanded={Boolean(expandedByKey.forced_eviction)}
                    onToggleExpanded={() => toggleExpanded('forced_eviction')}
                    workflowComplete={isRowWorkflowComplete(forcedEvictionRow)}
                    lifecycleSummary={lifecycleForBranch('Eviction')}
                    disabled={executionCoerciveButtonDisabled}
                    resubmitWarningMessage={resubmitWarning}
                    onConfirmSend={({ resubmit } = {}) => {
                        const ok = appendEvictionExecutorRequest({
                            executionId: decisionsStorageExecutionId,
                            title: 'طلب الإخلاء الجبري',
                            body: 'طلب إخلاء العقار موضوع الإضبارة جبرياً وتسليمه للدائن خاوياً من الشواغل.',
                            requestKind: 'eviction_procedure',
                            evictionWorkflowKey: 'inventory_or_eviction',
                            supersedeCompletedHub: resubmit,
                        });
                        if (!ok) {
                            showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning');
                            return;
                        }
                        showToast('تم إنشاء الطلب — قرار المنفذ يظهر هنا.', 'success');
                    }}
                    panelBody={renderProcedurePanel(
                        'طلب الإخلاء الجبري',
                        forcedEvictionRow,
                        'Eviction'
                    )}
                />
            ) : null}

            {showSpecificDeliveryConversionCard && decisionsStorageExecutionId ? (
                <SpecificDeliveryConversionRequestCard
                    decisionsStorageExecutionId={decisionsStorageExecutionId}
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    showToast={showToast}
                    specificDeliveryItemName={specificDeliveryItemName}
                    specificDeliveryFinancialized={specificDeliveryFinancialized}
                    onConversionFinancialized={onSpecificDeliveryFinancialized}
                    showDirectCashConversion={judgmentValuePredetermined}
                />
            ) : null}

            {showMovableValuationExpertCard && decisionsStorageExecutionId ? (
                <SpecificDeliveryMovableValuationExpertCard
                    decisionsStorageExecutionId={decisionsStorageExecutionId}
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    showToast={showToast}
                    specificDeliveryItemName={specificDeliveryItemName}
                    onExpenseRecorded={onSpecificDeliveryExpenseRecorded}
                    onValuationFinancialized={onSpecificDeliveryFinancialized}
                />
            ) : null}
        </div>
    );
};
