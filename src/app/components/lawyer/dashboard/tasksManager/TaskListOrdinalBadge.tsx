import React from 'react';

export type TaskListOrdinal = {
    index: number;
    total: number;
};

const ACCENT_CLASS = [
    'bg-[#E6C673]',
    'bg-[#34D399]',
    'bg-[#C9A85C]',
] as const;

function accentSolid(ordinal: TaskListOrdinal): string {
    return ACCENT_CLASS[ordinal.index % ACCENT_CLASS.length]!;
}

function padIndex(n: number): string {
    return n < 10 ? `0${n}` : String(n);
}

export type TaskListOrdinalBadgeProps = {
    ordinal: TaskListOrdinal;
    className?: string;
    compact?: boolean;
    testId?: string;
};

/** مؤشر ترتيب خفيف — رقم صفري + خط لون واحد */
export function TaskListOrdinalBadge({
    ordinal,
    className = '',
    compact = false,
    testId,
}: TaskListOrdinalBadgeProps) {
    if (ordinal.total <= 1) return null;

    const n = ordinal.index + 1;
    const label = compact ? `إجراء ${n} من ${ordinal.total}` : `مهمة ${n} من ${ordinal.total}`;
    const accent = accentSolid(ordinal);

    if (compact) {
        return (
            <span
                className={`relative inline-flex items-center justify-center size-5 shrink-0 rounded-md bg-[#12182B]/88 border border-white/[0.08] ${className}`}
                aria-label={label}
                data-testid={testId ?? 'tasks-task-list-ordinal'}
            >
                <span className={`absolute inset-y-1 right-0 w-px rounded-full ${accent} opacity-90`} aria-hidden />
                <span className="text-[9px] font-black tabular-nums tracking-wide text-[#F4F4F5]/85">{n}</span>
            </span>
        );
    }

    return (
        <span
            className={`relative inline-flex flex-row-reverse items-center gap-1 shrink-0 h-6 pl-2 pr-1.5 rounded-md bg-[#12182B]/88 border border-white/[0.08] ${className}`}
            aria-label={label}
            data-testid={testId ?? 'tasks-task-list-ordinal'}
            title={label}
        >
            <span className={`absolute inset-y-1.5 right-0 w-px rounded-full ${accent}`} aria-hidden />
            <span className="text-[10px] font-black tabular-nums tracking-widest text-[#E6C673] leading-none">
                {padIndex(n)}
            </span>
            <span className="w-px h-2.5 bg-white/10" aria-hidden />
            <span className="text-[9px] font-bold tabular-nums tracking-wider text-[#F4F4F5]/45 leading-none">
                {padIndex(ordinal.total)}
            </span>
        </span>
    );
}
