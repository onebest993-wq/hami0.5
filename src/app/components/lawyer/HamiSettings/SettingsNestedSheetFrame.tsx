import React, { useEffect, useRef, type ReactNode, type Ref } from 'react';
import { SETTINGS_SHELL_CHROME } from './settingsShellChrome';
import { isSmartDialogOpen } from '@/app/components/ui/smartDialogBus';

type SettingsNestedSheetFrameProps = {
    testId: string;
    dir: 'rtl' | 'ltr';
    label: string;
    onClose: () => void;
    panelRef?: Ref<HTMLDivElement>;
    extraRootClassName?: string;
    extraRootProps?: Record<string, string>;
    children: ReactNode;
};

const SHEET_FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function bindRef<T>(ref: Ref<T> | undefined, node: T | null): void {
    if (!ref) return;
    if (typeof ref === 'function') {
        ref(node);
        return;
    }
    (ref as React.MutableRefObject<T | null>).current = node;
}

/**
 * هاتف: ملء الشاشة (نفس الكروم الحالي).
 * لوح ≥768px: بطاقة متمركزة فوق تعتيم خفيف — عبر CSS لا عبر ألوان/خطوط جديدة.
 */
export function SettingsNestedSheetFrame({
    testId,
    dir,
    label,
    onClose,
    panelRef,
    extraRootClassName = '',
    extraRootProps,
    children,
}: SettingsNestedSheetFrameProps) {
    const innerPanelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const panel = innerPanelRef.current;
        if (!panel) return;
        const focusRaf = requestAnimationFrame(() => {
            if (isSmartDialogOpen()) return;
            if (panel.contains(document.activeElement)) return;
            const first = panel.querySelector<HTMLElement>(SHEET_FOCUSABLE_SELECTOR);
            first?.focus({ preventScroll: true });
        });
        return () => cancelAnimationFrame(focusRaf);
    }, []);

    return (
        <div
            className={`hami-settings-sheet-scrim ${extraRootClassName}`.trim()}
            data-testid={testId}
            dir={dir}
            onPointerDown={(event) => {
                if (event.button !== 0) return;
                if (event.target !== event.currentTarget) return;
                event.preventDefault();
                event.stopPropagation();
                onClose();
            }}
            {...extraRootProps}
        >
            <div
                ref={(node) => {
                    innerPanelRef.current = node;
                    bindRef(panelRef, node);
                }}
                role="dialog"
                aria-modal="true"
                aria-label={label}
                data-testid="hami-settings-sheet-panel"
                className="hami-settings-sheet-panel flex min-h-0 min-w-0 flex-col overflow-hidden overscroll-none font-sans"
                style={{ backgroundColor: SETTINGS_SHELL_CHROME }}
                onPointerDown={(event) => event.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}
