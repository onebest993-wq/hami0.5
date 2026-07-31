import React from 'react';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    isEvictionProcedureRowWorkflowComplete,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import { PoliceAssistanceInlineForm } from '@/app/components/lawyer/execution/PoliceAssistanceInlineForm';
import { BreakInventoryFurnitureInlineForm } from '@/app/components/lawyer/execution/BreakInventoryFurnitureInlineForm';
import { MaritalFurnitureDeliveryInventoryForm } from '@/app/components/lawyer/execution/MaritalFurnitureDeliveryInventoryForm';
import { MaritalFurnitureDeliveryAfterApproveForm } from '@/app/components/lawyer/execution/MaritalFurnitureDeliveryAfterApproveForm';
import type { BreakInventoryFurnitureSavePayload } from '@/app/utils/executorApprovalWorkflow';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';

export type EvictionAfterApproveDeps = {
    decisionsStorageExecutionId: string;
    decisionRows: Array<Record<string, unknown>>;
    fieldVisitDateDraft: string;
    setFieldVisitDateDraft: (v: string) => void;
    showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    dispatchDecisionsReload: () => void;
    executionCoerciveButtonDisabled?: boolean;
    savePoliceAssistance?: (args: {
        decisionId: string;
        agencyName: string;
        linkToTasks: boolean;
    }) => void;
    isMaritalFurnitureClaim?: boolean;
    maritalFurnitureItems?: MaritalFurnitureItem[];
    saveMaritalFurnitureDeliveryInventory?: (args: {
        decisionId: string;
        items: MaritalFurnitureItem[];
    }) => void;
    saveBreakInventoryLedger?: (args: {
        decisionId: string;
        payload: BreakInventoryFurnitureSavePayload;
    }) => void;
    finalizeBreakInventoryRequest?: (args: { decisionId: string }) => void;
};

function buildArabicDateLabel(ymd: string) {
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
}

export function saveEvictionFieldVisitSchedule(
    decisionId: string,
    d: EvictionAfterApproveDeps,
): void {
    const dateOnly = d.fieldVisitDateDraft.trim();
    if (!dateOnly) {
        d.showToast('أدخل تاريخ الموعد الميداني', 'warning');
        return;
    }
    const displayAr = buildArabicDateLabel(dateOnly);
    const ok = patchExecutorDecisionRow(d.decisionsStorageExecutionId, decisionId, {
        executorScheduleLabel: `مجدول: ${displayAr}`,
    });
    if (!ok) {
        d.showToast('تعذر حفظ الموعد', 'error');
        return;
    }
    d.dispatchDecisionsReload();
    d.setFieldVisitDateDraft('');
    d.showToast('تم تسجيل موعد الخروج الميداني.', 'success');
}

export function buildEvictionAfterApproveContent(
    row: Record<string, unknown>,
    branch: string,
    d: EvictionAfterApproveDeps,
): React.ReactNode {
    if (!isExecutorRowApprovedWorkflowActive(row, d.decisionRows)) return null;
    if (isEvictionProcedureRowWorkflowComplete(row)) return null;
    const decisionId = String(row.id || '').trim();
    if (!decisionId) return null;

    if (branch === 'Field Visit Date') {
        if (String(row.executorScheduleLabel || '').trim()) return null;
        return (
            <div className="space-y-2">
                <input
                    type="date"
                    value={d.fieldVisitDateDraft}
                    onChange={(e) => d.setFieldVisitDateDraft(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100"
                    style={{ direction: 'ltr', textAlign: 'right' }}
                />
                <button
                    type="button"
                    onClick={() => saveEvictionFieldVisitSchedule(decisionId, d)}
                    className="w-full rounded-xl bg-gradient-to-l from-amber-500 to-yellow-600 py-2.5 text-[11px] font-black text-[#0A0F1C]"
                >
                    تأكيد وحفظ الموعد
                </button>
            </div>
        );
    }

    if (branch === 'Police Assistance Request') {
        if (String(row.policeAssistanceSavedAt || '').trim()) return null;
        if (!d.savePoliceAssistance) return null;
        return (
            <PoliceAssistanceInlineForm
                embedded
                initialAgencyName={String(row.policeAssistanceAgency || '')}
                disabled={d.executionCoerciveButtonDisabled}
                onSave={({ agencyName, linkToTasks }) =>
                    d.savePoliceAssistance!({ decisionId, agencyName, linkToTasks })
                }
            />
        );
    }

    if (branch === 'Lock Breaking & Inventory') {
        if (String(row.breakInventoryFurnitureFinalizedAt || '').trim()) return null;

        if (d.isMaritalFurnitureClaim && d.saveMaritalFurnitureDeliveryInventory) {
            return (
                <MaritalFurnitureDeliveryInventoryForm
                    items={d.maritalFurnitureItems || []}
                    disabled={d.executionCoerciveButtonDisabled}
                    ledgerSaved={Boolean(
                        String(row.breakInventoryFurnitureLedgerAt || '').trim(),
                    )}
                    onSave={(items) =>
                        d.saveMaritalFurnitureDeliveryInventory!({ decisionId, items })
                    }
                    onFinalize={() => d.finalizeBreakInventoryRequest?.({ decisionId })}
                />
            );
        }

        if (!d.saveBreakInventoryLedger || !d.finalizeBreakInventoryRequest) return null;
        return (
            <BreakInventoryFurnitureInlineForm
                embedded
                disabled={d.executionCoerciveButtonDisabled}
                ledgerSaved={Boolean(String(row.breakInventoryFurnitureLedgerAt || '').trim())}
                onSave={(payload) => d.saveBreakInventoryLedger!({ decisionId, payload })}
                onFinalize={() => d.finalizeBreakInventoryRequest!({ decisionId })}
            />
        );
    }

    if (branch === 'Marital Furniture Delivery') {
        if (isEvictionProcedureRowWorkflowComplete(row)) return null;
        return (
            <MaritalFurnitureDeliveryAfterApproveForm
                row={row}
                decisionsStorageExecutionId={d.decisionsStorageExecutionId}
                maritalFurnitureItems={d.maritalFurnitureItems || []}
                disabled={d.executionCoerciveButtonDisabled}
                showToast={d.showToast}
                saveMaritalFurnitureDeliveryInventory={d.saveMaritalFurnitureDeliveryInventory}
                finalizeBreakInventoryRequest={d.finalizeBreakInventoryRequest}
            />
        );
    }

    return null;
}
