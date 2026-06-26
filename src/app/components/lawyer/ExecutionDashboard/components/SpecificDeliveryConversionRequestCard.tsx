import React from 'react';

import { AlertTriangle, Building2, Package } from 'lucide-react';

import type { InlineActionGateKey } from '../types';

import { useExecutorDecisions } from '@/app/components/lawyer/ExecutionDashboard/hooks/useExecutorDecisions';

import {

    ExecutionInlineAccordion,

    ExecutionInlineExecutorDecisionActions,

    type ExecutionInlineStep,

} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';

import {

    isExecutorHubRowSuperseded,

    isExecutorRowRejectedAndFinal,

    listEvictionProcedureHubRowsForMatch,

} from '@/app/utils/executorSeizureDecisionQueue';

import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';

import { summarizeExecutorHubRequestLifecycle } from '@/app/utils/executorRequestLifecycle';

import {

    completeSpecificDeliveryConversionApproval,

    isSpecificDeliveryConversionCycleComplete,

    isSpecificDeliveryConversionDecisionRow,

    parseSpecificDeliveryConversionPayload,

    sendInitialSpecificDeliveryConversionRequest,

    SPECIFIC_DELIVERY_CONVERSION_TITLE,

} from '@/app/utils/specificDeliveryConversionRequest';

import {

    getConversionEligibleSpecificDeliveryItems,

    readSpecificDeliveryItems,

    type SpecificDeliveryItem,

} from '@/app/utils/specificDeliveryItemsUtils';

import { FollowupProcedureCard } from './FollowupProcedureCard';



export interface SpecificDeliveryConversionRequestCardProps {

    decisionsStorageExecutionId: string;

    inlineActionGateKey: InlineActionGateKey | null;

    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;

    showToast: (

        message: string,

        type: 'success' | 'error' | 'warning' | 'info',

        opts?: { decisionsLink?: boolean }

    ) => void;

    specificDeliveryItemName?: string;

    specificDeliveryItems?: SpecificDeliveryItem[] | null;

    specificDeliveryFinancialized?: boolean;

    onConversionItemDeclared?: (itemId: string) => void;

}



function SpecificDeliveryItemChip({
    item,
    selected,
    onSelect,
}: {
    item: SpecificDeliveryItem;
    selected: boolean;
    onSelect: () => void;
}) {
    const isImmovable = item.nature === 'immovable';
    const Icon = isImmovable ? Building2 : Package;
    const name = String(item.name || '').trim() || '—';

    return (
        <button
            type="button"
            dir="rtl"
            role="radio"
            aria-checked={selected}
            onClick={onSelect}
            className={`inline-flex min-h-[44px] min-w-0 flex-1 basis-[calc(50%-0.25rem)] items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-center transition-all sm:basis-[calc(50%-0.375rem)] ${
                selected
                    ? 'border-[#E6C673]/55 bg-[#E6C673]/14 text-[#FFF8DC] shadow-[0_0_18px_-6px_rgba(230,198,115,0.55)]'
                    : 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/20 hover:bg-white/[0.06]'
            }`}
        >
            <Icon
                className={`h-4 w-4 shrink-0 ${selected ? 'text-[#E6C673]' : 'text-slate-400'}`}
                aria-hidden
            />
            <span className="min-w-0 truncate text-[12px] font-bold leading-tight">{name}</span>
            <span
                className={`shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-bold ${
                    isImmovable
                        ? 'bg-sky-500/15 text-sky-200/90'
                        : 'bg-emerald-500/15 text-emerald-200/90'
                }`}
            >
                {isImmovable ? 'عقار' : 'منقول'}
            </span>
        </button>
    );
}



export const SpecificDeliveryConversionRequestCard: React.FC<

    SpecificDeliveryConversionRequestCardProps

> = ({

    decisionsStorageExecutionId,

    inlineActionGateKey,

    setInlineActionGateKey,

    showToast,

    specificDeliveryItemName = '',

    specificDeliveryItems = null,

    specificDeliveryFinancialized = false,

    onConversionItemDeclared,

}) => {

    const { executionId, decisions } = useExecutorDecisions(decisionsStorageExecutionId);

    const [expanded, setExpanded] = React.useState(false);



    const allItems = React.useMemo(

        () =>

            Array.isArray(specificDeliveryItems) && specificDeliveryItems.length > 0

                ? specificDeliveryItems

                : readSpecificDeliveryItems({

                      specificDeliveryItemName,

                      specificDeliveryItems,

                      specificDeliveryFinancialized,

                  }),

        [specificDeliveryFinancialized, specificDeliveryItemName, specificDeliveryItems]

    );



    const conversionEligibleItems = React.useMemo(

        () => getConversionEligibleSpecificDeliveryItems(allItems),

        [allItems]

    );



    const [selectedItemId, setSelectedItemId] = React.useState('');



    React.useEffect(() => {

        if (conversionEligibleItems.length === 0) {

            setSelectedItemId('');

            return;

        }

        if (conversionEligibleItems.length === 1) {

            setSelectedItemId(conversionEligibleItems[0].id);

            return;

        }

        setSelectedItemId((prev) =>

            conversionEligibleItems.some((item) => item.id === prev) ? prev : ''

        );

    }, [conversionEligibleItems]);



    const selectedItem = React.useMemo(

        () => conversionEligibleItems.find((item) => item.id === selectedItemId) ?? null,

        [conversionEligibleItems, selectedItemId]

    );



    const decisionRows = React.useMemo(

        () => (Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : []),

        [decisions]

    );



    const lifecycleSummary = React.useMemo(

        () =>

            summarizeExecutorHubRequestLifecycle(

                listEvictionProcedureHubRowsForMatch(decisionRows, {

                    title: SPECIFIC_DELIVERY_CONVERSION_TITLE,

                })

            ),

        [decisionRows]

    );



    const latestRow = React.useMemo(() => {

        const hits = decisionRows

            .filter(

                (d) =>

                    isSpecificDeliveryConversionDecisionRow(d) && !isExecutorHubRowSuperseded(d)

            )

            .sort((a, b) => {

                const da = String(a?.resolvedAt ?? a?.date ?? '');

                const db = String(b?.resolvedAt ?? b?.date ?? '');

                return db.localeCompare(da, undefined, { numeric: true });

            });

        return hits[0] || null;

    }, [decisionRows]);



    const savedAt = String(latestRow?.specificDeliveryConversionSavedAt || '').trim();

    const workflowComplete = isSpecificDeliveryConversionCycleComplete(latestRow, {

        allDecisions: decisionRows,

    });

    const hasRequest = Boolean(latestRow?.id) && !workflowComplete;



    React.useEffect(() => {
        if (hasRequest) setExpanded(true);
        if (workflowComplete) setExpanded(false);
    }, [hasRequest, workflowComplete, latestRow?.id]);

    const autoCompletedDecisionRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        if (!latestRow?.id) return;
        const decisionId = String(latestRow.id || '').trim();
        if (!decisionId) return;
        const saved = Boolean(String(latestRow.specificDeliveryConversionSavedAt || '').trim());
        if (saved) {
            autoCompletedDecisionRef.current = decisionId;
            return;
        }
        if (isExecutorRowRejectedAndFinal(latestRow)) return;
        if (!isExecutorRowApprovedWorkflowActive(latestRow, decisionRows)) return;
        if (autoCompletedDecisionRef.current === decisionId) return;

        const payload = parseSpecificDeliveryConversionPayload(latestRow);
        const itemId = String(payload.itemId || selectedItem?.id || '').trim();
        if (!itemId) return;

        const itemName =
            payload.itemName ||
            allItems.find((item) => item.id === itemId)?.name ||
            selectedItem?.name ||
            '';

        const result = completeSpecificDeliveryConversionApproval({
            executionId: decisionsStorageExecutionId,
            decisionId,
            itemName,
        });
        if (!result.ok) return;

        autoCompletedDecisionRef.current = decisionId;
        onConversionItemDeclared?.(itemId);
    }, [
        allItems,
        decisionRows,
        decisionsStorageExecutionId,
        latestRow,
        onConversionItemDeclared,
        selectedItem?.id,
        selectedItem?.name,
    ]);

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

    const renderPanel = (row: Record<string, unknown> | null) => {

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

                            requestKind="special_followup"

                            disabled={rejected}

                            onOpenAppealCenter={() => openAppeals(decisionId)}

                        />

                    ) : null,

            },

        ];

        return (

            <div className="px-3 pb-3 pt-2" dir="rtl">

                <ExecutionInlineAccordion steps={steps} />

            </div>

        );

    };



    if (conversionEligibleItems.length === 0 && !hasRequest) return null;



    const itemPicker = (
        <div dir="rtl" className="space-y-2.5">
            <p className="text-[11px] font-bold text-slate-300 text-center leading-relaxed">
                {conversionEligibleItems.length > 1
                    ? 'اختر الشيء الذي هلك أو تعذّر تسليمه'
                    : 'الشيء محل طلب التحويل'}
            </p>
            <div
                role="radiogroup"
                aria-label="الشيء محل التحويل"
                className="flex flex-wrap gap-2 justify-center"
            >
                {conversionEligibleItems.map((item) => (
                    <SpecificDeliveryItemChip
                        key={item.id}
                        item={item}
                        selected={item.id === selectedItemId}
                        onSelect={() => setSelectedItemId(item.id)}
                    />
                ))}
            </div>
            {conversionEligibleItems.length > 1 && !selectedItemId ? (
                <p className="text-center text-[9px] font-bold text-amber-300/90">
                    اختر شيئاً واحداً ثم أرسل الطلب
                </p>
            ) : null}
        </div>
    );



    return (

        <FollowupProcedureCard

            label={SPECIFIC_DELIVERY_CONVERSION_TITLE}

            toneClass="border-amber-500/20 hover:border-amber-500/40"

            icon={

                <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-amber-500/10 shrink-0">

                    <AlertTriangle className="w-6 h-6 text-amber-300" />

                </span>

            }

            gateKey="specific_delivery_conversion_send"

            inlineActionGateKey={inlineActionGateKey}

            setInlineActionGateKey={setInlineActionGateKey}

            hasActiveRequest={hasRequest}

            expanded={expanded}

            onToggleExpanded={() => setExpanded((v) => !v)}

            workflowComplete={Boolean(savedAt)}

            lifecycleSummary={lifecycleSummary}

            resubmitWarningMessage="سبق إتمام دورة التحويل لهذا الشيء. يمكنك تقديم طلب جديد لشيء آخر أو التراجع."

            onConfirmSend={({ resubmit } = {}) => {

                if (!selectedItem) {

                    showToast(

                        conversionEligibleItems.length > 1

                            ? 'اختر الشيء المراد إعلان هلاكه'

                            : 'لا يوجد شيء مؤهل للتحويل',

                        'warning'

                    );

                    return;

                }

                const result = sendInitialSpecificDeliveryConversionRequest({

                    executionId: decisionsStorageExecutionId,

                    supersedeCompletedHub: resubmit,

                    itemId: selectedItem.id,

                    itemName: selectedItem.name,

                });

                if (!result.ok) {

                    const pending =

                        latestRow &&

                        (String(latestRow.executorOutcome ?? 'pending') === 'pending' ||

                            String(latestRow.executorOutcome ?? '') === '');

                    showToast(

                        pending

                            ? 'يوجد طلب قيد البت لدى المنفذ.'

                            : 'يوجد طلب سابق يجب إكماله أو إغلاق دورته قبل تقديم طلب جديد.',

                        'warning'

                    );

                    return;

                }

                showToast('تم إرسال الطلب إلى مركز قرارات المنفذ.', 'success', {

                    decisionsLink: true,

                });

            }}

            sendGateContent={itemPicker}

            sendGateConfirmDisabled={
                conversionEligibleItems.length > 1 && !selectedItemId
            }

            panelBody={renderPanel(latestRow)}

        />

    );

};


