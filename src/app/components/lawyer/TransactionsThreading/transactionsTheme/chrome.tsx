import React, { useCallback } from 'react';
import { ChevronRightIcon, PlusIcon } from './icons';
import {
    TX_DRAWER_FOOTER,
    TX_PAGE_SHELL,
    TX_TOUCH_ICON,
} from './tokens';

export function TxGlassPage({ children }: { children: React.ReactNode }) {
    return (
        <div dir="rtl" className={TX_PAGE_SHELL}>
            {children}
        </div>
    );
}

export function TxGlassHeader({ children }: { children: React.ReactNode }) {
    return (
        <header className="sticky top-0 z-40 shrink-0 border-b border-white/[0.06] bg-[#0A0F1C]">
            <div className="relative px-4 pt-2 pb-1.5 max-w-[520px] mx-auto">{children}</div>
        </header>
    );
}

export function TxHeaderRow({
    title,
    subtitle,
    onBack,
    trailing,
    backTestId,
}: {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    trailing?: React.ReactNode;
    backTestId?: string;
}) {
    return (
        <div className="relative flex items-start justify-between gap-3">
            {onBack ? (
                <button
                    type="button"
                    onClick={onBack}
                    data-testid={backTestId}
                    className={`${TX_TOUCH_ICON} rounded-xl text-[#F4F4F5] hover:bg-white/[0.06] transition-colors`}
                    aria-label="رجوع"
                >
                    <ChevronRightIcon className="w-5 h-5" />
                </button>
            ) : (
                <div className="w-11 shrink-0" />
            )}
            <div className="flex-1 min-w-0 text-center pt-0.5">
                <h1 className="text-[#F4F4F5] font-semibold text-[17px] leading-tight truncate">{title}</h1>
                {subtitle ? (
                    <p className="text-white/40 text-[12px] mt-0.5 truncate font-medium">{subtitle}</p>
                ) : null}
            </div>
            <div className="shrink-0 min-w-[44px] flex justify-end">{trailing ?? null}</div>
        </div>
    );
}

export function TxGlassPanel({
    children,
    className = '',
    hover = false,
}: {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
}) {
    return (
        <div
            className={`relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.035] ${
                hover ? 'hover:bg-white/[0.055] hover:border-white/12' : ''
            } ${className}`}
        >
            {children}
        </div>
    );
}

export function TxGlassFab({
    label,
    onClick,
    onPointerDown,
    extended,
    testId,
}: {
    label: string;
    onClick: () => void;
    onPointerDown?: () => void;
    extended?: boolean;
    testId?: string;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            data-testid={testId}
            onClick={onClick}
            onPointerDown={onPointerDown}
            style={{ touchAction: 'manipulation' }}
            className={`fixed z-[80] pointer-events-auto flex items-center justify-center gap-2 font-semibold text-sm text-[#E6C673] border border-[#E6C673]/40 bg-[#0A0F1C] hover:bg-white/[0.04] transition-colors active:opacity-[0.88] bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-[max(1.25rem,env(safe-area-inset-left))] min-h-[44px] min-w-[44px] ${
                extended ? 'h-12 px-4 rounded-xl' : 'w-12 h-12 rounded-xl'
            }`}
        >
            <PlusIcon className="w-5 h-5" />
            {extended ? <span>{label}</span> : null}
        </button>
    );
}

export function TxGlassEmpty({ message, testId }: { message: string; testId?: string }) {
    return (
        <div data-testid={testId} role="status" aria-live="polite" className="mt-10 px-2 text-center">
            <p className="text-white/45 text-sm font-medium">{message}</p>
        </div>
    );
}

export function TxGlassDrawerFrame({
    title,
    subtitle,
    children,
    footer,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    const onBodyFocusCapture = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (!target.matches('input,textarea,select,[contenteditable="true"]')) return;
        window.requestAnimationFrame(() => {
            target.scrollIntoView({ block: 'center', behavior: 'auto' });
        });
    }, []);

    return (
        <div dir="rtl" className="relative text-right pt-1 pb-0 max-w-[520px] mx-auto w-full flex flex-col min-h-0 flex-1">
            <div className="shrink-0 py-2">
                <div className="w-9 h-[3px] bg-black/15 rounded-full mx-auto mb-2" aria-hidden />
                <h2 className="text-[#0A0F1C] font-semibold text-[15px]">{title}</h2>
                {subtitle ? <p className="text-black/40 text-[12px] mt-0.5 font-medium">{subtitle}</p> : null}
                <div className="mt-2 h-px bg-black/10" aria-hidden />
            </div>
            <div
                className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain space-y-3 ${
                    footer ? 'pb-2' : 'pb-[max(1rem,env(safe-area-inset-bottom,0px))]'
                }`}
                onFocusCapture={onBodyFocusCapture}
            >
                {children}
            </div>
            {footer ? <div className={TX_DRAWER_FOOTER}>{footer}</div> : null}
        </div>
    );
}

export function TxFieldLabel({
    children,
    htmlFor,
}: {
    children: React.ReactNode;
    htmlFor?: string;
}) {
    return (
        <label htmlFor={htmlFor} className="block text-[11px] font-bold text-black/45 mb-1.5">
            {children}
        </label>
    );
}

/** شريط أقسام المعاملة — صف مسطح بلا صندوق زجاجي متداخل */
export function TxGlassTabsList({ children }: { children: React.ReactNode }) {
    return (
        <div className="w-full" data-testid="transactions-stage-rail">
            {children}
        </div>
    );
}
