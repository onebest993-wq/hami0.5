import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface SectionHeaderProps {
    title: string;
    icon: LucideIcon;
}

export const SectionHeader = ({ title, icon: Icon }: SectionHeaderProps) => (
    <div className="flex items-center gap-2 mb-4 mt-8 px-1">
        <Icon size={20} className="text-[#E6C673]" />
        <h2 className="text-sm font-bold text-white/90">{title}</h2>
    </div>
);

interface SettingCardProps {
    children: React.ReactNode;
    className?: string;
}

export const SettingCard = ({ children, className = "" }: SettingCardProps) => (
    <div className={`bg-[#1A1E2E]/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden ${className}`}>
        {children}
    </div>
);

interface SettingRowProps {
    icon: LucideIcon;
    label: string;
    subLabel?: string;
    action: React.ReactNode;
    isLast?: boolean;
    className?: string;
}

export const SettingRow = ({ icon: Icon, label, subLabel, action, isLast, className = "" }: SettingRowProps) => (
    <div className={`flex items-center justify-between p-4 ${!isLast ? 'border-b border-white/5' : ''} ${className}`}>
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/70 shrink-0">
                <Icon size={16} />
            </div>
            <div>
                <div className="text-sm font-bold text-white">{label}</div>
                {subLabel && <div className="text-[10px] text-white/40">{subLabel}</div>}
            </div>
        </div>
        <div>{action}</div>
    </div>
);

interface ToggleProps {
    checked: boolean;
    onChange: (value: boolean) => void;
}

export const Toggle = ({ checked, onChange }: ToggleProps) => (
    <button type="button" 
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${checked ? 'bg-[#E6C673]' : 'bg-white/10'}`}
    >
        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);
