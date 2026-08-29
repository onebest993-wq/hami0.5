import React from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays } from '@/app/components/ui/icons/CalendarDays';
import { Clock } from '@/app/components/ui/icons/Clock';
import { X } from '@/app/components/ui/icons/X';
import { EXEC_MODAL_BACKDROP_STRONG } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import { useExecutionOverlayDismiss } from '@/app/components/lawyer/ExecutionDashboard/useExecutionOverlayDismiss';
import { WORKSPACE_Z } from './visitationScheduleModuleConstants';
import type { WorkspaceTab } from './visitationScheduleModuleTypes';

export type VisitationWorkspaceSheetProps = {
    open: boolean;
    onClose: () => void;
    ready: boolean;
    activeTab: WorkspaceTab;
    onTabChange: (tab: WorkspaceTab) => void;
    children: React.ReactNode;
};

export function VisitationWorkspaceSheet({
    open,
    onClose,
    ready,
    activeTab,
    onTabChange,
    children,
}: VisitationWorkspaceSheetProps) {
    useExecutionOverlayDismiss(open, onClose);
    if (!open || typeof document === 'undefined') return null;

    const tabs: { id: WorkspaceTab; label: string; icon: React.ReactNode }[] = ready
        ? [
              { id: 'appointment', label: 'الموعد', icon: <Clock size={14} /> },
              { id: 'calendar', label: 'التقويم', icon: <CalendarDays size={14} /> },
          ]
        : [{ id: 'setup', label: 'إعداد الجدول', icon: <CalendarDays size={14} /> }];

    return createPortal(
        <div
            className={`fixed inset-0 flex flex-col ${EXEC_MODAL_BACKDROP_STRONG}`}
            style={{ zIndex: WORKSPACE_Z }}
            role="dialog"
            aria-modal="true"
            aria-label="جدول التنفيذ والمتابعة"
            data-testid="visitation-schedule-workspace"
            onClick={onClose}
        >
            <div
                className="mt-auto flex h-[min(96dvh,100%)] w-full max-w-lg flex-col self-center overflow-hidden rounded-t-3xl border border-[#E6C673]/25 bg-[#0B1120] shadow-lg sm:my-auto sm:h-[min(92dvh,820px)] sm:rounded-3xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#0A0F1C] px-3 py-3 flex-row-reverse">
                    <button
                        type="button"
                        data-testid="visitation-schedule-close"
                        onClick={onClose}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 touch-manipulation"
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                    <div className="min-w-0 flex-1 text-right">
                        <p className="text-sm font-bold text-[#E6C673]">جدول التنفيذ والمتابعة</p>
                        <p className="text-[10px] text-slate-500">الموعد · التوثيق · التقويم</p>
                    </div>
                </div>

                {tabs.length > 1 ? (
                    <div className="flex shrink-0 gap-2 border-b border-white/[0.06] bg-[#0A0F1C]/60 px-3 py-2 flex-row-reverse">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                data-testid={`visitation-tab-${tab.id}`}
                                onClick={() => onTabChange(tab.id)}
                                className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 text-[11px] font-bold transition-colors touch-manipulation ${
                                    activeTab === tab.id
                                        ? 'border-[#E6C673]/40 bg-[#E6C673]/12 text-[#E6C673]'
                                        : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                ) : null}

                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
                    {children}
                </div>
            </div>
        </div>,
        document.body,
    );
}
