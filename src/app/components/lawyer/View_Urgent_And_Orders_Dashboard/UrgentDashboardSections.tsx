import React from 'react';
import { AlertTriangle } from '@/app/components/ui/icons/AlertTriangle';
import { Clock } from '@/app/components/ui/icons/Clock';
import type { UrgentCase } from '../Component_Urgent_Card';
import { DashboardSection, UrgentCardsGrid } from './DashboardSection';
import type { ViewMode } from './types';

function UrgentEmptyState({ message }: { message: string }) {
    return (
        <div className="text-center py-6">
            <p className="text-white/45 text-sm">{message}</p>
        </div>
    );
}

type UrgentDashboardSectionsProps = {
    scope: 'active' | 'archive' | 'trash';
    searchQuery: string;
    viewMode: ViewMode;
    criticalCases: UrgentCase[];
    pendingCases: UrgentCase[];
    archivedCases: UrgentCase[];
    trashedCases: UrgentCase[];
    isCriticalExpanded: boolean;
    isPendingExpanded: boolean;
    onToggleCritical: () => void;
    onTogglePending: () => void;
    onCaseClick: (caseId: string) => void;
    onTrash: (caseId: string) => void;
    onRestore: (caseId: string) => void;
    onPermanentDelete: (caseId: string) => void;
    storageReady?: boolean;
};

export function UrgentDashboardSections({
    scope,
    searchQuery,
    viewMode,
    criticalCases,
    pendingCases,
    archivedCases,
    trashedCases,
    isCriticalExpanded,
    isPendingExpanded,
    onToggleCritical,
    onTogglePending,
    onCaseClick,
    onTrash,
    onRestore,
    onPermanentDelete,
    storageReady = true,
}: UrgentDashboardSectionsProps) {
    const cardHandlers = {
        viewMode,
        onCaseClick,
        onTrash,
        onRestore,
        onPermanentDelete,
    };

    return (
        <>
            {scope === 'active' && criticalCases.length > 0 ? (
                <DashboardSection
                    title="حرجة"
                    icon={AlertTriangle}
                    variant="critical"
                    count={criticalCases.length}
                    isExpanded={isCriticalExpanded}
                    onToggle={onToggleCritical}
                    cases={criticalCases}
                    scope="active"
                    {...cardHandlers}
                />
            ) : null}

            {scope === 'active' && pendingCases.length > 0 ? (
                <DashboardSection
                    title="ضمن المدة"
                    icon={Clock}
                    variant="pending"
                    count={pendingCases.length}
                    isExpanded={isPendingExpanded}
                    onToggle={onTogglePending}
                    cases={pendingCases}
                    scope="active"
                    {...cardHandlers}
                />
            ) : null}

            {scope === 'archive' && archivedCases.length > 0 ? (
                <div className="mb-3">
                    <UrgentCardsGrid cases={archivedCases} scope="archive" {...cardHandlers} />
                </div>
            ) : null}

            {scope === 'trash' && trashedCases.length > 0 ? (
                <div className="mb-3">
                    <UrgentCardsGrid cases={trashedCases} scope="trash" {...cardHandlers} />
                </div>
            ) : null}

            {!storageReady ? (
                <div className="text-center py-6" aria-busy="true" data-testid="urgent-dashboard-hydrating">
                    <p className="text-white/45 text-sm">جاري التحميل...</p>
                </div>
            ) : null}

            {storageReady && scope === 'active' && criticalCases.length === 0 && pendingCases.length === 0 ? (
                <UrgentEmptyState
                    message={
                        searchQuery
                            ? 'لم يتم العثور على نتائج للبحث'
                            : 'لا توجد مواعيد حرجة أو طلبات مستعجلة حالياً'
                    }
                />
            ) : null}

            {storageReady && scope === 'archive' && archivedCases.length === 0 ? (
                <UrgentEmptyState message="لا توجد ملفات مؤرشفة" />
            ) : null}

            {storageReady && scope === 'trash' && trashedCases.length === 0 ? (
                <UrgentEmptyState message="سلة المهملات فارغة" />
            ) : null}
        </>
    );
}
