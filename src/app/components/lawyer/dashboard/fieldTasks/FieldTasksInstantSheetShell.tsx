import React from 'react';
import { createPortal } from 'react-dom';
import { ClipboardList, X } from '@/app/components/ui/lucideIcons';
import { CURTAIN_BTN_MANAGE, CURTAIN_SHEET } from '@/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme';
import { FieldTasksSheetLoadingBody } from '@/app/components/lawyer/dashboard/fieldTasks/FieldTasksSheetLoadingBody';

/**
 * ستارة فورية أثناء تحميل chunk المحتوى — نفس هيكل الستارة الحقيقية
 * حتى يظهر الإطار من الأسفل في أول paint دون انتظار Suspense.
 */
export function FieldTasksInstantSheetShell(): React.ReactElement {
    if (typeof document === 'undefined') {
        return <></>;
    }

    return createPortal(
        <>
            <div
                className="fixed inset-0 bg-[#05060D]/75 border-0 cursor-default"
                style={{ zIndex: 214 }}
                aria-hidden
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="مهام اليوم الميدانية"
                aria-busy="true"
                data-testid="field-tasks-sheet-loading"
                className={`${CURTAIN_SHEET} pb-[max(0px,env(safe-area-inset-bottom))]`}
                style={{ zIndex: 215 }}
            >
                <div className="shrink-0 flex flex-col items-center pt-2.5 pb-1 relative z-[1]">
                    <div className="w-12 h-1 rounded-full bg-[#E6C673]/40 animate-pulse" />
                </div>

                <div className="shrink-0 flex items-center justify-between gap-3 px-4 pb-3 border-b border-[#E6C673]/18 relative z-[1]">
                    <div className="flex items-center gap-2 min-w-0">
                        <div
                            className="w-9 h-9 rounded-xl bg-[#12182B]/45 border border-[#E6C673]/25 flex items-center justify-center shrink-0"
                            aria-hidden
                        >
                            <ClipboardList size={18} className="text-[#C9A85C]/70" />
                        </div>
                        <div className="min-w-0 space-y-1.5">
                            <h2 className="text-[#F4F4F5] font-extrabold text-base truncate">
                                مهام اليوم الميدانية
                            </h2>
                            <div className="h-2 w-14 rounded bg-[#34D399]/20 animate-pulse" />
                        </div>
                    </div>
                    <div
                        className="shrink-0 w-11 h-11 rounded-xl border border-[#E6C673]/22 bg-[#12182B]/40 flex items-center justify-center text-[#F4F4F5]/50"
                        aria-hidden
                    >
                        <X size={20} />
                    </div>
                </div>

                <FieldTasksSheetLoadingBody />

                <div className="shrink-0 p-4 pt-2 border-t border-[#E6C673]/18 bg-[#12182B]/30 relative z-[1]">
                    <div className={`${CURTAIN_BTN_MANAGE} opacity-50 pointer-events-none`} aria-hidden>
                        عرض وإدارة جميع المهام ←
                    </div>
                </div>
            </div>
        </>,
        document.body,
    );
}
