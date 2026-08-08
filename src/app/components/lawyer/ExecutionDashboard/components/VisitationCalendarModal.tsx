import React from 'react';
import { X } from '@/app/components/ui/lucideIcons';
import type { VisitationScheduleConfig, VisitationSession } from '@/app/types/visitationSchedule';
import { VisitationCalendarPanel } from './VisitationCalendarPanel';

export interface VisitationCalendarModalProps {
    open: boolean;
    onClose: () => void;
    config: VisitationScheduleConfig;
    sessions: VisitationSession[];
    todayYmd: string;
}

/** @deprecated يُفضّل فتح التقويم من VisitationScheduleModule — يُبقى للتوافق */
export const VisitationCalendarModal: React.FC<VisitationCalendarModalProps> = ({
    open,
    onClose,
    config,
    sessions,
    todayYmd,
}) => {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[240] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-[#E6C673]/25 bg-[#0B1120] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0B1120]/95 px-4 py-3 backdrop-blur-md">
                    <h3 className="text-[#E6C673] font-bold text-base">تقويم المواعيد</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:bg-white/10 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4">
                    <VisitationCalendarPanel config={config} sessions={sessions} todayYmd={todayYmd} />
                </div>
            </div>
        </div>
    );
};
