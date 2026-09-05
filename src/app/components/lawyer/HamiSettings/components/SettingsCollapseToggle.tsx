import React from 'react';

export function SettingsCollapseToggle({
    expanded,
    hidden,
    onToggle,
    label,
}: {
    expanded: boolean;
    hidden: number;
    onToggle: () => void;
    label: string;
}) {
    if (hidden <= 0) return null;

    return (
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? `طي ${label}` : `عرض كل ${label}`}
            className="shrink-0 flex items-center gap-1 px-2 min-h-[44px] min-w-[44px] text-[12px] font-medium text-white/45 hover:text-[#E6C673]/85 touch-manipulation"
        >
            {expanded ? <span>طي</span> : <span>+{hidden}</span>}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`shrink-0 ${expanded ? 'rotate-180' : ''}`}
                aria-hidden
                focusable="false"
            >
                <path d="m6 9 6 6 6-6" />
            </svg>
        </button>
    );
}
