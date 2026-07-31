import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Dispatch, SetStateAction } from 'react';

import { Check, X } from 'lucide-react';

import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';

import type { CustodyWardDeliveryBundle, CustodyWardDeliveryRecord, CustodyWardDeliveryStatus } from '@/app/types/custodyWardDelivery';

import {

    isInabaSubFileId,

    stampInabaTimelineEventMetadata,

    stampParentTimelineEventMetadata,

} from '@/app/stores/executionDashboardStore';

import {

    buildCustodyWardTimelineBackfillSpecs,

    commitCustodyWardTimelineAction,

    type CustodyWardTimelineEventKind,

    enrichCustodyWardsFromTimeline,

    formatCustodyAppointmentLabelAr,

    isCustodyAppointmentDue,

    mergeCustodyWardRecords,

    patchCustodyWardRecord,

    readCustodyWardDeliveryBundle,

    restartCustodyWardBundleAfterMissedDelivery,

    wardDeliveryIsClosed,

} from '@/app/utils/custodyWardDeliveryEngine';



export interface CustodyRemovalWardsModuleProps {

    executionId?: string;

    parentDossierId?: string;

    activeSubFileId?: string | null;

    isInabaActive?: boolean;

    executionData: ExecutionFile | null | undefined;

    custodyWardNames: string[];

    timelineEvents: TimelineEvent[];

    todayYmd: string;

    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;

    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;

    nextTimelineId: () => string;

    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;

}



const STATUS_DOT: Record<CustodyWardDeliveryStatus, string> = {

    pending: 'bg-slate-500',

    scheduled: 'bg-amber-400',

    received_early: 'bg-sky-400',

    received: 'bg-emerald-400',

    not_received: 'bg-rose-400',

};



function WardDot({ status }: { status: CustodyWardDeliveryStatus }) {

    return (

        <span

            className={`inline-block h-2 w-2 shrink-0 rounded-full ring-2 ring-white/10 ${STATUS_DOT[status]}`}

            aria-hidden

        />

    );

}



type WardRowProps = {

    row: CustodyWardDeliveryRecord;

    todayYmd: string;

    isExpanded: boolean;

    dateDraft: string;

    onToggle: () => void;

    onDateDraftChange: (value: string) => void;

    onSaveAppointment: (ymd: string) => void;

    onEarlyReceipt: () => void;

    onReceived: () => void;

    onNotReceived: () => void;

};



function WardDeliveryRow({

    row,

    todayYmd,

    isExpanded,

    dateDraft,

    onToggle,

    onDateDraftChange,

    onSaveAppointment,

    onEarlyReceipt,

    onReceived,

    onNotReceived,

}: WardRowProps) {

    const closed = wardDeliveryIsClosed(row.status);

    const hasAppointment = Boolean(row.appointmentYmd);

    const effectiveDate = String(dateDraft || row.appointmentYmd || '').trim();

    const appointmentDue = hasAppointment

        ? isCustodyAppointmentDue(row.appointmentYmd!, todayYmd)

        : false;

    const showEarly = hasAppointment && !appointmentDue;

    const showDue = hasAppointment && appointmentDue;



    if (closed) {

        return (

            <div className="flex items-center gap-2 px-2.5 py-1.5 min-h-[36px]">

                <WardDot status={row.status} />

                <p className="min-w-0 flex-1 truncate text-[12px] font-bold text-slate-200">{row.name}</p>

                {row.appointmentYmd ? (

                    <span className="shrink-0 text-[10px] text-slate-500">

                        {formatCustodyAppointmentLabelAr(row.appointmentYmd)}

                    </span>

                ) : null}

            </div>

        );

    }



    return (

        <div>

            <button

                type="button"

                onClick={onToggle}

                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-right min-h-[40px] hover:bg-white/[0.03] touch-manipulation"

                aria-expanded={isExpanded}

            >

                <WardDot status={row.status} />

                <div className="min-w-0 flex-1 text-right">

                    <p className="truncate text-[12px] font-bold text-slate-100">{row.name}</p>

                    <p className="truncate text-[10px] text-slate-500">

                        {hasAppointment

                            ? formatCustodyAppointmentLabelAr(row.appointmentYmd!)

                            : 'بدون موعد'}

                    </p>

                </div>

            </button>



            {isExpanded ? (

                <div className="space-y-1.5 border-t border-white/[0.05] px-2.5 py-1.5" data-exec-interactive>

                    <div className="flex items-center gap-1">

                        <input

                            type="date"

                            value={effectiveDate}

                            min={todayYmd}

                            onChange={(e) => onDateDraftChange(e.target.value)}

                            className="h-9 min-w-0 flex-1 rounded-lg border border-white/12 bg-[#0A0F1C] px-2 text-[11px] text-slate-100 [color-scheme:dark] touch-manipulation"

                            style={{ direction: 'ltr', textAlign: 'right' }}

                        />

                        <button

                            type="button"

                            onClick={() => onSaveAppointment(effectiveDate)}

                            disabled={!effectiveDate}

                            className="h-9 shrink-0 rounded-lg bg-[#E6C673] px-2.5 text-[10px] font-black text-[#0A0F1C] touch-manipulation disabled:cursor-not-allowed disabled:bg-[#E6C673]/35 disabled:text-[#0A0F1C]/55"

                        >

                            حفظ

                        </button>

                    </div>



                    {showEarly ? (

                        <button

                            type="button"

                            onClick={onEarlyReceipt}

                            className="w-full rounded-lg border border-sky-500/25 py-1.5 text-[10px] font-bold text-sky-100 touch-manipulation"

                        >

                            استلام مبكر / خارج الدائرة

                        </button>

                    ) : null}



                    {showDue ? (

                        <div className="flex gap-1">

                            <button

                                type="button"

                                onClick={onReceived}

                                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-500/35 py-1.5 text-[10px] font-bold text-emerald-100 touch-manipulation"

                            >

                                <Check size={12} />

                                تم الاستلام

                            </button>

                            <button

                                type="button"

                                onClick={onNotReceived}

                                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-500/30 py-1.5 text-[10px] font-bold text-rose-100 touch-manipulation"

                            >

                                <X size={12} />

                                لم يُستلم

                            </button>

                        </div>

                    ) : null}

                </div>

            ) : null}

        </div>

    );

}



export const CustodyRemovalWardsModule: React.FC<CustodyRemovalWardsModuleProps> = ({

    executionId,

    parentDossierId,

    activeSubFileId,

    isInabaActive = false,

    executionData,

    custodyWardNames,

    timelineEvents,

    todayYmd,

    setTimelineEvents,

    persistExecutionMerge,

    nextTimelineId,

    showToast,

}) => {

    const serverBundle = useMemo(

        () => readCustodyWardDeliveryBundle(executionData as ExecutionFile | null | undefined),

        [executionData],

    );

    const [bundleOverride, setBundleOverride] = useState<CustodyWardDeliveryBundle | null>(null);

    useEffect(() => {

        if (!bundleOverride || !serverBundle) return;

        if (JSON.stringify(bundleOverride.wards) === JSON.stringify(serverBundle.wards)) {

            setBundleOverride(null);

        }

    }, [bundleOverride, serverBundle]);

    const effectiveBundle = bundleOverride ?? serverBundle;

    const wards = useMemo(() => {

        const merged = mergeCustodyWardRecords(custodyWardNames, effectiveBundle);

        return enrichCustodyWardsFromTimeline(merged, timelineEvents);

    }, [custodyWardNames, effectiveBundle, timelineEvents]);

    const [expandedKey, setExpandedKey] = useState<string | null>(null);

    const [dateDraftByKey, setDateDraftByKey] = useState<Record<string, string>>({});

    const timelineEventsRef = useRef(timelineEvents);

    timelineEventsRef.current = timelineEvents;



    const deliveredCount = useMemo(

        () => wards.filter((w) => wardDeliveryIsClosed(w.status)).length,

        [wards],

    );



    const stampTimelineEvent = useCallback(

        (event: TimelineEvent): TimelineEvent => {

            const subId = String(activeSubFileId || '').trim();

            const parentForStamp = String(parentDossierId || executionId || executionData?.id || '').trim();

            if (isInabaActive && subId && isInabaSubFileId(subId) && parentForStamp) {

                return stampInabaTimelineEventMetadata(event, subId, parentForStamp);

            }

            if (parentForStamp) {

                return stampParentTimelineEventMetadata(event, parentForStamp);

            }

            return event;

        },

        [activeSubFileId, executionData?.id, executionId, isInabaActive, parentDossierId],

    );



    const commitWardAction = useCallback(

        (

            ward: CustodyWardDeliveryRecord,

            kind: CustodyWardTimelineEventKind,

            bundlePatch: CustodyWardDeliveryBundle,

        ): boolean => {

            if (!executionData?.id) {

                showToast('تعذر الحفظ — بيانات الإضبارة غير جاهزة.', 'error');

                return false;

            }

            let persistPatch: Record<string, unknown> | null = null;

            setTimelineEvents((prev) => {

                const committed = commitCustodyWardTimelineAction({

                    ward,

                    kind,

                    bundle: bundlePatch,

                    prevTimelineEvents: prev,

                    nextTimelineId,

                    todayYmd,

                    stampEvent: stampTimelineEvent,

                });

                persistPatch = committed.persistPatch;

                return committed.nextTimelineEvents;

            });

            if (!persistPatch) return false;

            const persisted = persistExecutionMerge(persistPatch);

            if (persisted === false) {

                showToast('تعذر مزامنة السجل الزمني — أعد المحاولة.', 'error');

                return false;

            }

            setBundleOverride(bundlePatch);

            return true;

        },

        [

            executionData?.id,

            nextTimelineId,

            persistExecutionMerge,

            setTimelineEvents,

            showToast,

            stampTimelineEvent,

            todayYmd,

        ],

    );



    const backfillSigRef = useRef('');



    useEffect(() => {

        const specs = buildCustodyWardTimelineBackfillSpecs(wards, timelineEvents);

        if (specs.length === 0) {

            backfillSigRef.current = '';

            return;

        }

        const sig = specs.map((s) => `${s.ward.wardKey}:${s.kind}`).join('|');

        if (backfillSigRef.current === sig) return;

        const first = specs[0];

        if (!first) return;

        const ok = commitWardAction(first.ward, first.kind, { wards });

        if (ok) backfillSigRef.current = sig;

    }, [commitWardAction, timelineEvents, wards]);



    const saveAppointment = useCallback(

        (wardKey: string, _name: string, ymdInput: string) => {

            const ymd = String(ymdInput || dateDraftByKey[wardKey] || '').trim();

            if (!ymd) {

                showToast('اختر تاريخ موعد التسليم', 'warning');

                return;

            }

            if (ymd < todayYmd) {

                showToast('لا يمكن اختيار تاريخ موعد في الماضي', 'warning');

                return;

            }

            const next = patchCustodyWardRecord(effectiveBundle, custodyWardNames, wardKey, {

                appointmentYmd: ymd,

                status: 'scheduled',

            });

            const ward = next.wards.find((w) => w.wardKey === wardKey);

            if (!ward) return;

            if (!commitWardAction(ward, 'appointment', next)) return;

            showToast('تم حفظ موعد التسليم', 'success');

            if (!isCustodyAppointmentDue(ymd, todayYmd)) {

                setExpandedKey(null);

            }

            setDateDraftByKey((prev) => {

                const copy = { ...prev };

                delete copy[wardKey];

                return copy;

            });

        },

        [effectiveBundle, commitWardAction, custodyWardNames, dateDraftByKey, showToast, todayYmd],

    );



    const markEarlyReceipt = useCallback(

        (wardKey: string, name: string) => {

            if (

                !window.confirm(

                    `تأكيد استلام المحضون «${name}» خارج الدائرة أو قبل الموعد المحدد؟`,

                )

            ) {

                return;

            }

            const ts = new Date().toISOString();

            const next = patchCustodyWardRecord(effectiveBundle, custodyWardNames, wardKey, {

                status: 'received_early',

                statusAt: ts,

            });

            const ward = next.wards.find((w) => w.wardKey === wardKey);

            if (!ward) return;

            if (!commitWardAction(ward, 'received_early', next)) return;

            showToast('تم تسجيل الاستلام المبكر', 'success');

            setExpandedKey(null);

        },

        [effectiveBundle, commitWardAction, custodyWardNames, showToast],

    );



    const markReceived = useCallback(

        (wardKey: string, _name: string) => {

            const ts = new Date().toISOString();

            const next = patchCustodyWardRecord(effectiveBundle, custodyWardNames, wardKey, {

                status: 'received',

                statusAt: ts,

            });

            const ward = next.wards.find((w) => w.wardKey === wardKey);

            if (!ward) return;

            if (!commitWardAction(ward, 'received', next)) return;

            showToast('تم تسجيل الاستلام', 'success');

            setExpandedKey(null);

        },

        [effectiveBundle, commitWardAction, custodyWardNames, showToast],

    );



    const markNotReceived = useCallback(

        (wardKey: string, name: string) => {

            if (!window.confirm(`تأكيد عدم استلام المحضون «${name}» في الموعد؟`)) return;

            const ts = new Date().toISOString();

            const missed = patchCustodyWardRecord(effectiveBundle, custodyWardNames, wardKey, {

                status: 'not_received',

                statusAt: ts,

            });

            const missedWard = missed.wards.find((w) => w.wardKey === wardKey);

            const restarted = restartCustodyWardBundleAfterMissedDelivery(missed, wardKey);

            if (missedWard) {

                if (!commitWardAction(missedWard, 'not_received', restarted)) return;

            }

            showToast('تم التسجيل — يمكنك تحديد موعد جديد', 'warning');

            setExpandedKey(wardKey);

            setDateDraftByKey((prev) => ({ ...prev, [wardKey]: '' }));

        },

        [effectiveBundle, commitWardAction, custodyWardNames, showToast],

    );



    if (wards.length === 0) {

        return (

            <div

                className="mx-3 mt-2 rounded-xl border border-[#E6C673]/15 bg-[#0B1120]/40 px-3 py-2 text-right"

                dir="rtl"

            >

                <p className="text-[11px] font-bold text-[#E6C673]/85">المحضونين</p>

                <p className="mt-0.5 text-[10px] text-slate-500">لم تُسجَّل أسماء في الإضبارة.</p>

            </div>

        );

    }



    return (

        <div className="mx-3 mt-2 rounded-xl border border-[#E6C673]/18 bg-[#0B1120]/38 ring-1 ring-white/[0.04]" dir="rtl">

            <div className="flex items-center justify-between border-b border-white/[0.06] px-2.5 py-1.5">

                <p className="text-[10px] font-bold text-[#E6C673]/90">المحضونين</p>

                <span className="text-[9px] font-bold tabular-nums text-slate-500">

                    {deliveredCount}/{wards.length}

                </span>

            </div>

            <div className="divide-y divide-white/[0.05]">

                {wards.map((row) => (

                    <WardDeliveryRow

                        key={row.wardKey}

                        row={row}

                        todayYmd={todayYmd}

                        isExpanded={expandedKey === row.wardKey}

                        dateDraft={dateDraftByKey[row.wardKey] ?? ''}

                        onToggle={() => {

                            setExpandedKey((prev) => (prev === row.wardKey ? null : row.wardKey));

                        }}

                        onDateDraftChange={(value) =>

                            setDateDraftByKey((prev) => ({ ...prev, [row.wardKey]: value }))

                        }

                        onSaveAppointment={(ymd) => saveAppointment(row.wardKey, row.name, ymd)}

                        onEarlyReceipt={() => markEarlyReceipt(row.wardKey, row.name)}

                        onReceived={() => markReceived(row.wardKey, row.name)}

                        onNotReceived={() => markNotReceived(row.wardKey, row.name)}

                    />

                ))}

            </div>

        </div>

    );

};


