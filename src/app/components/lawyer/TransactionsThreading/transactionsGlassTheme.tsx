import React from 'react';

type TxSvgIconProps = {
    className?: string;
};

function TxSvgIcon({ className, children }: TxSvgIconProps & { children: React.ReactNode }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            {children}
        </svg>
    );
}

function ChevronRightIcon({ className }: TxSvgIconProps) {
    return (
        <TxSvgIcon className={className}>
            <path d="m9 18 6-6-6-6" />
        </TxSvgIcon>
    );
}

function PlusIcon({ className }: TxSvgIconProps) {
    return (
        <TxSvgIcon className={className}>
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </TxSvgIcon>
    );
}

/** Deep Petrol · Smoky Grey · Soft Light Ochre — أخف من الأوخرا الأصلي بلا سيج */
export const TX_PETROL_DEEP = '#061014';
export const TX_PETROL_BASE = '#0A171D';
export const TX_PETROL_MID = '#0E1F26';
export const TX_PETROL_SURFACE = '#152A32';
export const TX_PETROL_SURFACE_ALT = '#1A3340';
export const TX_PETROL_BORDER = '#2A4550';
/** أوخرا خفيف (أصل #C4782F بدرجة ألطف) */
export const TX_OCHRE = '#D4A56A';
export const TX_OCHRE_BRIGHT = '#E0B87A';
export const TX_OCHRE_BORDER = '#A67C45';
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
    'w-full h-11 px-3 rounded-sm border-2 border-[#3A5A68] bg-[#152A32] text-[#D8D4CE] ' +
    'placeholder:text-[#8A8680] outline-none focus:border-[#D4A56A] focus:ring-1 focus:ring-[#D4A56A]/25 transition-colors';

export const GLASS_CHIP =
    `${TX_TOUCH_CHIP} px-3.5 rounded-[3px] text-[11px] font-bold border-2 border-[#3A5A68] ` +
    'bg-[#1A3340] text-[#D8D4CE] hover:bg-[#243F4C] hover:border-[#8A8680] transition-colors';

export const GLASS_CHIP_ACTIVE =
    `${TX_TOUCH_CHIP} px-3.5 rounded-[3px] text-[11px] font-bold border-2 border-[#A67C45] ` +
    'bg-[#D4A56A]/22 text-[#E8D4B0]';

/** فلاتر قائمة المعاملات — إطار واضح وألوان صلبة */
export const TX_LIST_FILTER_CHIP =
    `${TX_TOUCH_CHIP} px-3.5 rounded-[3px] text-[11px] font-bold border-2 border-[#3A5A68] ` +
    'bg-[#1A3340] text-[#D8D4CE] hover:bg-[#243F4C] hover:border-[#8A8680]';

export const TX_LIST_FILTER_CHIP_ACTIVE =
    `${TX_TOUCH_CHIP} px-3.5 rounded-[3px] text-[11px] font-bold border-2 border-[#A67C45] ` +
    'bg-[#D4A56A]/22 text-[#E8D4B0]';

export const GLASS_BTN =
    'w-full h-12 rounded-sm font-bold text-sm border-2 border-[#A67C45] ' +
    'bg-[#D4A56A] text-[#1A1208] hover:bg-[#E0B87A] ' +
    'disabled:bg-[#6B4A28] disabled:text-[#C4B8A8] disabled:border-[#5A3E24] disabled:opacity-100 transition-all';

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
                        'linear-gradient(132deg, rgba(212,165,106,0.03) 0%, transparent 38%, transparent 62%, rgba(42,69,80,0.12) 100%)',
                }}
            />
            <div className="relative z-[1] min-h-[100dvh]">{children}</div>
        </div>
    );
}

export function TxGlassHeader({ children }: { children: React.ReactNode }) {
    return (
        <header className="sticky top-0 z-40 border-b border-[#2A4550]/80 bg-[#0A171D]/95 shadow-[0_2px_0_rgba(42,69,80,0.35)]">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4A56A]/45 to-transparent pointer-events-none" />
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
                    className={`${TX_TOUCH_ICON} rounded-sm border border-[#2A4550] bg-[#152A32] text-[#D8D4CE] hover:bg-[#1A3340] hover:border-[#D4A56A]/35 transition-all`}
                    aria-label="رجوع"
                >
                    <ChevronRightIcon className="w-5 h-5" />
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
            className={`relative overflow-hidden rounded-sm border border-[#2A4550] bg-[#152A32] ${
                hover
                    ? 'transition-all duration-200 hover:border-[#D4A56A] hover:bg-[#1A3340]'
                    : ''
            } ${className}`}
        >
            <div
                className="absolute top-0 left-0 bottom-0 w-[3px] bg-[#D4A56A] pointer-events-none"
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
            className={`fixed z-[80] pointer-events-auto flex items-center justify-center gap-2 font-extrabold text-sm text-[#1A1208] border-2 border-[#A67C45] bg-[#D4A56A] hover:bg-[#E0B87A] shadow-[0_4px_14px_rgba(212,165,106,0.22)] transition-all active:scale-[0.97] bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-[max(1.25rem,env(safe-area-inset-left))] ${
                extended ? 'h-14 px-5 rounded-[3px]' : 'w-14 h-14 rounded-[3px]'
            }`}
        >
            <PlusIcon className="w-5 h-5" />
            {extended ? <span>{label}</span> : null}
        </button>
    );
}

export function TxGlassEmpty({ message, testId }: { message: string; testId?: string }) {
    return (
        <div data-testid={testId} role="status" aria-live="polite">
            <TxGlassPanel className="mt-8 px-6 py-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-sm border border-[#2A4550] bg-[#1A3340] flex items-center justify-center mb-3">
                <span className="text-[#D4A56A]/70 text-lg">◈</span>
            </div>
            <p className="text-[#CAC6BF] text-sm font-medium">{message}</p>
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
                className="absolute top-0 inset-x-8 h-[2px] bg-gradient-to-r from-transparent via-[#D4A56A]/50 to-transparent pointer-events-none"
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

export function TxFieldLabel({
    children,
    htmlFor,
}: {
    children: React.ReactNode;
    htmlFor?: string;
}) {
    return (
        <label htmlFor={htmlFor} className="block text-[11px] font-bold text-[#B4B0AA] mb-1.5">
            {children}
        </label>
    );
}

/** شريط أقسام المعاملة — مفتاح زجاجي مقطّع (بدون خط مقطوع) */
export function TxGlassTabsList({ children }: { children: React.ReactNode }) {
    return (
        <div
            className={
                'w-full rounded-sm border border-[#2A4550]/90 bg-[#071418]/95 p-1 ' +
                'shadow-[inset_0_1px_0_rgba(212,165,106,0.12),0_10px_28px_rgba(0,0,0,0.28)]'
            }
            data-testid="transactions-stage-rail"
        >
            {children}
        </div>
    );
}

/** زر قسم داخل الشريط المقطّع */
export const TX_TAB_TRIGGER =
    'group relative flex-1 inline-flex flex-row items-center justify-center gap-2.5 ' +
    'h-auto min-h-[52px] px-3 py-2 rounded-[3px] border border-transparent ' +
    'bg-transparent shadow-none text-[12px] font-extrabold whitespace-nowrap touch-manipulation ' +
    'text-[#8A8680] transition-all duration-200 ' +
    'data-[state=active]:bg-[#1A3340] data-[state=active]:text-[#E8D4B0] data-[state=active]:border-[#A67C45]/60 ' +
    'data-[state=active]:shadow-[0_0_22px_rgba(212,165,106,0.14),inset_0_1px_0_rgba(232,212,176,0.1)] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A56A]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A171D]';

/** رقم القسم داخل الزر */
export const TX_STAGE_DOT =
    'relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ' +
    'border-[#3A5A68] bg-[#0A171D] text-[10px] font-extrabold tabular-nums text-[#8A8680] ' +
    'group-data-[state=active]:border-[#A67C45] group-data-[state=active]:bg-[#D4A56A]/30 ' +
    'group-data-[state=active]:text-[#E8D4B0] group-data-[state=active]:shadow-[0_0_12px_rgba(212,165,106,0.4)]';

export const TX_GOLD_BTN =
    'inline-flex items-center justify-center min-h-[44px] px-4 rounded-sm font-bold text-[11px] border-2 border-[#3A5A68] touch-manipulation ' +
    'bg-[#152A32] text-[#D8D4CE] hover:bg-[#1A3340] hover:border-[#D4A56A]/70 transition-all';

export const TX_OCHRE_BTN =
    'inline-flex items-center justify-center min-h-[44px] px-4 rounded-sm font-bold text-[11px] border-2 border-[#A67C45] touch-manipulation ' +
    'bg-[#D4A56A] text-[#1A1208] hover:bg-[#E0B87A] transition-all';

export const TX_ICON_BTN =
    `${TX_TOUCH_ICON} rounded-sm border-2 border-[#3A5A68] bg-[#152A32] text-[#B4B0AA] ` +
    'hover:bg-[#1A3340] hover:text-[#D8D4CE] hover:border-[#D4A56A]/70 transition-all';

export const TX_DIALOG_SHELL =
    'bg-[#0E1F26] border border-[#2A4550] rounded-sm p-5 max-w-[calc(100vw-2rem)] text-[#D8D4CE]';

export const TX_DIALOG_BTN_CANCEL =
    'inline-flex items-center justify-center min-h-[44px] px-5 rounded-sm border-2 border-[#3A5A68] bg-[#152A32] text-[#B4B0AA] font-bold text-sm hover:bg-[#1A3340] transition-colors touch-manipulation';

export const TX_DIALOG_BTN_DANGER =
    'inline-flex items-center justify-center min-h-[44px] px-5 rounded-sm border-2 border-[#D4A56A]/50 bg-[#D4A56A]/12 text-[#E0B87A] font-bold text-sm hover:bg-[#D4A56A]/20 transition-colors touch-manipulation';

export const TX_DROPDOWN_CONTENT =
    'z-[225] bg-[#0E1F26] border border-[#2A4550] text-[#D8D4CE] rounded-sm p-1 shadow-[0_8px_24px_rgba(6,16,20,0.45)]';

export const TX_DROPDOWN_INSTANT =
    '!animate-none duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100';

export const TX_INNER_SURFACE =
    'rounded-sm bg-[#1A3340] border border-[#2A4550]/80';

export const TX_CARD_SURFACE =
    'rounded-sm bg-[#152A32] border border-[#2A4550]/90 px-4 py-3';

export const TX_ACCENT_SURFACE =
    'rounded-sm bg-[#D4A56A]/10 border border-[#D4A56A]/35';

export const TX_TEXT_PRIMARY = 'text-[#D8D4CE]';
export const TX_TEXT_SECONDARY = 'text-[#B4B0AA]';
export const TX_TEXT_MUTED = 'text-[#CAC6BF]';
export const TX_TEXT_OCHRE = 'text-[#E0B87A]';

export const TX_STATUS_ACTIVE = 'bg-[#D4A56A]/14 text-[#E0B87A] border-[#D4A56A]/45';
export const TX_STATUS_PAUSED = 'bg-[#1A3340] text-[#B4B0AA] border-[#2A4550]';
export const TX_STATUS_COMPLETED = 'bg-[#152A32] text-[#8A8680] border-[#2A4550]/80';

export const TX_DIALOG_TITLE = 'text-[#D8D4CE] text-base font-extrabold';
export const TX_DIALOG_DESC = 'text-[#8A8680] text-sm font-medium';

export const TX_DROPDOWN_FOCUS = 'cursor-default focus:bg-[#1A3340]';
