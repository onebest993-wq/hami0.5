import React from 'react';
import { ChevronDown, ChevronUp } from '@/app/components/ui/lucideIcons';

type GuarantorCardExpandButtonProps = {
    expanded: boolean;
    onToggle: () => void;
};

export const GuarantorCardExpandButton: React.FC<GuarantorCardExpandButtonProps> = ({ expanded, onToggle }) => (
    <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10"
    >
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
);
