import React, { useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';

type ArchiveHubInstantShellProps = {
    onBack: () => void;
    title: string;
    testId: string;
};

export function ArchiveHubInstantShell({
    onBack,
    title,
    testId,
}: ArchiveHubInstantShellProps): React.ReactElement {
    useBodyScrollLock(true);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            onBack();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [onBack]);

    return (
        <div
            className="fixed inset-0 bg-[#0B1021]/95 backdrop-blur-md flex flex-col font-['Tajawal','Cairo',sans-serif]"
            style={{ zIndex: 220 }}
            role="dialog"
            aria-modal="true"
            aria-busy="true"
            aria-label={title}
            data-testid={testId}
        >
            <div className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 border-b border-white/[0.06] flex items-center gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-sm border border-white/10 bg-white/[0.04] text-white/80"
                    aria-label="رجوع"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-white truncate">{title}</h2>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
                <div className="w-full max-w-[520px] space-y-3" aria-hidden>
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-16 rounded-sm border border-white/10 bg-white/[0.04] animate-pulse" />
                    ))}
                </div>
                <p className="text-[#E6C673]/70 text-sm font-bold animate-pulse">جاري فتح {title}...</p>
            </div>
        </div>
    );
}

export function ArchiveHubLoadError({
    message,
    onRetry,
    onBack,
}: {
    message: string;
    onRetry: () => void;
    onBack: () => void;
}) {
    useBodyScrollLock(true);

    return (
        <div
            className="fixed inset-0 bg-[#0B1021]/95 flex flex-col items-center justify-center gap-4 px-6 font-['Tajawal','Cairo',sans-serif]"
            style={{ zIndex: 220 }}
            role="alert"
            data-testid="archive-hub-load-error"
        >
            <p className="text-[#D8D4CE]/90 text-sm font-bold text-center">{message}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                    type="button"
                    onClick={onRetry}
                    className="min-h-[44px] rounded-sm border border-[#E6C673]/40 bg-[#152A32] px-4 py-2 text-sm font-bold text-[#E6C673]"
                >
                    إعادة المحاولة
                </button>
                <button
                    type="button"
                    onClick={onBack}
                    className="min-h-[44px] rounded-sm bg-[#1A3340] px-4 py-2 text-sm font-bold text-[#D8D4CE]"
                >
                    إغلاق
                </button>
            </div>
        </div>
    );
}
