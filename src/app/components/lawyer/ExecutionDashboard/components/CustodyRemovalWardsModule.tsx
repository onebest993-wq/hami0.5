import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Dispatch, SetStateAction } from 'react';

import { Check, ChevronDown, CalendarClock, X } from '@/app/components/ui/lucideIcons';

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

    wardAwaitingRescheduleAfterMissed,

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

            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/10 ${STATUS_DOT[status]}`}

            aria-hidden

        />

    );

}



type WardRowProps = {

    row: CustodyWardDeliveryRecord;

    todayYmd: string;

    isExpanded: boolean;

    dateDraft: string;

    showDatePicker: boolean;

  onToggle: () => void;

    onDateDraftChange: (value: string) => void;

    onSaveAppointment: (ymd: string) => void;

    onEarlyReceipt: () => void;

    onReceived: () => void;

    onNotReceived: () => void;

    onOpenRescheduleCalendar: () => void;

    awaitingReschedule: boolean;

};



function WardDeliveryRow({

    row,

    todayYmd,

    isExpanded,

    dateDraft,

    showDatePicker,

    onToggle,

    onDateDraftChange,

    onSaveAppointment,

    onEarlyReceipt,

    onReceived,

    onNotReceived,

    onOpenRescheduleCalendar,

    awaitingReschedule,

}: WardRowProps) {

    const closed = wardDeliveryIsClosed(row.status);

    const hasAppointment = Boolean(row.appointmentYmd);

    const effectiveDate = String(dateDraft || row.appointmentYmd || '').trim();

    const appointmentDue = hasAppointment

        ? isCustodyAppointmentDue(row.appointmentYmd!, todayYmd)

        : false;

    const showEarly = hasAppointment && !appointmentDue;

    const showDueActions = hasAppointment && appointmentDue;

    const appointmentLabel = hasAppointment

        ? formatCustodyAppointmentLabelAr(row.appointmentYmd!)

        : '';



    const showChangeAppointmentButton =

        !showDatePicker &&

        (awaitingReschedule || (hasAppointment && !appointmentDue));

    const changeAppointmentLabel = awaitingReschedule

        ? 'تحديد موعد آخر للتسليم'

        : 'تغيير الموعد';



    if (closed) {

        return (

            <div className="flex items-center gap-2 px-2.5 py-2 min-h-[44px]">

                <WardDot status={row.status} />

                <p className="min-w-0 flex-1 truncate text-[12px] font-bold text-slate-100">{row.name}</p>

                <span

                    className="shrink-0 rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-black text-emerald-100"

                >

                    تم التسليم

                </span>

                {appointmentLabel ? (

                    <span className="shrink-0 text-[9px] tabular-nums text-slate-500">{appointmentLabel}</span>

                ) : null}

            </div>

        );

    }



    return (

        <div>

            <button

                type="button"

                onClick={onToggle}

                className="flex w-full items-center gap-2 px-2.5 py-2 text-right min-h-[44px] hover:bg-white/[0.04] active:bg-white/[0.06] touch-manipulation transition-colors"

                aria-expanded={isExpanded}

            >

                <WardDot status={row.status} />

                <div className="min-w-0 flex-1 text-right">

                    <p className="truncate text-[12px] font-bold text-slate-100">{row.name}</p>

                    {hasAppointment ? (

                        <p className="truncate text-[10px] font-semibold text-amber-200/85">

                            موعد التسليم: {appointmentLabel}

                        </p>

                    ) : awaitingReschedule ? (

                        <p className="truncate text-[10px] font-bold text-rose-200/85 animate-pulse">

                            حدّد موعد تسليم جديد

                        </p>

                    ) : (
                        <p className="truncate text-[10px] font-bold text-[#E6C673]/80 animate-pulse">

                            اضغط لتحديد موعد التسليم

                        </p>

                    )}

                </div>

                <ChevronDown

                    size={16}

                    className={`shrink-0 text-[#E6C673]/70 transition-transform duration-200 ${

                        isExpanded ? 'rotate-180' : ''

                    } ${!isExpanded && !hasAppointment ? 'motion-safe:animate-bounce' : ''}`}

                    aria-hidden

                />

            </button>



            {isExpanded ? (

                <div className="space-y-1.5 border-t border-white/[0.05] px-2.5 py-2" data-exec-interactive>

                    {showChangeAppointmentButton ? (

                        <button

                            type="button"

                            onClick={onOpenRescheduleCalendar}

                            className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[11px] font-black touch-manipulation transition-colors ${

                                awaitingReschedule

                                    ? 'border-[#E6C673]/30 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/16 motion-safe:animate-pulse'

                                    : 'border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/16'

                            }`}

                        >

                            <CalendarClock size={14} className="shrink-0" aria-hidden />

                            {changeAppointmentLabel}

                        </button>

                    ) : null}



                    {showDatePicker && !showDueActions ? (

                        <div className="flex items-center gap-1">

                            <input

                                type="date"

                                value={effectiveDate}

                                min={todayYmd}

                                onChange={(e) => onDateDraftChange(e.target.value)}

                                className="h-10 min-w-0 flex-1 rounded-lg border border-white/12 bg-[#0A0F1C] px-2 text-[11px] text-slate-100 [color-scheme:dark] touch-manipulation"

                                style={{ direction: 'ltr', textAlign: 'right' }}

                            />

                            <button

                                type="button"

                                onClick={() => onSaveAppointment(effectiveDate)}

                                disabled={!effectiveDate}

                                className="h-10 shrink-0 rounded-lg bg-[#E6C673] px-3 text-[10px] font-black text-[#0A0F1C] touch-manipulation disabled:cursor-not-allowed disabled:bg-[#E6C673]/35 disabled:text-[#0A0F1C]/55"

                            >

                                حفظ الموعد

                            </button>

                        </div>

                    ) : null}



                    {showEarly ? (

                        <button

                            type="button"

                            onClick={onEarlyReceipt}

                            className="w-full rounded-lg border border-sky-500/25 py-2 text-[10px] font-bold text-sky-100 touch-manipulation min-h-[40px]"

                        >

                            استلام مبكر / خارج الدائرة

                        </button>

                    ) : null}



                    {showDueActions ? (

                        <div className="space-y-1">

                            <p className="text-[9px] font-bold text-slate-400 text-right">

                                موعد التسليم اليوم — سجّل النتيجة

                            </p>

                            <div className="flex gap-1">

                                <button

                                    type="button"

                                    onClick={onReceived}

                                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-500/35 py-2 text-[10px] font-bold text-emerald-100 touch-manipulation min-h-[40px]"

                                >

                                    <Check size={12} />

                                    تم الاستلام

                                </button>

                                <button

                                    type="button"

                                    onClick={onNotReceived}

                                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-500/30 py-2 text-[10px] font-bold text-rose-100 touch-manipulation min-h-[40px]"

                                >

                                    <X size={12} />

                                    لم يُستلم

                                </button>

                            </div>

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

    /** أكثر من 3 محضونين — الطي التلقائي لتخفيف طول الشاشة */
    const shouldAutoCollapseModule = wards.length > 3;

    const [moduleExpanded, setModuleExpanded] = useState(() => !shouldAutoCollapseModule);

    const prevWardCountRef = useRef(wards.length);

    useEffect(() => {
        const prev = prevWardCountRef.current;
        prevWardCountRef.current = wards.length;
        if (prev === 0 && wards.length > 3) {
            setModuleExpanded(false);
        }
    }, [wards.length]);

    const [expandedKey, setExpandedKey] = useState<string | null>(null);

    const [dateDraftByKey, setDateDraftByKey] = useState<Record<string, string>>({});

    const [showDatePickerByKey, setShowDatePickerByKey] = useState<Record<string, boolean>>({});

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

        let cancelled = false;

        const runBackfill = () => {

            if (cancelled) return;

            const ok = commitWardAction(first.ward, first.kind, { wards });

            if (ok) backfillSigRef.current = sig;

        };

        const ric = globalThis.requestIdleCallback;

        const cancelRic = globalThis.cancelIdleCallback;

        if (typeof ric === 'function') {

            const idleId = ric(runBackfill, { timeout: 1200 });

            return () => {

                cancelled = true;

                if (typeof cancelRic === 'function') cancelRic(idleId);

            };

        }

        const timeoutId = window.setTimeout(runBackfill, 0);

        return () => {

            cancelled = true;

            window.clearTimeout(timeoutId);

        };

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

            setShowDatePickerByKey((prev) => ({ ...prev, [wardKey]: false }));

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

            setShowDatePickerByKey((prev) => {

                const copy = { ...prev };

                delete copy[wardKey];

                return copy;

            });

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

            setShowDatePickerByKey((prev) => {

                const copy = { ...prev };

                delete copy[wardKey];

                return copy;

            });

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

            showToast('تم التسجيل — حدّد موعد تسليم جديد', 'warning');

            setExpandedKey(wardKey);

            setShowDatePickerByKey((prev) => ({ ...prev, [wardKey]: false }));

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

            <button

                type="button"

                onClick={() => setModuleExpanded((prev) => !prev)}

                className="flex w-full items-center justify-between border-b border-white/[0.06] px-2.5 py-2 min-h-[40px] hover:bg-white/[0.03] touch-manipulation transition-colors"

                aria-expanded={moduleExpanded}

            >

                <ChevronDown

                    size={16}

                    className={`shrink-0 text-[#E6C673]/75 transition-transform duration-200 ${

                        moduleExpanded ? 'rotate-180' : ''

                    }`}

                    aria-hidden

                />

                <p className="text-[10px] font-bold text-[#E6C673]/90">المحضونين</p>

                <span className="text-[9px] font-bold tabular-nums text-slate-500">

                    {deliveredCount}/{wards.length}

                </span>

            </button>



            {moduleExpanded ? (

                <>

            <p className="px-2.5 py-1 text-[9px] leading-relaxed text-slate-500 text-right">

                اضغط على اسم المحضون لتحديد موعد التسليم أو تسجيل النتيجة.

            </p>

            <div className="divide-y divide-white/[0.05]">

                {wards.map((row) => {

                    const awaitingReschedule = wardAwaitingRescheduleAfterMissed(row, timelineEvents);

                    const hasAppointment = Boolean(row.appointmentYmd);

                    const showDatePicker = Boolean(showDatePickerByKey[row.wardKey]);

                    return (

                        <WardDeliveryRow

                            key={row.wardKey}

                            row={row}

                            todayYmd={todayYmd}

                            isExpanded={expandedKey === row.wardKey}

                            dateDraft={dateDraftByKey[row.wardKey] ?? ''}

                            showDatePicker={showDatePicker}

                            awaitingReschedule={awaitingReschedule}

                            onToggle={() => {

                                setExpandedKey((prev) => {

                                    const next = prev === row.wardKey ? null : row.wardKey;

                                    if (next === row.wardKey && !hasAppointment && !awaitingReschedule) {

                                        setShowDatePickerByKey((p) => ({ ...p, [row.wardKey]: true }));

                                    } else if (next !== row.wardKey) {

                                        setShowDatePickerByKey((p) => {

                                            if (!p[row.wardKey]) return p;

                                            const copy = { ...p };

                                            delete copy[row.wardKey];

                                            return copy;

                                        });

                                    }

                                    return next;

                                });

                            }}

                            onDateDraftChange={(value) =>

                                setDateDraftByKey((prev) => ({ ...prev, [row.wardKey]: value }))

                            }

                            onSaveAppointment={(ymd) => saveAppointment(row.wardKey, row.name, ymd)}

                            onEarlyReceipt={() => markEarlyReceipt(row.wardKey, row.name)}

                            onReceived={() => markReceived(row.wardKey, row.name)}

                            onNotReceived={() => markNotReceived(row.wardKey, row.name)}

                            onOpenRescheduleCalendar={() =>

                                setShowDatePickerByKey((prev) => ({ ...prev, [row.wardKey]: true }))

                            }

                        />

                    );

                })}

            </div>

                </>

            ) : null}

        </div>

    );

};
