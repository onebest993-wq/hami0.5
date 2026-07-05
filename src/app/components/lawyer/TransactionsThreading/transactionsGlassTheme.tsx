import React from 'react';
import { ChevronRight, Plus } from 'lucide-react';

/** Deep Petrol · Smoky Grey · Burnt Ochre — flat minimal, sharp geometry */
export const TX_PETROL_DEEP = '#061014';
export const TX_PETROL_BASE = '#0A171D';
export const TX_PETROL_MID = '#0E1F26';
export const TX_PETROL_SURFACE = '#152A32';
export const TX_PETROL_SURFACE_ALT = '#1A3340';
export const TX_PETROL_BORDER = '#2A4550';
export const TX_OCHRE = '#C4782F';
export const TX_OCHRE_BRIGHT = '#D49248';
export const TX_SMOKE = '#D8D4CE';

export const TX_RADIUS = 'rounded-sm';
export const TX_RADIUS_CHIP = 'rounded-[3px]';

/** هدف لمس أيقونة — 44×44 (Apple HIG / Material) */
export const TX_TOUCH_ICON =
    'inline-flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px] touch-manipulation';

/** هدف لمس رقاقة/فلتر — ارتفاع 44px */
export const TX_TOUCH_CHIP =
    'inline-flex items-center justify-center shrink-0 min-h-[44px] touch-manipulation';

export const GLASS_FIELD =
    'w-full h-11 px-3 rounded-sm border border-[#2A4550]/80 bg-[#152A32] text-[#D8D4CE] ' +
    'placeholder:text-[#8A8680]/70 outline-none focus:border-[#C4782F]/55 focus:ring-1 focus:ring-[#C4782F]/18 transition-colors';

export const GLASS_CHIP =
    `${TX_TOUCH_CHIP} px-3.5 rounded-[3px] text-[11px] font-bold border border-[#2A4550]/70 ` +
    'bg-[#152A32] text-[#B4B0AA] hover:bg-[#1A3340] hover:border-[#8A8680]/40 transition-colors';

export const GLASS_CHIP_ACTIVE =
    `${TX_TOUCH_CHIP} px-3.5 rounded-[3px] text-[11px] font-bold border border-[#C4782F]/55 ` +
    'bg-[#C4782F]/14 text-[#D8D4CE] shadow-[inset_0_0_0_1px_rgba(196,120,47,0.12)]';

/** فلاتر قائمة المعاملات — بدون transition لتبديل فوري */
export const TX_LIST_FILTER_CHIP =
    `${TX_TOUCH_CHIP} px-3.5 rounded-[3px] text-[11px] font-bold border border-[#2A4550]/70 ` +
    'bg-[#152A32] text-[#B4B0AA] hover:bg-[#1A3340] hover:border-[#8A8680]/40';

export const TX_LIST_FILTER_CHIP_ACTIVE =
    `${TX_TOUCH_CHIP} px-3.5 rounded-[3px] text-[11px] font-bold border border-[#C4782F]/55 ` +
    'bg-[#C4782F]/14 text-[#D8D4CE] shadow-[inset_0_0_0_1px_rgba(196,120,47,0.12)]';

export const GLASS_BTN =
    'w-full h-12 rounded-sm font-bold text-sm border border-[#9A6024]/60 ' +
    'bg-[#C4782F] text-[#061014] hover:bg-[#D49248] disabled:opacity-45 transition-all';

function TxPetrolDivider() {
    return (
        <div
            className="my-3 h-px bg-gradient-to-l from-transparent via-[#2A4550]/55 to-transparent"
            aria-hidden
        />
    );
}

export const TX_OVERLAY =
    'fixed inset-0 z-[200] bg-[#061014]/98 overflow-y-auto overscroll-y-contain touch-pan-y pointer-events-auto ' +
    'pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] ' +
    'pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]';

export const TX_PAGE_SHELL =
    'min-h-[100dvh] font-[\'Tajawal\',\'Cairo\',sans-serif] text-right relative overflow-x-hidden text-[#D8D4CE]';

const PETROL_BG_STYLE: React.CSSProperties = {
    backgroundImage: [
        'radial-gradient(ellipse 120% 80% at 8% 4%, rgba(26,51,64,0.45) 0%, transparent 55%)',
        'radial-gradient(ellipse 90% 70% at 92% 96%, rgba(14,31,38,0.55) 0%, transparent 50%)',
        'linear-gradient(148deg, #061014 0%, #0A171D 42%, #0E1F26 78%, #122830 100%)',
    ].join(', '),
};

export function TxGlassPage({ children }: { children: React.ReactNode }) {
    return (
        <div
            dir="rtl"
            className={TX_PAGE_SHELL}
            style={PETROL_BG_STYLE}
        >
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    background:
                        'linear-gradient(132deg, rgba(196,120,47,0.03) 0%, transparent 38%, transparent 62%, rgba(42,69,80,0.12) 100%)',
                }}
            />
            <div className="relative z-[1] min-h-[100dvh]">{children}</div>
        </div>
    );
}

export function TxGlassHeader({ children }: { children: React.ReactNode }) {
    return (
        <header className="sticky top-0 z-40 border-b border-[#2A4550]/80 bg-[#0A171D]/95 shadow-[0_2px_0_rgba(42,69,80,0.35)]">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C4782F]/45 to-transparent pointer-events-none" />
            <div className="relative px-5 pt-4 pb-4 max-w-[520px] mx-auto">{children}</div>
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
        <div className="relative flex items-start justify-between gap-3 pb-1">
            {onBack ? (
                <button
                    type="button"
                    onClick={onBack}
                    data-testid={backTestId}
                    className={`${TX_TOUCH_ICON} rounded-sm border border-[#2A4550] bg-[#152A32] text-[#D8D4CE] hover:bg-[#1A3340] hover:border-[#C4782F]/35 transition-all`}
                    aria-label="رجوع"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            ) : (
                <div className="w-11 shrink-0" />
            )}
            <div className="flex-1 min-w-0 text-center pt-0.5">
                <h1 className="text-[#D8D4CE] font-extrabold text-[17px] leading-tight truncate">{title}</h1>
                {subtitle ? (
                    <p className="text-[#8A8680] text-[12px] mt-1 truncate font-medium">{subtitle}</p>
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
            className={`relative overflow-hidden rounded-sm border border-[#2A4550]/90 bg-[#152A32] ${
                hover
                    ? 'transition-all duration-200 hover:border-[#C4782F]/35 hover:bg-[#1A3340]'
                    : ''
            } ${className}`}
        >
            <div
                className="absolute top-0 left-0 bottom-0 w-[2px] bg-[#C4782F]/40 pointer-events-none"
                aria-hidden
            />
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
            className={`fixed z-[80] pointer-events-auto flex items-center justify-center gap-2 font-extrabold text-sm text-[#061014] border border-[#9A6024]/70 bg-[#C4782F] hover:bg-[#D49248] transition-all active:scale-[0.97] bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-[max(1.25rem,env(safe-area-inset-left))] ${
                extended ? 'h-14 px-5 rounded-[3px]' : 'w-14 h-14 rounded-[3px]'
            }`}
        >
            <Plus className="w-5 h-5" />
            {extended ? <span>{label}</span> : null}
        </button>
    );
}

export function TxGlassEmpty({ message, testId }: { message: string; testId?: string }) {
    return (
        <div data-testid={testId}>
            <TxGlassPanel className="mt-8 px-6 py-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-sm border border-[#2A4550] bg-[#1A3340] flex items-center justify-center mb-3">
                <span className="text-[#C4782F]/70 text-lg">◈</span>
            </div>
            <p className="text-[#8A8680] text-sm font-medium">{message}</p>
        </TxGlassPanel>
        </div>
    );
}

export const TX_DRAWER_SHELL =
    'bg-[#0E1F26] border-t border-[#2A4550] rounded-t-sm px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-1 overflow-y-auto overflow-x-hidden max-h-[92vh] shadow-[0_-8px_32px_rgba(6,16,20,0.55)]';

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
    return (
        <div dir="rtl" className="relative text-right pt-1 pb-2 max-w-[520px] mx-auto w-full">
            <div
                className="absolute top-0 inset-x-8 h-[2px] bg-gradient-to-r from-transparent via-[#C4782F]/50 to-transparent pointer-events-none"
                aria-hidden
            />
            <div className="py-3">
                <div className="w-9 h-[3px] bg-[#2A4550] mx-auto mb-4" aria-hidden />
                <h2 className="text-[#D8D4CE] font-extrabold text-[15px]">{title}</h2>
                {subtitle ? <p className="text-[#8A8680] text-[12px] mt-1 font-medium">{subtitle}</p> : null}
                <TxPetrolDivider />
            </div>
            <div className="space-y-3">{children}</div>
            {footer ? <div className="mt-5">{footer}</div> : null}
        </div>
    );
}

export function TxFieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="block text-[11px] font-bold text-[#B4B0AA] mb-1.5">{children}</label>;
}

export function TxGlassTabsList({ children }: { children: React.ReactNode }) {
    return (
        <div className="w-full rounded-sm border border-[#2A4550]/80 bg-[#0A171D] p-1 flex gap-1">
            {children}
        </div>
    );
}

export const TX_TAB_TRIGGER =
    'flex-1 inline-flex items-center justify-center rounded-[3px] min-h-[44px] px-2 text-[11px] font-bold border border-transparent touch-manipulation ' +
    'data-[state=active]:text-[#D8D4CE] data-[state=active]:bg-[#1A3340] ' +
    'data-[state=active]:border-[#C4782F]/45 ' +
    'data-[state=inactive]:text-[#8A8680]';

export const TX_GOLD_BTN =
    'inline-flex items-center justify-center min-h-[44px] px-4 rounded-sm font-bold text-[11px] border border-[#2A4550] touch-manipulation ' +
    'bg-[#152A32] text-[#D8D4CE] hover:bg-[#1A3340] hover:border-[#C4782F]/40 transition-all';

export const TX_OCHRE_BTN =
    'inline-flex items-center justify-center min-h-[44px] px-4 rounded-sm font-bold text-[11px] border border-[#9A6024]/60 touch-manipulation ' +
    'bg-[#C4782F] text-[#061014] hover:bg-[#D49248] transition-all';

export const TX_ICON_BTN =
    `${TX_TOUCH_ICON} rounded-sm border border-[#2A4550] bg-[#152A32] text-[#B4B0AA] ` +
    'hover:bg-[#1A3340] hover:text-[#D8D4CE] hover:border-[#C4782F]/35 transition-all';

export const TX_DIALOG_SHELL =
    'bg-[#0E1F26] border border-[#2A4550] rounded-sm p-5 max-w-[calc(100vw-2rem)] text-[#D8D4CE]';

export const TX_DIALOG_BTN_CANCEL =
    'inline-flex items-center justify-center min-h-[44px] px-5 rounded-sm border border-[#2A4550] bg-[#152A32] text-[#B4B0AA] font-bold text-sm hover:bg-[#1A3340] transition-colors touch-manipulation';

export const TX_DIALOG_BTN_DANGER =
    'inline-flex items-center justify-center min-h-[44px] px-5 rounded-sm border border-[#C4782F]/35 bg-[#C4782F]/12 text-[#D49248] font-bold text-sm hover:bg-[#C4782F]/20 transition-colors touch-manipulation';

export const TX_DROPDOWN_CONTENT =
    'z-[225] bg-[#0E1F26] border border-[#2A4550] text-[#D8D4CE] rounded-sm p-1 shadow-[0_8px_24px_rgba(6,16,20,0.45)]';

export const TX_DROPDOWN_INSTANT =
    '!animate-none duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100';

export const TX_INNER_SURFACE =
    'rounded-sm bg-[#1A3340] border border-[#2A4550]/80';

export const TX_CARD_SURFACE =
    'rounded-sm bg-[#152A32] border border-[#2A4550]/90 px-4 py-3';

export const TX_ACCENT_SURFACE =
    'rounded-sm bg-[#C4782F]/10 border border-[#C4782F]/35';

export const TX_TEXT_PRIMARY = 'text-[#D8D4CE]';
export const TX_TEXT_SECONDARY = 'text-[#B4B0AA]';
export const TX_TEXT_MUTED = 'text-[#8A8680]';
export const TX_TEXT_OCHRE = 'text-[#D49248]';

export const TX_STATUS_ACTIVE = 'bg-[#C4782F]/14 text-[#D49248] border-[#C4782F]/45';
export const TX_STATUS_PAUSED = 'bg-[#1A3340] text-[#B4B0AA] border-[#2A4550]';
export const TX_STATUS_COMPLETED = 'bg-[#152A32] text-[#8A8680] border-[#2A4550]/80';

export const TX_DIALOG_TITLE = 'text-[#D8D4CE] text-base font-extrabold';
export const TX_DIALOG_DESC = 'text-[#8A8680] text-sm font-medium';

export const TX_DROPDOWN_FOCUS = 'cursor-default focus:bg-[#1A3340]';
