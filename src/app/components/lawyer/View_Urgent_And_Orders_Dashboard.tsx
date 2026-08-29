import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from '@/app/components/ui/icons/ArrowLeft';
import { Plus } from '@/app/components/ui/icons/Plus';
import { isUrgentCaseInArchiveScope, isUrgentCaseTrashed } from './Component_Urgent_Card';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { DashboardControls } from './View_Urgent_And_Orders_Dashboard/DashboardControls';
import type { ViewMode, Props } from './View_Urgent_And_Orders_Dashboard/types';
import { useAuthSafe } from '@/app/context/authHooks';
import { loadPersistedViewMode, persistViewMode } from '@/app/services/settings/builtInBehavior';
import { resolveFocusCaseIdApply } from './View_Urgent_And_Orders_Dashboard/resolveFocusCaseIdApply';
import { useUrgentCasesStorage } from './View_Urgent_And_Orders_Dashboard/hooks/useUrgentCasesStorage';
import { useUrgentCasesFilter } from './View_Urgent_And_Orders_Dashboard/hooks/useUrgentCasesFilter';
import { useUrgentDossierPanel } from './View_Urgent_And_Orders_Dashboard/hooks/useUrgentDossierPanel';
import { useUrgentLifecycleModals } from './View_Urgent_And_Orders_Dashboard/hooks/useUrgentLifecycleModals';
import { UrgentDashboardSections } from './View_Urgent_And_Orders_Dashboard/UrgentDashboardSections';
import { UrgentDashboardOverlays } from './View_Urgent_And_Orders_Dashboard/UrgentDashboardOverlays';
import { URGENT_FAB_CLASS } from './dashboard/urgentWorkspaceChrome';

export const View_Urgent_And_Orders_Dashboard: React.FC<Props> = ({
    onBack,
    onCreateNew,
    focusCaseId,
    embeddedInWorkspace = false,
}) => {
    const { user: authUser, isLoading: authLoading } = useAuthSafe();
    const userId = useMemo(() => {
        if (authLoading) return null;
        return authUser?.id ?? null;
    }, [authUser?.id, authLoading]);

    const [viewMode, setViewMode] = useState<ViewMode>(() => loadPersistedViewMode());
    const handleViewModeChange = useCallback((mode: ViewMode) => {
        setViewMode(mode);
        persistViewMode(mode);
        if (typeof document !== 'undefined') {
            document.documentElement.dataset.hamiViewMode = mode;
        }
    }, []);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCriticalExpanded, setIsCriticalExpanded] = useState(true);
    const [isPendingExpanded, setIsPendingExpanded] = useState(true);
    const [showFormModal, setShowFormModal] = useState(false);
    const [formModalRetryKey, setFormModalRetryKey] = useState(0);
    const [scope, setScope] = useState<'active' | 'archive' | 'trash'>('active');
    const showWorkspaceControls = embeddedInWorkspace || !!onCreateNew;

    const { cases, setCases, casesStorageReady, pendingCasesPersistRef, persistSnapshot, msPerDay } = useUrgentCasesStorage(userId);
    const listReady = !authLoading && (userId ? casesStorageReady : true);
    const {
        showDetailsModal,
        selectedCaseForDetails,
        dossierMountKey,
        selectedCaseFile,
        closeDossierPanel,
        retryDossierPanel,
        openDossierForCase,
        handleCaseUpdated,
    } = useUrgentDossierPanel({ cases, setCases, pendingCasesPersistRef, persistSnapshot });
    const lifecycle = useUrgentLifecycleModals({ cases, setCases, pendingCasesPersistRef });

    const lastAppliedFocusCaseIdRef = useRef<string | null>(null);
    useEffect(() => {
        const decision = resolveFocusCaseIdApply(
            focusCaseId,
            lastAppliedFocusCaseIdRef.current,
            Boolean(focusCaseId && cases.some((c) => c.id === focusCaseId)),
        );
        lastAppliedFocusCaseIdRef.current = decision.nextLastApplied;
        if (!decision.apply || !focusCaseId) return;
        openDossierForCase(focusCaseId);
    }, [focusCaseId, cases, openDossierForCase]);

    const { criticalCases, pendingCases, archivedCases, trashedCases } = useUrgentCasesFilter({
        cases,
        scope,
        searchQuery,
    });

    const handleAddNew = useCallback(() => {
        if (!userId) {
            SmartToast.error('يلزم تسجيل الدخول لإضافة طلب مستعجل');
            return;
        }
        setShowFormModal(true);
    }, [userId]);

    const archivedCount = useMemo(() => cases.filter(isUrgentCaseInArchiveScope).length, [cases]);
    const trashedCount = useMemo(() => cases.filter(isUrgentCaseTrashed).length, [cases]);

    return (
        <div
            className={
                embeddedInWorkspace
                    ? 'h-full min-h-0 bg-[#0B1021] font-[\'Tajawal\'] px-3 py-1.5 pb-20 relative'
                    : 'min-h-screen bg-[#0B1021] font-[\'Tajawal\'] px-3 py-2 pb-20 relative'
            }
        >
            <div className={embeddedInWorkspace ? 'mb-1.5' : 'mb-2'}>
                {!embeddedInWorkspace ? (
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                            {onBack ? (
                                <button
                                    type="button"
                                    onClick={onBack}
                                    className="min-h-[44px] min-w-[44px] rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center touch-manipulation"
                                    aria-label="رجوع"
                                >
                                    <ArrowLeft className="text-white" size={18} />
                                </button>
                            ) : null}
                            <h1 className="text-lg font-bold text-white">لوحة القضاء المستعجل</h1>
                        </div>
                    </div>
                ) : null}

                <DashboardControls
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    viewMode={viewMode}
                    onViewModeChange={handleViewModeChange}
                    scope={scope}
                    onScopeChange={setScope}
                    archivedCount={archivedCount}
                    trashedCount={trashedCount}
                />
            </div>

            <UrgentDashboardSections
                scope={scope}
                searchQuery={searchQuery}
                viewMode={viewMode}
                criticalCases={criticalCases}
                pendingCases={pendingCases}
                archivedCases={archivedCases}
                trashedCases={trashedCases}
                isCriticalExpanded={isCriticalExpanded}
                isPendingExpanded={isPendingExpanded}
                onToggleCritical={() => setIsCriticalExpanded(!isCriticalExpanded)}
                onTogglePending={() => setIsPendingExpanded(!isPendingExpanded)}
                onCaseClick={openDossierForCase}
                onTrash={lifecycle.openTrashModal}
                onRestore={lifecycle.restoreFromTrash}
                onPermanentDelete={lifecycle.openPermanentDeleteModal}
                storageReady={listReady}
            />

            {showWorkspaceControls && !showFormModal ? (
                <button
                    type="button"
                    onClick={handleAddNew}
                    title="إضافة طلب مستعجل"
                    aria-label="إضافة طلب مستعجل جديد"
                    style={{
                        position: 'fixed',
                        zIndex: 60,
                        bottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))',
                        right: 'max(1.25rem, env(safe-area-inset-right, 0px))',
                    }}
                    className={URGENT_FAB_CLASS}
                >
                    <Plus size={16} strokeWidth={2.5} aria-hidden />
                    <span className="whitespace-nowrap">طلب مستعجل</span>
                </button>
            ) : null}

            <UrgentDashboardOverlays
                lifecycle={lifecycle}
                showFormModal={showFormModal}
                formModalRetryKey={formModalRetryKey}
                onCloseForm={() => setShowFormModal(false)}
                onRetryForm={() => setFormModalRetryKey((key) => key + 1)}
                userId={userId}
                msPerDay={msPerDay}
                setCases={setCases}
                pendingCasesPersistRef={pendingCasesPersistRef}
                openDossierForCase={openDossierForCase}
                showDetailsModal={showDetailsModal}
                selectedCaseForDetails={selectedCaseForDetails}
                selectedCaseFile={selectedCaseFile}
                dossierMountKey={dossierMountKey}
                closeDossierPanel={closeDossierPanel}
                retryDossierPanel={retryDossierPanel}
                handleCaseUpdated={handleCaseUpdated}
            />
        </div>
    );
};
