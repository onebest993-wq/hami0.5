import React from 'react';
import { createPortal } from 'react-dom';
import { CURTAIN_SHEET } from '@/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme';

/** ستارة فورية أثناء تحميل الـ chunk — تظهر من الأسفل مباشرة */
export function FieldTasksInstantSheetShell(): React.ReactElement {
    if (typeof document === 'undefined') {
        return <></>;
    }

    return createPortal(
        <>
            <div
                className="fixed inset-0 bg-[#051410]/75 border-0 cursor-default"
                style={{ zIndex: 214 }}
                aria-hidden
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="مهام اليوم الميدانية"
                aria-busy="true"
                data-testid="field-tasks-sheet-loading"
                className={`${CURTAIN_SHEET} translate-y-0 pb-[max(0px,env(safe-area-inset-bottom))]`}
                style={{ zIndex: 215 }}
            >
                <div className="shrink-0 flex flex-col items-center pt-2.5 pb-1">
                    <div className="w-12 h-1 rounded-full bg-[#A67C52]/40" />
                </div>
                <div className="shrink-0 flex items-center justify-between gap-3 px-4 pb-3 border-b border-[#A67C52]/18">
                    <div className="h-9 w-40 rounded-lg bg-[#0c0c0e]/45 animate-pulse" />
                    <div className="h-11 w-11 rounded-xl bg-[#0c0c0e]/45 animate-pulse shrink-0" />
                </div>
                <div className="flex-1 px-4 py-6 space-y-3">
                    <div className="h-16 rounded-xl bg-[#0c0c0e]/45 animate-pulse" />
                    <div className="h-16 rounded-xl bg-[#0c0c0e]/45 animate-pulse" />
                </div>
            </div>
        </>,
        document.body,
    );
}
