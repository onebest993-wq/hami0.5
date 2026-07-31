import React from 'react';
import { AlertTriangle, Clock, CheckCircle2, FileArchive, Trash2 } from 'lucide-react';
import type { UrgentCase } from '../Component_Urgent_Card';
import { DashboardSection } from './DashboardSection';
import type { ViewMode } from './types';
import type { UrgentQuickLogAction } from './hooks/useUrgentQuickLog';

type UrgentDashboardSectionsProps = {
    scope: 'active' | 'archive' | 'trash';
    searchQuery: string;
    viewMode: ViewMode;
    criticalCases: UrgentCase[];
    pendingCases: UrgentCase[];
    completedCases: UrgentCase[];
    archivedCases: UrgentCase[];
    trashedCases: UrgentCase[];
    isCriticalExpanded: boolean;
    isPendingExpanded: boolean;
    isCompletedExpanded: boolean;
    onToggleCritical: () => void;
    onTogglePending: () => void;
    onToggleCompleted: () => void;
    onQuickAction: (actionType: UrgentQuickLogAction, caseId: string) => void;
    onCaseClick: (caseId: string) => void;
    onArchive: (caseId: string) => void;
    onTrash: (caseId: string) => void;
    onUnarchive: (caseId: string) => void;
    onRestore: (caseId: string) => void;
    onPermanentDelete: (caseId: string) => void;
};

export function UrgentDashboardSections({
    scope,
    searchQuery,
    viewMode,
    criticalCases,
    pendingCases,
    completedCases,
    archivedCases,
    trashedCases,
    isCriticalExpanded,
    isPendingExpanded,
    isCompletedExpanded,
    onToggleCritical,
    onTogglePending,
    onToggleCompleted,
    onQuickAction,
    onCaseClick,
    onArchive,
    onTrash,
    onUnarchive,
    onRestore,
    onPermanentDelete,
}: UrgentDashboardSectionsProps) {
    return (
        <>
            {scope === 'active' && criticalCases.length > 0 ? (
                <DashboardSection
                    title="مواعيد حرجة (تنتهي خلال 48 ساعة)"
                    subtitle="يتطلب تدخل فوري"
                    icon={AlertTriangle}
                    variant="critical"
                    count={criticalCases.length}
                    isExpanded={isCriticalExpanded}
                    onToggle={onToggleCritical}
                    cases={criticalCases}
                    viewMode={viewMode}
                    onQuickAction={onQuickAction}
                    onCaseClick={onCaseClick}
                    onArchive={(caseId) => onArchive(caseId)}
                    onTrash={onTrash}
                    scope="active"
                />
            ) : null}

            {scope === 'active' && pendingCases.length > 0 ? (
                <DashboardSection
                    title="قيد الانتظار / ضمن المدة"
                    subtitle="نشط"
                    icon={Clock}
                    variant="pending"
                    count={pendingCases.length}
                    isExpanded={isPendingExpanded}
                    onToggle={onTogglePending}
                    cases={pendingCases}
                    viewMode={viewMode}
                    onQuickAction={onQuickAction}
                    onCaseClick={onCaseClick}
                    onArchive={(caseId) => onArchive(caseId)}
                    onTrash={onTrash}
                    scope="active"
                />
            ) : null}

            {scope === 'active' && completedCases.length > 0 ? (
                <DashboardSection
                    title="منجزة ومكتسبة الدرجة القطعية"
                    subtitle="مكتمل"
                    icon={CheckCircle2}
                    variant="completed"
                    count={completedCases.length}
                    isExpanded={isCompletedExpanded}
                    onToggle={onToggleCompleted}
                    cases={completedCases}
                    viewMode={viewMode}
                    onQuickAction={onQuickAction}
                    onCaseClick={onCaseClick}
                    onArchive={(caseId) => onArchive(caseId)}
                    onTrash={onTrash}
                    scope="active"
                />
            ) : null}

            {scope === 'archive' && archivedCases.length > 0 ? (
                <DashboardSection
                    title="الأرشيف"
                    subtitle="مؤرشف"
                    icon={FileArchive}
                    variant="neutral"
                    count={archivedCases.length}
                    isExpanded={true}
                    onToggle={() => undefined}
                    cases={archivedCases}
                    viewMode={viewMode}
                    onQuickAction={onQuickAction}
                    onCaseClick={onCaseClick}
                    onUnarchive={onUnarchive}
                    onTrash={onTrash}
                    scope="archive"
                    hideHeader
                />
            ) : null}

            {scope === 'trash' && trashedCases.length > 0 ? (
                <DashboardSection
                    title="سلة المهملات"
                    subtitle="محذوف"
                    icon={Trash2}
                    variant="trash"
                    count={trashedCases.length}
                    isExpanded={true}
                    onToggle={() => undefined}
                    cases={trashedCases}
                    viewMode={viewMode}
                    onQuickAction={onQuickAction}
                    onCaseClick={onCaseClick}
                    onRestore={onRestore}
                    onPermanentDelete={onPermanentDelete}
                    scope="trash"
                    hideHeader
                />
            ) : null}

            {scope === 'active' &&
            criticalCases.length === 0 &&
            pendingCases.length === 0 &&
            completedCases.length === 0 ? (
                <div className="text-center py-20">
                    <h3 className="text-white/60 font-bold text-lg">
                        {searchQuery
                            ? 'لم يتم العثور على نتائج للبحث'
                            : 'لا توجد مواعيد حرجة أو طلبات مستعجلة حالياً'}
                    </h3>
                </div>
            ) : null}

            {scope === 'archive' && archivedCases.length === 0 ? (
                <div className="text-center py-20">
                    <h3 className="text-white/60 font-bold text-lg">لا توجد ملفات مؤرشفة</h3>
                </div>
            ) : null}

            {scope === 'trash' && trashedCases.length === 0 ? (
                <div className="text-center py-20">
                    <h3 className="text-white/60 font-bold text-lg">سلة المهملات فارغة</h3>
                </div>
            ) : null}
        </>
    );
}
