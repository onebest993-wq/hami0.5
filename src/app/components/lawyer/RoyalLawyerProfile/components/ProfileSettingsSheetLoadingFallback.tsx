import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';

type ProfileSettingsSheetLoadingFallbackProps = {
    onClose?: () => void;
};

/** skeleton مرئي أثناء تحميل chunk الاستوديو — feedback فوري للمس */
export function ProfileSettingsSheetLoadingFallback({
    onClose,
}: ProfileSettingsSheetLoadingFallbackProps) {
    useBodyScrollLock(true);

    useEffect(() => {
        if (!onClose) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            onClose();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onClose]);

    return createPortal(
        <div
            className="fixed inset-0 z-[120] flex flex-col justify-end"
            role="dialog"
            aria-busy="true"
            aria-label="استوديو الصفحة"
            data-testid="profile-settings-sheet-loading"
        >
            <button
                type="button"
                className="absolute inset-0 bg-[#010308]/72 backdrop-blur-[14px]"
                aria-label="إغلاق"
                onClick={onClose}
            />
            <div className="relative w-full max-h-[min(92dvh,720px)] rounded-t-[28px] border-t border-x border-[#E6C673]/14 bg-[#080D18]/96 overflow-hidden pb-[max(12px,env(safe-area-inset-bottom))]">
                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-4" aria-hidden />
                <div className="px-5 pb-3">
                    <div className="h-6 w-36 rounded-lg bg-white/[0.06] animate-pulse mx-auto" aria-hidden />
                </div>
                <div className="px-4 pb-4 flex gap-2 justify-center">
                    <div className="h-9 w-20 rounded-xl bg-white/[0.05] animate-pulse" aria-hidden />
                    <div className="h-9 w-20 rounded-xl bg-white/[0.05] animate-pulse" aria-hidden />
                    <div className="h-9 w-20 rounded-xl bg-white/[0.05] animate-pulse" aria-hidden />
                </div>
                <div className="px-4 pb-6 space-y-3">
                    <div className="h-14 rounded-2xl bg-white/[0.04] animate-pulse" aria-hidden />
                    <div className="h-14 rounded-2xl bg-white/[0.04] animate-pulse" aria-hidden />
                    <div className="h-14 rounded-2xl bg-white/[0.04] animate-pulse" aria-hidden />
                </div>
                <div className="px-4 pb-5 flex flex-col items-center gap-3">
                    <span className="text-[#E6C673]/50 text-xs font-bold animate-pulse">جاري فتح الاستوديو...</span>
                    {onClose ? (
                        <button
                            type="button"
                            onClick={onClose}
                            className="min-h-[44px] px-4 text-xs font-bold text-white/55 touch-manipulation"
                        >
                            إلغاء
                        </button>
                    ) : null}
                </div>
            </div>
        </div>,
        document.body,
    );
}
