import React from 'react';

import { Lock } from '@/app/components/ui/icons/Lock';

import type { TimelineEvent } from '@/app/types/execution';

import type { MaritalFurnitureItem, MaritalFurnitureDeliveryOutcome } from '@/app/types/maritalFurniture';

import {

    buildArabicScheduleLabel,

    isMaritalDeliveryInventoryStepComplete,

    isMaritalDeliveryScheduleStepComplete,

    isScheduleYmdReached,

    readFieldVisitScheduleYmd,

} from '@/app/utils/maritalFurnitureDeliveryWorkflow';

import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

import {

    dispatchDecisionsReload,

    patchExecutorDecisionRowReliable,

} from '@/app/utils/executorSeizureDecisionQueue';

import { resolveFollowupDecisionsStorageId } from '@/app/utils/openDecisionsModalFromFollowup';

import { runPersistMaritalFurnitureDeliverySchedule } from '@/app/utils/maritalFurnitureDeliveryPersistence';

import { MaritalFurnitureDeliveryInventoryForm } from '@/app/components/lawyer/execution/MaritalFurnitureDeliveryInventoryForm';

import { useExecutionSectionConfirm } from '@/app/components/lawyer/execution/useExecutionSectionConfirm';



export type MaritalFurnitureDeliveryAfterApproveFormProps = {

    row: Record<string, unknown>;

    decisionsStorageExecutionId: string;

    executionData?: Record<string, unknown> | null;

    maritalFurnitureItems: MaritalFurnitureItem[];

    disabled?: boolean;

    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;

    persistExecutionMerge?: (patch: Record<string, unknown>) => void;

    pushTimelineEvent?: (event: TimelineEvent) => void;

    nextTimelineId?: () => string;

    saveMaritalFurnitureDeliveryInventory?: (input: {

        decisionId: string;

        items: MaritalFurnitureItem[];

    }) => void;

    onItemDeliveryOutcome?: (input: {

        itemId: string;

        outcome: Exclude<MaritalFurnitureDeliveryOutcome, 'pending'>;

        decisionId: string;

    }) => void;

    finalizeBreakInventoryRequest?: (input: { decisionId: string }) => void;

    onSaved?: () => void;

};



export const MaritalFurnitureDeliveryAfterApproveForm: React.FC<

    MaritalFurnitureDeliveryAfterApproveFormProps

> = ({

    row,

    decisionsStorageExecutionId,

    executionData = null,

    maritalFurnitureItems,

    disabled = false,

    showToast,

    persistExecutionMerge,

    pushTimelineEvent,

    nextTimelineId,

    saveMaritalFurnitureDeliveryInventory,

    onItemDeliveryOutcome,

    finalizeBreakInventoryRequest,

    onSaved,

}) => {

    const [scheduleDraft, setScheduleDraft] = React.useState('');

    const [earlyDeliveryUnlocked, setEarlyDeliveryUnlocked] = React.useState(false);

    const { confirm, dialog: confirmDialog } = useExecutionSectionConfirm();



    const decisionId = String(row.id || '').trim();

    const scheduleComplete = isMaritalDeliveryScheduleStepComplete(row);

    const inventoryComplete = isMaritalDeliveryInventoryStepComplete(row);

    const scheduleYmd = readFieldVisitScheduleYmd(row);

    const scheduleLabel = String(

        (row as { executorScheduleLabel?: string }).executorScheduleLabel || ''

    ).trim();

    const scheduleReached =

        earlyDeliveryUnlocked || (scheduleYmd ? isScheduleYmdReached(scheduleYmd) : false);

    const ledgerSaved = Boolean(

        String((row as { breakInventoryFurnitureLedgerAt?: string }).breakInventoryFurnitureLedgerAt || '').trim()

    );



    const saveSchedule = () => {

        const ymd = scheduleDraft.trim();

        if (!decisionId) return;

        if (!ymd) {

            showToast('أدخل تاريخ موعد التسليم', 'warning');

            return;

        }

        const displayAr = buildArabicScheduleLabel(ymd);

        const label = `موعد التسليم: ${displayAr}`;

        const storageId =

            resolveFollowupDecisionsStorageId({

                storageExecutionId: decisionsStorageExecutionId,

                decisionId,

                decisionRow: row,

                executionData,

            }) || decisionsStorageExecutionId;

        const { ok } = patchExecutorDecisionRowReliable(storageId, decisionId, {

            executorScheduleYmd: ymd,

            executorScheduleLabel: label,

        });

        if (!ok) {

            showToast('تعذر تثبيت الموعد', 'error');

            return;

        }

        if (persistExecutionMerge) {

            runPersistMaritalFurnitureDeliverySchedule(

                { ymd, displayAr, scheduleLabel: label, decisionId },

                { persistExecutionMerge, pushTimelineEvent, nextTimelineId },

            );

        }

        dispatchDecisionsReload();

        onSaved?.();

        setScheduleDraft('');

        showToast('تم تثبيت موعد التسليم.', 'success');

    };



    if (inventoryComplete) {

        return scheduleLabel ? (

            <p className="text-[10px] text-emerald-300/90 text-right">{scheduleLabel}</p>

        ) : null;

    }



    if (!scheduleComplete) {

        return (

            <div className="space-y-2">

                <p className="text-[10px] text-slate-400 text-right">حدّد موعد الخروج الميداني للتسليم</p>

                <input

                    type="date"

                    min={getLocalTodayYmd()}

                    value={scheduleDraft}

                    onChange={(e) => setScheduleDraft(e.target.value)}

                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100"

                    style={{ direction: 'ltr', textAlign: 'right' }}

                />

                <button

                    type="button"

                    disabled={disabled}

                    onClick={saveSchedule}

                    className="w-full rounded-xl bg-gradient-to-l from-[#E6C673] to-amber-600 py-2.5 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40"

                >

                    تأكيد موعد التسليم

                </button>

            </div>

        );

    }



    const canUseInventory =

        onItemDeliveryOutcome || saveMaritalFurnitureDeliveryInventory;



    if (!canUseInventory) {

        return (

            <p className="text-[10px] text-amber-300/90 text-right">

                تم تثبيت الموعد — أكمل الجرد من مركز القرارات.

            </p>

        );

    }



    return (

        <div className="space-y-2">

            {scheduleLabel ? (

                <p className="text-[10px] text-emerald-300/90 text-right">{scheduleLabel}</p>

            ) : null}

            {!scheduleReached && scheduleYmd ? (

                <p className="flex flex-row-reverse items-center gap-1.5 text-[10px] text-amber-300/90">

                    <Lock size={12} />

                    يُفتح الجرد في أو بعد {scheduleYmd}

                </p>

            ) : null}

            <MaritalFurnitureDeliveryInventoryForm

                items={maritalFurnitureItems}

                disabled={disabled}

                ledgerSaved={ledgerSaved}

                scheduleYmd={scheduleYmd}

                scheduleLocked={Boolean(scheduleYmd) && !scheduleReached}

                scheduleLabel={scheduleLabel || scheduleYmd}

                onRequestEarlyDelivery={() => {

                    void confirm('تسليم مبكر قبل موعد التسليم — هل أنت متأكد؟').then((accepted) => {

                        if (accepted) setEarlyDeliveryUnlocked(true);

                    });

                }}

                onItemDeliveryOutcome={

                    onItemDeliveryOutcome

                        ? (input) => onItemDeliveryOutcome({ ...input, decisionId })

                        : undefined

                }

                onSave={

                    saveMaritalFurnitureDeliveryInventory

                        ? (items) => saveMaritalFurnitureDeliveryInventory({ decisionId, items })

                        : undefined

                }

                onFinalize={() => finalizeBreakInventoryRequest?.({ decisionId })}

            />

            {confirmDialog}

        </div>

    );

};


