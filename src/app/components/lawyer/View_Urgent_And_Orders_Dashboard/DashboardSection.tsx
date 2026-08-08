import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, type LucideIcon } from '@/app/components/ui/lucideIcons';
import { Component_Urgent_Card, type UrgentCase } from '../Component_Urgent_Card';
import type { ViewMode } from './types';
import {
    DASHBOARD_SECTION_SHELL,
    DASHBOARD_SECTION_VARIANTS,
    sectionCountLabel,
    type DashboardSectionVariant,
} from './dashboardSectionStyles';

interface DashboardSectionProps {
    title: string;
    subtitle: string;
    icon: LucideIcon;
    variant?: DashboardSectionVariant;
    count: number;
    isExpanded: boolean;
    onToggle: () => void;
    cases: UrgentCase[];
    viewMode: ViewMode;
    onQuickAction: (actionType: 'notification' | 'grievance' | 'cassation', caseId: string) => void;
    onCaseClick: (caseId: string) => void;
    onArchive?: (caseId: string) => void;
    onUnarchive?: (caseId: string) => void;
    onTrash?: (caseId: string) => void;
    onRestore?: (caseId: string) => void;
    onPermanentDelete?: (caseId: string) => void;
    scope?: 'active' | 'archive' | 'trash';
    hideHeader?: boolean;
}

export const DashboardSection = ({
    title,
    icon: Icon,
    variant = 'neutral',
    count,
    isExpanded,
    onToggle,
    cases,
    viewMode,
    onQuickAction,
    onCaseClick,
    onArchive,
    onUnarchive,
    onTrash,
    onRestore,
    onPermanentDelete,
    scope = 'active',
    hideHeader = false,
}: DashboardSectionProps) => {
    const tone = DASHBOARD_SECTION_VARIANTS[variant];
    const gridClass =
        viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
            : 'flex flex-col gap-2';

    const cards = (
        <div className={gridClass}>
            {cases.map((caseData) => (
                <Component_Urgent_Card
                    key={caseData.id}
                    case_data={caseData}
                    onQuickAction={onQuickAction}
                    onCaseClick={onCaseClick}
                    onArchive={onArchive}
                    onUnarchive={onUnarchive}
                    onTrash={onTrash}
                    onRestore={onRestore}
                    onPermanentDelete={onPermanentDelete}
                    scope={scope}
                />
            ))}
        </div>
    );

    if (hideHeader) {
        return <div className="mb-4">{isExpanded ? cards : null}</div>;
    }

    return (
        <div className="mb-8">
            <button type="button" onClick={onToggle} className={DASHBOARD_SECTION_SHELL}>
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${tone.iconWrap} ${count > 0 && variant === 'critical' ? 'animate-pulse' : ''}`}
                    >
                        <Icon className={tone.iconColor} size={20} strokeWidth={1.75} />
                    </div>
                    <div className="text-right min-w-0">
                        <h2 className="font-bold text-base text-white/92 truncate">{title}</h2>
                        <p className="text-white/40 text-xs mt-0.5">{sectionCountLabel(title, count)}</p>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp className={`shrink-0 ${tone.chevron}`} size={20} />
                ) : (
                    <ChevronDown className={`shrink-0 ${tone.chevron}`} size={20} />
                )}
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={gridClass}
                    >
                        {cases.map((caseData) => (
                            <Component_Urgent_Card
                                key={caseData.id}
                                case_data={caseData}
                                onQuickAction={onQuickAction}
                                onCaseClick={onCaseClick}
                                onArchive={onArchive}
                                onUnarchive={onUnarchive}
                                onTrash={onTrash}
                                onRestore={onRestore}
                                onPermanentDelete={onPermanentDelete}
                                scope={scope}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
