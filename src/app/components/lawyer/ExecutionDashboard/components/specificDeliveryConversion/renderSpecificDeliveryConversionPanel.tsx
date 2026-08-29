import React from 'react';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import {
    dispatchDecisionsReload,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    parseSpecificDeliveryConversionPayload,
    SPECIFIC_DELIVERY_CONVERSION_TITLE,
} from '@/app/utils/specificDeliveryConversionRequest';
import type { SpecificDeliveryItem } from '@/app/utils/specificDeliveryItemsUtils';

export function renderSpecificDeliveryConversionPanel({
    row,
    workflowComplete,
    savedAt,
    decisionRows,
    allItems,
    executionId,
    openAppeals,
    confirmDestructionAfterApproval,
}: {
    row: Record<string, unknown> | null;
    workflowComplete: boolean;
    savedAt: string;
    decisionRows: Record<string, unknown>[];
    allItems: SpecificDeliveryItem[];
    executionId: string;
    openAppeals: (decisionId: string) => void;
    confirmDestructionAfterApproval: () => void;
}): React.ReactNode {
    if (!row?.id) return null;
    if (workflowComplete && savedAt) return null;

    const decisionId = String(row.id || '').trim();
    const rejected = isExecutorRowRejectedAndFinal(row);
    const approved = isExecutorRowApprovedWorkflowActive(row, decisionRows);
    const pending =
        String(row.executorOutcome ?? 'pending') === 'pending' ||
        String(row.executorOutcome ?? '') === '';

    const steps: ExecutionInlineStep[] = [
        {
            id: `${decisionId}:sent`,
            title: SPECIFIC_DELIVERY_CONVERSION_TITLE,
            subtitle: 'تم إرسال الطلب',
            status: 'done',
            tone: 'success',
        },
        {
            id: `${decisionId}:executor`,
            title: 'قرار المنفذ',
            subtitle: rejected
                ? 'تم رفض الطلب — انتهت الدورة'
                : approved
                  ? 'تمت الموافقة — انتقل لانتداب الخبير لتقدير القيمة'
                  : pending
                    ? 'قيد البت'
                    : '—',
            status: rejected || pending ? 'active' : 'done',
            tone: rejected ? 'danger' : approved ? 'success' : 'neutral',
            content:
                rejected || pending ? (
                    <ExecutionInlineExecutorDecisionActions
                        executionId={executionId}
                        decisionId={decisionId}
                        decisionRow={row}
                        requestKind="special_followup"
                        disabled={rejected}
                        onOpenAppealCenter={() => openAppeals(decisionId)}
                        onResolved={(result) => {
                            if (result.ok) dispatchDecisionsReload();
                        }}
                    />
                ) : approved ? (
                    <button
                        type="button"
                        onClick={() => openAppeals(decisionId)}
                        className="w-full rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] font-extrabold text-amber-200 hover:bg-amber-500/15"
                    >
                        متابعة قرار المنفذ
                    </button>
                ) : null,
        },
    ];

    if (approved && !rejected && !savedAt) {
        const payload = parseSpecificDeliveryConversionPayload(row);
        const itemLabel =
            payload.itemName ||
            allItems.find((item) => item.id === payload.itemId)?.name ||
            'الشيء المحدد';
        steps.push({
            id: `${decisionId}:complete`,
            title: 'تسجيل الهلاك',
            subtitle: 'بعد موافقة المنفذ',
            status: 'active',
            tone: 'neutral',
            content: (
                <div className="space-y-2.5">
                    <p className="text-[10px] text-slate-400 text-right">
                        الشيء: <span className="font-bold text-slate-200">{itemLabel}</span>
                    </p>
                    <button
                        type="button"
                        onClick={confirmDestructionAfterApproval}
                        className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-500/15"
                    >
                        تأكيد الهلاك والانتقال لانتداب الخبير
                    </button>
                </div>
            ),
        });
    }

    return (
        <div className="px-3 pb-3 pt-2" dir="rtl">
            <ExecutionInlineAccordion steps={steps} />
        </div>
    );
}
