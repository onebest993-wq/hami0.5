import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { isUrgentCaseClosed } from './Component_Urgent_Card';
import { Modal_Quick_Log } from './Modal_Quick_Log';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { DashboardControls } from './View_Urgent_And_Orders_Dashboard/DashboardControls';
import type { ViewMode, FilterStatus, Props } from './View_Urgent_And_Orders_Dashboard/types';
import { useAuthSafe } from '@/app/context/AuthContext';
import { loadPersistedViewMode, persistViewMode } from '@/app/services/settings/builtInBehavior';
import { DeferredActiveOrderFile, preloadActiveOrderFilePanel } from './DeferredActiveOrderFile';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import DossierOpeningFallback from '@/app/components/lawyer/LawyerDashboardParts/components/DossierOpeningFallback';
import { createCaseFromForm } from '@/app/domain/urgent';
import { useUrgentCasesStorage } from './View_Urgent_And_Orders_Dashboard/hooks/useUrgentCasesStorage';
import { useUrgentCasesFilter } from './View_Urgent_And_Orders_Dashboard/hooks/useUrgentCasesFilter';
import { useUrgentDossierPanel } from './View_Urgent_And_Orders_Dashboard/hooks/useUrgentDossierPanel';
import { useUrgentLifecycleModals } from './View_Urgent_And_Orders_Dashboard/hooks/useUrgentLifecycleModals';
import { useUrgentQuickLog } from './View_Urgent_And_Orders_Dashboard/hooks/useUrgentQuickLog';
import { UrgentLifecycleModals } from './View_Urgent_And_Orders_Dashboard/UrgentLifecycleModals';
import { UrgentDashboardSections } from './View_Urgent_And_Orders_Dashboard/UrgentDashboardSections';
import {
    DossierPanelErrorFallback,
    FormModalErrorFallback,
} from './View_Urgent_And_Orders_Dashboard/UrgentDashboardErrorFallbacks';

const LazyFormUrgentActions = lazyWithRetry(() =>
    import('./Form_Urgent_Actions').then((m) => ({
        default: m.Form_Urgent_Actions as unknown as LazyComponent,
    })),
);

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
    const [filterStatus] = useState<FilterStatus>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const [isCriticalExpanded, setIsCriticalExpanded] = useState(true);
    const [isPendingExpanded, setIsPendingExpanded] = useState(true);
    const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

    const [showFormModal, setShowFormModal] = useState(false);
    const [formModalRetryKey, setFormModalRetryKey] = useState(0);
    const showWorkspaceControls = embeddedInWorkspace || !!onCreateNew;

    const { cases, setCases, pendingCasesPersistRef, msPerDay } = useUrgentCasesStorage(userId);
    const {
        showDetailsModal,
        selectedCaseForDetails,
        dossierMountKey,
        selectedCaseFile,
        closeDossierPanel,
        retryDossierPanel,
        handleCaseClick,
        openDossierForCase,
        handleCaseUpdated,
    } = useUrgentDossierPanel({ cases, setCases, pendingCasesPersistRef });

    const lifecycle = useUrgentLifecycleModals({ cases, setCases, pendingCasesPersistRef });
    const { quickLogModal, handleQuickAction, closeQuickLogModal, handleQuickLogSubmit } = useUrgentQuickLog(
        cases,
        setCases,
        pendingCasesPersistRef,
    );

    const focusAppliedRef = useRef(false);
    useEffect(() => {
        if (!focusCaseId) {
            focusAppliedRef.current = false;
            return;
        }
        if (focusAppliedRef.current) return;
        if (!cases.some((c) => c.id === focusCaseId)) return;
        focusAppliedRef.current = true;
        preloadActiveOrderFilePanel();
        openDossierForCase(focusCaseId);
    }, [focusCaseId, cases, openDossierForCase]);

    const handleCaseClickWithPreload = useCallback(
        (caseId: string) => {
            preloadActiveOrderFilePanel();
            handleCaseClick(caseId);
        },
        [handleCaseClick],
    );

    const [scope, setScope] = useState<'active' | 'archive' | 'trash'>('active');

    const { criticalCases, pendingCases, completedCases, archivedCases, trashedCases } = useUrgentCasesFilter({
        cases,
        scope,
        filterStatus,
        searchQuery,
    });

    const handleAddNew = useCallback(() => {
        if (!userId) {
            SmartToast.error('يلزم تسجيل الدخول لإضافة طلب مستعجل');
            return;
        }
        setShowFormModal(true);
    }, [userId]);

    const archivedCount = useMemo(
        () =>
            cases.filter((c) => {
                const finalized =
                    isUrgentCaseClosed(c) || c.status === 'completed' || c.phase === 'completed';
                return !c.deleted && (!!c.archived || finalized);
            }).length,
        [cases],
    );
    const trashedCount = useMemo(() => cases.filter((c) => !!c.deleted).length, [cases]);

    const openManualArchive = useCallback(
        (caseId: string) => lifecycle.openArchiveModal(caseId, 'manual'),
        [lifecycle],
    );

    return (
        <div
            className={
                embeddedInWorkspace
                    ? 'h-full min-h-0 bg-[#0B1021] font-[\'Tajawal\'] px-4 py-3 pb-24 relative'
                    : 'min-h-screen bg-[#0B1021] font-[\'Tajawal\'] p-6 pb-24 relative'
            }
        >
            <div className={embeddedInWorkspace ? 'mb-3' : 'mb-8'}>
                {!embeddedInWorkspace ? (
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            {onBack ? (
                                <button
                                    type="button"
                                    onClick={onBack}
                                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                                >
                                    <ArrowLeft className="text-white" size={20} />
                                </button>
                            ) : null}
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">لوحة القضاء المستعجل</h1>
                            </div>
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
                completedCases={completedCases}
                archivedCases={archivedCases}
                trashedCases={trashedCases}
                isCriticalExpanded={isCriticalExpanded}
                isPendingExpanded={isPendingExpanded}
                isCompletedExpanded={isCompletedExpanded}
                onToggleCritical={() => setIsCriticalExpanded(!isCriticalExpanded)}
                onTogglePending={() => setIsPendingExpanded(!isPendingExpanded)}
                onToggleCompleted={() => setIsCompletedExpanded(!isCompletedExpanded)}
                onQuickAction={handleQuickAction}
                onCaseClick={handleCaseClickWithPreload}
                onArchive={openManualArchive}
                onTrash={lifecycle.openTrashModal}
                onUnarchive={lifecycle.unarchiveCase}
                onRestore={lifecycle.restoreFromTrash}
                onPermanentDelete={lifecycle.openPermanentDeleteModal}
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
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-rose-300/30 bg-[#7A2E3B]/92 px-4 text-sm font-bold text-[#F8E9EC] shadow-[0_10px_28px_rgba(40,10,18,0.45)] backdrop-blur-md touch-manipulation transition-transform duration-200 hover:scale-[1.03] hover:bg-[#8A3644] active:scale-95"
                >
                    <Plus size={18} strokeWidth={3} aria-hidden />
                    <span className="whitespace-nowrap">طلب مستعجل</span>
                </button>
            ) : null}

            <Modal_Quick_Log
                isOpen={quickLogModal.isOpen}
                onClose={closeQuickLogModal}
                actionType={quickLogModal.actionType}
                caseName={quickLogModal.caseName}
                onSubmit={handleQuickLogSubmit}
            />

            <UrgentLifecycleModals
                archiveModal={lifecycle.archiveModal}
                onArchiveReasonChange={(reason) =>
                    lifecycle.setArchiveModal((state) => ({ ...state, reason }))
                }
                onCloseArchive={lifecycle.closeArchiveModal}
                onConfirmArchive={lifecycle.confirmArchive}
                trashModal={lifecycle.trashModal}
                onTrashReasonChange={(reason) =>
                    lifecycle.setTrashModal((state) => ({ ...state, reason }))
                }
                onCloseTrash={lifecycle.closeTrashModal}
                onConfirmTrash={lifecycle.confirmTrash}
                permanentDeleteModal={lifecycle.permanentDeleteModal}
                onClosePermanentDelete={lifecycle.closePermanentDeleteModal}
                onConfirmPermanentDelete={lifecycle.confirmPermanentDelete}
            />

            {showFormModal ? (
                <ErrorBoundary
                    key={formModalRetryKey}
                    fallback={
                        <FormModalErrorFallback
                            onClose={() => setShowFormModal(false)}
                            onRetry={() => setFormModalRetryKey((k) => k + 1)}
                        />
                    }
                    onError={(error, info) => {
                        console.error('[UrgentOrders] form modal error:', error, info.componentStack);
                    }}
                >
                    <Suspense
                        fallback={
                            <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                                <div className="rounded-2xl border border-white/10 bg-[#0B1021] px-6 py-5 text-center">
                                    <p className="text-white font-extrabold text-sm">جاري تحميل نموذج الطلب…</p>
                                </div>
                            </div>
                        }
                    >
                        <LazyFormUrgentActions
                            onClose={() => setShowFormModal(false)}
                            onSave={(data: Record<string, unknown>) => {
                                if (!userId) {
                                    SmartToast.error('يلزم تسجيل الدخول لحفظ طلب مستعجل');
                                    return;
                                }
                                SmartToast.success('تم حفظ الطلب بنجاح');
                                const newCase = createCaseFromForm(data, { msPerDay });
                                setCases((prev) => {
                                    const next = [newCase, ...prev];
                                    pendingCasesPersistRef.current = true;
                                    return next;
                                });
                                setShowFormModal(false);
                                openDossierForCase(newCase.id);
                            }}
                            initialActionType="state_order"
                        />
                    </Suspense>
                </ErrorBoundary>
            ) : null}

            {showDetailsModal && selectedCaseForDetails ? (
                selectedCaseFile ? (
                    <ErrorBoundary
                        key={`${selectedCaseForDetails}-${dossierMountKey}`}
                        fallback={
                            <DossierPanelErrorFallback onClose={closeDossierPanel} onRetry={retryDossierPanel} />
                        }
                        onError={(error, info) => {
                            console.error('[UrgentOrders] dossier panel error:', error, info.componentStack);
                        }}
                    >
                        <DeferredActiveOrderFile
                            fileData={selectedCaseFile}
                            onCaseUpdated={handleCaseUpdated}
                            onClose={closeDossierPanel}
                        />
                    </ErrorBoundary>
                ) : (
                    <DossierOpeningFallback />
                )
            ) : null}
        </div>
    );
};
