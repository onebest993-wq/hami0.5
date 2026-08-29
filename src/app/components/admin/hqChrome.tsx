import React from 'react';
import { cn } from '@/app/components/ui/utils';

export function HqSectionHeader({
    kicker,
    title,
    action,
}: {
    kicker: string;
    title: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="hq-section-head">
            <div className="min-w-0">
                <p className="hq-kicker">{kicker}</p>
                <h2 className="hq-title">{title}</h2>
            </div>
            {action ? <div className="hq-section-actions">{action}</div> : null}
        </div>
    );
}

export function HqGhostButton({
    children,
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button type="button" className={cn('hq-btn hq-btn-ghost', className)} {...props}>
            {children}
        </button>
    );
}

export function HqStateBlock({
    kind,
    title,
    detail,
    action,
}: {
    kind: 'loading' | 'error' | 'empty';
    title: string;
    detail?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className={cn('hq-state', kind === 'error' && 'hq-state-error')} role={kind === 'error' ? 'alert' : undefined}>
            <p className="hq-state-title">{title}</p>
            {detail ? <p className="hq-state-detail">{detail}</p> : null}
            {action}
        </div>
    );
}

export function HqMetric({
    label,
    value,
    hint,
    tone = 'gold',
    size = 'md',
    onClick,
}: {
    label: string;
    value: number | string;
    hint?: string;
    tone?: 'gold' | 'danger' | 'warn' | 'ok';
    size?: 'md' | 'lg';
    onClick?: () => void;
}) {
    const inner = (
        <>
            <p className="hq-metric-label">{label}</p>
            <p className="hq-metric-value">{value}</p>
            {hint ? <p className="hq-metric-hint">{hint}</p> : null}
        </>
    );
    const className = cn('hq-metric', `hq-metric-${tone}`, size === 'lg' && 'hq-metric-lg');
    if (onClick) {
        return (
            <button
                type="button"
                className={className}
                onClick={onClick}
                aria-label={`${label}: ${value}`}
            >
                {inner}
            </button>
        );
    }
    return <div className={className}>{inner}</div>;
}

export function HqPulseCell({
    label,
    value,
    detail,
    tone = 'gold',
    testId,
}: {
    label: string;
    value: string;
    detail?: string;
    tone?: 'gold' | 'danger' | 'warn' | 'ok';
    testId?: string;
}) {
    return (
        <div className={cn('hq-ops-pulse-cell', `hq-ops-pulse-${tone}`)} data-testid={testId}>
            <p className="hq-ops-pulse-label">{label}</p>
            <p className="hq-ops-pulse-value">{value}</p>
            {detail ? <p className="hq-ops-pulse-detail">{detail}</p> : null}
        </div>
    );
}

export function HqChipRow({ children }: { children: React.ReactNode }) {
    return <div className="hq-chip-row">{children}</div>;
}

export function HqChip({
    active,
    children,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
    return (
        <button
            type="button"
            aria-pressed={active}
            className={cn('hq-chip', active && 'hq-chip-active')}
            {...props}
        >
            {children}
        </button>
    );
}
