import React from 'react';

export function BiDiText({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <bdi dir="auto" className={`[unicode-bidi:plaintext] ${className}`.trim()}>
            {children}
        </bdi>
    );
}

export function outlineIconActionClassName(tone: 'neutral' | 'accent' | 'danger') {
    const tones = {
        neutral: 'border-white/12 bg-white/[0.03] text-white/62',
        accent: 'border-[#E6C673]/28 bg-[#E6C673]/[0.045] text-[#E6C673]',
        danger: 'border-rose-500/28 bg-rose-500/[0.045] text-rose-200',
    } as const;
    return `flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border touch-manipulation ${tones[tone]}`;
}

export function outlineTextActionClassName(tone: 'accent' | 'success') {
    const tones = {
        accent: 'border-[#E6C673]/28 bg-[#E6C673]/[0.06] text-[#E6C673]',
        success: 'border-emerald-500/28 bg-emerald-500/[0.06] text-emerald-300',
    } as const;
    return `inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-bold touch-manipulation ${tones[tone]}`;
}

export function stopToolbarPointerEvent(event: React.SyntheticEvent) {
    event.stopPropagation();
}

export function fireToolbarAction(event: React.MouseEvent, action?: () => void) {
    event.preventDefault();
    event.stopPropagation();
    action?.();
}

export function ToolbarIconButton({
    onAction,
    className,
    children,
    ...rest
}: {
    onAction?: () => void;
    className: string;
    children: React.ReactNode;
    title?: string;
    'aria-label'?: string;
    'data-testid'?: string;
}) {
    return (
        <button
            type="button"
            {...rest}
            onPointerDown={stopToolbarPointerEvent}
            onMouseDown={stopToolbarPointerEvent}
            onClick={(event) => fireToolbarAction(event, onAction)}
            className={className}
        >
            {children}
        </button>
    );
}
