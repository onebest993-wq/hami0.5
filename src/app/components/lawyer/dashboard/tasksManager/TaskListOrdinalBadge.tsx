import React from 'react';

export type TaskListOrdinal = {
    index: number;
    total: number;
};

const STRIPE_TONE_CLASS = [
    'from-[#A67C52]/45 via-[#1A7059]/25',
    'from-[#6BC4A8]/42 via-[#1A7059]/28',
    'from-violet-400/38 via-[#A67C52]/22',
] as const;

const EDGE_RING_CLASS = [
    'ring-[#A67C52]/55 text-[#D4B896]',
    'ring-[#6BC4A8]/50 text-[#6BC4A8]',
    'ring-violet-400/45 text-violet-200',
] as const;

export function taskListStripeToneClass(ordinal?: TaskListOrdinal): string {
    if (!ordinal || ordinal.total <= 1) return STRIPE_TONE_CLASS[0];
    return STRIPE_TONE_CLASS[ordinal.index % STRIPE_TONE_CLASS.length]!;
}

function edgeRingClass(ordinal: TaskListOrdinal): string {
    return EDGE_RING_CLASS[ordinal.index % EDGE_RING_CLASS.length]!;
}

export type TaskListOrdinalBadgeProps = {
    ordinal: TaskListOrdinal;
    className?: string;
    /** مضغوط — دائرة أصغر */
    compact?: boolean;
    /** edge: خارج البطاقة بدون أخذ مساحة | inline: داخل الصف */
    placement?: 'edge' | 'inline';
    testId?: string;
};

/** رقم ترتيبي — يظهر فقط عند وجود أكثر من مهمة في القائمة */
export function TaskListOrdinalBadge({
    ordinal,
    className = '',
    compact = false,
    placement = 'inline',
    testId,
}: TaskListOrdinalBadgeProps) {
    if (ordinal.total <= 1) return null;

    const n = ordinal.index + 1;
    const ring = edgeRingClass(ordinal);

    if (placement === 'edge') {
        const size = compact ? 'size-6 text-[10px]' : 'size-7 text-[11px]';
        return (
            <span
                className={`absolute z-[3] pointer-events-none top-4 left-0 -translate-x-[42%] ${className}`}
                aria-label={`مهمة ${n} من ${ordinal.total}`}
                data-testid={testId ?? 'tasks-task-list-ordinal'}
            >
                <span
                    className={`relative flex items-center justify-center rounded-full border-2 border-[#0c0c0e] bg-[#071612] shadow-[0_4px_14px_rgba(0,0,0,0.45)] ring-1 ${ring} font-extrabold tabular-nums leading-none ${size}`}
                >
                    {n}
                </span>
            </span>
        );
    }

    return (
        <span
            className={`inline-flex items-center justify-center rounded-full border border-[#A67C52]/32 bg-[#A67C52]/12 font-extrabold tabular-nums text-[#D4B896] shrink-0 ${
                compact ? 'size-5 text-[10px]' : 'size-6 text-[11px]'
            } ${className}`}
            aria-label={compact ? `إجراء ${n} من ${ordinal.total}` : `مهمة ${n} من ${ordinal.total}`}
            data-testid={testId}
        >
            {n}
        </span>
    );
}
