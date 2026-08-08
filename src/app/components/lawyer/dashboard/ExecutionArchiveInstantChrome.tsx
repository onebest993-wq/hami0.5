import React, { memo } from 'react';
import { HomeXIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';

export { ExecutionArchiveTabLoading } from '@/app/components/lawyer/dashboard/ExecutionArchiveShell';

/**
 * قشرة مخزن التنفيذ — keep-alive: تبقى مركّبة مخفية بعد التسليح؛ الفتح = إظهار فوري بلا إعادة تركيب.
 */
export const ExecutionArchiveInstantChrome = memo(function ExecutionArchiveInstantChrome({
    open,
    onClose,
    children,
}: {
    open: boolean;
    onClose: () => void;
    children?: React.ReactNode;
}): React.ReactElement {
    return (
        <div
            className="fixed inset-0 bg-[#0B1021] font-['Tajawal','Cairo',sans-serif] flex flex-col"
            style={{
                zIndex: open ? 220 : -1,
                visibility: open ? 'visible' : 'hidden',
                pointerEvents: open ? 'auto' : 'none',
            }}
            data-testid="execution-archive-shell"
            role="dialog"
            aria-modal={open}
            aria-hidden={!open}
            aria-label="مخزن الأضابير التنفيذية"
        >
            <div className="shrink-0 border-b border-white/10 bg-[#0B1021]">
                <div className="px-4 sm:px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 flex items-center justify-between gap-3">
                    <div className="text-right min-w-0">
                        <h2 className="text-white font-extrabold text-lg sm:text-xl">
                            مخزن الأضابير التنفيذية
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-full bg-slate-800/60 hover:bg-slate-700/80 text-white/80 hover:text-white transition-all touch-manipulation"
                        aria-label="إغلاق"
                        tabIndex={open ? 0 : -1}
                    >
                        <HomeXIcon size={18} />
                    </button>
                </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden bg-[#0B1021]">{children}</div>
        </div>
    );
});
