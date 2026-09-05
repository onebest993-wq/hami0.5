import React, { useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { CalendarDays } from '@/app/components/ui/icons/CalendarDays';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { X } from '@/app/components/ui/icons/X';
import {
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_OVERLAY_HEADER,
    EXEC_OVERLAY_PHONE_BACKDROP,
    EXEC_OVERLAY_PHONE_SHEET,
    EXEC_OVERLAY_PRIMARY_BTN,
    EXEC_OVERLAY_TITLE,
    execModalKeyboardPadStyle,
} from '../executionModalMobileShell';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import type { TimelineEvent } from '@/app/types/execution';
import { ntm } from './notesTasksModalUi';

export interface ExecutionAppointmentModalProps {
    showAppointmentModal: boolean;
    onCloseAppointmentModal: () => void;
    setEditingAppointmentId: Dispatch<SetStateAction<string | null>>;
    setAppointmentPurpose: Dispatch<SetStateAction<string>>;
    setAppointmentDateOnly: Dispatch<SetStateAction<string>>;
    setAppointmentTimeOptional: Dispatch<SetStateAction<string>>;
    editingAppointmentId: string | null;
    appointmentPurpose: string;
    appointmentDateOnly: string;
    handleSaveAppointment: () => void;
    timelineEvents: TimelineEvent[];
    todayYmd: string;
    moveTimelineEventToTrash: (ev: TimelineEvent) => void;
}

function ymdOfAppointment(ev: TimelineEvent): string {
    const raw = String(ev?.date || '').trim();
    const m = /^\d{4}-\d{2}-\d{2}/.exec(raw);
    return m ? m[0] : '';
}

function titleOfAppointment(ev: TimelineEvent): string {
    const t = String(ev?.title || '').trim();
    return t.replace(/^📅\s*/, '').trim() || 'موعد';
}

function AppointmentRecords({
    timelineEvents,
    todayYmd,
    setEditingAppointmentId,
    setAppointmentPurpose,
    setAppointmentDateOnly,
    setAppointmentTimeOptional,
    moveTimelineEventToTrash,
}: Pick<
    ExecutionAppointmentModalProps,
    | 'timelineEvents'
    | 'todayYmd'
    | 'setEditingAppointmentId'
    | 'setAppointmentPurpose'
    | 'setAppointmentDateOnly'
    | 'setAppointmentTimeOptional'
    | 'moveTimelineEventToTrash'
>) {
    const { active, ended } = useMemo(() => {
        const appts = (timelineEvents || []).filter(
            (ev) => String(ev.type || '') === 'appointment' && !Boolean(ev.trashedAt),
        );
        return {
            active: appts.filter((ev) => {
                const y = ymdOfAppointment(ev);
                return y && y >= todayYmd;
            }),
            ended: appts.filter((ev) => {
                const y = ymdOfAppointment(ev);
                return y && y < todayYmd;
            }),
        };
    }, [timelineEvents, todayYmd]);

    const renderList = (items: TimelineEvent[], allowEdit: boolean) => (
        <div className="max-h-44 space-y-1.5 overflow-y-auto overscroll-contain pb-1">
            {items.slice(0, 50).map((ev) => {
                const y = ymdOfAppointment(ev) || '—';
                return (
                    <div
                        key={String(ev.id)}
                        className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] px-2.5 py-2"
                        dir="rtl"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="break-words text-xs font-bold text-white">
                                {titleOfAppointment(ev)}
                            </p>
                            <p className="mt-0.5 font-mono text-[10px] tabular-nums text-slate-400">{y}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            {allowEdit ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingAppointmentId(String(ev.id));
                                        setAppointmentPurpose(titleOfAppointment(ev));
                                        setAppointmentDateOnly(ymdOfAppointment(ev));
                                        setAppointmentTimeOptional('');
                                    }}
                                    className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10"
                                    title="تعديل الموعد"
                                >
                                    <Pencil size={13} />
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={() => moveTimelineEventToTrash(ev)}
                                className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-lg text-rose-300 transition hover:bg-rose-950/40"
                                title="حذف الموعد"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderAccordion = (
        label: string,
        emptyLabel: string,
        items: TimelineEvent[],
        allowEdit: boolean,
        defaultOpen: boolean,
    ) => (
        <details className="group border-t border-white/[0.08]" open={defaultOpen}>
            <summary className="flex min-h-[44px] cursor-pointer touch-manipulation list-none items-center justify-between gap-2 select-none [&::-webkit-details-marker]:hidden">
                <span className="text-xs font-bold text-slate-200">{label}</span>
                <span className="flex items-center gap-2">
                    <span className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-300">
                        {items.length}
                    </span>
                    <ChevronDown
                        size={14}
                        className="text-slate-400 transition-transform group-open:rotate-180"
                        aria-hidden
                    />
                </span>
            </summary>
            {items.length ? (
                renderList(items, allowEdit)
            ) : (
                <div className="flex flex-col items-center justify-center gap-1 py-4 text-center">
                    <CalendarDays size={18} className="text-slate-600" aria-hidden />
                    <p className="text-[10px] text-slate-500">{emptyLabel}</p>
                </div>
            )}
        </details>
    );

    return (
        <div className="mt-3" dir="rtl">
            {renderAccordion('سجل المواعيد النشطة', 'لا توجد مواعيد نشطة', active, true, active.length > 0)}
            {renderAccordion('سجل المواعيد المنتهية', 'لا توجد مواعيد منتهية', ended, false, false)}
        </div>
    );
}

export const ExecutionAppointmentModal: React.FC<ExecutionAppointmentModalProps> = ({
    showAppointmentModal,
    onCloseAppointmentModal,
    setEditingAppointmentId,
    setAppointmentPurpose,
    setAppointmentDateOnly,
    setAppointmentTimeOptional,
    editingAppointmentId,
    appointmentPurpose,
    appointmentDateOnly,
    handleSaveAppointment,
    timelineEvents,
    todayYmd,
    moveTimelineEventToTrash,
}) => {
    const closeAppointmentModal = useCallback(() => {
        onCloseAppointmentModal();
        setEditingAppointmentId(null);
        setAppointmentPurpose('');
        setAppointmentDateOnly('');
        setAppointmentTimeOptional('');
    }, [
        onCloseAppointmentModal,
        setAppointmentDateOnly,
        setAppointmentPurpose,
        setAppointmentTimeOptional,
        setEditingAppointmentId,
    ]);

    const keyboardInset = useMobileKeyboardInset(showAppointmentModal, true);
    useBodyScrollLock(showAppointmentModal);

    if (!showAppointmentModal) return null;

    return (
        <div
            className={`${EXEC_OVERLAY_PHONE_BACKDROP} z-[60]`}
            style={execModalKeyboardPadStyle(keyboardInset)}
            onClick={(e) => {
                if (e.target === e.currentTarget) closeAppointmentModal();
            }}
        >
            <div
                className={EXEC_OVERLAY_PHONE_SHEET}
                dir="rtl"
                data-testid="execution-appointment-modal"
            >
                <div className={EXEC_OVERLAY_HEADER}>
                    <h3 className={EXEC_OVERLAY_TITLE}>
                        {editingAppointmentId ? 'تعديل موعد' : 'إضافة موعد'}
                    </h3>
                    <button
                        type="button"
                        onClick={closeAppointmentModal}
                        className={EXEC_MODAL_CLOSE_BTN_CLASS}
                        aria-label="إغلاق"
                    >
                        <X size={22} />
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
                    <div className="space-y-3">
                        <div>
                            <label className={ntm.label}>الغرض من الموعد</label>
                            <input
                                type="text"
                                value={appointmentPurpose}
                                onChange={(e) => setAppointmentPurpose(e.target.value)}
                                placeholder="مثال: جلسة متابعة"
                                className={`${ntm.field} min-h-[44px] touch-manipulation`}
                            />
                        </div>
                        <div>
                            <label className={ntm.label}>
                                التاريخ <span className="text-rose-400">*</span>
                            </label>
                            <input
                                type="date"
                                value={appointmentDateOnly}
                                onChange={(e) => setAppointmentDateOnly(e.target.value)}
                                className={`${ntm.field} min-h-[44px] touch-manipulation`}
                                style={{ direction: 'ltr', textAlign: 'right' }}
                            />
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleSaveAppointment}
                        className={`${EXEC_OVERLAY_PRIMARY_BTN} mt-3 w-full`}
                    >
                        {editingAppointmentId ? 'حفظ التعديل' : 'حفظ الموعد'}
                    </button>
                    <AppointmentRecords
                        timelineEvents={timelineEvents}
                        todayYmd={todayYmd}
                        setEditingAppointmentId={setEditingAppointmentId}
                        setAppointmentPurpose={setAppointmentPurpose}
                        setAppointmentDateOnly={setAppointmentDateOnly}
                        setAppointmentTimeOptional={setAppointmentTimeOptional}
                        moveTimelineEventToTrash={moveTimelineEventToTrash}
                    />
                </div>
            </div>
        </div>
    );
};
