import React from 'react';
import type { HamiIcon } from '@/app/components/ui/icons/hamiIcon';
import {
    PS_RAIL_CELL_PRIMARY,
    PS_RAIL_CELL_SECONDARY,
} from './personalStatusPearlTheme';

export function PersonalStatusRailPrimary({
    icon: Icon,
    label,
    onClick,
    badge,
    testId,
}: {
    icon: HamiIcon;
    label: string;
    onClick: () => void;
    badge?: number;
    testId?: string;
}) {
    return (
        <button
            type="button"
            data-testid={testId}
            onClick={onClick}
            title={label}
            className={`${PS_RAIL_CELL_PRIMARY} hover:bg-white/[0.05]`}
        >
            <span className="relative">
                <Icon size={15} className="text-white/70" strokeWidth={1.75} aria-hidden />
                {badge && badge > 0 ? (
                    <span className="absolute -top-1.5 -left-1.5 min-w-[0.9rem] h-[0.9rem] px-0.5 rounded-full bg-white/80 text-[7px] font-black text-[#101018] flex items-center justify-center tabular-nums">
                        {badge}
                    </span>
                ) : null}
            </span>
            <span className="text-[10px] font-bold text-white/80 leading-tight">{label}</span>
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
    icon: HamiIcon;
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
                <Icon size={13} className="text-white/50" strokeWidth={1.75} aria-hidden />
                {badge && badge > 0 ? (
                    <span className="absolute -top-1 -left-1 min-w-[0.75rem] h-[0.75rem] rounded-full bg-white/80 text-[6px] font-black text-[#101018] flex items-center justify-center">
                        {badge}
                    </span>
                ) : null}
            </span>
            <span className="text-[10px] font-bold text-white/70 leading-tight">{label}</span>
        </button>
    );
}

export function PersonalStatusRailShell({
    primary,
    secondary,
    secondaryCount = 3,
}: {
    primary: React.ReactNode;
    secondary: React.ReactNode;
    secondaryCount?: number;
}) {
    const secondaryCols =
        secondaryCount >= 3 ? 'grid-cols-3' : secondaryCount === 2 ? 'grid-cols-2' : 'grid-cols-1';
    return (
        <div className="overflow-hidden rounded-xl border border-white/[0.12] bg-white/[0.03] divide-y divide-white/[0.08]" dir="rtl">
            <div className="min-w-0">{primary}</div>
            <div className={`grid ${secondaryCols} divide-x divide-x-reverse divide-white/[0.08]`}>{secondary}</div>
        </div>
    );
}
