import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    AlertTriangle, Clock, CheckCircle2,
    Plus, ArrowLeft, FileArchive, Trash2
} from 'lucide-react';
import {
    Component_Urgent_Card,
    type UrgentCase,
    type UrgentCaseStatus,
    computeUrgentCaseStatus,
} from './Component_Urgent_Card';
import { Modal_Quick_Log } from './Modal_Quick_Log';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { DashboardControls } from './View_Urgent_And_Orders_Dashboard/DashboardControls';
import { DashboardSection } from './View_Urgent_And_Orders_Dashboard/DashboardSection';
import type { ViewMode, FilterStatus, Props } from './View_Urgent_And_Orders_Dashboard/types';
import { useAuth } from '@/app/context/AuthContext';
import { loadPersistedViewMode, persistViewMode } from '@/app/services/settings/builtInBehavior';
import { DeferredActiveOrderFile, preloadActiveOrderFilePanel } from './DeferredActiveOrderFile';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import DossierOpeningFallback from '@/app/components/lawyer/LawyerDashboardParts/components/DossierOpeningFallback';
import { createCaseFromForm } from '@/app/domain/urgent';
import { useUrgentCasesStorage } from './View_Urgent_And_Orders_Dashboard/hooks/useUrgentCasesStorage';
import { useUrgentCasesFilter } from './View_Urgent_And_Orders_Dashboard/hooks/useUrgentCasesFilter';
import { useUrgentDossierPanel } from './View_Urgent_And_Orders_Dashboard/hooks/useUrgentDossierPanel';
import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';

const LazyFormUrgentActions = lazyWithRetry(() =>
    import('./Form_Urgent_Actions').then((m) => ({
        default: m.Form_Urgent_Actions as unknown as LazyComponent,
    })),
);

function DossierPanelErrorFallback({
    onClose,
    onRetry,
}: {
    onClose: () => void;
    onRetry: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl border border-red-500/30 bg-[#0B1021] p-6 text-center">
                <p className="text-red-400 font-extrabold text-lg">تعذّر فتح الإضبارة</p>
                <p className="mt-2 text-white/50 text-sm">حدث خطأ أثناء تحميل الملف. يمكنك إعادة المحاولة أو الإغلاق.</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-xs font-bold rounded-xl px-4 py-2 border border-white/20 text-white/80 hover:bg-white/10"
                    >
                        إغلاق
                    </button>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="text-xs font-bold rounded-xl px-4 py-2 border border-[#E6C673]/40 text-[#E6C673] hover:bg-[#E6C673]/10"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        </div>
    );
}

function FormModalErrorFallback({
    onClose,
    onRetry,
}: {
    onClose: () => void;
    onRetry: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl border border-red-500/30 bg-[#0B1021] p-6 text-center">
                <p className="text-red-400 font-extrabold text-lg">تعذّر فتح نموذج الطلب</p>
                <p className="mt-2 text-white/50 text-sm">حدث خطأ أثناء تحميل النموذج. يمكنك إعادة المحاولة.</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-xs font-bold rounded-xl px-4 py-2 border border-white/20 text-white/80 hover:bg-white/10"
                    >
                        إغلاق
                    </button>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="text-xs font-bold rounded-xl px-4 py-2 border border-[#E6C673]/40 text-[#E6C673] hover:bg-[#E6C673]/10"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        </div>
    );
}

export const View_Urgent_And_Orders_Dashboard: React.FC<Props> = ({
    onBack,
    onCreateNew,
    onViewDetails,
    focusCaseId,
    embeddedInWorkspace = false,
}) => {
    const { user: authUser, isLoading: authLoading } = useAuth();
    const userId = useMemo(() => {
        if (authLoading) return null;
        return authUser?.id ?? 'dev-user-uuid-1';
    }, [authUser?.id, authLoading]);

    const [viewMode, setViewMode] = useState<ViewMode>(() => loadPersistedViewMode());

    const handleViewModeChange = useCallback((mode: ViewMode) => {
        setViewMode(mode);
        persistViewMode(mode);
        if (typeof document !== 'undefined') {
            document.documentElement.dataset.hamiViewMode = mode;
        }
    }, []);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const [isCriticalExpanded, setIsCriticalExpanded] = useState(true);
    const [isPendingExpanded, setIsPendingExpanded] = useState(true);
    const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

    const [quickLogModal, setQuickLogModal] = useState<{
        isOpen: boolean;
        actionType: 'notification' | 'grievance' | 'cassation';
        caseId: string;
        caseName: string;
    }>({
        isOpen: false,
        actionType: 'notification',
        caseId: '',
        caseName: ''
    });

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

    const [archiveModal, setArchiveModal] = useState<{
        isOpen: boolean;
        caseId: string;
        reason: string;
        mode: 'auto' | 'manual';
    }>({ isOpen: false, caseId: '', reason: '', mode: 'manual' });
    const [trashModal, setTrashModal] = useState<{
        isOpen: boolean;
        caseId: string;
        reason: string;
    }>({ isOpen: false, caseId: '', reason: '' });
    const [permanentDeleteModal, setPermanentDeleteModal] = useState<{
        isOpen: boolean;
        caseId: string;
        countdown: number;
    }>({ isOpen: false, caseId: '', countdown: 5 });
    const permanentDeleteTimerRef = useRef<number | null>(null);
    const defaultArchiveReason = 'اكتسب القرار الدرجة القطعية وتم إغلاق الإضبارة';

    const { criticalCases, pendingCases, completedCases, archivedCases, trashedCases } = useUrgentCasesFilter({
        cases,
        scope,
        filterStatus,
        searchQuery,
    });

    useEffect(() => {
        if (!permanentDeleteModal.isOpen) return;
        if (permanentDeleteTimerRef.current) {
            window.clearInterval(permanentDeleteTimerRef.current);
            permanentDeleteTimerRef.current = null;
        }
        permanentDeleteTimerRef.current = window.setInterval(() => {
            setPermanentDeleteModal((prev) => {
                const next = Math.max(0, prev.countdown - 1);
                if (next === 0 && permanentDeleteTimerRef.current) {
                    window.clearInterval(permanentDeleteTimerRef.current);
                    permanentDeleteTimerRef.current = null;
                }
                return { ...prev, countdown: next };
            });
        }, 1000);
        return () => {
            if (permanentDeleteTimerRef.current) {
                window.clearInterval(permanentDeleteTimerRef.current);
                permanentDeleteTimerRef.current = null;
            }
        };
    }, [permanentDeleteModal.isOpen]);

    const handleQuickAction = useCallback((
        actionType: 'notification' | 'grievance' | 'cassation',
        caseId: string
    ) => {
        const caseData = cases.find((c) => c.id === caseId);
        if (!caseData) return;

        setQuickLogModal({
            isOpen: true,
            actionType,
            caseId,
            caseName: `${caseData.actionType} - ${caseData.applicantName}`
        });
    }, [cases]);

    const handleQuickLogSubmit = (data: any) => {
        setCases(prev => {
            const next: UrgentCase[] = prev.map((c): UrgentCase => {
                if (c.id === quickLogModal.caseId) {
                    if (quickLogModal.actionType === 'notification') {
                        const updated: UrgentCase = { ...c, isNotificationConfirmed: true };
                        return { ...updated, status: computeUrgentCaseStatus(updated) };
                    } else if (quickLogModal.actionType === 'grievance') {
                        const updated: UrgentCase = {
                            ...c,
                            phase: 'cassation_window',
                            grievanceResult: data.result as UrgentCase['grievanceResult'],
                        };
                        return { ...updated, status: computeUrgentCaseStatus(updated) };
                    } else if (quickLogModal.actionType === 'cassation') {
                        return { ...c, phase: 'completed', status: 'completed' as UrgentCaseStatus };
                    }
                }
                return c;
            });
            pendingCasesPersistRef.current = true;
            return next;
        });

        setQuickLogModal({ ...quickLogModal, isOpen: false });
    };

    const openArchiveModal = (caseId: string, mode: 'auto' | 'manual') => {
        const target = cases.find((c) => c.id === caseId);
        const autoText = target?.status === 'completed' ? defaultArchiveReason : '';
        setArchiveModal({ isOpen: true, caseId, reason: autoText, mode });
    };

    const confirmArchive = () => {
        const reason = archiveModal.reason.trim() || defaultArchiveReason;
        if (!archiveModal.caseId) return;
        setCases((prev) => {
            const now = new Date().toISOString();
            const next = prev.map((c) =>
                c.id === archiveModal.caseId ? { ...c, archived: true, archivedAt: now, archivedReason: reason } : c,
            );
            pendingCasesPersistRef.current = true;
            return next;
        });
        setArchiveModal({ isOpen: false, caseId: '', reason: '', mode: 'manual' });
    };

    const unarchiveCase = (caseId: string) => {
        setCases((prev) => {
            const next = prev.map((c) => (c.id === caseId ? { ...c, archived: false, archivedAt: null, archivedReason: null } : c));
            pendingCasesPersistRef.current = true;
            return next;
        });
    };

    const openTrashModal = (caseId: string) => {
        setTrashModal({ isOpen: true, caseId, reason: '' });
    };

    const confirmTrash = () => {
        if (!trashModal.caseId) return;
        const reason = trashModal.reason.trim();
        setCases((prev) => {
            const now = new Date().toISOString();
            const next = prev.map((c) =>
                c.id === trashModal.caseId ? { ...c, deleted: true, deletedAt: now, deletedReason: reason || null } : c,
            );
            pendingCasesPersistRef.current = true;
            return next;
        });
        setTrashModal({ isOpen: false, caseId: '', reason: '' });
    };

    const restoreFromTrash = (caseId: string) => {
        setCases((prev) => {
            const next = prev.map((c) => (c.id === caseId ? { ...c, deleted: false, deletedAt: null, deletedReason: null } : c));
            pendingCasesPersistRef.current = true;
            return next;
        });
    };

    const openPermanentDeleteModal = (caseId: string) => {
        setPermanentDeleteModal({ isOpen: true, caseId, countdown: 5 });
    };

    const confirmPermanentDelete = () => {
        if (!permanentDeleteModal.caseId) return;
        const removedId = permanentDeleteModal.caseId;
        setCases((prev) => {
            const next = prev.filter((c) => c.id !== removedId);
            pendingCasesPersistRef.current = true;
            return next;
        });
        unpinWorkspaceItem(removedId, 'urgent');
        setPermanentDeleteModal({ isOpen: false, caseId: '', countdown: 5 });
    };

    return (
        <div className="min-h-screen bg-[#0B1021] font-['Tajawal'] p-6">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button type="button"
                                onClick={onBack}
                                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                            >
                                <ArrowLeft className="text-white" size={20} />
                            </button>
                        )}
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                لوحة القضاء المستعجل
                            </h1>
                        </div>
                    </div>

                    {showWorkspaceControls && (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                                <button
                                    type="button"
                                    onClick={() => setScope('active')}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                        scope === 'active' ? 'bg-[#E6C673] text-[#0B1021]' : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    الفعّالة
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScope('archive')}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                        scope === 'archive' ? 'bg-[#E6C673] text-[#0B1021]' : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    الأرشيف
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScope('trash')}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                        scope === 'trash' ? 'bg-[#E6C673] text-[#0B1021]' : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    سلة المهملات
                                </button>
                            </div>

                            <button type="button"
                                onClick={() => setShowFormModal(true)}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#E6C673] to-[#D4AF37] text-[#0B1021] font-bold hover:opacity-90 transition-all shadow-lg"
                            >
                                <Plus size={18} />
                                <span>إضافة جديد</span>
                            </button>
                        </div>
                    )}
                </div>

                <DashboardControls
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    filterStatus={filterStatus}
                    onFilterChange={setFilterStatus}
                    viewMode={viewMode}
                    onViewModeChange={handleViewModeChange}
                />
            </div>

            {scope === 'active' && criticalCases.length > 0 && (
                <DashboardSection
                    title="🚨 مواعيد حرجة (تنتهي خلال 48 ساعة)"
                    subtitle="يتطلب تدخل فوري"
                    icon={AlertTriangle}
                    iconBgClass="bg-red-500/20"
                    iconColorClass="text-red-400"
                    borderClass="border-red-500/50"
                    gradientClass="bg-gradient-to-r from-red-900/40 to-rose-800/20"
                    count={criticalCases.length}
                    isExpanded={isCriticalExpanded}
                    onToggle={() => setIsCriticalExpanded(!isCriticalExpanded)}
                    cases={criticalCases}
                    viewMode={viewMode}
                    onQuickAction={handleQuickAction}
                    onCaseClick={handleCaseClickWithPreload}
                    onArchive={(caseId) => openArchiveModal(caseId, 'manual')}
                    onTrash={openTrashModal}
                    scope="active"
                />
            )}

            {scope === 'active' && pendingCases.length > 0 && (
                <DashboardSection
                    title="⏳ قيد الانتظار / ضمن المدة"
                    subtitle="نشط"
                    icon={Clock}
                    iconBgClass="bg-blue-500/20"
                    iconColorClass="text-blue-400"
                    borderClass="border-blue-500/30"
                    gradientClass="bg-gradient-to-r from-blue-900/30 to-blue-800/10"
                    count={pendingCases.length}
                    isExpanded={isPendingExpanded}
                    onToggle={() => setIsPendingExpanded(!isPendingExpanded)}
                    cases={pendingCases}
                    viewMode={viewMode}
                    onQuickAction={handleQuickAction}
                    onCaseClick={handleCaseClickWithPreload}
                    onArchive={(caseId) => openArchiveModal(caseId, 'manual')}
                    onTrash={openTrashModal}
                    scope="active"
                />
            )}

            {scope === 'active' && completedCases.length > 0 && (
                <DashboardSection
                    title="✅ منجزة ومكتسبة الدرجة القطعية"
                    subtitle="مكتمل"
                    icon={CheckCircle2}
                    iconBgClass="bg-green-500/20"
                    iconColorClass="text-green-400"
                    borderClass="border-green-500/20"
                    gradientClass="bg-gradient-to-r from-green-900/20 to-emerald-800/5"
                    count={completedCases.length}
                    isExpanded={isCompletedExpanded}
                    onToggle={() => setIsCompletedExpanded(!isCompletedExpanded)}
                    cases={completedCases}
                    viewMode={viewMode}
                    onQuickAction={handleQuickAction}
                    onCaseClick={handleCaseClickWithPreload}
                    onArchive={(caseId) => openArchiveModal(caseId, 'manual')}
                    onTrash={openTrashModal}
                    scope="active"
                />
            )}

            {scope === 'archive' && (
                <DashboardSection
                    title="📦 الأرشيف"
                    subtitle="مؤرشف"
                    icon={FileArchive}
                    iconBgClass="bg-white/10"
                    iconColorClass="text-white/60"
                    borderClass="border-white/10"
                    gradientClass="bg-gradient-to-r from-slate-900/30 to-slate-800/10"
                    count={archivedCases.length}
                    isExpanded={true}
                    onToggle={() => {}}
                    cases={archivedCases}
                    viewMode={viewMode}
                    onQuickAction={handleQuickAction}
                    onCaseClick={handleCaseClickWithPreload}
                    onUnarchive={unarchiveCase}
                    onTrash={openTrashModal}
                    scope="archive"
                />
            )}

            {scope === 'trash' && (
                <DashboardSection
                    title="🗑️ سلة المهملات"
                    subtitle="محذوف"
                    icon={Trash2}
                    iconBgClass="bg-red-500/10"
                    iconColorClass="text-red-200"
                    borderClass="border-red-500/20"
                    gradientClass="bg-gradient-to-r from-red-900/20 to-rose-800/10"
                    count={trashedCases.length}
                    isExpanded={true}
                    onToggle={() => {}}
                    cases={trashedCases}
                    viewMode={viewMode}
                    onQuickAction={handleQuickAction}
                    onCaseClick={handleCaseClickWithPreload}
                    onRestore={restoreFromTrash}
                    onPermanentDelete={openPermanentDeleteModal}
                    scope="trash"
                />
            )}

            {scope === 'active' && criticalCases.length === 0 && pendingCases.length === 0 && completedCases.length === 0 && (
                <div className="text-center py-20">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <Clock className="text-white/30" size={40} />
                    </div>
                    <h3 className="text-white/60 font-bold text-lg mb-2">لا توجد مواعيد حرجة أو طلبات مستعجلة حالياً</h3>
                    <p className="text-white/40 text-sm mb-6">
                        {searchQuery ? 'لم يتم العثور على نتائج للبحث' : 'لم يتم إنشاء أي إجراءات مستعجلة أو أوامر ولائية بعد'}
                    </p>
                    {onCreateNew && (
                        <button type="button"
                            onClick={onCreateNew}
                            className="px-6 py-3 rounded-lg bg-[#E6C673] text-[#0B1021] font-bold hover:opacity-90 transition-all"
                        >
                            إنشاء إجراء جديد
                        </button>
                    )}
                </div>
            )}

            {scope === 'archive' && archivedCases.length === 0 && (
                <div className="text-center py-20">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <FileArchive className="text-white/30" size={40} />
                    </div>
                    <h3 className="text-white/60 font-bold text-lg mb-2">لا توجد ملفات مؤرشفة</h3>
                    <p className="text-white/40 text-sm">سيظهر الأرشيف هنا بعد أرشفة الملفات المنجزة</p>
                </div>
            )}

            {scope === 'trash' && trashedCases.length === 0 && (
                <div className="text-center py-20">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="text-white/30" size={40} />
                    </div>
                    <h3 className="text-white/60 font-bold text-lg mb-2">سلة المهملات فارغة</h3>
                    <p className="text-white/40 text-sm">الملفات المحذوفة ستظهر هنا ويمكن استعادتها</p>
                </div>
            )}

            <Modal_Quick_Log
                isOpen={quickLogModal.isOpen}
                onClose={() => setQuickLogModal({ ...quickLogModal, isOpen: false })}
                actionType={quickLogModal.actionType}
                caseName={quickLogModal.caseName}
                onSubmit={handleQuickLogSubmit}
            />

            <AnimatePresence>
                {archiveModal.isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setArchiveModal({ isOpen: false, caseId: '', reason: '', mode: 'manual' })}
                    >
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.98, opacity: 0 }}
                            className="w-full max-w-lg rounded-2xl bg-[#0B1021] border border-white/10 p-5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-white font-extrabold text-lg">📦 أرشفة الملف</div>
                            <div className="text-white/60 text-sm mt-1">
                                {archiveModal.mode === 'auto'
                                    ? 'تم إنهاء الإضبارة. هل تريد أرشفتها الآن؟'
                                    : 'سيتم نقل الملف إلى الأرشيف ويمكن إرجاعه لاحقاً.'}
                            </div>
                            <div className="mt-4">
                                <label className="block text-white/70 text-sm mb-2">سبب الأرشفة</label>
                                <textarea
                                    value={archiveModal.reason}
                                    onChange={(e) => setArchiveModal((s) => ({ ...s, reason: e.target.value }))}
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#E6C673] focus:outline-none"
                                    placeholder="مثال: اكتسب الدرجة القطعية / تم استرداد الحقوق / لا يوجد إجراء متبقٍ..."
                                />
                            </div>
                            <div className="mt-4 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setArchiveModal({ isOpen: false, caseId: '', reason: '', mode: 'manual' })}
                                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all"
                                >
                                    {archiveModal.mode === 'auto' ? 'لاحقاً' : 'إغلاق'}
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmArchive}
                                    className="px-4 py-2 rounded-lg bg-[#E6C673] text-[#0B1021] text-sm font-extrabold hover:opacity-90 transition-all"
                                >
                                    تأكيد الأرشفة
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {trashModal.isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setTrashModal({ isOpen: false, caseId: '', reason: '' })}
                    >
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.98, opacity: 0 }}
                            className="w-full max-w-lg rounded-2xl bg-[#0B1021] border border-white/10 p-5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-white font-extrabold text-lg">🗑️ نقل إلى سلة المهملات</div>
                            <div className="text-white/60 text-sm mt-1">لن يتم حذف الملف نهائياً، ويمكن استعادته لاحقاً.</div>
                            <div className="mt-3 border border-amber-500/25 bg-amber-500/10 rounded-lg px-3 py-2 text-amber-100 text-xs font-bold">
                                ⚠️ تحذير: النقل إلى سلة المهملات يُستخدم فقط للملفات غير المكتملة. الملفات المنجزة تُؤرشف ولا تُحذف.
                            </div>
                            <div className="mt-4">
                                <label className="block text-white/70 text-sm mb-2">سبب الحذف (اختياري)</label>
                                <textarea
                                    value={trashModal.reason}
                                    onChange={(e) => setTrashModal((s) => ({ ...s, reason: e.target.value }))}
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-red-500/40 focus:outline-none"
                                />
                            </div>
                            <div className="mt-4 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTrashModal({ isOpen: false, caseId: '', reason: '' })}
                                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmTrash}
                                    className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-extrabold hover:bg-red-600 transition-all"
                                >
                                    نقل إلى سلة المهملات
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {permanentDeleteModal.isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setPermanentDeleteModal({ isOpen: false, caseId: '', countdown: 5 })}
                    >
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.98, opacity: 0 }}
                            className="w-full max-w-lg rounded-2xl bg-[#0B1021] border border-white/10 p-5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-white font-extrabold text-lg">🔥 حذف نهائي</div>
                            <div className="text-white/60 text-sm mt-1">
                                سيتم حذف الملف نهائياً من سلة المهملات ولا يمكن استعادته بعد ذلك.
                            </div>
                            <div className="mt-3 border border-red-500/25 bg-red-500/10 rounded-lg px-3 py-2 text-red-100 text-xs font-bold">
                                ⚠️ تحذير: هذا إجراء غير قابل للتراجع.
                            </div>
                            <div className="mt-4 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPermanentDeleteModal({ isOpen: false, caseId: '', countdown: 5 })}
                                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all"
                                >
                                    إغلاق
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmPermanentDelete}
                                    disabled={permanentDeleteModal.countdown > 0}
                                    className={`px-4 py-2 rounded-lg text-sm font-extrabold transition-all ${
                                        permanentDeleteModal.countdown > 0
                                            ? 'bg-red-500/30 text-white/50 cursor-not-allowed'
                                            : 'bg-red-500 text-white hover:bg-red-600'
                                    }`}
                                >
                                    {permanentDeleteModal.countdown > 0 ? `انتظر ${permanentDeleteModal.countdown} ثواني` : 'حذف نهائي'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {showFormModal && (
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
                        SmartToast.success('✅ تم حفظ الطلب بنجاح');
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
            )}

            {showDetailsModal && selectedCaseForDetails && (
                selectedCaseFile ? (
                    <ErrorBoundary
                        key={`${selectedCaseForDetails}-${dossierMountKey}`}
                        fallback={<DossierPanelErrorFallback onClose={closeDossierPanel} onRetry={retryDossierPanel} />}
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
            )}
        </div>
    );
};
