import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import type { PersonalApplicableLaw } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import { PersonalStatusLawReferencePanel } from '@/app/components/lawyer/personal-status/PersonalStatusLawReferencePanel';
import { personalPearlHubTheme } from '@/app/components/lawyer/personal-status/personalStatusPearlTheme';

export function PersonalStatusLawReferencePortal({
    open,
    onClose,
    applicableLaw,
}: {
    open: boolean;
    onClose: () => void;
    applicableLaw: PersonalApplicableLaw | '' | undefined;
}) {
    const T = personalPearlHubTheme();

    useEffect(() => {
        if (!open || typeof document === 'undefined') return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open, onClose]);

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={`${T.overlay} flex flex-col`}
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className={`${T.shell} min-h-0`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="personal-law-reference-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={T.header}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-[#8A8780] hover:text-[#F7F4EE] hover:bg-[#F7F4EE]/[0.06] transition-colors"
                        aria-label="إغلاق"
                    >
                        <X size={18} aria-hidden />
                    </button>
                    <h2
                        id="personal-law-reference-title"
                        className={`flex-1 text-center text-sm font-bold ${T.accentText} px-2`}
                    >
                        المرجع القانوني
                    </h2>
                    <span className="w-9 shrink-0" aria-hidden />
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <PersonalStatusLawReferencePanel applicableLaw={applicableLaw} />
                </div>
            </div>
        </div>,
        document.body,
    );
}
