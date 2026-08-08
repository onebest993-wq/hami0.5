import React from 'react';

import { AlertTriangle, Building2, Package } from '@/app/components/ui/lucideIcons';

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

    dispatchDecisionsReload,

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

    const storageExecutionId = executionId || decisionsStorageExecutionId;

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



    const [selectedItemIds, setSelectedItemIds] = React.useState<Set<string>>(() => new Set());



    React.useEffect(() => {

        if (conversionEligibleItems.length === 0) {

            setSelectedItemIds(new Set());

            return;

        }

        setSelectedItemIds((prev) => {

            const next = new Set<string>();

            for (const id of prev) {

                if (conversionEligibleItems.some((item) => item.id === id)) next.add(id);

            }

            if (next.size === 0 && conversionEligibleItems.length === 1) {

                next.add(conversionEligibleItems[0]!.id);

            }

            return next;

        });

    }, [conversionEligibleItems]);



    const toggleSelectedItem = React.useCallback((itemId: string) => {

        setSelectedItemIds((prev) => {

            const next = new Set(prev);

            if (next.has(itemId)) next.delete(itemId);

            else next.add(itemId);

            return next;

        });

    }, []);



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



    const conversionRows = React.useMemo(() => {
        return decisionRows
            .filter(
                (d) =>
                    isSpecificDeliveryConversionDecisionRow(d) && !isExecutorHubRowSuperseded(d),
            )
            .sort((a, b) => {
                const da = String(a?.resolvedAt ?? a?.date ?? '');
                const db = String(b?.resolvedAt ?? b?.date ?? '');
                return db.localeCompare(da, undefined, { numeric: true });
            });
    }, [decisionRows]);

    const latestRow = React.useMemo(() => {
        const active = conversionRows.find(
            (row) =>
                !isSpecificDeliveryConversionCycleComplete(row, { allDecisions: decisionRows }) &&
                !isExecutorRowRejectedAndFinal(row),
        );
        return active ?? conversionRows[0] ?? null;
    }, [conversionRows, decisionRows]);



    const savedAt = String(latestRow?.specificDeliveryConversionSavedAt || '').trim();

    const rowWorkflowComplete = isSpecificDeliveryConversionCycleComplete(latestRow, {
        allDecisions: decisionRows,
    });

    const hasRequest =
        Boolean(latestRow?.id) &&
        !rowWorkflowComplete &&
        !isExecutorRowRejectedAndFinal(latestRow as Record<string, unknown>);

    const workflowComplete =
        conversionEligibleItems.length === 0 &&
        rowWorkflowComplete &&
        Boolean(latestRow?.id);



    React.useEffect(() => {
        if (hasRequest) setExpanded(true);
        if (workflowComplete) setExpanded(false);
    }, [hasRequest, workflowComplete, latestRow?.id]);

    const confirmDestructionAfterApproval = React.useCallback(() => {
        if (!latestRow?.id) return;
        const decisionId = String(latestRow.id || '').trim();
        if (!decisionId) return;
        if (!isExecutorRowApprovedWorkflowActive(latestRow, decisionRows)) {
            showToast('بانتظار موافقة المنفذ على الطلب', 'warning');
            return;
        }
        const payload = parseSpecificDeliveryConversionPayload(latestRow);
        const itemId = String(payload.itemId || '').trim();
        const itemName =
            payload.itemName ||
            allItems.find((item) => item.id === itemId)?.name ||
            '';
        if (!itemId) {
            showToast('تعذر تحديد الشيء المرتبط بالطلب', 'error');
            return;
        }
        const result = completeSpecificDeliveryConversionApproval({
            executionId: storageExecutionId,
            decisionId,
            itemName,
        });
        if (!result.ok) {
            showToast('تعذر تسجيل الهلاك — تحقق من قرار المنفذ.', 'error');
            return;
        }
        onConversionItemDeclared?.(itemId);
        dispatchDecisionsReload();
        setExpanded(false);
        showToast('تم تسجيل الهلاك — يُستكمل تقدير القيمة عبر انتداب الخبير.', 'success', {
            decisionsLink: true,
        });
    }, [
        allItems,
        decisionRows,
        latestRow,
        onConversionItemDeclared,
        showToast,
        storageExecutionId,
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

    };



    if (conversionEligibleItems.length === 0 && !hasRequest) return null;



    const itemPicker = (
        <div dir="rtl" className="space-y-2.5">
            <p className="text-[11px] font-bold text-slate-300 text-center leading-relaxed">
                {conversionEligibleItems.length > 1
                    ? 'اختر الشيء أو الأشياء التي هلكت أو تعذّر تسليمها'
                    : 'الشيء محل طلب التحويل'}
            </p>
            <div
                role="group"
                aria-label="الأشياء محل التحويل"
                className="flex flex-wrap gap-2 justify-center"
            >
                {conversionEligibleItems.map((item) => (
                    <SpecificDeliveryItemChip
                        key={item.id}
                        item={item}
                        selected={selectedItemIds.has(item.id)}
                        onSelect={() => toggleSelectedItem(item.id)}
                    />
                ))}
            </div>
            {conversionEligibleItems.length > 1 && selectedItemIds.size === 0 ? (
                <p className="text-center text-[9px] font-bold text-amber-300/90">
                    اختر شيئاً واحداً أو أكثر ثم أرسل الطلب
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

            workflowComplete={workflowComplete}

            lifecycleSummary={lifecycleSummary}

            resubmitWarningMessage="سبق إتمام دورة التحويل لهذا الشيء. يمكنك تقديم طلب جديد لشيء آخر أو التراجع."

            onConfirmSend={({ resubmit } = {}) => {

                let selectedItems = conversionEligibleItems.filter((item) =>
                    selectedItemIds.has(item.id),
                );

                if (resubmit && selectedItems.length === 0 && latestRow) {
                    const payload = parseSpecificDeliveryConversionPayload(latestRow);
                    const itemId = String(payload.itemId || '').trim();
                    const fromAll = allItems.find((item) => item.id === itemId);
                    if (fromAll) selectedItems = [fromAll];
                }

                if (selectedItems.length === 0) {

                    showToast(

                        conversionEligibleItems.length > 1

                            ? 'اختر الشيء أو الأشياء المراد إعلان هلاكها'

                            : resubmit

                              ? 'لا يوجد شيء مؤهل لإعادة الطلب'

                              : 'لا يوجد شيء مؤهل للتحويل',

                        'warning',

                    );

                    return;

                }

                let sent = 0;

                for (const item of selectedItems) {

                    const result = sendInitialSpecificDeliveryConversionRequest({

                        executionId: storageExecutionId,

                        supersedeCompletedHub: resubmit,

                        itemId: item.id,

                        itemName: item.name,

                    });

                    if (result.ok) sent += 1;

                }

                if (sent === 0) {

                    showToast('يوجد طلب قيد البت أو مكتمل لأحد الأشياء المحددة.', 'warning');

                    return;

                }

                dispatchDecisionsReload();

                setExpanded(true);

                setInlineActionGateKey(null);

                showToast(

                    sent > 1

                        ? `تم إرسال ${sent} طلبات إلى مركز قرارات المنفذ.`

                        : resubmit

                          ? 'تم تقديم طلب جديد إلى مركز قرارات المنفذ.'

                          : 'تم إرسال الطلب إلى مركز قرارات المنفذ.',

                    'success',

                    { decisionsLink: true },

                );

            }}

            sendGateContent={itemPicker}

            sendGateConfirmDisabled={selectedItemIds.size === 0}

            panelBody={renderPanel(latestRow)}

        />

    );

};


