import React from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { wardAwaitingRescheduleAfterMissed } from '@/app/utils/custodyWardDeliveryEngine';
import type { CustodyRemovalWardsModuleProps } from './custodyRemovalWardsModuleTypes';
import { useCustodyRemovalWardsModule } from './useCustodyRemovalWardsModule';
import { WardDeliveryRow } from './WardDeliveryRow';

export type { CustodyRemovalWardsModuleProps } from './custodyRemovalWardsModuleTypes';

export const CustodyRemovalWardsModule: React.FC<CustodyRemovalWardsModuleProps> = (props) => {
    const {
        wards,
        timelineEvents,
        todayYmd,
        moduleExpanded,
        setModuleExpanded,
        expandedKey,
        dateDraftByKey,
        showDatePickerByKey,
        deliveredCount,
        sectionConfirmDialog,
        saveAppointment,
        markEarlyReceipt,
        markReceived,
        markNotReceived,
        toggleWardRow,
        setDateDraft,
        openRescheduleCalendar,
    } = useCustodyRemovalWardsModule(props);

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
                className="flex w-full items-center justify-between border-b border-white/[0.06] px-2.5 py-2 min-h-[44px] hover:bg-white/[0.03] touch-manipulation transition-colors"
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
                            const awaitingReschedule = wardAwaitingRescheduleAfterMissed(
                                row,
                                timelineEvents,
                            );
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
                                    onToggle={() =>
                                        toggleWardRow(
                                            row.wardKey,
                                            hasAppointment,
                                            awaitingReschedule,
                                        )
                                    }
                                    onDateDraftChange={(value) => setDateDraft(row.wardKey, value)}
                                    onSaveAppointment={(ymd) =>
                                        saveAppointment(row.wardKey, row.name, ymd)
                                    }
                                    onEarlyReceipt={() => void markEarlyReceipt(row.wardKey, row.name)}
                                    onReceived={() => markReceived(row.wardKey, row.name)}
                                    onNotReceived={() => void markNotReceived(row.wardKey, row.name)}
                                    onOpenRescheduleCalendar={() =>
                                        openRescheduleCalendar(row.wardKey)
                                    }
                                />
                            );
                        })}
                    </div>
                </>
            ) : null}
            {sectionConfirmDialog}
        </div>
    );
};
