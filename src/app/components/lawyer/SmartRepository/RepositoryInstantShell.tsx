import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Warehouse } from 'lucide-react';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { REPO_HEADER, REPO_ICON_BTN, REPO_OVERLAY, REPO_PANEL } from './smartRepositoryTheme';

type RepositoryInstantShellProps = {
    onClose: () => void;
};

/** هيكل المستودع فوراً أثناء تحميل الـ chunk — زر الإغلاق يعمل مباشرة */
export function RepositoryInstantShell({ onClose }: RepositoryInstantShellProps): React.ReactElement | null {
    useBodyScrollLock(true);

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div
            className={`${REPO_OVERLAY} hami-repository-overlay-layer hami-repository-overlay-layer--visible hami-repository-overlay-layer--snap flex flex-col`}
            dir="rtl"
            data-testid="smart-repository-modal"
            data-repository-instant-shell="1"
            role="dialog"
            aria-modal="true"
            aria-label="المستودع الذكي"
            aria-busy="true"
        >
            <div className={`${REPO_PANEL} flex flex-col`}>
                <div className="pointer-events-none absolute inset-0 hami-repository-ambient" aria-hidden />
                <div className={REPO_HEADER}>
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={onClose}
                            data-testid="smart-repository-close"
                            className={REPO_ICON_BTN}
                            aria-label="إغلاق"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="flex items-center gap-2 min-w-0">
                            <Warehouse size={20} className="text-[#E6C673] shrink-0" />
                            <h2 className="font-bold text-lg text-[#F4F0E8] truncate">المستودع الذكي</h2>
                        </div>
                    </div>
                </div>

                <div className="hami-repository-controls shrink-0 px-5 py-3 border-b border-white/[0.06]">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-[3.5rem] rounded-xl bg-white/[0.04] animate-pulse" />
                        ))}
                    </div>
                    <div className="flex gap-2 mt-3 overflow-hidden">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-9 w-16 shrink-0 rounded-full bg-white/[0.04] animate-pulse" />
                        ))}
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden px-5 py-4 space-y-3">
                    <div className="h-28 rounded-2xl bg-white/[0.04] animate-pulse" />
                    <div className="h-28 rounded-2xl bg-white/[0.04] animate-pulse" />
                    <div className="h-28 rounded-2xl bg-white/[0.04] animate-pulse" />
                </div>
            </div>
        </div>,
        document.body,
    );
}
