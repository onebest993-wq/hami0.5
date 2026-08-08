import React from 'react';
import {
    ARCHIVE_SEGMENT_BTN_ACTIVE,
    ARCHIVE_SEGMENT_BTN_BASE,
    ARCHIVE_SEGMENT_BTN_INACTIVE,
} from '../archiveToolbarStyles';

export function LifecycleSegment({
    active,
    onClick,
    testId,
    children,
    activeClassName = ARCHIVE_SEGMENT_BTN_ACTIVE,
    iconOnly = false,
    ariaLabel,
}: {
    active: boolean;
    onClick: () => void;
    testId?: string;
    children: React.ReactNode;
    activeClassName?: string;
    iconOnly?: boolean;
    ariaLabel?: string;
}) {
    return (
        <button
            type="button"
            data-testid={testId}
            aria-label={ariaLabel}
            title={ariaLabel}
            onClick={onClick}
            className={`${ARCHIVE_SEGMENT_BTN_BASE} inline-flex items-center justify-center gap-1.5 ${
                iconOnly ? 'h-9 w-9 shrink-0 px-0' : ''
            } ${active ? activeClassName : ARCHIVE_SEGMENT_BTN_INACTIVE}`}
        >
            {children}
        </button>
    );
}

export function CountBadge({ count, tone }: { count: number; tone: 'rose' | 'amber' }) {
    if (count <= 0) return null;
    const bg = tone === 'rose' ? 'bg-rose-600' : 'bg-amber-600';
    return (
        <span
            className={`min-w-[1.1rem] h-4 px-1 rounded-full ${bg} text-[10px] font-bold text-white inline-flex items-center justify-center`}
        >
            {count > 9 ? '9+' : count}
        </span>
    );
}
