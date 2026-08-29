import React, { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { CalendarDays } from '@/app/components/ui/icons/CalendarDays';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { X } from '@/app/components/ui/icons/X';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
    EXEC_MODAL_NOTES_SHELL_MAX,
    execModalKeyboardPadStyle,
} from '../executionModalMobileShell';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
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

    if (!showAppointmentModal) return null;

    return (
        <div
            className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            style={execModalKeyboardPadStyle(keyboardInset)}
            onClick={(e) => {
                if (e.target === e.currentTarget) closeAppointmentModal();
            }}
        >
            <div
                className={`w-[95%] md:w-[480px] overflow-y-auto overscroll-contain rounded-3xl border border-amber-500/30 bg-[#0A0F1C] p-5 md:p-6 shadow-md ${EXEC_MODAL_NOTES_SHELL_MAX}`}
                dir="rtl"
                data-testid="execution-appointment-modal"
            >
                <div
                    className={`mb-4 flex items-center justify-between ${EXEC_MODAL_HEADER_SAFE_TOP}`}
                >
                    <h3 className="text-xl font-bold text-amber-200">
                        {editingAppointmentId ? 'تعديل موعد' : 'إضافة موعد'}
                    </h3>
                    <button
                        type="button"
                        onClick={closeAppointmentModal}
                        className={EXEC_MODAL_CLOSE_BTN_CLASS}
                    >
                        <X size={24} />
                    </button>
                </div>
                <div className="space-y-3.5">
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
                {/* زر مضغوط بمقاس النموذج — لا full-width */}
                <button
                    type="button"
                    onClick={handleSaveAppointment}
                    className={`${ntm.btnPrimary} mt-4 min-h-[44px] touch-manipulation px-6 text-xs`}
                >
                    {editingAppointmentId ? 'حفظ التعديل' : 'حفظ الموعد'}
                </button>

                {(() => {
                    const today = todayYmd;
                    const appts = (timelineEvents || []).filter(
                        (ev) =>
                            String(ev.type || '') === 'appointment' && !Boolean(ev.trashedAt)
                    );
                    const active = appts.filter((ev) => {
                        const y = ymdOfAppointment(ev);
                        return y && y >= today;
                    });
                    const ended = appts.filter((ev) => {
                        const y = ymdOfAppointment(ev);
                        return y && y < today;
                    });

                    const renderEmpty = (label: string) => (
                        <div className="flex flex-col items-center justify-center gap-1.5 py-5 text-center">
                            <CalendarDays size={20} className="text-slate-600" aria-hidden />
                            <p className="text-[10px] text-slate-500">{label}</p>
                        </div>
                    );

                    const renderList = (items: TimelineEvent[], allowEdit: boolean) => (
                        <div className="space-y-2 max-h-44 overflow-y-auto overscroll-contain pb-2 pr-1">
                            {items.slice(0, 50).map((ev) => {
                                const y = ymdOfAppointment(ev) || '—';
                                return (
                                    <div
                                        key={String(ev.id)}
                                        className="rounded-xl border border-amber-500/12 bg-[#0A0F1C]/35 p-2.5"
                                        dir="rtl"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-white text-xs font-bold break-words">
                                                    {titleOfAppointment(ev)}
                                                </p>
                                                <p className="mt-1 text-[10px] text-slate-400 font-mono tabular-nums">
                                                    {y}
                                                </p>
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
                                                        className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-lg border border-amber-400/30 text-amber-100 transition hover:bg-amber-900/30"
                                                        title="تعديل الموعد"
                                                    >
                                                        <Pencil size={13} />
                                                    </button>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    onClick={() => moveTimelineEventToTrash(ev)}
                                                    className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-lg border border-rose-500/35 text-rose-300 transition hover:bg-rose-950/45"
                                                    title="حذف الموعد"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
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
                        <details className="group border-t border-slate-700/50" open={defaultOpen}>
                            <summary className="flex min-h-[44px] cursor-pointer touch-manipulation select-none list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                                <span className="text-xs font-black text-amber-100/90">{label}</span>
                                <span className="flex items-center gap-2">
                                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-100/80">
                                        {items.length}
                                    </span>
                                    <ChevronDown
                                        size={14}
                                        className="text-slate-400 transition-transform group-open:rotate-180"
                                        aria-hidden
                                    />
                                </span>
                            </summary>
                            {items.length ? renderList(items, allowEdit) : renderEmpty(emptyLabel)}
                        </details>
                    );

                    return (
                        <div className="mt-4" dir="rtl">
                            {renderAccordion(
                                'سجل المواعيد النشطة',
                                'لا توجد مواعيد نشطة',
                                active,
                                true,
                                active.length > 0,
                            )}
                            {renderAccordion(
                                'سجل المواعيد المنتهية',
                                'لا توجد مواعيد منتهية',
                                ended,
                                false,
                                false,
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};
