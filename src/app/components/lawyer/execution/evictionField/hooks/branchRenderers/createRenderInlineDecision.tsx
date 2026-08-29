import React from 'react';
import {
    findApprovedFieldVisitNeedingSchedule,
    getExecutorDecisionRowById,
    getGoverningEvictionProcedureRowForBranch,
    isEvictionProcedureRowActive,
    isEvictionProcedureRowWorkflowComplete,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { formatIqdDisplay, parseAmount } from '@/app/utils/execution/amountInput';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { ExecutionInlineAccordion, type ExecutionInlineStep } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { PoliceAssistanceInlineForm } from '@/app/components/lawyer/execution/PoliceAssistanceInlineForm';
import { JudicialCustodianInlineForm } from '@/app/components/lawyer/execution/JudicialCustodianInlineForm';
import { BreakInventoryFurnitureInlineForm } from '@/app/components/lawyer/execution/BreakInventoryFurnitureInlineForm';
import { MaritalFurnitureDeliveryInventoryForm } from '@/app/components/lawyer/execution/MaritalFurnitureDeliveryInventoryForm';
import { branchRowNeedsPostApprovalInlineWork } from '../../utils/branchRowNeedsPostApprovalInlineWork';
import { isJudicialCustodianRowDetailsComplete } from '../../utils/isJudicialCustodianRowDetailsComplete';
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
    } = ctx;
    const { findActiveApprovedIncompleteRow, resolveFieldVisitScheduleRow, renderFieldVisitInline } = deps;

    return (branch: string, label: string, afterApprove?: React.ReactNode) => {
    if (!inlineExpandedByBranch[branch]) return null;
    const rawRow =
        branch === 'Field Visit Date'
            ? resolveFieldVisitScheduleRow()
            : findActiveApprovedIncompleteRow(branch);
    if (!rawRow?.id) return null;
    const row = rawRow as EvictionDecisionRow;
    const rowBlock = renderRowFollowupBlock(row);
    if (rowBlock) {
        return <div className="border-t border-white/10 px-3 pb-3 pt-2">{rowBlock}</div>;
    }
    const list = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];
    const approved = isExecutorRowApprovedWorkflowActive(row, list);
    if (
        branch === 'Judicial Custodian' &&
        isJudicialCustodianRowDetailsComplete(row, resolvedExistingJudicialCustodians)
    ) {
        const decisionId = String(row.id || '').trim();
        const dossierCustodian = resolvedExistingJudicialCustodians.find(
            (c) => String(c.decisionId || '').trim() === decisionId,
        );
        const custodianName =
            String(row.judicialCustodianName || '').trim() ||
            dossierCustodian?.fullName ||
            '';
        const custodianSalary =
            String(row.judicialCustodianSalary || '').trim() ||
            dossierCustodian?.salary ||
            '';
        return (
            <div className="border-t border-white/10 px-3 pb-3 pt-2">
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-3 text-right">
                    <p className="text-[11px] font-black text-emerald-100">
                        تم تسجيل بيانات الحارس القاضي
                    </p>
                    {custodianName ? (
                        <p className="mt-1 text-[10px] leading-relaxed text-emerald-200/90">
                            {custodianName}
                            {custodianSalary
                                ? (() => {
                                      const n = parseAmount(custodianSalary);
                                      const label =
                                          Number.isFinite(n) && n > 0
                                              ? `${formatIqdDisplay(n)} د.ع`
                                              : custodianSalary;
                                      return ` — ${label}`;
                                  })()
                                : ''}
                        </p>
                    ) : null}
                </div>
            </div>
        );
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
    if (!approved) return null;
    let effectiveAfterApprove: React.ReactNode = afterApprove ?? null;
    if (!effectiveAfterApprove && branch === 'Police Assistance Request') {
        const savedAt = String(row.policeAssistanceSavedAt || '').trim();
        const agencyName = String(row.policeAssistanceAgency || '').trim();
        if (!savedAt) {
            const requestTitle =
                String(row.title || 'مفاتحة الشرطة للقوة الإجرائية').trim() ||
                'مفاتحة الشرطة للقوة الإجرائية';
            effectiveAfterApprove = savePoliceAssistance ? (
                <PoliceAssistanceInlineForm
                    requestTitle={requestTitle}
                    initialAgencyName={agencyName}
                    disabled={locked}
                    onSave={({ agencyName: agency, linkToTasks }) => {
                        if (locked) return;
                        if (appealSync['Police Assistance Request'].blocksFieldwork) {
                            toast(
                                appealSync['Police Assistance Request'].followupBlock?.message ??
                                    'لا يمكن تسجيل القوة الجبرية — الطلب موقوف بسبب التظلم أو الطعن.',
                                'warning'
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
                        if (appealSync['Police Assistance Request'].blocksFieldwork) {
                            toast(
                                appealSync['Police Assistance Request'].followupBlock?.message ??
                                    'لا يمكن تسجيل القوة الجبرية — الطلب موقوف بسبب التظلم أو الطعن.',
                                'warning'
                            );
                            return;
                        }
                        const fallbackTitle =
                            String(row.title || 'القوة الجبرية').trim() || 'القوة الجبرية';
                        if (openPoliceAssistanceDetails) {
                            openPoliceAssistanceDetails({ decisionId, requestTitle: fallbackTitle });
                            return;
                        }
                        if (!decisionsExecId) return;
                        try {
                            window.dispatchEvent(
                                new CustomEvent('hami-open-decisions-modal', {
                                    detail: { executionId: decisionsExecId, tab: 'previous', decisionId },
                                })
                            );
                        } catch {
                            /* ignore */
                        }
                    }}
                    className="w-full rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] font-extrabold text-amber-200 hover:bg-amber-500/15 disabled:opacity-40"
                >
                    تسجيل القوة الجبرية
                </button>
            );
        } else {
            effectiveAfterApprove = (
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-3 text-right">
                    <p className="text-[11px] font-black text-emerald-100">تم تسجيل القوة الجبرية</p>
                    {agencyName ? (
                        <p className="mt-1 text-[10px] leading-relaxed text-emerald-200/90">
                            الجهة المرافقة: {agencyName}
                        </p>
                    ) : null}
                </div>
            );
        }
    }
    if (!effectiveAfterApprove && branch === 'Judicial Custodian') {
        const savedAt = String(row.judicialCustodianDetailsSavedAt || '').trim();
        const dossierComplete = isJudicialCustodianRowDetailsComplete(
            row,
            resolvedExistingJudicialCustodians,
        );
        const custodianName = String(row.judicialCustodianName || '').trim();
        const custodianSalary = String(row.judicialCustodianSalary || '').trim();
        const dossierCustodian = resolvedExistingJudicialCustodians.find(
            (c) => String(c.decisionId || '').trim() === decisionId,
        );
        if (!savedAt && !dossierComplete) {
            effectiveAfterApprove = saveJudicialCustodianDetails ? (
                <JudicialCustodianInlineForm
                    embedded
                    existingCustodians={resolvedExistingJudicialCustodians}
                    onSave={({ name, salary }) => {
                        if (locked) return;
                        saveJudicialCustodianDetails({ decisionId, name, salary });
                        queueMicrotask(() => collapseBranchPanel('Judicial Custodian'));
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
                        tryOpenPendingCustodianDetails?.();
                    }}
                    className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-100 disabled:opacity-40"
                >
                    متابعة حفظ بيانات الحارس
                </button>
            );
        } else {
            const displayName = custodianName || dossierCustodian?.fullName || '';
            const displaySalary = custodianSalary || dossierCustodian?.salary || '';
            effectiveAfterApprove = (
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-3 text-right">
                    <p className="text-[11px] font-black text-emerald-100">تم تسجيل بيانات الحارس القاضي</p>
                    {displayName ? (
                        <p className="mt-1 text-[10px] leading-relaxed text-emerald-200/90">
                            {displayName}
                            {displaySalary
                                ? (() => {
                                      const n = parseAmount(displaySalary);
                                      const label =
                                          Number.isFinite(n) && n > 0
                                              ? `${formatIqdDisplay(n)} د.ع`
                                              : displaySalary;
                                      return ` — ${label}`;
                                  })()
                                : ''}
                        </p>
                    ) : null}
                </div>
            );
        }
    }
    if (!effectiveAfterApprove && branch === 'Lock Breaking & Inventory') {
        const finalizedAt = String(row.breakInventoryFurnitureFinalizedAt || '').trim();
        if (!finalizedAt && finalizeBreakInventoryRequest) {
            if (isMaritalFurnitureClaim && saveMaritalFurnitureDeliveryInventory) {
                effectiveAfterApprove = (
                    <MaritalFurnitureDeliveryInventoryForm
                        items={maritalFurnitureItems}
                        disabled={locked}
                        ledgerSaved={Boolean(
                            String(row.breakInventoryFurnitureLedgerAt || '').trim()
                        )}
                        onSave={(items) => {
                            if (locked) return;
                            saveMaritalFurnitureDeliveryInventory({ decisionId, items });
                        }}
                        onFinalize={() => {
                            if (locked) return;
                            finalizeBreakInventoryRequest({ decisionId });
                            queueMicrotask(() =>
                                collapseBranchPanel('Lock Breaking & Inventory')
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
                            String(row.breakInventoryFurnitureLedgerAt || '').trim()
                        )}
                        onSave={(payload) => {
                            if (locked) return;
                            saveBreakInventoryLedger({ decisionId, payload });
                        }}
                        onFinalize={() => {
                            if (locked) return;
                            finalizeBreakInventoryRequest({ decisionId });
                            queueMicrotask(() =>
                                collapseBranchPanel('Lock Breaking & Inventory')
                            );
                        }}
                    />
                );
            }
        }
    }
    if (!effectiveAfterApprove) return null;

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
            subtitle: 'تمت الموافقة',
            status: 'done',
            tone: 'success',
        },
        ...(effectiveAfterApprove
            ? [
                  {
                      id: `${decisionId}:after`,
                      title: 'إكمال البيانات',
                      subtitle: 'بعد الموافقة — وسّع لإدخال البيانات',
                      status: 'active',
                      tone: 'neutral',
                      content: effectiveAfterApprove,
                  } satisfies ExecutionInlineStep,
              ]
            : []),
    ];

    return (
        <div className="border-t border-white/10 px-3 pb-3 pt-2">
            <ExecutionInlineAccordion steps={steps} />
        </div>
    );
    };
}
