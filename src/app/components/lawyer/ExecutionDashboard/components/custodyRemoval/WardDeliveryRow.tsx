import { Check } from '@/app/components/ui/icons/Check';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { CalendarClock } from '@/app/components/ui/icons/CalendarClock';
import { X } from '@/app/components/ui/icons/X';
import type { CustodyWardDeliveryRecord } from '@/app/types/custodyWardDelivery';
import {
    formatCustodyAppointmentLabelAr,
    isCustodyAppointmentDue,
    wardDeliveryIsClosed,
} from '@/app/utils/custodyWardDeliveryEngine';
import { WardDot } from './WardDot';

export type WardDeliveryRowProps = {
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

export function WardDeliveryRow({
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
}: WardDeliveryRowProps) {
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
                            className="w-full rounded-lg border border-sky-500/25 py-2 text-[10px] font-bold text-sky-100 touch-manipulation min-h-[44px]"
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
                                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-500/35 py-2 text-[10px] font-bold text-emerald-100 touch-manipulation min-h-[44px]"
                                >
                                    <Check size={12} />
                                    تم الاستلام
                                </button>
                                <button
                                    type="button"
                                    onClick={onNotReceived}
                                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-500/30 py-2 text-[10px] font-bold text-rose-100 touch-manipulation min-h-[44px]"
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
