import React from 'react';
import {
    findApprovedFieldVisitNeedingSchedule,
    getExecutorDecisionRowById,
    getGoverningEvictionProcedureRowForBranch,
    isEvictionProcedureRowActive,
    isEvictionProcedureRowWorkflowComplete,
    isExecutorRowRejectedAndFinal,
    patchExecutorDecisionRowReliable,
    dispatchDecisionsReload,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { PoliceAssistanceInlineForm } from '@/app/components/lawyer/execution/PoliceAssistanceInlineForm';
import { JudicialCustodianInlineForm } from '@/app/components/lawyer/execution/JudicialCustodianInlineForm';
import { BreakInventoryFurnitureInlineForm } from '@/app/components/lawyer/execution/BreakInventoryFurnitureInlineForm';
import { MaritalFurnitureDeliveryInventoryForm } from '@/app/components/lawyer/execution/MaritalFurnitureDeliveryInventoryForm';
import { branchRowNeedsPostApprovalInlineWork } from '../../utils/branchRowNeedsPostApprovalInlineWork';
import { isJudicialCustodianRowDetailsComplete } from '../../utils/isJudicialCustodianRowDetailsComplete';
import { EvictionPostApproveRail } from '../../EvictionPostApproveRail';
import type { EvictionDecisionRow } from './evictionDecisionRowTypes';
import type { EvictionBranchRenderersCtx } from './evictionBranchRenderersCtx';

export function createFindActiveApprovedIncompleteRow(ctx: EvictionBranchRenderersCtx) {
    const { decisions } = ctx;
    return (branch: string) => {
        const list = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];
        const newest = getGoverningEvictionProcedureRowForBranch(list, branch);
        if (!newest) return null;
        if (
            isExecutorRowApprovedWorkflowActive(newest, list) &&
            !isExecutorRowRejectedAndFinal(newest) &&
            isEvictionProcedureRowActive(newest, list) &&
            !isEvictionProcedureRowWorkflowComplete(newest)
        ) {
            return newest;
        }
        return null;
    };
}

export function createResolveFieldVisitScheduleRow(
    ctx: EvictionBranchRenderersCtx,
    findActiveApprovedIncompleteRow: ReturnType<typeof createFindActiveApprovedIncompleteRow>,
) {
    const { executionData, resolvePanelExecutionId } = ctx;
    return () => {
        const fromActive = findActiveApprovedIncompleteRow('Field Visit Date');
        if (fromActive?.id) return fromActive;
        const execId = resolvePanelExecutionId();
        if (!execId) return null;
        const hint = findApprovedFieldVisitNeedingSchedule(execId, executionData);
        if (!hint?.decisionId) return null;
        return getExecutorDecisionRowById(execId, hint.decisionId);
    };
}

function wrapPostApprove(title: string, node: React.ReactNode): React.ReactNode {
    return <EvictionPostApproveRail title={title}>{node}</EvictionPostApproveRail>;
}

export function createRenderInlineDecision(
    ctx: EvictionBranchRenderersCtx,
    deps: {
        findActiveApprovedIncompleteRow: ReturnType<typeof createFindActiveApprovedIncompleteRow>;
        resolveFieldVisitScheduleRow: ReturnType<typeof createResolveFieldVisitScheduleRow>;
        renderFieldVisitInline: (row: EvictionDecisionRow) => React.ReactNode;
    },
) {
    const {
        inlineExpandedByBranch,
        decisions,
        resolvedExistingJudicialCustodians,
        locked,
        savePoliceAssistance,
        openPoliceAssistanceDetails,
        appealSync,
        toast,
        decisionsExecId,
        collapseBranchPanel,
        saveJudicialCustodianDetails,
        tryOpenPendingCustodianDetails,
        finalizeBreakInventoryRequest,
        isMaritalFurnitureClaim,
        maritalFurnitureItems,
        saveMaritalFurnitureDeliveryInventory,
        saveBreakInventoryLedger,
        renderRowFollowupBlock,
        resolvePanelExecutionId,
    } = ctx;
    const { findActiveApprovedIncompleteRow, resolveFieldVisitScheduleRow, renderFieldVisitInline } =
        deps;

    return (branch: string, _label: string, afterApprove?: React.ReactNode) => {
        if (!inlineExpandedByBranch[branch]) return null;
        const rawRow =
            branch === 'Field Visit Date'
                ? resolveFieldVisitScheduleRow()
                : findActiveApprovedIncompleteRow(branch);
        if (!rawRow?.id) return null;
        const row = rawRow as EvictionDecisionRow;
        const rowBlock = renderRowFollowupBlock(row);
        if (rowBlock) {
            return <div className="border-t border-white/8 px-3 py-2">{rowBlock}</div>;
        }
        const list = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];

        if (
            branch === 'Judicial Custodian' &&
            isJudicialCustodianRowDetailsComplete(row, resolvedExistingJudicialCustodians)
        ) {
            queueMicrotask(() => collapseBranchPanel('Judicial Custodian'));
            return null;
        }

        if (
            !branchRowNeedsPostApprovalInlineWork(branch, row, list) &&
            branch !== 'Field Visit Date'
        ) {
            return null;
        }
        if (branch === 'Field Visit Date') {
            return renderFieldVisitInline(row);
        }

        const decisionId = String(row.id || '').trim();
        const approved = isExecutorRowApprovedWorkflowActive(row, list);
        if (!approved) return null;

        let effectiveAfterApprove: React.ReactNode = afterApprove ?? null;

        if (!effectiveAfterApprove && branch === 'Police Assistance Request') {
            const savedAt = String(row.policeAssistanceSavedAt || '').trim();
            if (savedAt) {
                queueMicrotask(() => collapseBranchPanel('Police Assistance Request'));
                return null;
            }
            const agencyName = String(row.policeAssistanceAgency || '').trim();
            const requestTitle =
                String(row.title || 'مفاتحة الشرطة للقوة الإجرائية').trim() ||
                'مفاتحة الشرطة للقوة الإجرائية';
            effectiveAfterApprove = savePoliceAssistance ? (
                <PoliceAssistanceInlineForm
                    embedded
                    requestTitle={requestTitle}
                    initialAgencyName={agencyName}
                    disabled={locked}
                    onSave={({ agencyName: agency, linkToTasks }) => {
                        if (locked) return;
                        if (appealSync['Police Assistance Request'].blocksFieldwork) {
                            toast(
                                appealSync['Police Assistance Request'].followupBlock?.message ??
                                    'لا يمكن تسجيل القوة الجبرية — الطلب موقوف بسبب التظلم أو الطعن.',
                                'warning',
                            );
                            return;
                        }
                        savePoliceAssistance({ decisionId, agencyName: agency, linkToTasks });
                        queueMicrotask(() => collapseBranchPanel('Police Assistance Request'));
                    }}
                />
            ) : (
                <button
                    type="button"
                    disabled={locked}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (locked) return;
                        const fallbackTitle =
                            String(row.title || 'القوة الجبرية').trim() || 'القوة الجبرية';
                        openPoliceAssistanceDetails?.({ decisionId, requestTitle: fallbackTitle });
                    }}
                    className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-bold text-amber-100 disabled:opacity-40"
                >
                    تسجيل القوة الجبرية
                </button>
            );
            return wrapPostApprove('بيانات القوة الإجرائية', effectiveAfterApprove);
        }

        if (!effectiveAfterApprove && branch === 'Judicial Custodian') {
            const savedAt = String(row.judicialCustodianDetailsSavedAt || '').trim();
            const dossierComplete = isJudicialCustodianRowDetailsComplete(
                row,
                resolvedExistingJudicialCustodians,
            );
            if (savedAt || dossierComplete) {
                queueMicrotask(() => collapseBranchPanel('Judicial Custodian'));
                return null;
            }
            const saveCustodian = (payload: { name: string; salary: string }) => {
                if (locked) return;
                if (saveJudicialCustodianDetails) {
                    saveJudicialCustodianDetails({
                        decisionId,
                        name: payload.name,
                        salary: payload.salary,
                    });
                    queueMicrotask(() => collapseBranchPanel('Judicial Custodian'));
                    return;
                }
                const storageId = String(resolvePanelExecutionId() || decisionsExecId || '').trim();
                if (storageId) {
                    const ts = new Date().toISOString();
                    const { ok } = patchExecutorDecisionRowReliable(storageId, decisionId, {
                        judicialCustodianDetailsSavedAt: ts,
                        judicialCustodianName: payload.name,
                        judicialCustodianSalary: payload.salary,
                    });
                    if (ok) {
                        dispatchDecisionsReload();
                        toast('تم حفظ بيانات الحارس القاضي', 'success');
                        queueMicrotask(() => collapseBranchPanel('Judicial Custodian'));
                        return;
                    }
                }
                const opened = tryOpenPendingCustodianDetails?.();
                if (!opened) {
                    toast('تعذّر فتح نموذج الحارس — أعد فتح التبويب.', 'warning');
                }
            };

            effectiveAfterApprove = (
                <JudicialCustodianInlineForm
                    embedded
                    existingCustodians={resolvedExistingJudicialCustodians}
                    onSave={saveCustodian}
                />
            );
            return wrapPostApprove('بيانات الحارس القاضي', effectiveAfterApprove);
        }

        if (!effectiveAfterApprove && branch === 'Lock Breaking & Inventory') {
            const finalizedAt = String(row.breakInventoryFurnitureFinalizedAt || '').trim();
            if (finalizedAt) {
                queueMicrotask(() => collapseBranchPanel('Lock Breaking & Inventory'));
                return null;
            }
            if (finalizeBreakInventoryRequest) {
                if (isMaritalFurnitureClaim && saveMaritalFurnitureDeliveryInventory) {
                    effectiveAfterApprove = (
                        <MaritalFurnitureDeliveryInventoryForm
                            items={maritalFurnitureItems}
                            disabled={locked}
                            ledgerSaved={Boolean(
                                String(row.breakInventoryFurnitureLedgerAt || '').trim(),
                            )}
                            onSave={(items) => {
                                if (locked) return;
                                saveMaritalFurnitureDeliveryInventory({ decisionId, items });
                            }}
                            onFinalize={() => {
                                if (locked) return;
                                finalizeBreakInventoryRequest({ decisionId });
                                queueMicrotask(() =>
                                    collapseBranchPanel('Lock Breaking & Inventory'),
                                );
                            }}
                        />
                    );
                } else if (saveBreakInventoryLedger) {
                    effectiveAfterApprove = (
                        <BreakInventoryFurnitureInlineForm
                            embedded
                            requestTitle="طلب كسر الأقفال وجرد الأثاث"
                            disabled={locked}
                            ledgerSaved={Boolean(
                                String(row.breakInventoryFurnitureLedgerAt || '').trim(),
                            )}
                            onSave={(payload) => {
                                if (locked) return;
                                saveBreakInventoryLedger({ decisionId, payload });
                            }}
                            onFinalize={() => {
                                if (locked) return;
                                finalizeBreakInventoryRequest({ decisionId });
                                queueMicrotask(() =>
                                    collapseBranchPanel('Lock Breaking & Inventory'),
                                );
                            }}
                        />
                    );
                }
            }
            if (effectiveAfterApprove) {
                return wrapPostApprove('جرد الأثاث', effectiveAfterApprove);
            }
            return null;
        }

        if (!effectiveAfterApprove) return null;
        return wrapPostApprove('إكمال البيانات', effectiveAfterApprove);
    };
}
