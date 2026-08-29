import React, { type ReactNode, type Ref } from 'react';
import { SETTINGS_SHELL_CHROME } from './settingsShellStyle';

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
                ref={panelRef}
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
