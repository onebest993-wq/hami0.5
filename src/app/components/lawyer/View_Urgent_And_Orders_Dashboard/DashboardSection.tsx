import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, type LucideIcon } from 'lucide-react';
import { Component_Urgent_Card, type UrgentCase } from '../Component_Urgent_Card';
import type { ViewMode } from './types';

interface DashboardSectionProps {
    title: string;
    subtitle: string;
    icon: LucideIcon;
    iconBgClass: string;
    iconColorClass: string;
    borderClass: string;
    gradientClass: string;
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
}

export const DashboardSection = ({
    title,
    subtitle,
    icon: Icon,
    iconBgClass,
    iconColorClass,
    borderClass,
    gradientClass,
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
}: DashboardSectionProps) => (
    <div className="mb-8">
        <button type="button"
            onClick={onToggle}
            className={`w-full flex items-center justify-between ${gradientClass} border-2 ${borderClass} rounded-2xl p-5 mb-4 hover:border-opacity-80 transition-all`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full ${iconBgClass} flex items-center justify-center ${count > 0 && title.includes('حرجة') ? 'animate-pulse' : ''}`}>
                    <Icon className={iconColorClass} size={24} />
                </div>
                <div className="text-right">
                    <h2 className={`font-bold text-lg ${iconColorClass.replace('text-', 'text-').replace('-400', '-200')}`}>
                        {title}
                    </h2>
                    <p className={`${iconColorClass.replace('text-', 'text-').replace('-400', '-300/60')} text-xs mt-1`}>
                        {count} إجراء{count > 1 ? '' : ''} {title.includes('حرجة') ? 'يتطلب تدخل فوري' : title.includes('انتظار') ? 'نشط' : 'مكتمل'}
                    </p>
                </div>
            </div>
            {isExpanded ? <ChevronUp className={iconColorClass.replace('text-', 'text-').replace('-400', '-300')} /> : <ChevronDown className={iconColorClass.replace('text-', 'text-').replace('-400', '-300')} />}
        </button>

        <AnimatePresence>
            {isExpanded && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={
                        viewMode === 'grid'
                            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                            : 'flex flex-col gap-4'
                    }
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
