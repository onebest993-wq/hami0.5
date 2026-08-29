import React from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { ChevronUp } from '@/app/components/ui/icons/ChevronUp';
import type { LucideIcon } from '@/app/components/ui/lucideIcons';
import { Component_Urgent_Card, type UrgentCase } from '../Component_Urgent_Card';
import type { ViewMode } from './types';
import {
    DASHBOARD_SECTION_SHELL,
    DASHBOARD_SECTION_VARIANTS,
    type DashboardSectionVariant,
} from './dashboardSectionStyles';

export type UrgentCardGridHandlers = {
    onCaseClick: (caseId: string) => void;
    onTrash?: (caseId: string) => void;
    onRestore?: (caseId: string) => void;
    onPermanentDelete?: (caseId: string) => void;
    scope?: 'active' | 'archive' | 'trash';
};

export function UrgentCardsGrid({
    cases,
    viewMode,
    onCaseClick,
    onTrash,
    onRestore,
    onPermanentDelete,
    scope = 'active',
}: {
    cases: UrgentCase[];
    viewMode: ViewMode;
} & UrgentCardGridHandlers) {
    const gridClass =
        viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5'
            : 'flex flex-col gap-1';

    return (
        <div className={gridClass}>
            {cases.map((caseData) => (
                <Component_Urgent_Card
                    key={caseData.id}
                    case_data={caseData}
                    onCaseClick={onCaseClick}
                    onTrash={onTrash}
                    onRestore={onRestore}
                    onPermanentDelete={onPermanentDelete}
                    scope={scope}
                />
            ))}
        </div>
    );
}

interface DashboardSectionProps extends UrgentCardGridHandlers {
    title: string;
    icon: LucideIcon;
    variant?: DashboardSectionVariant;
    count: number;
    isExpanded: boolean;
    onToggle: () => void;
    cases: UrgentCase[];
    viewMode: ViewMode;
}

export const DashboardSection = ({
    title,
    icon: Icon,
    variant = 'pending',
    count,
    isExpanded,
    onToggle,
    cases,
    viewMode,
    onCaseClick,
    onTrash,
    onRestore,
    onPermanentDelete,
    scope = 'active',
}: DashboardSectionProps) => {
    const tone = DASHBOARD_SECTION_VARIANTS[variant];
    const cards = (
        <UrgentCardsGrid
            cases={cases}
            viewMode={viewMode}
            onCaseClick={onCaseClick}
            onTrash={onTrash}
            onRestore={onRestore}
            onPermanentDelete={onPermanentDelete}
            scope={scope}
        />
    );

    return (
        <div className="mb-3">
            <button type="button" onClick={onToggle} className={DASHBOARD_SECTION_SHELL}>
                <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`shrink-0 ${tone.iconColor}`} size={16} strokeWidth={2} />
                    <h2 className="font-semibold text-[13px] text-white/90 truncate">{title}</h2>
                    <span className="tabular-nums text-[11px] text-white/40">{count}</span>
                </div>
                {isExpanded ? (
                    <ChevronUp className={`shrink-0 ${tone.chevron}`} size={16} />
                ) : (
                    <ChevronDown className={`shrink-0 ${tone.chevron}`} size={16} />
                )}
            </button>

            {isExpanded ? cards : null}
        </div>
    );
};
