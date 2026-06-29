import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[10px] font-bold text-white/55 hover:text-[#E6C673]/85 hover:border-[#E6C673]/20 transition-colors min-h-[32px]"
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
