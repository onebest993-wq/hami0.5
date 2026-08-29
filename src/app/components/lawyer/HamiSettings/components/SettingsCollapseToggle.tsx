import React from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { ChevronUp } from '@/app/components/ui/icons/ChevronUp';

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
            {expanded ? (
                <>
                    <span>طي</span>
                    <ChevronUp size={14} aria-hidden />
                </>
            ) : (
                <>
                    <span>+{hidden}</span>
                    <ChevronDown size={14} aria-hidden />
                </>
            )}
        </button>
    );
}
