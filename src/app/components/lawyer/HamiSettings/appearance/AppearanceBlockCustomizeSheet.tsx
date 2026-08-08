import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, X } from '@/app/components/ui/lucideIcons';
import { useLawyerSettingsAppearance } from '@/app/context/LawyerSettingsContext';
import { SETTINGS_SHELL_CHROME } from '../settingsShellStyle';
import { AppearanceBlockCustomizePanel } from './AppearanceBlockCustomizePanel';
import type { AppearanceBlockCustomize } from './useAppearanceBlockCustomize';

function resolveSheetPortalRoot(): HTMLElement {
    return (
        document.querySelector('[data-testid="hami-settings-overlay-host"]') ??
        document.querySelector('[data-hami-settings-shell]')?.parentElement ??
        document.body
    );
}

export function AppearanceBlockCustomizeSheet({
    open,
    customize,
    themePrimary,
    onClose,
}: {
    open: boolean;
    customize: AppearanceBlockCustomize;
    themePrimary: string;
    onClose: () => void;
}) {
    const appearance = useLawyerSettingsAppearance();
    const shellDir = appearance.language === 'en' ? 'ltr' : 'rtl';

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [onClose, open]);

    if (!open || typeof document === 'undefined') {
        return null;
    }

    const portalRoot = resolveSheetPortalRoot();

    return createPortal(
        <div
            className="hami-appearance-block-customize-sheet flex flex-col font-sans"
            style={{ backgroundColor: SETTINGS_SHELL_CHROME }}
            data-testid="appearance-block-customize-sheet"
            dir={shellDir}
            role="dialog"
            aria-modal="true"
            aria-label="تخصيص قسم"
        >
            <header className="shrink-0 flex items-center gap-3 px-4 pt-[max(0.65rem,env(safe-area-inset-top))] pb-3 border-b border-white/[0.06]">
                <button
                    type="button"
                    onPointerDown={(event) => {
                        if (event.button !== 0) return;
                        event.preventDefault();
                        event.stopPropagation();
                        onClose();
                    }}
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                    }}
                    data-testid="appearance-block-customize-back"
                    aria-label="رجوع إلى إعدادات المنظر"
                    className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/75 hover:text-white touch-manipulation"
                >
                    <ChevronRight size={18} aria-hidden />
                </button>
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-white truncate">تخصيص قسم</h2>
                </div>
                <button
                    type="button"
                    onPointerDown={(event) => {
                        if (event.button !== 0) return;
                        event.preventDefault();
                        event.stopPropagation();
                        onClose();
                    }}
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                    }}
                    aria-label="إغلاق تخصيص القسم"
                    className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white/55 hover:text-white touch-manipulation"
                >
                    <X size={18} aria-hidden />
                </button>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                <AppearanceBlockCustomizePanel customize={customize} themePrimary={themePrimary} />
            </div>
        </div>,
        portalRoot,
    );
}
