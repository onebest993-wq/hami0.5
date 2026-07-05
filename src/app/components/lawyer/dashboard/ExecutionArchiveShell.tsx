import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';

type ExecutionArchiveShellProps = {
    onClose: () => void;
    children: React.ReactNode;
};

/** غلاف فوري لمخزن التنفيذ — z-220 فوق hub المعاملات */
export function ExecutionArchiveShell({ onClose, children }: ExecutionArchiveShellProps): React.ReactElement {
    useBodyScrollLock(true);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            onClose();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[220] bg-[#0B1021] font-['Tajawal','Cairo',sans-serif] flex flex-col"
            data-testid="execution-archive-shell"
            role="dialog"
            aria-modal="true"
            aria-label="مخزن الأضابير التنفيذية"
        >
            <div className="shrink-0 border-b border-white/10 bg-[#0B1021]">
                <div className="px-4 sm:px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 flex items-center justify-between gap-3">
                    <div className="text-right min-w-0">
                        <h2 className="text-white font-extrabold text-lg sm:text-xl">مخزن الأضابير التنفيذية</h2>
                        <p className="text-white/40 text-xs mt-0.5">إضابير التنفيذ · سلة المهملات · الأرشيف</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all touch-manipulation"
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
        </div>
    );
}

export function ExecutionArchiveTabLoading(): React.ReactElement {
    return (
        <div className="h-full flex flex-col items-center justify-center gap-4 px-6" aria-busy="true">
            <div className="w-full max-w-[520px] space-y-3" aria-hidden>
                {Array.from({ length: 4 }).map((_, index) => (
                    <div
                        key={index}
                        className="h-16 rounded-xl border border-white/10 bg-white/[0.04] animate-pulse"
                    />
                ))}
            </div>
            <p className="text-[#E6C673]/70 text-sm font-bold animate-pulse">جاري تحميل مخزن التنفيذ...</p>
        </div>
    );
}
