import React from 'react';
import { HandHelping } from '@/app/components/ui/icons/HandHelping';
import { History } from '@/app/components/ui/icons/History';
import { X } from '@/app/components/ui/icons/X';
import { TASKS_GLASS_PANEL, TASKS_HEADER } from './tasksBoucleTheme';

export type TasksManagerHeaderProps = {
    showCompletedArchive: boolean;
    onOpenHelpInbox: () => void;
    onToggleCompletedArchive: () => void;
    onClose: () => void;
};

export function TasksManagerHeader({
    showCompletedArchive,
    onOpenHelpInbox,
    onToggleCompletedArchive,
    onClose,
}: TasksManagerHeaderProps) {
    return (
        <header className={`${TASKS_HEADER} relative z-[1]`}>
            <div className="min-w-0 text-right">
                <h1 className="text-[#F4F4F5] font-semibold text-lg truncate">أجندة المهام</h1>
                <p className="text-[11px] text-white/40 font-medium mt-0.5">الأسبوع الحالي</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 max-w-[62%]">
                <button
                    type="button"
                    onClick={onOpenHelpInbox}
                    data-testid="tasks-manager-help-inbox"
                    className={`flex items-center gap-1 min-h-[44px] px-2.5 py-2 rounded-xl border text-[11px] font-semibold transition-all touch-manipulation ${TASKS_GLASS_PANEL} border-white/[0.08] text-[#F4F4F5]/75 hover:border-[#E6C673]/22`}
                    aria-label="صندوق طلبات المساعدة"
                >
                    <HandHelping size={15} />
                    مساعدة
                </button>
                <button
                    type="button"
                    onClick={onToggleCompletedArchive}
                    data-testid="tasks-manager-completed-toggle"
                    className={`flex items-center gap-1 min-h-[44px] px-2.5 py-2 rounded-xl border text-[11px] font-semibold transition-all touch-manipulation ${
                        showCompletedArchive
                            ? 'border-[#E6C673]/35 bg-[#E6C673]/12 text-[#E6C673]'
                            : `${TASKS_GLASS_PANEL} border-white/[0.08] text-[#F4F4F5]/75 hover:border-[#E6C673]/22`
                    }`}
                >
                    <History size={15} />
                    {showCompletedArchive ? 'الأجندة' : 'المنتهية'}
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    data-testid="tasks-manager-close"
                    className="w-11 h-11 shrink-0 rounded-xl border border-white/[0.08] bg-transparent flex items-center justify-center text-[#F4F4F5]/75 hover:bg-white/[0.05] hover:text-[#F4F4F5] touch-manipulation"
                    aria-label="إغلاق"
                >
                    <X size={22} />
                </button>
            </div>
        </header>
    );
}
