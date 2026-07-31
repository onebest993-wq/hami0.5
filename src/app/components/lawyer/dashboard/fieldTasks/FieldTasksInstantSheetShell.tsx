import React from 'react';
import { createPortal } from 'react-dom';
import { HomeXIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
import { CURTAIN_BTN_MANAGE, CURTAIN_SHEET } from '@/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme';

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
                <div className="shrink-0 flex flex-col items-center pt-2 pb-1 relative z-[1]">
                    <div className="w-10 h-1 rounded-full bg-[#A67C52]/35" />
                </div>

                <div className="shrink-0 flex items-center justify-between gap-3 px-3.5 pb-2 border-b border-[#A67C52]/14 relative z-[1]">
                    <h2 className="text-[#E8F5F0] font-extrabold text-sm truncate min-w-0">
                        مهام اليوم الميدانية
                    </h2>
                    <div
                        className="shrink-0 w-10 h-10 rounded-xl border border-[#A67C52]/22 bg-[#0A0F1C]/50 flex items-center justify-center text-[#E6C673]/70"
                        aria-hidden
                    >
                        <HomeXIcon size={18} />
                    </div>
                </div>

                <div
                    dir="rtl"
                    className="flex-1 overflow-y-auto overscroll-y-contain px-3.5 py-2.5 min-h-0 relative z-[1]"
                >
                    <div className="space-y-2 py-1" aria-hidden>
                        <div className="h-16 rounded-xl bg-[#0A0F1C]/45 animate-pulse" />
                        <div className="h-16 rounded-xl bg-[#0A0F1C]/40 animate-pulse" />
                    </div>
                </div>

                <div className="shrink-0 p-3.5 pt-2 border-t border-[#A67C52]/14 bg-[#0A0F1C]/25 relative z-[1]">
                    <div className={`${CURTAIN_BTN_MANAGE} opacity-50 pointer-events-none`} aria-hidden>
                        عرض وإدارة جميع المهام ←
                    </div>
                </div>
            </div>
        </>,
        document.body,
    );
}
