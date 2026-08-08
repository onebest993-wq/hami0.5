import React from 'react';
import {
    PS_RAIL_CELL_PRIMARY,
    PS_RAIL_CELL_SECONDARY,
    PS_RAIL_GROUP_LABEL,
    PS_RAIL_SHELL,
} from './personalStatusPearlTheme';

type RailTone = 'rose' | 'pearl' | 'sand' | 'flow';

const TONE_ICON: Record<RailTone, string> = {
    rose: 'text-[#FFD4DC]',
    pearl: 'text-[#ECE8E2]',
    sand: 'text-[#E8DFD0]',
    flow: 'text-[#C9B89A]',
};

const TONE_CELL: Record<RailTone, string> = {
    rose: 'hover:bg-[#F5C6D0]/[0.12]',
    pearl: 'hover:bg-white/[0.06]',
    sand: 'hover:bg-[#C9B89A]/[0.10]',
    flow: 'hover:bg-[#C9B89A]/[0.08]',
};

export function PersonalStatusRailPrimary({
    icon: Icon,
    label,
    onClick,
    tone = 'pearl',
    badge,
    testId,
}: {
    icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
    label: string;
    onClick: () => void;
    tone?: RailTone;
    badge?: number;
    testId?: string;
}) {
    return (
        <button
            type="button"
            data-testid={testId}
            onClick={onClick}
            title={label}
            className={`${PS_RAIL_CELL_PRIMARY} ${TONE_CELL[tone]}`}
        >
            <span className="relative">
                <Icon size={16} className={TONE_ICON[tone]} strokeWidth={1.75} aria-hidden />
                {badge && badge > 0 ? (
                    <span className="absolute -top-1.5 -left-1.5 min-w-[0.9rem] h-[0.9rem] px-0.5 rounded-full bg-[#F0A8B4] text-[7px] font-black text-[#101018] flex items-center justify-center tabular-nums">
                        {badge}
                    </span>
                ) : null}
            </span>
            <span className="text-[9px] font-black text-[#FFFEF9] leading-none">{label}</span>
        </button>
    );
}

export function PersonalStatusRailSecondary({
    icon: Icon,
    label,
    onClick,
    testId,
    badge,
}: {
    icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
    label: string;
    onClick: () => void;
    testId?: string;
    badge?: number;
}) {
    return (
        <button
            type="button"
            data-testid={testId}
            onClick={onClick}
            title={label}
            className={PS_RAIL_CELL_SECONDARY}
        >
            <span className="relative">
                <Icon size={13} className="text-[#9894A0]" strokeWidth={1.75} aria-hidden />
                {badge && badge > 0 ? (
                    <span className="absolute -top-1 -left-1 min-w-[0.75rem] h-[0.75rem] rounded-full bg-[#F0A8B4]/90 text-[6px] font-black text-[#101018] flex items-center justify-center">
                        {badge}
                    </span>
                ) : null}
            </span>
            <span className="text-[8px] font-bold text-[#9894A0] leading-none">{label}</span>
        </button>
    );
}

export function PersonalStatusRailShell({
    primary,
    secondary,
}: {
    primary: React.ReactNode;
    secondary: React.ReactNode;
}) {
    return (
        <div className={PS_RAIL_SHELL} dir="rtl">
            <div className="px-2 pt-1.5 pb-1 border-b border-white/[0.06]">
                <p className={PS_RAIL_GROUP_LABEL}>تسجيل وسير الدعوى</p>
                <div className="rounded-lg overflow-hidden border border-white/[0.08] bg-[#101018]/30">
                    {primary}
                </div>
            </div>
            <div className="px-2 py-1.5">
                <p className={`${PS_RAIL_GROUP_LABEL} mb-1`}>مساعد</p>
                <div className="flex items-stretch gap-1">{secondary}</div>
            </div>
        </div>
    );
}
