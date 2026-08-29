import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from '@/app/components/ui/icons/ChevronRight';
import { X } from '@/app/components/ui/icons/X';
import { useLawyerSettingsAppearance } from '@/app/context/LawyerSettingsContext';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { registerAppearanceCustomizeGuard } from '../settingsEscapeStack';
import { useSettingsOverlayKeyboard } from '../hooks/useSettingsOverlayKeyboard';
import { SettingsNestedSheetFrame } from '../SettingsNestedSheetFrame';
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
    const reduceMotion = useReduceMotion();
    const panelRef = useRef<HTMLDivElement>(null);
    const keyboardInset = useSettingsOverlayKeyboard(open, panelRef, reduceMotion);

    useEffect(() => {
        if (!open) {
            registerAppearanceCustomizeGuard(false);
            return;
        }
        registerAppearanceCustomizeGuard(true, onClose);
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            registerAppearanceCustomizeGuard(false);
        };
    }, [onClose, open]);

    if (!open || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <SettingsNestedSheetFrame
            testId="appearance-block-customize-sheet"
            extraRootClassName="hami-appearance-block-customize-sheet"
            dir={shellDir}
            label="تخصيص قسم"
            onClose={onClose}
            panelRef={panelRef}
        >
            <header className="hami-settings-sheet-header shrink-0 flex items-center gap-3 pb-3 border-b border-white/[0.06]">
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

            <div
                className="hami-settings-sheet-body flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain scrollbar-hide py-4"
                data-keyboard-inset={keyboardInset}
                style={{
                    paddingBottom: `calc(max(1.5rem, env(safe-area-inset-bottom, 0px)) + ${keyboardInset}px)`,
                }}
            >
                <AppearanceBlockCustomizePanel customize={customize} themePrimary={themePrimary} />
            </div>
        </SettingsNestedSheetFrame>,
        resolveSheetPortalRoot(),
    );
}
