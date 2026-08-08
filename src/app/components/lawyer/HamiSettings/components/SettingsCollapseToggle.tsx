import React from 'react';
import { ChevronDown, ChevronUp } from '@/app/components/ui/lucideIcons';

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
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-xs font-bold text-white/60 hover:text-[#E6C673]/85 hover:border-[#E6C673]/20 transition-colors min-h-[44px] min-w-[44px] touch-manipulation"
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
