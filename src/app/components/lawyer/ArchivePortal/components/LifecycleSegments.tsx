import React from 'react';
import {
    ARCHIVE_SEGMENT_BTN_ACTIVE,
    ARCHIVE_SEGMENT_BTN_BASE,
    ARCHIVE_SEGMENT_BTN_INACTIVE,
} from '../archiveToolbarStyles';

/**
 * أزرار دورة الحياة (نشطة/أرشيف/سلة) المشتركة بين مخزن الدعاوى
 * ولوحة القضاء المستعجل — نفس البنية والسلوك مع سماح بتلوين مختلف لكل سياق.
 */
export function LifecycleSegment({
    active,
    onClick,
    testId,
    children,
    activeClassName = ARCHIVE_SEGMENT_BTN_ACTIVE,
    ariaLabel,
}: {
    active: boolean;
    onClick: () => void;
    testId?: string;
    children: React.ReactNode;
    activeClassName?: string;
    ariaLabel?: string;
}) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={testId}
            aria-label={ariaLabel}
            title={ariaLabel}
            onClick={onClick}
            className={`${ARCHIVE_SEGMENT_BTN_BASE} inline-flex flex-1 items-center justify-center gap-1.5 px-3.5 ${active ? activeClassName : ARCHIVE_SEGMENT_BTN_INACTIVE}`}
        >
            {children}
        </button>
    );
}

export function CountBadge({ count, tone }: { count: number; tone: 'rose' | 'amber' }) {
    if (count <= 0) return null;
    const bg = tone === 'rose' ? 'bg-rose-600/90' : 'bg-amber-500/85';
    return (
        <span
            className={`min-w-[1.15rem] h-4 px-1 rounded-full ${bg} text-[10px] font-bold text-white inline-flex items-center justify-center`}
        >
            {count > 9 ? '9+' : count}
        </span>
    );
}
