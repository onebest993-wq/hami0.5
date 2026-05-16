import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    icon: LucideIcon;
    label: string;
}

export const TabButton = ({ active, onClick, icon: Icon, label }: TabButtonProps) => (
    <button type="button"
        onClick={onClick}
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-lg transition-all ${active ? 'bg-[#E6C673] text-[#0B1021]' : 'bg-transparent text-white/50 hover:bg-white/5'}`}
    >
        <Icon size={18} />
        <span className="text-[10px] font-bold">{label}</span>
    </button>
);
