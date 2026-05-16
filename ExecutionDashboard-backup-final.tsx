// ✅ PERFORMANCE OPTIMIZED - v11.1 - Zustand modals + useCallback + optimized useEffect
import React, {
    useState,
    useMemo,
    useEffect,
    useLayoutEffect,
    useCallback,
    useRef,
    startTransition,
    Suspense,
    lazy,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { debug } from '@/app/utils/debug';
import { calculateGlobalFileState, getStatusMetadata } from '@/app/utils/executionStateMachine';
// ✅ NEW: Import fixed calculation functions for 7-day grace period
import {
    calculateActualDaysElapsed,
    calculateDaysRemaining,
    formatDateToLocalYmd,
    getLocalTodayYmd,
    isGracePeriodExpired,
    parseLocalNotificationDate,
} from '@/app/utils/executionStateMachine';
import {
    canBeForcefullySummoned,
    deriveEmploymentType,
    deriveMonetaryClaimNature,
} from '@/app/utils/summoningImmunityEngine';
import { 
    X, Gavel, DollarSign, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
    Calendar, FileText, FolderOpen, Scale,
    Clock, AlertCircle, CheckCircle, Users, Bell,
    MessageSquare, Activity, Zap, Trash2, Trash,
    Share2, BookOpen, Book, History, Phone, MapPin, Pencil, Bot,
    TrendingUp, Wallet, CreditCard, Handshake, BadgeCheck, Shield,
    XCircle, Pause, Play, Car, Home, ClipboardList, Sparkles, UserCheck, Building2, Package, Send, MoreVertical
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// MODULAR HELPERS - دوال مساعدة معيارية
// ═══════════════════════════════════════════════════════════════════════════
import {
    // Progress Bars
    DebtorFinancialProgressBar,
    executionDebtorRowCleared,
    // Date Utilities
    evictionLocalYmdToday,
    evictionInclusiveCalendarDays,
    // Seizure Utilities
    seizureCoerciveKeyFromAssetType,
    stripSeizureTypeDecorators,
    isSalarySeizureRow,
    isMovablePropertySeizureRow,
    // Heir Utilities
    makeHeirRowId,
    heirsDetailsIncludeClient,
    heirRowCompletenessScore,
    dedupeHeirDetailRowsByName,
    heirRowHasAnyText,
    type HeirDetailRow,
    // Dossier Lifecycle Utilities
    dossierLifecycleLabelAr,
    dossierLifecycleTriggerTextClass,
    dossierLifecycleTriggerDotClass,
} from './ExecutionDashboard/helpers';

// ═══════════════════════════════════════════════════════════════════════════
// MODULAR COMPONENTS - مكونات معيارية
// ═══════════════════════════════════════════════════════════════════════════
import { ExecutionToast } from './ExecutionDashboard/components/ExecutionToast';
import { ExecutionTrashModal } from './ExecutionDashboard/components/ExecutionTrashModal';
import { FinancialTabsHeader } from './ExecutionDashboard/components/FinancialTabsHeader';
import { FinancialSeizureLogModal } from './ExecutionDashboard/components/FinancialSeizureLogModal';
import { MovableSeizureRegistry } from './ExecutionDashboard/components/MovableSeizureRegistry';
import { SalarySeizureRegistry } from './ExecutionDashboard/components/SalarySeizureRegistry';
import { ThirdPartySeizureRegistry } from './ExecutionDashboard/components/ThirdPartySeizureRegistry';
import { StandaloneExecutionMarksRegistry } from './ExecutionDashboard/components/StandaloneExecutionMarksRegistry';
import { CoerciveActionsModal } from './ExecutionDashboard/components/CoerciveActionsModal';
import { PoliceAssistanceDetailsModal } from './ExecutionDashboard/components/PoliceAssistanceDetailsModal';
import { NotificationModal } from './ExecutionDashboard/components/NotificationModal';
import { EvictionResidentialGraceModal } from './ExecutionDashboard/components/EvictionResidentialGraceModal';
import { NotesModal } from './ExecutionDashboard/components/NotesModal';
import { TimelineModal } from './ExecutionDashboard/components/TimelineModal';
import { AppointmentModal } from './ExecutionDashboard/components/AppointmentModal';
import { PaymentModal } from './ExecutionDashboard/components/PaymentModal';
import { EditDossierMetaModal } from './ExecutionDashboard/components/EditDossierMetaModal';
import { SeizedAssetsModal } from './ExecutionDashboard/components/SeizedAssetsModal';
import { PauseModal } from './ExecutionDashboard/components/PauseModal';
import { DecisionsModal } from './ExecutionDashboard/components/DecisionsModal';
import { DocumentsModal } from './ExecutionDashboard/components/DocumentsModal';
import { SolidaryCoerciveTargetModal } from './ExecutionDashboard/components/SolidaryCoerciveTargetModal';
import { EvictionExpenseModal } from './ExecutionDashboard/components/EvictionExpenseModal';
import { EvictionLawyerFeeModal } from './ExecutionDashboard/components/EvictionLawyerFeeModal';
import { HeirsNotificationModal } from './ExecutionDashboard/components/HeirsNotificationModal';
import { CoerciveActionFormModal } from './ExecutionDashboard/components/CoerciveActionFormModal';
import { UnifiedExecutionModal } from './ExecutionDashboard/components/UnifiedExecutionModal';
import { UnifiedSummonsModal } from './ExecutionDashboard/components/UnifiedSummonsModal-simple';
import { LedgerModal } from './ExecutionDashboard/components/LedgerModal';

const SMART_REQUEST_TEMPLATE_OPTIONS = [
    'طلب الإنابة التنفيذية',
    'طلب توحيد الأضابير',
    'طلب نقل الإضبارة',
    'طلب تجديد الإضبارة',
    'طلب تصحيح خطأ مادي',
    'مفاتحة التسجيل العقاري',
    'مفاتحة مديرية المرور',
    'مفاتحة المصارف',
    'مفاتحة مسجل الشركات',
    'مفاتحة دوائر الدولة',
    'مفاتحة الضرائب والكمارك',
    'مفاتحة البطاقة الوطنية والأجهزة الأمنية',
    'طلب انتداب خبير/خبراء',
    'الاعتراض على تقرير الخبراء',
    'تحديد موعد المزايدة العلنية',
    'الإحالة القطعية',
] as const;

const StayOfExecutionModal = lazy(() =>
    import('@/app/components/lawyer/execution/StayOfExecutionModal').then((m) => ({
        default: m.StayOfExecutionModal,
    }))
);
const PartyDeathReportModal = lazy(() =>
    import('@/app/components/lawyer/execution/PartyDeathReportModal').then((m) => ({
        default: m.PartyDeathReportModal,
    }))
);
const RealEstateSeizurePostApprovalModal = lazy(() =>
    import('@/app/components/lawyer/execution/RealEstateSeizurePostApprovalModal').then((m) => ({
        default: m.RealEstateSeizurePostApprovalModal,
    }))
);
const ThirdPartySeizureInitModal = lazy(() =>
    import('@/app/components/lawyer/execution/ThirdPartySeizureInitModal').then((m) => ({
        default: m.ThirdPartySeizureInitModal,
    }))
);
const StandaloneExecutionMarkInitModal = lazy(() =>
    import('@/app/components/lawyer/execution/StandaloneExecutionMarkInitModal').then((m) => ({
        default: m.StandaloneExecutionMarkInitModal,
    }))
);
const GuarantorDetailsPostApprovalModal = lazy(() =>
    import('@/app/components/lawyer/execution/GuarantorDetailsPostApprovalModal').then((m) => ({
        default: m.GuarantorDetailsPostApprovalModal,
    }))
);
const ExecutionLawReferencePanel = lazy(() =>
    import('@/app/components/lawyer/execution/ExecutionLawReferencePanel').then((m) => ({
        default: m.ExecutionLawReferencePanel,
    }))
);
const ClientWalletExecutionSection = lazy(() =>
    import('./ClientWalletExecutionSection').then((m) => ({ default: m.ClientWalletExecutionSection }))
);
// 🆕 V10.5: ENHANCED UTILITIES
import { storageCache } from '@/app/utils/storageCache';
import {
    executionExpensesChangedEventName,
    executionExpensesStorageKey,
    executionStorageKey,
} from '@/app/utils/executionStorageKeys';
import { logErrorWithContext } from '@/app/utils/errorHandler';
import { PerformanceMonitor } from '@/app/utils/performanceMonitor';
import { useStandardSubmit } from '@/app/hooks/useStandardSubmit';
import { useExecutionAppealBannerState } from '@/app/hooks/useHasActiveExecutionAppeals';
import { supabase } from '@/app/lib/supabase-client';
import {
    buildExecutionCaseSnapshot,
    shouldAutoRunCopilot,
    snapshotFingerprint,
} from '@/app/utils/executionCopilot';
import { dedupeTimelineEventsSameSecond, mergeSimilarRecentTimelineEvent } from '@/app/utils/timelineDedup';
import { buildExecutionTimelineSnapshot } from '@/app/utils/buildExecutionTimelineSnapshot';
import type { TimelineEventDbRow } from '@/app/types/supabase-timeline';
import { useShallow as shallow } from 'zustand/react/shallow';
import { ExecutionDashboardSkeleton } from '@/app/components/ui/Skeleton';
// ✅ FIXED: Import proper types
import type {
    ExecutionFile,
    TimelineEvent,
    SeizedAsset,
    RealEstateSeizureAsset,
    ThirdPartySeizureAsset,
    StandaloneExecutionMark,
    Debtor,
    Creditor,
    Party,
    EvictionSubsequentSummonsMeta,
    DossierLifecycleStatus,
    AdditionalExecutionCreditor,
} from '@/app/types/execution';
import {
    guarantorFollowupAwaitingDetailsSave,
    normalizeDossierLifecycleStatus,
} from '@/app/types/execution';
import {
    getDebtorSummonsProfile,
    shouldShowEmployeeSalaryCapture,
    isEmployeeMonetaryFinancialPath,
    isEarnerLikeSummonsBranch,
    isHybridFeesNonMonetaryPrincipal,
    executionMonetaryStrictPath,
} from '@/app/utils/debtorSummonsProfile';
import {
    appendGuarantorFollowupRequest,
    appendTrustDisburseRequest,
    appendCreditorPartyDeathRequest,
    appendPersonalCoerciveExecutorRequest,
    appendPendingExecutorSeizureDecision,
    appendSpecialFollowupRequest,
    appendDebtorHeirSubstitutionRequest,
    computeGuarantorApprovalMergePatch,
    getCreditorHeirSubstitutionRequestStatus,
    getDebtorHeirSubstitutionRequestStatus,
    hasApprovedUnifiedCollection,
    findLatestHeirSubstitutionDecisionNeedingEntry,
    patchExecutorDecisionRow,
    readExecutorDecisionsArray,
    getExecutorDecisionRowById,
} from '@/app/utils/executorSeizureDecisionQueue';
import { executionRowAppealPipelineActive } from '@/app/utils/executionDecisionAppealActive';
import { buildExecutionMergeForCreditorPartyDeath } from '@/app/utils/creditorPartyDeathPersistence';
import {
    getExecutionModuleStrategy,
    isEvictionClaim,
    inferEvictionPremisesUse,
    formatClaimTypeArabic,
    hasAnyEvictionFieldStepRecorded,
    getResidentialVacateDeadlineMaxIso,
    isVacateDeadlinePassed,
    hasEvictionTimelineAction,
    EVICTION_TIMELINE_ACTION_IDS,
} from '@/app/utils/executionModuleStrategies';
import type { EvictionTimelineActionId } from '@/app/utils/executionModuleStrategies';
import {
    defaultEvictionEarnerFeeCollectionSM,
    reduceEvictionEarnerFeeSm,
    type EarnerFeeSmAction,
    type EvictionEarnerFeeCollectionSM,
} from '@/app/utils/evictionEarnerFeeCollectionMachine';
import { parseLooseAmountFromText } from '@/app/utils/looseAmountParse';
import type { PartyDeathSavePayload } from '@/app/components/lawyer/execution/PartyDeathReportModal';
import { ExecutionPartySpecialActionsMenu } from '@/app/components/lawyer/execution/ExecutionPartySpecialActionsMenu';
import {
    ExecutionPartyInteractiveBadges,
    type TaklifAssignmentBadgeInfo,
    type PublicationNoticeBadgeInfo,
    type EvictionGraceBadgeInfo,
    type PoliceAssistanceBadgeInfo,
} from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';
import { DebtorSeizureCategoryBadges } from '@/app/components/lawyer/execution/DebtorSeizureCategoryBadges';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';
const PremiumTimelineAuditLog = lazy(() =>
    import('@/app/components/lawyer/PremiumTimelineAuditLog').then((m) => ({
        default: m.PremiumTimelineAuditLog,
    }))
);
const SmartTimelineRadar = lazy(() =>
    import('@/app/components/lawyer/SmartTimelineRadar').then((m) => ({
        default: m.SmartTimelineRadar,
    }))
);
const ExecutionDashboardModularHost = lazy(() =>
    import('@/app/components/lawyer/ExecutionDashboard/ExecutionDashboardModularHost').then((m) => ({
        default: m.ExecutionDashboardModularHost,
    }))
);
const PersonalCoerciveFollowupPanel = lazy(() =>
    import('@/app/components/lawyer/execution/PersonalCoerciveFollowupPanel').then((m) => ({
        default: m.PersonalCoerciveFollowupPanel,
    }))
);
const EmployeeAssignmentCoerciveFollowupBlock = lazy(() =>
    import('@/app/components/lawyer/execution/EmployeeAssignmentCoerciveFollowupBlock').then((m) => ({
        default: m.EmployeeAssignmentCoerciveFollowupBlock,
    }))
);
const JudicialCustodianCardMenu = lazy(() =>
    import('@/app/components/lawyer/execution/JudicialCustodianCardMenu').then((m) => ({
        default: m.JudicialCustodianCardMenu,
    }))
);
const EvictionFieldProceduresPanel = lazy(() =>
    import('@/app/components/lawyer/execution/EvictionFieldProceduresPanel').then((m) => ({
        default: m.EvictionFieldProceduresPanel,
    }))
);
const OtherPartyActionsLog = lazy(() =>
    import('@/app/components/lawyer/execution/OtherPartyActionsLog').then((m) => ({
        default: m.OtherPartyActionsLog,
    }))
);
import {
    EVICTION_WORKFLOW_BY_ACTION_ID,
    fieldVisitAppointmentStorageKey,
    handleExecutorApproval,
    inferExecutorApprovalDecisionType,
    openBreakInventoryCompletion,
    openJudicialCustodianCompletion,
    type BreakInventoryFurnitureSavePayload,
    type ExecutorApprovalActions,
    type JudicialCustodianSavePayload,
    type ScheduledDateSavePayload,
} from '@/app/utils/executorApprovalWorkflow';
import {
    appendEvictionExecutorRequest,
    findApprovedFieldVisitNeedingSchedule,
    findApprovedBreakInventoryNeedingLedger,
    findApprovedCustodianNeedingDetails,
    getPersonalCoerciveSubtypeOutcome,
    hasApprovedLawyerFeePayout,
} from '@/app/utils/executorSeizureDecisionQueue';
import { buildSeizedAssetDetailLines } from '@/app/utils/seizedAssetDisplay';
import { computeNewDossierAmountAfterRealEstateSale } from '@/app/utils/realEstateSeizureMath';
import { getExecutionPartyDisplayName } from '@/app/utils/partyDisplayName';
import {
    readUnifiedFundsLedger,
    filterUnifiedLawyerFeesHideFileDuplicate,
    filterUnifiedExpensesHideFileDuplicate,
} from '@/app/utils/unifiedFundsLedgerStorage';
import {
    addCalendarDaysYmd,
    buildEmployeeAssignmentPatchForDebtorKey,
    computeTaklifDeadlineYmd,
    daysRemainingUntilDeadline,
    getEmployeeAssignmentForDebtorKey,
    mergeInvestigationOutcomesIntoEmployeeAssignments,
    isAssignmentDeadlinePassed,
    isAssignmentAutoHideEligible,
    type ExecutorDecisionRowLite,
} from '@/app/utils/employeeSummonsAssignment';
import {
    buildPublicationNoticePatchForDebtorKey,
    getPublicationNoticeForDebtorKey,
    publicationNoticeDeadlineYmd,
    PUBLICATION_NOTICE_DURATION_DAYS,
} from '@/app/utils/publicationNoticeDebtor';
import {
    buildDebtorNotificationCountPatchForKey,
    buildDebtorNoticePatchForKey,
    buildDebtorSummonsMarkerPatchForKey,
    getDebtorNotificationCountForKey,
    getDebtorNoticeStateForKey,
    getDebtorSummonsMarkerForKey,
    areDebtorSummonsMarkersEqual,
} from '@/app/utils/noticeDebtorScope';
import { timelineDebtorMetadata, timelineEventBelongsToDebtorWorkspace } from '@/app/utils/timelineDebtorScope';
import {
    useExecutionDashboardStore,
    isDebtorRowEmployee,
    debtorEmploymentToggleMenuLabel,
    buildDebtorEmploymentTogglePatch,
    type ModalStates,
} from '@/app/stores';

import {
    AR_TABLIGH_RAQM,
    EXEC_FOC_LAZY_FALLBACK,
    EXEC_OVERLAY_LAZY_FALLBACK,
    formatUnifiedLedgerDate,
    LazyDecisionsAndAppealsEngine,
    LazyDocumentVault,
    LazyFinancialOperationsCenter,
    LazyModalSeizedAssetsManager,
    LazyPaymentCalculator,
    LazySettlementCalculator,
    LazyUnifiedSummonsHub,
    LazyExecutorApprovedDateTimeModal,
    LazyExecutorBreakInventoryFurnitureModal,
    LazyExecutorJudicialCustodianModal,
    LazyExecutorWorkflowConfirmModal,
    PartyOverflowToggle,
} from './ExecutionDashboard/executionDashboardLazyShell';



/** صف موحّد للمدين الأساسي + الإضافيين — للعرض وتوجيه الإجراءات */
type UnifiedExecutionDebtorRow = {
    id: string;
    name: string;
    source: 'primary' | 'additional';
    allocated_debt: number;
    paid_amount: number;
    cleared: boolean;
};







/** عجلة الفأرة أو اللمس المتتبع → تمرير أفقي (يتطلّب passive: false) */
function bindHorizontalWheelToScroll(el: HTMLElement): () => void {
    const onWheel = (e: WheelEvent) => {
        if (el.scrollWidth <= el.clientWidth + 1) return;
        let delta = e.deltaX;
        if (e.shiftKey) {
            delta += e.deltaY;
        } else if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
            delta = e.deltaY;
        }
        if (delta === 0) return;
        const prev = el.scrollLeft;
        el.scrollLeft += delta;
        if (prev !== el.scrollLeft) {
            e.preventDefault();
        }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
}





export interface ExecutionDashboardProps {
    file?: ExecutionFile;
    executionId?: string;
    onClose: () => void;
    onUpdate?: (data: ExecutionFile) => void;
}

export const ExecutionDashboard: React.FC<ExecutionDashboardProps> = React.memo(({ file, executionId, onClose, onUpdate }) => {
    
    // debug logging moved to mount-only effect for perf
    
    // ===========================
    // EXECUTION DATA - MUST BE FIRST
    // ===========================
    const [executionStorageTick, setExecutionStorageTick] = useState(0);
    /** معاينة تاريخية: لقطة الإضبارة في وقت حدث من السجل الزمني */
    const [historicalSnapshot, setHistoricalSnapshot] = useState<any | null>(null);
    const executionData = useMemo(() => {
        const idRaw = file?.id ?? executionId;
        const persistKey =
            idRaw != null && String(idRaw) !== '' && String(idRaw) !== 'undefined' ? String(idRaw) : '';
        const storageKey = persistKey ? executionStorageKey(persistKey) : '';
        const stored = storageKey ? storageCache.get(storageKey) : null;

        // بعد persistExecutionMerge يُحدَّث التخزين قبل أن يصل الملف الجديد من الأب — نفضّل الأحدث
        if (file && stored) {
            const fu = file.updatedAt ? Date.parse(String(file.updatedAt)) : 0;
            const su = stored.updatedAt ? Date.parse(String(stored.updatedAt)) : 0;
            if (Number.isFinite(su) && Number.isFinite(fu) && su > fu) {
                return stored as ExecutionFile;
            }
            if (Number.isFinite(su) && !Number.isFinite(fu) && su > 0) {
                return stored as ExecutionFile;
            }
            if (executionStorageTick > 0) {
                try {
                    const f = file as ExecutionFile;
                    const s = stored as ExecutionFile;
                    const pairs: [unknown, unknown][] = [
                        [f.party_death_case ?? null, s.party_death_case ?? null],
                        [f.party_multiplicity ?? null, s.party_multiplicity ?? null],
                        [f.debtors ?? null, s.debtors ?? null],
                        [f.guarantor_followup ?? null, s.guarantor_followup ?? null],
                        [f.hasGuarantor ?? null, s.hasGuarantor ?? null],
                        [f.creditors ?? null, s.creditors ?? null],
                    ];
                    for (const [fp, sp] of pairs) {
                        if (JSON.stringify(fp) !== JSON.stringify(sp)) {
                            return s;
                        }
                    }
                } catch {
                    /* ignore */
                }
            }
        }

        if (file) return file;
        if (executionId) {
            const s = storageCache.get(executionStorageKey(executionId));
            if (s) return s as ExecutionFile;
        }
        return null;
    }, [file, executionId, file?.updatedAt, executionStorageTick]);

    const isHistoricalMode = historicalSnapshot != null;
    const viewExecutionData = useMemo(() => {
        if (!executionData) return executionData;
        if (historicalSnapshot == null) return executionData;
        try {
            return { ...executionData, ...(historicalSnapshot as Record<string, unknown>) } as ExecutionFile;
        } catch {
            return executionData;
        }
    }, [executionData, historicalSnapshot]);

    /** أحدث ملف للدمج — يمنع استبدال حقول بسبب إغلاق قديم لـ persistExecutionMerge عند موافقة المنفذ */
    const executionDataRef = useRef<ExecutionFile | null>(null);
    executionDataRef.current = executionData ?? null;

    const partyBadgesExecutionId = String(executionData?.id ?? executionId ?? file?.id ?? 'unknown');
    /** مفتاح موحّد لـ localStorage «execution_*_decisions» — يجب أن يطابق id الملف وليس معرّف مسار قد يختلف */
    const decisionsStorageExecutionId = useMemo(
        () => String(executionData?.id ?? executionId ?? file?.id ?? 'default'),
        [executionData?.id, executionId, file?.id]
    );
    const executionAppealBanner = useExecutionAppealBannerState(
        decisionsStorageExecutionId !== 'default' ? decisionsStorageExecutionId : undefined
    );
    const dossierFileKey = String(executionData?.id ?? executionId ?? '');
    const reconcileDossierLifecycle = useExecutionDashboardStore((s) => s.reconcileDossierLifecycle);
    const dossierLifecycleRow = useExecutionDashboardStore((s) => {
        const k = dossierFileKey;
        if (!k || k === 'undefined') return undefined;
        return s.dossierLifecycleByFileId[k];
    });

    useEffect(() => {
        if (!dossierFileKey || dossierFileKey === 'undefined') return;
        reconcileDossierLifecycle(dossierFileKey, executionData ?? undefined);
    }, [
        dossierFileKey,
        reconcileDossierLifecycle,
        executionData?.dossier_lifecycle_status,
        executionData?.dossier_last_action_date,
        executionData?.lastActionDate,
        executionData?.dossier_status_reason,
        executionData?.dossier_status_date,
    ]);

    /** يُزامَن مع الملف عبر scopedSummonsMarker + unifiedSummonsTargetDebtorKey (مصدر واحد، بلا تكرار مع الجذر فقط) */
    const [debtorSummonsMarkerLocal, setDebtorSummonsMarkerLocal] = useState<
        ExecutionFile['debtor_summons_marker'] | null
    >(() => (executionData ? (executionData.debtor_summons_marker ?? null) : null));

    useEffect(() => {
        if (!executionData) return;
        useExecutionDashboardStore.getState().setCurrentFile(executionData);
    }, [executionData]);

    useEffect(() => {
        setExecutionDebtorTabIndex(0);
    }, [executionData?.id]);
    
    // 🚀 V11.0: OPTIMIZED - Start with false since data is synchronous
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadError, setLoadError] = useState<string | null>(executionData ? null : 'لم يتم العثور على بيانات التنفيذ');
    
    const [expandedCreditorById, setExpandedCreditorById] = useState<Record<string, boolean>>({});
    const [expandedDebtorById, setExpandedDebtorById] = useState<Record<string, boolean>>({});
    /** عند >2 دائن/مدين: إظهار أول اثنين فقط حتى يضغط المستخدم لعرض الباقي */
    const [showExtraCreditors, setShowExtraCreditors] = useState(false);
    const [showExtraDebtors, setShowExtraDebtors] = useState(false);

    // 🚀 V11.0: نوافذ التنفيذ — مصدر واحد: Zustand (مفاتيح show*Modal)
    const modals = useExecutionDashboardStore((s) => s.modals) as ModalStates;
    const closeAllModals = useExecutionDashboardStore((s) => s.closeAllModals);
    const resetUIPanelsForExecutionContext = useExecutionDashboardStore(
        (s) => s.resetUIPanelsForExecutionContext
    );
    const activeBottomTab = useExecutionDashboardStore((s) => s.ui.activeBottomTab);
    const isHeaderExpanded = useExecutionDashboardStore((s) => s.ui.isHeaderExpanded);
    const toggleHeaderExpanded = useExecutionDashboardStore((s) => s.toggleHeaderExpanded);

    const setExecutionModal = useCallback((key: keyof ModalStates, show: boolean) => {
        const { openModal, closeModal } = useExecutionDashboardStore.getState();
        if (show) openModal(key);
        else closeModal(key);
    }, []);

    const stableSetShowPaymentModal = useCallback((v: boolean) => setExecutionModal('showPaymentModal', v), [setExecutionModal]);
    const stableSetShowNotificationModal = useCallback((v: boolean) => setExecutionModal('showNotificationModal', v), [setExecutionModal]);
    const stableSetShowDocumentsModal = useCallback((v: boolean) => setExecutionModal('showDocumentsModal', v), [setExecutionModal]);
    const stableSetShowAppointmentModal = useCallback((v: boolean) => setExecutionModal('showAppointmentModal', v), [setExecutionModal]);
    const stableSetShowPaymentCalculator = useCallback((v: boolean) => setExecutionModal('showPaymentCalculator', v), [setExecutionModal]);

    const executionDashboardFileId = executionData?.id ?? null;
    useEffect(() => {
        closeAllModals();
        resetUIPanelsForExecutionContext();
    }, [executionDashboardFileId, closeAllModals, resetUIPanelsForExecutionContext]);

    useEffect(() => {
        return () => {
            const st = useExecutionDashboardStore.getState();
            st.closeAllModals();
            st.resetUIPanelsForExecutionContext();
        };
    }, []);

    const showNotesModal = modals.showNotesModal;
    const setShowNotesModal = (show: boolean) => setExecutionModal('showNotesModal', show);
    const showAppointmentModal = modals.showAppointmentModal;
    const setShowAppointmentModal = (show: boolean) => setExecutionModal('showAppointmentModal', show);
    const showDocumentsModal = modals.showDocumentsModal;
    const setShowDocumentsModal = (show: boolean) => setExecutionModal('showDocumentsModal', show);
    const showDecisionsModal = modals.showDecisionsModal;
    const setShowDecisionsModal = (show: boolean) => setExecutionModal('showDecisionsModal', show);
    const showSeizedAssetsModal = modals.showSeizedAssetsModal;
    const setShowSeizedAssetsModal = (show: boolean) => setExecutionModal('showSeizedAssetsModal', show);
    const showTimelineModal = modals.showTimelineModal;
    const setShowTimelineModal = (show: boolean) => setExecutionModal('showTimelineModal', show);
    const showPaymentModal = modals.showPaymentModal;
    const setShowPaymentModal = (show: boolean) => setExecutionModal('showPaymentModal', show);
    const showNotificationModal = modals.showNotificationModal;
    const setShowNotificationModal = (show: boolean) => setExecutionModal('showNotificationModal', show);
    const showCoerciveModal = modals.showCoerciveModal;
    const setShowCoerciveModal = (show: boolean) => setExecutionModal('showCoerciveModal', show);
    const showPaymentCalculator = modals.showPaymentCalculator;
    const setShowPaymentCalculator = (show: boolean) => setExecutionModal('showPaymentCalculator', show);
    const showSettlementCalculator = modals.showSettlementCalculator;
    const setShowSettlementCalculator = (show: boolean) => setExecutionModal('showSettlementCalculator', show);

	const [todayYmd, setTodayYmd] = useState<string>(() => getLocalTodayYmd());
	useEffect(() => {
		let timeoutId: number | undefined;
		const scheduleNextTick = () => {
			const now = new Date();
			const next = new Date(now);
			next.setHours(24, 0, 1, 0);
			const ms = Math.max(1000, next.getTime() - now.getTime());
			timeoutId = window.setTimeout(() => {
				setTodayYmd(getLocalTodayYmd());
				scheduleNextTick();
			}, ms);
		};
		scheduleNextTick();
		const onVisibility = () => {
			if (document.visibilityState === 'visible') setTodayYmd(getLocalTodayYmd());
		};
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			if (timeoutId) window.clearTimeout(timeoutId);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	}, []);
    
    // 🆕 V16: TASK ENGINE STATE
    const [noteTitle, setNoteTitle] = useState<string>('');
    const [noteBody, setNoteBody] = useState<string>('');
    const [isTask, setIsTask] = useState<boolean>(false);
    const [taskDueDate, setTaskDueDate] = useState<string>('');
    const [taskStatus, setTaskStatus] = useState<'pending' | 'done'>('pending');
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
	const [savedNotesView, setSavedNotesView] = useState<'notes' | 'tasks_done'>('notes');
    const [aiCopilotEnabled, setAiCopilotEnabled] = useState<boolean>(
        Boolean(executionData?.ai_copilot_enabled)
    );
    const [aiCopilotLoading, setAiCopilotLoading] = useState(false);
    const [aiCopilotError, setAiCopilotError] = useState<string | null>(null);
    const [aiCopilotResult, setAiCopilotResult] = useState<any>(
        executionData?.ai_copilot_last_result ?? null
    );
    const aiCopilotLastFingerprintRef = useRef<string>('none');
    const aiCopilotLastRunAtRef = useRef<number>(0);
    const aiCopilotNetworkBackoffUntilRef = useRef<number>(0);
    const aiCopilotNetworkWarningShownRef = useRef(false);
    
    // NEW: Unified Execution & Assets Modal with Tabs
    const showUnifiedExecutionModal = modals.showUnifiedExecutionModal;
    const setShowUnifiedExecutionModal = (show: boolean) => setExecutionModal('showUnifiedExecutionModal', show);
    const [unifiedModalTab, setUnifiedModalTab] = useState<
        'personal' | 'coercive' | 'financial' | 'special' | 'seizure_requests' | 'other_party'
    >('seizure_requests');
    const [specialRequestDate, setSpecialRequestDate] = useState('');
    const [specialRequestContent, setSpecialRequestContent] = useState('');
    const [specialRequestTemplatePick, setSpecialRequestTemplatePick] = useState('');
    const [specialRequestTemplateMenuOpen, setSpecialRequestTemplateMenuOpen] = useState(false);
    const specialRequestTemplateMenuRef = useRef<HTMLDivElement | null>(null);
    const specialRequestInitOnceRef = useRef(false);
    const [showStayOfExecutionModal, setShowStayOfExecutionModal] = useState(false);
    type InlineActionGateKey =
        | 'eviction_field_visit'
        | 'eviction_police_force'
        | 'eviction_break_inventory'
        | 'eviction_custodian'
        | 'eviction_forced_eviction'
        | 'seizure_salary'
        | 'seizure_property'
        | 'seizure_vehicle'
        | 'seizure_third_party'
        | 'seizure_notice_mark'
        | 'guarantor_request'
        | 'special_request_submit';
    const [inlineActionGateKey, setInlineActionGateKey] = useState<InlineActionGateKey | null>(null);
    const [inlineActionGateBusy, setInlineActionGateBusy] = useState(false);
    const [isLawReferenceOpen, setIsLawReferenceOpen] = useState(false);
    /** تعدّد مدينين + ذمة مقسومة: تبويب نشط داخل محضر المتابعة والبطاقة الرئيسية */
    const [executionDebtorTabIndex, setExecutionDebtorTabIndex] = useState(0);
    const [employeeCompulsoryBannerDismissed, setEmployeeCompulsoryBannerDismissed] = useState(false);
    /** تضامن: اختيار المستهدف قبل فتح نموذج الإجراء الجبري */
    const [showSolidaryCoerciveTargetModal, setShowSolidaryCoerciveTargetModal] = useState(false);
    const [solidaryCoerciveActionPending, setSolidaryCoerciveActionPending] = useState<string | null>(null);
    const coerciveSubjectRef = useRef<{ id: string; name: string }>({ id: '', name: '' });
    const followupModalChipTablistRef = useRef<HTMLDivElement>(null);
    const followupModalDebtorTabsRef = useRef<HTMLDivElement>(null);
    const followupModalSectionTabsRef = useRef<HTMLDivElement>(null);
    const debtorWorkspaceChipStripRef = useRef<HTMLDivElement>(null);
    const [partyDeathModalParty, setPartyDeathModalParty] = useState<'creditor' | 'debtor' | null>(null);
    const [partyDeathModalDecisionId, setPartyDeathModalDecisionId] = useState<string | null>(null);
    const lastHeirSubRequestAtRef = useRef<{ creditor: number; debtor: number }>({
        creditor: 0,
        debtor: 0,
    });

    const [evictionVacateDeadlineLocal, setEvictionVacateDeadlineLocal] = useState<string | null>(null);
    const [evictionAssetsTabUnlocked, setEvictionAssetsTabUnlocked] = useState(false);
    const [evictionCaseExpenses, setEvictionCaseExpenses] = useState<
        Array<{ id: string; amount: number; note: string; date: string }>
    >([]);
    const [evictionVacateDraft, setEvictionVacateDraft] = useState('');
    const [showEvictionExpenseModal, setShowEvictionExpenseModal] = useState(false);
    const [evictionExpenseAmount, setEvictionExpenseAmount] = useState('');
    const [evictionExpenseNote, setEvictionExpenseNote] = useState('');
    const [showHeirsNotificationModal, setShowHeirsNotificationModal] = useState(false);
    const [heirNoticeDateDrafts, setHeirNoticeDateDrafts] = useState<Record<string, string>>({});
    const [heirSummonsDatePickerOpenByHeir, setHeirSummonsDatePickerOpenByHeir] = useState<
        Record<string, boolean>
    >({});
    const [evictionExpensePayMode, setEvictionExpensePayMode] = useState<
        'salary_fifth' | 'lump_sum' | 'installments'
    >('lump_sum');
    const [showEvictionLawyerFeeModal, setShowEvictionLawyerFeeModal] = useState(false);
    const [lawyerFeeDisburseMode, setLawyerFeeDisburseMode] = useState<
        'salary_fifth' | 'lump_sum' | 'settlement'
    >('lump_sum');
    const [lawyerFeeDisburseNotes, setLawyerFeeDisburseNotes] = useState('');
    const [evictionExecutorVacateGrantApproved, setEvictionExecutorVacateGrantApproved] = useState(false);
    const [evictionResidentialGracePeriodStart, setEvictionResidentialGracePeriodStart] = useState<string | null>(
        null
    );
    const [showEvictionResidentialGraceModal, setShowEvictionResidentialGraceModal] = useState(false);
    const [evictionGraceDecisionId, setEvictionGraceDecisionId] = useState<string | null>(null);
    const [graceModalStartYmd, setGraceModalStartYmd] = useState('');
    const [graceModalEndYmd, setGraceModalEndYmd] = useState('');
    const [evictionResidentialGraceManuallyEndedAt, setEvictionResidentialGraceManuallyEndedAt] = useState<
        string | null
    >(null);
    const [policeAssistanceModalOpen, setPoliceAssistanceModalOpen] = useState(false);
    const [policeAssistanceDecisionId, setPoliceAssistanceDecisionId] = useState<string | null>(null);

    const renderInlineActionGate = useCallback(
        (key: InlineActionGateKey, onConfirm: () => void) => (
            <div
                className={`absolute inset-0 z-20 flex items-center justify-center gap-2 rounded-2xl bg-slate-950/45 px-3 backdrop-blur-xl transition-opacity duration-150 ${
                    inlineActionGateKey === key ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
                role="presentation"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    disabled={inlineActionGateBusy}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (inlineActionGateBusy) return;
                        setInlineActionGateBusy(true);
                        try {
                            onConfirm();
                        } finally {
                            setInlineActionGateBusy(false);
                            setInlineActionGateKey(null);
                        }
                    }}
                    className="rounded-xl border border-amber-500 bg-amber-600/20 px-3 py-2 text-[11px] font-black text-amber-100 hover:bg-amber-600/25 disabled:opacity-50"
                >
                    <span className="flex flex-row-reverse items-center justify-center gap-2">
                        <Send size={14} className="text-amber-200" />
                        تأكيد وإرسال للقرارات
                    </span>
                </button>
                <button
                    type="button"
                    disabled={inlineActionGateBusy}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (inlineActionGateBusy) return;
                        setInlineActionGateKey(null);
                    }}
                    className="rounded-xl bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                >
                    إلغاء
                </button>
            </div>
        ),
        [inlineActionGateBusy, inlineActionGateKey]
    );
    const [policeAssistanceRequestTitle, setPoliceAssistanceRequestTitle] = useState('');
    const [policeAssistanceAgencyDraft, setPoliceAssistanceAgencyDraft] = useState('');
    const [evictionHeirsNotificationDateYmd, setEvictionHeirsNotificationDateYmd] = useState('');

    const openEvictionExecutorCompletionRef = useRef<((decisionId: string) => void) | null>(null);

    useEffect(() => {
        if (!showUnifiedExecutionModal) {
            specialRequestInitOnceRef.current = false;
            return;
        }
        if (unifiedModalTab !== 'special') return;
        if (specialRequestInitOnceRef.current) return;
        specialRequestInitOnceRef.current = true;
        setSpecialRequestTemplatePick('');
        setSpecialRequestContent('');
        setSpecialRequestDate(getLocalTodayYmd());
    }, [showUnifiedExecutionModal, unifiedModalTab]);

    // NEW: Timeline Accordion (Relocated below Tools Grid)
    const [timelineAccordionExpanded, setTimelineAccordionExpanded] = useState<boolean>(false);
    const [activeTimelineFilter, setActiveTimelineFilter] = useState<string>('الكل');
    
    // CRITICAL: Grace Period Global State (restored from localStorage if available)
    const [gracePeriodActive, setGracePeriodActive] = useState<boolean>(executionData?.gracePeriodActive ?? true);
    const [gracePeriodEnded, setGracePeriodEnded] = useState<boolean>(executionData?.gracePeriodEnded ?? false);
    
    // 🆕 V8: DEBTOR NOTIFICATION PIPELINE (Initial vs Subsequent)
    const [notificationCount, setNotificationCount] = useState<number>(executionData?.notificationCount || 0);
    const [notificationPurpose, setNotificationPurpose] = useState<string>('');
    /** إعلان انتهاء المدة الرضائية قبل وصول تحديث executionData من الأب */
    const [voluntaryEndOptimistic, setVoluntaryEndOptimistic] = useState(false);
    /** مثل أعلاه — لمسار الإضبارات غير التخلية */
    const [noticeVoluntaryPeriodEndOptimistic, setNoticeVoluntaryPeriodEndOptimistic] = useState(false);
    const [summonsMarkerPopoverOpen, setSummonsMarkerPopoverOpen] = useState(false);
    const [executionMemoBadgePopoverOpen, setExecutionMemoBadgePopoverOpen] = useState(false);
    const [summonsPurposeDraft, setSummonsPurposeDraft] = useState('');

    useEffect(() => {
        if (!summonsMarkerPopoverOpen && !executionMemoBadgePopoverOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSummonsMarkerPopoverOpen(false);
                setExecutionMemoBadgePopoverOpen(false);
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [summonsMarkerPopoverOpen, executionMemoBadgePopoverOpen]);
    const [forcedAttendanceIssued, setForcedAttendanceIssued] = useState<boolean>(executionData?.forcedAttendanceIssued || false);
    const [debtorEvaded, setDebtorEvaded] = useState<boolean>(executionData?.debtorEvaded || false);
    const [arrestWarrantUnlocked, setArrestWarrantUnlocked] = useState<boolean>(executionData?.arrestWarrantUnlocked || false);
    
    const [creditorAttended, setCreditorAttended] = useState<boolean>(executionData?.creditorAttended ?? true);
    const [executionPaused, setExecutionPaused] = useState<boolean>(executionData?.executionPaused || false);
    
    // 🆕 V9: UNIFIED SUMMONS HUB STATE
    const showUnifiedSummonsModal = modals.showUnifiedSummonsModal;
    const setShowUnifiedSummonsModal = (show: boolean) => setExecutionModal('showUnifiedSummonsModal', show);
    const [summonsHubInitialMainTab, setSummonsHubInitialMainTab] = useState<
        'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null
    >(null);
    /** عند فتح المركز من شارة مدين: نثبت المستهدف حتى لا يختلط مع تبويب آخر */
    const [summonsContextDebtorKey, setSummonsContextDebtorKey] = useState<string | null>(null);
    useEffect(() => {
        setSummonsContextDebtorKey(null);
        setSummonsHubInitialMainTab(null);
    }, [executionDashboardFileId]);
    /** طلبات الحجز والإجراءات الجبرية المركّزة في «التنفيذ والمحجوزات» فقط */
    const openExecutionSeizuresTab = useCallback(() => {
        startTransition(() => {
            setUnifiedModalTab('coercive');
            setExecutionModal('showUnifiedExecutionModal', true);
            setExecutionModal('showCoerciveModal', false);
            setExecutionModal('showUnifiedSummonsModal', false);
            setSummonsHubInitialMainTab(null);
            setSummonsContextDebtorKey(null);
        });
    }, [setExecutionModal]);
    
    // 🆕 V9: COERCION RESOLUTION ENGINE STATE
    const [activeNoticeState, setActiveNoticeState] = useState<string | null>(executionData?.activeNoticeState || null); // 'initial_notice' | 'forced_attendance' | 'arrest_warrant'
    const [debtorAttendedVoluntarily, setDebtorAttendedVoluntarily] = useState<boolean>(executionData?.debtorAttendedVoluntarily || false);
    const [debtorForcedToAttend, setDebtorForcedToAttend] = useState<boolean>(executionData?.debtorForcedToAttend || false);
    const [debtorArrested, setDebtorArrested] = useState<boolean>(executionData?.debtorArrested || false);
    const [nonInterferenceIssued, setNonInterferenceIssued] = useState<boolean>(executionData?.nonInterferenceIssued || false);
    const [summoningRound, setSummoningRound] = useState<number>(executionData?.summoningRound ?? 1);
    const [voluntaryAttendanceCount, setVoluntaryAttendanceCount] = useState<number>(
        executionData?.voluntaryAttendanceCount ?? 0
    );
    const [investigationCourtRequested, setInvestigationCourtRequested] = useState<boolean>(
        executionData?.investigationCourtRequested ?? false
    );
    const [investigationMemoIssued, setInvestigationMemoIssued] = useState<boolean>(
        executionData?.investigationMemoIssued ?? false
    );
    const [investigationPathDebtorPresent, setInvestigationPathDebtorPresent] = useState<boolean>(
        executionData?.investigationPathDebtorPresent ?? false
    );
    const [forcedPathAttendanceSecured, setForcedPathAttendanceSecured] = useState<boolean>(
        executionData?.forcedPathAttendanceSecured ?? false
    );
    
    // ===========================
    // 7-YEAR STATUTE OF LIMITATIONS TRACKER
    // ===========================
    const [lastActionDate, setLastActionDate] = useState<string | null>(executionData?.lastActionDate || null);
    const [showStatuteWarning, setShowStatuteWarning] = useState<boolean>(false);

    const [dossierStatusDraft, setDossierStatusDraft] = useState<DossierLifecycleStatus>('active');
    const [dossierReasonDraft, setDossierReasonDraft] = useState('');
    const [dossierDateDraft, setDossierDateDraft] = useState('');
    const [dossierLifecyclePanelOpen, setDossierLifecyclePanelOpen] = useState(false);
    const [dossierLifecyclePanelPhase, setDossierLifecyclePanelPhase] = useState<'menu' | 'details'>(
        'menu'
    );
    const [dossierPendingStatus, setDossierPendingStatus] = useState<DossierLifecycleStatus | null>(
        null
    );
    const dossierLifecyclePopoverRef = useRef<HTMLDivElement>(null);
    const dossierLifecyclePanelPortalRef = useRef<HTMLDivElement>(null);
    const [dossierLifecyclePopStyle, setDossierLifecyclePopStyle] = useState<{
        top: number;
        left: number;
        width: number;
    } | null>(null);
    const [showExecutionTrashModal, setShowExecutionTrashModal] = useState(false);
    const [timelineEditDraft, setTimelineEditDraft] = useState<TimelineEvent | null>(null);
    const [showEditDossierMetaModal, setShowEditDossierMetaModal] = useState(false);
    const [editPartyTarget, setEditPartyTarget] = useState<{ kind: 'creditor' | 'debtor'; index: number } | null>(
        null
    );
    const [permanentDeleteTimelineId, setPermanentDeleteTimelineId] = useState<string | null>(null);
    const [dossierMetaDraft, setDossierMetaDraft] = useState<Record<string, string> | null>(null);
    const [partyEditDraft, setPartyEditDraft] = useState<{
        name: string;
        phone: string;
        address: string;
        heirs: HeirDetailRow[];
        lockBaseInfo: boolean;
        includeHeirsInForm?: boolean;
    } | null>(null);
    const [partyEditHeirDeleteConfirmIdx, setPartyEditHeirDeleteConfirmIdx] = useState<number | null>(null);

    const [paidDebt, setPaidDebt] = useState<number>(0);
    const paidDebtRef = useRef<number>(paidDebt);
    paidDebtRef.current = paidDebt;
    const [paidCourtFees, setPaidCourtFees] = useState<number>(0);
    const [paidDirectorateFees, setPaidDirectorateFees] = useState<number>(0);
    const [paidClientFees, setPaidClientFees] = useState<number>(0);

    const syncPaidClientFeesFromWallet = useCallback((total: number) => {
        setPaidClientFees(total);
        const id = executionData?.id || executionId;
        if (!id) return;
        const current = storageCache.get(executionStorageKey(String(id)));
        if (current && typeof current === 'object') {
            storageCache.set(executionStorageKey(String(id)), {
                ...current,
                paidClientFees: total,
            });
        }
    }, [executionData?.id, executionId]);

    useEffect(() => {
        const myId = String(executionData?.id ?? executionId ?? '');
        if (!myId) return;
        const handler = (e: Event) => {
            queueMicrotask(() => {
                const ce = e as CustomEvent<{
                    executionId?: string;
                    requestKind?: string;
                    outcome?: string;
                    decisionId?: string;
                    personalCoerciveSubtype?: string;
                }>;
                const evId = String(ce.detail?.executionId ?? '');
                if (evId !== myId && evId !== String(decisionsStorageExecutionId ?? '')) return;
                const outcome = String(ce.detail?.outcome ?? '');
                if (outcome !== 'approved' && outcome !== 'rejected' && outcome !== 'alternative') return;
                const decisionId = String(ce.detail?.decisionId ?? '').trim();
                if (!decisionId) return;
                const kind = String(ce.detail?.requestKind ?? '').trim();
                if (!kind) return;
                const pcSubtype = String(ce.detail?.personalCoerciveSubtype ?? '').trim();
                if (kind === 'seizure' || kind === 'unified_collection' || kind === 'guarantor_request') return;

                showToastRef.current(
                    'تم بتّ الطلب — يمكنك الرجوع إلى بطاقة الطلب.',
                    outcome === 'approved' ? 'success' : 'info',
                    {
                        decisionsLink: true,
                        decisionId,
                        decisionsTab: 'previous',
                        action: {
                            label: 'الرجوع لمكان الطلب',
                            onClick: () => {
                                if (kind === 'personal_coercive' || pcSubtype) {
                                    setShowUnifiedExecutionModal(true);
                                    setUnifiedModalTab('personal');
                                    return;
                                }
                                const direct = openEvictionExecutorCompletionRef.current;
                                if (direct) {
                                    direct(decisionId);
                                    return;
                                }

                                window.dispatchEvent(
                                    new CustomEvent('hami-open-eviction-executor-completion', {
                                        detail: {
                                            executionId: myId,
                                            decisionId,
                                        },
                                    })
                                );

                                setShowDecisionsModal(true);
                                setDecisionsModalBootListTab('previous');
                                setDecisionsModalScrollToDecisionId(decisionId);
                            },
                        },
                    }
                );
            });
        };
        window.addEventListener('hami-execution-decision-outcome', handler as EventListener);
        return () => window.removeEventListener('hami-execution-decision-outcome', handler as EventListener);
    }, [executionData?.id, executionId, decisionsStorageExecutionId]);

    useEffect(() => {
        if (!specialRequestTemplateMenuOpen) return;
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            const menu = specialRequestTemplateMenuRef.current;
            const input = document.getElementById('hami-smart-request-template');
            if (menu?.contains(t)) return;
            if (input && input.contains(t)) return;
            setSpecialRequestTemplateMenuOpen(false);
        };
        document.addEventListener('mousedown', onDoc, true);
        return () => document.removeEventListener('mousedown', onDoc, true);
    }, [specialRequestTemplateMenuOpen]);

    useEffect(() => {
        const p = executionData?.paidClientFees;
        setPaidClientFees(typeof p === 'number' && p >= 0 ? p : 0);
    }, [executionData?.id]);

    useEffect(() => {
        const s = normalizeDossierLifecycleStatus(executionData?.dossier_lifecycle_status);
        setDossierStatusDraft(s);
        setDossierReasonDraft(String(executionData?.dossier_status_reason ?? '').trim());
        setDossierDateDraft(String(executionData?.dossier_status_date ?? '').slice(0, 10));
    }, [
        executionData?.id,
        executionData?.dossier_lifecycle_status,
        executionData?.dossier_status_reason,
        executionData?.dossier_status_date,
    ]);

    useEffect(() => {
        if (!editPartyTarget) setPartyEditHeirDeleteConfirmIdx(null);
    }, [editPartyTarget]);
    
    const [noteText, setNoteText] = useState<string>('');
    const [appointmentPurpose, setAppointmentPurpose] = useState<string>('');
    const [appointmentDateOnly, setAppointmentDateOnly] = useState<string>('');
    const [appointmentTimeOptional, setAppointmentTimeOptional] = useState<string>('');
    const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
    const [appointmentContext, setAppointmentContext] = useState<
        null | { kind: 'police_assistance'; decisionId: string; agencyName: string }
    >(null);
    const [executorScheduleModalOpen, setExecutorScheduleModalOpen] = useState(false);
    const [executorScheduleContext, setExecutorScheduleContext] = useState<null | {
        requestTitle: string;
        onSaved: (payload: ScheduledDateSavePayload) => void;
    }>(null);
    const [breakInventoryFurnitureModalOpen, setBreakInventoryFurnitureModalOpen] = useState(false);
    const [breakInventoryFurnitureModalCtx, setBreakInventoryFurnitureModalCtx] = useState<null | {
        decisionId: string;
        requestTitle: string;
        onSaved: (payload: BreakInventoryFurnitureSavePayload) => void;
        onFinalize: () => void;
    }>(null);
    const [judicialCustodianModalOpen, setJudicialCustodianModalOpen] = useState(false);
    const [judicialCustodianModalCtx, setJudicialCustodianModalCtx] = useState<null | {
        requestTitle: string;
        onSaved: (payload: JudicialCustodianSavePayload) => void;
        initialName?: string;
        initialSalary?: string;
    }>(null);
    const [executionReportPrompt, setExecutionReportPrompt] = useState<null | { onConfirm: () => void }>(
        null
    );

    // 🆕 V12: FINANCIAL LEDGER HISTORY
    const [financialLedger, setFinancialLedger] = useState<Array<{
        id: string;
        date: string;
        type: 'payment' | 'fee' | 'settlement';
        amount: number;
        description: string;
        balance: number;
    }>>(executionData?.financialLedger || []);
    const financialLedgerRef = useRef(financialLedger);
    financialLedgerRef.current = financialLedger;
    const hasFinancialLedger = financialLedger.length > 0;
    const showLedgerModal = modals.showLedgerModal;
    const setShowLedgerModal = (show: boolean) => setExecutionModal('showLedgerModal', show);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [debtorNotificationDate, setDebtorNotificationDate] = useState<string | null>(null);
    /** +يوم تقويمي واحد بقرار المحامي (مربع التمديد) — يُحفظ مع isHolidayExtension في الملف */
    const [manualGraceCalendarExtra, setManualGraceCalendarExtra] = useState<boolean>(false);

    useEffect(() => {
        if (!executionData?.id) return;
        const fromFile =
            executionData.debtorNotificationDate ??
            (executionData.debtors?.[0] as Debtor | undefined)?.notificationDate ??
            null;
        setDebtorNotificationDate(fromFile ?? null);
        setManualGraceCalendarExtra(!!executionData.isHolidayExtension);
    }, [
        executionData?.id,
        executionData?.debtorNotificationDate,
        executionData?.isHolidayExtension,
        (executionData?.debtors?.[0] as Debtor | undefined)?.notificationDate,
    ]);

    /** ملفات قديمة: إخبار مسجّل دون activeNoticeState — إعادة ضبط مسار «بعد الإخبار» */
    useEffect(() => {
        if (!executionData?.id) return;
        const hasNotif = !!(
            executionData.debtorNotificationDate ||
            (executionData.debtors?.[0] as Debtor | undefined)?.notificationDate
        );
        if (!hasNotif) return;
        if (executionData.debtorAttendedVoluntarily || executionData.debtorForcedToAttend) return;
        if (executionData.activeNoticeState) return;
        setActiveNoticeState('initial_notice');
        // eslint-disable-next-line react-hooks/exhaustive-deps -- عند تغيّر ملف التنفيذ فقط
    }, [executionData?.id]);

    // 🆕 V10.5: استبدال Toast القديم بنظام Toast الجديد (سيتم استخدام ExecutionToasts بدلاً من showToast)
    // ✅ FIXED: Proper types
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(executionData?.timelineEvents || []);
    const timelineEventsRef = useRef<TimelineEvent[]>(timelineEvents);
    timelineEventsRef.current = timelineEvents;
    const timelineDedupeSigRef = useRef<string>('');
    /** يُعبَّأ بعد تعريف `persistExecutionMerge` — لاستدعاء الدمج من `executorApprovalActions` المعرف سابقاً */
    const persistExecutionMergeRef = useRef<((patch: Record<string, unknown>) => void) | null>(null);
    /** لقطات الملف لدمج قائمة الحراس دون إغلاق قديم على `executionData` */
    const executionFileSnapshotRef = useRef<ExecutionFile | null>(null);
    /** يمنع تكرار دمج مفاتحة التكليف + التنبيه عند تشغيل الـ effect مرتين (React Strict Mode) */
    const employeeInvestigationSyncSigRef = useRef<string>('');
    useEffect(() => {
        employeeInvestigationSyncSigRef.current = '';
    }, [executionData?.id]);
    const [earnerFeeCollectionSm, setEarnerFeeCollectionSm] = useState<EvictionEarnerFeeCollectionSM>(() =>
        defaultEvictionEarnerFeeCollectionSM()
    );
    const [caseNotesLog, setCaseNotesLog] = useState<NonNullable<ExecutionFile['caseNotesLog']>>(
        executionData?.caseNotesLog ?? []
    );

    useEffect(() => {
        setEarnerFeeCollectionSm(
            executionData?.eviction_earner_fee_collection_sm ?? defaultEvictionEarnerFeeCollectionSM()
        );
    }, [executionData?.id, executionData?.eviction_earner_fee_collection_sm]);
    const [caseTasksPending, setCaseTasksPending] = useState<NonNullable<ExecutionFile['caseTasksPending']>>(
        executionData?.caseTasksPending ?? []
    );
    const caseNotesLogRef = useRef(caseNotesLog);
    caseNotesLogRef.current = caseNotesLog;
    const caseTasksPendingRef = useRef(caseTasksPending);
    caseTasksPendingRef.current = caseTasksPending;

    const graceUiExecutionKey = String(executionData?.id ?? executionId ?? '').trim();
    const gracePinnedKey = graceUiExecutionKey ? `hami_eviction_grace_pinned_${graceUiExecutionKey}` : '';
    const graceHiddenKey = graceUiExecutionKey ? `hami_eviction_grace_hidden_${graceUiExecutionKey}` : '';
    const [evictionGracePinned, setEvictionGracePinned] = useState<boolean>(() => {
        if (!gracePinnedKey) return true;
        try {
            const raw = localStorage.getItem(gracePinnedKey);
            if (raw === null) return true;
            return raw === '1';
        } catch {
            return true;
        }
    });
    const [evictionGraceHidden, setEvictionGraceHidden] = useState<boolean>(() => {
        if (!graceHiddenKey) return false;
        try {
            return localStorage.getItem(graceHiddenKey) === '1';
        } catch {
            return false;
        }
    });
    useEffect(() => {
        if (!gracePinnedKey || !graceHiddenKey) return;
        try {
            const p = localStorage.getItem(gracePinnedKey);
            setEvictionGracePinned(p === null ? true : p === '1');
            setEvictionGraceHidden(localStorage.getItem(graceHiddenKey) === '1');
        } catch {
            /* ignore */
        }
    }, [gracePinnedKey, graceHiddenKey]);

    const toggleEvictionGracePinned = useCallback(() => {
        setEvictionGracePinned((v) => {
            const next = !v;
            if (gracePinnedKey) {
                try {
                    localStorage.setItem(gracePinnedKey, next ? '1' : '0');
                } catch {
                    /* ignore */
                }
            }
            return next;
        });
    }, [gracePinnedKey]);

    const activeTimelineEvents = useMemo(
        () => timelineEvents.filter((e) => !e.trashedAt),
        [timelineEvents]
    );
    const isFinancialSeizureLogEvent = useCallback((e: any) => {
        const src = String(e?.source || '');
        if (src.includes('الحجز المالي')) return true;
        const meta = e?.metadata;
        const threadKey = String(meta?.timelineThreadKey || '');
        if (meta?.seizureAssetId || threadKey.startsWith('seizure_') || threadKey.startsWith('seizure:')) {
            return true;
        }
        if (String(e?.type || '') !== 'coercive') return false;
        const title = String(e?.title || '');
        const desc = String(e?.description || '');
        return title.includes('حجز') || desc.includes('محجوز') || desc.includes('الحجز');
    }, []);
    const financialSeizureLogEvents = useMemo(
        () => activeTimelineEvents.filter(isFinancialSeizureLogEvent),
        [activeTimelineEvents, isFinancialSeizureLogEvent]
    );
    const financialSeizureLogPreview = useMemo(
        () => financialSeizureLogEvents.slice(0, 60),
        [financialSeizureLogEvents]
    );
    const TIMELINE_FILTER_MAP: Record<string, string | string[]> = useMemo(() => ({
        'تبليغات وإخبار': 'notification',
        مواعيد: 'appointment',
        'حركة الأموال والرسوم': 'payment',
        'محجوزات وتنفيذ جبري': 'coercive',
        'قرارات ومحاضر': 'decision',
        'مستندات وملاحظات': 'other',
    }), []);

    const activeCaseNotesLog = useMemo(
        () => caseNotesLog.filter((n) => !n.trashedAt),
        [caseNotesLog]
    );
	const completedTaskTitles = useMemo(() => {
		const out = new Set<string>();
		for (const ev of timelineEvents) {
			const title = String((ev as any)?.title || '').trim();
			if (!title.startsWith('✅ إنجاز مهمة:')) continue;
			const taskTitle = title.replace(/^✅\s*إنجاز\s*مهمة:\s*/u, '').trim();
			if (taskTitle) out.add(taskTitle);
		}
		return out;
	}, [timelineEvents]);
	const savedNotesSplit = useMemo(() => {
		const doneTasks: typeof activeCaseNotesLog = [];
		const notes: typeof activeCaseNotesLog = [];
		for (const n of activeCaseNotesLog) {
			const t = String((n as any)?.title || '').trim();
			if (t && completedTaskTitles.has(t)) doneTasks.push(n);
			else notes.push(n);
		}
		return { notes, doneTasks };
	}, [activeCaseNotesLog, completedTaskTitles]);
    const activeCaseTasksPendingAll = useMemo(
        () => caseTasksPending.filter((t) => !t.trashedAt),
        [caseTasksPending]
    );
    const activeGraceTasks = useMemo(
        () =>
            activeCaseTasksPendingAll.filter((t) =>
                /انتهاء المهلة/.test(String((t as any)?.title || '').trim())
            ),
        [activeCaseTasksPendingAll]
    );
    const activeCaseTasksPending = useMemo(
        () =>
            activeCaseTasksPendingAll.filter(
                (t) => !/انتهاء المهلة/.test(String((t as any)?.title || '').trim())
            ),
        [activeCaseTasksPendingAll]
    );
    const trashedTimelineEvents = useMemo(
        () => timelineEvents.filter((e) => Boolean(e.trashedAt)),
        [timelineEvents]
    );
    const trashedCaseNotes = useMemo(
        () => caseNotesLog.filter((n) => Boolean(n.trashedAt)),
        [caseNotesLog]
    );
    const trashedCaseTasks = useMemo(
        () => caseTasksPending.filter((t) => Boolean(t.trashedAt)),
        [caseTasksPending]
    );

    /** عند تغيّر ملف التنفيذ: لا يبقى سجل زمني أو ملاحظات أو مهام من إضبارة أخرى في الحالة المحلية */
    useEffect(() => {
        if (!executionData?.id) return;
        const tls = executionData.timelineEvents;
        setTimelineEvents(Array.isArray(tls) ? tls : []);
        const notes = executionData.caseNotesLog;
        setCaseNotesLog(Array.isArray(notes) ? notes : []);
        const tasks = executionData.caseTasksPending;
        setCaseTasksPending(Array.isArray(tasks) ? tasks : []);
        setSeizedAssets(Array.isArray(executionData.seizedAssets) ? executionData.seizedAssets : []);
        setSeizureDraftsByDecisionId(executionData.seizureDraftsByDecisionId ?? {});
        setActiveCoerciveActions(Array.isArray(executionData.activeCoerciveActions) ? executionData.activeCoerciveActions : []);
        setRealEstateSeizureAssets(
            Array.isArray(executionData.realEstateSeizureAssets) ? executionData.realEstateSeizureAssets : []
        );
    }, [executionDashboardFileId]);

    const nextTimelineId = useCallback(
        () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        []
    );
    
    // 🆕 V7: SEIZED ASSETS & COERCIVE ACTIONS STATE
    // ✅ FIXED: Proper types
    const [seizedAssets, setSeizedAssets] = useState<SeizedAsset[]>(executionData?.seizedAssets || []);
    const seizedAssetsSnapshotRef = useRef<SeizedAsset[]>(seizedAssets);
    seizedAssetsSnapshotRef.current = seizedAssets;

    const [realEstateSeizureAssets, setRealEstateSeizureAssets] = useState<RealEstateSeizureAsset[]>(
        executionData?.realEstateSeizureAssets ?? []
    );
    const realEstateSeizureSnapshotRef = useRef<RealEstateSeizureAsset[]>(realEstateSeizureAssets);
    realEstateSeizureSnapshotRef.current = realEstateSeizureAssets;

    const [thirdPartySeizureAssets, setThirdPartySeizureAssets] = useState<ThirdPartySeizureAsset[]>(
        executionData?.thirdPartySeizureAssets ?? []
    );
    const thirdPartySeizureSnapshotRef = useRef<ThirdPartySeizureAsset[]>(thirdPartySeizureAssets);
    thirdPartySeizureSnapshotRef.current = thirdPartySeizureAssets;

    const [standaloneExecutionMarks, setStandaloneExecutionMarks] = useState<StandaloneExecutionMark[]>(
        executionData?.standaloneExecutionMarks ?? []
    );
    const standaloneExecutionMarksSnapshotRef = useRef<StandaloneExecutionMark[]>(standaloneExecutionMarks);
    standaloneExecutionMarksSnapshotRef.current = standaloneExecutionMarks;

    const getMilestoneTimelineSnapshot = useCallback(
        () =>
            buildExecutionTimelineSnapshot({
                executionData: executionDataRef.current,
                financialLedger: financialLedgerRef.current,
                seizedAssets: seizedAssetsSnapshotRef.current,
            }),
        []
    );

    const [seizureDraftsByDecisionId, setSeizureDraftsByDecisionId] = useState<
        Record<string, SeizedAsset>
    >(() => executionData?.seizureDraftsByDecisionId ?? {});
    const [seizureAuctionDateDraftById, setSeizureAuctionDateDraftById] = useState<Record<string, string>>(
        {}
    );
    const [realEstateAuctionDateDraftById, setRealEstateAuctionDateDraftById] = useState<
        Record<string, string>
    >({});

    const [showThirdPartySeizureModal, setShowThirdPartySeizureModal] = useState(false);
    const [thirdPartySeizureModalDecisionId, setThirdPartySeizureModalDecisionId] = useState<string | null>(null);
    const thirdPartyModalInitial = useMemo(() => {
        const did = String(thirdPartySeizureModalDecisionId || '').trim();
        if (!did) return null;
        return (
            thirdPartySeizureAssets.find((a) => String(a.decisionRowId || '').trim() === did) || null
        );
    }, [thirdPartySeizureAssets, thirdPartySeizureModalDecisionId]);

    const [showStandaloneExecutionMarkModal, setShowStandaloneExecutionMarkModal] = useState(false);
    const [standaloneExecutionMarkModalDecisionId, setStandaloneExecutionMarkModalDecisionId] =
        useState<string | null>(null);
    const standaloneMarkModalInitial = useMemo(() => {
        const did = String(standaloneExecutionMarkModalDecisionId || '').trim();
        if (!did) return null;
        return (
            standaloneExecutionMarks.find((a) => String(a.decisionRowId || '').trim() === did) || null
        );
    }, [standaloneExecutionMarks, standaloneExecutionMarkModalDecisionId]);
    const seizureDraftsByDecisionIdRef = useRef(seizureDraftsByDecisionId);
    seizureDraftsByDecisionIdRef.current = seizureDraftsByDecisionId;
    const [activeCoerciveActions, setActiveCoerciveActions] = useState<string[]>(executionData?.activeCoerciveActions || []);
    const [showCoerciveActionForm, setShowCoerciveActionForm] = useState<string | null>(null); // null | 'salary' | 'property' | 'travel' | 'imprisonment'
    /** بعد موافقة المنفذ على طلب الحجز — إكمال الحقول التفصيلية في النافذة نفسها */
    const [seizureDetailCompletion, setSeizureDetailCompletion] = useState<{
        decisionRowId: string;
        assetId: string;
        actionType: 'salary' | 'property' | 'vehicle';
    } | null>(null);
    const saveCoerciveActionRef = useRef<(actionType: string, details: Record<string, string>) => void>(
        () => {}
    );

    const [showRealEstateSeizureModal, setShowRealEstateSeizureModal] = useState(false);
    const [realEstateSeizureModalDecisionId, setRealEstateSeizureModalDecisionId] = useState<string | null>(
        null
    );
    const approvedSeizedAssets = useMemo(
        () => (seizedAssets || []).filter((asset) => String(asset?.status || '') !== 'pending'),
        [seizedAssets]
    );
    const movableSeizureRegistryAssets = useMemo(
        () =>
            (seizedAssets || []).filter(
                (a) => String(a?.status || '') !== 'pending' && isMovablePropertySeizureRow(a)
            ),
        [seizedAssets]
    );
    const salarySeizureRegistryAssets = useMemo(
        () =>
            (seizedAssets || []).filter((a) => {
                if (String(a?.status || '') === 'pending') return false;
                const det =
                    typeof a.details === 'object' && a.details && !Array.isArray(a.details)
                        ? (a.details as Record<string, unknown>)
                        : null;
                const kind = String(det?.seizureUiKind || '').trim();
                if (kind === 'salary') return true;
                return /راتب|خُمس|خمس|salary/i.test(String(a.type || ''));
            }),
        [seizedAssets]
    );
    const realEstateSeizureRegistryAssets = useMemo(
        () => (realEstateSeizureAssets || []).slice(),
        [realEstateSeizureAssets]
    );
    const thirdPartySeizureRegistryAssets = useMemo(
        () => (thirdPartySeizureAssets || []).slice(),
        [thirdPartySeizureAssets]
    );
    
    // Alimony cycle (30-day recurring) - MOVED HERE BEFORE EFFECTS
    const [alimonyDaysRemaining, setAlimonyDaysRemaining] = useState<number>(30);
    const [showAlimonyAlert, setShowAlimonyAlert] = useState<boolean>(false);
    
    // CRITICAL: Execution pause state - MOVED HERE BEFORE EFFECTS
    const [isPaused, setIsPaused] = useState<boolean>(executionData?.isPaused ?? false);
    const [pauseReason, setPauseReason] = useState<string>(executionData?.pauseReason ?? '');
    const showPauseModal = modals.showPauseModal;
    const setShowPauseModal = (show: boolean) => setExecutionModal('showPauseModal', show);
    
    // CRITICAL: 3% execution fee tracking - MOVED HERE BEFORE EFFECTS
    const [executionFeeAdded, setExecutionFeeAdded] = useState<boolean>(executionData?.executionFeeAdded ?? false);
    
    // 🆕 V10.7: TOAST NOTIFICATION STATE
    const [toastVisible, setToastVisible] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<React.ReactNode>(null);
    const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
    const [toastEpoch, setToastEpoch] = useState(0);
    const [toastAction, setToastAction] = useState<{
        label: string;
        onClick: () => void;
    } | null>(null);
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    /** يُحدَّث بعد تعريف showToast — لتفادي TDZ عند تسجيل مستمع مبكر */
    const showToastRef = useRef<
        (
            message: string,
            type?: 'success' | 'error' | 'warning' | 'info',
            options?: {
                decisionsLink?: boolean;
                decisionId?: string;
                decisionsTab?: 'current' | 'previous' | 'appeals';
                action?: { label: string; onClick: () => void };
            }
        ) => void
    >(() => {});

    const [decisionsReloadEpoch, setDecisionsReloadEpoch] = useState(0);
    const [decisionsModalBootHubTab, setDecisionsModalBootHubTab] = useState<'current' | 'previous' | 'appeals' | null>(null);
    const [decisionsModalBootListTab, setDecisionsModalBootListTab] = useState<
        'current' | 'previous' | 'appeals' | null
    >(null);
    const [decisionsModalScrollToDecisionId, setDecisionsModalScrollToDecisionId] = useState<string | null>(null);
    const [appealsModalScrollToDecisionId, setAppealsModalScrollToDecisionId] = useState<string | null>(null);
    const [showGuarantorDetailsModal, setShowGuarantorDetailsModal] = useState(false);
    const [guarantorDetailsDecisionId, setGuarantorDetailsDecisionId] = useState<string | null>(null);
    const [guarantorNameDraft, setGuarantorNameDraft] = useState('');
    const [guarantorWorkplaceDraft, setGuarantorWorkplaceDraft] = useState('');
    const [guarantorSalaryDraft, setGuarantorSalaryDraft] = useState('');
    const [guarantorDeductionDraft, setGuarantorDeductionDraft] = useState('');
    const [guarantorGuaranteeTypeDraft, setGuarantorGuaranteeTypeDraft] = useState<'amount' | 'attendance'>('amount');
    const [guarantorPanelExpanded, setGuarantorPanelExpanded] = useState(false);
    const [guarantorMenuOpen, setGuarantorMenuOpen] = useState(false);
    const [guarantorReplaceConfirmOpen, setGuarantorReplaceConfirmOpen] = useState(false);
    const [guarantorUnlinkConfirmOpen, setGuarantorUnlinkConfirmOpen] = useState(false);
    const [guarantorSeizureOpen, setGuarantorSeizureOpen] = useState(false);
    const guarantorAutoOpenStampRef = useRef(0);
    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
                toastTimeoutRef.current = null;
            }
        };
    }, []);
    useEffect(() => {
        const bump = () => {
            queueMicrotask(() => setDecisionsReloadEpoch((n) => n + 1));
        };
        window.addEventListener('hami-decisions-reload', bump);
        window.addEventListener('hami-execution-decision-outcome', bump);
        return () => {
            window.removeEventListener('hami-decisions-reload', bump);
            window.removeEventListener('hami-execution-decision-outcome', bump);
        };
    }, []);

    useEffect(() => {
        if (showDecisionsModal) return;
        setDecisionsModalBootHubTab(null);
        setDecisionsModalBootListTab(null);
        setDecisionsModalScrollToDecisionId(null);
    }, [showDecisionsModal]);

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; decisionId?: string }>;
            const myId = String(executionData?.id ?? executionId ?? '');
            if (!myId || String(ce.detail?.executionId ?? '') !== myId) return;
            const decisionId = String(ce.detail?.decisionId ?? '').trim();
            if (!decisionId) return;

            const decisionRow = getExecutorDecisionRowById(myId, decisionId) as any;
            const subtype = String(decisionRow?.seizureSubtype || '').trim();
            if (subtype === 'property') {
                setShowCoerciveActionForm(null);
                setSeizureDetailCompletion(null);
                setRealEstateSeizureModalDecisionId(decisionId);
                setShowRealEstateSeizureModal(true);
                return;
            }

            if (subtype === 'third_party') {
                setShowCoerciveActionForm(null);
                setSeizureDetailCompletion(null);
                setThirdPartySeizureModalDecisionId(decisionId);
                setShowThirdPartySeizureModal(true);
                return;
            }

            if (subtype === 'notice') {
                setShowCoerciveActionForm(null);
                setSeizureDetailCompletion(null);
                setStandaloneExecutionMarkModalDecisionId(decisionId);
                setShowStandaloneExecutionMarkModal(true);
                return;
            }

            const assets = seizedAssetsSnapshotRef.current;
            let hit = assets.find(
                (a) =>
                    String((a.details as Record<string, unknown> | undefined)?.decisionRowId) === decisionId &&
                    String(a.status) !== 'released'
            );

            if (!hit) {
                const subtype = String(decisionRow?.seizureSubtype || '').trim();
                const today = getLocalTodayYmd();
                const now = new Date().toISOString();
                let kind: 'salary' | 'property' | 'vehicle' = 'property';
                if (subtype === 'movable') kind = 'vehicle';
                else if (subtype === 'salary') kind = 'salary';
                else kind = 'property';

                const baseTypeLabel =
                    kind === 'vehicle'
                        ? 'طلب حجز مال منقول'
                        : kind === 'salary'
                          ? 'طلب حجز راتب'
                          : subtype === 'notice'
                            ? 'طلب وضع إشارة الحجز التنفيذي'
                            : subtype === 'third_party'
                              ? 'حجز مال المدين لدى الغير'
                              : 'طلب حجز عقار';

                const placeholder: SeizedAsset = {
                    id: `inv_${decisionId}_${Date.now()}`,
                    type: `${baseTypeLabel} — موافقة المنفذ`,
                    status: 'seized',
                    seizureDate: today,
                    description: '',
                    notes: '',
                    details: {
                        seizureUiKind: kind,
                        decisionRowId: decisionId,
                        employerName: '',
                        salaryAmount: '',
                        propertyAddress: '',
                        propertyLocation: '',
                        vehicleDescription: '',
                        vehiclePlate: '',
                        movableAssetType: '',
                        movableEstimatedValueIqd: '',
                        movableNotes: '',
                        createdFrom: 'fallback_open_seizure_completion',
                        createdAt: now,
                    },
                };

                setSeizedAssets((prev) => {
                    const next = [...prev, placeholder];
                    queueMicrotask(() => persistExecutionMerge({ seizedAssets: next }));
                    return next;
                });
                hit = placeholder;
            }
            const d = (hit.details || {}) as Record<string, unknown>;
            let kind: 'salary' | 'property' | 'vehicle' = 'property';
            const raw = d.seizureUiKind;
            if (raw === 'salary' || raw === 'property' || raw === 'vehicle') {
                kind = raw;
            } else {
                const t = String(hit.type);
                if (/مال منقول|مركبة|منقول/i.test(t)) kind = 'vehicle';
                else if (/عقار/i.test(t)) kind = 'property';
                else if (/راتب|مكافآت|حوافز|خُمس|خمس|استحقاق/i.test(t)) kind = 'salary';
            }
            setSeizureDetailCompletion({
                decisionRowId: decisionId,
                assetId: hit.id,
                actionType: kind,
            });
            setShowCoerciveActionForm(kind);
        };
        window.addEventListener('hami-open-seizure-completion', handler as EventListener);
        return () =>
            window.removeEventListener('hami-open-seizure-completion', handler as EventListener);
    }, [executionData?.id, executionId]);

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; decisionId?: string; tab?: string }>;
            const myId = String(executionData?.id ?? executionId ?? '');
            if (!myId || String(ce.detail?.executionId ?? '') !== myId) return;
            setShowExecutionFinancialHub(false);
            setShowUnifiedExecutionModal(false);
            setShowUnifiedSummonsModal(false);
            setShowNotesModal(false);
            setShowDocumentsModal(false);
            setShowAppointmentModal(false);
            setShowTimelineModal(false);
            setShowNotificationModal(false);
            const tab = String(ce.detail?.tab || '').trim();
            if (tab === 'current' || tab === 'previous' || tab === 'appeals') {
                setDecisionsModalBootListTab(tab);
                setDecisionsModalBootHubTab(tab === 'appeals' ? 'appeals' : null);
            }
            const did = String(ce.detail?.decisionId || '').trim();
            if (did) {
                if (tab === 'appeals') {
                    setAppealsModalScrollToDecisionId(did);
                    setDecisionsModalScrollToDecisionId(null);
                } else {
                    setDecisionsModalScrollToDecisionId(did);
                    setAppealsModalScrollToDecisionId(null);
                }
            }
            setShowDecisionsModal(true);
        };
        window.addEventListener('hami-open-decisions-modal', handler as EventListener);
        return () => window.removeEventListener('hami-open-decisions-modal', handler as EventListener);
    }, [
        executionData?.id,
        executionId,
        setShowUnifiedExecutionModal,
        setShowUnifiedSummonsModal,
        setShowNotesModal,
        setShowDocumentsModal,
        setShowAppointmentModal,
        setShowTimelineModal,
        setShowNotificationModal,
    ]);

    /** تعبئة مسبقة لحقول النافذة عند وضع إكمال ما بعد الموافقة */
    useLayoutEffect(() => {
        if (!showCoerciveActionForm || !seizureDetailCompletion) return;
        const asset = seizedAssets.find((a) => a.id === seizureDetailCompletion.assetId);
        if (!asset?.details || typeof asset.details !== 'object') return;
        const det = asset.details as Record<string, string>;
        const setVal = (id: string, v: string) => {
            const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
            if (el) el.value = v || '';
        };
        setVal('employerName', det.employerName || '');
        setVal('salaryAmountInput', det.salaryAmount || '');
        setVal('propertyAddress', det.propertyAddress || '');
        setVal('propertyLocation', det.propertyLocation || '');
        setVal('movableAssetType', det.movableAssetType || det.vehicleDescription || '');
        setVal('movableEstimatedValue', det.movableEstimatedValueIqd || '');
        setVal('movableNotes', det.movableNotes || '');
    }, [showCoerciveActionForm, seizureDetailCompletion, seizedAssets]);

    const openGuarantorDetailsModal = useCallback((decisionId?: string) => {
        const exId = String(executionData?.id ?? executionId ?? '').trim();
        const did = String(decisionId ?? '').trim();
        if (did) {
            setGuarantorDetailsDecisionId(did);
        } else if (exId) {
            const rows = readExecutorDecisionsArray(exId) as Array<Record<string, unknown>>;
            const candidates = rows.filter(
                (r) =>
                    String(r.requestKind || '') === 'guarantor_request' &&
                    (String((r as any).executorOutcome || '') === 'approved' ||
                        String((r as any).executorOutcome || '') === 'alternative') &&
                    !Boolean(String((r as any).guarantorDetailsSavedAt || '').trim())
            );
            if (candidates.length > 0) {
                const best = candidates.reduce((acc, cur) => {
                    const a = String((acc as any).resolvedAt ?? (acc as any).date ?? '');
                    const b = String((cur as any).resolvedAt ?? (cur as any).date ?? '');
                    return b.localeCompare(a, undefined, { numeric: true }) > 0 ? cur : acc;
                }, candidates[0]);
                const bestId = String((best as any).id || '').trim();
                if (bestId) setGuarantorDetailsDecisionId(bestId);
            }
        }
        const gf = executionData?.guarantor_followup;
        setGuarantorNameDraft(String(gf?.guarantor_name ?? '').trim());
        setGuarantorWorkplaceDraft(String(gf?.guarantor_workplace ?? '').trim());
        setGuarantorGuaranteeTypeDraft(gf?.guarantee_type === 'attendance' ? 'attendance' : 'amount');
        setGuarantorSalaryDraft(
            gf?.guarantor_salary_iqd != null && !Number.isNaN(Number(gf.guarantor_salary_iqd))
                ? String(gf.guarantor_salary_iqd)
                : ''
        );
        setGuarantorDeductionDraft(
            gf?.guarantor_deduction_iqd != null && !Number.isNaN(Number(gf.guarantor_deduction_iqd))
                ? String(gf.guarantor_deduction_iqd)
                : ''
        );
        setShowGuarantorDetailsModal(true);
    }, [executionData?.guarantor_followup, executionData?.id, executionId]);

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; decisionId?: string }>;
            if (String(ce.detail?.executionId ?? '') !== String(executionData?.id ?? executionId ?? '')) return;
            const nowMs = Date.now();
            if (nowMs - guarantorAutoOpenStampRef.current > 1200) {
                guarantorAutoOpenStampRef.current = nowMs;
                const did = String(ce.detail?.decisionId || '').trim();
                if (did) setGuarantorDetailsDecisionId(did);
                openGuarantorDetailsModal();
            }
        };
        window.addEventListener('hami-open-guarantor-details', handler as EventListener);
        return () =>
            window.removeEventListener('hami-open-guarantor-details', handler as EventListener);
    }, [executionData?.id, executionId, openGuarantorDetailsModal]);

    const forcedBringDecisionState = useMemo(
        () => getPersonalCoerciveSubtypeOutcome(executionData?.id ?? executionId, 'forced_bring_in'),
        [executionData?.id, executionId, decisionsReloadEpoch]
    );

    const employeeForcedBringAwaitingPersonalOutcome = useMemo(
        () =>
            Boolean(
                forcedBringDecisionState.approved &&
                    executionData?.forced_bring_in_personal_outcome !== 'brought' &&
                    executionData?.forced_bring_in_personal_outcome !== 'absconded'
            ),
        [forcedBringDecisionState.approved, executionData?.forced_bring_in_personal_outcome]
    );

    useEffect(() => {
        if (!executionData?.id) return;
        /** منع تسرّب محجوزات/إجراءات إكراهية من إضبارة سابقة عند غياب الحقول في الملف الحالي */
        setSeizedAssets(Array.isArray(executionData.seizedAssets) ? executionData.seizedAssets : []);
        const ac = (executionData as ExecutionFile).activeCoerciveActions;
        setActiveCoerciveActions(Array.isArray(ac) ? [...ac] : []);
        const dr = executionData.seizureDraftsByDecisionId;
        setSeizureDraftsByDecisionId(
            dr && typeof dr === 'object' && !Array.isArray(dr) ? (dr as Record<string, SeizedAsset>) : {}
        );
        setForcedAttendanceIssued(
            typeof executionData.forcedAttendanceIssued === 'boolean'
                ? executionData.forcedAttendanceIssued
                : false
        );
        setActiveNoticeState(executionData.activeNoticeState ?? null);
        setCaseTasksPending(
            Array.isArray(executionData.caseTasksPending) ? executionData.caseTasksPending : []
        );
        setAiCopilotEnabled(Boolean(executionData.ai_copilot_enabled));
        setAiCopilotResult(executionData.ai_copilot_last_result ?? null);
    }, [
        executionData?.id,
        executionData?.updatedAt,
        executionData?.seizedAssets,
        executionData?.forcedAttendanceIssued,
        executionData?.activeNoticeState,
        (executionData as ExecutionFile)?.activeCoerciveActions,
        executionData?.seizureDraftsByDecisionId,
        executionData?.caseTasksPending,
        executionData?.ai_copilot_enabled,
        executionData?.ai_copilot_last_result,
    ]);
    
    // 🆕 V10.8: EXECUTION FEE INJECTION STATE
    const [executionFeeInjected, setExecutionFeeInjected] = useState<boolean>(executionData?.executionFeeInjected || false);
    
    // 🆕 V10.8: ACCORDION STATES (moved from line 484+)
    const [isFinancialCenterExpanded, setIsFinancialCenterExpanded] = useState<boolean>(false);
    const [activeFinancialTab, setActiveFinancialTab] = useState<number>(1);
    const [showExecutionFinancialHub, setShowExecutionFinancialHub] = useState(false);
    const [executionFinancialHubTab, setExecutionFinancialHubTab] = useState<'ledger' | 'wallet'>(
        'ledger'
    );
    const [showSeizureLogModal, setShowSeizureLogModal] = useState(false);

    useEffect(() => {
        const myId = String(executionData?.id ?? executionId ?? '');
        if (!myId) return;

        const onOutcome = (e: Event) => {
            const ce = e as CustomEvent<{
                executionId?: string;
                requestKind?: string;
                outcome?: string;
                decisionId?: string;
            }>;
            if (String(ce.detail?.executionId ?? '') !== myId) return;
            if (String(ce.detail?.requestKind ?? '') !== 'seizure') return;
            const outcome = String(ce.detail?.outcome ?? '');
            if (outcome !== 'approved' && outcome !== 'alternative') return;
            const decisionId = String(ce.detail?.decisionId ?? '').trim();
            if (!decisionId) return;
            const row = getExecutorDecisionRowById(myId, decisionId) as any;
            const subtype = String(row?.seizureSubtype || '').trim();
            const savedAt = String(row?.seizureRequestSavedAt || '').trim();
            if (!subtype || savedAt) return;
            const requestLabel =
                subtype === 'property'
                    ? 'طلب حجز عقار'
                    : subtype === 'movable'
                      ? 'طلب حجز مال منقول'
                      : subtype === 'salary'
                        ? 'طلب حجز راتب'
                        : subtype === 'notice'
                          ? 'طلب وضع إشارة حجز'
                          : 'طلب حجز لدى الغير';
            showToastRef.current('تمت موافقة المنفذ على طلب الحجز — افتح واجهة الطلب لإكماله.', 'success', {
                action: {
                    label: requestLabel,
                    onClick: () => {
                        try {
                            window.dispatchEvent(
                                new CustomEvent('hami-open-seizure-completion', {
                                    detail: { executionId: myId, decisionId },
                                })
                            );
                        } catch {}
                    },
                },
            });
        };

        window.addEventListener('hami-execution-decision-outcome', onOutcome as EventListener);
        return () => {
            window.removeEventListener('hami-execution-decision-outcome', onOutcome as EventListener);
        };
    }, [executionData?.id, executionId]);
    const [heirsQuickView, setHeirsQuickView] = useState<{
        title: string;
        rows: Array<{ name: string; phone: string; address: string; isClient?: boolean }>;
    } | null>(null);
    
    // 🆕 V10.5: PERFORMANCE MONITORING
    useEffect(() => {
        PerformanceMonitor.start('ExecutionDashboard');
        return () => {
            PerformanceMonitor.end('ExecutionDashboard');
        };
    }, []);
    
    // 🚀 V11.0: REMOVED - validation moved to initial state for better performance
    
    // ✅ IMPORTANT: Don't use early returns - use conditional rendering in JSX instead
    // This avoids hooks order violations with useMemo calls that come after
    
    // ===========================
    // OMNIBUS 1:1 DATA BINDING - ZERO DATA LOSS
    // ===========================
    
    const {
        // HEADER & METADATA (Exact Binding from Modal)
        directorate = 'مديرية التنفيذ',
        fileNumber = '0000',
        fileYear = '2026',
        executionNumber = fileNumber, // Use fileNumber as source of truth
        executionYear = fileYear,     // Use fileYear as source of truth
        executionType = directorate,  // Use directorate name
        
        // DOCUMENT INFO (Exact Binding)
        docType = '',
        docNumber = '',
        claimType = '',
        judgmentDate = '',
        classification = '',
        
        // PARTIES (Arrays - NO MOCK DATA)
        creditors = [],
        debtors = [],
        
        // FINANCIAL DATA (Exact Binding - STRICT 1:1 FROM CREATION FORM)
        totalAmount = 0,  // From "أصل المبلغ المحكوم به" field
        debtAmount = totalAmount, // Backward compatibility
        
        // ⚖️ COURT-ORDERED LAWYER FEES (يتحملها المدين - تُضاف للتنفيذ)
        lawyerFeesAmount = 0,  // From "أتعاب المحاماة المحكوم بها" checkbox
        executionFee = lawyerFeesAmount || 0,  // Backward compatibility
        
        // 💼 PRIVATE CLIENT FEES (يدفعها الموكل للمحامي - حسابات خاصة)
        clientFeesAmount = 0,  // From "أتعاب المحاماة المتفق عليها مع الموكل" field
        
        courtFees = 0,     // Will be calculated by financial engine
        directorateFees = 0, // Will be calculated by financial engine
        
        // ALIMONY SPECIFIC
        monthlyAlimony = 0,
        alimony = null,
        accumulatedAlimony = alimony?.calculated?.totalAccumulated || 0,
        
        // LEGAL LOGIC FLAGS
        initiator = 'الدائن',
        representedParty = 'creditor',
        daysSinceNotice = 0, // ⚠️ DEPRECATED: استخدم daysSinceNoticeCalculated بدلاً منها
        isAlimonyCase = claimType?.includes('نفقة'),
        lastPaymentDate = null,
        
        // SHARIA DEED DATA (if applicable)
        shariaDeedNumber = '',
        shariaRegisterNumber = '',
        shariaIssueDate = '',
        shariaIssuingCourt = '',
        
        // COMMERCIAL PAPER DATA (if applicable)
        chequeBankName = '',
        chequeIssueDate = '',
        chequeNumber = '',
        
        // OTHER
        status = 'active',
        createdAt = null,
        
        // مشاهدة واستصحاب (من ExecutionCreationView)
        includesSleepover = false,
        visitationChildrenNames,
        custodyWardNames,

        property_number: evictionPropertyNumber = '',
        district: evictionPropertyDistrict = '',
        property_type: evictionPropertyTypeField = '',
        full_address: evictionFullAddressField = '',
        eviction_premises_use: evictionPremisesUseRaw = undefined,

    } = executionData;
    
    const visitChildNames = Array.isArray(visitationChildrenNames) ? visitationChildrenNames : [];
    const custodyWardNamesList = Array.isArray(custodyWardNames) ? custodyWardNames : [];

    const evictionPremisesUseResolved = useMemo(
        () =>
            inferEvictionPremisesUse({
                explicit: evictionPremisesUseRaw ?? null,
                propertyTypeText: evictionPropertyTypeField,
            }),
        [evictionPremisesUseRaw, evictionPropertyTypeField]
    );

    const evictionCaseExpensesSum = useMemo(
        () => evictionCaseExpenses.reduce((s, x) => s + (Number(x.amount) || 0), 0),
        [evictionCaseExpenses]
    );

    const creditorExtraMinorNames =
        claimType === 'مشاهدة' ? visitChildNames : claimType === 'تسليم ولد' ? custodyWardNamesList : [];
    const creditorExtraMinorLabel =
        claimType === 'مشاهدة' ? 'أسماء الأولاد' : claimType === 'تسليم ولد' ? 'أسماء المحضونين' : '';

    /** عرض التصنيف كما في نموذج فتح الإضبارة */
    const classificationDisplay = useMemo(() => {
        if (classification === 'شرعي') return 'شرعي / أحوال شخصية';
        if (classification === 'مدني') return 'مدني';
        if (classification && classification !== 'none') return classification;
        const cat = (executionData as { category?: string })?.category;
        if (cat === 'sharia') return 'شرعي / أحوال شخصية';
        if (cat === 'civil') return 'مدني';
        return '—';
    }, [classification, executionData]);

    const claimTypeArabicDisplay = useMemo(
        () => formatClaimTypeArabic(claimType, evictionPremisesUseResolved),
        [claimType, evictionPremisesUseResolved]
    );

    const lawyerStartedPostNoticeExecution = useMemo(
        () =>
            activeCoerciveActions.length > 0 ||
            hasAnyEvictionFieldStepRecorded(activeTimelineEvents),
        [activeCoerciveActions, activeTimelineEvents]
    );

    const judgmentDateDisplay = useMemo(() => {
        if (!judgmentDate) return '';
        const dt = new Date(judgmentDate);
        return Number.isNaN(dt.getTime()) ? judgmentDate : dt.toLocaleDateString('ar-IQ');
    }, [judgmentDate]);

    /** مطالبة مختصرة للحاوية الجوزية (سطر واحد) — مثل «تخلية» دون الشرح الطويل */
    const walnutHeaderClaimShort = useMemo(() => {
        const full = String(claimTypeArabicDisplay || '').trim();
        if (!full) return '';
        const first = full.split(/\s*[—–-]\s*/)[0]?.trim();
        return first || full;
    }, [claimTypeArabicDisplay]);

    /**
     * نوع تنفيذ يظهر في الجوزي فقط عندما يكون اختيار المحامي مميزاً
     * (لا نعرض «مدني/شرعي» هنا — تبقى في الحاوية الموسّعة).
     */
    const walnutHeaderExecShort = useMemo(() => {
        const t = String((executionData as { executionType?: string })?.executionType || '').trim();
        if (!t) return '';
        if (/^(مدني|شرعي)(\s|\/|$)/.test(t) || t === 'شرعي / أحوال شخصية') return '';
        return t;
    }, [executionData]);

    const showJudgmentMeta =
        docType === 'قرارات وأحكام المحاكم' || Boolean(docNumber?.trim()) || Boolean(judgmentDate?.trim());

    // ===========================
    // Financial debug logging removed from render path for performance
    
    const effectiveCreditors = creditors || [];
    const effectiveDebtors = useMemo(() => {
        if (Array.isArray(executionData?.debtors) && executionData.debtors.length > 0) {
            return executionData.debtors;
        }
        return debtors || [];
    }, [debtors, executionData?.debtors]);

    const partyMultiplicityExec = executionData?.party_multiplicity;
    const isSolidaryLiability = partyMultiplicityExec?.isSolidaryLiability ?? false;
    const additionalCreditorsPm = partyMultiplicityExec?.additionalCreditors ?? [];

    /** للعرض فقط: المدين الأساسي ثم الإضافيين — يطابق party_multiplicity */
    const allDebtorsUnified = useMemo((): UnifiedExecutionDebtorRow[] => {
        const rows: UnifiedExecutionDebtorRow[] = [];
        const addList = executionData?.party_multiplicity?.additionalDebtors ?? [];
        const primary = effectiveDebtors[0] as Debtor | undefined;
        if (primary) {
            const id =
                primary.id != null && String(primary.id).trim() !== ''
                    ? String(primary.id)
                    : 'primary_debtor';
            const name = String(primary.name || 'مدين').trim() || 'مدين';
            const allocRaw = Number(primary.allocated_debt);
            const paidRaw = Number(primary.paid_amount);
            const alloc = Number.isFinite(allocRaw) ? Math.max(0, allocRaw) : 0;
            const p = Number.isFinite(paidRaw) ? Math.max(0, paidRaw) : 0;
            rows.push({
                id,
                name,
                source: 'primary',
                allocated_debt: alloc,
                paid_amount: p,
                cleared: executionDebtorRowCleared(alloc, p),
            });
        }
        for (const ad of addList) {
            const alloc = Math.max(0, Number(ad.allocated_debt) || 0);
            const paid = Math.max(0, Number(ad.paid_amount) || 0);
            rows.push({
                id: String(ad.id ?? ''),
                name: String(ad.name || 'مدين').trim() || 'مدين',
                source: 'additional',
                allocated_debt: alloc,
                paid_amount: paid,
                cleared: executionDebtorRowCleared(alloc, paid, ad.status),
            });
        }
        return rows;
    }, [effectiveDebtors, executionData?.party_multiplicity]);

    type DebtorWorkspaceEntry = {
        key: string;
        unified: UnifiedExecutionDebtorRow;
        d: Debtor;
        isPrimary: boolean;
        fileDebtorIndex: number | null;
    };

    /** مدين أساسي + إضافيون — لعرض «نافذة» واحدة في الواجهة الرئيسية */
    const debtorWorkspaceEntries = useMemo((): DebtorWorkspaceEntry[] => {
        const out: DebtorWorkspaceEntry[] = [];
        const prim = effectiveDebtors[0] as Debtor | undefined;
        if (prim && allDebtorsUnified[0]) {
            out.push({
                key:
                    prim.id != null && String(prim.id).trim() !== ''
                        ? String(prim.id)
                        : 'primary_debtor',
                unified: allDebtorsUnified[0],
                d: prim,
                isPrimary: true,
                fileDebtorIndex: 0,
            });
        }
        const adds = partyMultiplicityExec?.additionalDebtors ?? [];
        for (let i = 0; i < adds.length; i++) {
            const ad = adds[i];
            const u = allDebtorsUnified[i + 1];
            if (!u) continue;
            const d = {
                id: ad.id,
                type: 'debtor' as const,
                name: ad.name,
                phone: ad.phone,
                address: ad.address,
                notificationDate: null as string | null,
                isClient: false,
                occupation: ad.isEmployee ? 'موظف' : 'كاسب',
            } as Debtor;
            out.push({
                key: String(ad.id ?? `additional-debtor-${i}`),
                unified: u,
                d,
                isPrimary: false,
                fileDebtorIndex: null,
            });
        }
        return out;
    }, [effectiveDebtors, partyMultiplicityExec?.additionalDebtors, allDebtorsUnified]);

    const creditorWorkspaceEntries = useMemo(() => {
        const out: Array<{
            key: string;
            c: Record<string, unknown>;
            isPmCreditor: boolean;
            ecIndex: number;
            pmCreditor?: AdditionalExecutionCreditor;
        }> = [];
        effectiveCreditors.forEach((c, i) => {
            out.push({
                key: String(c.id ?? `ec-${i}`),
                c: c as unknown as Record<string, unknown>,
                isPmCreditor: false,
                ecIndex: i,
            });
        });
        additionalCreditorsPm.forEach((ac) => {
            out.push({
                key: `pmc-${ac.id}`,
                c: {
                    id: ac.id,
                    name: ac.name,
                    phone: ac.phone ?? '',
                    address: '',
                    isClient: false,
                },
                isPmCreditor: true,
                ecIndex: -1,
                pmCreditor: ac,
            });
        });
        return out;
    }, [effectiveCreditors, additionalCreditorsPm]);

    const creditorNamesTextList = useMemo(() => {
        const fromMain = effectiveCreditors
            .map((c: { name?: string }) => String(c?.name ?? '').trim())
            .filter(Boolean);
        const fromPm = additionalCreditorsPm.map((c) => String(c.name ?? '').trim()).filter(Boolean);
        const merged = [...fromMain, ...fromPm];
        return merged.length ? merged.join('، ') : '';
    }, [effectiveCreditors, additionalCreditorsPm]);

    useEffect(() => {
        setExecutionDebtorTabIndex((i) => {
            if (allDebtorsUnified.length === 0) return 0;
            return Math.min(Math.max(0, i), allDebtorsUnified.length - 1);
        });
    }, [allDebtorsUnified.length, executionData?.id]);

    /** ذمة مقسومة (تبويبات): المدين النشط يحدد مسارات محضر المتابعة والإجراءات الجبرية */
    const multiDebtorMode = allDebtorsUnified.length > 1;
    const debtorBrowserTabsMode = multiDebtorMode && !isSolidaryLiability;
    const activeWorkspaceDebtorForFollowup = useMemo(() => {
        if (!debtorBrowserTabsMode || debtorWorkspaceEntries.length === 0) return null;
        return (
            debtorWorkspaceEntries[executionDebtorTabIndex] ??
            debtorWorkspaceEntries[0] ??
            null
        );
    }, [debtorBrowserTabsMode, debtorWorkspaceEntries, executionDebtorTabIndex]);

    const primaryDebtorWorkspaceKey = debtorWorkspaceEntries[0]?.key;
    const primaryDebtorKeyResolved = primaryDebtorWorkspaceKey ?? 'primary_debtor';

    const assignmentWorkspaceCtx = useMemo(
        () => ({
            splitDebtsTabs: debtorBrowserTabsMode,
            activeDebtorKey:
                debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup
                    ? activeWorkspaceDebtorForFollowup.key
                    : primaryDebtorWorkspaceKey ?? 'primary_debtor',
            activeIsPrimary: !debtorBrowserTabsMode || Boolean(activeWorkspaceDebtorForFollowup?.isPrimary),
        }),
        [debtorBrowserTabsMode, activeWorkspaceDebtorForFollowup, primaryDebtorWorkspaceKey]
    );

    const unifiedSummonsTargetDebtorKey = useMemo(
        () => summonsContextDebtorKey ?? assignmentWorkspaceCtx.activeDebtorKey,
        [summonsContextDebtorKey, assignmentWorkspaceCtx.activeDebtorKey]
    );
    const activeDebtorNoticeScope = useMemo(
        () =>
            getDebtorNoticeStateForKey(
                executionData,
                unifiedSummonsTargetDebtorKey,
                primaryDebtorKeyResolved
            ),
        [
            unifiedSummonsTargetDebtorKey,
            primaryDebtorKeyResolved,
            executionData?.debtor_notification_date_by_debtor,
            executionData?.execution_memo_anchor_date_by_debtor,
            executionData?.active_notice_state_by_debtor,
            executionData?.notice_voluntary_period_end_declared_by_debtor,
            executionData?.debtor_absence_badge_dismissed_by_debtor,
            executionData?.debtorNotificationDate,
            executionData?.execution_memo_anchor_date,
            executionData?.activeNoticeState,
            executionData?.notice_voluntary_period_end_declared,
            executionData?.debtor_absence_badge_dismissed,
            executionData?.debtors,
        ]
    );
    const scopedNotificationCount = useMemo(
        () =>
            getDebtorNotificationCountForKey(
                executionData,
                unifiedSummonsTargetDebtorKey,
                primaryDebtorKeyResolved
            ),
        [
            unifiedSummonsTargetDebtorKey,
            primaryDebtorKeyResolved,
            executionData?.notification_count_by_debtor,
            executionData?.notificationCount,
        ]
    );
    const scopedSummonsMarker = useMemo(
        () =>
            getDebtorSummonsMarkerForKey(
                executionData,
                unifiedSummonsTargetDebtorKey,
                primaryDebtorKeyResolved
            ),
        [
            unifiedSummonsTargetDebtorKey,
            primaryDebtorKeyResolved,
            executionData?.debtor_summons_marker_by_debtor,
            executionData?.debtor_summons_marker,
        ]
    );
    useEffect(() => {
        setNotificationCount((prev) =>
            prev === scopedNotificationCount ? prev : scopedNotificationCount
        );
    }, [scopedNotificationCount, unifiedSummonsTargetDebtorKey]);
    useEffect(() => {
        setDebtorSummonsMarkerLocal((prev) =>
            areDebtorSummonsMarkersEqual(prev, scopedSummonsMarker) ? prev : scopedSummonsMarker
        );
    }, [scopedSummonsMarker, unifiedSummonsTargetDebtorKey]);

    /** مصدر واحد لمحضر المتابعة: isEmployee من ملف التنفيذ للمدين النشط في التبويب */
    const activeDebtorIsEmployee = useMemo(() => {
        const d0 = effectiveDebtors[0] as Debtor | undefined;
        if (!executionData) {
            return isDebtorRowEmployee(d0);
        }
        if (debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup) {
            if (activeWorkspaceDebtorForFollowup.isPrimary) {
                return isDebtorRowEmployee((executionData.debtors?.[0] as Debtor | undefined) ?? d0);
            }
            const ad = executionData.party_multiplicity?.additionalDebtors?.find(
                (a) => String(a.id) === activeWorkspaceDebtorForFollowup.key
            );
            if (ad) return ad.isEmployee !== false;
            return isDebtorRowEmployee(activeWorkspaceDebtorForFollowup.d as Debtor);
        }
        return isDebtorRowEmployee((executionData.debtors?.[0] as Debtor | undefined) ?? d0);
    }, [
        executionData,
        executionData?.debtors,
        executionData?.party_multiplicity?.additionalDebtors,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        effectiveDebtors,
    ]);
    const activeDebtorIsDeceased = useMemo(() => {
        const d0 = effectiveDebtors[0] as (Debtor & { isDeceased?: boolean }) | undefined;
        if (!executionData) {
            return Boolean(d0?.isDeceased);
        }
        if (debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup) {
            if (activeWorkspaceDebtorForFollowup.isPrimary) {
                const p = (executionData.debtors?.[0] as (Debtor & { isDeceased?: boolean }) | undefined) ?? d0;
                return Boolean(p?.isDeceased || executionData?.is_debtor_deceased);
            }
            const ad = executionData.party_multiplicity?.additionalDebtors?.find(
                (a) => String(a.id) === activeWorkspaceDebtorForFollowup.key
            ) as unknown as ({ isDeceased?: boolean } & Record<string, unknown>) | undefined;
            if (ad) return Boolean(ad.isDeceased);
            return Boolean((activeWorkspaceDebtorForFollowup.d as { isDeceased?: boolean } | undefined)?.isDeceased);
        }
        const p = (executionData.debtors?.[0] as (Debtor & { isDeceased?: boolean }) | undefined) ?? d0;
        return Boolean(p?.isDeceased || executionData?.is_debtor_deceased);
    }, [
        executionData,
        executionData?.debtors,
        executionData?.is_debtor_deceased,
        executionData?.party_multiplicity?.additionalDebtors,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        effectiveDebtors,
    ]);

    const activeDebtorNameResolved = useMemo(() => {
        const row = allDebtorsUnified[executionDebtorTabIndex];
        return String(row?.name || debtors?.[0]?.name || 'المدين').trim();
    }, [allDebtorsUnified, executionDebtorTabIndex, debtors]);

    const employeeAssignmentPhaseForCoercive = useMemo(() => {
        if (!executionData) return null;
        const a = getEmployeeAssignmentForDebtorKey(
            executionData,
            assignmentWorkspaceCtx.activeDebtorKey,
            primaryDebtorKeyResolved
        );
        return a?.phase ?? null;
    }, [
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        assignmentWorkspaceCtx.activeDebtorKey,
        primaryDebtorKeyResolved,
    ]);

    const employeeUnlocksPersonalCoerciveFromAssignment =
        activeDebtorIsEmployee &&
        (employeeAssignmentPhaseForCoercive === 'absent_declared' ||
            employeeAssignmentPhaseForCoercive === 'investigation_pending' ||
            employeeAssignmentPhaseForCoercive === 'warrant_ui');

    /** مسار الإنشاء للمدين النشط في التبويب — لنفس نص زر ⋮ في محضر المتابعة */
    const activeDebtorInitialWasEmployee = useMemo(() => {
        if (!executionData) return undefined;
        if (debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup) {
            if (activeWorkspaceDebtorForFollowup.isPrimary) {
                const p = executionData.debtors?.[0] as Debtor | undefined;
                return typeof p?.employmentInitialWasEmployee === 'boolean'
                    ? p.employmentInitialWasEmployee
                    : undefined;
            }
            const ad = executionData.party_multiplicity?.additionalDebtors?.find(
                (a) => String(a.id) === activeWorkspaceDebtorForFollowup.key
            );
            return ad && typeof ad.employmentInitialWasEmployee === 'boolean'
                ? ad.employmentInitialWasEmployee
                : undefined;
        }
        const p = executionData.debtors?.[0] as Debtor | undefined;
        return typeof p?.employmentInitialWasEmployee === 'boolean'
            ? p.employmentInitialWasEmployee
            : undefined;
    }, [executionData, debtorBrowserTabsMode, activeWorkspaceDebtorForFollowup]);

    const activeTimelineEventsDebtorScoped = useMemo(() => {
        if (!debtorBrowserTabsMode || !activeWorkspaceDebtorForFollowup || !primaryDebtorWorkspaceKey) {
            return activeTimelineEvents;
        }
        const ak = activeWorkspaceDebtorForFollowup.key;
        return activeTimelineEvents.filter((e) =>
            timelineEventBelongsToDebtorWorkspace(e, ak, primaryDebtorWorkspaceKey)
        );
    }, [
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        activeTimelineEvents,
        primaryDebtorWorkspaceKey,
    ]);

    const filteredTimelineEvents = useMemo(() => {
        const base = debtorBrowserTabsMode ? activeTimelineEventsDebtorScoped : activeTimelineEvents;
        if (activeTimelineFilter === 'الكل') return base;
        const rule = TIMELINE_FILTER_MAP[activeTimelineFilter];
        if (!rule) return base;
        return base.filter((e) => (Array.isArray(rule) ? rule.includes(e.type) : e.type === rule));
    }, [
        debtorBrowserTabsMode,
        activeTimelineEventsDebtorScoped,
        activeTimelineEvents,
        activeTimelineFilter,
        TIMELINE_FILTER_MAP,
    ]);

    /** رادار السجل: 3 بطاقات افتراضياً، أو 5 عند وجود حدث مثبّت */
    const timelineRadarPreviewLimit = useMemo(() => {
        const ev = debtorBrowserTabsMode ? activeTimelineEventsDebtorScoped : activeTimelineEvents;
        return ev.some((e) => Boolean(e.isPinned)) ? 5 : 3;
    }, [debtorBrowserTabsMode, activeTimelineEventsDebtorScoped, activeTimelineEvents]);

    const kasabTerminationEmphasis = !activeDebtorIsEmployee;
    /** وفاة المدين: إخفاء التنفيذ الجبري الشخصي بالكامل؛ الموظف: يظهر دائماً لكن يبدأ مقفلاً مع تأكيد فتح */
    const showPersonalCoerciveFollowupTab = !activeDebtorIsDeceased;
    /** موظف: إظهار حجز الراتب في الحجز المالي — كاسب: إخفاؤه */
    const showSalarySeizureInFollowupModal = activeDebtorIsEmployee;
    const followupSalarySeizureLabel =
        activeDebtorIsDeceased && activeDebtorIsEmployee
            ? 'حجز مستحقات ومكافأة نهاية الخدمة'
            : 'طلب حجز راتب (١/٥)';
    useEffect(() => {
        const ph = employeeAssignmentPhaseForCoercive;
        if (
            ph !== 'absent_declared' &&
            ph !== 'investigation_pending' &&
            ph !== 'warrant_ui'
        ) {
            setEmployeeCompulsoryBannerDismissed(false);
        }
    }, [employeeAssignmentPhaseForCoercive]);

    const showEmployeeCompulsoryProceduresBanner =
        employeeAssignmentPhaseForCoercive === 'absent_declared' && !employeeCompulsoryBannerDismissed;
    const activeFollowupDebtorKey = String(
        assignmentWorkspaceCtx.activeDebtorKey ?? primaryDebtorWorkspaceKey ?? executionId ?? ''
    );
    const [personalTabUnlockByDebtor, setPersonalTabUnlockByDebtor] = useState<Record<string, boolean>>({});
    const employeePersonalTabUnlockStorageKey = useMemo(() => {
        const ex = String(decisionsStorageExecutionId ?? executionData?.id ?? executionId ?? '').trim();
        return ex ? `hami:employee_personal_unlock:${ex}` : '';
    }, [decisionsStorageExecutionId, executionData?.id, executionId]);

    useEffect(() => {
        if (!employeePersonalTabUnlockStorageKey) return;
        try {
            const raw = localStorage.getItem(employeePersonalTabUnlockStorageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw) as Record<string, boolean>;
            if (!parsed || typeof parsed !== 'object') return;
            setPersonalTabUnlockByDebtor((prev) => ({ ...parsed, ...prev }));
        } catch {}
    }, [employeePersonalTabUnlockStorageKey]);
    const personalTabLockedForEmployee =
        Boolean(activeDebtorIsEmployee) && !Boolean(personalTabUnlockByDebtor[activeFollowupDebtorKey]);

    const followupSectionTabOrder = useMemo(
        () =>
            [
                ...(showPersonalCoerciveFollowupTab ? (['personal'] as const) : []),
                'coercive',
                'seizure_requests',
                'special',
                'other_party',
            ] as const,
        [showPersonalCoerciveFollowupTab]
    );

    const goFollowupSectionTabByDelta = useCallback(
        (delta: number) => {
            const order = followupSectionTabOrder as readonly string[];
            if (!order.length) return;
            const cur = order.includes(unifiedModalTab) ? unifiedModalTab : order[0];
            const idx = order.indexOf(cur);
            const next = order[(idx + delta + order.length) % order.length] as any;
            setUnifiedModalTab(next);
            queueMicrotask(() => {
                const host = followupModalSectionTabsRef.current;
                if (!host) return;
                const el = host.querySelector(`[data-followup-tab="${String(next)}"]`) as HTMLElement | null;
                el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            });
        },
        [followupSectionTabOrder, unifiedModalTab]
    );

    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            const tag = t?.tagName ? t.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || (t as any)?.isContentEditable) return;
            if (!e.altKey) return;
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goFollowupSectionTabByDelta(-1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                goFollowupSectionTabByDelta(1);
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [goFollowupSectionTabByDelta, showUnifiedExecutionModal]);

    useEffect(() => {
        if (!debtorBrowserTabsMode) return;
        const n = debtorWorkspaceEntries.length;
        if (n === 0) return;
        setExecutionDebtorTabIndex((i) => {
            if (i < 0) return 0;
            if (i >= n) return n - 1;
            return i;
        });
    }, [debtorBrowserTabsMode, debtorWorkspaceEntries.length]);

    const executionFileKey = String(file?.id ?? executionId ?? '');

    /** مزامنة لمرة واحدة: إضابر قديمة وافق المنفذ على صرف الأتعاب دون حفظ eviction_lawyer_fee_requested */
    const backfillEvictionLawyerFeeRequestedRef = useRef<string | null>(null);
    useEffect(() => {
        backfillEvictionLawyerFeeRequestedRef.current = null;
    }, [executionFileKey]);

    useEffect(() => {
        setShowExtraCreditors(false);
        setShowExtraDebtors(false);
    }, [executionFileKey]);

    useEffect(() => {
        if (!executionData?.id) return;
        setEvictionVacateDeadlineLocal(executionData.eviction_vacate_deadline ?? null);
        setEvictionAssetsTabUnlocked(!!executionData.eviction_assets_tab_unlocked);
        setEvictionCaseExpenses(
            Array.isArray(executionData.eviction_case_expenses) ? executionData.eviction_case_expenses : []
        );
        const grant = executionData.eviction_executor_vacate_grant_approved;
        setEvictionExecutorVacateGrantApproved(grant === true);
        const vd = executionData.eviction_vacate_deadline;
        setEvictionVacateDraft(
            typeof vd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(vd) ? vd : ''
        );
        const gs = executionData.eviction_residential_grace_period_start;
        setEvictionResidentialGracePeriodStart(
            typeof gs === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(gs) ? gs : null
        );
        const me = executionData.eviction_residential_grace_manually_ended_at;
        setEvictionResidentialGraceManuallyEndedAt(
            typeof me === 'string' && me.trim() ? me.trim() : null
        );
        const hnd = executionData.eviction_heirs_notification_date_ymd;
        setEvictionHeirsNotificationDateYmd(
            typeof hnd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(hnd) ? hnd : ''
        );
    }, [
        executionFileKey,
        executionData?.id,
        executionData?.eviction_vacate_deadline,
        executionData?.eviction_residential_grace_period_start,
        executionData?.eviction_executor_vacate_grant_approved,
        executionData?.eviction_residential_grace_manually_ended_at,
        executionData?.eviction_heirs_notification_date_ymd,
    ]);

    useEffect(() => {
        if (!executionData?.id) return;
        setSummoningRound(executionData.summoningRound ?? 1);
        setVoluntaryAttendanceCount(executionData.voluntaryAttendanceCount ?? 0);
        setInvestigationCourtRequested(executionData.investigationCourtRequested ?? false);
        setInvestigationMemoIssued(executionData.investigationMemoIssued ?? false);
        setInvestigationPathDebtorPresent(executionData.investigationPathDebtorPresent ?? false);
        setForcedPathAttendanceSecured(executionData.forcedPathAttendanceSecured ?? false);
    }, [executionFileKey]);
    
    const executionExtras = (executionData || ({} as ExecutionFile)) as ExecutionFile & {
        perDebtorSalaries?: Record<string, string>;
        perDebtorGarnishments?: Record<string, string>;
    };
    
    // ⚖️ COURT-ORDERED LAWYER FEES (يتحملها المدين)
    const parseMoneyLike = (v: unknown): number => {
        if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
        if (typeof v === 'string') {
            const normalizeDigits = (s: string) =>
                s
                    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
                    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
            const normalized = normalizeDigits(v).replace(/\u066B/g, '.');
            const cleaned = normalized.replace(/[^0-9.]/g, '');
            const n = parseFloat(cleaned);
            return Number.isFinite(n) ? n : 0;
        }
        return 0;
    };

    const parsedDebtAmount = useMemo(() => {
        const allocatedSum = (() => {
            const d = executionData as any;
            const primary = Array.isArray(d?.debtors) ? d.debtors : [];
            const additional = Array.isArray(d?.party_multiplicity?.additionalDebtors)
                ? d.party_multiplicity.additionalDebtors
                : [];
            const sum = [...primary, ...additional].reduce((t: number, row: any) => {
                const n = parseMoneyLike(row?.allocated_debt);
                return t + (Number.isFinite(n) ? Math.max(0, n) : 0);
            }, 0);
            return Number.isFinite(sum) ? Math.max(0, sum) : 0;
        })();
        const candidates: unknown[] = [
            (executionData as any)?.totalAmount,
            (executionData as any)?.debtAmount,
            allocatedSum,
            (executionData as any)?.total_remaining_balance,
            (executionData as any)?.remainingDebt,
            totalAmount,
            debtAmount,
        ];
        for (const c of candidates) {
            const n = parseMoneyLike(c);
            if (Number.isFinite(n) && n > 0) return n;
        }
        return 0;
    }, [executionData, totalAmount, debtAmount]);
    // بعض الإضابير القديمة تخزن الأتعاب في executionFee فقط.
    const parsedLawyerFees = Math.max(parseMoneyLike(lawyerFeesAmount), parseMoneyLike(executionFee));
    const parsedExecutionFee = parsedLawyerFees; // Backward compatibility
    
    // 💼 PRIVATE CLIENT FEES (الأتعاب الخاصة - حسابات منفصلة)
    const parsedClientFees = parseMoneyLike(clientFeesAmount);
    
    const parsedCourtFees = parseMoneyLike(courtFees);
    const parsedDirectorateFees = parseMoneyLike(directorateFees);
    
    // 🆕 V21: LOAD DYNAMIC EXPENSES FROM LOCALSTORAGE
    const [dynamicExpenses, setDynamicExpenses] = useState<number>(() => {
        try {
            const saved = localStorage.getItem(executionExpensesStorageKey());
            if (saved) {
                const arr = JSON.parse(saved);
                return arr.reduce((t: number, e: any) => t + (e.amount || 0), 0);
            }
        } catch { /* ignore */ }
        return 0;
    });

    const dynamicExpensesRef = useRef(dynamicExpenses);
    dynamicExpensesRef.current = dynamicExpenses;

    useEffect(() => {
        const reload = () => {
            try {
                const saved = localStorage.getItem(executionExpensesStorageKey());
                const sum = saved
                    ? JSON.parse(saved).reduce((t: number, e: any) => t + (e.amount || 0), 0)
                    : 0;
                if (sum !== dynamicExpensesRef.current) setDynamicExpenses(sum);
            } catch { /* ignore */ }
        };

        const onStorage = (e: StorageEvent) => {
            if (e.key === executionExpensesStorageKey()) reload();
        };
        const onCustom = () => reload();

        window.addEventListener('storage', onStorage);
        window.addEventListener(executionExpensesChangedEventName(), onCustom);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener(executionExpensesChangedEventName(), onCustom);
        };
    }, []);
    
    // TOTAL EXECUTION EXPENSES (Static + Dynamic from localStorage)
    const total_execution_expenses = parsedCourtFees + parsedDirectorateFees + dynamicExpenses;

    // ===========================
    // FINANCIAL LOGIC ENGINE
    // ===========================
    
    // Check if claim is non-financial
    const NON_FINANCIAL_CLAIMS = ['مشاهدة', 'استصحاب', 'مبيت', 'تخلية مأجور', 'مطاوعة', 'تسليم طفل', 'تسليم ولد'];
    const isNonFinancialClaim =
        NON_FINANCIAL_CLAIMS.some((type) => claimType?.includes(type)) || isEvictionClaim(claimType);

    const principalDebtAmount = isNonFinancialClaim ? 0 : parsedDebtAmount;

    /** دمج مصادر نوع المطالبة حتى لا تُصنَّف إضبارة التخلية كمالية بالخطأ عند غياب claimType */
    const claimTypeForExecutionModule = useMemo(() => {
        const a = String(claimType || '').trim();
        if (a) return a;
        const b = String(
            (executionData as { claimType?: string } | undefined)?.claimType || ''
        ).trim();
        return b || a;
    }, [claimType, executionData]);

    const executionModuleStrategy = useMemo(
        () => getExecutionModuleStrategy(claimTypeForExecutionModule),
        [claimTypeForExecutionModule]
    );
    const isEvictionExecutionModule = executionModuleStrategy.useEvictionFieldProcedures;

    /** حراس قضائيون — مصفوفة + توافق مع الحقل المفرد القديم */
    const judicialCustodiansResolved = useMemo(() => {
        const d = executionData;
        if (!d) return [];
        const arr = d.eviction_judicial_custodians;
        if (Array.isArray(arr) && arr.length > 0) {
            return arr.filter((c) => c && String(c.fullName || '').trim() && String(c.savedAt || '').trim());
        }
        const leg = d.eviction_judicial_custodian;
        if (leg?.fullName?.trim() && leg.savedAt) {
            return [
                {
                    id: 'legacy_custodian',
                    fullName: leg.fullName,
                    salary: leg.salary,
                    decisionId: leg.decisionId,
                    savedAt: leg.savedAt,
                },
            ];
        }
        return [];
    }, [executionData]);

    const judicialCustodianSalariesExpenseIqd = useMemo(
        () => judicialCustodiansResolved.reduce((t, c) => t + parseLooseAmountFromText(c.salary), 0),
        [judicialCustodiansResolved]
    );

    const evictionCaseExpensesTotalForFinancial = useMemo(
        () => evictionCaseExpensesSum + (isEvictionExecutionModule ? judicialCustodianSalariesExpenseIqd : 0),
        [evictionCaseExpensesSum, isEvictionExecutionModule, judicialCustodianSalariesExpenseIqd]
    );

    /** تخلية: عدم المطالبة بالأتعاب المحكومة عند فتح الإضبارة — لا تُحسب في الإجمالي ولا في الوعاء */
    const evictionLawyerFeesInTotals =
        isEvictionExecutionModule && executionData?.eviction_lawyer_fee_waived_at_intake
            ? 0
            : parsedLawyerFees;

    // TOTAL OWED BY DEBTOR (يشمل مصاريف إضبارة التخلية المسجّلة عند تفعيل مسار التخلية)
    const totalOwed =
        principalDebtAmount +
        total_execution_expenses +
        evictionLawyerFeesInTotals +
        (isEvictionExecutionModule ? evictionCaseExpensesTotalForFinancial : 0);

    const debtorNotifiedForEvictionGrace = useMemo(
        () =>
            Boolean(
                executionData?.debtorNotificationDate ||
                    debtorNotificationDate ||
                    (effectiveDebtors[0] as { notificationDate?: string | null })?.notificationDate
            ),
        [executionData?.debtorNotificationDate, debtorNotificationDate, effectiveDebtors]
    );
    
    // Check if claim is alimony (نفقة ONLY - NOT نفقة عدة or مهر مؤجل)
    // نفقة عدة والمهر المؤجل يُعاملان كدين مالي عادي
    const isAlimonyClaim = claimType?.includes('نفقة') && !claimType?.includes('نفقة عدة') && !claimType?.includes('مهر');

    const isHybridFeesNonMonetary = useMemo(
        () =>
            isHybridFeesNonMonetaryPrincipal({
                isNonFinancialClaim,
                parsedDebtAmount: principalDebtAmount,
                parsedLawyerFees,
            }),
        [isNonFinancialClaim, principalDebtAmount, parsedLawyerFees]
    );

    const monetaryExecutionStrictPathFlag = useMemo(
        () =>
            executionMonetaryStrictPath({
                parsedDebtAmount: principalDebtAmount,
                parsedLawyerFees,
                isHybridFeesNonMonetary,
            }),
        [principalDebtAmount, parsedLawyerFees, isHybridFeesNonMonetary]
    );

    /** تنفيذ مالي صارم: يمنع إحضار الكاسب جبراً ويحصر أدوات الحجز — مستثنى النفقة */
    const monetaryStrictForSummoningEngine = monetaryExecutionStrictPathFlag && !isAlimonyClaim;
    
    /** مرساة احتساب 7 أيام (غير تخلية) أثناء دورة مذكرة الإخبار الأولى */
    const generalMemoGraceAnchor = useMemo(() => {
        if (isEvictionExecutionModule) return null;
        if (notificationCount !== 1) return null;
        if (executionData?.notice_voluntary_period_end_declared || noticeVoluntaryPeriodEndOptimistic) {
            return null;
        }
        return (
            executionData?.execution_memo_anchor_date ||
            executionData?.debtorNotificationDate ||
            debtorNotificationDate ||
            (debtors[0] as { notificationDate?: string | null })?.notificationDate ||
            null
        );
    }, [
        isEvictionExecutionModule,
        notificationCount,
        executionData?.execution_memo_anchor_date,
        executionData?.debtorNotificationDate,
        executionData?.notice_voluntary_period_end_declared,
        noticeVoluntaryPeriodEndOptimistic,
        debtorNotificationDate,
        debtors,
    ]);

    // ✅ NEW: حساب الأيام المنقضية بشكل صحيح (من اليوم التالي للتبليغ)
    const daysSinceNoticeCalculated = useMemo(() => {
        const savedNotificationDate =
            generalMemoGraceAnchor ||
            executionData?.debtorNotificationDate ||
            debtorNotificationDate ||
            debtors[0]?.notificationDate;

        if (!savedNotificationDate) {
            return 0;
        }

        return calculateActualDaysElapsed(savedNotificationDate, new Date());
    }, [
        generalMemoGraceAnchor,
        executionData?.debtorNotificationDate,
        debtorNotificationDate,
        debtors,
    ]);

    // ✅ NEW: حساب الأيام المتبقية في المهلة
    const daysRemainingInGracePeriod = useMemo(() => {
        const savedNotificationDate =
            generalMemoGraceAnchor ||
            executionData?.debtorNotificationDate ||
            debtorNotificationDate ||
            debtors[0]?.notificationDate;

        if (!savedNotificationDate) {
            return 7;
        }

        const extra = manualGraceCalendarExtra ? 1 : 0;
        return calculateDaysRemaining(savedNotificationDate, new Date(), extra);
    }, [
        generalMemoGraceAnchor,
        executionData?.debtorNotificationDate,
        debtorNotificationDate,
        debtors,
        manualGraceCalendarExtra,
    ]);

    // ✅ NEW: التحقق من انتهاء المهلة
    const isGracePeriodExpiredNow = useMemo(() => {
        const savedNotificationDate =
            generalMemoGraceAnchor ||
            executionData?.debtorNotificationDate ||
            debtorNotificationDate ||
            debtors[0]?.notificationDate;

        if (!savedNotificationDate) {
            return false;
        }

        const extra = manualGraceCalendarExtra ? 1 : 0;
        return isGracePeriodExpired(savedNotificationDate, new Date(), extra);
    }, [
        generalMemoGraceAnchor,
        executionData?.debtorNotificationDate,
        debtorNotificationDate,
        debtors,
        manualGraceCalendarExtra,
    ]);

    /**
     * تخلية: مرساة المهلة — قبل إعلان انتهاء المدة الرضائية يدوياً: أول إخبار بالتنفيذ؛
     * بعد الإعلان: آخر تاريخ تبليغ مُسجَّل (لدورة تبليغ اعتيادي لاحقة).
     */
    const evictionGraceAnchorDate = useMemo(() => {
        if (!isEvictionExecutionModule) return null;
        const fromDebtor = (effectiveDebtors[0] as { notificationDate?: string | null })?.notificationDate;
        if (!executionData?.eviction_voluntary_period_end_declared) {
            const anchor =
                executionData?.eviction_first_notice_date ||
                executionData?.debtorNotificationDate ||
                debtorNotificationDate ||
                fromDebtor ||
                null;
            return anchor ? String(anchor) : null;
        }
        const anchor =
            executionData?.debtorNotificationDate ||
            debtorNotificationDate ||
            executionData?.eviction_first_notice_date ||
            fromDebtor ||
            null;
        return anchor ? String(anchor) : null;
    }, [
        isEvictionExecutionModule,
        executionData?.eviction_voluntary_period_end_declared,
        executionData?.eviction_first_notice_date,
        executionData?.debtorNotificationDate,
        debtorNotificationDate,
        effectiveDebtors,
    ]);

    /** انتهاء تقويمي (7 أيام من اليوم التالي لتاريخ الإخبار) — لإظهار زر الإعلان اليدوي فقط */
    const isEvictionGraceExpiredCalendar = useMemo(() => {
        if (!evictionGraceAnchorDate) return false;
        return isGracePeriodExpired(evictionGraceAnchorDate, new Date(), 0);
    }, [evictionGraceAnchorDate]);

    /** ما يدخل مسار التبليغ اللاحق والإكراه في التخلية — بعد ضغط المحامي على «انتهاء مدة التنفيذ الرضائي» */
    const isEvictionGraceEffectivelyExpired = Boolean(
        executionData?.eviction_voluntary_period_end_declared || voluntaryEndOptimistic
    );

    const daysRemainingInEvictionGrace = useMemo(() => {
        if (!evictionGraceAnchorDate) return 7;
        if (isEvictionGraceEffectivelyExpired) return 0;
        return calculateDaysRemaining(evictionGraceAnchorDate, new Date(), 0);
    }, [evictionGraceAnchorDate, isEvictionGraceEffectivelyExpired]);

    const isEvictionGraceExpiredNow = isEvictionGraceEffectivelyExpired;

    useEffect(() => {
        if (executionData?.eviction_voluntary_period_end_declared === true) {
            setVoluntaryEndOptimistic(false);
        }
    }, [executionData?.eviction_voluntary_period_end_declared]);

    useEffect(() => {
        if (executionData?.notice_voluntary_period_end_declared === true) {
            setNoticeVoluntaryPeriodEndOptimistic(false);
        }
    }, [executionData?.notice_voluntary_period_end_declared]);

    const unifiedCollectionApproved = useMemo(
        () => hasApprovedUnifiedCollection(String(executionData?.id ?? executionId ?? '')),
        [executionData?.id, executionId, decisionsReloadEpoch]
    );

    /** محرك الحصانة: إحضار جبري — موظف / كاسب / كفيل / نفقة / مهلة الإخبار */
    const smNature = executionData?.summoningClaimNature;
    const smIsAlimonyFlag = executionData?.isAlimony;
    const smSalaryCovers = executionData?.salaryCoversAlimony;
    const smHasGuarantorFile = executionData?.hasGuarantor;
    const smExecutionTarget = executionData?.executionTarget;

    const forcedSummoningAnalysis = useMemo(() => {
        const d0 = (
            debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup
                ? activeWorkspaceDebtorForFollowup.d
                : effectiveDebtors[0]
        ) as Debtor & { employmentType?: 'موظف' | 'كاسب'; hasGuarantor?: boolean };
        const notificationDateForSummoning =
            isEvictionExecutionModule && evictionGraceAnchorDate
                ? evictionGraceAnchorDate
                : executionData?.debtorNotificationDate ?? debtorNotificationDate ?? d0?.notificationDate ?? null;

        const timelineForAttendance = activeTimelineEventsDebtorScoped;
        const hasAttendanceHistorySummoning =
            debtorAttendedVoluntarily ||
            voluntaryAttendanceCount > 0 ||
            timelineForAttendance.some(
                (e) =>
                    (e.title && /حضور/.test(e.title)) ||
                    (e.description && /حضور المدين/.test(e.description || ''))
            );

        const employmentType = deriveEmploymentType(d0?.occupation, d0?.employmentType ?? null);
        const claimNature = deriveMonetaryClaimNature(claimType, smNature ?? null);
        const isAlimonyExec =
            typeof smIsAlimonyFlag === 'boolean' ? smIsAlimonyFlag : isAlimonyClaim;
        const salaryCoversAlimony = smSalaryCovers === true;
        const hasG =
            smHasGuarantorFile === true ||
            d0?.hasGuarantor === true ||
            (typeof smExecutionTarget === 'string' && smExecutionTarget.includes('كفيل'));

        const raw = canBeForcefullySummoned({
            notificationDate: notificationDateForSummoning,
            employmentType,
            claimNature,
            isAlimony: isAlimonyExec,
            salaryCoversAlimony,
            hasGuarantor: hasG,
            hasAttendanceHistory: hasAttendanceHistorySummoning,
            forcedAttendanceIssued,
            graceExtraCalendarDays:
                isEvictionExecutionModule ? 0 : manualGraceCalendarExtra ? 1 : 0,
            monetaryExecutionStrict: monetaryStrictForSummoningEngine,
        });
        if (
            isEvictionExecutionModule &&
            notificationCount === 1 &&
            !(executionData?.eviction_voluntary_period_end_declared || voluntaryEndOptimistic) &&
            raw.canForceSummon
        ) {
            return {
                ...raw,
                canForceSummon: false,
                lockReasonAr:
                    'أعلِن «انتهاء مدة التنفيذ الرضائي» من «التبليغ» بعد انتهاء المدة التقويمية من تاريخ التبليغ المُسجَّل.',
                calendarGateOpen: false,
            };
        }
        return raw;
    }, [
        effectiveDebtors,
        isEvictionExecutionModule,
        evictionGraceAnchorDate,
        executionData?.debtorNotificationDate,
        executionData?.eviction_voluntary_period_end_declared,
        voluntaryEndOptimistic,
        notificationCount,
        debtorNotificationDate,
        claimType,
        smNature,
        smIsAlimonyFlag,
        smSalaryCovers,
        smHasGuarantorFile,
        smExecutionTarget,
        isAlimonyClaim,
        monetaryStrictForSummoningEngine,
        debtorAttendedVoluntarily,
        activeTimelineEventsDebtorScoped,
        forcedAttendanceIssued,
        manualGraceCalendarExtra,
        voluntaryAttendanceCount,
    ]);
    
    // Calculate 3% execution fee (RENAMED to avoid collision with user input)
    // ✅ FIXED: استخدام daysSinceNoticeCalculated بدلاً من daysSinceNotice
    // في التخلية: لا يُحتسب رسم 3% قبل طلب صرف الأتعاب المحكومة صراحةً
    const shouldCalculateExecutionFeeBase =
        !isAlimonyClaim && initiator === 'الدائن' && daysSinceNoticeCalculated > 7 && paidDebt < totalOwed;
    const shouldCalculateExecutionFee =
        shouldCalculateExecutionFeeBase &&
        (!isEvictionExecutionModule || Boolean(executionData?.eviction_lawyer_fee_requested));
    const calculatedExecutionFee = shouldCalculateExecutionFee ? (principalDebtAmount + parsedCourtFees) * 0.03 : 0;
    
    // Total with calculated 3% execution fee (if applicable)
    const totalWithExecutionFee = totalOwed + calculatedExecutionFee;
    
    // Remaining balance
    const remaining = totalWithExecutionFee - (paidDebt + paidCourtFees + paidDirectorateFees + paidClientFees);

    // Breach detection (missed payment or expired notice)
    // ✅ FIXED: استخدام daysSinceNoticeCalculated
    const isInBreach = (daysSinceNoticeCalculated > 7 && paidDebt === 0) || remaining > 0;
    
    // ===========================
    // STATUTE OF LIMITATIONS CALCULATION (7 YEARS)
    // ===========================
    const statuteStatus = useMemo(() => {
        if (isAlimonyClaim) return null;
        
        const actionDate =
            dossierLifecycleRow?.lastActionDate || lastActionDate || debtorNotificationDate;
        if (!actionDate) return null;
        
        const lastAction = new Date(actionDate);
        const now = new Date();
        const daysPassed = Math.floor((now.getTime() - lastAction.getTime()) / (1000 * 60 * 60 * 24));
        const sevenYearsInDays = 7 * 365;
        const daysRemaining = sevenYearsInDays - daysPassed;
        const yearsRemaining = daysRemaining / 365;
        
        return {
            daysRemaining,
            yearsRemaining,
            isCritical: yearsRemaining <= 0.5,
            isExpired: daysRemaining <= 0
        };
    }, [isAlimonyClaim, dossierLifecycleRow?.lastActionDate, lastActionDate, debtorNotificationDate]);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🧠 STATE MACHINE: THE SINGLE SOURCE OF TRUTH
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Calculate the MASTER STATE using the State Machine
    const masterState = useMemo(() => {
        const memoAnchorGeneral =
            executionData?.execution_memo_anchor_date ||
            executionData?.debtorNotificationDate ||
            debtorNotificationDate ||
            null;
        const lastNoticeGeneral =
            executionData?.debtorNotificationDate || debtorNotificationDate || null;

        const skipLegalGraceGeneral =
            summoningRound >= 2 ||
            (notificationCount >= 2 && !isEvictionExecutionModule) ||
            Boolean(
                !isEvictionExecutionModule &&
                    (executionData?.notice_voluntary_period_end_declared ||
                        noticeVoluntaryPeriodEndOptimistic)
            );

        // Prepare debtors array with notification dates
        // ✅ FIXED: Proper type for debtor
        const debtorsWithNotification = debtors.map((debtor: Debtor, index: number) => ({
            id: String(debtor.id ?? `debtor_${index}`),
            name: debtor.name || 'مدين غير معروف',
            notificationDate: isEvictionExecutionModule
                ? executionData?.eviction_first_notice_date ||
                  executionData?.debtorNotificationDate ||
                  debtor.notificationDate ||
                  debtorNotificationDate ||
                  null
                : notificationCount === 1 &&
                    !executionData?.notice_voluntary_period_end_declared &&
                    !noticeVoluntaryPeriodEndOptimistic
                  ? memoAnchorGeneral || debtor.notificationDate || lastNoticeGeneral
                  : lastNoticeGeneral || debtor.notificationDate,
        }));

        return calculateGlobalFileState(
            executionData.id || executionId || 'unknown',
            debtorsWithNotification,
            remaining,
            isPaused,
            pauseReason,
            isAlimonyClaim,
            executionFeeAdded,
            new Date(),
            isEvictionExecutionModule ? false : manualGraceCalendarExtra,
            isEvictionExecutionModule ? summoningRound >= 2 : skipLegalGraceGeneral
        );
    }, [
        debtors,
        debtorNotificationDate,
        remaining,
        isPaused,
        pauseReason,
        isAlimonyClaim,
        executionFeeAdded,
        manualGraceCalendarExtra,
        executionData?.debtorNotificationDate,
        executionData?.eviction_first_notice_date,
        executionData?.execution_memo_anchor_date,
        executionData?.notice_voluntary_period_end_declared,
        executionData.id,
        executionId,
        summoningRound,
        isEvictionExecutionModule,
        notificationCount,
        noticeVoluntaryPeriodEndOptimistic,
    ]);

    const executionStatusRaw = masterState.globalStatus;
    const executionStatus = useMemo(() => {
        if (isEvictionExecutionModule && remaining > 0) {
            if (notificationCount >= 2) return executionStatusRaw;
            const hasNotif = Boolean(
                executionData?.debtorNotificationDate || debtorNotificationDate || debtors[0]?.notificationDate
            );
            if (!hasNotif) return executionStatusRaw;
            if (executionData?.eviction_voluntary_period_end_declared || voluntaryEndOptimistic) {
                return 'READY_FOR_COERCIVE' as const;
            }
            if (executionStatusRaw === 'READY_FOR_COERCIVE' || executionStatusRaw === 'GRACE_PERIOD') {
                return 'GRACE_PERIOD' as const;
            }
            return executionStatusRaw;
        }
        if (!isEvictionExecutionModule && remaining > 0 && notificationCount === 1) {
            const hasNotif = Boolean(
                executionData?.debtorNotificationDate || debtorNotificationDate || debtors[0]?.notificationDate
            );
            if (!hasNotif) return executionStatusRaw;
            if (
                executionData?.notice_voluntary_period_end_declared ||
                noticeVoluntaryPeriodEndOptimistic
            ) {
                return 'READY_FOR_COERCIVE' as const;
            }
            if (executionStatusRaw === 'READY_FOR_COERCIVE' || executionStatusRaw === 'GRACE_PERIOD') {
                return 'GRACE_PERIOD' as const;
            }
        }
        return executionStatusRaw;
    }, [
        isEvictionExecutionModule,
        remaining,
        notificationCount,
        executionStatusRaw,
        executionData?.eviction_voluntary_period_end_declared,
        voluntaryEndOptimistic,
        executionData?.notice_voluntary_period_end_declared,
        noticeVoluntaryPeriodEndOptimistic,
        executionData?.debtorNotificationDate,
        debtorNotificationDate,
        debtors,
    ]);

    const statusMetadata = getStatusMetadata(executionStatus);
    const stayOfExecutionActive = Boolean(executionData?.stay_of_execution?.active);
    const coerciveUiLocked = executionPaused || isPaused || stayOfExecutionActive;
    /** ذمة مقسومة: المدين النشط في تبويب محضر المتابعة أوفى حصته */
    const dividedActiveDebtorCleared =
        !isSolidaryLiability &&
        allDebtorsUnified.length > 1 &&
        Boolean(allDebtorsUnified[executionDebtorTabIndex]?.cleared);
    /** تعطيل أزرار الحجز/الإجراء الجبري داخل محضر المتابعة عند إيقاف الإضبارة أو براءة ذمة التبويب */
    const executionCoerciveButtonDisabled = coerciveUiLocked || dividedActiveDebtorCleared;

    const dossierStatusUi = dossierLifecycleRow?.dossierStatus ?? 'active';
    const coerciveDossierLocked = dossierStatusUi !== 'active';
    /**
     * محضر المتابعة والأدوات الجبرية: تُقفَل فقط عند الإيقاف/الاستئخار — لا تُعطَّل لمجرد انتهاء الإضبارة
     * (سياسة Zero-Lock بعد وفاة المدين؛ مسؤولية المحامي).
     */
    /** تعطيل أزرار أدوات الإضبارة (عدا مركز الحالات الخاصة) */
    const executionActionsGridLocked = stayOfExecutionActive;
    const executionToolsTimelineLockedUi = executionActionsGridLocked || isHistoricalMode;
    /** تخلية: إظهار أدوات مذكرة إخبار الورثة عند وفاة المدين */
    const isDebtorDeceasedForEvictionHeirs =
        executionData?.is_debtor_deceased === true ||
        executionData?.party_death_case?.deceased_party === 'debtor' ||
        Boolean(debtors[0] && (debtors[0] as { isDeceased?: boolean }).isDeceased);

    const lawyerFeePayoutApproved = useMemo(
        () => hasApprovedLawyerFeePayout(String(executionData?.id ?? executionId ?? '')),
        [executionData?.id, executionId, decisionsReloadEpoch]
    );

    const creditorDeathMarked = useMemo(() => {
        const c0 = executionData?.creditors?.[0] as { isDeceased?: boolean } | undefined;
        return Boolean(executionData?.is_creditor_deceased || c0?.isDeceased);
    }, [executionData?.is_creditor_deceased, executionData?.creditors]);

    const debtorDeathMarked = useMemo(() => {
        const d0 = executionData?.debtors?.[0] as { isDeceased?: boolean } | undefined;
        return Boolean(executionData?.is_debtor_deceased || d0?.isDeceased);
    }, [executionData?.is_debtor_deceased, executionData?.debtors]);

    const creditorDeathMenuLabel = useMemo(
        () =>
            creditorDeathMarked
                ? 'طلب إحلال ورثة محل الدائن المتوفي'
                : 'الإبلاغ عن وفاة الدائن',
        [creditorDeathMarked]
    );

    const debtorDeathMenuLabel = useMemo(
        () =>
            debtorDeathMarked
                ? 'طلب إحلال ورثة محل المدين المتوفي'
                : 'الإبلاغ عن وفاة المدين',
        [debtorDeathMarked]
    );


    const notifDateForEvictionVacate =
        executionData?.debtorNotificationDate || debtorNotificationDate || debtors[0]?.notificationDate;

    const residentialVacateDeadlineMaxIso = useMemo(() => {
        if (!notifDateForEvictionVacate) return '';
        return getResidentialVacateDeadlineMaxIso(
            String(notifDateForEvictionVacate),
            manualGraceCalendarExtra ? 1 : 0
        );
    }, [notifDateForEvictionVacate, manualGraceCalendarExtra]);

    const notificationLayerOkEviction = debtorNotifiedForEvictionGrace && isEvictionGraceExpiredNow;

    /** مهلة التخلية السكنية: انتهت بتقويم تاريخ الانتهاء المسجّل */
    const isResidentialVacateGraceFinished = useMemo(() => {
        if (evictionPremisesUseResolved !== 'residential') return false;
        if (evictionVacateDeadlineLocal && isVacateDeadlinePassed(evictionVacateDeadlineLocal)) return true;
        return false;
    }, [evictionPremisesUseResolved, evictionVacateDeadlineLocal]);

    const evictionVacateLayerOk = useMemo(() => {
        if (evictionPremisesUseResolved === 'commercial') return true;
        return Boolean(
            evictionExecutorVacateGrantApproved &&
                evictionVacateDeadlineLocal &&
                isResidentialVacateGraceFinished
        );
    }, [
        evictionPremisesUseResolved,
        evictionVacateDeadlineLocal,
        evictionExecutorVacateGrantApproved,
        isResidentialVacateGraceFinished,
    ]);

    /** التخلية الميدانية: لا تُقفَل لمجرد حالة آلة حياة الإضبارة؛ فقط عند موقف قانوني (إيقاف/استئخار). */
    const evictionProcedureLocked = coerciveUiLocked;

    const evictionProcedureLockHint = useMemo(() => {
        if (coerciveUiLocked) return 'موقوفة.';
        if (coerciveDossierLocked) return 'الإجراءات الجبرية مقفلة — الإضبارة ليست نشطة.';
        if (!debtorNotifiedForEvictionGrace) return 'أكمل التبليغ من «التبليغ».';
        if (notificationCount < 2) {
            if (!isEvictionGraceEffectivelyExpired) {
                if (isEvictionGraceExpiredCalendar) {
                    return 'انتهت المدة التقويمية — سجّل «انتهاء مدة التنفيذ الرضائي» من «التبليغ».';
                }
                return `باقٍ على الإخبار: ${daysRemainingInEvictionGrace} يوماً.`;
            }
        }
        if (evictionPremisesUseResolved === 'residential') {
            if (!evictionVacateDeadlineLocal) {
                return `سجّل تاريخ انتهاء المهلة (≤ ${residentialVacateDeadlineMaxIso || '—'}).`;
            }
            if (!evictionExecutorVacateGrantApproved) {
                return 'سجّل موافقة المنفذ على إعطاء المهلة.';
            }
            if (!isResidentialVacateGraceFinished) {
                return `بانتظار انتهاء المهلة (${evictionVacateDeadlineLocal}).`;
            }
        }
        return '';
    }, [
        coerciveUiLocked,
        coerciveDossierLocked,
        debtorNotifiedForEvictionGrace,
        notificationCount,
        isEvictionGraceEffectivelyExpired,
        isEvictionGraceExpiredCalendar,
        daysRemainingInEvictionGrace,
        evictionPremisesUseResolved,
        evictionVacateDeadlineLocal,
        residentialVacateDeadlineMaxIso,
        evictionExecutorVacateGrantApproved,
        isResidentialVacateGraceFinished,
    ]);

    const evictionGraceBadgeInfo: EvictionGraceBadgeInfo | null = useMemo(() => {
        if (!isEvictionExecutionModule) return null;
        if (evictionPremisesUseResolved !== 'residential') return null;
        const start = evictionResidentialGracePeriodStart;
        const end = evictionVacateDeadlineLocal;
        if (!start || !end) return null;
        if (evictionResidentialGraceManuallyEndedAt) return null;
        if (isVacateDeadlinePassed(end)) return null;
        const daysTotal = evictionInclusiveCalendarDays(start, end);
        const remainingDays = evictionInclusiveCalendarDays(getLocalTodayYmd(), end);
        return {
            startYmd: start,
            endYmd: end,
            daysTotal: Math.max(0, daysTotal || 0),
            remainingDays: Math.max(0, remainingDays || 0),
        };
    }, [
        isEvictionExecutionModule,
        evictionPremisesUseResolved,
        evictionResidentialGracePeriodStart,
        evictionVacateDeadlineLocal,
        evictionResidentialGraceManuallyEndedAt,
    ]);

    const policeAssistanceBadgeInfo: PoliceAssistanceBadgeInfo | null = useMemo(() => {
        if (!isEvictionExecutionModule) return null;
        const st = executionData?.eviction_police_assistance;
        if (!st || st.completedAt) return null;
        const remainingDays = st.dueYmd ? evictionInclusiveCalendarDays(getLocalTodayYmd(), st.dueYmd) : null;
        return {
            agencyName: st.agencyName,
            dueYmd: st.dueYmd,
            remainingDays: typeof remainingDays === 'number' ? Math.max(0, remainingDays) : undefined,
        };
    }, [
        isEvictionExecutionModule,
        executionData?.eviction_police_assistance?.decisionId,
        executionData?.eviction_police_assistance?.agencyName,
        executionData?.eviction_police_assistance?.dueYmd,
        executionData?.eviction_police_assistance?.savedAt,
        executionData?.eviction_police_assistance?.completedAt,
    ]);

    const openPoliceAssistanceFromBadge = useCallback(() => {
        const st = executionDataRef.current?.eviction_police_assistance;
        if (!st || st.completedAt) return;
        setPoliceAssistanceDecisionId(st.decisionId);
        setPoliceAssistanceRequestTitle('القوة الجبرية');
        setPoliceAssistanceAgencyDraft(st.agencyName);
        setPoliceAssistanceModalOpen(true);
    }, []);
    
    // Auto-add 3% execution fee when first debtor reaches READY_FOR_COERCIVE
    useEffect(() => {
        if (isEvictionExecutionModule && !executionData?.eviction_lawyer_fee_requested) {
            return;
        }
        if (masterState.canAddExecutionFee && !executionFeeAdded) {
            debug.log('🔥 [State Machine] Auto-adding 3% execution fee');
            setExecutionFeeAdded(true);
            
            // Keep storage writes namespaced + cache-coherent
            const persistKey = executionData?.id || executionId;
            if (persistKey) {
                storageCache.set(executionStorageKey(String(persistKey)), {
                    ...executionData,
                    executionFeeAdded: true,
                });
            }
            
            // Add timeline event
            const feeEvent = {
                id: `fee_${Date.now()}`,
                type: 'system',
                title: '🔥 إضافة رسوم التحصيل 3%',
                description: 'تم إضافة رسوم التحصيل تلقائياً بعد انتهاء المهلة القانونية',
                date: new Date().toISOString(),
                timestamp: new Date().toISOString(),
            };
            setTimelineEvents(prev => [feeEvent, ...prev]);
        }
    }, [
        masterState.canAddExecutionFee,
        executionFeeAdded,
        isEvictionExecutionModule,
        executionData?.eviction_lawyer_fee_requested,
    ]);
    
    // 🆕 V15: AUTO-SYNC gracePeriodEnded WITH STATE MACHINE
    // Instead of manual button click, automatically sync with calculated status
    useEffect(() => {
        const shouldBeEnded = executionStatus === 'READY_FOR_COERCIVE';
        if (shouldBeEnded && !gracePeriodEnded) {
            debug.log('🔥 [V15 Auto-Unlock] Grace period automatically ended based on State Machine');
            setGracePeriodEnded(true);
            setGracePeriodActive(false);
        }
    }, [executionStatus, gracePeriodEnded]);
    
    // 🧠 Development validation (OPTIONAL: Pass uiState to check for actual UI conflicts)
    // This validation is now PASSIVE - it only logs errors if you provide uiState parameter
    // We don't provide uiState here, so it only checks for critical status mismatches
    
    // ===========================
    // FINANCIAL CENTER ACCORDION & TABS STATE
    // ===========================
    // ✅ V10.8: Moved to top with other useState (lines 190-192)
    
    // ===========================
    // DOCUMENT DETAILS ACCORDION STATE
    // ===========================
    // ✅ V10.8: Moved to top with other useState (line 192)
    
    const financialStatus = useMemo(() => {
        if (remaining <= 0) {
            return { label: 'منتظم', color: 'emerald', pulse: false };
        }
        if (!gracePeriodEnded && daysSinceNoticeCalculated <= 7) {
            return { label: 'فترة الإمهال القانوني', color: 'amber', pulse: false };
        }
        if (gracePeriodEnded || daysSinceNoticeCalculated > 7) {
            return { label: 'جاهز للتنفيذ الجبري', color: 'rose', pulse: true };
        }
        return { label: 'إخلال - جاهز للتنفيذ', color: 'rose', pulse: true };
    }, [remaining, gracePeriodEnded, daysSinceNoticeCalculated]);
    
    // ===========================
    // SMART DEMOGRAPHIC ROUTING
    // ===========================
    const debtorOccupation = debtors[0]?.occupation?.toLowerCase() || '';
    const isDebtorGovernmentEmployee = debtorOccupation.includes('موظف') || 
                                       debtorOccupation.includes('حكومي') || 
                                       debtorOccupation === 'موظف';
    const isDebtorFreelancer = debtorOccupation.includes('كاسب') || 
                              debtorOccupation.includes('خاص') || 
                              debtorOccupation === 'كاسب';

    const isDebtorRetired =
        debtorOccupation.includes('متقاعد') || debtorOccupation.includes('تقاعد');

    const debtorSummonsProfile = useMemo(
        () =>
            getDebtorSummonsProfile({
                isGovernmentEmployee: isDebtorGovernmentEmployee || isDebtorRetired,
                parsedDebtAmount: principalDebtAmount,
                parsedLawyerFees: parsedLawyerFees,
                claimType: claimType || '',
                isNonFinancialClaim,
            }),
        [
            isDebtorGovernmentEmployee,
            isDebtorRetired,
            principalDebtAmount,
            parsedLawyerFees,
            claimType,
            isNonFinancialClaim,
        ]
    );

    const followupDebtorSummonsProfile = useMemo(() => {
        if (!debtorBrowserTabsMode || !activeWorkspaceDebtorForFollowup) {
            return debtorSummonsProfile;
        }
        const d = activeWorkspaceDebtorForFollowup.d as { occupation?: string };
        const occ = String(d?.occupation || '').toLowerCase();
        const fe =
            occ.includes('موظف') || occ.includes('حكومي') || occ === 'موظف';
        const ret = occ.includes('متقاعد') || occ.includes('تقاعد');
        return getDebtorSummonsProfile({
            isGovernmentEmployee: fe || ret,
            parsedDebtAmount: principalDebtAmount,
            parsedLawyerFees,
            claimType: claimType || '',
            isNonFinancialClaim,
        });
    }, [
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        debtorSummonsProfile,
        principalDebtAmount,
        parsedLawyerFees,
        claimType,
        isNonFinancialClaim,
    ]);

    const followupIsDebtorGovernmentEmployee = useMemo(() => {
        if (!debtorBrowserTabsMode || !activeWorkspaceDebtorForFollowup) {
            return isDebtorGovernmentEmployee;
        }
        if (activeWorkspaceDebtorForFollowup.isPrimary) {
            return isDebtorGovernmentEmployee;
        }
        const occ = String(activeWorkspaceDebtorForFollowup.d.occupation || '').toLowerCase();
        return occ.includes('موظف') || occ.includes('حكومي') || occ === 'موظف';
    }, [debtorBrowserTabsMode, activeWorkspaceDebtorForFollowup, isDebtorGovernmentEmployee]);

    const followupIsDebtorRetired = useMemo(() => {
        if (!debtorBrowserTabsMode || !activeWorkspaceDebtorForFollowup) {
            return isDebtorRetired;
        }
        if (activeWorkspaceDebtorForFollowup.isPrimary) {
            return isDebtorRetired;
        }
        const occ = String(activeWorkspaceDebtorForFollowup.d.occupation || '').toLowerCase();
        return occ.includes('متقاعد') || occ.includes('تقاعد');
    }, [debtorBrowserTabsMode, activeWorkspaceDebtorForFollowup, isDebtorRetired]);

    const showSalaryCaptureForEmployee = useMemo(
        () =>
            shouldShowEmployeeSalaryCapture({
                profile: debtorSummonsProfile,
                claimType: claimType || '',
                parsedLawyerFees: parsedLawyerFees,
            }),
        [debtorSummonsProfile, claimType, parsedLawyerFees]
    );

    /** كاسب: إحضار جبري يُقفل حتى انتهاء المهلة دون حضور، أو من جولة 2 فما فوق */
    const earnerForcedActionUnlocked = useMemo(() => {
        if (!isEarnerLikeSummonsBranch(debtorSummonsProfile)) return false;
        /** تخلية + موظف: لا إحضار جبري من مسار التبليغ */
        if (isEvictionExecutionModule && isDebtorGovernmentEmployee) return false;
        if (forcedAttendanceIssued) return false;
        if (summoningRound >= 2) return true;
        /** كاسب + تخلية: بعد تبليغ ثانٍ وموافقة استحصال يُسمح بمسار الإحضار الجبري */
        if (
            isEvictionExecutionModule &&
            !isDebtorGovernmentEmployee &&
            !isDebtorRetired &&
            unifiedCollectionApproved &&
            executionData?.eviction_last_summons_for_collection === true &&
            executionData?.eviction_last_collection_summons_branch === 'coercive'
        ) {
            return true;
        }
        const graceDone = isEvictionExecutionModule ? isEvictionGraceExpiredNow : isGracePeriodExpiredNow;
        if (!graceDone || debtorAttendedVoluntarily) return false;
        return true;
    }, [
        debtorSummonsProfile,
        isEvictionExecutionModule,
        isDebtorGovernmentEmployee,
        isDebtorRetired,
        unifiedCollectionApproved,
        executionData?.eviction_last_summons_for_collection,
        executionData?.eviction_last_collection_summons_branch,
        notificationCount,
        forcedAttendanceIssued,
        summoningRound,
        isEvictionGraceExpiredNow,
        isGracePeriodExpiredNow,
        debtorAttendedVoluntarily,
    ]);

    /** إحضار جبري (كاسب): يتبع المدين النشط في تبويب ذمة مقسومة */
    const followupEarnerForcedActionUnlocked = useMemo(() => {
        if (!isEarnerLikeSummonsBranch(followupDebtorSummonsProfile)) return false;
        if (isEvictionExecutionModule && followupIsDebtorGovernmentEmployee) return false;
        if (forcedAttendanceIssued) return false;
        if (summoningRound >= 2) return true;
        if (
            isEvictionExecutionModule &&
            !followupIsDebtorGovernmentEmployee &&
            !followupIsDebtorRetired &&
            unifiedCollectionApproved &&
            executionData?.eviction_last_summons_for_collection === true &&
            executionData?.eviction_last_collection_summons_branch === 'coercive'
        ) {
            return true;
        }
        const graceDone = isEvictionExecutionModule ? isEvictionGraceExpiredNow : isGracePeriodExpiredNow;
        if (!graceDone || debtorAttendedVoluntarily) return false;
        return true;
    }, [
        followupDebtorSummonsProfile,
        isEvictionExecutionModule,
        followupIsDebtorGovernmentEmployee,
        followupIsDebtorRetired,
        unifiedCollectionApproved,
        executionData?.eviction_last_summons_for_collection,
        executionData?.eviction_last_collection_summons_branch,
        forcedAttendanceIssued,
        summoningRound,
        isEvictionGraceExpiredNow,
        isGracePeriodExpiredNow,
        debtorAttendedVoluntarily,
    ]);

    /** مسار مالي صارم (موظف/كاسب): التبليغ اللاحق بعد حضور المدين أو إعلان انتهاء المدة الرضائية أو إجراء جبري مناسب */
    const baseSubsequentNoticeUnlocked = useMemo(() => {
        const voluntaryEndGeneral =
            !isEvictionExecutionModule &&
            Boolean(
                executionData?.notice_voluntary_period_end_declared ||
                    noticeVoluntaryPeriodEndOptimistic
            );
        /** دورة مذكرة الإخبار بالتنفيذ: لا يُفتح التبليغ اللاحق تلقائياً بانتهاء السبعة أيام أو بإجراء جبري — فقط حضور أو «تم انتهاء المدة». */
        const memoFirstVoluntaryCycle = notificationCount === 1;
        if (debtorSummonsProfile === 'employee_monetary') {
            return (
                debtorAttendedVoluntarily ||
                voluntaryEndGeneral ||
                (!memoFirstVoluntaryCycle && activeCoerciveActions.includes('salary')) ||
                (!memoFirstVoluntaryCycle &&
                    isGracePeriodExpiredNow &&
                    activeCoerciveActions.length > 0)
            );
        }
        return (
            voluntaryAttendanceCount > 0 ||
            voluntaryEndGeneral ||
            forcedPathAttendanceSecured ||
            debtorForcedToAttend ||
            investigationMemoIssued ||
            debtorArrested ||
            (!memoFirstVoluntaryCycle &&
                isGracePeriodExpiredNow &&
                activeCoerciveActions.length > 0)
        );
    }, [
        debtorSummonsProfile,
        debtorAttendedVoluntarily,
        activeCoerciveActions,
        isGracePeriodExpiredNow,
        voluntaryAttendanceCount,
        forcedPathAttendanceSecured,
        debtorForcedToAttend,
        investigationMemoIssued,
        debtorArrested,
        isEvictionExecutionModule,
        executionData?.notice_voluntary_period_end_declared,
        noticeVoluntaryPeriodEndOptimistic,
        notificationCount,
    ]);

    /** تخلية: التبليغ اللاحق بعد إعلان انتهاء المدة الرضائية للدورة الأولى؛ من التبليغ الثاني فصاعداً يبقى مفتوحاً. */
    const evictionSubsequentNoticeUnlocked =
        isEvictionExecutionModule &&
        debtorNotifiedForEvictionGrace &&
        notificationCount >= 1 &&
        (notificationCount >= 2 || isEvictionGraceEffectivelyExpired);

    const subsequentNoticeUnlocked =
        baseSubsequentNoticeUnlocked ||
        evictionSubsequentNoticeUnlocked ||
        Boolean(executionData?.executor_coercive_unlock);

    /** أي قرار منفذ بتّ (موافقة أو بديل) — لإخفاء شارة مهلة المذكرة كما طلب المستخدم */
    const anyExecutorDecisionResolvedForMemoBadge = useMemo(() => {
        const ex = executionData?.id ?? executionId;
        if (!ex) return false;
        return readExecutorDecisionsArray(ex).some((r) => {
            const o = String((r as { executorOutcome?: string }).executorOutcome || '')
                .trim()
                .toLowerCase();
            return o === 'approved' || o === 'alternative';
        });
    }, [executionData?.id, executionId, decisionsReloadEpoch]);

    const primaryDebtorTaklifActive = useMemo(() => {
        if (!executionData) return false;
        const pk = primaryDebtorKeyResolved;
        const emp = getEmployeeAssignmentForDebtorKey(executionData, pk, pk);
        return Boolean(
            emp &&
                (emp.phase === 'active' ||
                    emp.phase === 'absent_declared' ||
                    emp.phase === 'investigation_pending' ||
                    emp.phase === 'warrant_ui')
        );
    }, [
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        primaryDebtorKeyResolved,
    ]);

    /** شارة مذكرة الإخبار — فقط عند وجود تاريخ مُسجَّل فعلياً في الملف (لا تُبنى من حالة واجهة مؤقتة). */
    const primaryMemoNoticeBadge = useMemo(() => {
        if (notificationCount !== 1 || subsequentNoticeUnlocked) return null;
        if (debtorAttendedVoluntarily || voluntaryAttendanceCount > 0) return null;
        if (lawyerStartedPostNoticeExecution) return null;
        if (
            !isEvictionExecutionModule &&
            (executionData?.notice_voluntary_period_end_declared || noticeVoluntaryPeriodEndOptimistic)
        ) {
            return null;
        }
        if (
            isEvictionExecutionModule &&
            (executionData?.eviction_voluntary_period_end_declared || voluntaryEndOptimistic)
        ) {
            return null;
        }
        if (anyExecutorDecisionResolvedForMemoBadge) return null;
        if (primaryDebtorTaklifActive) return null;
        const extra = isEvictionExecutionModule ? 0 : manualGraceCalendarExtra ? 1 : 0;
        const anchor = isEvictionExecutionModule
            ? executionData?.eviction_first_notice_date ||
              executionData?.debtorNotificationDate ||
              debtorNotificationDate ||
              null
            : executionData?.execution_memo_anchor_date ||
              executionData?.debtorNotificationDate ||
              debtorNotificationDate ||
              null;
        if (!anchor) return null;
        const expired = isGracePeriodExpired(anchor, new Date(), extra);
        const remaining = calculateDaysRemaining(anchor, new Date(), extra);
        return { anchor, remaining, graceExpired: expired };
    }, [
        notificationCount,
        subsequentNoticeUnlocked,
        isEvictionExecutionModule,
        executionData?.eviction_first_notice_date,
        executionData?.debtorNotificationDate,
        executionData?.execution_memo_anchor_date,
        debtorNotificationDate,
        manualGraceCalendarExtra,
        debtorAttendedVoluntarily,
        voluntaryAttendanceCount,
        lawyerStartedPostNoticeExecution,
        executionData?.notice_voluntary_period_end_declared,
        noticeVoluntaryPeriodEndOptimistic,
        executionData?.eviction_voluntary_period_end_declared,
        voluntaryEndOptimistic,
        anyExecutorDecisionResolvedForMemoBadge,
        primaryDebtorTaklifActive,
    ]);

    /** تاريخ التبليغ المرتبط بالمدين الأساسي — لشارات «غير مبلّغ» / «مذكرة الإخبار» في حاوية المدين */
    const primaryDebtorNoticeYmdResolved = useMemo(() => {
        const d0 = effectiveDebtors[0] as Debtor | undefined;
        return (
            debtorNotificationDate ||
            executionData?.debtorNotificationDate ||
            d0?.notificationDate ||
            null
        );
    }, [debtorNotificationDate, executionData?.debtorNotificationDate, effectiveDebtors]);

    const showDebtorUnservedMemoBadge =
        notificationCount === 0 &&
        !primaryDebtorNoticeYmdResolved &&
        !debtorAttendedVoluntarily &&
        voluntaryAttendanceCount === 0 &&
        !(executionData?.notice_voluntary_period_end_declared || noticeVoluntaryPeriodEndOptimistic) &&
        !(executionData?.eviction_voluntary_period_end_declared || voluntaryEndOptimistic);

    /**
     * بعد «تم انتهاء المدة» دون حضور رضائي: إشارة عدم الحضور — تُخفى بـ X أو بأي إجراء في التنفيذ والمحجوزات.
     * قراءة الإخفاء من activeDebtorNoticeScope (نطاق unifiedSummonsTargetDebtorKey) لتطابق dismissDebtorAbsencePatch/buildDebtorNoticePatchForKey.
     */
    const primaryDebtorAbsenceBadge = useMemo(() => {
        if (remaining <= 0) return null;
        if (activeDebtorNoticeScope.absenceBadgeDismissed) return null;
        if (lawyerStartedPostNoticeExecution) return null;
        if (primaryDebtorTaklifActive) return null;
        const noVoluntaryAttendance =
            !debtorAttendedVoluntarily && voluntaryAttendanceCount === 0;
        if (!noVoluntaryAttendance) return null;

        const voluntaryEndNonEviction =
            !isEvictionExecutionModule &&
            notificationCount === 1 &&
            (executionData?.notice_voluntary_period_end_declared || noticeVoluntaryPeriodEndOptimistic);

        const voluntaryEndEviction =
            isEvictionExecutionModule &&
            notificationCount === 1 &&
            (executionData?.eviction_voluntary_period_end_declared || voluntaryEndOptimistic);

        if (!voluntaryEndNonEviction && !voluntaryEndEviction) return null;
        if (!subsequentNoticeUnlocked) return null;

        const rose =
            'backdrop-blur-sm bg-rose-500/25 text-rose-200 px-2 py-0.5 rounded-lg text-[9px] border border-rose-400/35 font-bold';
        return { label: 'عدم حضور المدين', className: rose };
    }, [
        remaining,
        activeDebtorNoticeScope.absenceBadgeDismissed,
        lawyerStartedPostNoticeExecution,
        debtorAttendedVoluntarily,
        voluntaryAttendanceCount,
        primaryDebtorTaklifActive,
        isEvictionExecutionModule,
        notificationCount,
        executionData?.notice_voluntary_period_end_declared,
        noticeVoluntaryPeriodEndOptimistic,
        executionData?.eviction_voluntary_period_end_declared,
        voluntaryEndOptimistic,
        subsequentNoticeUnlocked,
    ]);

    /**
     * شارة التبليغ اللاحق / «تطلب حضوره»: بعد فتح مسار التبليغ اللاحق؛
     * إن وُجد تبليغ ثانٍ مسجّل (عدّاد ≥2) تظهر حتى دون marker في ملفات قديمة.
     */
    const showDebtorSummonsAttendanceBadge = useMemo(
        () =>
            Boolean(subsequentNoticeUnlocked) &&
            !primaryDebtorTaklifActive &&
            !debtorAttendedVoluntarily &&
            voluntaryAttendanceCount === 0 &&
            !lawyerStartedPostNoticeExecution &&
            Boolean(
                executionData?.debtor_summons_marker?.id ||
                    debtorSummonsMarkerLocal?.id ||
                    notificationCount >= 2
            ),
        [
            subsequentNoticeUnlocked,
            primaryDebtorTaklifActive,
            debtorAttendedVoluntarily,
            voluntaryAttendanceCount,
            lawyerStartedPostNoticeExecution,
            executionData?.debtor_summons_marker?.id,
            debtorSummonsMarkerLocal?.id,
            notificationCount,
        ]
    );

    /** يُربَط حقل «نوع التبليغ والغاية» بالمدين النشط في التبويب عند ذمة مقسومة */
    const noticeKindGoalStrictBinding =
        !isEvictionExecutionModule &&
        (followupDebtorSummonsProfile === 'employee_monetary' ||
            followupDebtorSummonsProfile === 'earner_like');

    /** تكليف الحضور بعد أول إخبار — للمدين الموظف أو الكاسب (ما عدا المتوفى) */
    const employeeAssignmentTabEnabled = notificationCount >= 1 && !activeDebtorIsDeceased;

    const resolvedEmployeeSummonsAssignment = useMemo(() => {
        if (!executionData) return null;
        return getEmployeeAssignmentForDebtorKey(
            executionData,
            unifiedSummonsTargetDebtorKey,
            primaryDebtorKeyResolved
        );
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        primaryDebtorKeyResolved,
    ]);

    /** مسار مفاتحة/أمر قبض بعد تكليف — للموظف والكاسب */
    const showEmployeeAssignmentCoerciveBlock = useMemo(() => {
        const a = resolvedEmployeeSummonsAssignment;
        if (!a) return false;
        return (
            a.phase === 'absent_declared' ||
            a.phase === 'investigation_pending' ||
            a.phase === 'warrant_ui'
        );
    }, [resolvedEmployeeSummonsAssignment]);

    /** تنفيذ مالي ومدين موظف: لا يُعرض إحضار جبري ولا قبض — فقط حجز الراتب (١/٥) */
    const employeeFinancialSalaryOnlyCoercive = isEmployeeMonetaryFinancialPath(debtorSummonsProfile);

    /** كاسب (أو غير موظف مالي) في تنفيذ مالي صارم: حجز راتب/عقار/مركبة فقط — دون سفر/حبس/إحضار/قبض */
    const monetaryCoerciveLimitedOnly =
        monetaryExecutionStrictPathFlag && !isAlimonyClaim && !employeeFinancialSalaryOnlyCoercive;

    const followupEmployeeFinancialSalaryOnlyCoercive =
        isEmployeeMonetaryFinancialPath(followupDebtorSummonsProfile);
    const followupMonetaryCoerciveLimitedOnly =
        monetaryExecutionStrictPathFlag &&
        !isAlimonyClaim &&
        !followupEmployeeFinancialSalaryOnlyCoercive;

    const followupGarnishmentAmountPreview = useMemo(() => {
        if (!debtorBrowserTabsMode || !activeWorkspaceDebtorForFollowup) {
            return executionData?.garnishmentAmount;
        }
        if (activeWorkspaceDebtorForFollowup.isPrimary) {
            return executionData?.garnishmentAmount;
        }
        const g =
            executionExtras.perDebtorGarnishments?.[activeWorkspaceDebtorForFollowup.key];
        return g != null && String(g) !== '' ? String(g) : undefined;
    }, [
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        executionData?.garnishmentAmount,
        executionExtras.perDebtorGarnishments,
    ]);

    // ===========================
    // AUTO-INJECT 3% EXECUTION FEE ON DEADLINE EXPIRY
    // ===========================
    // ✅ V10.8: executionFeeInjected moved to top with other useState (line 187)
    
    // ✅ OPTIMIZED: Removed executionFee from dependencies to prevent re-render loop
    React.useEffect(() => {
        // Only inject fee if:
        // 1. Notification date exists
        // 2. Deadline expired (> 7 days)
        // 3. Not a non-financial or alimony claim
        // 4. Fee not already injected
        // 5. Debt not fully paid
        if (debtorNotificationDate && 
            daysSinceNoticeCalculated > 7 && 
            !isNonFinancialClaim && 
            !isAlimonyClaim && 
            !executionFeeInjected && 
            remaining > 0) {
            
            // Fee is already calculated in executionFee variable
            // Just mark it as injected
            setExecutionFeeInjected(true);
            
            // Log event to timeline
            const newEvent = {
                id: Date.now().toString(),
                date: getLocalTodayYmd(),
                title: '⚠️ إضافة رسم التحصيل 3%',
                description: `تم احتساب رسم التحصيل البالغ ${calculatedExecutionFee.toLocaleString('ar-IQ')} دينار (3% من أصل الدين والرسوم) بسبب انتهاء المهلة القانونية وعدم السداد`,
                type: 'payment'
            };
            setTimelineEvents(prev => [newEvent, ...prev]);
            
            showToast('⚠️ تمت إضافة رسم التحصيل 3% بسبب انتهاء المهلة القانونية', 'warning');
        }
        
        // Check for full payment during grace period to waive fee
        if (debtorNotificationDate && 
            daysSinceNoticeCalculated <= 7 && 
            remaining <= 0 && 
            !executionFeeInjected) {
            
            showToast('✅ تم دفع كامل الدين خلال المهلة - إعفاء من رسم التحصيل', 'success');
        }
    }, [daysSinceNoticeCalculated, remaining, debtorNotificationDate, isNonFinancialClaim, isAlimonyClaim, executionFeeInjected, calculatedExecutionFee]);
    
    // ===========================
    // STATUTE OF LIMITATIONS WARNING
    // ===========================
    React.useEffect(() => {
        if (statuteStatus && statuteStatus.isCritical && !showStatuteWarning && !isAlimonyClaim) {
            setShowStatuteWarning(true);
        }
    }, [statuteStatus, showStatuteWarning, isAlimonyClaim]);
    
    // ✅ CRITICAL PERFORMANCE FIX: Removed heavy useEffect that was causing 12s+ render time
    // Instead, save data manually when needed (onClose, on specific actions)
    // This prevents infinite re-renders caused by timeline/state updates
    
    // 🚀 OPTIMIZED: Save data only when closing or on specific actions
    const saveExecutionData = useCallback(() => {
        const persistKey = String(executionData?.id ?? executionId ?? '');
        if (!persistKey || persistKey === 'undefined') return;
        
        try {
            const updatedData = {
                ...executionData,
                debtorNotificationDate,
                debtor_summons_marker: debtorSummonsMarkerLocal,
                lastActionDate,
                executionFeeInjected,
                timelineEvents,
                caseNotesLog,
                caseTasksPending,
                financialLedger,
                gracePeriodActive,
                gracePeriodEnded,
                seizedAssets,
                seizureDraftsByDecisionId,
                realEstateSeizureAssets,
                activeCoerciveActions,
                notificationCount,
                forcedAttendanceIssued,
                debtorEvaded,
                arrestWarrantUnlocked,
                creditorAttended,
                executionPaused,
                activeNoticeState,
                debtorAttendedVoluntarily,
                debtorForcedToAttend,
                debtorArrested,
                nonInterferenceIssued,
                paidDebt,
                paidCourtFees,
                paidDirectorateFees,
                paidClientFees,
                summoningRound,
                voluntaryAttendanceCount,
                investigationCourtRequested,
                investigationMemoIssued,
                investigationPathDebtorPresent,
                forcedPathAttendanceSecured,
                eviction_vacate_deadline: evictionVacateDeadlineLocal,
                eviction_residential_grace_period_start: evictionResidentialGracePeriodStart,
                eviction_executor_vacate_grant_approved: evictionExecutorVacateGrantApproved,
                eviction_residential_grace_manually_ended_at: evictionResidentialGraceManuallyEndedAt,
                eviction_assets_tab_unlocked: evictionAssetsTabUnlocked,
                eviction_case_expenses: evictionCaseExpenses,
                eviction_lawyer_fee_requested: executionData.eviction_lawyer_fee_requested,
                eviction_lawyer_fee_waived_at_intake: executionData.eviction_lawyer_fee_waived_at_intake,
                eviction_voluntary_period_end_declared: executionData.eviction_voluntary_period_end_declared,
                eviction_earner_fee_collection_sm: earnerFeeCollectionSm,
                execution_memo_anchor_date: executionData.execution_memo_anchor_date,
                notice_voluntary_period_end_declared: executionData.notice_voluntary_period_end_declared,
            };
            
            // Use storageCache for better performance
            storageCache.set(executionStorageKey(String(persistKey)), updatedData);
        } catch (error) {
            debug.error('Failed to save execution data:', error);
        }
    }, [executionId, executionData, debtorNotificationDate, lastActionDate, executionFeeInjected,
        timelineEvents, caseNotesLog, caseTasksPending, financialLedger,
        gracePeriodActive, gracePeriodEnded, seizedAssets, seizureDraftsByDecisionId, realEstateSeizureAssets, activeCoerciveActions,
        notificationCount, forcedAttendanceIssued,
        debtorEvaded, arrestWarrantUnlocked, creditorAttended, executionPaused,
        activeNoticeState, debtorAttendedVoluntarily, debtorForcedToAttend,
        debtorArrested, nonInterferenceIssued, paidDebt, paidCourtFees,
        paidDirectorateFees, paidClientFees,
        summoningRound, voluntaryAttendanceCount, investigationCourtRequested,
        investigationMemoIssued, investigationPathDebtorPresent, forcedPathAttendanceSecured,
        evictionVacateDeadlineLocal,
        evictionResidentialGracePeriodStart,
        evictionExecutorVacateGrantApproved,
        evictionResidentialGraceManuallyEndedAt,
        evictionAssetsTabUnlocked,
        evictionCaseExpenses,
        earnerFeeCollectionSm,
        debtorSummonsMarkerLocal,
        executionData?.execution_memo_anchor_date,
        executionData?.notice_voluntary_period_end_declared]);
    
    // Save on unmount
    useEffect(() => {
        return () => {
            saveExecutionData();
        };
    }, [saveExecutionData]);
    
    // ✅ OPTIMIZED: useCallback to prevent re-renders
    const toggleCreditorExpanded = useCallback((key: string) => {
        setExpandedCreditorById(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const toggleDebtorExpanded = useCallback((key: string) => {
        setExpandedDebtorById(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);
    
    const hideToast = useCallback(() => {
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = null;
        }
        setToastAction(null);
        setToastVisible(false);
    }, []);

    const showToast = useCallback(
        (
            message: string,
            type: 'success' | 'error' | 'warning' | 'info' = 'success',
            options?: {
                decisionsLink?: boolean;
                decisionId?: string;
                decisionsTab?: 'current' | 'previous' | 'appeals';
                action?: { label: string; onClick: () => void };
            }
        ) => {
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
                toastTimeoutRef.current = null;
            }

            const myId = String(executionData?.id ?? executionId ?? '').trim();

            let displayMessage: React.ReactNode = message;
            if (options?.decisionsLink === true) {
                const pendingCount = readExecutorDecisionsArray(myId).filter(
                    (r: any) => r.executorOutcome === 'pending' || r.executorOutcome === undefined
                ).length;
                displayMessage = (
                    <div className="flex items-center gap-2">
                        <span>{message}</span>
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-white/15 border border-white/10 text-[10px] font-black text-white shadow-sm">
                            {pendingCount} قيد المعالجة
                        </span>
                    </div>
                );
            }

            const action =
                options?.action ??
                (options?.decisionsLink === true
                    ? {
                          label: 'الذهاب إلى القرارات والطعون',
                          onClick: () => {
                              try {
                                  window.dispatchEvent(
                                      new CustomEvent('hami-open-decisions-modal', {
                                          detail: {
                                              executionId: myId,
                                              decisionId: options?.decisionId,
                                              tab: options?.decisionsTab,
                                          },
                                      })
                                  );
                              } catch {
                                  setShowDecisionsModal(true);
                              }
                              hideToast();
                          },
                      }
                    : null);
            setToastAction(action);
            setToastMessage(displayMessage as React.ReactNode);
            setToastType(type);
            setToastEpoch((v) => v + 1);
            setToastVisible(true);
            const ms = action ? 12000 : 3000;
            toastTimeoutRef.current = setTimeout(() => {
                hideToast();
            }, ms);
        },
        [hideToast, setShowDecisionsModal, executionData?.id, executionId]
    );
    showToastRef.current = showToast;

	useEffect(() => {
		const appts = (timelineEventsRef.current || []).filter((ev: any) => String(ev?.type || '') === 'appointment');
		const ymdOf = (ev: any): string => {
			const raw = String(ev?.date || '').trim();
			const m = /^\d{4}-\d{2}-\d{2}/.exec(raw);
			return m ? m[0] : '';
		};
		const titleOf = (ev: any): string => {
			const t = String(ev?.title || '').trim();
			return t.replace(/^📅\s*/, '').trim() || 'موعد';
		};
		for (const ev of appts) {
			const ymd = ymdOf(ev);
			if (!ymd || ymd < todayYmd) continue;
			const daysUntil = Math.max(0, evictionInclusiveCalendarDays(todayYmd, ymd) - 1);
			if (daysUntil > 1) continue;
			const key = String((ev as any).id || `${ymd}-${titleOf(ev)}`);
			const toastSig = `hami:apptReminder:${executionData?.id ?? executionId ?? 'x'}:${key}:${todayYmd}`;
			try {
				if (localStorage.getItem(toastSig)) continue;
				localStorage.setItem(toastSig, '1');
			} catch {
				/* ignore */
			}
			showToastRef.current(`موعد قريب: ${titleOf(ev)} — ${ymd}`, 'info', {
				action: {
					label: 'عرض المواعيد',
					onClick: () => {
						setShowTimelineModal(true);
						setActiveTimelineFilter('مواعيد');
					},
				},
			});
		}
	}, [todayYmd, executionData?.id, executionId, setShowTimelineModal, setActiveTimelineFilter]);

    useEffect(() => {
        if (!evictionGraceBadgeInfo) return;
        const rem = Number(evictionGraceBadgeInfo.remainingDays ?? 0);
        if (!Number.isFinite(rem) || rem <= 0 || rem > 2) return;
        const persistKey = String(executionData?.id ?? executionId ?? '').trim();
        if (!persistKey) return;
        const today = getLocalTodayYmd();
        const k = `eviction-grace-reminder:${persistKey}:${evictionGraceBadgeInfo.endYmd}`;
        try {
            const last = String(localStorage.getItem(k) || '').trim();
            if (last === today) return;
            localStorage.setItem(k, today);
        } catch {
            /* ignore */
        }
        showToast(
            `⏳ تنبيه: تبقى ${rem} ${rem === 1 ? 'يوم' : 'أيام'} على انتهاء المهلة (${evictionGraceBadgeInfo.endYmd})`,
            'warning'
        );
    }, [
        evictionGraceBadgeInfo?.endYmd,
        evictionGraceBadgeInfo?.remainingDays,
        executionData?.id,
        executionId,
        showToast,
    ]);

    const executorApprovalActions: ExecutorApprovalActions = useMemo(
        () => ({
            openScheduledDateModal: ({ requestTitle, onSaved }) => {
                setShowDecisionsModal(false);
                setExecutorScheduleContext({ requestTitle, onSaved });
                setExecutorScheduleModalOpen(true);
            },
            openPoliceAssistanceModal: ({ decisionId, requestTitle, initialAgencyName }) => {
                setShowDecisionsModal(false);
                setPoliceAssistanceDecisionId(decisionId);
                setPoliceAssistanceRequestTitle(requestTitle);
                setPoliceAssistanceAgencyDraft(String(initialAgencyName || '').trim());
                setPoliceAssistanceModalOpen(true);
            },
            showToast,
            appendDossierTask: (task) => {
                const now = new Date().toISOString();
                const taskId = nextTimelineId();
                setCaseTasksPending((prev) => [
                    ...prev,
                    {
                        id: taskId,
                        title: task.title,
                        body: task.body,
                        dueDate: task.dueDate,
                        createdAt: now,
                    },
                ]);
                setTimelineEvents((prev) => [
                    {
                        id: nextTimelineId(),
                        type: 'other',
                        date: now,
                        timestamp: now,
                        title: `📌 مهمة قيد الإنجاز: ${task.title}`,
                        description: `${task.body}\n\n📅 تاريخ الإنجاز المطلوب: ${new Date(task.dueDate).toLocaleDateString('ar-EG')}`,
                        source: 'القرارات والطعون — قبول المنفذ',
                    },
                    ...prev,
                ]);
            },
            getFieldVisitDeadlineIso: () => {
                const did = String(executionData?.id ?? executionId ?? '');
                try {
                    const v = localStorage.getItem(fieldVisitAppointmentStorageKey(did));
                    if (v) return v;
                } catch {
                    /* ignore */
                }
                const hit = timelineEventsRef.current.find(
                    (e) =>
                        e.type === 'appointment' &&
                        typeof e.source === 'string' &&
                        e.source.includes('موعد ميداني')
                );
                return hit?.date ?? null;
            },
            promptOpenExecutionReport: (onConfirm) => {
                setExecutionReportPrompt({ onConfirm });
            },
            pushCalendarAppointment: ({ dossierId, decisionId, purpose, eventIso, recordedAt }) => {
                const newEvent: TimelineEvent = {
                    id: nextTimelineId(),
                    type: 'appointment',
                    date: eventIso,
                    timestamp: recordedAt,
                    title: `📅 ${purpose}`,
                    description: `موعد معتمد من قبول المنفذ — مرجع القرار: ${decisionId}`,
                    source: 'القرارات والطعون — موعد ميداني',
                };
                setTimelineEvents((prev) => [newEvent, ...prev]);
                showToast('تم ربط الموعد بالسجل الزمني', 'success');
                void dossierId;
            },
            patchDecision: (decisionId, patch) => {
                patchExecutorDecisionRow(executionData?.id ?? executionId, decisionId, patch);
            },
            openBreakInventoryFurnitureModal: ({ decisionId, requestTitle, onSaved, onFinalize }) => {
                setShowDecisionsModal(false);
                setBreakInventoryFurnitureModalCtx({ decisionId, requestTitle, onSaved, onFinalize });
                setBreakInventoryFurnitureModalOpen(true);
            },
            openJudicialCustodianModal: ({ decisionId, requestTitle, onSaved }) => {
                void decisionId;
                setShowDecisionsModal(false);
                setJudicialCustodianModalCtx({ requestTitle, onSaved });
                setJudicialCustodianModalOpen(true);
            },
            appendCaseNote: ({ title, body }) => {
                const now = new Date().toISOString();
                const id = `note_${Date.now()}`;
                setCaseNotesLog((prev) => {
                    const next = [{ id, title, body, createdAt: now }, ...prev];
                    queueMicrotask(() => {
                        persistExecutionMergeRef.current?.({ caseNotesLog: next });
                    });
                    return next;
                });
            },
            persistJudicialCustodianDetails: ({ decisionId, fullName, salary, recordId }) => {
                const savedAt = new Date().toISOString();
                queueMicrotask(() => {
                    const file = executionFileSnapshotRef.current;
                    const prevArr = Array.isArray(file?.eviction_judicial_custodians)
                        ? [...(file!.eviction_judicial_custodians as NonNullable<
                              ExecutionFile['eviction_judicial_custodians']
                          >)]
                        : [];
                    const legacy = file?.eviction_judicial_custodian;
                    let list = prevArr;
                    if (!list.length && legacy?.fullName?.trim() && legacy.savedAt) {
                        list = [
                            {
                                id: 'legacy_custodian',
                                fullName: legacy.fullName,
                                salary: legacy.salary,
                                decisionId: legacy.decisionId,
                                savedAt: legacy.savedAt,
                            },
                        ];
                    }
                    let next;
                    if (recordId) {
                        next = list.map((c) =>
                            String(c.id) === String(recordId)
                                ? {
                                      ...c,
                                      fullName,
                                      salary,
                                      decisionId: decisionId || c.decisionId,
                                      savedAt,
                                  }
                                : c
                        );
                    } else {
                        next = [
                            {
                                id: `cust_${Date.now()}`,
                                fullName,
                                salary,
                                decisionId,
                                savedAt,
                            },
                            ...list,
                        ];
                    }
                    persistExecutionMergeRef.current?.({
                        eviction_judicial_custodians: next,
                        eviction_judicial_custodian: null,
                    });
                });
            },
        }),
        [executionData?.id, executionId, nextTimelineId, setShowDecisionsModal, showToast]
    );

    const tryOpenPendingFieldVisitSchedule = useCallback((): boolean => {
        const primaryKey = String(decisionsStorageExecutionId || '').trim();
        const altKey = String(executionId ?? '').trim();
        const primaryHit = findApprovedFieldVisitNeedingSchedule(primaryKey);
        const altHit =
            !primaryHit && altKey && altKey !== primaryKey
                ? findApprovedFieldVisitNeedingSchedule(altKey)
                : null;
        const hit = primaryHit || altHit;
        if (!hit) return false;
        const dossierId = primaryHit ? primaryKey : altKey;
        if (!dossierId || dossierId === 'undefined') return false;
        setShowDecisionsModal(false);
        handleExecutorApproval(
            'Field Visit Date',
            dossierId,
            hit.decisionId,
            executorApprovalActions,
            { requestTitle: hit.requestTitle }
        );
        return true;
    }, [
        executionData?.id,
        executionId,
        executorApprovalActions,
        setShowDecisionsModal,
    ]);

    const tryOpenPendingBreakInventoryLedger = useCallback((): boolean => {
        const primaryKey = String(decisionsStorageExecutionId || '').trim();
        const altKey = String(executionId ?? '').trim();
        const primaryHit = findApprovedBreakInventoryNeedingLedger(primaryKey);
        const altHit =
            !primaryHit && altKey && altKey !== primaryKey
                ? findApprovedBreakInventoryNeedingLedger(altKey)
                : null;
        const hit = primaryHit || altHit;
        if (!hit) return false;
        const dossierId = primaryHit ? primaryKey : altKey;
        if (!dossierId || dossierId === 'undefined') return false;
        setShowDecisionsModal(false);
        void dossierId;
        openBreakInventoryCompletion(hit.decisionId, executorApprovalActions, hit.requestTitle);
        return true;
    }, [
        executionData?.id,
        executionId,
        executorApprovalActions,
        openBreakInventoryCompletion,
        setShowDecisionsModal,
    ]);

    const tryOpenPendingCustodianDetails = useCallback((): boolean => {
        const primaryKey = String(decisionsStorageExecutionId || '').trim();
        const altKey = String(executionId ?? '').trim();
        const primaryHit = findApprovedCustodianNeedingDetails(primaryKey);
        const altHit =
            !primaryHit && altKey && altKey !== primaryKey
                ? findApprovedCustodianNeedingDetails(altKey)
                : null;
        const hit = primaryHit || altHit;
        if (!hit) return false;
        const dossierId = primaryHit ? primaryKey : altKey;
        if (!dossierId || dossierId === 'undefined') return false;
        setShowDecisionsModal(false);
        void dossierId;
        openJudicialCustodianCompletion(hit.decisionId, executorApprovalActions, hit.requestTitle);
        return true;
    }, [
        executionData?.id,
        executionId,
        executorApprovalActions,
        openJudicialCustodianCompletion,
        setShowDecisionsModal,
    ]);

    const persistExecutionMerge = useCallback(
        (patch: Record<string, unknown>) => {
            const base = executionDataRef.current;
            if (!base) return;
            const persistKey = String(base.id ?? executionId ?? '');
            if (!persistKey || persistKey === 'undefined') return;
            const merged = {
                ...base,
                seizureDraftsByDecisionId: seizureDraftsByDecisionIdRef.current,
                ...patch,
                updatedAt: new Date().toISOString(),
            } as ExecutionFile;
            storageCache.set(executionStorageKey(String(persistKey)), merged);
            setExecutionStorageTick((n) => n + 1);
            onUpdate?.(merged);
        },
        [executionId, onUpdate]
    );
    persistExecutionMergeRef.current = persistExecutionMerge;
    executionFileSnapshotRef.current = executionData ?? null;

    useEffect(() => {
        if (!executionData?.id) return;
        const cleaned = dedupeTimelineEventsSameSecond(timelineEvents);
        const sig = cleaned
            .map(
                (e) =>
                    `${String(e.id)}:${String(e.type || '')}:${String(e.title || '')}:${
                        String(e.timestamp || e.date || '')
                    }:${String(e.trashedAt || '')}:${e.isPinned ? '1' : '0'}`
            )
            .join('|');
        if (sig === timelineDedupeSigRef.current) return;
        const rawSig = (timelineEvents || [])
            .map(
                (e) =>
                    `${String(e.id)}:${String(e.type || '')}:${String(e.title || '')}:${
                        String((e as any).timestamp || (e as any).date || '')
                    }:${String((e as any).trashedAt || '')}:${(e as any).isPinned ? '1' : '0'}`
            )
            .join('|');
        if (sig === rawSig) {
            timelineDedupeSigRef.current = sig;
            return;
        }
        timelineDedupeSigRef.current = sig;
        setTimelineEvents(cleaned);
        persistExecutionMerge({ timelineEvents: cleaned });
    }, [executionData?.id, persistExecutionMerge, timelineEvents]);

    useEffect(() => {
        const myId = String(executionData?.id ?? executionId ?? '');
        if (!myId) return;

        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; decisionId?: string; subtype?: string }>;
            if (String(ce.detail?.executionId ?? '') !== myId) return;
            const decisionId = String(ce.detail?.decisionId ?? '').trim();
            const subtype = String(ce.detail?.subtype ?? '').trim();
            if (!decisionId || !subtype) return;

            if (subtype === 'property') {
                return;
            }

            const alreadyDraft = Boolean(seizureDraftsByDecisionIdRef.current?.[decisionId]);
            if (alreadyDraft) return;
            const alreadyAsset = seizedAssetsSnapshotRef.current.some(
                (a) =>
                    String((a.details as Record<string, unknown> | undefined)?.decisionRowId ?? '') ===
                    decisionId
            );
            if (alreadyAsset) return;

            const actionType = subtype === 'movable' ? 'vehicle' : subtype === 'salary' ? 'salary' : 'property';

            const baseDesc =
                actionType === 'salary'
                    ? 'طلب حجز راتب (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.'
                    : actionType === 'vehicle'
                      ? 'طلب حجز مال منقول (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.'
                      : subtype === 'notice'
                        ? 'طلب وضع إشارة الحجز التنفيذي (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.'
                        : 'طلب حجز عقار (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.';

            const details: Record<string, string> = {
                seizureUiKind: actionType,
                decisionRowId: decisionId,
                employerName: '',
                salaryAmount: '',
                propertyAddress: '',
                propertyLocation: '',
                vehicleDescription: '',
                vehiclePlate: '',
                movableAssetType: '',
                movableEstimatedValueIqd: '',
                movableNotes: '',
                description: baseDesc,
            };

            const dayYmd = getLocalTodayYmd();
            const draft: SeizedAsset = {
                id: `draft_${decisionId}`,
                type:
                    subtype === 'notice'
                        ? 'طلب وضع إشارة الحجز التنفيذي (قيد البت)'
                        : actionType === 'salary'
                          ? 'طلب حجز راتب (قيد البت)'
                          : actionType === 'vehicle'
                            ? 'طلب حجز مال منقول (قيد البت)'
                            : 'طلب حجز عقار (قيد البت)',
                details,
                status: 'pending',
                seizureDate: dayYmd,
            };

            const label =
                subtype === 'notice'
                    ? 'طلب وضع إشارة الحجز التنفيذي'
                    : actionType === 'salary'
                      ? 'طلب حجز راتب'
                      : actionType === 'vehicle'
                        ? 'طلب حجز مال منقول'
                        : 'طلب حجز عقار';
            const now = new Date().toISOString();
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: now,
                timestamp: now,
                title: `📋 ${label} — قيد البت`,
                description: baseDesc,
                type: 'coercive',
                source: 'التنفيذ والمحجوزات',
                metadata: {
                    timelineThreadKey: `executor_decision:${decisionId}`,
                    decisionRowId: decisionId,
                },
            };

            setSeizureDraftsByDecisionId((prev) => {
                const next = { ...prev, [decisionId]: draft };
                setTimelineEvents((tlPrev) => {
                    const nextTl = [ev, ...tlPrev];
                    persistExecutionMerge({ seizureDraftsByDecisionId: next, timelineEvents: nextTl });
                    return nextTl;
                });
                return next;
            });
        };

        window.addEventListener('hami-seizure-request-created', handler as EventListener);
        return () => window.removeEventListener('hami-seizure-request-created', handler as EventListener);
    }, [executionData?.id, executionId, nextTimelineId, persistExecutionMerge]);

    /** مزامنة موافقة الكفيل من تخزين «القرارات» إلى الملف — إذا فشل الوسيط أو أُغلق المودال قبل الدمج */
    useEffect(() => {
        if (!executionData) return;
        const patch = computeGuarantorApprovalMergePatch(
            decisionsStorageExecutionId,
            executionData
        );
        if (!patch || Object.keys(patch).length === 0) return;
        persistExecutionMerge(patch);
    }, [
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        executionData?.id,
        executionData?.guarantor_followup,
        persistExecutionMerge,
    ]);
    useEffect(() => {
        if (!activeDebtorIsDeceased) return;
        if (
            activeCoerciveActions.length === 0 &&
            !debtorArrested &&
            !investigationPathDebtorPresent &&
            !executionData?.forced_bring_in_personal_outcome &&
            !executionData?.forced_bring_in_personal_followup_logged
        ) {
            return;
        }
        setActiveCoerciveActions([]);
        setDebtorArrested(false);
        setInvestigationPathDebtorPresent(false);
        persistExecutionMerge({
            activeCoerciveActions: [],
            debtorArrested: false,
            investigationPathDebtorPresent: false,
            forced_bring_in_personal_outcome: null,
            forced_bring_in_personal_followup_logged: false,
        });
    }, [
        activeDebtorIsDeceased,
        activeCoerciveActions,
        debtorArrested,
        investigationPathDebtorPresent,
        executionData?.forced_bring_in_personal_outcome,
        executionData?.forced_bring_in_personal_followup_logged,
        persistExecutionMerge,
    ]);

    const executionCopilotDecisions = useMemo(
        () => readExecutorDecisionsArray(decisionsStorageExecutionId),
        [decisionsStorageExecutionId, decisionsReloadEpoch]
    );
    const firstActiveAppealDecisionId = useMemo(() => {
        const rows = readExecutorDecisionsArray(decisionsStorageExecutionId);
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (executionRowAppealPipelineActive(r)) {
                const id = r.id;
                if (typeof id === 'string' && id) return id;
            }
        }
        return null;
    }, [decisionsStorageExecutionId, decisionsReloadEpoch]);
    const hasApprovedCollectionDecision = useMemo(() => {
        if (!Array.isArray(executionCopilotDecisions)) return false;
        return executionCopilotDecisions.some(
            (r: any) => r?.requestKind === 'unified_collection' && r?.executorOutcome === 'approved'
        );
    }, [executionCopilotDecisions]);
    const copilotNotesSignature = useMemo(
        () => activeCaseNotesLog.map((n: any) => `${n?.id || ''}:${n?.title || ''}:${n?.createdAt || ''}`).join('|'),
        [activeCaseNotesLog]
    );
    const copilotEventsSignature = useMemo(
        () => activeTimelineEvents.map((e: any) => `${e?.id || ''}:${e?.title || ''}:${e?.timestamp || e?.date || ''}`).join('|'),
        [activeTimelineEvents]
    );
    const executionCopilotSnapshot = useMemo(
        () =>
            buildExecutionCaseSnapshot({
                executionData: executionData ?? null,
                timelineEvents: activeTimelineEvents,
                caseNotesLog: activeCaseNotesLog,
                caseTasksPending: activeCaseTasksPending,
                decisions: executionCopilotDecisions as Array<Record<string, unknown>>,
            }),
        [
            executionData,
            activeTimelineEvents,
            activeCaseNotesLog,
            activeCaseTasksPending,
            executionCopilotDecisions,
            copilotNotesSignature,
            copilotEventsSignature,
        ]
    );
    const executionCopilotFingerprint = useMemo(
        () => snapshotFingerprint(executionCopilotSnapshot),
        [executionCopilotSnapshot]
    );

    const runExecutionAICopilot = useCallback(
        async (trigger: 'manual' | 'auto' = 'manual') => {
            if (!executionData?.id || !executionCopilotSnapshot) return;
            if (aiCopilotLoading && trigger === 'auto') return;
            if (trigger === 'auto' && Date.now() < aiCopilotNetworkBackoffUntilRef.current) return;
            setAiCopilotLoading(true);
            setAiCopilotError(null);
            try {
                const creditorName = String(
                    executionData?.creditors?.[0]?.fullName || executionData?.creditors?.[0]?.name || ''
                ).trim();
                const debtorName = String(
                    executionData?.debtors?.[0]?.fullName || executionData?.debtors?.[0]?.name || ''
                ).trim();
                const amountForMask =
                    Number(executionData?.remainingDebt ?? 0) ||
                    Number(executionData?.debtAmount ?? 0);
                const { anonymizeCaseData, deanonymizeResponse } = await import('@/app/utils/anonymizer');
                const anonymizedSnapshot = anonymizeCaseData(executionCopilotSnapshot, {
                    creditorName,
                    debtorName,
                    debtAmount: amountForMask,
                });
                const { data, error } = await supabase.functions.invoke('execution-copilot', {
                    body: {
                        mode: 'hybrid',
                        trigger,
                        snapshot: anonymizedSnapshot,
                    },
                });
                if (error) {
                    throw new Error(error.message || 'فشل استدعاء خدمة الذكاء');
                }

                const payload = deanonymizeResponse(data || {}, {
                    creditorName,
                    debtorName,
                    debtAmount: amountForMask,
                });
                const normalized = {
                    summary: String(
                        payload.summary || 'تم تحليل الإضبارة بناءً على الوقائع الحالية والمصادر القانونية.'
                    ),
                    confidence: Number(payload.confidence || 0),
                    generatedAt: String(payload.generatedAt || new Date().toISOString()),
                    suggestions: Array.isArray(payload.suggestions)
                        ? payload.suggestions
                        : Array.isArray(payload.nextActions)
                          ? payload.nextActions
                          : [],
                };
                setAiCopilotResult(normalized);
                aiCopilotLastFingerprintRef.current = executionCopilotFingerprint;
                aiCopilotLastRunAtRef.current = Date.now();
                persistExecutionMerge({
                    ai_copilot_enabled: true,
                    ai_copilot_mode: 'hybrid',
                    ai_copilot_last_run_at: normalized.generatedAt,
                    ai_copilot_last_result: normalized,
                });
                if (trigger === 'manual') {
                    setTimelineEvents((prev) => [
                        {
                            id: nextTimelineId(),
                            type: 'other',
                            date: normalized.generatedAt,
                            timestamp: normalized.generatedAt,
                            title: 'تحليل مُحلل حامي الذكي للإضبارة',
                            description: normalized.summary,
                            source: 'مُحلل حامي الذكي',
                        },
                        ...prev,
                    ]);
                }
                aiCopilotNetworkWarningShownRef.current = false;
            } catch (err: any) {
                const rawMessage = String(err?.message || 'تعذر تشغيل الذكاء الاصطناعي حالياً.');
                const isNetworkOrCors =
                    rawMessage.includes('Failed to send a request to the Edge Function') ||
                    rawMessage.includes('ERR_FAILED') ||
                    rawMessage.includes('CORS');
                if (isNetworkOrCors) {
                    aiCopilotNetworkBackoffUntilRef.current = Date.now() + 15000;
                    setAiCopilotResult(null);
                    setAiCopilotError(
                        'تعذر الاتصال بخدمة التحليل (CORS/Network). سيتم الاستمرار في المزامنة تلقائياً عند عودة الاتصال.'
                    );
                    if (trigger === 'manual' || !aiCopilotNetworkWarningShownRef.current) {
                        showToast(
                            'خدمة المُحلل الذكي غير متاحة الآن بسبب الاتصال. أعد المحاولة بعد قليل.',
                            'warning'
                        );
                        aiCopilotNetworkWarningShownRef.current = true;
                    }
                } else {
                    setAiCopilotResult(null);
                    setAiCopilotError(rawMessage);
                    if (trigger === 'manual') showToast(rawMessage, 'warning');
                }
            } finally {
                setAiCopilotLoading(false);
            }
        },
        [
            executionData?.id,
            executionCopilotSnapshot,
            executionCopilotFingerprint,
            persistExecutionMerge,
            nextTimelineId,
            showToast,
        ]
    );
    const triggerCopilotAfterLocalChange = useCallback(() => {
        if (!aiCopilotEnabled) return;
        aiCopilotNetworkBackoffUntilRef.current = Date.now();
        window.setTimeout(() => {
            void runExecutionAICopilot('auto');
        }, 150);
    }, [aiCopilotEnabled, runExecutionAICopilot]);

    useEffect(() => {
        if (!executionCopilotSnapshot) return;
        if (
            !shouldAutoRunCopilot({
                enabled: aiCopilotEnabled,
                fingerprint: executionCopilotFingerprint,
                lastFingerprint: aiCopilotLastFingerprintRef.current,
                lastRunAt: aiCopilotLastRunAtRef.current,
                cooldownMs: 3000,
            })
        ) {
            return;
        }
        const timer = setTimeout(() => {
            void runExecutionAICopilot('auto');
        }, 500);
        return () => clearTimeout(timer);
    }, [
        aiCopilotEnabled,
        executionCopilotSnapshot,
        executionCopilotFingerprint,
        copilotNotesSignature,
        copilotEventsSignature,
        runExecutionAICopilot,
    ]);

    const applyCopilotSuggestionAsNote = useCallback(
        (suggestion: any) => {
            const now = new Date().toISOString();
            const note = {
                id: nextTimelineId(),
                title: `اقتراح من المُحلل: ${String(suggestion?.title || 'إجراء مقترح')}`,
                body: String(suggestion?.rationale || ''),
                createdAt: now,
            };
            const nextNotes = [note, ...activeCaseNotesLog];
            setCaseNotesLog(nextNotes);
            const nextTimeline = [
                {
                    id: nextTimelineId(),
                    type: 'other',
                    date: now,
                    timestamp: now,
                    title: 'حفظ اقتراح مُحلل حامي الذكي كملاحظة',
                    description: note.title,
                    source: 'مُحلل حامي الذكي',
                },
                ...activeTimelineEvents,
            ];
            setTimelineEvents(nextTimeline);
            persistExecutionMerge({ caseNotesLog: nextNotes, timelineEvents: nextTimeline });
            showToast('تم حفظ الاقتراح كملاحظة.', 'success');
        },
        [
            nextTimelineId,
            activeCaseNotesLog,
            activeTimelineEvents,
            persistExecutionMerge,
            showToast,
        ]
    );

    const applyCopilotSuggestionAsTask = useCallback(
        (suggestion: any) => {
            const now = new Date().toISOString();
            const due = String(suggestion?.deadline || '').trim() || now.slice(0, 10);
            const task = {
                id: nextTimelineId(),
                title: String(suggestion?.title || 'مهمة مقترحة'),
                body: String(suggestion?.rationale || ''),
                dueDate: due,
                createdAt: now,
            };
            const nextTasks = [task, ...activeCaseTasksPending];
            setCaseTasksPending(nextTasks);
            const nextTimeline = [
                {
                    id: nextTimelineId(),
                    type: 'other',
                    date: now,
                    timestamp: now,
                    title: 'تحويل اقتراح مُحلل حامي الذكي إلى مهمة',
                    description: `${task.title}\n📅 ${due}`,
                    source: 'مُحلل حامي الذكي',
                },
                ...activeTimelineEvents,
            ];
            setTimelineEvents(nextTimeline);
            persistExecutionMerge({ caseTasksPending: nextTasks, timelineEvents: nextTimeline });
            showToast('تمت إضافة الاقتراح كمهمة.', 'success');
        },
        [
            nextTimelineId,
            activeCaseTasksPending,
            activeTimelineEvents,
            persistExecutionMerge,
            showToast,
        ]
    );

    const copyCopilotDraftText = useCallback(
        async (suggestion: any) => {
            const draftText = String(suggestion?.draftText || '').trim();
            if (!draftText) {
                showToast('لا يوجد نص طلب جاهز داخل هذا الاقتراح.', 'warning');
                return;
            }
            try {
                if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(draftText);
                } else {
                    throw new Error('Clipboard API unavailable');
                }
                const now = new Date().toISOString();
                const nextTimeline = [
                    {
                        id: nextTimelineId(),
                        type: 'other',
                        date: now,
                        timestamp: now,
                        title: 'نسخ طلب جاهز (مُحلل حامي)',
                        description: String(suggestion?.title || 'طلب قانوني مولد'),
                        source: 'مُحلل حامي الذكي',
                    },
                    ...activeTimelineEvents,
                ];
                setTimelineEvents(nextTimeline);
                persistExecutionMerge({ timelineEvents: nextTimeline });
                showToast('تم نسخ نص الطلب الجاهز للحافظة.', 'success');
            } catch {
                showToast('تعذّر النسخ التلقائي. يمكنك إعادة المحاولة.', 'warning');
            }
        },
        [activeTimelineEvents, nextTimelineId, persistExecutionMerge, showToast]
    );

    const removeJudicialCustodianEntry = useCallback(
        (recordId: string) => {
            const d = executionData;
            if (!d) return;
            const prevArr = Array.isArray(d.eviction_judicial_custodians)
                ? [...d.eviction_judicial_custodians]
                : [];
            const leg = d.eviction_judicial_custodian;
            let list = prevArr;
            if (!list.length && leg?.fullName?.trim() && leg.savedAt) {
                list = [
                    {
                        id: 'legacy_custodian',
                        fullName: leg.fullName,
                        salary: leg.salary,
                        decisionId: leg.decisionId,
                        savedAt: leg.savedAt,
                    },
                ];
            }
            const next = list.filter((c) => String(c.id) !== String(recordId));
            persistExecutionMerge({
                eviction_judicial_custodians: next,
                eviction_judicial_custodian: null,
            });
            showToast('تم حذف بيانات الحارس', 'info');
        },
        [executionData, persistExecutionMerge, showToast]
    );

    const pushTimelineEvent = useCallback(
        (event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => {
            setTimelineEvents((prev) => {
                const threadKey =
                    event.metadata &&
                    typeof (event.metadata as Record<string, unknown>).timelineThreadKey === 'string'
                        ? String((event.metadata as Record<string, unknown>).timelineThreadKey)
                        : null;
                let next: TimelineEvent[];
                if (threadKey) {
                    const idx = prev.findIndex(
                        (e) =>
                            e.metadata &&
                            String((e.metadata as Record<string, unknown>).timelineThreadKey ?? '') === threadKey
                    );
                    if (idx >= 0) {
                        const prevRow = prev[idx];
                        next = [...prev];
                        next[idx] = {
                            ...prevRow,
                            ...event,
                            id: prevRow.id,
                            metadata: { ...prevRow.metadata, ...event.metadata },
                        };
                    } else {
                        next = mergeSimilarRecentTimelineEvent(prev, event);
                    }
                } else {
                    next = mergeSimilarRecentTimelineEvent(prev, event);
                }
                const mergePatch = options?.mergePatch ?? {};
                queueMicrotask(() => {
                    persistExecutionMerge({ ...mergePatch, timelineEvents: next });
                    const execId = String(executionDataRef.current?.id ?? executionId ?? '');
                    if (!execId || execId === 'undefined') return;
                    if (event.snapshot == null) return;
                    const mergedRow =
                        next.find((e) => e.id === event.id) ??
                        next.find((e) => e.snapshot === event.snapshot) ??
                        next[0];
                    const rowForRemote = mergedRow
                        ? { ...mergedRow, id: event.id, snapshot: event.snapshot }
                        : { ...event };
                    void import('@/app/services/timelineEventsSupabase')
                        .then(({ insertTimelineEventToSupabase }) =>
                            insertTimelineEventToSupabase({
                                executionFileId: execId,
                                event: rowForRemote,
                                snapshotData: event.snapshot,
                            })
                        )
                        .catch(() => {});
                });
                return next;
            });
        },
        [executionId, persistExecutionMerge]
    );

    const realEstateModalInitial = useMemo(() => {
        const did = String(realEstateSeizureModalDecisionId || '').trim();
        if (!did) return null;
        return (
            realEstateSeizureAssets.find((a) => String(a.decisionRowId || '').trim() === did) || null
        );
    }, [realEstateSeizureAssets, realEstateSeizureModalDecisionId]);

    const saveRealEstateSeizureFromModal = useCallback(
        (draft: {
            propertyNoAndDistrict: string;
            propertyGender: 'دار' | 'شقة' | 'عرصة' | 'بستان';
            estimatedPriceIqd: number | null;
            deedNotes: string;
        }) => {
            const decisionId = String(realEstateSeizureModalDecisionId || '').trim();
            if (!decisionId) return;
            const nowIso = new Date().toISOString();
            const today = getLocalTodayYmd();
            const prev = realEstateSeizureSnapshotRef.current;
            const existing = prev.find((a) => String(a.decisionRowId || '').trim() === decisionId) || null;
            const nextRow: RealEstateSeizureAsset = {
                id: existing?.id || `re_${decisionId}_${Date.now()}`,
                decisionRowId: decisionId,
                propertyNoAndDistrict: draft.propertyNoAndDistrict,
                propertyGender: draft.propertyGender,
                estimatedPriceIqd: draft.estimatedPriceIqd,
                deedNotes: draft.deedNotes,
                status: existing?.status || 'seized',
                record_locked: existing?.record_locked || false,
                auction_date_ymd: existing?.auction_date_ymd ?? null,
                sale_price_iqd: existing?.sale_price_iqd ?? null,
                awaiting_sale_price: false,
                sale_price_draft: undefined,
                archived_at_ymd: existing?.archived_at_ymd ?? null,
            };
            const nextAssets = [...prev.filter((a) => a.id !== nextRow.id), nextRow];
            setRealEstateSeizureAssets(nextAssets);

            try {
                patchExecutorDecisionRow(decisionsStorageExecutionId, decisionId, {
                    seizureRequestSavedAt: nowIso,
                });
            } catch {
                /* ignore */
            }

            const est =
                typeof nextRow.estimatedPriceIqd === 'number' &&
                Number.isFinite(nextRow.estimatedPriceIqd) &&
                nextRow.estimatedPriceIqd > 0
                    ? `${nextRow.estimatedPriceIqd.toLocaleString('ar-IQ')} د.ع`
                    : '—';

            pushTimelineEvent(
                {
                    id: nextTimelineId(),
                    date: today,
                    timestamp: nowIso,
                    title: 'وضع إشارة حجز عقاري',
                    description: `رقم العقار والمقاطعة: ${nextRow.propertyNoAndDistrict}\nجنس العقار: ${nextRow.propertyGender}\nالسعر التقديري: ${est}${nextRow.deedNotes ? `\nتفاصيل السند/ملاحظات: ${nextRow.deedNotes}` : ''}`,
                    type: 'coercive',
                    source: 'محضر المتابعة — الحجز العقاري',
                    metadata: {
                        timelineThreadKey: `real_estate_seizure:${decisionId}`,
                        decisionRowId: decisionId,
                        realEstateAssetId: nextRow.id,
                    },
                },
                { mergePatch: { realEstateSeizureAssets: nextAssets } }
            );
            showToast('تم حفظ بيانات العقار وربطها بالسجل الزمني', 'success');
            setShowRealEstateSeizureModal(false);
        },
        [decisionsStorageExecutionId, nextTimelineId, pushTimelineEvent, realEstateSeizureModalDecisionId, showToast]
    );

    const saveThirdPartySeizureFromModal = useCallback(
        (draft: { thirdPartyName: string; expectedAmountIqd: number | null; letterDetails: string }) => {
            const decisionId = String(thirdPartySeizureModalDecisionId || '').trim();
            if (!decisionId) return;
            const nowIso = new Date().toISOString();
            const today = getLocalTodayYmd();
            const prev = thirdPartySeizureSnapshotRef.current;
            const existing = prev.find((a) => String(a.decisionRowId || '').trim() === decisionId) || null;
            const nextRow: ThirdPartySeizureAsset = {
                id: existing?.id || `tp_${decisionId}_${Date.now()}`,
                decisionRowId: decisionId,
                thirdPartyName: draft.thirdPartyName,
                expectedAmountIqd: draft.expectedAmountIqd,
                letterDetails: draft.letterDetails,
                status: existing?.status || 'waiting',
                record_locked: existing?.record_locked || false,
                actualReceivedAmountIqd: existing?.actualReceivedAmountIqd ?? null,
                received_at_iso: existing?.received_at_iso ?? null,
                archived_at_ymd: existing?.archived_at_ymd ?? null,
                awaiting_receive: false,
                receive_amount_draft: undefined,
            };
            const nextAssets = [...prev.filter((a) => a.id !== nextRow.id), nextRow];
            setThirdPartySeizureAssets(nextAssets);

            try {
                patchExecutorDecisionRow(decisionsStorageExecutionId, decisionId, {
                    seizureRequestSavedAt: nowIso,
                });
            } catch {
                /* ignore */
            }

            const expected =
                typeof nextRow.expectedAmountIqd === 'number' &&
                Number.isFinite(nextRow.expectedAmountIqd) &&
                nextRow.expectedAmountIqd > 0
                    ? `${nextRow.expectedAmountIqd.toLocaleString('ar-IQ')} د.ع`
                    : '—';

            pushTimelineEvent(
                {
                    id: nextTimelineId(),
                    date: today,
                    timestamp: nowIso,
                    title: '📨 حجز مال المدين لدى الغير — مفاتحة',
                    description: `الجهة: ${nextRow.thirdPartyName}\nالمبلغ المتوقع: ${expected}${nextRow.letterDetails ? `\nالكتاب: ${nextRow.letterDetails}` : ''}`,
                    type: 'coercive',
                    source: 'محضر المتابعة — حجز لدى الغير',
                    metadata: {
                        timelineThreadKey: `third_party_seizure:${decisionId}`,
                        decisionRowId: decisionId,
                        thirdPartyAssetId: nextRow.id,
                    },
                },
                { mergePatch: { thirdPartySeizureAssets: nextAssets } }
            );
            showToast('تم حفظ بيانات الحجز لدى الغير وربطها بالسجل', 'success');
            setShowThirdPartySeizureModal(false);
            setThirdPartySeizureModalDecisionId(null);
        },
        [
            decisionsStorageExecutionId,
            nextTimelineId,
            pushTimelineEvent,
            showToast,
            thirdPartySeizureModalDecisionId,
        ]
    );

    const saveStandaloneExecutionMarkFromModal = useCallback(
        (draft: {
            markType: StandaloneExecutionMark['markType'];
            targetEntity: StandaloneExecutionMark['targetEntity'];
            markDetails: string;
            letterDetails: string;
        }) => {
            const decisionId = String(standaloneExecutionMarkModalDecisionId || '').trim();
            if (!decisionId) return;
            const nowIso = new Date().toISOString();
            const today = getLocalTodayYmd();
            const prev = standaloneExecutionMarksSnapshotRef.current;
            const existing = prev.find((a) => String(a.decisionRowId || '').trim() === decisionId) || null;
            const nextRow: StandaloneExecutionMark = {
                id: existing?.id || `mk_${decisionId}_${Date.now()}`,
                decisionRowId: decisionId,
                markType: draft.markType,
                targetEntity: draft.targetEntity,
                markDetails: draft.markDetails,
                letterDetails: draft.letterDetails,
                isMarkConfirmed: existing?.isMarkConfirmed || false,
                status: existing?.status || 'active',
                record_locked: existing?.record_locked || false,
                archived_at_ymd: existing?.archived_at_ymd ?? null,
            };
            const nextMarks = [...prev.filter((a) => a.id !== nextRow.id), nextRow];
            setStandaloneExecutionMarks(nextMarks);

            try {
                patchExecutorDecisionRow(decisionsStorageExecutionId, decisionId, {
                    seizureRequestSavedAt: nowIso,
                });
            } catch {
                /* ignore */
            }

            pushTimelineEvent(
                {
                    id: nextTimelineId(),
                    date: today,
                    timestamp: nowIso,
                    title: '📌 تعميم/حجز احتياطي — بدء الإجراء',
                    description: `النوع: ${nextRow.markType}\nالجهة: ${nextRow.targetEntity}${nextRow.letterDetails ? `\nالكتاب: ${nextRow.letterDetails}` : ''}\nالتفاصيل: ${nextRow.markDetails}`,
                    type: 'coercive',
                    source: 'محضر المتابعة — الشارة التنفيذية',
                    metadata: {
                        timelineThreadKey: `standalone_mark:${decisionId}`,
                        decisionRowId: decisionId,
                        markId: nextRow.id,
                    },
                },
                { mergePatch: { standaloneExecutionMarks: nextMarks } }
            );

            showToast('تم حفظ الشارة التنفيذية وربطها بالسجل', 'success');
            setShowStandaloneExecutionMarkModal(false);
            setStandaloneExecutionMarkModalDecisionId(null);
        },
        [
            decisionsStorageExecutionId,
            nextTimelineId,
            pushTimelineEvent,
            showToast,
            standaloneExecutionMarkModalDecisionId,
        ]
    );

    useEffect(() => {
        const id = executionData?.id;
        if (!id || id === 'undefined') return;
        let cancelled = false;
        void import('@/app/services/timelineEventsSupabase')
            .then(({ fetchTimelineEventsFromSupabase, mergeRemoteSnapshotsIntoTimelineEvents }) =>
                fetchTimelineEventsFromSupabase(String(id)).then((rows: TimelineEventDbRow[]) => {
                    if (cancelled || !rows.length) return;
                    setTimelineEvents((prev) => mergeRemoteSnapshotsIntoTimelineEvents(prev, rows));
                })
            )
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [executionData?.id]);

    const handleRequestHistoricalSnapshotPreview = useCallback(
        (event: TimelineEvent) => {
            if (event.snapshot == null) {
                showToast('لا توجد لقطة محفوظة لهذا الحدث للمعاينة التاريخية.', 'warning');
                return;
            }
            setHistoricalSnapshot(event.snapshot);
            setShowTimelineModal(false);
        },
        [showToast, setShowTimelineModal]
    );

    const persistGuarantorFollowupDetails = useCallback(
        (
            guarantorName: string,
            guarantorWorkplace: string,
            opts?: { salaryIqd: number | null; deductionIqd: number | null; guaranteeType?: 'amount' | 'attendance' }
        ) => {
            const prev = executionData?.guarantor_followup;
            const name = guarantorName.trim();
            const wp = guarantorWorkplace.trim();
            if (!name || !wp) {
                showToast('أدخل اسم الكفيل ومكان العمل قبل الحفظ.', 'warning');
                return;
            }
            const creditors = executionData?.creditors;
            let patchCreditors: Creditor[] | undefined;
            if (Array.isArray(creditors) && creditors.length > 0) {
                const c0 = creditors[0] as Creditor;
                patchCreditors = [{ ...c0, guarantorExecutionNotation: true }, ...creditors.slice(1)];
            }
            persistExecutionMerge({
                guarantor_followup: {
                    executor_approved: prev?.executor_approved ?? true,
                    details_saved: true,
                    guarantee_type: opts?.guaranteeType === 'attendance' ? 'attendance' : 'amount',
                    guarantor_name: name,
                    guarantor_workplace: wp,
                    guarantor_salary_iqd: opts?.salaryIqd ?? null,
                    guarantor_deduction_iqd: opts?.deductionIqd ?? null,
                    creditor_notation_registered: true,
                },
                debtor_executive_detention_active: false,
                executive_detention_until: null,
                executive_detention_days_total: null,
                executive_detention_reminder_sent: false,
                executive_detention_judge_outcome: null,
                executive_detention_request_in_absentia: false,
                debtor_travel_ban_active: false,
                ...(patchCreditors ? { creditors: patchCreditors } : {}),
            });
            const ts = new Date().toISOString();
            const sal = opts?.salaryIqd;
            const ded = opts?.deductionIqd;
            const gt = opts?.guaranteeType === 'attendance' ? 'كفالة إحضار شخصية' : 'كفالة ضامنة للمبلغ';
            pushTimelineEvent({
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: 'تثبيت بيانات الكفيل الضامن',
                description: [
                    `نوع الكفالة: ${gt}`,
                    `الاسم: ${name}`,
                    `مكان العمل: ${wp}`,
                    sal != null ? `الراتب: ${sal.toLocaleString('ar-IQ')} د.ع` : null,
                    ded != null ? `الاستقطاع: ${ded.toLocaleString('ar-IQ')} د.ع` : null,
                ]
                    .filter(Boolean)
                    .join('\n'),
                type: 'procedure',
                source: 'محضر المتابعة',
            });
            const did = String(guarantorDetailsDecisionId || '').trim();
            if (did) {
                try {
                    patchExecutorDecisionRow(decisionsStorageExecutionId, did, {
                        guarantorDetailsSavedAt: ts,
                    } as any);
                } catch {
                    /* ignore */
                }
                setGuarantorDetailsDecisionId(null);
            }
            showToast('تم حفظ بيانات الكفيل وتسجيل تعليم الدائن.', 'success');
        },
        [
            executionData?.guarantor_followup,
            executionData?.creditors,
            decisionsStorageExecutionId,
            guarantorDetailsDecisionId,
            persistExecutionMerge,
            pushTimelineEvent,
            nextTimelineId,
            showToast,
        ]
    );

    const applyDossierLifecycleToFileAndTimeline = useCallback(
        (status: DossierLifecycleStatus, reason: string, date: string) => {
            const r = reason.trim();
            const d = date.trim();
            const persistKey = String(executionData?.id ?? executionId ?? '');
            if (!persistKey || persistKey === 'undefined') return false;
            if (status !== 'active' && (!r || !d)) {
                showToast('أدخل السبب والتاريخ لاعتماد الحالة.', 'warning');
                return false;
            }
            const label = dossierLifecycleLabelAr(status);
            const iso = new Date().toISOString();
            const day = iso.slice(0, 10);
            const baseEx = executionDataRef.current;
            const lifecycleSnap = buildExecutionTimelineSnapshot({
                executionData: baseEx
                    ? {
                          ...baseEx,
                          dossier_lifecycle_status: status,
                          dossier_status_reason: status === 'active' ? '' : r,
                          dossier_status_date: status === 'active' ? '' : d,
                      }
                    : null,
                financialLedger: financialLedgerRef.current,
                seizedAssets: seizedAssetsSnapshotRef.current,
            });
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: day,
                timestamp: iso,
                title: `📋 حالة الإضبارة: ${label}`,
                description:
                    status === 'active'
                        ? 'أُعيدت الإضبارة إلى الحالة النشطة.'
                        : `السبب:\n${r}\n\nالتاريخ: ${d}`,
                type: 'procedure',
                source: 'رأس الإضبارة',
                snapshot: lifecycleSnap,
            };
            setTimelineEvents((prev) => {
                const next = [ev, ...prev];
                queueMicrotask(() => {
                    persistExecutionMerge({
                        dossier_lifecycle_status: status,
                        dossier_status_reason: status === 'active' ? '' : r,
                        dossier_status_date: status === 'active' ? '' : d,
                        timelineEvents: next,
                    });
                    const execId = String(baseEx?.id ?? executionId ?? '');
                    if (execId && execId !== 'undefined') {
                        void import('@/app/services/timelineEventsSupabase')
                            .then(({ insertTimelineEventToSupabase }) =>
                                insertTimelineEventToSupabase({
                                    executionFileId: execId,
                                    event: ev,
                                    snapshotData: lifecycleSnap,
                                })
                            )
                            .catch(() => {});
                    }
                });
                return next;
            });
            if (dossierFileKey && dossierFileKey !== 'undefined') {
                reconcileDossierLifecycle(dossierFileKey, {
                    ...(executionData ?? {}),
                    dossier_lifecycle_status: status,
                    dossier_status_reason: status === 'active' ? '' : r,
                    dossier_status_date: status === 'active' ? '' : d,
                } as ExecutionFile);
            }
            if (status === 'active') {
                setDossierReasonDraft('');
                setDossierDateDraft('');
            }
            showToast('تم حفظ الحالة وتسجيلها في السجل الزمني.', 'success');
            return true;
        },
        [
            dossierFileKey,
            executionData,
            executionId,
            nextTimelineId,
            persistExecutionMerge,
            reconcileDossierLifecycle,
            showToast,
        ]
    );

    const closeDossierLifecyclePanel = useCallback(() => {
        setDossierLifecyclePanelOpen(false);
        setDossierLifecyclePanelPhase('menu');
        setDossierPendingStatus(null);
    }, []);

    const handleDossierLifecyclePick = useCallback(
        (picked: DossierLifecycleStatus) => {
            if (picked === 'active') {
                const ok = applyDossierLifecycleToFileAndTimeline('active', '', '');
                if (ok) closeDossierLifecyclePanel();
                return;
            }
            const committed = normalizeDossierLifecycleStatus(executionData?.dossier_lifecycle_status);
            setDossierPendingStatus(picked);
            setDossierLifecyclePanelPhase('details');
            if (picked === committed) {
                setDossierReasonDraft(String(executionData?.dossier_status_reason ?? '').trim());
                setDossierDateDraft(String(executionData?.dossier_status_date ?? '').slice(0, 10));
            } else {
                setDossierReasonDraft('');
                setDossierDateDraft('');
            }
        },
        [applyDossierLifecycleToFileAndTimeline, closeDossierLifecyclePanel, executionData]
    );

    const handleDossierLifecycleConfirmDetails = useCallback(() => {
        if (!dossierPendingStatus || dossierPendingStatus === 'active') return;
        const ok = applyDossierLifecycleToFileAndTimeline(
            dossierPendingStatus,
            dossierReasonDraft,
            dossierDateDraft
        );
        if (ok) closeDossierLifecyclePanel();
    }, [
        applyDossierLifecycleToFileAndTimeline,
        closeDossierLifecyclePanel,
        dossierDateDraft,
        dossierPendingStatus,
        dossierReasonDraft,
    ]);

    useEffect(() => {
        if (!dossierLifecyclePanelOpen) return;
        const onDocMouseDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (dossierLifecyclePopoverRef.current?.contains(t)) return;
            if (dossierLifecyclePanelPortalRef.current?.contains(t)) return;
            closeDossierLifecyclePanel();
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, [dossierLifecyclePanelOpen, closeDossierLifecyclePanel]);

    useEffect(() => {
        if (!dossierLifecyclePanelOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeDossierLifecyclePanel();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [dossierLifecyclePanelOpen, closeDossierLifecyclePanel]);

    useEffect(() => {
        if (!showExecutionTrashModal) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowExecutionTrashModal(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [showExecutionTrashModal]);

    useLayoutEffect(() => {
        if (!dossierLifecyclePanelOpen) {
            setDossierLifecyclePopStyle(null);
            return;
        }
        let raf = 0;
        const update = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const el = dossierLifecyclePopoverRef.current;
                if (!el) return;
                const r = el.getBoundingClientRect();
                const vw = document.documentElement.clientWidth;
                const margin = 12;
                const maxPanelW = Math.min(304, vw - 2 * margin);
                const w = Math.min(maxPanelW, Math.max(224, r.width));
                const desiredLeft = r.right - w;
                let left = desiredLeft;
                if (left < margin) left = margin;
                if (left + w > vw - margin) left = Math.max(margin, vw - margin - w);
                setDossierLifecyclePopStyle({
                    top: r.bottom + 6,
                    left,
                    width: w,
                });
            });
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [dossierLifecyclePanelOpen, dossierLifecyclePanelPhase, dossierStatusDraft]);

    const moveTimelineEventToTrash = useCallback(
        (ev: TimelineEvent) => {
            const cur = timelineEventsRef.current.find((e) => e.id === ev.id);
            if (!cur || cur.trashedAt) return;
            const iso = new Date().toISOString();
            setTimelineEvents((prev) => {
                const next = prev.map((e) => (e.id === ev.id ? { ...e, trashedAt: iso } : e));
                queueMicrotask(() => persistExecutionMerge({ timelineEvents: next }));
                return next;
            });
            showToast('نُقل الحدث إلى سلة مهملات الإضبارة', 'info');
        },
        [persistExecutionMerge, showToast]
    );

    const toggleTimelineEventPin = useCallback(
        (ev: TimelineEvent) => {
            setTimelineEvents((prev) => {
                if (!prev.some((e) => e.id === ev.id)) return prev;
                const next = prev.map((e) =>
                    e.id === ev.id ? { ...e, isPinned: !e.isPinned } : e
                );
                queueMicrotask(() => persistExecutionMerge({ timelineEvents: next }));
                return next;
            });
        },
        [persistExecutionMerge]
    );

    const restoreTimelineEventFromTrash = useCallback(
        (id: string, trashedAt: string | undefined) => {
            const idTrim = String(id || '').trim();
            if (!idTrim) return;
            const cur = timelineEventsRef.current.find(
                (e) => e.id === idTrim && String(e.trashedAt || '') === String(trashedAt || '')
            );
            if (!cur || !cur.trashedAt) return;
            setTimelineEvents((prev) => {
                const next = prev.map((e) =>
                    e.id === idTrim && String(e.trashedAt || '') === String(trashedAt || '')
                        ? { ...e, trashedAt: undefined }
                        : e
                );
                queueMicrotask(() => persistExecutionMerge({ timelineEvents: next }));
                return next;
            });
            showToast('أُعيد الحدث إلى السجل الزمني', 'success');
        },
        [persistExecutionMerge, showToast]
    );

    const permanentlyDeleteTimelineEvent = useCallback(
        (id: string) => {
            const had = timelineEventsRef.current.some((e) => e.id === id);
            setPermanentDeleteTimelineId(null);
            if (!had) return;
            setTimelineEvents((prev) => {
                const next = prev.filter((e) => e.id !== id);
                queueMicrotask(() => persistExecutionMerge({ timelineEvents: next }));
                return next;
            });
            showToast('حُذف الحدث نهائياً من السجل', 'success');
        },
        [persistExecutionMerge, showToast]
    );

    const moveCaseNoteToTrash = useCallback(
        (id: string) => {
            const cur = caseNotesLogRef.current.find((n) => n.id === id);
            if (!cur || cur.trashedAt) return;
            const iso = new Date().toISOString();
            setCaseNotesLog((prev) => {
                const next = prev.map((n) => (n.id === id ? { ...n, trashedAt: iso } : n));
                queueMicrotask(() => persistExecutionMerge({ caseNotesLog: next }));
                return next;
            });
            showToast('نُقلت الملاحظة إلى السلة', 'info');
        },
        [persistExecutionMerge, showToast]
    );

    const moveCaseTaskToTrash = useCallback(
        (id: string) => {
            const cur = caseTasksPendingRef.current.find((t) => t.id === id);
            if (!cur || cur.trashedAt) return;
            const iso = new Date().toISOString();
            setCaseTasksPending((prev) => {
                const next = prev.map((t) => (t.id === id ? { ...t, trashedAt: iso } : t));
                queueMicrotask(() => persistExecutionMerge({ caseTasksPending: next }));
                return next;
            });
            showToast('نُقلت المهمة إلى السلة', 'info');
        },
        [persistExecutionMerge, showToast]
    );

    const openEditDossierMeta = useCallback(() => {
        setDossierMetaDraft({
            directorate: String(executionData?.directorate ?? directorate ?? ''),
            fileNumber: String(fileNumber ?? ''),
            fileYear: String((executionData as ExecutionFile)?.fileYear ?? fileYear ?? ''),
            docNumber: String(docNumber ?? ''),
            judgmentDate: String(judgmentDate ?? '').slice(0, 10),
            classification: String(classification ?? ''),
            property_number: String(evictionPropertyNumber ?? ''),
            district: String(evictionPropertyDistrict ?? ''),
            property_type: String(evictionPropertyTypeField ?? ''),
            full_address: String(evictionFullAddressField ?? ''),
            eviction_premises_use:
                evictionPremisesUseRaw === 'residential'
                    ? 'residential'
                    : evictionPremisesUseRaw === 'commercial'
                      ? 'commercial'
                      : '',
        });
        setShowEditDossierMetaModal(true);
    }, [
        classification,
        directorate,
        docNumber,
        evictionFullAddressField,
        evictionPremisesUseRaw,
        evictionPropertyDistrict,
        evictionPropertyNumber,
        evictionPropertyTypeField,
        fileNumber,
        fileYear,
        judgmentDate,
    ]);

    const saveDossierMetaDraft = useCallback(() => {
        if (!dossierMetaDraft) return;
        const ep = dossierMetaDraft.eviction_premises_use;
        const base = {
            directorate: dossierMetaDraft.directorate as ExecutionFile['directorate'],
            fileNumber: dossierMetaDraft.fileNumber,
            fileYear: dossierMetaDraft.fileYear,
            docNumber: dossierMetaDraft.docNumber,
            judgmentDate: dossierMetaDraft.judgmentDate,
            classification: dossierMetaDraft.classification,
        };
        if (isEvictionExecutionModule) {
            persistExecutionMerge({
                ...base,
                property_number: dossierMetaDraft.property_number,
                district: dossierMetaDraft.district,
                property_type: dossierMetaDraft.property_type,
                full_address: dossierMetaDraft.full_address,
                eviction_premises_use:
                    ep === 'residential' || ep === 'commercial'
                        ? (ep as 'commercial' | 'residential')
                        : undefined,
            });
        } else {
            persistExecutionMerge(base);
        }
        setShowEditDossierMetaModal(false);
        setDossierMetaDraft(null);
        showToast('تم حفظ بيانات الإضبارة', 'success');
    }, [dossierMetaDraft, isEvictionExecutionModule, persistExecutionMerge, showToast]);

    const openEditParty = useCallback(
        (kind: 'creditor' | 'debtor', index: number, opts?: { forceHeirs?: boolean }) => {
            const row = kind === 'creditor' ? creditors[index] : debtors[index];
            if (!row) return;
            const lockBaseInfo =
                kind === 'creditor'
                    ? Boolean(row.isDeceased || (index === 0 && executionData?.is_creditor_deceased))
                    : Boolean(row.isDeceased || (index === 0 && executionData?.is_debtor_deceased));
            const substitutionApproved =
                kind === 'creditor'
                    ? getCreditorHeirSubstitutionRequestStatus(decisionsStorageExecutionId) === 'approved'
                    : getDebtorHeirSubstitutionRequestStatus(decisionsStorageExecutionId) === 'approved';
            const includeHeirsInForm = Boolean(opts?.forceHeirs)
                ? true
                : Boolean(lockBaseInfo || substitutionApproved);
            const hasHeirsDetailsField = Array.isArray((row as any)?.heirs_details);
            const heirDetailsRaw = hasHeirsDetailsField ? ((row as any).heirs_details as any[]) : [];
            const heirRowsRaw = hasHeirsDetailsField
                ? heirDetailsRaw.map((h) => ({
                      rowId: makeHeirRowId(),
                      name: String(h?.name || ''),
                      phone: String(h?.phone || ''),
                      address: String(h?.address || ''),
                      isClient: Boolean(h?.isClient),
                  }))
                : ((row.heirs || []).map((h) => ({
                      rowId: makeHeirRowId(),
                      name: String(h || ''),
                      phone: '',
                      address: '',
                      isClient: false,
                  })) as HeirDetailRow[]);
            const heirRows = includeHeirsInForm ? dedupeHeirDetailRowsByName(heirRowsRaw) : [];
            const baseDraft = {
                name: row.name || '',
                phone: row.phone || '',
                address: row.address || '',
                heirs:
                    includeHeirsInForm && heirRows.length > 0
                        ? heirRows.map((h) => ({ ...h, rowId: h.rowId || makeHeirRowId() }))
                        : [],
                lockBaseInfo,
                includeHeirsInForm,
            };
            let cloned = baseDraft;
            try {
                const sc = (globalThis as any).structuredClone as (<T>(x: T) => T) | undefined;
                cloned = sc ? sc(baseDraft) : (JSON.parse(JSON.stringify(baseDraft)) as typeof baseDraft);
            } catch {
                cloned = JSON.parse(JSON.stringify(baseDraft)) as typeof baseDraft;
            }
            setPartyEditDraft(cloned);
            setEditPartyTarget({ kind, index });
        },
        [
            creditors,
            debtors,
            decisionsStorageExecutionId,
            executionData?.is_creditor_deceased,
            executionData?.is_debtor_deceased,
        ]
    );

    const buildPartyHeirsRows = useCallback(
        (party: Party | null | undefined, partyKind: 'creditor' | 'debtor') => {
            const hasHeirsDetailsField = Array.isArray((party as any)?.heirs_details);
            const details = hasHeirsDetailsField ? ((party as any).heirs_details as any[]) : [];
            const partyDetails = details
                .map((h) => ({
                    name: String(h?.name || '').trim(),
                    phone: String(h?.phone || '').trim(),
                    address: String(h?.address || '').trim(),
                    isClient: Boolean(h?.isClient),
                }))
                .filter((h) => /\S/.test(h.name));

			if (hasHeirsDetailsField && partyDetails.length > 0) return dedupeHeirDetailRowsByName(partyDetails);

            const caseIsForParty = executionData?.party_death_case?.deceased_party === partyKind;
            const caseDetails = caseIsForParty
                ? (executionData?.party_death_case?.heir_details || [])
                      .map((h: any) => ({
                          name: String(h?.name || '').trim(),
                          phone: String(h?.phone || '').trim(),
                          address: String(h?.address || '').trim(),
                          isClient: Boolean(h?.isClient),
                      }))
                      .filter((h: any) => /\S/.test(String(h?.name || '')))
                : [];
            const caseNames = caseIsForParty
                ? (executionData?.party_death_case?.heir_names || [])
                      .map((name) => ({
                          name: String(name || '').trim(),
                          phone: '',
                          address: '',
                          isClient: false,
                      }))
                      .filter((h) => /\S/.test(h.name))
                : [];

            const partyLegacy = (party?.heirs || [])
                .map((name) => ({
                    name: String(name || '').trim(),
                    phone: '',
                    address: '',
                    isClient: false,
                }))
                .filter((h) => /\S/.test(h.name));

            const chosen = caseDetails.length > 0 ? caseDetails : caseNames.length > 0 ? caseNames : partyLegacy;
            return dedupeHeirDetailRowsByName(chosen);
        },
        [executionData?.party_death_case]
    );

    const openHeirsQuickView = useCallback(
        (party: Party | null | undefined, partyKind: 'creditor' | 'debtor', title: string) => {
            const rows = buildPartyHeirsRows(party, partyKind);
            if (rows.length === 0) {
                showToast('لا توجد بيانات ورثة مسجّلة بعد.', 'info');
                return;
            }
            setHeirsQuickView({ title, rows });
        },
        [buildPartyHeirsRows, showToast]
    );

    const savePartyEditDraft = useCallback(() => {
        if (!editPartyTarget || !partyEditDraft) return;
        const allowHeirEdit = Boolean((partyEditDraft as any).includeHeirsInForm);
        if (editPartyTarget.kind === 'creditor') {
            const arr = [...creditors];
            const i = editPartyTarget.index;
            if (!arr[i]) return;
            const prev = arr[i] as Creditor & { heirs_details?: HeirDetailRow[] };
            arr[i] = {
                ...arr[i],
                name: partyEditDraft.lockBaseInfo ? arr[i].name : partyEditDraft.name,
                phone: partyEditDraft.lockBaseInfo ? arr[i].phone : partyEditDraft.phone,
                address: partyEditDraft.lockBaseInfo ? arr[i].address : partyEditDraft.address,
                heirs: allowHeirEdit
                    ? partyEditDraft.heirs.map((h) => String(h?.name || '').trim()).filter((h) => /\S/.test(h))
                    : prev.heirs || [],
                heirs_details: allowHeirEdit
                    ? partyEditDraft.heirs
                          .filter((h) => /\S/.test(String(h?.name || '').trim()))
                          .map((h) => ({
                              name: String(h.name || '').trim(),
                              phone: String(h.phone || '').trim(),
                              address: String(h.address || '').trim(),
                              isClient: Boolean(h.isClient),
                          }))
                    : Array.isArray(prev.heirs_details)
                      ? prev.heirs_details
                      : [],
            };
            persistExecutionMerge({ creditors: arr });
        } else {
            const arr = [...debtors];
            const i = editPartyTarget.index;
            if (!arr[i]) return;
            const prev = arr[i] as Debtor & { heirs_details?: HeirDetailRow[] };
            arr[i] = {
                ...arr[i],
                name: partyEditDraft.lockBaseInfo ? arr[i].name : partyEditDraft.name,
                phone: partyEditDraft.lockBaseInfo ? arr[i].phone : partyEditDraft.phone,
                address: partyEditDraft.lockBaseInfo ? arr[i].address : partyEditDraft.address,
                heirs: allowHeirEdit
                    ? partyEditDraft.heirs.map((h) => String(h?.name || '').trim()).filter((h) => /\S/.test(h))
                    : prev.heirs || [],
                heirs_details: allowHeirEdit
                    ? partyEditDraft.heirs
                          .filter((h) => /\S/.test(String(h?.name || '').trim()))
                          .map((h) => ({
                              name: String(h.name || '').trim(),
                              phone: String(h.phone || '').trim(),
                              address: String(h.address || '').trim(),
                              isClient: Boolean(h.isClient),
                          }))
                    : Array.isArray(prev.heirs_details)
                      ? prev.heirs_details
                      : [],
            };
            persistExecutionMerge({ debtors: arr });
        }
        setEditPartyTarget(null);
        setPartyEditDraft(null);
        showToast('تم حفظ بيانات الطرف', 'success');
    }, [
        creditors,
        debtors,
        editPartyTarget,
        partyEditDraft,
        persistExecutionMerge,
        showToast,
    ]);

    const removeHeirFromPartyEditDraftAtIndex = useCallback(
        (idx: number) => {
            setPartyEditDraft((d) => {
                if (!d) return d;
                const next = d.heirs.filter((_, i) => i !== idx);
                return { ...d, heirs: next };
            });
            setPartyEditHeirDeleteConfirmIdx(null);
        },
        [decisionsStorageExecutionId, editPartyTarget?.kind]
    );

    const togglePartyEditHeirClient = useCallback((heirIdx: number) => {
        setPartyEditDraft((d) => {
            if (!d) return d;
            const cur = d.heirs[heirIdx];
            if (!cur) return d;
            const was = Boolean(cur.isClient);
            const next = d.heirs.map((h, i) => ({
                ...h,
                isClient: was ? false : i === heirIdx,
            }));
            return { ...d, heirs: next };
        });
    }, []);

    const saveTimelineEditDraft = useCallback(() => {
        if (!timelineEditDraft) return;
        setTimelineEvents((prev) => {
            const next = prev.map((e) =>
                e.id === timelineEditDraft.id
                    ? {
                          ...e,
                          title: timelineEditDraft.title,
                          description: timelineEditDraft.description,
                          date: timelineEditDraft.date,
                      }
                    : e
            );
            queueMicrotask(() => persistExecutionMerge({ timelineEvents: next }));
            return next;
        });
        setTimelineEditDraft(null);
        showToast('تم تحديث الحدث في السجل', 'success');
    }, [timelineEditDraft, persistExecutionMerge, showToast]);

    const restoreCaseNoteFromTrash = useCallback(
        (id: string, trashedAt: string | undefined) => {
            const idTrim = String(id || '').trim();
            if (!idTrim) return;
            const cur = caseNotesLogRef.current.find(
                (n) => n.id === idTrim && String(n.trashedAt || '') === String(trashedAt || '')
            );
            if (!cur || !cur.trashedAt) return;
            setCaseNotesLog((prev) => {
                const next = prev.map((n) =>
                    n.id === idTrim && String(n.trashedAt || '') === String(trashedAt || '')
                        ? { ...n, trashedAt: undefined }
                        : n
                );
                queueMicrotask(() => persistExecutionMerge({ caseNotesLog: next }));
                return next;
            });
            showToast('أُعيدت الملاحظة', 'success');
        },
        [persistExecutionMerge, showToast]
    );

    const permanentlyDeleteCaseNote = useCallback(
        (id: string) => {
            const had = caseNotesLogRef.current.some((n) => n.id === id);
            if (!had) return;
            setCaseNotesLog((prev) => {
                const next = prev.filter((n) => n.id !== id);
                queueMicrotask(() => persistExecutionMerge({ caseNotesLog: next }));
                return next;
            });
            showToast('حُذفت الملاحظة نهائياً', 'success');
        },
        [persistExecutionMerge, showToast]
    );

    const restoreCaseTaskFromTrash = useCallback(
        (id: string, trashedAt: string | undefined) => {
            const idTrim = String(id || '').trim();
            if (!idTrim) return;
            const cur = caseTasksPendingRef.current.find(
                (t) => t.id === idTrim && String(t.trashedAt || '') === String(trashedAt || '')
            );
            if (!cur || !cur.trashedAt) return;
            setCaseTasksPending((prev) => {
                const next = prev.map((t) =>
                    t.id === idTrim && String(t.trashedAt || '') === String(trashedAt || '')
                        ? { ...t, trashedAt: undefined }
                        : t
                );
                queueMicrotask(() => persistExecutionMerge({ caseTasksPending: next }));
                return next;
            });
            showToast('أُعيدت المهمة', 'success');
        },
        [persistExecutionMerge, showToast]
    );

    const permanentlyDeleteCaseTask = useCallback(
        (id: string) => {
            const had = caseTasksPendingRef.current.some((t) => t.id === id);
            if (!had) return;
            setCaseTasksPending((prev) => {
                const next = prev.filter((t) => t.id !== id);
                queueMicrotask(() => persistExecutionMerge({ caseTasksPending: next }));
                return next;
            });
            showToast('حُذفت المهمة نهائياً', 'success');
        },
        [persistExecutionMerge, showToast]
    );

    /** مصدر موحّد لتحديث المدينين — يفضّل البيانات المدمجة في الملف على props المتأخرة */
    const debtorsForPartyPatch = useMemo(() => {
        if (Array.isArray(executionData?.debtors) && executionData.debtors.length > 0) {
            return executionData.debtors as Debtor[];
        }
        return (debtors || []) as Debtor[];
    }, [executionData?.debtors, debtors]);

    const { runSubmit: runSpecialFollowupSubmit } = useStandardSubmit({
        validate: () =>
            Boolean(specialRequestDate.trim()) && Boolean(specialRequestContent.trim()),
        validationMessage: 'أدخل تاريخ الطلب ومضمون الطلب',
        submit: () => {
            const d = specialRequestDate.trim();
            const content = specialRequestContent.trim();
            const decisionId = appendSpecialFollowupRequest({
                executionId: decisionsStorageExecutionId,
                requestDate: d,
                content,
            });
            if (!decisionId) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', { decisionsLink: true });
                return false;
            }
            const now = new Date().toISOString();
            const fullBody = `بتاريخ ${d}:\n\n${content}`;
            pushTimelineEvent({
                id: nextTimelineId(),
                date: d,
                timestamp: now,
                title: 'طلب تنفيذي خاص — قيد البت',
                description: fullBody,
                type: 'coercive',
                source: 'محضر المتابعة',
                metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
            });
            setSpecialRequestContent('');
            setSpecialRequestDate('');
        },
        onClose: () => {},
        successMessage:
            'تم حفظ الطلب بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ — افتح «القرارات والطعون» من الشريط عند الحاجة',
        showToast,
        successToastOptions: { decisionsLink: true },
    });

    const handleOtherPartyActionSubmitToDecisions = useCallback(
        (input: { date: string; content: string }): { ok: boolean; decisionId?: string } => {
            const d = String(input.date || '').trim();
            const content = String(input.content || '').trim();
            if (!d || !content) {
                showToast('أدخل تاريخ التحرك ومضمون الطلب', 'warning');
                return { ok: false };
            }
            const decisionId = appendSpecialFollowupRequest({
                executionId: decisionsStorageExecutionId,
                requestDate: d,
                content,
                appealRequestOrigin: 'debtor_side',
                decisionTitle: 'تحرك الطرف الآخر — قيد البت',
            });
            if (!decisionId) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', { decisionsLink: true });
                return { ok: false };
            }
            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: d,
                timestamp: now,
                title: 'تحرك الطرف الآخر — قيد البت',
                description: `بتاريخ ${d}:\n\n${content}`,
                type: 'decision',
                source: 'محضر المتابعة',
                metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
            });
            setShowDecisionsModal(true);
            showToast('تم إرسال الطلب إلى قسم القرارات والطعون.', 'success', { decisionsLink: true });
            return { ok: true, decisionId };
        },
        [
            decisionsStorageExecutionId,
            nextTimelineId,
            pushTimelineEvent,
            setShowDecisionsModal,
            showToast,
        ]
    );

    /** تبديل موظف ↔ كاسب — `useExecutionDashboardStore.toggleDebtorEmploymentStatus` + دمج الملف */
    const handleDebtorEmploymentToggle = useCallback(
        (ctx?: { debtorKey: string; isPrimary: boolean }) => {
            if (!executionData?.id) return;
            const primaryK = debtorWorkspaceEntries[0]?.key;
            const debtorKeyRaw = String(ctx?.debtorKey ?? primaryK ?? '').trim();
            const debtorKey = debtorKeyRaw !== '' ? debtorKeyRaw : 'primary_debtor';

            const prim = executionData.debtors?.[0] as Debtor | undefined;
            const primaryKey =
                prim?.id != null && String(prim.id).trim() !== ''
                    ? String(prim.id)
                    : 'primary_debtor';
            let currentlyEmployee: boolean;
            if (debtorKey === primaryKey) {
                currentlyEmployee = isDebtorRowEmployee(prim);
            } else {
                const ad = executionData.party_multiplicity?.additionalDebtors?.find(
                    (a) => String(a.id) === debtorKey
                );
                if (!ad) {
                    showToast(
                        'تعذّر ربط المدين ببيانات تعدّد الخصوم — أعد فتح الإضبارة أو أضف المدين من إعدادات الذمة.',
                        'warning'
                    );
                    return;
                }
                currentlyEmployee = ad.isEmployee !== false;
            }

            const patch = buildDebtorEmploymentTogglePatch(executionData, debtorKey);
            if (!patch) {
                showToast('تعذّر تبديل الصفة الوظيفية.', 'warning');
                return;
            }

            const iso = getLocalTodayYmd();
            const ts = new Date().toISOString();
            const nextEmp = !currentlyEmployee;
            const event: TimelineEvent = {
                id: nextTimelineId(),
                date: iso,
                timestamp: ts,
                title: nextEmp ? '↩️ إعادة تفعيل الوظيفة' : '📋 تحويل المدين إلى كاسب',
                description: nextEmp
                    ? 'أُعيدت صفة المدين إلى موظف — يُتاح حجز الراتب؛ أُلغيت حالة التنفيذ الجبري الشخصي المرتبطة بمسار الكاسب.'
                    : 'تغيير الحالة الوظيفية — حجز الراتب لا ينطبق؛ يُتاح التنفيذ الجبري الشخصي وفق المسار.',
                type: 'procedure',
                source: 'إدارة التنفيذ',
                metadata: { timelineDebtorKey: debtorKey },
            };
            setTimelineEvents((prev) => {
                const next = [event, ...prev];
                persistExecutionMerge({ ...patch, timelineEvents: next });
                useExecutionDashboardStore.getState().setCurrentFile({
                    ...executionData,
                    ...patch,
                    timelineEvents: next,
                } as ExecutionFile);
                return next;
            });
            showToast(nextEmp ? 'تمت إعادة صفة الموظف.' : 'تم التحويل إلى كاسب.', 'success');
        },
        [
            coerciveUiLocked,
            debtorWorkspaceEntries,
            executionData,
            nextTimelineId,
            persistExecutionMerge,
            showToast,
        ]
    );

    const exIdForPersonalDecisions = executionData?.id ?? executionId;

    useEffect(() => {
        if (!exIdForPersonalDecisions) return;
        const rows = readExecutorDecisionsArray(exIdForPersonalDecisions);
        const travelOk = rows.some(
            (r) =>
                r.requestKind === 'personal_coercive' &&
                r.personalCoerciveSubtype === 'travel_ban' &&
                r.executorOutcome === 'approved'
        );
        if (travelOk && !executionData?.debtor_travel_ban_active) {
            persistExecutionMerge({ debtor_travel_ban_active: true });
        }
    }, [
        decisionsReloadEpoch,
        exIdForPersonalDecisions,
        executionData?.debtor_travel_ban_active,
        persistExecutionMerge,
    ]);

    /** مزامنة نتيجة منفذ العدل على طلب مفاتحة التحقيق (تكليف حضور موظف — يدعم أكثر من مدين) */
    useEffect(() => {
        const d = executionData;
        if (!d || !exIdForPersonalDecisions) return;
        const rows = readExecutorDecisionsArray(exIdForPersonalDecisions) as ExecutorDecisionRowLite[];
        const merged = mergeInvestigationOutcomesIntoEmployeeAssignments(
            d,
            primaryDebtorKeyResolved,
            rows
        );
        if (!merged) return;
        const syncSig = [
            String(d.id),
            String(merged.approvedCount),
            String(merged.rejectedCount),
            ...Object.entries(merged.patch.employee_summons_assignments_by_debtor)
                .map(
                    ([k, st]) =>
                        `${k}:${st.phase}:${String(st.investigationDecisionId ?? '')}:${String(st.arrestOrderRecorded ?? '')}`
                )
                .sort(),
        ].join('|');
        if (employeeInvestigationSyncSigRef.current === syncSig) return;
        employeeInvestigationSyncSigRef.current = syncSig;
        persistExecutionMerge(merged.patch);
        const { approvedCount, rejectedCount } = merged;
        if (approvedCount > 0 && rejectedCount === 0) {
            showToast(
                'تمت موافقة المنفذ على طلب المفاتحة — تابع تسجيل أمر القبض من التنفيذ الجبري الشخصي.',
                'success',
                {
                    action: {
                        label: 'فتح التنفيذ الجبري الشخصي',
                        onClick: () => {
                            setShowUnifiedExecutionModal(true);
                            setUnifiedModalTab('personal');
                            hideToast();
                        },
                    },
                }
            );
        } else if (rejectedCount > 0 && approvedCount === 0) {
            showToast('صدر رفض الطلب — يمكن إنهاء التكليف أو إعادة المحاولة.', 'info', {
                decisionsLink: true,
            });
        } else {
            showToast(
                `تم تحديث طلبات المفاتحة: ${approvedCount} موافقة، ${rejectedCount} رفض.`,
                'info',
                { decisionsLink: true }
            );
        }
    }, [
        decisionsReloadEpoch,
        exIdForPersonalDecisions,
        executionData,
        executionData?.employee_summons_assignment,
        executionData?.employee_summons_assignments_by_debtor,
        hideToast,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        setShowUnifiedExecutionModal,
        setUnifiedModalTab,
        showToast,
    ]);

    useEffect(() => {
        if (!exIdForPersonalDecisions) return;
        if (executionData?.forced_bring_in_personal_followup_logged) return;
        const rows = readExecutorDecisionsArray(exIdForPersonalDecisions);
        const ok = rows.some(
            (r) =>
                r.requestKind === 'personal_coercive' &&
                r.personalCoerciveSubtype === 'forced_bring_in' &&
                r.executorOutcome === 'approved'
        );
        if (!ok) return;
        setTimelineEvents((prev) => {
            if (prev.some((e) => e.title && e.title.includes('مسودة مذكرة إحضار'))) {
                queueMicrotask(() =>
                    persistExecutionMerge({ forced_bring_in_personal_followup_logged: true })
                );
                return prev;
            }
            const now = new Date().toISOString();
            const memo: TimelineEvent = {
                id: nextTimelineId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: '📄 مسودة مذكرة إحضار (بعد موافقة المنفذ)',
                description:
                    'راجع الصياغة للطباعة وتسليمها لمركز الشرطة / المفرزة. يُسجّل إنجاز المهمة عند إتمام التنفيذ الميداني.',
                type: 'coercive',
                source: 'محضر المتابعة',
            };
            const task: TimelineEvent = {
                id: nextTimelineId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: '📌 مهمة: مرافقة المفرزة أو تسليم مذكرة الإحضار',
                description: 'متابعة ميدانية — حدّد الموعد من «إضافة موعد» إن لزم.',
                type: 'other',
                source: 'محضر المتابعة',
            };
            const next = [memo, task, ...prev];
            queueMicrotask(() =>
                persistExecutionMerge({
                    timelineEvents: next,
                    forced_bring_in_personal_followup_logged: true,
                })
            );
            return next;
        });
    }, [
        decisionsReloadEpoch,
        exIdForPersonalDecisions,
        executionData?.forced_bring_in_personal_followup_logged,
        nextTimelineId,
        persistExecutionMerge,
    ]);

    useEffect(() => {
        const until = executionData?.executive_detention_until;
        if (!until || !executionData?.debtor_executive_detention_active) return;
        if (executionData.executive_detention_reminder_sent) return;
        const end = new Date(`${until}T23:59:59`);
        const now = new Date();
        if (Number.isNaN(end.getTime())) return;
        const msLeft = end.getTime() - now.getTime();
        const twoDays = 2 * 24 * 60 * 60 * 1000;
        if (msLeft > 0 && msLeft <= twoDays) {
            showToast(
                '⏳ يتبقّى أقل من يومين على انتهاء الحبس التنفيذي — قرّر طلب التجديد أو المتابعة.',
                'warning'
            );
            persistExecutionMerge({ executive_detention_reminder_sent: true });
        }
    }, [
        decisionsReloadEpoch,
        executionData?.executive_detention_until,
        executionData?.debtor_executive_detention_active,
        executionData?.executive_detention_reminder_sent,
        persistExecutionMerge,
        showToast,
    ]);

    const handleLiftStayOfExecution = useCallback(() => {
        const now = new Date().toISOString();
        const te: TimelineEvent = {
            id: nextTimelineId(),
            date: now.slice(0, 10),
            timestamp: now,
            title: '✅ رفع الاستئخار',
            description: 'عادت أدوات التنفيذ للعمل وفق وضع الإيقاف العام للإضبارة.',
            type: 'decision',
            source: 'التنفيذ',
        };
        setTimelineEvents((prev) => {
            const next = [te, ...prev];
            queueMicrotask(() =>
                persistExecutionMerge({
                    stay_of_execution: {
                        active: false,
                        decision_number: '',
                        court_name: '',
                        next_hearing_date: '',
                    },
                    timelineEvents: next,
                })
            );
            return next;
        });
        showToast('تم رفع الاستئخار', 'success');
    }, [nextTimelineId, persistExecutionMerge, showToast]);

    const handleSpecialCasesStay = useCallback(
        (input: { decision_number: string; court_name: string; next_hearing_date: string }): boolean => {
            const court_name = input.court_name.trim();
            const next_hearing_date = input.next_hearing_date.trim();
            if (!court_name || !next_hearing_date) {
                showToast('أدخل اسم المحكمة وتاريخ الجلسة', 'warning');
                return false;
            }
            const decision_number = input.decision_number.trim();
            const taskId = nextTimelineId();
            const teId = nextTimelineId();
            const now = new Date().toISOString();
            const task = {
                id: taskId,
                title: 'متابعة استئخار التنفيذ',
                body: `محكمة: ${court_name}${decision_number ? ` — قرار: ${decision_number}` : ''}`,
                dueDate: next_hearing_date,
                createdAt: now,
            };
            const te: TimelineEvent = {
                id: teId,
                date: now.slice(0, 10),
                timestamp: now,
                title: '⚠️ تفعيل استئخار التنفيذ',
                description: `محكمة: ${court_name}${decision_number ? `\nرقم القرار: ${decision_number}` : ''}\nجلسة/متابعة: ${next_hearing_date}\n— تُعطَّل أدوات الإضبارة حتى رفع الاستئخار.`,
                type: 'decision',
                source: 'استئخار التنفيذ',
            };
            setCaseTasksPending((prev) => {
                const nextTasks = [...prev, task];
                setTimelineEvents((prevTl) => {
                    const nextTl = [te, ...prevTl];
                    queueMicrotask(() =>
                        persistExecutionMerge({
                            stay_of_execution: {
                                active: true,
                                decision_number,
                                court_name,
                                next_hearing_date,
                            },
                            timelineEvents: nextTl,
                            caseTasksPending: nextTasks,
                        })
                    );
                    return nextTl;
                });
                return nextTasks;
            });
            showToast('تم تفعيل الاستئخار وتسجيل المهمة.', 'success');
            return true;
        },
        [nextTimelineId, persistExecutionMerge, showToast]
    );

    const handlePartyDeathSave = useCallback(
        (payload: PartyDeathSavePayload): boolean => {
            const partyLabelAr = payload.deceased_party === 'debtor' ? 'المدين' : 'الدائن';
            const mergeHeirNames = (existing: string[], incoming: string[]) => {
                const out: string[] = [];
                [...existing, ...incoming].forEach((n) => {
                    const name = String(n || '').trim();
                    if (!name) return;
                    if (!out.some((x) => x === name)) out.push(name);
                });
                return out;
            };
            const mergeHeirDetails = (
                existing: Array<{ name?: string; phone?: string; address?: string; isClient?: boolean }>,
                incoming: Array<{ name?: string; phone?: string; address?: string; isClient?: boolean }>
            ) => {
                const map = new Map<string, { name: string; phone: string; address: string; isClient?: boolean }>();
                [...existing, ...incoming].forEach((h) => {
                    const name = String(h?.name || '').trim();
                    if (!name) return;
                    const phone = String(h?.phone || '').trim();
                    const address = String(h?.address || '').trim();
                    const ic = Boolean(h?.isClient);
                    const key = `${name.toLowerCase()}|${phone}`;
                    const prev = map.get(key);
                    if (!prev) {
                        map.set(key, { name, phone, address, ...(ic ? { isClient: true } : {}) });
                        return;
                    }
                    map.set(key, {
                        name: name || prev.name,
                        phone: phone || prev.phone,
                        address: address || prev.address,
                        isClient: Boolean(prev.isClient || ic),
                    });
                });
                return [...map.values()];
            };

            if (payload.deceased_party === 'creditor') {
                const creditorsList = [...creditors];
                const nameSnapshot = String(creditorsList[0]?.name || '').trim();
                const heirNamesResolved =
                    payload.action === 'heir_substitution' || payload.action === 'seek_heir'
                        ? payload.heir_names.filter((s) => /\S/.test(String(s)))
                        : [];
                const heirDetailsResolved =
                    payload.action === 'heir_substitution' || payload.action === 'seek_heir'
                        ? (payload.heir_details || [])
                              .map((h) => ({
                                  name: String(h?.name || '').trim(),
                                  phone: String(h?.phone || '').trim(),
                                  address: String(h?.address || '').trim(),
                                  isClient: Boolean((h as { isClient?: boolean }).isClient),
                              }))
                              .filter((h) => /\S/.test(h.name))
                        : [];
                if (payload.action === 'death_only') {
                    if (creditorsList[0]) {
                        creditorsList[0] = {
                            ...creditorsList[0],
                            type: 'creditor',
                            isDeceased: true,
                            heirs: [],
                            heirs_details: [],
                        } as Creditor;
                    }
                    const now = new Date().toISOString();
                    const te: TimelineEvent = {
                        id: nextTimelineId(),
                        date: now.slice(0, 10),
                        timestamp: now,
                        title: 'تسجيل الإبلاغ عن الوفاة',
                        description: `تم تسجيل الإبلاغ عن وفاة ${nameSnapshot || 'الدائن'} في الإضبارة.`,
                        type: 'procedure',
                        source: 'بطاقة الخصوم',
                    };
                    setTimelineEvents((prev) => {
                        const next = [te, ...prev];
                        persistExecutionMerge({
                            party_death_case: {
                                deceased_party: 'creditor',
                                heir_names: [],
                                heir_details: [],
                                flow: 'death_only',
                                heir_certificate_file_name: null,
                            },
                            creditors: creditorsList,
                            debtors,
                            dossier_heirs_list: [],
                            is_creditor_deceased: true,
                            deceased_creditor_legal_name_snapshot:
                                nameSnapshot || executionData?.deceased_creditor_legal_name_snapshot,
                            timelineEvents: next,
                        });
                        return next;
                    });
                    showToast('تم تسجيل الإبلاغ عن وفاة الدائن.', 'success');
                    return true;
                }
                if (
                    payload.action === 'heir_substitution' &&
                    (getCreditorHeirSubstitutionRequestStatus(decisionsStorageExecutionId) === 'approved' ||
                        getCreditorHeirSubstitutionRequestStatus(decisionsStorageExecutionId) === 'alternative')
                ) {
                    const existingNames = (executionData?.creditors?.[0]?.heirs || []).filter((s) =>
                        /\S/.test(String(s))
                    );
                    const existingCaseNames =
                        executionData?.party_death_case?.deceased_party === 'creditor'
                            ? (executionData?.party_death_case?.heir_names || []).filter((s) =>
                                  /\S/.test(String(s))
                              )
                            : [];
                    const mergedHeirNames = mergeHeirNames(
                        mergeHeirNames(existingNames, existingCaseNames),
                        heirNamesResolved
                    );
                    const existingDetails = Array.isArray(executionData?.creditors?.[0]?.heirs_details)
                        ? executionData.creditors[0].heirs_details
                        : [];
                    const existingCaseDetails =
                        executionData?.party_death_case?.deceased_party === 'creditor' &&
                        Array.isArray(executionData?.party_death_case?.heir_details)
                            ? (executionData?.party_death_case?.heir_details as Array<{
                                  name?: string;
                                  phone?: string;
                                  address?: string;
                              }>)
                            : [];
                    const mergedHeirDetails = mergeHeirDetails(
                        mergeHeirDetails(existingDetails, existingCaseDetails),
                        heirDetailsResolved
                    );
                    const merge = buildExecutionMergeForCreditorPartyDeath(executionData, {
                        action: 'heir_substitution',
                        creditorNameSnapshot: nameSnapshot,
                        heir_names: mergedHeirNames,
                    });
                    const now = new Date().toISOString();
                    const te: TimelineEvent = {
                        id: nextTimelineId(),
                        date: now.slice(0, 10),
                        timestamp: now,
                        title: 'تثبيت إحلال ورثة الدائن',
                        description: `تم تثبيت إحلال ورثة الدائن في الإضبارة بعد موافقة المنفذ.\nأسماء الورثة: ${heirNamesResolved.join('، ') || '—'}`,
                        type: 'procedure',
                        source: 'بطاقة الخصوم',
                    };
                    setTimelineEvents((prev) => {
                        const next = [te, ...prev];
                        const mergeRec = merge as Record<string, unknown>;
                        const mergedCreditors = Array.isArray(mergeRec.creditors)
                            ? ([...(mergeRec.creditors as Creditor[])] as Creditor[])
                            : creditorsList;
                        if (mergedCreditors[0]) {
                            mergedCreditors[0] = {
                                ...mergedCreditors[0],
                                heirs: mergedHeirNames,
                                heirs_details: mergedHeirDetails,
                            } as Creditor;
                        }
                        persistExecutionMerge({
                            ...merge,
                            creditors: mergedCreditors,
                            party_death_case: {
                                ...((mergeRec.party_death_case as Record<string, unknown> | undefined) ||
                                    {}),
                                heir_names: mergedHeirNames,
                                heir_details: mergedHeirDetails,
                            },
                            dossier_heirs_list: mergedHeirNames,
                            timelineEvents: next,
                        });
                        return next;
                    });
                    showToast('تم تثبيت إحلال ورثة الدائن بعد موافقة المنفذ.', 'success');
                    if (partyDeathModalDecisionId) {
                        patchExecutorDecisionRow(decisionsStorageExecutionId, partyDeathModalDecisionId, {
                            heirSubstitutionCompletedAt: now,
                        });
                    }
                    return true;
                }
                const req = appendCreditorPartyDeathRequest({
                    executionId: decisionsStorageExecutionId,
                    action: payload.action,
                    creditorNameSnapshot: nameSnapshot,
                    heirNames: payload.action === 'no_heirs' ? [] : heirNamesResolved,
                });
                if (!req.ok) {
                    showToast(
                        'يوجد طلب بخصوص وفاة الدائن قيد البت لدى المنفذ. أكمل بتّه من «القرارات والطعون».',
                        'warning'
                    );
                    return false;
                }
                const now = new Date().toISOString();
                const teId = nextTimelineId();
                let teTitle = 'طلب — وفاة الدائن / إحلال الورثة';
                let teDesc = `أُحيل الطلب إلى «القرارات والطعون» بانتظار موافقة منفذ العدل أو رفض الطلب أو قرار بديل.\nالدائن: ${nameSnapshot || 'الدائن'}.`;
                if (payload.action === 'no_heirs') {
                    teTitle = 'طلب — وفاة الدائن دون ورثة وإغلاق الإضبارة';
                    teDesc = `قيد البت لدى المنفذ.\n${nameSnapshot || 'الدائن'}`;
                } else if (payload.action === 'seek_heir') {
                    teTitle = 'طلب — تسجيل وريث بعد مسار دون ورثة';
                    teDesc = `قيد البت لدى المنفذ.\nأسماء مقترحة: ${heirNamesResolved.join('، ') || '—'}`;
                } else if (payload.action === 'heir_substitution') {
                    teTitle = 'طلب — إحلال الورثة محل الدائن المتوفى';
                    teDesc = `قيد البت لدى المنفذ.\nأسماء الورثة المقترحة: ${heirNamesResolved.join('، ')}`;
                }
                const te: TimelineEvent = {
                    id: teId,
                    date: now.slice(0, 10),
                    timestamp: now,
                    title: teTitle,
                    description: teDesc,
                    type: 'decision',
                    source: 'بطاقة الخصوم',
                    metadata: req.decisionId
                        ? {
                              timelineThreadKey: `executor_decision:${req.decisionId}`,
                              decisionRowId: req.decisionId,
                          }
                        : undefined,
                };
                setTimelineEvents((prev) => {
                    const next = [te, ...prev];
                    persistExecutionMerge({ timelineEvents: next });
                    return next;
                });
                showToast('تم تقديم الطلب إلى «القرارات والطعون» بانتظار موافقة المنفذ.', 'success', {
                    decisionsLink: true,
                });
                return true;
            } else {

            const creditorsList = [...creditors];
            const debtorsList = [...debtors];
            const nameSnapshot = String(debtorsList[0]?.name || '').trim();

            if (payload.action === 'heir_substitution') {
                const st = getDebtorHeirSubstitutionRequestStatus(decisionsStorageExecutionId);
                if (st !== 'approved' && st !== 'alternative') {
                    showToast('لا يمكن إدراج الورثة قبل موافقة المنفذ على طلب الإحلال.', 'warning');
                    return false;
                }
            }

            const heirNamesResolved =
                payload.action === 'heir_substitution' || payload.action === 'seek_heir'
                    ? payload.heir_names.filter((s) => /\S/.test(String(s)))
                    : [];
            const heirDetailsResolved =
                payload.action === 'heir_substitution' || payload.action === 'seek_heir'
                    ? (payload.heir_details || [])
                          .map((h) => ({
                              name: String(h?.name || '').trim(),
                              phone: String(h?.phone || '').trim(),
                              address: String(h?.address || '').trim(),
                              isClient: Boolean((h as { isClient?: boolean }).isClient),
                          }))
                          .filter((h) => /\S/.test(h.name))
                    : [];
            const existingPrimaryHeirs = debtorsList[0]?.heirs || [];
            const existingCaseHeirs =
                executionData?.party_death_case?.deceased_party === 'debtor'
                    ? (executionData?.party_death_case?.heir_names || []).filter((s) => /\S/.test(String(s)))
                    : [];
            const mergedHeirNames = mergeHeirNames(
                mergeHeirNames(existingPrimaryHeirs as string[], existingCaseHeirs),
                heirNamesResolved
            );
            const primaryParty = debtorsList[0];
            const existingPrimaryDetails = Array.isArray(primaryParty?.heirs_details)
                ? primaryParty.heirs_details
                : [];
            const existingCaseDetails =
                executionData?.party_death_case?.deceased_party === 'debtor' &&
                Array.isArray(executionData?.party_death_case?.heir_details)
                    ? (executionData?.party_death_case?.heir_details as Array<{
                          name?: string;
                          phone?: string;
                          address?: string;
                      }>)
                    : [];
            const mergedHeirDetails = mergeHeirDetails(
                mergeHeirDetails(existingPrimaryDetails, existingCaseDetails),
                heirDetailsResolved
            );

            const applyHeirsToParty = (
                heirs: string[],
                heirDetails: Array<{ name: string; phone?: string; address?: string; isClient?: boolean }>
            ) => {
                if (debtorsList[0]) {
                    debtorsList[0] = {
                        ...debtorsList[0],
                        type: 'debtor',
                        isDeceased: true,
                        heirs,
                        heirs_details: heirDetails,
                    } as Debtor;
                }
            };

            const deceasedFlags = {
                is_debtor_deceased: true,
                is_creditor_deceased: executionData?.is_creditor_deceased,
                deceased_debtor_legal_name_snapshot:
                    nameSnapshot || executionData?.deceased_debtor_legal_name_snapshot,
                deceased_creditor_legal_name_snapshot: executionData?.deceased_creditor_legal_name_snapshot,
            };

            const now = new Date().toISOString();
            const teId = nextTimelineId();
            const closedReason = 'وفاة المدين دون ورثة — إغلاق الإضبارة';

            let te: TimelineEvent;
            let flow: 'no_heirs' | 'heir_substitution' | 'death_only';
            let storedHeirNames: string[];
            let mergeExtra: Record<string, unknown> = {};

            if (payload.action === 'death_only') {
                applyHeirsToParty([], []);
                flow = 'death_only';
                storedHeirNames = [];
                te = {
                    id: teId,
                    date: now.slice(0, 10),
                    timestamp: now,
                    title: 'تسجيل الإبلاغ عن الوفاة',
                    description: `تم تسجيل الإبلاغ عن وفاة ${nameSnapshot || partyLabelAr} في الإضبارة.`,
                    type: 'procedure',
                    source: 'بطاقة الخصوم',
                };
            } else if (payload.action === 'no_heirs') {
                applyHeirsToParty([], []);
                flow = 'no_heirs';
                storedHeirNames = [];
                te = {
                    id: teId,
                    date: now.slice(0, 10),
                    timestamp: now,
                    title: 'تسجيل وفاة — إغلاق الإضبارة',
                    description: `تم تسجيل وفاة ${nameSnapshot || partyLabelAr} دون ورثة؛ أُغلقت الإضبارة آلياً وفق المسار المختار.`,
                    type: 'procedure',
                    source: 'بطاقة الخصوم',
                };
                mergeExtra = {
                    dossier_lifecycle_status: 'finished' as const,
                    dossier_status_reason: closedReason,
                    dossier_status_date: now.slice(0, 10),
                };
            } else if (payload.action === 'seek_heir') {
                applyHeirsToParty(mergedHeirNames, mergedHeirDetails);
                flow = 'heir_substitution';
                storedHeirNames = mergedHeirNames;
                const heirsLine =
                    mergedHeirNames.length > 0 ? `\nأسماء الورثة: ${mergedHeirNames.join('، ')}` : '';
                te = {
                    id: teId,
                    date: now.slice(0, 10),
                    timestamp: now,
                    title: 'العثور على وريث — إعادة فتح الإضبارة',
                    description: `بعد مسار «بلا ورثة» تم تسجيل وريث لـ${nameSnapshot || partyLabelAr} وإعادة تفعيل الإضبارة.${heirsLine}`,
                    type: 'procedure',
                    source: 'بطاقة الخصوم',
                };
                mergeExtra = {
                    dossier_lifecycle_status: 'active' as const,
                    dossier_status_reason: '',
                    dossier_status_date: '',
                };
            } else {
                applyHeirsToParty(mergedHeirNames, mergedHeirDetails);
                flow = 'heir_substitution';
                storedHeirNames = mergedHeirNames;
                const heirsLine =
                    mergedHeirNames.length > 0 ? `\nأسماء الورثة: ${mergedHeirNames.join('، ')}` : '';
                te = {
                    id: teId,
                    date: now.slice(0, 10),
                    timestamp: now,
                    title: 'تسجيل وفاة وإحلال الورثة',
                    description: `تم تسجيل وفاة ${nameSnapshot || partyLabelAr} وإحلال ورثته محله في الإضبارة.${heirsLine}`,
                    type: 'procedure',
                    source: 'بطاقة الخصوم',
                };
            }

            const mergeBase: Record<string, unknown> = {
                party_death_case: {
                    deceased_party: payload.deceased_party,
                    heir_names: storedHeirNames,
                    heir_details:
                        flow === 'heir_substitution'
                            ? mergedHeirDetails
                            : [],
                    flow,
                    heir_certificate_file_name: null,
                },
                creditors: creditorsList,
                debtors: debtorsList,
                dossier_heirs_list: storedHeirNames,
                ...deceasedFlags,
                ...mergeExtra,
            };

            setTimelineEvents((prev) => {
                const next = [te, ...prev];
                persistExecutionMerge({
                    ...mergeBase,
                    timelineEvents: next,
                });
                return next;
            });

            if (payload.action === 'death_only') {
                showToast('تم تسجيل الإبلاغ عن الوفاة.', 'success');
            } else if (payload.action === 'no_heirs') {
                showToast('تم تسجيل الوفاة وإغلاق الإضبارة (لا ورثة).', 'success');
            } else if (payload.action === 'seek_heir') {
                showToast('تم تسجيل الوريث وإعادة تفعيل الإضبارة.', 'success');
            } else {
                showToast('تم تسجيل الوفاة وإحلال الورثة.', 'success');
                if (partyDeathModalDecisionId) {
                    patchExecutorDecisionRow(decisionsStorageExecutionId, partyDeathModalDecisionId, {
                        heirSubstitutionCompletedAt: now,
                    });
                }
            }
            return true;
            }
        },
        [
            creditors,
            debtors,
            decisionsStorageExecutionId,
            executionData?.is_debtor_deceased,
            executionData?.is_creditor_deceased,
            executionData?.deceased_debtor_legal_name_snapshot,
            executionData?.deceased_creditor_legal_name_snapshot,
            nextTimelineId,
            persistExecutionMerge,
            partyDeathModalDecisionId,
            patchExecutorDecisionRow,
            showToast,
        ]
    );

    const debtorSubstitutionRequestStatus = useMemo(
        () => getDebtorHeirSubstitutionRequestStatus(decisionsStorageExecutionId),
        [decisionsStorageExecutionId, decisionsReloadEpoch]
    );
    const creditorSubstitutionRequestStatus = useMemo(
        () => getCreditorHeirSubstitutionRequestStatus(decisionsStorageExecutionId),
        [decisionsStorageExecutionId, decisionsReloadEpoch]
    );

    const handleRequestDebtorSubstitution = useCallback((): boolean => {
        if (debtorSubstitutionRequestStatus === 'pending') {
            showToast('الطلب مُرسل مسبقاً وقيد البت لدى المنفذ.', 'warning');
            return false;
        }
        const nowMs = Date.now();
        if (nowMs - lastHeirSubRequestAtRef.current.debtor < 1200) {
            showToast('تم تجاهل النقر المتكرر. انتظر لحظة ثم أعد المحاولة.', 'info');
            return false;
        }
        lastHeirSubRequestAtRef.current.debtor = nowMs;
        const debtorName = String(debtors?.[0]?.name || '').trim();
        const req = appendDebtorHeirSubstitutionRequest({
            executionId: decisionsStorageExecutionId,
            debtorNameSnapshot: debtorName,
        });
        if (!req.ok) {
            showToast('يوجد طلب إحلال مدين قيد البت لدى المنفذ.', 'warning');
            return false;
        }
        const now = new Date().toISOString();
        const te: TimelineEvent = {
            id: nextTimelineId(),
            date: now.slice(0, 10),
            timestamp: now,
            title: 'طلب — إحلال الورثة محل المدين المتوفى',
            description: `تم إرسال الطلب إلى «القرارات والطعون» بانتظار بتّ المنفذ.\nالمدين: ${debtorName || 'المدين'}.`,
            type: 'decision',
            source: 'بطاقة الخصوم',
            metadata: req.decisionId
                ? {
                      timelineThreadKey: `executor_decision:${req.decisionId}`,
                      decisionRowId: req.decisionId,
                  }
                : undefined,
        };
        setTimelineEvents((prev) => {
            const next = [te, ...prev];
            persistExecutionMerge({ timelineEvents: next });
            return next;
        });
        showToast('تم إرسال طلب إحلال المدين إلى قرارات المنفذ.', 'success', { decisionsLink: true });
        return true;
    }, [
        debtorSubstitutionRequestStatus,
        debtors,
        decisionsStorageExecutionId,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
    ]);

    const handleRequestCreditorSubstitution = useCallback((): boolean => {
        if (creditorSubstitutionRequestStatus === 'pending') {
            showToast('الطلب مُرسل مسبقاً وقيد البت لدى المنفذ.', 'warning');
            return false;
        }
        const nowMs = Date.now();
        if (nowMs - lastHeirSubRequestAtRef.current.creditor < 1200) {
            showToast('تم تجاهل النقر المتكرر. انتظر لحظة ثم أعد المحاولة.', 'info');
            return false;
        }
        lastHeirSubRequestAtRef.current.creditor = nowMs;
        const creditorName = String(creditors?.[0]?.name || '').trim();
        const req = appendCreditorPartyDeathRequest({
            executionId: decisionsStorageExecutionId,
            action: 'heir_substitution',
            creditorNameSnapshot: creditorName,
            heirNames: [],
        });
        if (!req.ok) {
            showToast('يوجد طلب إحلال ورثة للدائن قيد البت لدى المنفذ.', 'warning');
            return false;
        }
        const now = new Date().toISOString();
        const te: TimelineEvent = {
            id: nextTimelineId(),
            date: now.slice(0, 10),
            timestamp: now,
            title: 'طلب — إحلال الورثة محل الدائن المتوفى',
            description: `تم إرسال الطلب إلى «القرارات والطعون» بانتظار بتّ المنفذ.\nالدائن: ${creditorName || 'الدائن'}.`,
            type: 'decision',
            source: 'بطاقة الخصوم',
            metadata: req.decisionId
                ? {
                      timelineThreadKey: `executor_decision:${req.decisionId}`,
                      decisionRowId: req.decisionId,
                  }
                : undefined,
        };
        setTimelineEvents((prev) => {
            const next = [te, ...prev];
            persistExecutionMerge({ timelineEvents: next });
            return next;
        });
        showToast('تم إرسال طلب إحلال ورثة الدائن إلى قرارات المنفذ.', 'success', { decisionsLink: true });
        return true;
    }, [
        creditorSubstitutionRequestStatus,
        creditors,
        decisionsStorageExecutionId,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
    ]);

    const handleCreditorDeathMenuAction = useCallback(() => {
        if (!creditorDeathMarked) {
            handlePartyDeathSave({ action: 'death_only', deceased_party: 'creditor' });
            return;
        }
        const openId = findLatestHeirSubstitutionDecisionNeedingEntry(decisionsStorageExecutionId, 'creditor');
        if (openId) {
            setPartyDeathModalParty('creditor');
            setPartyDeathModalDecisionId(openId);
            return;
        }
        const st = creditorSubstitutionRequestStatus;
        if (st === 'pending') {
            showToast('الطلب مُرسل مسبقاً وقيد البت لدى المنفذ.', 'warning');
            return;
        }
        handleRequestCreditorSubstitution();
    }, [
        creditorDeathMarked,
        creditorSubstitutionRequestStatus,
        decisionsStorageExecutionId,
        findLatestHeirSubstitutionDecisionNeedingEntry,
        handlePartyDeathSave,
        handleRequestCreditorSubstitution,
        showToast,
    ]);

    const handleDebtorDeathMenuAction = useCallback(() => {
        if (!debtorDeathMarked) {
            handlePartyDeathSave({ action: 'death_only', deceased_party: 'debtor' });
            return;
        }
        const openId = findLatestHeirSubstitutionDecisionNeedingEntry(decisionsStorageExecutionId, 'debtor');
        if (openId) {
            setPartyDeathModalParty('debtor');
            setPartyDeathModalDecisionId(openId);
            return;
        }
        const st = debtorSubstitutionRequestStatus;
        if (st === 'pending') {
            showToast('الطلب مُرسل مسبقاً وقيد البت لدى المنفذ.', 'warning');
            return;
        }
        handleRequestDebtorSubstitution();
    }, [
        debtorDeathMarked,
        debtorSubstitutionRequestStatus,
        decisionsStorageExecutionId,
        findLatestHeirSubstitutionDecisionNeedingEntry,
        handlePartyDeathSave,
        handleRequestDebtorSubstitution,
        showToast,
    ]);

    useEffect(() => {
        const openHandler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; party?: 'creditor' | 'debtor'; decisionId?: string }>;
            if (String(ce.detail?.executionId ?? '') !== String(executionData?.id ?? executionId ?? '')) return;
            const p = ce.detail?.party;
            if (p !== 'creditor' && p !== 'debtor') return;
            setPartyDeathModalParty(p);
            const did = String(ce.detail?.decisionId ?? '').trim();
            setPartyDeathModalDecisionId(did || null);
        };
        window.addEventListener('hami-open-party-death-modal', openHandler as EventListener);
        return () =>
            window.removeEventListener('hami-open-party-death-modal', openHandler as EventListener);
    }, [executionData?.id, executionId]);

    useEffect(() => {
        if (!partyDeathModalParty) return;
        if (partyDeathModalDecisionId) return;
        const st =
            partyDeathModalParty === 'creditor' ? creditorSubstitutionRequestStatus : debtorSubstitutionRequestStatus;
        if (st !== 'approved' && st !== 'alternative') return;
        const id = findLatestHeirSubstitutionDecisionNeedingEntry(decisionsStorageExecutionId, partyDeathModalParty);
        if (id) setPartyDeathModalDecisionId(id);
    }, [
        creditorSubstitutionRequestStatus,
        debtorSubstitutionRequestStatus,
        decisionsStorageExecutionId,
        findLatestHeirSubstitutionDecisionNeedingEntry,
        partyDeathModalDecisionId,
        partyDeathModalParty,
    ]);

    const dismissDebtorAbsenceBadge = useCallback(() => {
        if (executionData) {
            if (
                getDebtorNoticeStateForKey(
                    executionData,
                    unifiedSummonsTargetDebtorKey,
                    primaryDebtorKeyResolved
                ).absenceBadgeDismissed
            ) {
                return;
            }
        }
        if (executionData?.id) {
            persistExecutionMerge(
                buildDebtorNoticePatchForKey(
                    executionData,
                    unifiedSummonsTargetDebtorKey,
                    primaryDebtorKeyResolved,
                    { absenceBadgeDismissed: true }
                )
            );
        } else {
            persistExecutionMerge({ debtor_absence_badge_dismissed: true });
        }
        showToast('تم إخفاء إشارة عدم الحضور', 'info');
    }, [
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        persistExecutionMerge,
        showToast,
    ]);

    const handleDeclareEvictionVoluntaryPeriodEnd = useCallback(() => {
        if (!isEvictionExecutionModule) return;
        if (!evictionGraceAnchorDate) {
            showToast('لا يوجد تاريخ إخبار/تبليغ مُسجَّل لاحتساب المدة', 'warning');
            return;
        }
        if (!isGracePeriodExpired(evictionGraceAnchorDate, new Date(), 0)) {
            showToast('يُتاح «انتهاء المهلة» بعد انقضاء سبعة أيام تقويمية من اليوم التالي للتبليغ.', 'warning');
            return;
        }
        if (executionData?.eviction_voluntary_period_end_declared || voluntaryEndOptimistic) return;
        setVoluntaryEndOptimistic(true);
        const anchor = evictionGraceAnchorDate;
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            title: '⏱️ انتهاء مهلة الإخبار/التبليغ',
            description: `مرجع التاريخ: ${anchor}.`,
            type: 'summons',
            source: 'التبليغ',
        };
        setTimelineEvents((prev) => {
            const next = [ev, ...prev];
            persistExecutionMerge({
                eviction_voluntary_period_end_declared: true,
                debtor_absence_badge_dismissed: false,
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم تسجيل انتهاء المهلة', 'success');
    }, [
        isEvictionExecutionModule,
        evictionGraceAnchorDate,
        executionData?.eviction_voluntary_period_end_declared,
        voluntaryEndOptimistic,
        persistExecutionMerge,
        nextTimelineId,
        showToast,
    ]);

    const handleDeclareNoticeVoluntaryPeriodEnd = useCallback(() => {
        if (isEvictionExecutionModule) return;
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const targetIsPrimary = targetDebtorKey === primaryDebtorKeyResolved;
        const anchor =
            activeDebtorNoticeScope.memoAnchorDate ||
            activeDebtorNoticeScope.notificationDate ||
            (targetIsPrimary ? debtorNotificationDate : null) ||
            null;
        if (!anchor) {
            showToast('لا يوجد تاريخ مذكرة إخبار مُسجَّل لاحتساب المدة', 'warning');
            return;
        }
        if (!isGracePeriodExpired(anchor, new Date(), manualGraceCalendarExtra ? 1 : 0)) {
            showToast('يُتاح «انتهاء المهلة» بعد انقضاء سبعة أيام تقويمية من اليوم التالي للتبليغ.', 'warning');
            return;
        }
        if (
            activeDebtorNoticeScope.voluntaryPeriodEndDeclared ||
            (targetIsPrimary && noticeVoluntaryPeriodEndOptimistic)
        ) {
            return;
        }
        if (targetIsPrimary) setNoticeVoluntaryPeriodEndOptimistic(true);
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            title: '⏱️ انتهاء مهلة الإخبار/التبليغ',
            description: `مرجع تاريخ المذكرة: ${anchor}.`,
            type: 'summons',
            source: 'التبليغ',
            metadata: timelineDebtorMetadata(targetDebtorKey),
        };
        setTimelineEvents((prev) => {
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...(executionData?.id
                    ? buildDebtorNoticePatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          {
                              voluntaryPeriodEndDeclared: true,
                              absenceBadgeDismissed: false,
                          }
                      )
                    : {
                          notice_voluntary_period_end_declared: true,
                          debtor_absence_badge_dismissed: false,
                      }),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم تسجيل انتهاء المهلة', 'success');
    }, [
        isEvictionExecutionModule,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        executionData,
        activeDebtorNoticeScope.memoAnchorDate,
        activeDebtorNoticeScope.notificationDate,
        activeDebtorNoticeScope.voluntaryPeriodEndDeclared,
        debtorNotificationDate,
        noticeVoluntaryPeriodEndOptimistic,
        manualGraceCalendarExtra,
        persistExecutionMerge,
        nextTimelineId,
        showToast,
    ]);

    useEffect(() => {
        if (!isEvictionExecutionModule) return;
        const id = String(executionData?.id ?? executionId ?? '');
        if (!id || id === 'undefined') return;
        if (executionData?.eviction_lawyer_fee_requested) return;
        if (!hasApprovedLawyerFeePayout(id)) return;

        const marker = `backfill_lawyer_fee_${id}`;
        if (backfillEvictionLawyerFeeRequestedRef.current === marker) return;
        backfillEvictionLawyerFeeRequestedRef.current = marker;

        persistExecutionMerge({ eviction_lawyer_fee_requested: true });
    }, [
        isEvictionExecutionModule,
        executionData?.id,
        executionId,
        executionData?.eviction_lawyer_fee_requested,
        decisionsReloadEpoch,
        persistExecutionMerge,
    ]);

    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        // تبويب "الحجز المالي" أُلغي من محضر المتابعة؛ أي حالة قديمة تُعاد للتبويب الجبري.
        if (unifiedModalTab === 'financial') {
            setUnifiedModalTab('coercive');
        }
    }, [
        showUnifiedExecutionModal,
        unifiedModalTab,
    ]);

    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        if (!showPersonalCoerciveFollowupTab && unifiedModalTab === 'personal') {
            setUnifiedModalTab('coercive');
        }
    }, [showUnifiedExecutionModal, showPersonalCoerciveFollowupTab, unifiedModalTab]);

    useEffect(() => {
        if (!showUnifiedExecutionModal) {
            setShowSolidaryCoerciveTargetModal(false);
            setSolidaryCoerciveActionPending(null);
        }
    }, [showUnifiedExecutionModal]);

    useLayoutEffect(() => {
        if (!showUnifiedExecutionModal) return;
        const cleanups: Array<() => void> = [];
        const chips = followupModalChipTablistRef.current;
        const debtors = followupModalDebtorTabsRef.current;
        if (chips) cleanups.push(bindHorizontalWheelToScroll(chips));
        if (debtors) cleanups.push(bindHorizontalWheelToScroll(debtors));
        return () => cleanups.forEach((u) => u());
    }, [showUnifiedExecutionModal, isSolidaryLiability, allDebtorsUnified.length]);

    useLayoutEffect(() => {
        if (!debtorBrowserTabsMode || debtorWorkspaceEntries.length === 0) return;
        const el = debtorWorkspaceChipStripRef.current;
        if (!el) return;
        return bindHorizontalWheelToScroll(el);
    }, [debtorBrowserTabsMode, debtorWorkspaceEntries.length]);

    const registerDebtorVoluntaryAttendance = useCallback(() => {
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const targetIsPrimary = targetDebtorKey === primaryDebtorKeyResolved;
        setDebtorSummonsMarkerLocal(null);
        const nd =
            activeDebtorNoticeScope.memoAnchorDate ||
            activeDebtorNoticeScope.notificationDate ||
            (targetIsPrimary ? debtorNotificationDate : null) ||
            getLocalTodayYmd();
        const needsAnchorBackfill =
            !activeDebtorNoticeScope.memoAnchorDate &&
            !activeDebtorNoticeScope.notificationDate &&
            (targetIsPrimary
                ? !debtorNotificationDate && !executionData?.debtorNotificationDate
                : true);
        if (needsAnchorBackfill && targetIsPrimary) {
            setDebtorNotificationDate(nd);
        }
        const nextVac = (voluntaryAttendanceCount ?? 0) + 1;
        const nextRound = (summoningRound ?? 1) + 1;
        if (targetIsPrimary) {
            setDebtorAttendedVoluntarily(true);
            setActiveNoticeState(null);
            setVoluntaryAttendanceCount(nextVac);
            setSummoningRound(nextRound);
        }
        const ndDisplay = parseLocalNotificationDate(String(nd)).toLocaleDateString('ar-EG');
        const attendEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: String(nd),
            timestamp: new Date().toISOString(),
            title: '🟢 تم حضور المدين',
            description: `مرجع تاريخ المذكرة/الإخبار: ${ndDisplay}.`,
            type: 'summons',
            source: 'التبليغ',
            metadata: {
                ...timelineDebtorMetadata(targetDebtorKey),
                timelineExpandedNote:
                    'يُحتسب الحضور في سياق مذكرة الإخبار بالتنفيذ (وليس تاريخ الضغط على الزر). بعده يُتاح تسجيل تبليغ لاحق دون مهلة 7 أيام.',
            },
        };
        setTimelineEvents((prev) => {
            const next = [attendEvent, ...prev];
            persistExecutionMerge({
                ...(executionData?.id
                    ? buildDebtorNoticePatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          {
                              ...(needsAnchorBackfill
                                  ? { memoAnchorDate: nd, notificationDate: nd }
                                  : {}),
                              activeNoticeState: null,
                              voluntaryPeriodEndDeclared: true,
                          }
                      )
                    : needsAnchorBackfill
                      ? { execution_memo_anchor_date: nd, debtorNotificationDate: nd }
                      : {}),
                ...(executionData?.id
                    ? buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          null
                      )
                    : { debtor_summons_marker: null }),
                ...(targetIsPrimary
                    ? {
                          debtorAttendedVoluntarily: true,
                          activeNoticeState: null,
                          voluntaryAttendanceCount: nextVac,
                          summoningRound: nextRound,
                      }
                    : {}),
                timelineEvents: next,
            });
            return next;
        });
        showToast('✅ تم تسجيل حضور المدين — يُتاح تبليغ لاحق وفق المسار', 'success');
    }, [
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        activeDebtorNoticeScope.memoAnchorDate,
        activeDebtorNoticeScope.notificationDate,
        debtorNotificationDate,
        executionData?.debtorNotificationDate,
        executionData,
        voluntaryAttendanceCount,
        summoningRound,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
    ]);

    const handleEmployeeAssignmentConfirm = useCallback(
        (p: { purpose: string; notifyDate: string; durationDays: number }) => {
            const d = executionData;
            if (!d?.id) return;
            const targetKey = unifiedSummonsTargetDebtorKey;
            const pk = primaryDebtorKeyResolved;
            const existing = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
            if (
                existing &&
                (existing.phase === 'active' ||
                    existing.phase === 'absent_declared' ||
                    existing.phase === 'investigation_pending' ||
                    existing.phase === 'warrant_ui')
            ) {
                showToast('يوجد تكليف مسجّل لهذا المدين — أنهِه أو أكمل المرحلة الحالية أولاً', 'warning');
                return;
            }
            const effectiveDurationDays = Math.max(1, Number(p.durationDays) || 1);
            const deadlineDate = computeTaklifDeadlineYmd(p.notifyDate, effectiveDurationDays);
            const ts = new Date().toISOString();
            const assignment = {
                phase: 'active' as const,
                assignedDebtorKey: targetKey,
                purpose: p.purpose,
                notifyDate: p.notifyDate,
                durationDays: effectiveDurationDays,
                deadlineDate,
                confirmedAt: ts,
                investigationDecisionId: null as string | null,
                investigationApproved: false,
                arrestOrderRecorded: false,
            };
            setTimelineEvents((prev) => {
                const ev: TimelineEvent = {
                    id: nextTimelineId(),
                    date: p.notifyDate,
                    timestamp: ts,
                    title: '📋 تكليف حضور — مدين موظف',
                    description: `الغاية: ${p.purpose}\nالمدة: ${effectiveDurationDays} أيام (من اليوم التالي لتاريخ التبليغ) — ينتهي ${deadlineDate}`,
                    type: 'summons',
                    source: 'التبليغ',
                    metadata: timelineDebtorMetadata(targetKey),
                };
                const next = [ev, ...prev];
                persistExecutionMerge({
                    ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, assignment, pk),
                    ...buildDebtorSummonsMarkerPatchForKey(d, targetKey, pk, null),
                    ...buildPublicationNoticePatchForDebtorKey(d, targetKey, null),
                    timelineEvents: next,
                });
                return next;
            });
            showToast('تم تسجيل التكليف بالحضور', 'success');
        },
        [
            unifiedSummonsTargetDebtorKey,
            executionData,
            executionData?.employee_summons_assignments_by_debtor,
            executionData?.employee_summons_assignment,
            executionData?.id,
            nextTimelineId,
            persistExecutionMerge,
            primaryDebtorKeyResolved,
            showToast,
        ]
    );

    const handleEmployeeAssignmentAttend = useCallback(() => {
        const d = executionData;
        if (!d) return;
        const targetKey = unifiedSummonsTargetDebtorKey;
        const pk = primaryDebtorKeyResolved;
        const a0 = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
        if (!a0) return;
        const ts = new Date().toISOString();
        setTimelineEvents((prev) => {
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '🟢 حضور المدين — تكليف بالحضور',
                description: 'سُجّل حضور المدين خلال مدة التكليف.',
                type: 'summons',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(targetKey),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, null, pk),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم تسجيل الحضور وإنهاء التكليف', 'success');
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);

    const handleEmployeeAssignmentDeclareAbsent = useCallback(() => {
        const d = executionData;
        if (!d) return;
        const targetKey = unifiedSummonsTargetDebtorKey;
        const pk = primaryDebtorKeyResolved;
        const a = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
        if (!a || a.phase !== 'active') return;
        const deadlineYmd =
            a.notifyDate != null && a.notifyDate !== ''
                ? computeTaklifDeadlineYmd(a.notifyDate, a.durationDays ?? 1)
                : a.deadlineDate || '';
        if (!deadlineYmd) return;
        if (!isAssignmentDeadlinePassed(deadlineYmd)) {
            showToast('تسجيل عدم الحضور يُتاح بعد انتهاء المدة التقويمية', 'warning');
            return;
        }
        const nextGen = (a.taklifCycleGeneration ?? 0) + 1;
        const resetAssignment = {
            ...a,
            phase: 'absent_declared' as const,
            taklifCycleGeneration: nextGen,
            investigationDecisionId: null as string | null,
            investigationApproved: false,
            arrestOrderRecorded: false,
        };
        setTimelineEvents((prev) => {
            const ts = new Date().toISOString();
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '⚠ عدم حضور المدين — إعادة دورة التكليف',
                description: `سُجّل عدم الحضور بعد انتهاء المدة التقويمية للتكليف. دورة التكليف: ${nextGen}. أُعيدت مرحلة المفاتحة والتنفيذ الجبري للبداية ضمن نفس التكليف.`,
                type: 'summons',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(targetKey),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildEmployeeAssignmentPatchForDebtorKey(
                    d,
                    targetKey,
                    { ...resetAssignment, periodEndedAt: ts },
                    pk
                ),
                timelineEvents: next,
            });
            return next;
        });
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);

    const handleEmployeeAssignmentTerminate = useCallback(() => {
        const d = executionData;
        if (!d) return;
        const targetKey = unifiedSummonsTargetDebtorKey;
        const pk = primaryDebtorKeyResolved;
        const a = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
        if (!a) return;
        setTimelineEvents((prev) => {
            const ts = new Date().toISOString();
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '⏹ إنهاء تكليف الحضور (تسجيل يدوي)',
                description: 'أُنهي تكليف الحضور دون اكتمال المسار الآلي.',
                type: 'summons',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(targetKey),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, null, pk),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم إنهاء التكليف بالحضور', 'info');
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);

    const handleEmployeeAssignmentRequestInvestigation = useCallback(() => {
        const d = executionData;
        const id = d?.id;
        if (!d || !id) return;
        const targetKey = unifiedSummonsTargetDebtorKey;
        const pk = primaryDebtorKeyResolved;
        const a = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
        if (!a) return;
        const deadlineForBody =
            a.deadlineDate ||
            (a.notifyDate != null &&
            a.notifyDate !== '' &&
            a.durationDays != null &&
            a.durationDays > 0
                ? addCalendarDaysYmd(a.notifyDate, a.durationDays)
                : '—');
        const body = `تكليف حضور (مدين موظف).\nالغاية: ${a.purpose || '—'}\nمرجع تاريخ التكليف: ${a.notifyDate || '—'}\nآخر أجل للمدة: ${deadlineForBody}`;
        const res = appendPersonalCoerciveExecutorRequest({
            executionId: id,
            subtype: 'employee_assignment_investigation',
            title: 'طلب مفاتحة محكمة التحقيق لإصدار أمر قبض — تكليف حضور (موظف)',
            body,
        });
        if (!res.ok || !res.decisionId) {
            showToast('تعذّر إدراج الطلب في القرارات', 'error');
            return;
        }
        const decisionId = res.decisionId;
        setTimelineEvents((prev) => {
            const ts = new Date().toISOString();
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '📤 طلب مفاتحة التحقيق — تكليف حضور',
                description: 'أُرسل طلب مفاتحة محكمة التحقيق لإصدار أمر قبض ضمن مسار التكليف بالحضور.',
                type: 'summons',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(targetKey),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildEmployeeAssignmentPatchForDebtorKey(
                    d,
                    targetKey,
                    {
                        ...a,
                        phase: 'investigation_pending',
                        investigationDecisionId: decisionId,
                    },
                    pk
                ),
                timelineEvents: next,
            });
            return next;
        });
        showToast('أُرسل الطلب إلى القرارات والطعون', 'success', { decisionsLink: true });
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        executionData?.id,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);

    const handleEmployeeAssignmentRequestForcedBring = useCallback(() => {
        const d = executionData;
        const id = d?.id;
        if (!d || !id) return;
        const targetKey = unifiedSummonsTargetDebtorKey;
        const pk = primaryDebtorKeyResolved;
        const a = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
        if (!a || a.phase !== 'warrant_ui' || !a.arrestOrderRecorded) return;
        const res = appendPersonalCoerciveExecutorRequest({
            executionId: id,
            subtype: 'forced_bring_in',
            title: 'طلب إحضار جبري للمدين — بعد أمر قبض (تكليف حضور)',
            body: `تكليف حضور.\nالغاية: ${a.purpose || '—'}\nطلب إحضار جبري بعد تسجيل صدور أمر القبض ضمن مسار التكليف.`,
        });
        if (!res.ok || !res.decisionId) {
            showToast('تعذّر إدراج طلب الإحضار في القرارات', 'error');
            return;
        }
        const ts = new Date().toISOString();
        setTimelineEvents((prev) => {
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '📤 طلب إحضار جبري — تكليف حضور',
                description: 'أُرسل طلب إحضار جبري إلى منفذ العدل ضمن مسار التكليف بعد أمر القبض.',
                type: 'summons',
                source: 'التبليغ',
                metadata: {
                    ...timelineDebtorMetadata(targetKey),
                    timelineThreadKey: `executor_decision:${res.decisionId}`,
                    decisionRowId: res.decisionId,
                },
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                forcedAttendanceIssued: true,
                activeNoticeState: 'forced_attendance',
                timelineEvents: next,
            });
            return next;
        });
        showToast('أُرسل طلب الإحضار إلى القرارات والطعون', 'success', { decisionsLink: true });
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        executionData?.id,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);

    const handleEmployeeRegisterArrestOrder = useCallback(() => {
        const d = executionData;
        if (!d) return;
        const targetKey = unifiedSummonsTargetDebtorKey;
        const pk = primaryDebtorKeyResolved;
        const a = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
        if (!a) return;
        setTimelineEvents((prev) => {
            const ts = new Date().toISOString();
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '📌 تسجيل صدور أمر القبض — تكليف حضور',
                description: 'سُجّل صدور أمر القبض بعد موافقة مسار المفاتحة.',
                type: 'summons',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(targetKey),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, { ...a, arrestOrderRecorded: true }, pk),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم تسجيل صدور أمر القبض', 'success');
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);

    const handleEmployeeWarrantOutcome = useCallback(
        (which: 'brought' | 'terminate') => {
            const d = executionData;
            if (!d) return;
            if (!(forcedBringDecisionState.approved && !forcedBringDecisionState.pending)) {
                showToast('لا يمكن تسجيل نتيجة أمر القبض قبل موافقة المنفذ على طلب الإحضار الجبري.', 'warning');
                return;
            }
            const targetKey = unifiedSummonsTargetDebtorKey;
            const pk = primaryDebtorKeyResolved;
            const a0 = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
            if (!a0) return;
            const ts = new Date().toISOString();
            setTimelineEvents((prev) => {
                const ev: TimelineEvent =
                    which === 'brought'
                        ? {
                              id: nextTimelineId(),
                              date: ts.slice(0, 10),
                              timestamp: ts,
                              title: '✓ تم إحضار المدين — بعد أمر القبض',
                              description: 'أُنهي تكليف الحضور بعد التنفيذ.',
                              type: 'summons',
                              source: 'التبليغ',
                              metadata: timelineDebtorMetadata(targetKey),
                          }
                        : {
                              id: nextTimelineId(),
                              date: ts.slice(0, 10),
                              timestamp: ts,
                              title: '⏹ إنهاء التكليف بالحضور',
                              description: 'أُنهي التكليف دون إحضار (تسجيل يدوي).',
                              type: 'summons',
                              source: 'التبليغ',
                              metadata: timelineDebtorMetadata(targetKey),
                          };
                const next = [ev, ...prev];
                persistExecutionMerge({
                    ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, null, pk),
                    timelineEvents: next,
                });
                return next;
            });
            showToast(which === 'brought' ? 'تم التسجيل' : 'تم إنهاء التكليف', 'success');
        },
        [
            unifiedSummonsTargetDebtorKey,
            executionData,
            executionData?.employee_summons_assignments_by_debtor,
            executionData?.employee_summons_assignment,
            nextTimelineId,
            persistExecutionMerge,
            primaryDebtorKeyResolved,
            forcedBringDecisionState.approved,
            forcedBringDecisionState.pending,
            showToast,
        ]
    );

    /** بعد موافقة المنفذ على الإحضار الجبري: نفس منطق محضر المتابعة مع إنهاء التكليف للمدين المستهدف */
    const handleEmployeeAssignmentResolveForcedBringOutcome = useCallback(
        (which: 'brought' | 'absconded') => {
            const d = executionData;
            if (!d) return;
            if (!employeeForcedBringAwaitingPersonalOutcome) {
                showToast('لا يمكن تسجيل النتيجة الآن. الحالة ليست بانتظار نتيجة الإحضار الجبري.', 'warning');
                return;
            }
            const targetKey = unifiedSummonsTargetDebtorKey;
            const pk = primaryDebtorKeyResolved;
            const a0 = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
            if (!a0) return;
            const ts = new Date().toISOString();
            const label =
                which === 'brought'
                    ? '✅ تم إحضار المدين أمام المنفذ'
                    : '⚠️ المدين متخفي / مجهول محل الإقامة';
            setTimelineEvents((prev) => {
                const ev: TimelineEvent = {
                    id: nextTimelineId(),
                    date: ts.slice(0, 10),
                    timestamp: ts,
                    title: label,
                    description: 'تسجيل نتيجة مسار الإحضار الجبري الشخصي بشأن المدين — مع إنهاء تكليف الحضور.',
                    type: 'coercive',
                    source: 'محضر المتابعة',
                    metadata: timelineDebtorMetadata(targetKey),
                };
                const next = [ev, ...prev];
                persistExecutionMerge({
                    ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, null, pk),
                    forced_bring_in_personal_outcome: which === 'brought' ? null : 'absconded',
                    timelineEvents: next,
                });
                return next;
            });
            showToast(
                which === 'brought'
                    ? 'تم التسجيل وتصفير دورة الإحضار الجبري لإتاحة طلب جديد عند الحاجة.'
                    : 'تم تسجيل النتيجة في محضر المتابعة.',
                'success'
            );
        },
        [
            executionData,
            unifiedSummonsTargetDebtorKey,
            primaryDebtorKeyResolved,
            nextTimelineId,
            persistExecutionMerge,
            employeeForcedBringAwaitingPersonalOutcome,
            showToast,
        ]
    );

    const handlePublicationNoticeRegister = useCallback(
        (p: { publicationDateYmd: string; newspaper1: string; newspaper2: string }) => {
            if (executionActionsGridLocked) {
                showToast(
                    '⚠️ الإضبارة مستأخرة — ارفع الاستئخار من الشريط التنبيهي أعلى الصفحة عند انقضاء السبب.',
                    'warning'
                );
                return;
            }
            const d = executionData;
            if (!d?.id) return;
            const dk = unifiedSummonsTargetDebtorKey;
            const existing = getPublicationNoticeForDebtorKey(d, dk);
            if (existing) {
                showToast('يوجد تبليغ بالنشر سارٍ لهذا المدين.', 'warning');
                return;
            }
            const ts = new Date().toISOString();
            const deadline = publicationNoticeDeadlineYmd(p.publicationDateYmd);
            const state = {
                publicationDateYmd: p.publicationDateYmd,
                newspaper1: p.newspaper1,
                newspaper2: p.newspaper2,
                recordedAt: ts,
            };
            setTimelineEvents((prev) => {
                const ev: TimelineEvent = {
                    id: nextTimelineId(),
                    date: p.publicationDateYmd,
                    timestamp: ts,
                    title: '📰 تسجيل التبليغ بالنشر',
                    description: `تاريخ النشر: ${p.publicationDateYmd}\nالجريدة ١: ${p.newspaper1}\nالجريدة ٢: ${p.newspaper2}\nمدة ${PUBLICATION_NOTICE_DURATION_DAYS} يوماً تقويمياً حتى ${deadline} (يبدأ الاحتساب من اليوم التالي لتاريخ النشر).`,
                    type: 'notification',
                    source: 'التبليغ',
                    metadata: timelineDebtorMetadata(dk),
                };
                const next = [ev, ...prev];
                persistExecutionMerge({
                    ...buildPublicationNoticePatchForDebtorKey(d, dk, state),
                    ...buildEmployeeAssignmentPatchForDebtorKey(d, dk, null, primaryDebtorKeyResolved),
                    ...buildDebtorSummonsMarkerPatchForKey(d, dk, primaryDebtorKeyResolved, null),
                    timelineEvents: next,
                });
                return next;
            });
            showToast('تم تسجيل التبليغ بالنشر', 'success');
        },
        [
            executionActionsGridLocked,
            unifiedSummonsTargetDebtorKey,
            executionData,
            executionData?.id,
            primaryDebtorKeyResolved,
            nextTimelineId,
            persistExecutionMerge,
            showToast,
        ]
    );

    const handlePublicationNoticeTerminate = useCallback(() => {
        if (executionActionsGridLocked) {
            showToast(
                '⚠️ الإضبارة مستأخرة — ارفع الاستئخار من الشريط التنبيهي أعلى الصفحة عند انقضاء السبب.',
                'warning'
            );
            return;
        }
        const d = executionData;
        if (!d) return;
        const dk = unifiedSummonsTargetDebtorKey;
        const cur = getPublicationNoticeForDebtorKey(d, dk);
        if (!cur) return;
        const ts = new Date().toISOString();
        setTimelineEvents((prev) => {
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '⏹ إنهاء التبليغ بالنشر',
                description: 'أُنهي مسار التبليغ بالنشر يدوياً.',
                type: 'notification',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(dk),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildPublicationNoticePatchForDebtorKey(d, dk, { ...cur, periodEndedAt: ts }),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم إنهاء التبليغ بالنشر', 'info');
    }, [
        executionActionsGridLocked,
        unifiedSummonsTargetDebtorKey,
        executionData,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
    ]);

    const handlePublicationNoticeDebtorAttended = useCallback(() => {
        if (executionActionsGridLocked) {
            showToast(
                '⚠️ الإضبارة مستأخرة — ارفع الاستئخار من الشريط التنبيهي أعلى الصفحة عند انقضاء السبب.',
                'warning'
            );
            return;
        }
        const d = executionData;
        if (!d) return;
        const dk = unifiedSummonsTargetDebtorKey;
        const cur = getPublicationNoticeForDebtorKey(d, dk);
        if (!cur) return;
        const ts = new Date().toISOString();
        setTimelineEvents((prev) => {
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '🟢 حضور المدين — تبليغ بالنشر',
                description: 'سُجّل حضور المدين أثناء مدة التبليغ بالنشر.',
                type: 'notification',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(dk),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildPublicationNoticePatchForDebtorKey(d, dk, null),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم تسجيل الحضور وإنهاء دورة التبليغ بالنشر', 'success');
    }, [
        executionActionsGridLocked,
        unifiedSummonsTargetDebtorKey,
        executionData,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
    ]);

    const handleShareTimeline = useCallback(async () => {
        const dir = String(executionData?.directorate ?? '').trim();
        const num = String(executionData?.fileNumber ?? '').trim();
        const yr = String((executionData as ExecutionFile)?.fileYear ?? '').trim();
        const headerParts = ['السجل الزمني للإضبارة التنفيذية'];
        if (dir || num) headerParts.push([dir, num && yr ? `${num} / ${yr}` : num].filter(Boolean).join(' — '));
        const header = headerParts.join('\n') + '\n' + '—'.repeat(24);
        const body = activeTimelineEvents.length
            ? activeTimelineEvents
                  .map((e, i) => {
                      const when = e.timestamp || e.date;
                      const whenStr = when
                          ? (() => {
                                const t = new Date(when);
                                return Number.isNaN(t.getTime()) ? String(when) : t.toLocaleString('ar-IQ');
                            })()
                          : '—';
                      const desc = (e.description || e.details || '').trim();
                      const src = e.source ? `\nالمصدر: ${e.source}` : '';
                      return `${i + 1}. ${e.title}\n${desc ? desc + '\n' : ''}الوقت: ${whenStr}${src}`;
                  })
                  .join('\n\n')
            : '(لا توجد أحداث في السجل المعروض حالياً)';
        const text = `${header}\n\n${body}`;
        try {
            if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
                await navigator.share({
                    title: 'السجل الزمني للإضبارة التنفيذية',
                    text,
                });
                showToast('تمت مشاركة السجل الزمني بنجاح', 'success');
                return;
            }
            await navigator.clipboard.writeText(text);
            showToast('لا تتوفر مشاركة النظام هنا — تم نسخ السجل للحافظة', 'info');
        } catch {
            showToast('تعذّرت المشاركة/النسخ — تحقق من أذونات المتصفح', 'warning');
        }
    }, [activeTimelineEvents, executionData, showToast]);

    const noteSuccessMsgRef = useRef('');
    const noteSuccessVariantRef = useRef<'success' | 'info' | 'warning'>('success');
    const { runSubmit: runSaveNoteSubmit } = useStandardSubmit({
        successMessage: 'تم الحفظ',
        validationMessage: '',
        onClose: () => {
            setNoteTitle('');
            setNoteBody('');
            setIsTask(false);
            setTaskDueDate('');
            setTaskStatus('pending');
            setEditingTaskId(null);
            setShowNotesModal(false);
        },
        showToast,
        validate: () => {
            if (!noteTitle.trim() || !noteBody.trim()) {
                showToast('يرجى تعبئة عنوان الملاحظة والتفاصيل', 'warning');
                return false;
            }
            return true;
        },
        getSuccessMessage: () => noteSuccessMsgRef.current,
        getSuccessVariant: () => noteSuccessVariantRef.current,
        submit: async () => {
            const now = new Date().toISOString();
            const sourceLabel = 'سجل الملاحظات والمهام';
            const titleTrim = noteTitle.trim();
            const bodyTrim = noteBody.trim();
            const curNotes = caseNotesLogRef.current;
            const curTasks = caseTasksPendingRef.current;
            const curTimeline = timelineEventsRef.current;
            if (!isTask) {
                noteSuccessMsgRef.current = 'تم حفظ الملاحظة بنجاح';
                noteSuccessVariantRef.current = 'success';
                const entryId = nextTimelineId();
                const nextNotes = [{ id: entryId, title: titleTrim, body: bodyTrim, createdAt: now }, ...curNotes];
                const nextTimeline = [{
                    id: nextTimelineId(),
                    type: 'other',
                    date: now,
                    timestamp: now,
                    title: `📝 إضافة ملاحظة: ${titleTrim}`,
                    description: bodyTrim,
                    source: sourceLabel,
                }, ...curTimeline];
                setCaseNotesLog(nextNotes);
                setTimelineEvents(nextTimeline);
                persistExecutionMerge({ caseNotesLog: nextNotes, timelineEvents: nextTimeline });
            } else if (taskStatus === 'pending') {
                const effectiveDueDate = taskDueDate || now.slice(0, 10);
                if (editingTaskId) {
                    noteSuccessMsgRef.current = 'تم تعديل المهمة بنجاح';
                    noteSuccessVariantRef.current = 'success';
                    const nextTasks = curTasks.map((task) =>
                        task.id === editingTaskId
                            ? {
                                  ...task,
                                  title: titleTrim,
                                  body: bodyTrim,
                                  dueDate: effectiveDueDate,
                              }
                            : task
                    );
                    const nextTimeline = [{
                        id: nextTimelineId(),
                        type: 'other',
                        date: now,
                        timestamp: now,
                        title: `✏️ تعديل مهمة: ${titleTrim}`,
                        description: bodyTrim,
                        source: sourceLabel,
                    }, ...curTimeline];
                    setCaseTasksPending(nextTasks);
                    setTimelineEvents(nextTimeline);
                    persistExecutionMerge({ caseTasksPending: nextTasks, timelineEvents: nextTimeline });
                } else {
                    noteSuccessMsgRef.current = 'تم إنشاء المهمة — ستظهر في الملاحظات بعد الإنجاز';
                    noteSuccessVariantRef.current = 'info';
                    const taskId = nextTimelineId();
                    const nextTasks = [{
                        id: taskId,
                        title: titleTrim,
                        body: bodyTrim,
                        dueDate: effectiveDueDate,
                        createdAt: now,
                    }, ...curTasks];
                    const nextTimeline = [{
                        id: nextTimelineId(),
                        type: 'other',
                        date: now,
                        timestamp: now,
                        title: `📌 مهمة قيد الإنجاز: ${titleTrim}`,
                        description: bodyTrim,
                        source: sourceLabel,
                    }, ...curTimeline];
                    setCaseTasksPending(nextTasks);
                    setTimelineEvents(nextTimeline);
                    persistExecutionMerge({ caseTasksPending: nextTasks, timelineEvents: nextTimeline });
                }
            } else {
                noteSuccessMsgRef.current = 'تم تسجيل إنجاز المهمة';
                noteSuccessVariantRef.current = 'success';
                const entryId = nextTimelineId();
                const nextNotes = [{ id: entryId, title: titleTrim, body: bodyTrim, createdAt: now }, ...curNotes];
                const nextTimeline = [{
                    id: nextTimelineId(),
                    type: 'other',
                    date: now,
                    timestamp: now,
                    title: `✅ إنجاز مهمة: ${titleTrim}`,
                    description: bodyTrim,
                    source: sourceLabel,
                }, ...curTimeline];
                setCaseNotesLog(nextNotes);
                setTimelineEvents(nextTimeline);
                persistExecutionMerge({ caseNotesLog: nextNotes, timelineEvents: nextTimeline });
            }
        },
    });
    const handleSaveNote = useCallback(async () => {
        await runSaveNoteSubmit();
        triggerCopilotAfterLocalChange();
    }, [runSaveNoteSubmit, triggerCopilotAfterLocalChange]);
    
    const completePendingTask = useCallback((taskId: string) => {
        const task = caseTasksPending.find(t => t.id === taskId);
        if (!task) return;
        const now = new Date().toISOString();
        const nextTasks = caseTasksPendingRef.current.filter((t) => t.id !== taskId);
        const nextNotes = [{
            id: nextTimelineId(),
            title: task.title,
            body: task.body,
            createdAt: now,
        }, ...caseNotesLogRef.current];
        const nextTimeline = [{
            id: nextTimelineId(),
            type: 'other',
            date: now,
            timestamp: now,
            title: `✅ إنجاز مهمة: ${task.title}`,
            description: task.body,
            source: 'سجل الملاحظات والمهام',
        }, ...timelineEventsRef.current];
        setCaseTasksPending(nextTasks);
        setCaseNotesLog(nextNotes);
        setTimelineEvents(nextTimeline);
        persistExecutionMerge({ caseTasksPending: nextTasks, caseNotesLog: nextNotes, timelineEvents: nextTimeline });
        showToast('تم تسجيل إنجاز المهمة', 'success');
        triggerCopilotAfterLocalChange();
    }, [nextTimelineId, persistExecutionMerge, showToast, triggerCopilotAfterLocalChange]);

    const beginEditPendingTask = useCallback((taskId: string) => {
        const task = caseTasksPending.find((t) => t.id === taskId);
        if (!task) return;
        setEditingTaskId(task.id);
        setNoteTitle(task.title || '');
        setNoteBody(task.body || '');
        setIsTask(true);
        setTaskStatus('pending');
        setTaskDueDate(task.dueDate || '');
        setShowNotesModal(true);
    }, [caseTasksPending]);
    
    // ✅ OPTIMIZED: useCallback
    const handleSaveAppointment = useCallback(() => {
        if (!appointmentPurpose.trim() || !appointmentDateOnly) {
            showToast('يرجى إدخال الغرض وتاريخ الموعد', 'warning');
            return;
        }
        
        const recorded = new Date().toISOString();
        const eventIso = appointmentTimeOptional
            ? `${appointmentDateOnly}T${appointmentTimeOptional}:00`
            : `${appointmentDateOnly}T12:00:00`;
        
        const eventDateLabel = new Date(appointmentDateOnly).toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const timePart = appointmentTimeOptional
            ? new Date(eventIso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
            : null;

        const title = `📅 ${appointmentPurpose.trim()}`;
        const description = timePart
            ? `موعد في ${eventDateLabel} — الساعة ${timePart}`
            : `موعد بتاريخ ${eventDateLabel} (بدون وقت محدد)`;

        if (editingAppointmentId) {
            const nextTimeline = (timelineEventsRef.current || []).map((ev: any) =>
                String(ev?.id) === String(editingAppointmentId)
                    ? {
                          ...ev,
                          type: 'appointment',
                          date: eventIso,
                          timestamp: recorded,
                          title,
                          description,
                          source: 'تعديل موعد',
                      }
                    : ev
            );
            setTimelineEvents(nextTimeline);
            persistExecutionMerge({ timelineEvents: nextTimeline });
            showToast('تم تعديل الموعد بنجاح', 'success');
        } else {
            const newEvent: TimelineEvent = {
                id: nextTimelineId(),
                type: 'appointment',
                date: eventIso,
                timestamp: recorded,
                title,
                description,
                source: 'إضافة موعد',
            };
            const nextTimeline = [newEvent, ...(timelineEventsRef.current || [])];
            setTimelineEvents(nextTimeline);
            persistExecutionMerge({ timelineEvents: nextTimeline });
            showToast('تم حفظ الموعد بنجاح', 'success');
        }
        setAppointmentPurpose('');
        setAppointmentDateOnly('');
        setAppointmentTimeOptional('');
        setEditingAppointmentId(null);
        setShowAppointmentModal(false);
        triggerCopilotAfterLocalChange();
    }, [
        appointmentPurpose,
        appointmentDateOnly,
        appointmentTimeOptional,
        editingAppointmentId,
        showToast,
        nextTimelineId,
        persistExecutionMerge,
        triggerCopilotAfterLocalChange,
    ]);
    
    // ✅ OPTIMIZED: useCallback
    const handlePayment = useCallback(() => {
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            showToast('يرجى إدخال مبلغ صحيح', 'warning');
            return;
        }

        const nextPaid = paidDebt + amount;
        const newBalance = remaining - amount;
        const ledgerEntry = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            type: 'payment' as const,
            amount: amount,
            description: `سداد دفعة نقدية`,
            balance: newBalance,
        };
        const nextLedger = [ledgerEntry, ...financialLedger];
        const ts = new Date().toISOString();
        const paySnap = buildExecutionTimelineSnapshot({
            executionData: executionDataRef.current
                ? { ...executionDataRef.current, paidDebt: nextPaid, financialLedger: nextLedger }
                : null,
            financialLedger: nextLedger,
            seizedAssets: seizedAssetsSnapshotRef.current,
        });
        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '💰 تسديد جزئي للمديونية',
                description: `تم استلام دفعة بمبلغ ${amount.toLocaleString('ar-IQ')} دينار عراقي من المدين. الرصيد المتبقي: ${newBalance.toLocaleString('ar-IQ')} د.ع`,
                type: 'payment',
                source: 'المركز المالي',
                snapshot: paySnap,
            },
            { mergePatch: { paidDebt: nextPaid, financialLedger: nextLedger } }
        );
        setPaidDebt(nextPaid);
        setFinancialLedger(nextLedger);

        showToast(`✅ تم تسجيل دفعة بمبلغ ${amount.toLocaleString('ar-IQ')} د.ع`, 'success');
        setPaymentAmount('');
        setShowPaymentModal(false);
    }, [
        paymentAmount,
        remaining,
        paidDebt,
        financialLedger,
        nextTimelineId,
        pushTimelineEvent,
        showToast,
    ]);
    
    // 🆕 V9: PAYMENT CALCULATOR HANDLER
    // ✅ OPTIMIZED: useCallback
    const handlePaymentFromCalculator = useCallback(
        (amount: number) => {
            const newPaidDebt = paidDebt + amount;
            if (executionId) {
                const current = storageCache.get(executionStorageKey(executionId));
                if (current && typeof current === 'object') {
                    storageCache.set(executionStorageKey(executionId), {
                        ...current,
                        paidDebt: newPaidDebt,
                    });
                }
            }

            const newRemaining = totalOwed - newPaidDebt;
            const ledgerEntry = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                type: 'payment' as const,
                amount: amount,
                description: `سداد دفعة نقدية`,
                balance: newRemaining,
            };
            const nextLedger = [ledgerEntry, ...financialLedger];
            const ts = new Date().toISOString();
            const calcSnap = buildExecutionTimelineSnapshot({
                executionData: executionDataRef.current
                    ? { ...executionDataRef.current, paidDebt: newPaidDebt, financialLedger: nextLedger }
                    : null,
                financialLedger: nextLedger,
                seizedAssets: seizedAssetsSnapshotRef.current,
            });
            pushTimelineEvent(
                {
                    id: nextTimelineId(),
                    date: ts.slice(0, 10),
                    timestamp: ts,
                    title: '💵 تم سداد دفعة نقدية',
                    description: `تم سداد دفعة نقدية بقيمة ${amount.toLocaleString('ar-IQ')} دينار. المتبقي: ${newRemaining.toLocaleString('ar-IQ')} دينار.`,
                    type: 'payment',
                    source: 'حاسبة السداد',
                    snapshot: calcSnap,
                },
                { mergePatch: { paidDebt: newPaidDebt, financialLedger: nextLedger } }
            );
            setPaidDebt(newPaidDebt);
            setFinancialLedger(nextLedger);

            showToast(`✅ تم تسجيل السداد: ${amount.toLocaleString('ar-IQ')} د.ع`, 'success');
        },
        [
            executionId,
            totalOwed,
            paidDebt,
            financialLedger,
            nextTimelineId,
            pushTimelineEvent,
            showToast,
        ]
    );

    const handleFundsLedgerPayment = useCallback(
        ({
            amount,
            kind,
            description,
        }: {
            amount: number;
            kind: 'full' | 'partial';
            description: string;
        }) => {
            if (!amount || amount <= 0) return;
            const newPaid = paidDebtRef.current + amount;
            paidDebtRef.current = newPaid;
            setPaidDebt(newPaid);
            if (executionId) {
                const current = storageCache.get(executionStorageKey(executionId));
                if (current && typeof current === 'object') {
                    storageCache.set(executionStorageKey(executionId), {
                        ...current,
                        paidDebt: newPaid,
                    });
                }
            }
            const newRemaining =
                totalWithExecutionFee -
                (newPaid + paidCourtFees + paidDirectorateFees + paidClientFees);
            const ledgerEntry = {
                id: nextTimelineId(),
                date: new Date().toISOString(),
                type: 'payment' as const,
                amount,
                description: `${description} (${kind === 'full' ? 'تسديد كامل' : 'جزئي'})`,
                balance: newRemaining,
            };
            const nextLedger = [ledgerEntry, ...financialLedgerRef.current];
            const ts = new Date().toISOString();
            const evId = nextTimelineId();
            const fundsSnap = buildExecutionTimelineSnapshot({
                executionData: executionDataRef.current
                    ? { ...executionDataRef.current, paidDebt: newPaid, financialLedger: nextLedger }
                    : null,
                financialLedger: nextLedger,
                seizedAssets: seizedAssetsSnapshotRef.current,
            });
            pushTimelineEvent(
                {
                    id: evId,
                    date: ts.slice(0, 10),
                    timestamp: ts,
                    title: kind === 'full' ? '✅ إغلاق الوعاء المالي الموحّد' : '💰 تسديد من الوعاء الموحّد',
                    description: `${description}. المبلغ: ${amount.toLocaleString('ar-IQ')} د.ع. المتبقي في اللوحة: ${newRemaining.toLocaleString('ar-IQ')} د.ع`,
                    type: 'payment',
                    source: 'إدارة الأموال والمصاريف',
                    snapshot: fundsSnap,
                },
                { mergePatch: { paidDebt: newPaid, financialLedger: nextLedger } }
            );
            setFinancialLedger(nextLedger);
            showToast(
                kind === 'full'
                    ? `✅ تم تسجيل التسديد الكامل للوعاء الموحّد`
                    : `✅ تم تسجيل دفعة ${amount.toLocaleString('ar-IQ')} د.ع`,
                'success'
            );
        },
        [
            executionId,
            totalWithExecutionFee,
            paidCourtFees,
            paidDirectorateFees,
            paidClientFees,
            showToast,
            nextTimelineId,
            pushTimelineEvent,
        ]
    );
    
    // 🆕 V9: SETTLEMENT CALCULATOR HANDLER — لقطة زمنية + دمج ملف كمسار الدفع
    // ✅ OPTIMIZED: useCallback
    const handleSettlementFromCalculator = useCallback(
        (downPayment: number, monthlyInstallment: number) => {
            const newPaidDebt = paidDebt + downPayment;
            if (executionId) {
                const current = storageCache.get(executionStorageKey(executionId));
                if (current && typeof current === 'object') {
                    storageCache.set(executionStorageKey(executionId), {
                        ...current,
                        paidDebt: newPaidDebt,
                    });
                }
            }

            const newRemaining = totalOwed - newPaidDebt;
            const months =
                monthlyInstallment > 0 && newRemaining > 0
                    ? Math.ceil(newRemaining / monthlyInstallment)
                    : 0;

            const ledgerEntry = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                type: 'settlement' as const,
                amount: downPayment,
                description: `تسوية قانونية — دفعة مقدمة. القسط الشهري: ${monthlyInstallment.toLocaleString('ar-IQ')} د.ع؛ الأقساط المتوقعة: ${months} شهر`,
                balance: newRemaining,
            };
            const nextLedger = [ledgerEntry, ...financialLedger];
            const ts = new Date().toISOString();
            const settlementSnap = buildExecutionTimelineSnapshot({
                executionData: executionDataRef.current
                    ? { ...executionDataRef.current, paidDebt: newPaidDebt, financialLedger: nextLedger }
                    : null,
                financialLedger: nextLedger,
                seizedAssets: seizedAssetsSnapshotRef.current,
            });
            pushTimelineEvent(
                {
                    id: nextTimelineId(),
                    date: ts.slice(0, 10),
                    timestamp: ts,
                    title: '📅 تم إبرام تسوية قانونية',
                    description: `تم إبرام تسوية قانونية. الدفعة المقدمة: ${downPayment.toLocaleString('ar-IQ')} دينار، القسط الشهري: ${monthlyInstallment.toLocaleString('ar-IQ')} دينار، عدد الأقساط المتوقعة: ${months} شهر. المتبقي: ${newRemaining.toLocaleString('ar-IQ')} د.ع`,
                    type: 'settlement',
                    source: 'حاسبة التسوية',
                    snapshot: settlementSnap,
                },
                { mergePatch: { paidDebt: newPaidDebt, financialLedger: nextLedger } }
            );
            setPaidDebt(newPaidDebt);
            setFinancialLedger(nextLedger);

            showToast(`✅ تم إبرام التسوية بنجاح`, 'success');
        },
        [
            executionId,
            totalOwed,
            paidDebt,
            financialLedger,
            nextTimelineId,
            pushTimelineEvent,
            showToast,
        ]
    );
    
    const handleNotifyDebtor = (
        explicitNotificationDate?: string | null,
        evictionSubsequentMeta?: EvictionSubsequentSummonsMeta,
        initialNoticeLawyerFeesIncluded?: boolean,
        summonsPurposeFromModal?: string,
        notifyOpts?: { forceExecutionMemo?: boolean }
    ) => {
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const targetIsPrimary = targetDebtorKey === primaryDebtorKeyResolved;
        const fallbackDay = getLocalTodayYmd();
        const picked =
            typeof explicitNotificationDate === 'string' && explicitNotificationDate.trim() !== ''
                ? explicitNotificationDate.trim()
                : null;
        const dateToUse =
            picked ??
            activeDebtorNoticeScope.notificationDate ??
            (targetIsPrimary ? debtorNotificationDate : null) ??
            fallbackDay;

        const purposeText = String(summonsPurposeFromModal ?? notificationPurpose ?? '').trim();

        const wasInitialNotice = notificationCount === 0;
        const forceMemo = Boolean(notifyOpts?.forceExecutionMemo && notificationCount === 1);

        if (!wasInitialNotice && !subsequentNoticeUnlocked && !forceMemo) {
            showToast(
                'سجّل حضور المدين، أو «انتهاء المهلة» بعد السبعة أيام، أو نفّذ إجراء التنفيذ المناسب قبل تسجيل تبليغ لاحق.',
                'warning'
            );
            return;
        }

        if (targetIsPrimary) setDebtorNotificationDate(dateToUse);
        setLastActionDate(dateToUse);

        const isMemoRegistration = wasInitialNotice || forceMemo;
        const nextCount = isMemoRegistration ? 1 : notificationCount + 1;

        let eventTitle = '';
        let eventDescription = '';

        if (isMemoRegistration) {
            eventTitle = forceMemo ? '📋 إعادة تبليغ بمذكرة الإخبار بالتنفيذ' : '📋 مذكرة الإخبار بالتنفيذ';
            eventDescription = forceMemo
                ? `إعادة مذكرة الإخبار بالتنفيذ. تاريخ التبليغ الفعلي: ${dateToUse}.`
                : `مذكرة الإخبار بالتنفيذ. تاريخ التبليغ الفعلي: ${dateToUse}.`;
            if (typeof initialNoticeLawyerFeesIncluded === 'boolean') {
                eventDescription += initialNoticeLawyerFeesIncluded
                    ? '\nأتعاب المحاماة مشمولة في المذكرة (تخلية — كاسب).'
                    : '\nأتعاب المحاماة: مسار اعتيادي دون شمول في المذكرة.';
            }
            setActiveNoticeState('initial_notice');
            if (targetIsPrimary) setNoticeVoluntaryPeriodEndOptimistic(false);
            setVoluntaryEndOptimistic(false);
        } else {
            const raqm = nextCount - 1;
            const raqmLabel = AR_TABLIGH_RAQM[raqm] ?? String(raqm);
            eventTitle = `🔔 تبليغ رقم ${raqmLabel}${purposeText ? ` — ${purposeText}` : ''}`;
            eventDescription = `الغاية: ${purposeText || '—'}. تاريخ التبليغ: ${dateToUse}`;
        }

        const recorded = new Date().toISOString();
        const eventId = nextTimelineId();
        const newEvent: TimelineEvent = {
            id: eventId,
            date: dateToUse,
            timestamp: recorded,
            title: eventTitle,
            description: eventDescription,
            type: 'notification',
            source: 'التبليغ',
            metadata: timelineDebtorMetadata(targetDebtorKey),
        };

        const markerPurpose = purposeText || 'تبليغ';
        const markerTrimmed =
            markerPurpose.length > 280 ? `${markerPurpose.slice(0, 280)}…` : markerPurpose;
        const markerPayload = isMemoRegistration
            ? null
            : {
                  id: eventId,
                  date: dateToUse,
                  purpose: markerTrimmed,
                  recordedAt: new Date().toISOString(),
              };
        const scopedDebtorPatch =
            executionData?.id
                ? {
                      ...buildDebtorNoticePatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          {
                              notificationDate: dateToUse,
                              ...(isMemoRegistration
                                  ? {
                                        memoAnchorDate: dateToUse,
                                        voluntaryPeriodEndDeclared: false,
                                        absenceBadgeDismissed: false,
                                        activeNoticeState: 'initial_notice',
                                    }
                                  : {}),
                          }
                      ),
                      ...buildDebtorNotificationCountPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          nextCount
                      ),
                      ...buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          markerPayload
                      ),
                  }
                : { debtorNotificationDate: dateToUse };

        const persistPatch: Record<string, unknown> = {
            lastActionDate: dateToUse,
            ...(targetIsPrimary ? { notificationCount: nextCount } : {}),
            ...(targetIsPrimary ? { debtor_summons_marker: markerPayload } : {}),
            ...scopedDebtorPatch,
        };

        if (!isMemoRegistration && executionData?.id) {
            Object.assign(persistPatch, {
                ...buildEmployeeAssignmentPatchForDebtorKey(
                    executionData,
                    targetDebtorKey,
                    null,
                    primaryDebtorKeyResolved
                ),
                ...buildPublicationNoticePatchForDebtorKey(executionData, targetDebtorKey, null),
            });
        }

        if (isMemoRegistration) {
            setNotificationCount(1);
            if (isEvictionExecutionModule) {
                Object.assign(persistPatch, {
                    eviction_first_notice_date: dateToUse,
                    eviction_voluntary_period_end_declared: false,
                    debtor_absence_badge_dismissed: false,
                });
                if (typeof initialNoticeLawyerFeesIncluded === 'boolean') {
                    persistPatch.eviction_initial_notice_lawyer_fees_included = initialNoticeLawyerFeesIncluded;
                }
            } else if (targetIsPrimary) {
                Object.assign(persistPatch, {
                    execution_memo_anchor_date: dateToUse,
                    notice_voluntary_period_end_declared: false,
                    debtor_absence_badge_dismissed: false,
                });
            }
        } else {
            setNotificationCount((p) => p + 1);
            if (isEvictionExecutionModule) {
                const forCol = Boolean(evictionSubsequentMeta?.forCollection);
                const branch = forCol ? evictionSubsequentMeta?.branch ?? null : null;
                Object.assign(persistPatch, {
                    eviction_voluntary_period_end_declared: false,
                    eviction_last_summons_for_collection: forCol,
                    eviction_last_collection_summons_branch: branch,
                });
            }
        }

        setTimelineEvents((prev) => {
            const next = [newEvent, ...prev];
            persistExecutionMerge({
                ...persistPatch,
                timelineEvents: next,
            });
            return next;
        });

        if (!isMemoRegistration) {
            setDebtorSummonsMarkerLocal(markerPayload);
        } else {
            setDebtorSummonsMarkerLocal(null);
        }

        setNotificationPurpose('');
        setSummonsMarkerPopoverOpen(false);

        showToast(
            forceMemo
                ? 'تم تسجيل إعادة التبليغ بمذكرة الإخبار بالتنفيذ'
                : wasInitialNotice
                  ? 'تم تسجيل مذكرة الإخبار بالتنفيذ'
                  : 'تم تسجيل التبليغ',
            'success'
        );
    };
    const activeDebtorHeirsForNotification = useMemo(() => {
        const activeDebtorHeirsFromTabs =
            debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup
                ? ((activeWorkspaceDebtorForFollowup.d as { heirs?: string[] } | undefined)?.heirs || [])
                : [];
        const fromPrimary = (executionData?.debtors?.[0]?.heirs || []).filter((s) => /\S/.test(String(s)));
        const fromDeathCase =
            executionData?.party_death_case?.deceased_party === 'debtor'
                ? (executionData?.party_death_case?.heir_names || []).filter((s) => /\S/.test(String(s)))
                : [];
        const fromDossier = (executionData?.dossier_heirs_list || []).filter((s) => /\S/.test(String(s)));
        const base =
            activeDebtorHeirsFromTabs.length > 0
                ? activeDebtorHeirsFromTabs
                : fromPrimary.length > 0
                  ? fromPrimary
                  : fromDeathCase.length > 0
                    ? fromDeathCase
                    : fromDossier;
        const seen = new Set<string>();
        return base
            .map((s) => String(s).trim())
            .filter(Boolean)
            .filter((name) => {
                if (seen.has(name)) return false;
                seen.add(name);
                return true;
            });
    }, [
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        executionData?.debtors,
        executionData?.party_death_case,
        executionData?.dossier_heirs_list,
    ]);
    const normalizeHeirWorkflowKey = useCallback((name: string) => {
        const raw = String(name || '').trim();
        return raw
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[^\p{L}\p{N}\s]/gu, '');
    }, []);
    const heirsWorkflowByHeir = useMemo(() => {
        const raw = executionData?.heirs_notification_workflow?.byHeir || {};
        type HeirWfPrev = {
            memoDate?: string | null;
            memoStatus?: string;
            summonDate?: string | null;
            summonStatus?: string;
            lastActionAt?: string | null;
        };
        const next: Record<string, any> = {};
        activeDebtorHeirsForNotification.forEach((heirName) => {
            const key = normalizeHeirWorkflowKey(heirName);
            if (!key) return;
            const prev = (raw[key] || {}) as HeirWfPrev;
            const normalizedSummonStatus =
                String(prev.summonStatus || 'none') === 'expired' ? 'none' : (prev.summonStatus ?? 'none');
            next[key] = {
                heirName,
                memoDate: prev.memoDate ?? null,
                memoStatus: prev.memoStatus ?? 'none',
                summonDate: prev.summonDate ?? null,
                summonStatus: normalizedSummonStatus,
                // مسار الورثة الحالي لا يستخدم مفاتحة التحقيق/مذكرة القبض داخل هذا المركز
                investigationRequestStatus: 'none',
                investigationDecisionStatus: 'none',
                investigationDecisionId: null,
                arrestWarrantStatus: 'none',
                lastActionAt: prev.lastActionAt ?? null,
            };
        });
        return next;
    }, [executionData?.heirs_notification_workflow?.byHeir, activeDebtorHeirsForNotification, normalizeHeirWorkflowKey]);
    const upsertHeirWorkflow = useCallback(
        (
            heirName: string,
            updater: (prev: Record<string, any>) => Record<string, any>,
            timelineEvent?: TimelineEvent
        ) => {
            const key = normalizeHeirWorkflowKey(heirName);
            if (!key) return;
            const prevAll = executionData?.heirs_notification_workflow?.byHeir || {};
            const prevOne = prevAll[key] || {
                heirName,
                memoStatus: 'none',
                summonStatus: 'none',
                investigationRequestStatus: 'none',
                investigationDecisionStatus: 'none',
                investigationDecisionId: null,
                arrestWarrantStatus: 'none',
            };
            const updatedOne = updater(prevOne);
            const updatedAll = {
                ...prevAll,
                [key]: {
                    ...updatedOne,
                    heirName,
                    lastActionAt: new Date().toISOString(),
                },
            };
            if (timelineEvent) {
                setTimelineEvents((prevTl) => {
                    const nextTl = [timelineEvent, ...prevTl];
                    persistExecutionMerge({
                        heirs_notification_workflow: {
                            hasReceivedInitialNotice: true,
                            byHeir: updatedAll,
                        },
                        timelineEvents: nextTl,
                    });
                    return nextTl;
                });
                return;
            }
            persistExecutionMerge({
                heirs_notification_workflow: {
                    hasReceivedInitialNotice: true,
                    byHeir: updatedAll,
                },
            });
        },
        [executionData?.heirs_notification_workflow?.byHeir, normalizeHeirWorkflowKey, persistExecutionMerge]
    );
    const computeDeadlineYmd = useCallback((fromYmd: string, daysWindow: number) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fromYmd)) return '';
        const d = parseLocalNotificationDate(fromYmd);
        if (Number.isNaN(d.getTime())) return '';
        d.setDate(d.getDate() + daysWindow);
        return formatDateToLocalYmd(d);
    }, []);
    const computeDaysRemaining = useCallback((fromYmd: string, daysWindow: number) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fromYmd)) return null;
        const notif = parseLocalNotificationDate(fromYmd);
        if (Number.isNaN(notif.getTime())) return null;
        const startFromNextDay = new Date(notif);
        startFromNextDay.setDate(startFromNextDay.getDate() + 1);
        startFromNextDay.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = Math.floor((today.getTime() - startFromNextDay.getTime()) / 86400000);
        const elapsed = diff >= 0 ? diff + 1 : 0;
        return Math.max(daysWindow - elapsed, 0);
    }, []);
    const openHeirsNotificationCenter = useCallback(() => {
        if (!activeDebtorIsDeceased || activeDebtorHeirsForNotification.length === 0) return;
        const seeded: Record<string, string> = {};
        activeDebtorHeirsForNotification.forEach((h) => {
            const key = normalizeHeirWorkflowKey(h);
            if (!key) return;
            seeded[key] = '';
        });
        setHeirNoticeDateDrafts(seeded);
        setHeirSummonsDatePickerOpenByHeir({});
        setShowHeirsNotificationModal(true);
    }, [activeDebtorIsDeceased, activeDebtorHeirsForNotification, normalizeHeirWorkflowKey]);
    useEffect(() => {
        if (!showDecisionsModal) return;
        if (showHeirsNotificationModal) setShowHeirsNotificationModal(false);
    }, [showDecisionsModal, showHeirsNotificationModal]);
    const issueHeirMemoNotice = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            const ymd = heirNoticeDateDrafts[key] || '';
            if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
                showToast('حدد تاريخ التبليغ لهذا الوريث أولاً.', 'warning');
                return;
            }
            upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    memoDate: ymd,
                    memoStatus: 'active',
                    summonDate: null,
                    summonStatus: 'none',
                    investigationRequestStatus: 'none',
                }),
                {
                    id: nextTimelineId(),
                    date: ymd,
                    timestamp: new Date().toISOString(),
                    title: `📋 مذكرة إخبار بالتنفيذ — ${heirName}`,
                    description: `تم إصدار مذكرة الإخبار بالتنفيذ للوريث ${heirName}. تاريخ التبليغ الفعلي: ${ymd}.`,
                    type: 'notification',
                    source: 'مركز تبليغ الورثة',
                }
            );
            showToast(`تم إصدار مذكرة الإخبار للوريث ${heirName}`, 'success');
        },
        [heirNoticeDateDrafts, normalizeHeirWorkflowKey, nextTimelineId, showToast, upsertHeirWorkflow]
    );
    const markHeirMemoAttended = useCallback(
        (heirName: string) => {
            upsertHeirWorkflow(
                heirName,
                (prev) => ({ ...prev, memoStatus: 'attended' }),
                {
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `✅ تم حضور الوريث — ${heirName}`,
                    description: `سُجّل حضور الوريث ${heirName} ضمن مرحلة مذكرة الإخبار.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                }
            );
        },
        [nextTimelineId, upsertHeirWorkflow]
    );
    const closeHeirMemoManually = useCallback(
        (heirName: string) => {
            upsertHeirWorkflow(
                heirName,
                (prev) => ({ ...prev, memoStatus: 'closed_manual' }),
                {
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `⏳ إنهاء مدة مذكرة الإخبار يدوياً — ${heirName}`,
                    description: `انتهت مدة السبعة أيام وتم إنهاء تبليغ مذكرة الإخبار للوريث ${heirName} يدوياً.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                }
            );
        },
        [nextTimelineId, upsertHeirWorkflow]
    );
    const issueHeirSummons = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            const ymd = heirNoticeDateDrafts[key] || '';
            if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
                showToast('حدد تاريخ التكليف لهذا الوريث أولاً.', 'warning');
                return;
            }
            upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    summonDate: ymd,
                    summonStatus: 'active',
                    investigationRequestStatus: 'none',
                    investigationDecisionStatus: 'none',
                    investigationDecisionId: null,
                    arrestWarrantStatus: 'none',
                }),
                {
                    id: nextTimelineId(),
                    date: ymd,
                    timestamp: new Date().toISOString(),
                    title: `📨 تكليف بالحضور — ${heirName}`,
                    description: `تم تسجيل تكليف بالحضور للوريث ${heirName}. تاريخ التبليغ الفعلي: ${ymd}.`,
                    type: 'notification',
                    source: 'مركز تبليغ الورثة',
                }
            );
            setHeirSummonsDatePickerOpenByHeir((prev) => ({ ...prev, [key]: false }));
        },
        [
            heirNoticeDateDrafts,
            normalizeHeirWorkflowKey,
            nextTimelineId,
            showToast,
            upsertHeirWorkflow,
            setHeirSummonsDatePickerOpenByHeir,
        ]
    );
    const requestHeirInvestigationCourt = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            const row = heirsWorkflowByHeir[key];
            const refDate = row?.summonDate || getLocalTodayYmd();
            const decisionId = appendSpecialFollowupRequest({
                executionId: decisionsStorageExecutionId,
                requestDate: refDate,
                content: `مفاتحة محكمة التحقيق بحق الوريث ${heirName} بعد انتهاء مدة التكليف بالحضور.`,
            });
            if (!decisionId) {
                showToast('تعذر تحويل طلب مفاتحة التحقيق إلى مركز القرارات.', 'warning');
                return;
            }
            upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    summonStatus: 'expired',
                    investigationRequestStatus: 'requested',
                    investigationDecisionStatus: 'pending',
                    investigationDecisionId: decisionId,
                }),
                {
                    id: nextTimelineId(),
                    date: refDate,
                    timestamp: new Date().toISOString(),
                    title: `⚖️ مفاتحة محكمة التحقيق — ${heirName}`,
                    description: `تم تحويل طلب مفاتحة محكمة التحقيق بحق الوريث ${heirName} إلى مركز القرارات.`,
                    type: 'coercive',
                    source: 'مركز تبليغ الورثة',
                    metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
                }
            );
            showToast('تم تحويل الطلب إلى قسم القرارات.', 'success', { decisionsLink: true });
        },
        [
            heirsWorkflowByHeir,
            decisionsStorageExecutionId,
            normalizeHeirWorkflowKey,
            nextTimelineId,
            showToast,
            upsertHeirWorkflow,
        ]
    );
    const markHeirAttendedAfterInvestigation = useCallback(
        (heirName: string) => {
            upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    memoDate: null,
                    summonDate: null,
                    summonStatus: 'none',
                    investigationRequestStatus: 'none',
                    investigationDecisionStatus: 'none',
                    investigationDecisionId: null,
                    arrestWarrantStatus: 'none',
                    memoStatus: 'closed_manual',
                }),
                {
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `✅ حضور الوريث بعد مفاتحة التحقيق — ${heirName}`,
                    description: `سُجل حضور الوريث ${heirName} وتمت إعادة فتح دورة التكليف بالحضور له بشكل مستقل.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                }
            );
        },
        [nextTimelineId, upsertHeirWorkflow]
    );
    useEffect(() => {
        if (!executionData?.id) return;
        const byHeir = executionData?.heirs_notification_workflow?.byHeir || {};
        const rows = readExecutorDecisionsArray(decisionsStorageExecutionId);
        let changed = false;
        const nextByHeir: Record<string, any> = { ...byHeir };
        Object.entries(byHeir).forEach(([k, v]) => {
            const row = (v || {}) as Record<string, any>;
            const decisionId = String(row.investigationDecisionId || '').trim();
            if (!decisionId) return;
            const decision = rows.find((r) => String((r as { id?: unknown }).id ?? '') === decisionId);
            const outcome = String((decision as { executorOutcome?: unknown } | undefined)?.executorOutcome ?? 'pending');
            const mapped =
                outcome === 'approved'
                    ? 'approved'
                    : outcome === 'rejected' || outcome === 'alternative'
                      ? 'rejected'
                      : 'pending';
            if (String(row.investigationDecisionStatus || 'none') !== mapped) {
                nextByHeir[k] = { ...row, investigationDecisionStatus: mapped };
                changed = true;
            }
        });
        if (!changed) return;
        persistExecutionMerge({
            heirs_notification_workflow: {
                hasReceivedInitialNotice: true,
                byHeir: nextByHeir,
            },
        });
    }, [
        executionData?.id,
        executionData?.heirs_notification_workflow?.byHeir,
        decisionsStorageExecutionId,
        decisionsReloadEpoch,
        persistExecutionMerge,
    ]);
    const issueHeirArrestWarrant = useCallback(
        (heirName: string) => {
            upsertHeirWorkflow(
                heirName,
                (prev) => ({ ...prev, arrestWarrantStatus: 'issued' }),
                {
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `🚨 صدور مذكرة قبض — ${heirName}`,
                    description: `تم تسجيل صدور مذكرة قبض بحق الوريث ${heirName}.`,
                    type: 'coercive',
                    source: 'مركز تبليغ الورثة',
                }
            );
        },
        [nextTimelineId, upsertHeirWorkflow]
    );
    const markHeirSummonsAttended = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    summonDate: null,
                    summonStatus: 'none',
                    investigationRequestStatus: 'none',
                    investigationDecisionStatus: 'none',
                    investigationDecisionId: null,
                    arrestWarrantStatus: 'none',
                }),
                {
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `✅ حضور الوريث بعد التكليف — ${heirName}`,
                    description: `تم تسجيل حضور الوريث ${heirName} ضمن مرحلة التكليف بالحضور.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                }
            );
            setHeirSummonsDatePickerOpenByHeir((prev) => ({ ...prev, [key]: false }));
        },
        [nextTimelineId, normalizeHeirWorkflowKey, upsertHeirWorkflow]
    );
    const markHeirSummonsPeriodEnded = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    summonDate: null,
                    summonStatus: 'none',
                    investigationRequestStatus: 'none',
                    investigationDecisionStatus: 'none',
                    investigationDecisionId: null,
                    arrestWarrantStatus: 'none',
                }),
                {
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `⏱️ إنهاء مدة التكليف — ${heirName}`,
                    description: `تم إنهاء مدة التكليف بالحضور للوريث ${heirName} وإغلاق هذا التكليف.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                }
            );
            setHeirSummonsDatePickerOpenByHeir((prev) => ({ ...prev, [key]: false }));
        },
        [nextTimelineId, normalizeHeirWorkflowKey, upsertHeirWorkflow]
    );

    const clearDebtorSummonsMarker = useCallback(() => {
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const ts = new Date().toISOString();
        const cur = debtorSummonsMarkerLocal;
        if (!cur?.id) return;
        const nextMarker = {
            ...cur,
            badgeHiddenAt: ts,
        };
        setDebtorSummonsMarkerLocal(nextMarker);
        setTimelineEvents((prev) => {
            persistExecutionMerge({
                ...(executionData?.id
                    ? buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          nextMarker
                      )
                    : { debtor_summons_marker: nextMarker }),
                timelineEvents: prev,
            });
            return prev;
        });
        setSummonsMarkerPopoverOpen(false);
        showToast('أُخفيت الإشارة من البطاقة', 'info');
    }, [
        debtorSummonsMarkerLocal,
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        persistExecutionMerge,
        showToast,
    ]);

    const terminateDebtorSummonsMarker = useCallback(() => {
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const marker = debtorSummonsMarkerLocal;
        if (!marker?.id) return;
        const ts = new Date().toISOString();
        const nextMarker = {
            ...marker,
            periodEndedAt: ts,
        };
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: ts.slice(0, 10),
            timestamp: ts,
            title: '⏹ إنهاء التبليغ',
            description: `تم إنهاء التبليغ المسجّل بتاريخ ${marker.date}. الغاية: ${marker.purpose || '—'}.`,
            type: 'notification',
            source: 'التبليغ',
            metadata: timelineDebtorMetadata(targetDebtorKey),
        };
        setDebtorSummonsMarkerLocal(nextMarker);
        setTimelineEvents((prev) => {
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...(executionData?.id
                    ? buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          nextMarker
                      )
                    : { debtor_summons_marker: nextMarker }),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم إنهاء التبليغ', 'info');
    }, [
        debtorSummonsMarkerLocal,
        executionData,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
        unifiedSummonsTargetDebtorKey,
    ]);

    const saveSummonsMarkerPurposeEdit = useCallback(() => {
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const m = debtorSummonsMarkerLocal;
        if (!m?.id) return;
        const p = summonsPurposeDraft.trim();
        const truncated = p.length > 280 ? `${p.slice(0, 280)}…` : p;
        const marker = {
            id: m.id,
            date: m.date,
            purpose: truncated || 'تبليغ',
        };
        setTimelineEvents((prev) => {
            const next = prev.map((e) => {
                if (String(e.id) !== String(m.id)) return e;
                const title = `🔔 تطلب حضوره${p ? ` — ${p}` : ''}`;
                return {
                    ...e,
                    description: `الغاية: ${p || '—'}. تاريخ التبليغ المُسجَّل: ${m.date}`,
                    title,
                };
            });
            persistExecutionMerge({
                ...(executionData?.id
                    ? buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          marker
                      )
                    : { debtor_summons_marker: marker }),
                timelineEvents: next,
            });
            return next;
        });
        setDebtorSummonsMarkerLocal(marker);
        setSummonsMarkerPopoverOpen(false);
        showToast('تم حفظ الغاية', 'success');
    }, [
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        debtorSummonsMarkerLocal,
        summonsPurposeDraft,
        persistExecutionMerge,
        showToast,
    ]);

    // 🆕 V8: FORCED ATTENDANCE HANDLER (إحضار جبري)
    const handleForcedAttendance = () => {
        if (!forcedSummoningAnalysis.canForceSummon) {
            showToast(forcedSummoningAnalysis.lockReasonAr || 'غير مسموح بالإحضار الجبري وفقاً للوضع القانوني الحالي.', 'warning');
            return;
        }
        setForcedAttendanceIssued(true);
        setActiveNoticeState('forced_attendance');
        const now = new Date().toISOString();
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '👮 مذكرة إحضار جبري للمدين',
            description: `تم إصدار مذكرة إحضار جبري للمدين ${activeDebtorNameResolved}`,
            type: 'coercive',
            source: 'التنفيذ والمحجوزات',
            metadata: timelineDebtorMetadata(activeFollowupDebtorKey),
        };
        setTimelineEvents((prev) => {
            const next = [newEvent, ...prev];
            persistExecutionMerge({
                forcedAttendanceIssued: true,
                activeNoticeState: 'forced_attendance',
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم إصدار مذكرة الإحضار الجبري', 'success');
    };

    /** مسار الكاسب بعد مذكرة الإحضار: تأمين إحضار مباشر */
    const handleEarnerSecureForcedAttendance = () => {
        const now = new Date().toISOString();
        setForcedPathAttendanceSecured(true);
        setDebtorForcedToAttend(true);
        setActiveNoticeState(null);
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '✅ تأمين إحضار المدين',
            description: `تم تأمين إحضار المدين ${activeDebtorNameResolved} تنفيذاً لمذكرة الإحضار الجبري.`,
            type: 'coercive',
            source: 'التبليغ والإحضار',
            metadata: timelineDebtorMetadata(activeFollowupDebtorKey),
        };
        setTimelineEvents((prev) => [newEvent, ...prev]);
        showToast('تم تسجيل تأمين الإحضار', 'success');
    };

    const handleRequestInvestigationFromForced = () => {
        const now = new Date().toISOString();
        setInvestigationCourtRequested(true);
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '⚖️ طلب مفاتحة محكمة التحقيق',
            description: `طلب مفاتحة محكمة التحقيق لمتابعة إحضار المدين ${activeDebtorNameResolved}.`,
            type: 'coercive',
            source: 'التبليغ والإحضار',
            metadata: timelineDebtorMetadata(activeFollowupDebtorKey),
        };
        setTimelineEvents((prev) => [newEvent, ...prev]);
        showToast('تم تسجيل طلب المفاتحة', 'info');
    };

    const handleInvestigationDebtorShowed = () => {
        const now = new Date().toISOString();
        setInvestigationPathDebtorPresent(true);
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '🟢 حضور المدين — مسار التحقيق',
            description: 'تسجيل حضور المدين في إطار مفاتحة محكمة التحقيق.',
            type: 'summons',
            source: 'التبليغ والإحضار',
            metadata: timelineDebtorMetadata(activeFollowupDebtorKey),
        };
        setTimelineEvents((prev) => [newEvent, ...prev]);
        showToast('تم تسجيل حضور المدين', 'success');
    };

    const handleInvestigationIssueMemo = () => {
        const now = new Date().toISOString();
        setInvestigationMemoIssued(true);
        setArrestWarrantUnlocked(true);
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '📜 إصدار مذكرة قبض — مسار التحقيق',
            description: `إصدار مذكرة قبض بحق المدين ${activeDebtorNameResolved}.`,
            type: 'coercive',
            source: 'التبليغ والإحضار',
            metadata: timelineDebtorMetadata(activeFollowupDebtorKey),
        };
        setTimelineEvents((prev) => [newEvent, ...prev]);
        showToast('تم تسجيل إصدار المذكرة', 'success');
    };

    const handleConfirmSecuredAfterInvestigation = () => {
        const now = new Date().toISOString();
        setForcedPathAttendanceSecured(true);
        setDebtorForcedToAttend(true);
        setActiveNoticeState(null);
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '✅ تم تأمين إحضار المدين — بعد المفاتحة',
            description: 'إكمال تأمين إحضار المدين بعد مسار مفاتحة محكمة التحقيق.',
            type: 'coercive',
            source: 'التبليغ والإحضار',
            metadata: timelineDebtorMetadata(activeFollowupDebtorKey),
        };
        setTimelineEvents((prev) => [newEvent, ...prev]);
        showToast('تم إكمال تأمين الإحضار', 'success');
    };
    
    // 🆕 V8: DEBTOR EVASION HANDLER (المدين تخفى)
    const handleDebtorEvasion = () => {
        setDebtorEvaded(true);
        setArrestWarrantUnlocked(true);
        persistExecutionMerge({ debtorEvaded: true });
        const now = new Date().toISOString();
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '🚫 المدين تخفى عن الأنظار',
            description: 'لم يُعثر على المدين. تم تفعيل خيار مفاتحة محكمة التحقيق (أمر قبض)',
            type: 'coercive',
            source: 'التنفيذ والمحجوزات',
        };
        setTimelineEvents(prev => [newEvent, ...prev]);
        showToast('تم تفعيل خيار أمر القبض', 'warning');
    };

    const applyEarnerFeeSmAction = useCallback(
        (action: EarnerFeeSmAction) => {
            if (action.type === 'B2_FORCED_MEMO' && !forcedSummoningAnalysis.canForceSummon) {
                showToast(
                    forcedSummoningAnalysis.lockReasonAr || 'غير مسموح بالإحضار الجبري وفقاً للوضع القانوني الحالي.',
                    'warning'
                );
                return;
            }
            const side = {
                force: false,
                evasion: false,
                clearEvasion: false,
                b3: false,
                b4: false,
            };
            setEarnerFeeCollectionSm((prev) => {
                if (action.type === 'B1_PERIOD_DONE' && prev.b1PeriodComplete) return prev;
                if (action.type === 'B2_FORCED_MEMO' && prev.b2ForcedMemoIssued) return prev;
                if (action.type === 'B3_REQUEST' && prev.b3InvestigationRequested) return prev;
                if (action.type === 'B3_CONFIRM_PROCESSED' && prev.b3ProcessedConfirmed) return prev;
                if (action.type === 'B4_WARRANT' && prev.b4WarrantLogged) return prev;

                const next = reduceEvictionEarnerFeeSm(prev, action);
                const merge: Record<string, unknown> = { eviction_earner_fee_collection_sm: next };
                if (action.type === 'PICK_ORDINARY') {
                    merge.eviction_last_summons_for_collection = true;
                    merge.eviction_last_collection_summons_branch = 'ordinary';
                }
                if (action.type === 'PICK_COERCIVE') {
                    merge.eviction_last_summons_for_collection = true;
                    merge.eviction_last_collection_summons_branch = 'coercive';
                }
                persistExecutionMerge(merge);

                if (action.type === 'B2_FORCED_MEMO' && !prev.b2ForcedMemoIssued) side.force = true;
                if (action.type === 'B2_EVADING' && action.value && !prev.b2DebtorEvading) side.evasion = true;
                else if (action.type === 'B2_EVADING' && !action.value && prev.b2DebtorEvading)
                    side.clearEvasion = true;
                if (action.type === 'B3_REQUEST' && !prev.b3InvestigationRequested) side.b3 = true;
                if (action.type === 'B4_WARRANT' && !prev.b4WarrantLogged) side.b4 = true;

                return next;
            });
            if (side.force) handleForcedAttendance();
            if (side.evasion) handleDebtorEvasion();
            if (side.clearEvasion) {
                setDebtorEvaded(false);
                persistExecutionMerge({ debtorEvaded: false });
            }
            if (side.b3) handleRequestInvestigationFromForced();
            if (side.b4) handleInvestigationIssueMemo();
        },
        [forcedSummoningAnalysis, persistExecutionMerge, showToast]
    );

    const resetEarnerFeeNotificationCycle = useCallback(() => {
        const fresh = defaultEvictionEarnerFeeCollectionSM();
        setEarnerFeeCollectionSm(fresh);
        setActiveNoticeState(null);
        setForcedAttendanceIssued(false);
        setInvestigationCourtRequested(false);
        setInvestigationMemoIssued(false);
        setInvestigationPathDebtorPresent(false);
        setForcedPathAttendanceSecured(false);
        setDebtorForcedToAttend(false);
        setDebtorArrested(false);
        setArrestWarrantUnlocked(false);
        setDebtorEvaded(false);
        persistExecutionMerge({
            eviction_earner_fee_collection_sm: fresh,
            eviction_last_summons_for_collection: false,
            eviction_last_collection_summons_branch: null,
            activeNoticeState: null,
            forcedAttendanceIssued: false,
            investigationCourtRequested: false,
            investigationMemoIssued: false,
            investigationPathDebtorPresent: false,
            forcedPathAttendanceSecured: false,
            debtorForcedToAttend: false,
            debtorArrested: false,
            arrestWarrantUnlocked: false,
            debtorEvaded: false,
        });
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            title: '🔄 إعادة ضبط مسار الاستحصال والتبليغ (كاسب — تخلية)',
            description: 'قُطع مسار الإكراه المرتبط بالاستحصال وأُعيدت آلية التبليغ لحالتها الأولية.',
            type: 'summons',
            source: 'التبليغ والإحضار',
        };
        setTimelineEvents((prev) => [ev, ...prev]);
        showToast('أُعيد ضبط مسار التبليغ والاستحصال — توقفت الإجراءات الإكراهية المعلّقة', 'info');
    }, [persistExecutionMerge, nextTimelineId, showToast]);
    
    // 🆕 V8: ARREST WARRANT HANDLER (أمر القبض)
    const handleArrestWarrant = () => {
        const now = new Date().toISOString();
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '⛓️ مفاتحة محكمة التحقيق (أمر قبض)',
            description: `تم مفاتحة محكمة التحقيق لإصدار أمر قبض بحق المدين ${activeDebtorNameResolved}`,
            type: 'coercive',
            source: 'التنفيذ والمحجوزات',
        };
        setTimelineEvents(prev => [newEvent, ...prev]);
        showToast('تم تسجيل مفاتحة محكمة التحقيق', 'success');
    };
    
    // 🆕 V8: RESUME EXECUTION HANDLER (استئناف التنفيذ)
    const handleResumeExecution = () => {
        setExecutionPaused(false);
        const newEvent = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            title: '▶️ استئناف التنفيذ',
            description: 'تم استئناف التنفيذ بعد مراجعة الدائن',
            type: 'decision'
        };
        setTimelineEvents(prev => [newEvent, ...prev]);
        showToast('تم استئناف التنفيذ', 'success');
    };
    
    /** مهلة الرضا من آلة الحالة (تاريخ إخبار فعلي + 7 أيام تقويمية ± تمديد يدوي) */
    const notificationModalDaysRemaining = masterState.debtors[0]?.notificationDate != null
        ? masterState.debtors[0].daysRemaining
        : null;
    const notificationModalGraceExpired =
        remaining > 0 &&
        Boolean(masterState.debtors[0]?.notificationDate) &&
        masterState.debtors[0]?.status === 'READY_FOR_COERCIVE';

    // ===========================
    // CRITICAL: END OF GRACE PERIOD TRIGGER
    // ===========================
    const handleEndGracePeriod = () => {
        // 1. Global State Mutation
        setGracePeriodActive(false);
        setGracePeriodEnded(true);
        
        // 2. Force timer to expired state (تواريخ محلية — بدون انزياح UTC)
        const notificationDate = debtorNotificationDate
            ? parseLocalNotificationDate(debtorNotificationDate)
            : new Date();
        const forcedDate = new Date(notificationDate.getTime());
        forcedDate.setDate(forcedDate.getDate() - 8); // Make it 8+ days ago
        setDebtorNotificationDate(formatDateToLocalYmd(forcedDate));
        
        // 3. Financial Impact - Auto-inject 3% fee (UNLESS it's نفقة)
        if (!isAlimonyClaim && !executionFeeInjected) {
            // Use the pre-calculated executionFee variable
            const calculatedFee = calculatedExecutionFee;
            
            if (calculatedFee > 0) {
                // Inject the fee
                setExecutionFeeInjected(true);
                
                // Log to timeline
                const feeEvent = {
                    id: Date.now().toString(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: '💰 تطبيق رسم التحصيل 3%',
                    description: `تم احتساب وإضافة رسم التحصيل البالغ ${calculatedFee.toLocaleString('ar-IQ')} دينار عراقي (3% من أصل الدين والرسوم القضائية) بسبب انتهاء المهلة القانونية`,
                    type: 'payment'
                };
                setTimelineEvents(prev => [feeEvent, ...prev]);
            }
        }
        
        // 4. Log the main action
        const endEvent = {
            id: (Date.now() + 1).toString(),
            date: getLocalTodayYmd(),
            timestamp: new Date().toISOString(),
            title: '🚨 إعلان انتهاء المهلة القانونية',
            description: `تم إعلان انتهاء المهلة القانونية البالغة 7 أيام وتفعيل الإجراءات الجبرية. جميع أدوات التنفيذ الجبري (حجز الراتب، الحجز العقاري، طلب الحبس) أصبحت متاحة الآن.`,
            type: 'coercive'
        };
        setTimelineEvents(prev => [endEvent, ...prev]);
        
        // 5. UI Feedback
        showToast('⚠️ تم تفعيل التنفيذ الجبري وإضافة الرسوم المطلوبة', 'warning');
        
        // 6. Update last action date
        setLastActionDate(getLocalTodayYmd());
    };

    const appendEvictionProcedure = useCallback(
        (input: { actionId: EvictionTimelineActionId; title: string; description: string }) => {
            if (evictionProcedureLocked) {
                showToast('الإضبارة موقوفة — لا يمكن تسجيل الإجراء.', 'warning');
                return;
            }

            const ok = appendEvictionExecutorRequest({
                executionId: decisionsStorageExecutionId,
                title: input.title,
                body: input.description,
                requestKind: 'eviction_procedure',
                evictionWorkflowKey: EVICTION_WORKFLOW_BY_ACTION_ID[input.actionId],
            });
            if (!ok) {
                showToast('يوجد طلب مماثل في مركز القرارات والطعون بانتظار بتّ المنفذ.', 'warning', {
                    decisionsLink: true,
                    decisionsTab: 'current',
                });
                return;
            }
            showToast('تم إرسال الطلب إلى قسم القرارات والطعون.', 'info', {
                decisionsLink: true,
                decisionsTab: 'current',
            });
        },
        [
            evictionProcedureLocked,
            showToast,
            executionId,
            decisionsStorageExecutionId,
        ]
    );

    const handleEvictionHeirsNotificationDateChange = useCallback(
        (ymd: string) => {
            setEvictionHeirsNotificationDateYmd(ymd);
            persistExecutionMerge({ eviction_heirs_notification_date_ymd: ymd.trim() ? ymd : null });
        },
        [persistExecutionMerge]
    );

    const handleIssueHeirsExecutionNoticeMemo = useCallback(() => {
        const ymd = evictionHeirsNotificationDateYmd.trim();
        const datePart = ymd ? `\nتاريخ تبليغ الورثة المسجَّل: ${ymd}.` : '';
        appendEvictionProcedure({
            actionId: EVICTION_TIMELINE_ACTION_IDS.HEIRS_EXECUTION_NOTICE_MEMO,
            title: '📜 إصدار مذكرة إخبار بالتنفيذ للورثة',
            description: `تم إصدار مذكرة إخبار بالتنفيذ لورثة المدين الشاغلين للعقار.${datePart}`,
        });
    }, [appendEvictionProcedure, evictionHeirsNotificationDateYmd]);

    const showResidentialEvictionGraceControl =
        isEvictionExecutionModule && evictionPremisesUseResolved === 'residential';

    const showResidentialGraceEarlyEndRequest = useMemo(() => {
        if (evictionPremisesUseResolved !== 'residential') return false;
        const start = evictionResidentialGracePeriodStart;
        const end = evictionVacateDeadlineLocal;
        if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return false;
        if (!end || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return false;
        return !isResidentialVacateGraceFinished;
    }, [
        evictionPremisesUseResolved,
        evictionResidentialGracePeriodStart,
        evictionVacateDeadlineLocal,
        isResidentialVacateGraceFinished,
    ]);

    const residentialGraceModalShowPrimarySave = useMemo(() => {
        const start = evictionResidentialGracePeriodStart;
        const end = evictionVacateDeadlineLocal;
        return !(
            typeof start === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(start) &&
            typeof end === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(end)
        );
    }, [evictionResidentialGracePeriodStart, evictionVacateDeadlineLocal]);

    const openEvictionResidentialGraceModal = useCallback(() => {
        if (evictionProcedureLocked) {
            showToast('لا يمكن فتح المهلة — الإضبارة أو الإجراءات مقفلة.', 'warning');
            return;
        }
        const endFromState =
            evictionVacateDeadlineLocal && /^\d{4}-\d{2}-\d{2}$/.test(evictionVacateDeadlineLocal)
                ? evictionVacateDeadlineLocal
                : evictionVacateDraft.trim();
        setGraceModalEndYmd(/^\d{4}-\d{2}-\d{2}$/.test(endFromState) ? endFromState : '');
        setGraceModalStartYmd(evictionResidentialGracePeriodStart || evictionLocalYmdToday());
        setShowEvictionResidentialGraceModal(true);
    }, [
        evictionProcedureLocked,
        evictionVacateDeadlineLocal,
        evictionVacateDraft,
        evictionResidentialGracePeriodStart,
        showToast,
    ]);

    const openEvictionExecutorCompletion = useCallback(
        (decisionId: string) => {
            const primaryKey = String(decisionsStorageExecutionId ?? '').trim();
            const altKey = String(executionId ?? '').trim();
            const did = String(decisionId).trim();
            if (!did) return;

            const rowsPrimary = readExecutorDecisionsArray(primaryKey) as Array<Record<string, unknown>>;
            let keyUsed = primaryKey;
            let row = rowsPrimary.find((r) => String((r as any).id || '').trim() === did);
            if (!row && altKey && altKey !== primaryKey) {
                const rowsAlt = readExecutorDecisionsArray(altKey) as Array<Record<string, unknown>>;
                row = rowsAlt.find((r) => String((r as any).id || '').trim() === did);
                if (row) keyUsed = altKey;
            }
            if (!row) return;
            const branch = inferExecutorApprovalDecisionType(row as any);
            const requestTitle = String((row as any).title || '').trim() || 'طلب';
            const dossierId = keyUsed;

			const openDecisionCardFallback = () => {
				setShowDecisionsModal(true);
				setDecisionsModalBootListTab('previous');
				setDecisionsModalScrollToDecisionId(did);
			};

            if (branch === 'Field Visit Date') {
                executorApprovalActions.openScheduledDateModal({
                    decisionId,
                    requestTitle,
                    onSaved: (payload) => {
                        executorApprovalActions.pushCalendarAppointment({
                            dossierId,
                            decisionId,
                            purpose: requestTitle,
                            eventIso: payload.eventIso,
                            recordedAt: new Date().toISOString(),
                        });
                        executorApprovalActions.patchDecision(decisionId, {
                            executorScheduleLabel: `مجدول: ${payload.displayAr}`,
                        });
                        try {
                            localStorage.setItem(fieldVisitAppointmentStorageKey(dossierId), payload.eventIso);
                        } catch {
                            /* ignore */
                        }
                    },
                });
                return;
            }

            if (branch === 'Grace Period') {
                setShowDecisionsModal(false);
                setEvictionGraceDecisionId(decisionId);
                openEvictionResidentialGraceModal();
                return;
            }

            if (branch === 'Police Assistance Request') {
                setShowDecisionsModal(false);
                setPoliceAssistanceDecisionId(decisionId);
                setPoliceAssistanceRequestTitle(requestTitle);
                setPoliceAssistanceAgencyDraft(String((row as any).policeAssistanceAgency || '').trim());
                setPoliceAssistanceModalOpen(true);
				return;
            }

			if (branch === 'Lock Breaking & Inventory') {
				setShowDecisionsModal(false);
				openBreakInventoryCompletion(decisionId, executorApprovalActions, requestTitle);
				return;
			}

			if (branch === 'Judicial Custodian') {
				setShowDecisionsModal(false);
				openJudicialCustodianCompletion(decisionId, executorApprovalActions, requestTitle);
				return;
			}

			if (branch === 'Eviction') {
				setShowDecisionsModal(false);
				executorApprovalActions.promptOpenExecutionReport(() => {
					/* handled by confirm modal */
				});
				return;
			}

			if (branch === 'Residential Grace Early End') {
				setShowUnifiedExecutionModal(true);
				setUnifiedModalTab('coercive');
				showToast('تمت موافقة المنفذ — أكمل من بطاقة الطلب في «محضر المتابعة».', 'info', {
					decisionsLink: true,
					decisionId: did,
					decisionsTab: 'previous',
				});
				return;
			}

			openDecisionCardFallback();
        },
        [
            decisionsStorageExecutionId,
            executionId,
            executorApprovalActions,
            openBreakInventoryCompletion,
            openEvictionResidentialGraceModal,
            openJudicialCustodianCompletion,
            setDecisionsModalBootListTab,
            setDecisionsModalScrollToDecisionId,
            setShowDecisionsModal,
            setShowUnifiedExecutionModal,
            setUnifiedModalTab,
            showToast,
        ]
    );

    openEvictionExecutorCompletionRef.current = openEvictionExecutorCompletion;

    useEffect(() => {
        const myId = String(executionData?.id ?? executionId ?? '').trim();
        if (!myId) return;
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; decisionId?: string }>;
            const evId = String(ce.detail?.executionId ?? '').trim();
            if (evId !== myId && evId !== String(decisionsStorageExecutionId ?? '').trim()) return;
            const did = String(ce.detail?.decisionId ?? '').trim();
            if (!did) return;
            openEvictionExecutorCompletion(did);
        };
        window.addEventListener('hami-open-eviction-executor-completion', handler as EventListener);
        return () =>
            window.removeEventListener('hami-open-eviction-executor-completion', handler as EventListener);
    }, [executionData?.id, executionId, openEvictionExecutorCompletion, decisionsStorageExecutionId]);

    const submitEvictionResidentialGraceFromModal = useCallback(() => {
        if (
            evictionResidentialGracePeriodStart &&
            /^\d{4}-\d{2}-\d{2}$/.test(evictionResidentialGracePeriodStart) &&
            evictionVacateDeadlineLocal &&
            /^\d{4}-\d{2}-\d{2}$/.test(evictionVacateDeadlineLocal) &&
            !isResidentialVacateGraceFinished
        ) {
            showToast(
                'المهلة مسجّلة. لإعادة ضبط المدة أو حفظ مهلة جديدة يُنفَّذ أولاً إنهاء دورة المهلة.',
                'warning'
            );
            return;
        }
        const start = graceModalStartYmd.trim();
        const end = graceModalEndYmd.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
            showToast('أدخل تاريخ بداية المهلة وتاريخ انتهائها بصيغة YYYY-MM-DD', 'warning');
            return;
        }
        if (start > end) {
            showToast('تاريخ البداية لا يجوز أن يتأخر عن تاريخ الانتهاء', 'warning');
            return;
        }
        if (residentialVacateDeadlineMaxIso && end > residentialVacateDeadlineMaxIso) {
            showToast(`لا يجوز تجاوز ${residentialVacateDeadlineMaxIso} (أقصى 90 يوماً تقويمياً بعد الإخبار)`, 'warning');
            return;
        }
        const days = evictionInclusiveCalendarDays(start, end);
        if (days <= 0) {
            showToast('تأكد من صحة المدة بين التاريخين', 'warning');
            return;
        }
        setEvictionVacateDeadlineLocal(end);
        setEvictionVacateDraft(end);
        setEvictionResidentialGracePeriodStart(start);
        setEvictionExecutorVacateGrantApproved(false);
        setEvictionResidentialGraceManuallyEndedAt(null);

        const now = new Date().toISOString();
        const day = now.slice(0, 10);
        const fn = executionData?.fileNumber ? String(executionData.fileNumber) : '';
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            type: 'eviction',
            title: '🏠 مهلة',
            description: `من ${start} إلى ${end} — ${days} يوماً تقويمياً`,
            date: day,
            timestamp: now,
            source: 'الإجراءات الجبرية — تخلية',
            metadata: {
                evictionResidentialGraceModal: true,
                graceStartYmd: start,
                graceEndYmd: end,
                graceDays: days,
            },
        };
        const appointmentEv: TimelineEvent = {
            id: nextTimelineId(),
            type: 'appointment',
            date: `${end}T12:00:00`,
            timestamp: now,
            title: '⏳ انتهاء المهلة',
            description: `المهلة ${days} يوماً (من ${start} إلى ${end})`,
            source: 'المهلة',
        };
        const nextTimeline = [ev, appointmentEv, ...timelineEvents];
        setTimelineEvents(nextTimeline);

        persistExecutionMerge({
            eviction_vacate_deadline: end,
            eviction_residential_grace_period_start: start,
            eviction_executor_vacate_grant_approved: false,
            eviction_residential_grace_manually_ended_at: null,
            timelineEvents: nextTimeline,
        });

        if (evictionGraceDecisionId) {
            patchExecutorDecisionRow(executionData?.id ?? executionId, evictionGraceDecisionId, {
                evictionGraceSavedAt: now,
                evictionGraceStartYmd: start,
                evictionGraceEndYmd: end,
                evictionGraceDays: days,
            });
            setEvictionGraceDecisionId(null);
        }

        setShowEvictionResidentialGraceModal(false);
        showToast(
            'تم تسجيل المهلة — يُحدَّث السجل والمواعيد تلقائياً. يمكنك متابعة موافقة المنفذ من الواجهة أو «القرارات والطعون».',
            'success'
        );
    }, [
        graceModalStartYmd,
        graceModalEndYmd,
        evictionResidentialGracePeriodStart,
        evictionVacateDeadlineLocal,
        isResidentialVacateGraceFinished,
        residentialVacateDeadlineMaxIso,
        showToast,
        nextTimelineId,
        timelineEvents,
        persistExecutionMerge,
        executionData?.fileNumber,
        evictionGraceDecisionId,
        executionData?.id,
        executionId,
    ]);

    const savePoliceAssistanceFromModal = useCallback(
        (agencyName: string) => {
            if (evictionProcedureLocked) {
                showToast('لا يمكن حفظ القوة الجبرية — الإضبارة أو الإجراءات مقفلة.', 'warning');
                return;
            }
            const decisionId = String(policeAssistanceDecisionId || '').trim();
            if (!decisionId) return;
            const agency = String(agencyName || '').trim();
            if (!agency) {
                showToast('أدخل اسم الجهة المرافقة', 'warning');
                return;
            }

            const now = new Date().toISOString();
            const linked = executorApprovalActions.getFieldVisitDeadlineIso();
            let dueYmd = now.slice(0, 10);
            if (linked) {
                const d = new Date(linked);
                if (!Number.isNaN(d.getTime())) {
                    dueYmd = formatDateToLocalYmd(d);
                } else if (/^\d{4}-\d{2}-\d{2}/.test(linked)) {
                    dueYmd = linked.slice(0, 10);
                }
            }

            const ev: TimelineEvent = {
                id: nextTimelineId(),
                type: 'eviction',
                date: now.slice(0, 10),
                timestamp: now,
                title: '🛡️ القوة الجبرية',
                description: `الجهة المرافقة: ${agency}`,
                source: 'الإجراءات الجبرية — تخلية',
                metadata: {
                    evictionActionId: EVICTION_TIMELINE_ACTION_IDS.POLICE_FORCE,
                    decisionRowId: decisionId,
                    policeAssistanceAgency: agency,
                },
            };
            const ap: TimelineEvent = {
                id: nextTimelineId(),
                type: 'appointment',
                date: `${dueYmd}T12:00:00`,
                timestamp: now,
                title: '🛡️ متابعة القوة الجبرية',
                description: `الجهة المرافقة: ${agency}`,
                source: 'القوة الجبرية',
                metadata: { decisionRowId: decisionId },
            };

            const nextTimeline = [ev, ap, ...timelineEventsRef.current];
            setTimelineEvents(nextTimeline);
            persistExecutionMerge({
                eviction_police_assistance: {
                    decisionId,
                    agencyName: agency,
                    dueYmd,
                    savedAt: now,
                    completedAt: null,
                },
                timelineEvents: nextTimeline,
            });

            patchExecutorDecisionRow(executionData?.id ?? executionId, decisionId, {
                policeAssistanceSavedAt: now,
                policeAssistanceAgency: agency,
            });

            setPoliceAssistanceDecisionId(null);
            setPoliceAssistanceRequestTitle('');
            setPoliceAssistanceAgencyDraft('');
            setPoliceAssistanceModalOpen(false);
            showToast('تم حفظ القوة الجبرية وربطها بالمواعيد والسجل', 'success');
        },
        [
            evictionProcedureLocked,
            showToast,
            policeAssistanceDecisionId,
            executorApprovalActions,
            nextTimelineId,
            persistExecutionMerge,
            executionData?.id,
            executionId,
        ]
    );

    const completeEvictionResidentialGrace = useCallback(() => {
        if (evictionProcedureLocked) {
            showToast('لا يمكن إتمام المهلة — الإضبارة أو الإجراءات مقفلة.', 'warning');
            return;
        }
        const now = new Date().toISOString();
        const nextTasks = (caseTasksPendingRef.current || []).filter(
            (t) => !String(t.id || '').startsWith('eviction-residential-grace-')
        );
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            type: 'eviction',
            date: now.slice(0, 10),
            timestamp: now,
            title: '✅ إتمام المهلة',
            description: 'تم إنهاء المهلة وإغلاق شارتها من البطاقة.',
            source: 'الإجراءات الجبرية — تخلية',
        };
        const nextTimeline = [ev, ...timelineEventsRef.current];
        setEvictionResidentialGraceManuallyEndedAt(now);
        setCaseTasksPending(nextTasks);
        setTimelineEvents(nextTimeline);
        persistExecutionMerge({
            eviction_residential_grace_manually_ended_at: now,
            caseTasksPending: nextTasks,
            timelineEvents: nextTimeline,
        });
        showToast('تم إتمام المهلة', 'success');
    }, [evictionProcedureLocked, nextTimelineId, persistExecutionMerge, showToast]);

    const completePoliceAssistance = useCallback(() => {
        if (evictionProcedureLocked) {
            showToast('لا يمكن إتمام الطلب — الإضبارة أو الإجراءات مقفلة.', 'warning');
            return;
        }
        const cur = executionDataRef.current?.eviction_police_assistance;
        if (!cur || !cur.decisionId) return;
        const now = new Date().toISOString();
        const nextTasks = (caseTasksPendingRef.current || []).filter(
            (t) => String(t.id || '') !== `eviction-police-assistance-${cur.decisionId}`
        );
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            type: 'eviction',
            date: now.slice(0, 10),
            timestamp: now,
            title: '✅ إتمام طلب القوة الجبرية',
            description: `تم إتمام الطلب وإغلاق شارة القوة الجبرية. الجهة: ${cur.agencyName}`,
            source: 'الإجراءات الجبرية — تخلية',
        };
        const nextTimeline = [ev, ...timelineEventsRef.current];
        setCaseTasksPending(nextTasks);
        setTimelineEvents(nextTimeline);
        persistExecutionMerge({
            eviction_police_assistance: { ...cur, completedAt: now },
            caseTasksPending: nextTasks,
            timelineEvents: nextTimeline,
        });
        showToast('تم إتمام طلب القوة الجبرية', 'success');
    }, [evictionProcedureLocked, nextTimelineId, persistExecutionMerge, showToast]);

    const openFinancialHubLedger = useCallback(() => {
        setShowUnifiedExecutionModal(false);
        setIsFinancialCenterExpanded(true);
        setShowExecutionFinancialHub(true);
        setExecutionFinancialHubTab('ledger');
    }, []);

    useEffect(() => {
        const myId = String(executionData?.id ?? executionId ?? '');
        if (!myId) return;
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; mode?: string }>;
            if (String(ce.detail?.executionId ?? '') !== myId) return;
            const mode = String(ce.detail?.mode ?? '').trim();
            openFinancialHubLedger();
            window.setTimeout(() => {
                try {
                    window.dispatchEvent(
                        new CustomEvent('hami-open-financial-ledger-modal', {
                            detail: { executionId: myId, mode: mode || 'disburse' },
                        })
                    );
                } catch {
                    /* ignore */
                }
            }, 50);
        };
        window.addEventListener('hami-open-financial-hub-ledger', handler as EventListener);
        return () => window.removeEventListener('hami-open-financial-hub-ledger', handler as EventListener);
    }, [executionData?.id, executionId, openFinancialHubLedger]);

    const requestFollowupSeizureDecision = useCallback(
        (subtype: 'third_party' | 'notice', title: string, body: string) => {
            const exId = decisionsStorageExecutionId;
            if (!exId || exId === 'undefined') return;
            const rows = readExecutorDecisionsArray(exId) as Array<Record<string, unknown>>;
            const dup = rows.find(
                (r) =>
                    String(r.requestKind || '') === 'seizure' &&
                    String((r as any).seizureSubtype || '') === subtype &&
                    (String((r as any).executorOutcome || '') === 'pending' ||
                        (r as any).executorOutcome === undefined)
            );
            if (dup?.id) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', {
                    decisionsLink: true,
                    decisionId: String(dup.id),
                    decisionsTab: 'current',
                });
                return;
            }

            const decisionId = appendPendingExecutorSeizureDecision({
                executionId: exId,
                requestTitle: `${title} — قيد البت لدى المنفذ`,
                requestBody: body,
                seizureSubtype: subtype,
            });
            if (!decisionId) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', {
                    decisionsLink: true,
                    decisionsTab: 'current',
                });
                return;
            }

            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: `📋 ${title} — قيد البت`,
                description: body,
                type: 'decision',
                source: 'محضر المتابعة',
                metadata: {
                    timelineThreadKey: `executor_decision:${decisionId}`,
                    decisionRowId: decisionId,
                },
            });

            showToast('تم إرسال الطلب إلى القرارات والطعون.', 'success', {
                decisionsLink: true,
                decisionId,
                decisionsTab: 'current',
            });
        },
        [
            decisionsStorageExecutionId,
            nextTimelineId,
            pushTimelineEvent,
            showToast,
        ]
    );

    const handleGuarantorRequestFromFollowup = useCallback(() => {
        if (guarantorFollowupAwaitingDetailsSave(executionData?.guarantor_followup)) {
            openGuarantorDetailsModal();
            return;
        }
        const gReq = appendGuarantorFollowupRequest({ executionId: decisionsStorageExecutionId });
        if (!gReq.ok) {
            showToast('يوجد طلب كفيل قيد البت لدى المنفذ.', 'warning', {
                decisionsLink: true,
                decisionsTab: 'current',
            });
            return;
        }
        if (gReq.decisionId) {
            const ts = new Date().toISOString();
            setTimelineEvents((prev) => [
                {
                    id: nextTimelineId(),
                    date: ts.slice(0, 10),
                    timestamp: ts,
                    title: 'طلب إدخال كفيل ضامن — قيد البت',
                    type: 'decision',
                    source: 'القرارات والطعون',
                    metadata: {
                        ...timelineDebtorMetadata(assignmentWorkspaceCtx.activeDebtorKey),
                        timelineThreadKey: `executor_decision:${gReq.decisionId}`,
                        decisionRowId: gReq.decisionId,
                    },
                },
                ...prev,
            ]);
        }
        showToast('تم إرسال طلب الكفيل إلى القرارات والطعون.', 'success', {
            decisionsLink: true,
            decisionId: gReq.decisionId,
            decisionsTab: 'current',
        });
    }, [
        assignmentWorkspaceCtx.activeDebtorKey,
        decisionsStorageExecutionId,
        executionData?.guarantor_followup,
        nextTimelineId,
        openGuarantorDetailsModal,
        showToast,
    ]);

    const archiveAndClearGuarantor = useCallback(
        (reason: 'replace' | 'unlink') => {
            const gf = executionData?.guarantor_followup;
            if (!gf) return;
            const archivedAt = new Date().toISOString();
            const prevHist = Array.isArray(executionData?.guarantor_followup_history)
                ? executionData?.guarantor_followup_history
                : [];
            persistExecutionMerge({
                guarantor_followup: null,
                hasGuarantor: false,
                guarantor_followup_history: [{ ...gf, archivedAt }, ...prevHist],
            });
            pushTimelineEvent({
                id: nextTimelineId(),
                date: archivedAt.slice(0, 10),
                timestamp: archivedAt,
                title: reason === 'replace' ? 'استبدال الكفيل الضامن' : 'فك الكفالة / حذف الكفيل',
                description:
                    reason === 'replace'
                        ? 'تمت أرشفة الكفيل الحالي وفتح مسار تسجيل كفيل جديد.'
                        : 'تم إنهاء ارتباط الكفيل بالإضبارة وأرشفة بياناته.',
                type: 'procedure',
                source: 'محضر المتابعة',
            });
        },
        [
            executionData?.guarantor_followup,
            executionData?.guarantor_followup_history,
            nextTimelineId,
            persistExecutionMerge,
            pushTimelineEvent,
        ]
    );

    const requestGuarantorSeizure = useCallback(
        (subtype: 'salary' | 'movable' | 'property') => {
            const gf = executionData?.guarantor_followup;
            if (!gf?.details_saved) {
                showToast('أكمل بيانات الكفيل أولاً.', 'warning');
                return;
            }
            if (gf.guarantee_type !== 'amount') {
                showToast('كفالة إحضار فقط — لا يمكن اتخاذ إجراءات الحجز على الكفيل.', 'warning');
                return;
            }
            const label =
                subtype === 'salary'
                    ? 'طلب حجز راتب الكفيل'
                    : subtype === 'property'
                      ? 'طلب حجز عقار الكفيل'
                      : 'طلب حجز أموال منقولة للكفيل';
            const body = [
                'طلب اتخاذ إجراءات الحجز على الكفيل الضامن.',
                gf.guarantor_name?.trim() ? `اسم الكفيل: ${gf.guarantor_name.trim()}` : null,
                gf.guarantor_workplace?.trim() ? `عنوان العمل: ${gf.guarantor_workplace.trim()}` : null,
            ]
                .filter(Boolean)
                .join('\n');
            const did = appendPendingExecutorSeizureDecision({
                executionId: decisionsStorageExecutionId,
                requestTitle: label,
                requestBody: body,
                seizureSubtype: subtype as any,
            });
            if (!did) {
                showToast('يوجد طلب مماثل قيد المعالجة.', 'warning', { decisionsLink: true });
                return;
            }
            const ts = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: `📌 ${label} — قيد البت`,
                description: body,
                type: 'decision',
                source: 'محضر المتابعة',
                metadata: { timelineThreadKey: `executor_decision:${did}`, decisionRowId: did },
            });
            showToast('تم إرسال الطلب إلى القرارات والطعون.', 'success', {
                decisionsLink: true,
                decisionId: did,
                decisionsTab: 'current',
            });
        },
        [
            decisionsStorageExecutionId,
            executionData?.guarantor_followup,
            nextTimelineId,
            pushTimelineEvent,
            showToast,
        ]
    );

    const handleEvictionUnlockAssetsTab = useCallback(() => {
        setEvictionAssetsTabUnlocked(true);
        persistExecutionMerge({ eviction_assets_tab_unlocked: true });
        openFinancialHubLedger();
        showToast('تم فتح تبويب الحجز المالي', 'success');
    }, [openFinancialHubLedger, persistExecutionMerge, showToast]);

    const handleEvictionLedgerActivated = useCallback(() => {
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            title: '📁 تم فتح وعاء المطالبة بالأتعاب والمصاريف',
            description:
                'فعّل المحامي مسار المطالبة بالأتعاب والمصاريف التنفيذية من المركز المالي (تخلية).',
            type: 'action',
            source: 'إدارة الأموال والمصاريف',
        };
        const next = [ev, ...timelineEvents];
        setTimelineEvents(next);
        persistExecutionMerge({
            timelineEvents: next,
            eviction_assets_tab_unlocked: true,
        });
        showToast('تم فتح مسار المطالبة وتسجيله في السجل الزمني.', 'success');
    }, [nextTimelineId, timelineEvents, persistExecutionMerge, showToast]);

    const { runSubmit: runEvictionLawyerFeeSubmit } = useStandardSubmit({
        validationMessage: '',
        validate: () => {
            const exId = decisionsStorageExecutionId;
            if (hasApprovedLawyerFeePayout(exId)) {
                showToast('سبق أن وافق منفذ العدل على صرف الأتعاب المحكومة — لا يُعاد طرح الطلب.', 'warning');
                return false;
            }
            return true;
        },
        submit: () => {
            const exId = decisionsStorageExecutionId;
            const amt = parsedLawyerFees > 0 ? parsedLawyerFees.toLocaleString('ar-IQ') : '—';
            const modeAr =
                lawyerFeeDisburseMode === 'salary_fifth'
                    ? 'صرف من خُمس الراتب (المدين موظف)'
                    : lawyerFeeDisburseMode === 'settlement'
                      ? 'تسوية / أقساط باتفاق'
                      : 'دفعة واحدة / صفقة';
            const notes = lawyerFeeDisburseNotes.trim();
            const ok = appendEvictionExecutorRequest({
                executionId: exId,
                title: 'طلب صرف أتعاب محكومة للمحامي',
                body: `طلب صرف أتعاب محكومة يتحمّلها المدين.\nالمبلغ التقريبي: ${amt} د.ع.\nأسلوب الصرف المطلوب: ${modeAr}.${notes ? `\nملاحظات: ${notes}` : ''}`,
                requestKind: 'lawyer_fee_payout',
            });
            if (!ok) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', { decisionsLink: true });
                return false;
            }
            setEvictionAssetsTabUnlocked(true);
            persistExecutionMerge({
                eviction_assets_tab_unlocked: true,
                eviction_lawyer_fee_requested: true,
            });
        },
        onClose: () => {
            setShowEvictionLawyerFeeModal(false);
            setLawyerFeeDisburseNotes('');
        },
        successMessage:
            'تم حفظ الطلب بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ',
        showToast,
    });

    const handleEvictionLawyerFeeRequest = useCallback(() => {
        const exId = decisionsStorageExecutionId;
        if (hasApprovedLawyerFeePayout(exId)) {
            showToast('سبق أن وافق منفذ العدل على صرف الأتعاب المحكومة — لا يُعاد طرح الطلب.', 'warning');
            return;
        }
        setShowEvictionLawyerFeeModal(true);
    }, [decisionsStorageExecutionId, showToast]);

    const { runSubmit: runEvictionExpenseSubmit } = useStandardSubmit({
        validate: () => {
            const raw = evictionExpenseAmount.replace(/,/g, '').trim();
            const n = parseFloat(raw);
            return Number.isFinite(n) && n > 0;
        },
        validationMessage: 'أدخل مبلغاً صحيحاً',
        submit: () => {
            const raw = evictionExpenseAmount.replace(/,/g, '').trim();
            const n = parseFloat(raw);
            const row = {
                id: `evx_${Date.now()}`,
                amount: n,
                note: evictionExpenseNote.trim() || 'مصاريف إضبارة تخلية',
                date: getLocalTodayYmd(),
            };
            const nextExp = [row, ...evictionCaseExpenses];
            const tNow = new Date().toISOString();
            const payModeAr =
                evictionExpensePayMode === 'salary_fifth'
                    ? 'التحصيل من خُمس راتب المدين (موظف)'
                    : evictionExpensePayMode === 'installments'
                      ? 'أقساط / تسوية'
                      : 'دفعة واحدة';
            const evLine: TimelineEvent = {
                id: nextTimelineId(),
                type: 'payment',
                title: `💸 مصاريف إضبارة تخلية: ${n.toLocaleString('ar-IQ')} د.ع`,
                description: `${row.note} — أسلوب التحصيل المقترح: ${payModeAr}`,
                date: getLocalTodayYmd(),
                timestamp: tNow,
                source: 'إدارة الأموال — تخلية',
            };
            const nextTimeline = [evLine, ...timelineEvents];
            setEvictionCaseExpenses(nextExp);
            setTimelineEvents(nextTimeline);
            setEvictionAssetsTabUnlocked(true);
            setEvictionExpenseAmount('');
            setEvictionExpenseNote('');
            setEvictionExpensePayMode('lump_sum');
            persistExecutionMerge({
                eviction_case_expenses: nextExp,
                eviction_assets_tab_unlocked: true,
                timelineEvents: nextTimeline,
            });
            appendEvictionExecutorRequest({
                executionId: decisionsStorageExecutionId,
                title: `طلب تثبيت مصاريف إضبارة: ${n.toLocaleString('ar-IQ')} د.ع`,
                body: `تثبيت مصاريف إضبارة يتحمّلها المدين: ${row.note}.\nأسلوب التحصيل المقترح: ${payModeAr}.`,
                requestKind: 'case_expense',
            });
        },
        onClose: () => setShowEvictionExpenseModal(false),
        successMessage: 'تم التسجيل — راجع قرار المنفذ',
        showToast,
    });

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{
                executionId?: string;
                decisionId?: string;
                requestKind?: string;
                outcome?: string;
            }>;
            const evId = String(ce.detail?.executionId ?? '');
            const myId = String(executionData?.id ?? executionId ?? '');
            if (evId !== myId && evId !== String(decisionsStorageExecutionId ?? '')) return;
            if (ce.detail?.outcome !== 'approved') return;
            const rk = ce.detail?.requestKind;
            if (rk !== 'lawyer_fee_payout' && rk !== 'case_expense') return;

            setEvictionAssetsTabUnlocked(true);

            if (rk === 'lawyer_fee_payout' && parsedLawyerFees > 0) {
                setSeizedAssets((prev) => {
                    if (prev.some((a) => String(a.id).startsWith('claimed_lawyer_fee_'))) return prev;
                    const next: SeizedAsset[] = [
                        {
                            id: `claimed_lawyer_fee_${Date.now()}`,
                            type: 'مطالبة أتعاب محكومة',
                            status: 'pending',
                            details: {
                                المبلغ: `${parsedLawyerFees.toLocaleString('ar-IQ')} د.ع`,
                                المصدر: 'موافقة المنفذ',
                            },
                        },
                        ...prev,
                    ];
                    queueMicrotask(() =>
                        persistExecutionMerge({
                            seizedAssets: next,
                            eviction_assets_tab_unlocked: true,
                        })
                    );
                    return next;
                });
            }
            if (rk === 'case_expense') {
                const sum = evictionCaseExpenses.reduce((s, x) => s + (Number(x.amount) || 0), 0);
                if (sum <= 0) {
                    queueMicrotask(() => persistExecutionMerge({ eviction_assets_tab_unlocked: true }));
                    showToast('تم قبول المصاريف — تبويب الأموال', 'success');
                    return;
                }
                setSeizedAssets((prev) => {
                    if (prev.some((a) => String(a.id).startsWith('claimed_case_expense_'))) return prev;
                    const next: SeizedAsset[] = [
                        {
                            id: `claimed_case_expense_${Date.now()}`,
                            type: 'مصاريف إضبارة (مطالبة)',
                            status: 'pending',
                            details: {
                                الإجمالي: `${sum.toLocaleString('ar-IQ')} د.ع`,
                                المصدر: 'موافقة المنفذ',
                            },
                        },
                        ...prev,
                    ];
                    queueMicrotask(() =>
                        persistExecutionMerge({
                            seizedAssets: next,
                            eviction_assets_tab_unlocked: true,
                        })
                    );
                    return next;
                });
            }
            showToast('تم تفعيل المسار بقرار المنفذ', 'success');
        };
        window.addEventListener('hami-execution-decision-outcome', handler as EventListener);
        return () => window.removeEventListener('hami-execution-decision-outcome', handler as EventListener);
    }, [
        executionData?.id,
        executionId,
        parsedLawyerFees,
        evictionCaseExpenses,
        persistExecutionMerge,
        showToast,
    ]);

    /** ربط عكسي: من مركز القرارات إلى المركز المالي عند صدور قرار طلب الاستحصال */
    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{
                executionId?: string;
                requestKind?: string;
                outcome?: string;
                decisionId?: string;
            }>;
            if (String(ce.detail?.executionId ?? '') !== String(executionData?.id ?? executionId ?? '')) return;
            if (ce.detail?.requestKind !== 'unified_collection') return;
            const decisionId = String(ce.detail?.decisionId || '').trim();
            const outcome = String(ce.detail?.outcome ?? '');
            if (outcome === 'approved') {
                setEvictionAssetsTabUnlocked(true);
                queueMicrotask(() => persistExecutionMerge({ eviction_assets_tab_unlocked: true }));
                showToast('وافق المنفذ على طلب الاستحصال.', 'success', {
                    decisionsLink: true,
                    decisionId,
                    decisionsTab: 'previous',
                });
                return;
            }
            if (outcome === 'rejected') {
                showToast('رُفض طلب الاستحصال — راجع الأسباب.', 'info', {
                    decisionsLink: true,
                    decisionId,
                    decisionsTab: 'previous',
                });
                return;
            }
            if (outcome === 'alternative') {
                showToast('صدر قرار بديل بخصوص طلب الاستحصال — راجع التفاصيل.', 'info', {
                    decisionsLink: true,
                    decisionId,
                    decisionsTab: 'previous',
                });
            }
        };
        window.addEventListener('hami-execution-decision-outcome', handler as EventListener);
        return () => window.removeEventListener('hami-execution-decision-outcome', handler as EventListener);
    }, [
        executionData?.id,
        executionId,
        setExecutionModal,
        setExecutionFinancialHubTab,
        setShowExecutionFinancialHub,
        setShowDecisionsModal,
        showToast,
    ]);

    /** إشعارات طلب الكفيل + توجيه مباشر لمسار التنفيذ الجبري الشخصي */
    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{
                executionId?: string;
                requestKind?: string;
                outcome?: string;
                decisionId?: string;
            }>;
            if (String(ce.detail?.executionId ?? '') !== String(executionData?.id ?? executionId ?? '')) return;
            if (ce.detail?.requestKind !== 'guarantor_request') return;
            const decisionId = String(ce.detail?.decisionId || '').trim();
            const o = String(ce.detail?.outcome ?? '');
            if (o === 'approved') {
                showToast('وافق المنفذ على طلب إدخال الكفيل الضامن.', 'success', {
                    action: {
                        label: 'فتح قائمة الكفيل',
                        onClick: () => {
                            try {
                                window.dispatchEvent(
                                    new CustomEvent('hami-open-guarantor-details', {
                                        detail: { executionId: executionData?.id ?? executionId, decisionId },
                                    })
                                );
                            } catch {
                                /* ignore */
                            }
                        },
                    },
                    decisionsLink: true,
                    decisionId,
                    decisionsTab: 'previous',
                });
            } else if (o === 'rejected') {
                showToast('رُفض طلب إدخال الكفيل الضامن.', 'info', {
                    decisionsLink: true,
                    decisionId,
                    decisionsTab: 'previous',
                });
            } else if (o === 'alternative') {
                showToast('سُجِّل قرار بديل بشأن طلب الكفيل الضامن.', 'info', {
                    decisionsLink: true,
                    decisionId,
                    decisionsTab: 'previous',
                });
            }
        };
        window.addEventListener('hami-execution-decision-outcome', handler as EventListener);
        return () => window.removeEventListener('hami-execution-decision-outcome', handler as EventListener);
    }, [
        executionData?.id,
        executionId,
        primaryDebtorWorkspaceKey,
        setExecutionModal,
        setShowDecisionsModal,
        showToast,
    ]);
    
    // 🆕 V7: COERCIVE ACTION HANDLERS — تعدّد الخصوم + تضامن (توجيه الإجراء)
    const handleCoerciveAction = (actionType: string) => {
        if (coerciveUiLocked) {
            showToast('⏸️ الإضبارة موقوفة قانونياً. يجب استئناف التنفيذ أولاً.', 'warning');
            return;
        }
        if (actionType === 'salary' && !activeDebtorIsEmployee) {
            showToast('حجز الراتب متاح للمدين الموظف فقط.', 'info');
            return;
        }

        const multi = allDebtorsUnified.length > 1;

        if (isSolidaryLiability && multi) {
            const selectable = allDebtorsUnified.filter((r) => !r.cleared);
            if (selectable.length === 0) {
                showToast('لا يوجد مدين نشط لتوجيه الإجراء ضده.', 'warning');
                return;
            }
            if (selectable.length === 1) {
                coerciveSubjectRef.current = {
                    id: selectable[0].id,
                    name: selectable[0].name,
                };
                if (['salary', 'property', 'vehicle'].includes(actionType)) {
                    saveCoerciveActionRef.current(actionType, buildInitialExecutorSeizureDetails(actionType));
                    return;
                }
                setShowCoerciveActionForm(actionType);
                return;
            }
            setSolidaryCoerciveActionPending(actionType);
            setShowSolidaryCoerciveTargetModal(true);
            return;
        }

        if (!isSolidaryLiability && multi) {
            const row = allDebtorsUnified[executionDebtorTabIndex];
            if (!row || row.cleared) {
                showToast(
                    'براءة ذمة هذا المدين — الإجراءات الجبرية معطّلة له في هذا التبويب.',
                    'warning'
                );
                return;
            }
            coerciveSubjectRef.current = { id: row.id, name: row.name };
            if (['salary', 'property', 'vehicle'].includes(actionType)) {
                saveCoerciveActionRef.current(actionType, buildInitialExecutorSeizureDetails(actionType));
                return;
            }
            setShowCoerciveActionForm(actionType);
            return;
        }

        const sole = allDebtorsUnified[0];
        coerciveSubjectRef.current = sole
            ? { id: sole.id, name: sole.name }
            : {
                  id: '',
                  name: String((effectiveDebtors[0] as Debtor | undefined)?.name || 'المدين'),
              };
        if (['salary', 'property', 'vehicle'].includes(actionType)) {
            saveCoerciveActionRef.current(actionType, buildInitialExecutorSeizureDetails(actionType));
            return;
        }
        setShowCoerciveActionForm(actionType);
    };

    /** تفاصيل فارغة + وصف مبدئي — تُرسَل لمركز القرارات دون إظهار نافذة الحقول قبل موافقة المنفذ */
    const buildInitialExecutorSeizureDetails = (actionType: string): Record<string, string> => {
        const base =
            actionType === 'salary' && activeDebtorIsDeceased
                ? 'طلب حجز الحوافز والمخصصات (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.'
                : 'طلب حجز مبدئي — تُستكمل بيانات التنفيذ بعد موافقة منفذ العدل.';
        return {
            seizureUiKind: actionType,
            employerName: '',
            salaryAmount: '',
            propertyAddress: '',
            propertyLocation: '',
            vehicleDescription: '',
            vehiclePlate: '',
            movableAssetType: '',
            movableEstimatedValueIqd: '',
            movableNotes: '',
            description: base,
        };
    };

    // ✅ FIXED: Proper type for details
    const saveCoerciveAction = (actionType: string, details: Record<string, string>) => {
        setShowCoerciveActionForm(null);

        if (
            seizureDetailCompletion &&
            (actionType === 'salary' || actionType === 'property' || actionType === 'vehicle') &&
            seizureDetailCompletion.actionType === actionType
        ) {
            const { assetId, decisionRowId } = seizureDetailCompletion;
            setSeizureDetailCompletion(null);

            let mergedDesc = (details.description || '').trim();
            if (!mergedDesc && actionType === 'salary') {
                mergedDesc = `${activeDebtorIsDeceased ? 'جهة صرف الحوافز/المخصصات' : 'جهة العمل'}: ${details.employerName || ''}${details.salaryAmount ? `\nمقدار الدخل الشهري: ${details.salaryAmount}` : ''}`.trim();
            } else if (!mergedDesc && actionType === 'property') {
                mergedDesc = `عنوان العقار: ${details.propertyAddress || ''}\nموقع العقار: ${details.propertyLocation || ''}`.trim();
            } else if (!mergedDesc && actionType === 'vehicle') {
                mergedDesc = String(details.movableAssetType || details.vehicleDescription || '').trim();
            }

            const estMovable =
                actionType === 'vehicle'
                    ? Number(String(details.movableEstimatedValueIqd || '').replace(/,/g, '').trim())
                    : NaN;
            const movableNotes = actionType === 'vehicle' ? String(details.movableNotes || '').trim() : '';

            const nextAssets = seizedAssets.map((a) => {
                if (a.id !== assetId || String((a.details as Record<string, unknown>)?.decisionRowId) !== decisionRowId) {
                    return a;
                }
                const prevDetails =
                    typeof a.details === 'object' && a.details && !Array.isArray(a.details)
                        ? (a.details as Record<string, unknown>)
                        : {};
                return {
                    ...a,
                    description: mergedDesc || a.description,
                    estimatedValue:
                        actionType === 'vehicle' && Number.isFinite(estMovable) && estMovable > 0
                            ? estMovable
                            : a.estimatedValue,
                    notes: actionType === 'vehicle' && movableNotes ? movableNotes : a.notes,
                    details: {
                        ...prevDetails,
                        ...details,
                        decisionRowId,
                        seizureUiKind: actionType,
                    },
                };
            });
            setSeizedAssets(nextAssets);

            const today = getLocalTodayYmd();
            const now = new Date().toISOString();
            const titleAr =
                actionType === 'salary'
                    ? activeDebtorIsDeceased
                        ? '💼 تثبيت بيانات حجز الحوافز والمخصصات'
                        : '💼 تثبيت بيانات حجز الراتب'
                    : actionType === 'property'
                      ? '🏠 تثبيت بيانات حجز العقار'
                      : '📦 تثبيت بيانات حجز مال منقول';
            const descLines =
                actionType === 'vehicle'
                    ? [
                          mergedDesc ? `نوع المال المحجوز: ${mergedDesc}` : null,
                          Number.isFinite(estMovable) && estMovable > 0
                              ? `القيمة التقديرية: ${estMovable.toLocaleString('ar-IQ')} د.ع`
                              : null,
                          movableNotes ? `الملاحظات: ${movableNotes}` : null,
                      ]
                          .filter(Boolean)
                          .join('\n')
                    : mergedDesc;
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: titleAr,
                description: descLines || undefined,
                type: 'coercive',
                source: 'محضر المتابعة — الحجز المالي',
                metadata: {
                    timelineThreadKey: `seizure_details_saved:${assetId}`,
                    seizureAssetId: assetId,
                    decisionRowId,
                },
            };
            const nextTimeline = [ev, ...timelineEvents];
            setTimelineEvents(nextTimeline);

            const persistPatch: Record<string, unknown> = { seizedAssets: nextAssets, timelineEvents: nextTimeline };
            if (actionType === 'salary' && /\S/.test(String(details.salaryAmount || '').trim())) {
                const parsedSalary = Number(String(details.salaryAmount || '').replace(/,/g, '').trim());
                if (Number.isFinite(parsedSalary) && parsedSalary > 0) {
                    const garnishment = parsedSalary / 5;
                    if (activeWorkspaceDebtorForFollowup?.isPrimary) {
                        persistPatch.employeeSalary = parsedSalary;
                        persistPatch.garnishmentAmount = garnishment;
                    } else if (activeWorkspaceDebtorForFollowup?.key) {
                        const debtorKey = String(activeWorkspaceDebtorForFollowup.key);
                        persistPatch.perDebtorSalaries = {
                            ...(executionData?.perDebtorSalaries || {}),
                            [debtorKey]: String(parsedSalary),
                        };
                        persistPatch.perDebtorGarnishments = {
                            ...(executionData?.perDebtorGarnishments || {}),
                            [debtorKey]: String(garnishment),
                        };
                    }
                }
            }
            persistExecutionMerge(persistPatch);
            patchExecutorDecisionRow(decisionsStorageExecutionId, decisionRowId, {
                seizureRequestSavedAt: now,
                seizureRequestDetails: descLines || mergedDesc || undefined,
            });
            showToast('تم حفظ تفاصيل الحجز بعد موافقة المنفذ.', 'success');
            setLastActionDate(getLocalTodayYmd());
            return;
        }

        const actionLabels: Record<string, string> = {
            'salary': activeDebtorIsDeceased ? 'حجز المخصصات والمكافاة' : 'طلب حجز راتب',
            'property': 'طلب حجز عقار',
            'vehicle': 'طلب حجز مال منقول',
            'travel': 'منع سفر',
            'imprisonment': 'طلب حبس'
        };
        
        const now = new Date().toISOString();
        const label = actionLabels[actionType] || actionType;
        const isSeizureRequest = ['salary', 'property', 'vehicle'].includes(actionType);
        const salaryGarnishmentRoutingNote =
            actionType === 'salary' &&
            executionData?.garnishment_target === 'national_retirement_board'
                ? '\n\nوجهة قانونية إلزامية: هيئة التقاعد الوطنية (وليس جهة العمل السابقة).'
                : '';
        const subj = coerciveSubjectRef.current;
        const targetLead = subj.name
            ? `توجيه الإجراء ضد: ${subj.name}${subj.id ? ` (معرّف: ${subj.id})` : ''}. `
            : '';
        const descBase = targetLead + (details.description || '');
        const descWithRouting = descBase + salaryGarnishmentRoutingNote;

        let seizureDecisionId: string | null = null;
        if (isSeizureRequest) {
            const seizureBody = [
                `طلب ${label} بشأن المدين${subj.name ? ` (${subj.name})` : ''}.`,
                descWithRouting.trim() || null,
            ]
                .filter(Boolean)
                .join('\n');
            seizureDecisionId = appendPendingExecutorSeizureDecision({
                executionId: decisionsStorageExecutionId,
                requestTitle: `${label} — قيد البت لدى المنفذ`,
                requestBody: seizureBody,
            });
        }

        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: isSeizureRequest ? `📋 ${label} — قيد البت` : `⚖️ ${label}`,
            description: isSeizureRequest
                ? [`طلب ${label} بشأن المدين${subj.name ? ` (${subj.name})` : ''}.`, descWithRouting.trim() || null]
                      .filter(Boolean)
                      .join('\n')
                : `${label}.${descWithRouting ? ` ${descWithRouting}` : ''}`,
            type: 'coercive',
            source: 'التنفيذ والمحجوزات',
            metadata:
                seizureDecisionId != null
                    ? {
                          timelineThreadKey: `executor_decision:${seizureDecisionId}`,
                          decisionRowId: seizureDecisionId,
                      }
                    : undefined,
        };
        let nextDrafts = seizureDraftsByDecisionId;
        if (isSeizureRequest && seizureDecisionId) {
            const dayYmd = now.slice(0, 10);
            const detailsWithDecision: Record<string, string> = {
                ...details,
                decisionRowId: seizureDecisionId,
            };
            const newAsset: SeizedAsset = {
                id: `draft_${seizureDecisionId}`,
                type:
                    actionType === 'salary'
                        ? 'طلب حجز راتب (قيد البت)'
                        : actionType === 'vehicle'
                          ? 'طلب حجز مال منقول (قيد البت)'
                          : 'طلب حجز عقار (قيد البت)',
                details: detailsWithDecision,
                status: 'pending',
                seizureDate: dayYmd,
            };
            if (details.description?.trim()) {
                newAsset.description = details.description.trim();
            }
            nextDrafts = { ...seizureDraftsByDecisionId, [seizureDecisionId]: newAsset };
            setSeizureDraftsByDecisionId(nextDrafts);
        }
        const nextTimeline = [newEvent, ...timelineEvents];
        setTimelineEvents(nextTimeline);

        const persistPatch: Record<string, unknown> = { timelineEvents: nextTimeline };
        if (isSeizureRequest && seizureDecisionId) {
            persistPatch.seizureDraftsByDecisionId = nextDrafts;
        }
        if (actionType === 'salary' && /\S/.test(String(details.salaryAmount || '').trim())) {
            const parsedSalary = Number(String(details.salaryAmount || '').replace(/,/g, '').trim());
            if (Number.isFinite(parsedSalary) && parsedSalary > 0) {
                const garnishment = parsedSalary / 5;
                if (activeWorkspaceDebtorForFollowup?.isPrimary) {
                    persistPatch.employeeSalary = parsedSalary;
                    persistPatch.garnishmentAmount = garnishment;
                } else if (activeWorkspaceDebtorForFollowup?.key) {
                    const debtorKey = String(activeWorkspaceDebtorForFollowup.key);
                    persistPatch.perDebtorSalaries = {
                        ...(executionData?.perDebtorSalaries || {}),
                        [debtorKey]: String(parsedSalary),
                    };
                    persistPatch.perDebtorGarnishments = {
                        ...(executionData?.perDebtorGarnishments || {}),
                        [debtorKey]: String(garnishment),
                    };
                }
            }
        }
        persistExecutionMerge(persistPatch);

        const msgQueuedExecutor =
            'تم حفظ الطلب بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ';
        if (isSeizureRequest) {
            showToast(msgQueuedExecutor, 'success', { decisionsLink: true });
        } else {
            showToast(`تم تسجيل ${label}`, 'success');
        }
        setLastActionDate(getLocalTodayYmd());
    };
    saveCoerciveActionRef.current = saveCoerciveAction;

    const patchSeizedRowAndTimeline = (
        nextAssets: SeizedAsset[],
        ev: TimelineEvent,
        nextAc?: string[]
    ) => {
        setSeizedAssets(nextAssets);
        setTimelineEvents((prev) => {
            const nextTl = [ev, ...prev];
            const p: Record<string, unknown> = { seizedAssets: nextAssets, timelineEvents: nextTl };
            if (nextAc) {
                p.activeCoerciveActions = nextAc;
            }
            queueMicrotask(() => persistExecutionMerge(p));
            return nextTl;
        });
        if (nextAc) {
            setActiveCoerciveActions(nextAc);
        }
    };

    const releaseSeizureAssetRow = (asset: SeizedAsset) => {
        if (asset.seizure_record_locked) return;
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const key = seizureCoerciveKeyFromAssetType(asset);
        const nextAc = key ? activeCoerciveActions.filter((x) => x !== key) : activeCoerciveActions;
        const cleanedType = stripSeizureTypeDecorators(String(asset.type)) || String(asset.type);
        const nextAssets = seizedAssets.map((a) =>
            a.id === asset.id
                ? {
                      ...a,
                      type: cleanedType,
                      status: 'released',
                      seizure_record_locked: true,
                      released_at_ymd: today,
                  }
                : a
        );
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: today,
            timestamp: now,
            title: '🔓 فك حجز',
            description: `فك حجز مسجّل: ${cleanedType}${asset.description ? ` — ${asset.description}` : ''}`,
            type: 'coercive',
            source: 'محضر المتابعة — الحجز المالي',
            metadata: {
                timelineThreadKey: `seizure_release:${asset.id}`,
                seizureAssetId: asset.id,
            },
        };
        patchSeizedRowAndTimeline(nextAssets, ev, nextAc);
        showToast('تم فك الحجز وإزالة إشارة الحجز من المدين', 'success');
    };

    const undoReleaseSeizureAssetRow = (asset: SeizedAsset) => {
        if (!asset.seizure_record_locked || String(asset.status) !== 'released') return;
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const key = seizureCoerciveKeyFromAssetType(asset);
        const nextAc =
            key && !activeCoerciveActions.includes(key)
                ? [...activeCoerciveActions, key]
                : activeCoerciveActions;
        const cleanedType = stripSeizureTypeDecorators(String(asset.type)) || String(asset.type);
        const nextAssets = seizedAssets.map((a) =>
            a.id === asset.id
                ? {
                      ...a,
                      type: cleanedType,
                      status: 'seized',
                      seizure_record_locked: false,
                      released_at_ymd: null,
                  }
                : a
        );
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: today,
            timestamp: now,
            title: '↩️ تراجع عن فك الحجز',
            description: `إعادة تفعيل الحجز: ${cleanedType}${asset.description ? ` — ${asset.description}` : ''}`,
            type: 'coercive',
            source: 'محضر المتابعة — الحجز المالي',
            metadata: {
                timelineThreadKey: `seizure_release_undo:${asset.id}`,
                seizureAssetId: asset.id,
            },
        };
        patchSeizedRowAndTimeline(nextAssets, ev, nextAc);
        showToast('تم التراجع وإعادة تفعيل بطاقة الحجز', 'success');
    };

    const saveSeizureAuctionDate = (asset: SeizedAsset, ymd: string) => {
        const kind = String((asset.details as any)?.seizureUiKind || '').trim();
        if (kind === 'vehicle' && !asset.isMarkConfirmed) {
            showToast('لا يجوز تحديد المزايدة قبل تأييد وضع الإشارة من المرور.', 'warning');
            return;
        }
        if (asset.seizure_record_locked || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
            showToast('أدخل تاريخاً صحيحاً (YYYY-MM-DD)', 'warning');
            return;
        }
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const nextAssets = seizedAssets.map((a) =>
            a.id === asset.id ? { ...a, auction_date_ymd: ymd } : a
        );
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: today,
            timestamp: now,
            title: '📅 تاريخ المزايدة',
            description: `محجوز: ${String(asset.type)} — تاريخ المزايدة (YYYY-MM-DD): ${ymd}${asset.description ? ` — ${asset.description}` : ''}`,
            type: 'coercive',
            source: 'محضر المتابعة — الحجز المالي',
            metadata: {
                timelineThreadKey: `seizure_auction:${asset.id}`,
                seizureAssetId: asset.id,
                auctionDateYmd: ymd,
            },
        };
        patchSeizedRowAndTimeline(nextAssets, ev);
        setSeizureAuctionDateDraftById((p) => {
            const n = { ...p };
            delete n[asset.id];
            return n;
        });
        showToast('تم ربط تاريخ المزايدة بالسجل الزمني', 'success');
    };

    const beginSeizureSalePriceStep = (asset: SeizedAsset) => {
        if (asset.seizure_record_locked) return;
        const kind = String((asset.details as any)?.seizureUiKind || '').trim();
        if (kind === 'vehicle' && !asset.isMarkConfirmed) {
            showToast('لا يجوز الانتقال للبيع قبل تأييد وضع الإشارة من المرور.', 'warning');
            return;
        }
        const nextAssets = seizedAssets.map((a) =>
            a.id === asset.id
                ? {
                      ...a,
                      seizure_awaiting_sale_price: true,
                      seizure_sale_price_draft: a.seizure_sale_price_draft ?? '',
                  }
                : { ...a, seizure_awaiting_sale_price: false, seizure_sale_price_draft: undefined }
        );
        setSeizedAssets(nextAssets);
        persistExecutionMerge({ seizedAssets: nextAssets });
    };

    const updateSeizureSaleDraft = (assetId: string, v: string) => {
        const nextAssets = seizedAssets.map((a) =>
            a.id === assetId ? { ...a, seizure_sale_price_draft: v } : a
        );
        setSeizedAssets(nextAssets);
        persistExecutionMerge({ seizedAssets: nextAssets });
    };

    const cancelSeizureSalePriceStep = (asset: SeizedAsset) => {
        const nextAssets = seizedAssets.map((a) =>
            a.id === asset.id
                ? { ...a, seizure_awaiting_sale_price: false, seizure_sale_price_draft: undefined }
                : a
        );
        setSeizedAssets(nextAssets);
        persistExecutionMerge({ seizedAssets: nextAssets });
    };

    const patchSeizureMarkConfirmation = (
        assetId: string,
        patch: {
            isMarkConfirmed?: boolean;
            markConfirmationLetterNo?: string;
            markConfirmationLetterDateYmd?: string | null;
        }
    ) => {
        const nextAssets = seizedAssets.map((a) => (a.id === assetId ? { ...a, ...patch } : a));
        setSeizedAssets(nextAssets);
        persistExecutionMerge({ seizedAssets: nextAssets });
    };

    const confirmSeizureSaleWithPrice = (asset: SeizedAsset) => {
        const row = seizedAssets.find((a) => a.id === asset.id) ?? asset;
        if (row.seizure_record_locked) return;
        const kind = String((row.details as any)?.seizureUiKind || '').trim();
        if (kind === 'vehicle' && !row.isMarkConfirmed) {
            showToast('لا يجوز إتمام البيع قبل تأييد وضع الإشارة من المرور.', 'warning');
            return;
        }
        const price = (row.seizure_sale_price_draft || '').trim();
        if (!price) {
            showToast('أدخل سعر البيع بالدينار', 'warning');
            return;
        }
        const parsedPrice = Number(price.replace(/,/g, '').trim());
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            showToast('أدخل مبلغ بيع صحيح', 'warning');
            return;
        }
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const key = seizureCoerciveKeyFromAssetType(row);
        const nextAc = key ? activeCoerciveActions.filter((x) => x !== key) : activeCoerciveActions;
        const nextAssets = seizedAssets.map((a) =>
            a.id === row.id
                ? {
                      ...a,
                      status: 'sold',
                      seizure_record_locked: true,
                      sale_price_iqd: price,
                      seizure_awaiting_sale_price: false,
                      seizure_sale_price_draft: undefined,
                  }
                : a
        );
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: today,
            timestamp: now,
            title: '✅ تمت المزايدة — إتمام البيع',
            description: `المحجوز: ${String(row.type)} — السعر: ${price} د.ع${row.description ? ` — ${row.description}` : ''}`,
            type: 'payment',
            source: 'محضر المتابعة — الحجز المالي',
            metadata: {
                timelineThreadKey: `seizure_sold:${row.id}`,
                seizureAssetId: row.id,
                salePriceIqd: price,
            },
        };
        patchSeizedRowAndTimeline(nextAssets, ev, nextAc);
        const remainingBefore = Math.max(
            0,
            totalWithExecutionFee - (paidDebtRef.current + paidCourtFees + paidDirectorateFees + paidClientFees)
        );
        const applyAmount = Math.min(parsedPrice, remainingBefore);
        if (applyAmount > 0) {
            handleFundsLedgerPayment({
                amount: applyAmount,
                kind: applyAmount >= remainingBefore ? 'full' : 'partial',
                description: 'حصيلة بيع مال منقول',
            });
        }
        showToast('تم تسجيل البيع وقفل السجل', 'success');
    };

    const saveRealEstateAuctionDate = (asset: RealEstateSeizureAsset, ymd: string) => {
        if (!asset.isMarkConfirmed) {
            showToast('لا يجوز تحديد المزايدة قبل تأييد وضع الإشارة من الطابو.', 'warning');
            return;
        }
        if (asset.record_locked || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
            showToast('أدخل تاريخاً صحيحاً (YYYY-MM-DD)', 'warning');
            return;
        }
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const nextAssets = realEstateSeizureSnapshotRef.current.map((a) =>
            a.id === asset.id ? { ...a, auction_date_ymd: ymd } : a
        );
        setRealEstateSeizureAssets(nextAssets);
        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: '📅 تحديد موعد المزايدة — حجز عقار',
                description: `العقار: ${asset.propertyNoAndDistrict} — تاريخ المزايدة: ${ymd}`,
                type: 'coercive',
                source: 'محضر المتابعة — الحجز العقاري',
                metadata: {
                    timelineThreadKey: `real_estate_auction:${asset.id}`,
                    realEstateAssetId: asset.id,
                    auctionDateYmd: ymd,
                },
            },
            { mergePatch: { realEstateSeizureAssets: nextAssets } }
        );
        setRealEstateAuctionDateDraftById((p) => {
            const n = { ...p };
            delete n[asset.id];
            return n;
        });
        showToast('تم ربط تاريخ المزايدة بالسجل الزمني', 'success');
    };

    const patchRealEstateMarkConfirmation = (
        assetId: string,
        patch: {
            isMarkConfirmed?: boolean;
            markConfirmationLetterNo?: string;
            markConfirmationLetterDateYmd?: string | null;
        }
    ) => {
        const nextAssets = realEstateSeizureSnapshotRef.current.map((a) =>
            a.id === assetId ? { ...a, ...patch } : a
        );
        setRealEstateSeizureAssets(nextAssets);
        persistExecutionMerge({ realEstateSeizureAssets: nextAssets });
    };

    const beginRealEstateSalePriceStep = (asset: RealEstateSeizureAsset) => {
        if (asset.record_locked) return;
        if (!asset.isMarkConfirmed) {
            showToast('لا يجوز الانتقال للبيع قبل تأييد وضع الإشارة من الطابو.', 'warning');
            return;
        }
        const nextAssets = realEstateSeizureSnapshotRef.current.map((a) =>
            a.id === asset.id
                ? { ...a, awaiting_sale_price: true, sale_price_draft: a.sale_price_draft ?? '' }
                : { ...a, awaiting_sale_price: false, sale_price_draft: '' }
        );
        setRealEstateSeizureAssets(nextAssets);
        persistExecutionMerge({ realEstateSeizureAssets: nextAssets });
    };

    const updateRealEstateSaleDraft = (assetId: string, v: string) => {
        const nextAssets = realEstateSeizureSnapshotRef.current.map((a) =>
            a.id === assetId ? { ...a, sale_price_draft: v } : a
        );
        setRealEstateSeizureAssets(nextAssets);
        persistExecutionMerge({ realEstateSeizureAssets: nextAssets });
    };

    const cancelRealEstateSalePriceStep = (asset: RealEstateSeizureAsset) => {
        const nextAssets = realEstateSeizureSnapshotRef.current.map((a) =>
            a.id === asset.id ? { ...a, awaiting_sale_price: false, sale_price_draft: '' } : a
        );
        setRealEstateSeizureAssets(nextAssets);
        persistExecutionMerge({ realEstateSeizureAssets: nextAssets });
    };

    const confirmRealEstateSaleWithPrice = (asset: RealEstateSeizureAsset) => {
        const row = realEstateSeizureSnapshotRef.current.find((a) => a.id === asset.id) ?? asset;
        if (row.record_locked) return;
        if (!row.isMarkConfirmed) {
            showToast('لا يجوز إتمام البيع قبل تأييد وضع الإشارة من الطابو.', 'warning');
            return;
        }
        const price = String(row.sale_price_draft || '').trim();
        if (!price) {
            showToast('أدخل سعر البيع النهائي بالدينار', 'warning');
            return;
        }
        const parsedPrice = Number(price.replace(/,/g, '').trim());
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            showToast('أدخل مبلغ بيع صحيح', 'warning');
            return;
        }
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const nextAssets = realEstateSeizureSnapshotRef.current.map((a) =>
            a.id === row.id
                ? {
                      ...a,
                      status: 'sold' as const,
                      record_locked: true,
                      sale_price_iqd: price,
                      awaiting_sale_price: false,
                      sale_price_draft: '',
                  }
                : a
        );
        setRealEstateSeizureAssets(nextAssets);

        const currentDossierAmount = Number(executionDataRef.current?.debtAmount ?? 0);
        const nextDossierAmount = computeNewDossierAmountAfterRealEstateSale({
            currentDossierAmount,
            salePriceIqd: parsedPrice,
        });

        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: '🏛️ تم البيع والإحالة القطعية — حجز عقار',
                description: `العقار: ${row.propertyNoAndDistrict} — سعر البيع النهائي: ${price} د.ع\nمبلغ الإضبارة الجديد: ${nextDossierAmount.toLocaleString('ar-IQ')} د.ع`,
                type: 'payment',
                source: 'محضر المتابعة — الحجز العقاري',
                metadata: {
                    timelineThreadKey: `real_estate_sold:${row.id}`,
                    realEstateAssetId: row.id,
                    salePriceIqd: price,
                    newDossierAmount: String(nextDossierAmount),
                },
            },
            {
                mergePatch: {
                    realEstateSeizureAssets: nextAssets,
                    debtAmount: nextDossierAmount,
                },
            }
        );
        showToast('تم تسجيل البيع وقفل البطاقة وتحديث مبلغ الإضبارة', 'success');
    };

    const archiveRealEstateSeizureRow = (asset: RealEstateSeizureAsset) => {
        if (asset.record_locked) return;
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const nextAssets = realEstateSeizureSnapshotRef.current.map((a) =>
            a.id === asset.id
                ? { ...a, status: 'archived' as const, record_locked: true, archived_at_ymd: today }
                : a
        );
        setRealEstateSeizureAssets(nextAssets);
        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: '🔓 فك حجز عقار (أرشفة)',
                description: `فك/أرشفة بطاقة حجز العقار: ${asset.propertyNoAndDistrict}`,
                type: 'coercive',
                source: 'محضر المتابعة — الحجز العقاري',
                metadata: {
                    timelineThreadKey: `real_estate_archive:${asset.id}`,
                    realEstateAssetId: asset.id,
                },
            },
            { mergePatch: { realEstateSeizureAssets: nextAssets } }
        );
        showToast('تم فك الحجز وأرشفة البطاقة', 'success');
    };

    const undoArchiveRealEstateSeizureRow = (asset: RealEstateSeizureAsset) => {
        if (!asset.record_locked || String(asset.status) !== 'archived') return;
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const nextAssets = realEstateSeizureSnapshotRef.current.map((a) =>
            a.id === asset.id
                ? { ...a, status: 'seized' as const, record_locked: false, archived_at_ymd: null }
                : a
        );
        setRealEstateSeizureAssets(nextAssets);
        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: '↩️ تراجع عن فك حجز عقار',
                description: `إعادة تفعيل بطاقة حجز العقار: ${asset.propertyNoAndDistrict}`,
                type: 'coercive',
                source: 'محضر المتابعة — الحجز العقاري',
                metadata: {
                    timelineThreadKey: `real_estate_archive_undo:${asset.id}`,
                    realEstateAssetId: asset.id,
                },
            },
            { mergePatch: { realEstateSeizureAssets: nextAssets } }
        );
        showToast('تم التراجع وإعادة تفعيل البطاقة', 'success');
    };

    const beginThirdPartyReceiveStep = (asset: ThirdPartySeizureAsset) => {
        if (asset.record_locked) return;
        const nextAssets = thirdPartySeizureSnapshotRef.current.map((a) =>
            a.id === asset.id
                ? {
                      ...a,
                      awaiting_receive: true,
                      receive_amount_draft: a.receive_amount_draft ?? '',
                  }
                : { ...a, awaiting_receive: false, receive_amount_draft: '' }
        );
        setThirdPartySeizureAssets(nextAssets);
        persistExecutionMerge({ thirdPartySeizureAssets: nextAssets });
    };

    const updateThirdPartyReceiveDraft = (assetId: string, v: string) => {
        const nextAssets = thirdPartySeizureSnapshotRef.current.map((a) =>
            a.id === assetId ? { ...a, receive_amount_draft: v } : a
        );
        setThirdPartySeizureAssets(nextAssets);
        persistExecutionMerge({ thirdPartySeizureAssets: nextAssets });
    };

    const cancelThirdPartyReceiveStep = (asset: ThirdPartySeizureAsset) => {
        const nextAssets = thirdPartySeizureSnapshotRef.current.map((a) =>
            a.id === asset.id ? { ...a, awaiting_receive: false, receive_amount_draft: '' } : a
        );
        setThirdPartySeizureAssets(nextAssets);
        persistExecutionMerge({ thirdPartySeizureAssets: nextAssets });
    };

    const confirmThirdPartyReceive = (asset: ThirdPartySeizureAsset) => {
        const row = thirdPartySeizureSnapshotRef.current.find((a) => a.id === asset.id) ?? asset;
        if (row.record_locked) return;
        const amtRaw = String(row.receive_amount_draft || '').trim();
        if (!amtRaw) {
            showToast('أدخل المبلغ الفعلي المستلم', 'warning');
            return;
        }
        const parsed = Number(amtRaw.replace(/,/g, '').trim());
        if (!Number.isFinite(parsed) || parsed <= 0) {
            showToast('أدخل مبلغاً صحيحاً', 'warning');
            return;
        }
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const nextAssets = thirdPartySeizureSnapshotRef.current.map((a) =>
            a.id === row.id
                ? {
                      ...a,
                      status: 'received' as const,
                      record_locked: true,
                      actualReceivedAmountIqd: parsed,
                      received_at_iso: now,
                      archived_at_ymd: today,
                      awaiting_receive: false,
                      receive_amount_draft: '',
                  }
                : a
        );
        setThirdPartySeizureAssets(nextAssets);
        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: '💰 استلام أموال محجوزة لدى الغير',
                description: `الجهة: ${row.thirdPartyName}\nالمبلغ المستلم: ${parsed.toLocaleString('ar-IQ')} د.ع`,
                type: 'payment',
                source: 'محضر المتابعة — حجز لدى الغير',
                metadata: {
                    timelineThreadKey: `third_party_received:${row.id}`,
                    thirdPartyAssetId: row.id,
                    actualReceivedAmountIqd: String(parsed),
                },
            },
            { mergePatch: { thirdPartySeizureAssets: nextAssets } }
        );
        handleFundsLedgerPayment({
            amount: parsed,
            kind: 'partial',
            description: 'استلام أموال محجوزة لدى الغير',
        });
        showToast('تم تسجيل الاستلام وتحديث سجل الدفعات', 'success');
    };

    const patchStandaloneExecutionMark = (
        markId: string,
        patch: Partial<StandaloneExecutionMark>
    ) => {
        const nextMarks = standaloneExecutionMarksSnapshotRef.current.map((m) =>
            m.id === markId ? { ...m, ...patch } : m
        );
        setStandaloneExecutionMarks(nextMarks);
        persistExecutionMerge({ standaloneExecutionMarks: nextMarks });
    };

    const toggleStandaloneExecutionMarkConfirmed = (mark: StandaloneExecutionMark) => {
        if (mark.record_locked || mark.status === 'archived') return;
        const next = !Boolean(mark.isMarkConfirmed);
        const nextMarks = standaloneExecutionMarksSnapshotRef.current.map((m) =>
            m.id === mark.id ? { ...m, isMarkConfirmed: next } : m
        );
        setStandaloneExecutionMarks(nextMarks);
        persistExecutionMerge({ standaloneExecutionMarks: nextMarks });
        const now = new Date().toISOString();
        const today = getLocalTodayYmd();
        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: next ? '📌 تم وضع الشارة رسمياً' : '📌 إعادة الشارة إلى بانتظار التأييد',
                description: `النوع: ${mark.markType}\nالجهة: ${mark.targetEntity}`,
                type: 'coercive',
                source: 'محضر المتابعة — الشارة التنفيذية',
                metadata: {
                    timelineThreadKey: `standalone_mark_toggle:${mark.id}`,
                    markId: mark.id,
                },
            },
            { mergePatch: { standaloneExecutionMarks: nextMarks } }
        );
    };

    const archiveStandaloneExecutionMark = (mark: StandaloneExecutionMark) => {
        if (mark.record_locked || mark.status === 'archived') return;
        const today: string = getLocalTodayYmd();
        const now = new Date().toISOString();
        const nextMarks = standaloneExecutionMarksSnapshotRef.current.map((m) =>
            m.id === mark.id
                ? {
                      ...m,
                      status: 'archived' as const,
                      record_locked: true,
                      archived_at_ymd: today,
                  }
                : m
        );
        setStandaloneExecutionMarks(nextMarks);
        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: '📌 رفع الشارة/التعميم',
                description: `النوع: ${mark.markType}\nالجهة: ${mark.targetEntity}`,
                type: 'coercive',
                source: 'محضر المتابعة — الشارة التنفيذية',
                metadata: {
                    timelineThreadKey: `standalone_mark_archive:${mark.id}`,
                    markId: mark.id,
                },
            },
            { mergePatch: { standaloneExecutionMarks: nextMarks } }
        );
        persistExecutionMerge({ standaloneExecutionMarks: nextMarks });
        showToast('تم رفع الشارة/التعميم وأرشفتها', 'success');
    };

    const undoArchiveStandaloneExecutionMark = (mark: StandaloneExecutionMark) => {
        if (!mark.record_locked || mark.status !== 'archived') return;
        const today: string = getLocalTodayYmd();
        const now = new Date().toISOString();
        const nextMarks = standaloneExecutionMarksSnapshotRef.current.map((m) =>
            m.id === mark.id
                ? {
                      ...m,
                      status: 'active' as const,
                      record_locked: false,
                      archived_at_ymd: null,
                  }
                : m
        );
        setStandaloneExecutionMarks(nextMarks);
        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: '📌 تراجع عن رفع الشارة/التعميم',
                description: `النوع: ${mark.markType}\nالجهة: ${mark.targetEntity}`,
                type: 'coercive',
                source: 'محضر المتابعة — الشارة التنفيذية',
                metadata: {
                    timelineThreadKey: `standalone_mark_undo:${mark.id}`,
                    markId: mark.id,
                },
            },
            { mergePatch: { standaloneExecutionMarks: nextMarks } }
        );
        persistExecutionMerge({ standaloneExecutionMarks: nextMarks });
    };

    const editSeizureDescription = (asset: SeizedAsset) => {
        const raw =
            typeof window !== 'undefined'
                ? window.prompt('وصف / نوع المال المحجوز:', asset.description || '')
                : null;
        if (raw === null) return;
        const nextAssets = seizedAssets.map((a) =>
            a.id === asset.id ? { ...a, description: raw.trim() } : a
        );
        setSeizedAssets(nextAssets);
        persistExecutionMerge({ seizedAssets: nextAssets });
        showToast('تم حفظ الوصف', 'success');
    };

    const updateSeizedAssetStatus = (assetId: string, status: SeizedAsset['status']) => {
        const nextAssets = seizedAssets.map((a) => (a.id === assetId ? { ...a, status } : a));
        setSeizedAssets(nextAssets);
        persistExecutionMerge({ seizedAssets: nextAssets });
    };

    const deleteSeizureRow = (asset: SeizedAsset) => {
        if (asset.seizure_record_locked) {
            showToast('سجل مقفول — لا يُحذف', 'warning');
            return;
        }
        if (typeof window !== 'undefined' && !window.confirm('حذف هذا الصف من قائمة المحجوزات؟')) return;
        const nextAssets = seizedAssets.filter((a) => a.id !== asset.id);
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: today,
            timestamp: now,
            title: '🗑️ حذف صف من قائمة المحجوزات',
            description: `أُزيل: ${String(asset.type)}`,
            type: 'coercive',
            source: 'محضر المتابعة — الحجز المالي',
        };
        const nextTl = [ev, ...timelineEvents];
        setSeizedAssets(nextAssets);
        setTimelineEvents(nextTl);
        persistExecutionMerge({ seizedAssets: nextAssets, timelineEvents: nextTl });
        showToast('تم الحذف', 'success');
    };
    
    // ✅ CONDITIONAL RENDERING: Show loading/error states first
    if (isLoading) {
        return <ExecutionDashboardSkeleton />;
    }
    
    if (loadError || !executionData) {
        return (
            <div className="fixed inset-0 bg-[#000000] z-[100] flex items-center justify-center">
                <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-8 max-w-md text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-red-500 mb-3">خطأ في التحميل</h3>
                    <p className="text-gray-300 mb-6">{loadError || 'لم يتم العثور على بيانات التنفيذ'}</p>
                    <button
                        onClick={onClose}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div
            className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 backdrop-blur-3xl z-[100] flex items-center justify-center p-0"
            dir="rtl"
        >
            
            <ExecutionToast
                visible={toastVisible}
                message={toastMessage}
                type={toastType}
                action={toastAction}
                epoch={toastEpoch}
                onClose={hideToast}
                zIndex={EXEC_MODAL_Z.toastAboveExecution}
            />

            {import.meta.env.DEV || import.meta.env.MODE === 'test' ? (
                <Suspense fallback={null}>
                    <ExecutionDashboardModularHost
                        key={`modular-${executionData.id}`}
                        executionData={executionData as ExecutionFile}
                        onClose={onClose}
                        creditorsRows={effectiveCreditors}
                        debtorsRows={effectiveDebtors}
                        timelineEvents={
                            debtorBrowserTabsMode
                                ? activeTimelineEventsDebtorScoped
                                : activeTimelineEvents
                        }
                        financialLedger={financialLedger}
                        totalAmount={totalOwed}
                        paidAmount={paidDebt}
                        remainingAmount={Math.max(0, totalOwed - paidDebt)}
                        isHeaderExpanded={isHeaderExpanded}
                        onToggleHeaderExpand={toggleHeaderExpanded}
                        setShowPaymentModal={stableSetShowPaymentModal}
                        setShowNotificationModal={stableSetShowNotificationModal}
                        setShowDocumentsModal={stableSetShowDocumentsModal}
                        setShowAppointmentModal={stableSetShowAppointmentModal}
                        setShowPaymentCalculator={stableSetShowPaymentCalculator}
                    />
                </Suspense>
            ) : null}
            
            {/* MODALS */}

            <EditDossierMetaModal
                showEditDossierMetaModal={showEditDossierMetaModal}
                setShowEditDossierMetaModal={setShowEditDossierMetaModal}
                dossierMetaDraft={dossierMetaDraft}
                setDossierMetaDraft={setDossierMetaDraft}
                isEvictionExecutionModule={isEvictionExecutionModule}
                saveDossierMetaDraft={saveDossierMetaDraft}
                dossierStatusDraft={dossierStatusDraft}
                setDossierStatusDraft={setDossierStatusDraft}
                dossierReasonDraft={dossierReasonDraft}
                setDossierReasonDraft={setDossierReasonDraft}
                dossierDateDraft={dossierDateDraft}
                setDossierDateDraft={setDossierDateDraft}
                dossierLifecycleLabelAr={dossierLifecycleLabelAr}
            />

            {editPartyTarget && partyEditDraft ? (
                <div
                    className="fixed inset-0 z-[125] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
                    dir="rtl"
                    onClick={() => {
                        setEditPartyTarget(null);
                        setPartyEditDraft(null);
                    }}
                    role="presentation"
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-slate-600/40 bg-[#0A0F1C] p-4 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white">
                                تعديل {editPartyTarget.kind === 'creditor' ? 'الدائن' : 'المدين'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditPartyTarget(null);
                                    setPartyEditDraft(null);
                                }}
                                className="rounded-lg p-2 text-slate-400 hover:bg-white/10"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-3 text-right">
                            <div>
                                <label className="mb-1 block text-[10px] text-slate-500">الاسم</label>
                                <input
                                    type="text"
                                    value={partyEditDraft.name}
                                    onChange={(e) =>
                                        setPartyEditDraft((d) => (d ? { ...d, name: e.target.value } : d))
                                    }
                                    disabled={partyEditDraft.lockBaseInfo}
                                    className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-2 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-[10px] text-slate-500">الهاتف</label>
                                <input
                                    type="text"
                                    value={partyEditDraft.phone}
                                    onChange={(e) =>
                                        setPartyEditDraft((d) => (d ? { ...d, phone: e.target.value } : d))
                                    }
                                    disabled={partyEditDraft.lockBaseInfo}
                                    className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-2 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-[10px] text-slate-500">العنوان</label>
                                <textarea
                                    value={partyEditDraft.address}
                                    onChange={(e) =>
                                        setPartyEditDraft((d) => (d ? { ...d, address: e.target.value } : d))
                                    }
                                    disabled={partyEditDraft.lockBaseInfo}
                                    rows={2}
                                    className="w-full resize-none rounded-lg border border-white/10 bg-slate-900/80 px-2 py-2 text-sm text-white"
                                />
                            </div>
                            {partyEditDraft.lockBaseInfo ? (
                                <p className="text-[10px] text-amber-300/90">
                                    {editPartyTarget.kind === 'creditor'
                                        ? getCreditorHeirSubstitutionRequestStatus(decisionsStorageExecutionId) ===
                                          'approved'
                                        : getDebtorHeirSubstitutionRequestStatus(decisionsStorageExecutionId) ===
                                          'approved'
                                          ? 'بيانات المتوفى (الاسم/الهاتف/العنوان) مقفلة. يمكن تعديل بيانات الورثة المعتمدة من المنفذ فقط.'
                                          : 'بيانات المتوفى مقفلة. تفاصيل الورثة تظهر هنا فقط بعد موافقة المنفذ العدل على طلب الإحلال.'}
                                </p>
                            ) : null}
                            <div>
                                {partyEditDraft.heirs.length > 0 ? (
                                    <>
                                        <div className="mb-1 flex items-center justify-between">
                                            <label className="block text-[10px] text-slate-500">
                                                أسماء الورثة
                                            </label>
                                        </div>
                                        <div className="space-y-1.5">
                                            {partyEditDraft.heirs.map((heir, heirIdx) => {
                                                const canDeleteHeirRow =
                                                    partyEditDraft.heirs.length > 1 ||
                                                    heirRowHasAnyText(heir);
																			return (
																			<div
																				key={heir.rowId || heirIdx}
                                                        className="grid grid-cols-1 gap-1.5 rounded-lg border border-white/10 bg-slate-900/35 p-2"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-[10px] font-semibold text-slate-400">
                                                                وارث {heirIdx + 1}
                                                            </span>
                                                            <div className="flex shrink-0 items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => togglePartyEditHeirClient(heirIdx)}
                                                                    className={`rounded-lg border px-2 py-1 text-[9px] font-extrabold transition ${
                                                                        heir.isClient
                                                                            ? 'border-[#E6C673]/55 bg-[#E6C673]/15 text-[#E6C673]'
                                                                            : 'border-white/15 bg-slate-950/40 text-slate-400 hover:border-[#E6C673]/35 hover:text-[#E6C673]/90'
                                                                    }`}
                                                                    title={
                                                                        heir.isClient
                                                                            ? 'إلغاء وكالة الموكل عن هذا الوارث'
                                                                            : 'تعيين هذا الوارث موكلًا (★)'
                                                                    }
                                                                    aria-pressed={Boolean(heir.isClient)}
                                                                    aria-label={
                                                                        heir.isClient
                                                                            ? 'إلغاء علامة الموكل'
                                                                            : 'علامة الموكل'
                                                                    }
                                                                >
                                                                    {heir.isClient ? '★ موكلي' : 'موكلي'}
                                                                </button>
                                                                {canDeleteHeirRow ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setPartyEditHeirDeleteConfirmIdx(heirIdx)
                                                                        }
                                                                        className="rounded-lg p-1.5 text-rose-400 transition hover:bg-rose-950/40 hover:text-rose-300"
                                                                        title="حذف الوريث"
                                                                        aria-label="حذف الوريث"
                                                                    >
                                                                        <Trash2 size={16} strokeWidth={2} />
                                                                    </button>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                        {partyEditHeirDeleteConfirmIdx === heirIdx ? (
                                                            <div className="rounded-lg border border-rose-500/35 bg-rose-950/25 p-2 text-[10px] leading-relaxed text-rose-100">
                                                                <p>
                                                                    تحذير: حذف هذا الوريث من القائمة بعد الضغط على
                                                                    «حفظ» يعني أن أي تعديل جوهري على ذمة الورثة
                                                                    المعتمدة يتطلّب تقديم طلب إحلال جديد إلى المنفذ
                                                                    العدل.
                                                                </p>
                                                                <div className="mt-2 flex flex-row-reverse flex-wrap justify-end gap-2">
                                                                    <button
                                                                        type="button"
                                                                        className="rounded-lg bg-rose-700/85 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-rose-600/90"
                                                                        onClick={() =>
                                                                            removeHeirFromPartyEditDraftAtIndex(
                                                                                heirIdx
                                                                            )
                                                                    >
                                                                        تأكيد الحذف
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="rounded-lg border border-slate-500/60 px-3 py-1.5 text-[10px] font-bold text-slate-200 hover:bg-slate-800/80"
                                                                        onClick={() =>
                                                                            setPartyEditHeirDeleteConfirmIdx(null)
                                                                        }
                                                                    >
                                                                        إلغاء
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                        <input
                                                            type="text"
                                                            value={heir.name}
                                                            onChange={(e) =>
                                                                setPartyEditDraft((d) => {
																							if (!d) return d;
																							const next = [...d.heirs];
																							if (next.length === 0) {
																								next.push({
																									rowId: makeHeirRowId(),
																									name: '',
																									phone: '',
																									address: '',
																									isClient: false,
																								});
																							}
                                                                    next[heirIdx] = {
                                                                        ...next[heirIdx],
                                                                        name: e.target.value,
                                                                    };
                                                                    return { ...d, heirs: next };
                                                                })
                                                            }
                                                            placeholder="اسم الوارث..."
                                                            className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-2 text-sm text-white"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={heir.phone}
                                                            onChange={(e) =>
                                                                setPartyEditDraft((d) => {
                                                                    if (!d) return d;
                                                                    const next = [...d.heirs];
                                                                    next[heirIdx] = {
                                                                        ...next[heirIdx],
                                                                        phone: e.target.value,
                                                                    };
                                                                    return { ...d, heirs: next };
                                                                })
                                                            }
                                                            placeholder="هاتف الوارث..."
                                                            className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-2 text-sm text-white"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={heir.address}
                                                            onChange={(e) =>
                                                                setPartyEditDraft((d) => {
                                                                    if (!d) return d;
                                                                    const next = [...d.heirs];
                                                                    next[heirIdx] = {
                                                                        ...next[heirIdx],
                                                                        address: e.target.value,
                                                                    };
                                                                    return { ...d, heirs: next };
                                                                })
                                                            }
                                                            placeholder="عنوان الوارث..."
                                                            className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-2 text-sm text-white"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : null}
                            </div>
                            <button
                                type="button"
                                onClick={savePartyEditDraft}
                                className="w-full rounded-lg bg-emerald-800/80 py-2.5 text-sm font-bold text-white hover:bg-emerald-700/90"
                            >
                                حفظ
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {permanentDeleteTimelineId ? (
                <div
                    className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
                    dir="rtl"
                    onClick={() => setPermanentDeleteTimelineId(null)}
                    role="presentation"
                >
                    <div
                        className="w-full max-w-sm rounded-xl border border-rose-500/40 bg-[#0A0F1C] p-4 text-right shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                        role="alertdialog"
                    >
                        <p className="text-sm font-bold text-white">تأكيد الحذف النهائي</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-rose-200/90">
                            سيتم إزالة هذا السجل من الإضبارة نهائياً ولا يمكن استرجاعه. هل أنت متأكد؟
                        </p>
                        <div className="mt-4 flex flex-row-reverse flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPermanentDeleteTimelineId(null)}
                                className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (permanentDeleteTimelineId) {
                                        permanentlyDeleteTimelineEvent(permanentDeleteTimelineId);
                                    }
                                }}
                                className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white hover:bg-rose-600"
                            >
                                حذف نهائياً
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* 🆕 V16: HYBRID NOTES/TASK ENGINE MODAL */}
            {/* 🆕 V16: HYBRID NOTES/TASK ENGINE MODAL */}
            {showNotesModal && (
                <NotesModal
                    showNotesModal={showNotesModal}
                    setShowNotesModal={setShowNotesModal}
                    noteTitle={noteTitle}
                    setNoteTitle={setNoteTitle}
                    noteBody={noteBody}
                    setNoteBody={setNoteBody}
                    isTask={isTask}
                    setIsTask={setIsTask}
                    taskDueDate={taskDueDate}
                    setTaskDueDate={setTaskDueDate}
                    taskStatus={taskStatus}
                    setTaskStatus={setTaskStatus}
                    editingTaskId={editingTaskId}
                    setEditingTaskId={setEditingTaskId}
                    savedNotesView={savedNotesView}
                    setSavedNotesView={setSavedNotesView}
                    activeCaseTasksPending={activeCaseTasksPending}
                    savedNotes={activeCaseTasksPendingAll}
                    handleSaveNote={handleSaveNote}
                    moveCaseNoteToTrash={moveCaseNoteToTrash}
                    moveCaseTaskToTrash={moveCaseTaskToTrash}
                    beginEditPendingTask={beginEditPendingTask}
                    completePendingTask={completePendingTask}
                    findApprovedBreakInventoryNeedingLedger={findApprovedBreakInventoryNeedingLedger}
                    decisionsStorageExecutionId={decisionsStorageExecutionId}
                    patchExecutorDecisionRow={patchExecutorDecisionRow}
                    showToast={showToast}
                />
            )}
            {showAppointmentModal && (
                <AppointmentModal
                    showAppointmentModal={showAppointmentModal}
                    setShowAppointmentModal={setShowAppointmentModal}
                    editingAppointmentId={editingAppointmentId}
                    setEditingAppointmentId={setEditingAppointmentId}
                    appointmentPurpose={appointmentPurpose}
                    setAppointmentPurpose={setAppointmentPurpose}
                    appointmentDateOnly={appointmentDateOnly}
                    setAppointmentDateOnly={setAppointmentDateOnly}
                    appointmentTimeOptional={appointmentTimeOptional}
                    setAppointmentTimeOptional={setAppointmentTimeOptional}
                    handleSaveAppointment={handleSaveAppointment}
                    timelineEvents={timelineEvents}
                    todayYmd={todayYmd}
                    moveTimelineEventToTrash={moveTimelineEventToTrash}
                />
            )}

            {typeof document !== 'undefined' &&
                executorScheduleModalOpen &&
                    <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                        <LazyExecutorApprovedDateTimeModal
                            open
                            requestTitle={executorScheduleContext?.requestTitle ?? ''}
                            onClose={() => {
                                setExecutorScheduleModalOpen(false);
                                setExecutorScheduleContext(null);
                            }}
                            onConfirm={(payload) => {
                                executorScheduleContext?.onSaved(payload);
                            }}
                        />
                    </Suspense>,
                    document.body
                )}

            {typeof document !== 'undefined' &&
                policeAssistanceModalOpen &&
                    <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                        <PoliceAssistanceDetailsModal
                            open
                            requestTitle={policeAssistanceRequestTitle || 'القوة الجبرية'}
                            initialAgencyName={policeAssistanceAgencyDraft}
                            onClose={() => {
                                setPoliceAssistanceModalOpen(false);
                                setPoliceAssistanceDecisionId(null);
                                setPoliceAssistanceRequestTitle('');
                                setPoliceAssistanceAgencyDraft('');
                            }}
                            onConfirm={({ agencyName }) => {
                                savePoliceAssistanceFromModal(agencyName);
                            }}
                        />
                    </Suspense>,
                    document.body
                )}

            {typeof document !== 'undefined' &&
                breakInventoryFurnitureModalOpen &&
                    <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                        <LazyExecutorBreakInventoryFurnitureModal
                            open
                            requestTitle={breakInventoryFurnitureModalCtx?.requestTitle ?? ''}
                            onClose={() => {
                                setBreakInventoryFurnitureModalOpen(false);
                                setBreakInventoryFurnitureModalCtx(null);
                            }}
                            onConfirm={(payload) => {
                                breakInventoryFurnitureModalCtx?.onSaved(payload);
                            }}
                            onFinalize={() => {
                                breakInventoryFurnitureModalCtx?.onFinalize();
                            }}
                        />
                    </Suspense>,
                    document.body
                )}

            {typeof document !== 'undefined' &&
                judicialCustodianModalOpen &&
                    <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                        <LazyExecutorJudicialCustodianModal
                            open
                            requestTitle={judicialCustodianModalCtx?.requestTitle ?? ''}
                            initialName={judicialCustodianModalCtx?.initialName}
                            initialSalary={judicialCustodianModalCtx?.initialSalary}
                            onClose={() => {
                                setJudicialCustodianModalOpen(false);
                                setJudicialCustodianModalCtx(null);
                            }}
                            onConfirm={(payload) => {
                                judicialCustodianModalCtx?.onSaved(payload);
                            }}
                        />
                    </Suspense>,
                    document.body
                )}

            {typeof document !== 'undefined' &&
                executionReportPrompt !== null &&
                    <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                        <LazyExecutorWorkflowConfirmModal
                            open
                            message="هل تريد الانتقال لفتح محضر الجرد/التخلية الآن؟"
                            onClose={() => setExecutionReportPrompt(null)}
                            onConfirm={() => {
                                executionReportPrompt?.onConfirm();
                                setShowDecisionsModal(false);
                                openExecutionSeizuresTab();
                                showToast(
                                    'تم فتح «محضر المتابعة». أكمل الإجراءات من التبويب المناسب؛ للحجز المالي استخدم «الحجز المالي».',
                                    'info'
                                );
                            }}
                        />
                    </Suspense>,
                    document.body
                )}

            <DocumentsModal
                showDocumentsModal={showDocumentsModal}
                setShowDocumentsModal={setShowDocumentsModal}
                executionId={executionId}
                file={file}
                nextTimelineId={nextTimelineId}
                setTimelineEvents={setTimelineEvents}
            />
            {showRealEstateSeizureModal ? (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <RealEstateSeizurePostApprovalModal
                        open={showRealEstateSeizureModal}
                        onOpenChange={(open) => {
                            setShowRealEstateSeizureModal(open);
                            if (!open) setRealEstateSeizureModalDecisionId(null);
                        }}
                        decisionId={String(realEstateSeizureModalDecisionId || '')}
                        initial={realEstateModalInitial}
                        disabled={isHistoricalMode}
                        onSave={saveRealEstateSeizureFromModal}
                    />
                </Suspense>
            ) : null}

            {showThirdPartySeizureModal ? (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <ThirdPartySeizureInitModal
                        open={showThirdPartySeizureModal}
                        onOpenChange={(open) => {
                            setShowThirdPartySeizureModal(open);
                            if (!open) setThirdPartySeizureModalDecisionId(null);
                        }}
                        decisionId={String(thirdPartySeizureModalDecisionId || '')}
                        initial={thirdPartyModalInitial}
                        disabled={isHistoricalMode}
                        onSave={saveThirdPartySeizureFromModal}
                    />
                </Suspense>
            ) : null}

            {showStandaloneExecutionMarkModal ? (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <StandaloneExecutionMarkInitModal
                        open={showStandaloneExecutionMarkModal}
                        onOpenChange={(open) => {
                            setShowStandaloneExecutionMarkModal(open);
                            if (!open) setStandaloneExecutionMarkModalDecisionId(null);
                        }}
                        decisionId={String(standaloneExecutionMarkModalDecisionId || '')}
                        initial={standaloneMarkModalInitial}
                        disabled={isHistoricalMode}
                        onSave={saveStandaloneExecutionMarkFromModal}
                    />
                </Suspense>
            ) : null}
            
            <DecisionsModal
                showDecisionsModal={showDecisionsModal}
                setShowDecisionsModal={setShowDecisionsModal}
                decisionsStorageExecutionId={decisionsStorageExecutionId}
                getMilestoneTimelineSnapshot={getMilestoneTimelineSnapshot}
                setTimelineEvents={setTimelineEvents}
                setDecisionsModalBootHubTab={setDecisionsModalBootHubTab}
                setDecisionsModalBootListTab={setDecisionsModalBootListTab}
                setDecisionsModalScrollToDecisionId={setDecisionsModalScrollToDecisionId}
                isEvictionExecutionModule={isEvictionExecutionModule}
                executionData={executionData}
                executionId={executionId}
                file={file}
                executorApprovalActions={executorApprovalActions}
                seizedAssets={seizedAssets}
                persistExecutionMerge={persistExecutionMerge}
                pushTimelineEvent={pushTimelineEvent}
                nextTimelineId={nextTimelineId}
            />
            
            <SeizedAssetsModal
                showSeizedAssetsModal={showSeizedAssetsModal}
                setShowSeizedAssetsModal={setShowSeizedAssetsModal}
                executionId={executionId}
                file={file}
            />
            {showPaymentModal && (
                <PaymentModal
                    showPaymentModal={showPaymentModal}
                    setShowPaymentModal={setShowPaymentModal}
                    paymentAmount={paymentAmount}
                    setPaymentAmount={setPaymentAmount}
                    handlePayment={handlePayment}
                />
            )}
            {showTimelineModal && (
                <TimelineModal
                    showTimelineModal={showTimelineModal}
                    setShowTimelineModal={setShowTimelineModal}
                    debtorBrowserTabsMode={debtorBrowserTabsMode}
                    activeTimelineEventsDebtorScoped={activeTimelineEventsDebtorScoped}
                    activeTimelineEvents={activeTimelineEvents}
                    toggleTimelineEventPin={toggleTimelineEventPin}
                    moveTimelineEventToTrash={moveTimelineEventToTrash}
                    setTimelineEditDraft={setTimelineEditDraft}
                    isHistoricalMode={isHistoricalMode}
                    handleRequestHistoricalSnapshotPreview={handleRequestHistoricalSnapshotPreview}
                />
            )}
            
            {/* MAIN DASHBOARD */}
            <div
                className="backdrop-blur-3xl bg-slate-900/30 w-full max-w-md h-full flex flex-col shadow-2xl border border-slate-700/30"
                dir="rtl"
            >
                {isHistoricalMode ? (
                    <div
                        className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-500/50 bg-amber-900/30 p-3 text-amber-200"
                        role="status"
                    >
                        <button
                            type="button"
                            onClick={() => setHistoricalSnapshot(null)}
                            className="shrink-0 rounded bg-amber-600 px-4 py-1 font-semibold text-white transition-colors hover:bg-amber-500"
                        >
                            العودة للحاضر 🕒
                        </button>
                        <p className="min-w-0 flex-1 text-right text-sm leading-relaxed">
                            ⚠️ أنت الآن في وضع المعاينة التاريخية. تعرض هذه الشاشة حالة الإضبارة كما كانت في وقت هذا الحدث.
                        </p>
                    </div>
                ) : null}

                {/* 🆕 V16: PREMIUM DIAMOND GLASS HEADER */}
                <div className="bg-gradient-to-r from-slate-800/40 via-slate-700/20 to-slate-800/40 backdrop-blur-xl border-t border-white/10 border-b border-black/50 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] rounded-xl mx-2 mt-2">
                    <div className="flex w-full items-center justify-between px-5 py-3">
                        {/* Title Group (Right Side in RTL) */}
                        <div className="flex items-center gap-3 flex-row-reverse">
                            <button
                                type="button"
                                onClick={onClose}
                                className="shrink-0 rounded-lg p-2 transition-all hover:bg-rose-500/20 text-white"
                                aria-label="إغلاق"
                            >
                                <X size={20} />
                            </button>
                            <div className="relative min-w-0" ref={dossierLifecyclePopoverRef}>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDossierLifecyclePanelOpen((open) => {
                                            const next = !open;
                                            if (next) {
                                                setDossierLifecyclePanelPhase('menu');
                                                setDossierPendingStatus(null);
                                            }
                                            return next;
                                        });
                                    }}
                                    className={`inline-flex items-center justify-start gap-3 rounded-xl px-2 py-1 transition-all hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45 ${dossierLifecycleTriggerTextClass(dossierStatusDraft)}`}
                                    aria-expanded={dossierLifecyclePanelOpen}
                                    aria-haspopup="dialog"
                                    aria-label={`الإضبارة التنفيذية — ${dossierLifecycleLabelAr(dossierStatusDraft)}`}
                                    title="تغيير حالة الإضبارة — اضغط للقائمة"
                                >
                                    <span className="truncate text-lg font-semibold tracking-tight">
                                        الإضبارة التنفيذية
                                    </span>
                                    <span
                                        className={`h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/15 shadow-[0_0_8px_rgba(255,255,255,0.2)] ${dossierLifecycleTriggerDotClass(dossierStatusDraft)}`}
                                        aria-hidden
                                    />
                                </button>
                                {dossierLifecyclePanelOpen && dossierLifecyclePopStyle
                                          <div
                                              ref={dossierLifecyclePanelPortalRef}}}
                                              style={{
                                                  position: 'fixed',
                                                  top: dossierLifecyclePopStyle.top,
                                                  left: dossierLifecyclePopStyle.left,
                                                  width: dossierLifecyclePopStyle.width,
                                                  maxWidth: 'min(19rem, calc(100vw - 2.5rem))',
                                                  zIndex: 10050,
                                              }}
                                              className="min-w-[14rem] rounded-xl border border-amber-500/40 bg-[#0A0F1C]/98 p-2.5 text-right shadow-2xl shadow-black/50 backdrop-blur-md"
                                              dir="rtl"
                                              role="dialog"
                                              aria-label="حالة الإضبارة"
                                              onClick={(e) => e.stopPropagation()}
                                              onKeyDown={(e) => e.stopPropagation()}
                                              {dossierLifecyclePanelPhase === 'menu' ? (
                                                  <>
                                                      <p className="mb-2 text-[9px] font-semibold text-slate-500">
                                                          اختر حالة الإضبارة
                                                      </p>
                                                      <div className="flex flex-col gap-1">
                                                          {(
                                                              [
                                                                  'active',
                                                                  'paused',
                                                                  'suspended',
                                                                  'finished',
                                                              ] as const
                                                          ).map((s) => (
                                                              <button
                                                                  key={s}
                                                                  type="button"
                                                                  onClick={() => handleDossierLifecyclePick(s)}
                                                                  className={`w-full rounded-lg border px-2 py-2 text-right text-[10px] font-bold transition ${
                                                                      dossierStatusDraft === s
                                                                          ? 'border-amber-500/50 bg-amber-950/45 text-amber-100'
                                                                          : 'border-white/10 bg-slate-900/65 text-slate-200 hover:bg-slate-800/85'
                                                                  }`}
                                                              >
                                                                  {s === 'active'
                                                                      ? '🟢 نشطة'
                                                                      : s === 'paused'
                                                                        ? '🟡 متوقفة'
                                                                        : s === 'suspended'
                                                                          ? '⏸️ مستأخرة'
                                                                          : '🔒 انتهاء الإضبارة'}
                                                              </button>
                                                          ))}
                                                      </div>
                                                  </>
                                              ) : (
                                                  <>
                                                      <button
                                                          type="button"
                                                          className="mb-2 block w-full text-right text-[9px] text-amber-300/95 hover:underline"
                                                          onClick={() => {
                                                              setDossierLifecyclePanelPhase('menu');
                                                              setDossierPendingStatus(null);
                                                          }}
                                                      >
                                                          ← رجوع لاختيار الحالة
                                                      </button>
                                                      <p className="mb-2 text-[10px] font-bold text-amber-100">
                                                          {dossierPendingStatus
                                                              ? dossierLifecycleLabelAr(dossierPendingStatus)
                                                              : ''}
                                                      </p>
                                                      <div className="flex flex-col gap-2">
                                                          <label className="text-[9px] text-slate-500">السبب</label>
                                                          <textarea
                                                              value={dossierReasonDraft}
                                                              onChange={(ev) => setDossierReasonDraft(ev.target.value)}
                                                              rows={2}
                                                              className="w-full resize-none rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1.5 text-[11px] text-white"
                                                          />
                                                          <label className="text-[9px] text-slate-500">التاريخ</label>
                                                          <input
                                                              type="date"
                                                              value={dossierDateDraft}
                                                              onChange={(ev) => setDossierDateDraft(ev.target.value)}
                                                              className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1.5 text-[11px] font-mono text-white"
                                                          />
                                                          <button
                                                              type="button"
                                                              onClick={handleDossierLifecycleConfirmDetails}
                                                              className="mt-1 rounded-lg bg-amber-800/75 py-2 text-[10px] font-bold text-amber-50 hover:bg-amber-700/85"
                                                          >
                                                              اعتماد وتسجيل في السجل الزمني
                                                          </button>
                                                      </div>
                                                  </>
                                              )}
								  </div>,
					document.body
                                      )}
                                    : null
                            </div>
                        </div>

                        {/* Actions Group (Left Side in RTL) */}
                        <div className="flex items-center gap-2 px-1">
                            <button
                                type="button"
                                onClick={() => {
                                    const next = !aiCopilotEnabled;
                                    setAiCopilotEnabled(next);
                                    persistExecutionMerge({
                                        ai_copilot_enabled: next,
                                        ai_copilot_mode: 'hybrid',
                                    });
                                    showToast(
                                        next
                                            ? 'تم تفعيل الذكاء الاصطناعي للإضبارة.'
                                            : 'تم إيقاف الذكاء الاصطناعي للإضبارة.',
                                        next ? 'success' : 'info'
                                    );
                                }}
                                className={`flex shrink-0 items-center justify-center rounded-lg border p-2 text-[10px] font-bold transition-all duration-300 backdrop-blur-sm ${
                                    aiCopilotEnabled
                                        ? 'border-[#D4AF37]/50 bg-[#D4AF37]/20 text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                                        : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10 hover:text-white'
                                }`}
                                title="تشغيل/إيقاف الذكاء الاصطناعي في الإضبارة"
                                aria-label={aiCopilotEnabled ? 'إيقاف الذكاء الاصطناعي' : 'تفعيل الذكاء الاصطناعي'}
                            >
                                <Bot size={16} className={aiCopilotEnabled ? 'animate-pulse' : ''} />
                            </button>

                            <button
                                type="button"
                                onClick={() => void handleShareTimeline()}
                                className="shrink-0 rounded-lg p-2 transition-all duration-300 backdrop-blur-sm border border-transparent hover:border-white/10 hover:bg-white/10 text-slate-400 hover:text-emerald-400"
                                title="نسخ السجل الزمني ومشاركته"
                                aria-label="نسخ السجل الزمني ومشاركته"
                            >
                                <Share2 size={18} />
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowExecutionTrashModal(true)}
                                className="shrink-0 rounded-lg p-2 transition-all duration-300 backdrop-blur-sm border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.07] hover:text-white"
                                title="سلة مهملات الإضبارة (السجل والملاحظات)"
                                aria-label="سلة مهملات الإضبارة"
                            >
                                <Trash size={18} />
                            </button>
                        </div>
                    </div>
                </div>
                {stayOfExecutionActive && (
                    <div className="mx-2 mt-1 rounded-xl border border-amber-500/50 bg-amber-950/85 px-3 py-2">
                        <p className="text-center text-[11px] font-bold text-amber-200 leading-snug">
                            ⏸️ الإضبارة مستأخرة لحين موعد الجلسة القادمة
                        </p>
                    </div>
                )}
                
                {/* CONTENT AREA */}
                <div
                    className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-transparent overscroll-contain"
                    dir="rtl"
                >
                    
                    {/* STATUTE EXPIRED BANNER */}
                    {statuteStatus && statuteStatus.isExpired && !isAlimonyClaim && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mx-3 mt-3 bg-gradient-to-r from-rose-950/80 to-gray-950/80 border-2 border-rose-500/80 rounded-2xl p-4 shadow-lg shadow-rose-500/30"
                        >
                            <div className="flex items-center justify-end gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                    <XCircle size={24} className="text-rose-400" />
                                    <h3 className="text-rose-400 font-bold text-sm">❌ سقطت قوة التنفيذ</h3>
                                </div>
                            </div>
                            <p className="text-white text-sm text-right mb-2">
                                مضى أكثر من 7 سنوات على آخر إجراء - الإضبارة فقدت قوتها التنفيذية
                            </p>
                            <p className="text-gray-300 text-xs text-right">
                                استشر المحكمة لتحديد الخيارات القانونية المتاحة
                            </p>
                        </motion.div>
                    )}
                    
                    {/* 🆕 V8: EXECUTION PAUSED BANNER */}
                    {executionPaused && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mx-3 mt-3 bg-gradient-to-r from-orange-950/60 to-amber-950/60 border-2 border-amber-500/60 rounded-2xl p-4 shadow-lg shadow-amber-500/20"
                        >
                            <div className="flex items-center justify-center gap-3">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400 animate-pulse">
                                    <circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/>
                                </svg>
                                <p className="text-amber-300 font-bold text-sm">⏸️ الإضبارة موقوفة للمراجعة</p>
                            </div>
                            <p className="text-gray-300 text-xs text-center mt-2">
                                تم إيقاف جميع المهل الزمنية والإجراءات الجبرية
                            </p>
                            <button
                                type="button"
                                onClick={handleResumeExecution}
                                className="mt-3 w-full rounded-lg border border-emerald-500/40 bg-emerald-950/50 py-2 text-[10px] font-bold text-emerald-100 hover:bg-emerald-950/65"
                            >
                                استئناف التنفيذ
                            </button>
                        </motion.div>
                    )}

                    {stayOfExecutionActive && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="sticky top-0 z-30 mx-3 mt-2 rounded-xl border border-yellow-500/40 bg-amber-950/70 p-2.5 shadow-md shadow-yellow-950/20"
                        >
                            <div className="flex flex-col gap-1.5 text-right">
                                <p className="text-center text-[11px] font-bold text-yellow-200">
                                    تفاصيل الاستئخار
                                </p>
                                {executionData?.stay_of_execution?.court_name && (
                                    <p className="text-[9px] leading-snug text-slate-400">
                                        {executionData.stay_of_execution.court_name}
                                        {executionData.stay_of_execution.decision_number
                                            ? ` — ${executionData.stay_of_execution.decision_number}`
                                            : ''}
                                        {executionData.stay_of_execution.next_hearing_date
                                            ? ` — جلسة: ${executionData.stay_of_execution.next_hearing_date}`
                                            : ''}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    onClick={handleLiftStayOfExecution}
                                    className="w-full rounded-lg border border-emerald-500/35 bg-emerald-950/50 py-2 text-[10px] font-bold text-emerald-100"
                                >
                                    رفع الاستئخار
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {aiCopilotEnabled && (
                        <div className="mx-3 mt-3 rounded-2xl border border-slate-700/40 bg-slate-900/55 p-4 shadow-md shadow-black/20">
                            <div className="mb-2 flex items-center justify-between gap-2" dir="rtl">
                                <div className="flex items-center gap-2">
                                    <Bot size={15} className="text-[#D4AF37]/90" />
                                    <p className="text-xs font-bold text-slate-100">
                                        مُحلل حامي الذكي
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void runExecutionAICopilot('manual')}
                                    disabled={aiCopilotLoading}
                                    className="rounded-lg border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-2.5 py-1 text-[10px] font-bold text-[#D4AF37] transition hover:bg-[#D4AF37]/15 disabled:opacity-50"
                                >
                                    {aiCopilotLoading ? 'جارٍ التحليل...' : 'تحليل الآن'}
                                </button>
                            </div>
                            {aiCopilotError ? (
                                <p className="mb-2 rounded-lg border border-rose-500/35 bg-rose-950/30 px-2.5 py-2 text-[10px] text-rose-200">
                                    {aiCopilotError}
                                </p>
                            ) : null}
                            {aiCopilotError ? (
                                <p className="mb-2 rounded-lg border border-amber-500/35 bg-amber-950/25 px-2.5 py-2 text-[10px] text-amber-200">
                                    لم يتم تحميل تحليل جديد حالياً. جرّب زر "تحليل الآن" بعد تحسن الاتصال.
                                </p>
                            ) : aiCopilotResult?.summary ? (
                                <p className="mb-2 text-[11px] leading-relaxed text-slate-200">
                                    {aiCopilotResult.summary}
                                </p>
                            ) : (
                                <p className="mb-2 text-[10px] text-slate-400">
                                    فعّل التحليل الآن للحصول على توصيات مرتبطة بحالة الإضبارة.
                                </p>
                            )}
                            {Array.isArray(aiCopilotResult?.suggestions) &&
                            aiCopilotResult.suggestions.length > 0 ? (
                                <div className="space-y-2">
                                    {aiCopilotResult.suggestions.slice(0, 3).map((s: any, idx: number) => (
                                        <div
                                            key={String(s?.id || idx)}
                                            className="rounded-xl border border-slate-600/30 bg-slate-900/50 p-2.5"
                                            dir="rtl"
                                        >
                                            <div className="mb-1 flex items-center justify-between gap-2">
                                                <p className="text-[11px] font-bold text-slate-100">
                                                    {String(s?.title || 'إجراء مقترح')}
                                                </p>
                                                <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] text-slate-300">
                                                    {(() => {
                                                        const normalizedType = String(
                                                            s?.type ||
                                                                (s?.priority === 'critical'
                                                                    ? 'حرج'
                                                                    : s?.priority === 'high'
                                                                      ? 'مهم'
                                                                      : 'تحسيني')
                                                        );
                                                        if (normalizedType === 'تحري_مالي') return '🕵️‍♂️ تحري_مالي';
                                                        if (normalizedType === 'إجراء_فوري') return '⚡ إجراء_فوري';
                                                        return normalizedType;
                                                    })()}
                                                </span>
                                            </div>
                                            <p className="text-[10px] leading-relaxed text-slate-300">
                                                {String(s?.rationale || s?.description || '')}
                                            </p>
                                            {Array.isArray(s?.citations) && s.citations.length > 0 ? (
                                                <div className="mt-1.5 flex flex-wrap justify-end gap-1.5">
                                                    {s.citations.slice(0, 2).map((c: any, cIdx: number) => (
                                                        <a
                                                            key={`${idx}-${cIdx}`}
                                                            href={String(c?.url || '#')}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="rounded-md border border-slate-600/40 bg-slate-800/50 px-2 py-0.5 text-[9px] text-slate-300 hover:bg-slate-800/70"
                                                        >
                                                            {String(c?.title || 'مصدر')}
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : null}
                                            <div className="mt-2 flex flex-row-reverse gap-1.5">
                                                {String(s?.draftText || '').trim().length > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => void copyCopilotDraftText(s)}
                                                        className="rounded-lg border border-slate-600/40 bg-slate-800/60 px-2 py-1 text-[10px] font-bold text-slate-200 hover:border-[#D4AF37]/30"
                                                    >
                                                        📝 توليد/نسخ الطلب
                                                    </button>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    onClick={() => applyCopilotSuggestionAsTask(s)}
                                                    className="rounded-lg border border-emerald-400/40 bg-emerald-900/25 px-2 py-1 text-[10px] font-bold text-emerald-100"
                                                >
                                                    إضافة كتذكير
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => applyCopilotSuggestionAsNote(s)}
                                                    className="rounded-lg border border-amber-400/40 bg-amber-900/25 px-2 py-1 text-[10px] font-bold text-amber-100"
                                                >
                                                    حفظ كملاحظة
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    )}
                    
                    {/* 🆕 V19: FILE HEADER — المديرية ورقم الإضبارة + حالة الإضبارة (داخل الحاوية الجوزية) */}
                    <div className="mx-3 mt-3">
                        <div
                            className={`relative w-full overflow-hidden backdrop-blur-xl bg-[#0B1120]/65 border border-amber-500/35 px-3.5 py-2 shadow-lg shadow-amber-950/25 ring-1 ring-[#D4AF37]/10 sm:px-4 ${
                                isHeaderExpanded ? 'rounded-t-2xl rounded-b-none' : 'rounded-2xl'
                            }`}
                        >
                            <div className="pointer-events-none absolute inset-0">
                                <div className="absolute inset-0 opacity-60 [background-image:repeating-linear-gradient(45deg,rgba(230,198,115,0.08)_0,rgba(230,198,115,0.08)_1px,transparent_1px,transparent_14px),repeating-linear-gradient(-45deg,rgba(230,198,115,0.06)_0,rgba(230,198,115,0.06)_1px,transparent_1px,transparent_14px)]" />
                                <div className="absolute -top-28 -right-28 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(230,198,115,0.22),transparent_65%)] blur-2xl" />
                                <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.14),transparent_62%)] blur-2xl" />
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-950/25 via-transparent to-slate-950/20" />
                            </div>
                            <div
                                className="grid w-full min-w-0 grid-cols-[1fr,auto,1fr] items-center gap-2 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleHeaderExpanded();
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleHeaderExpanded();
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                            >
                                <div className="min-w-0" aria-hidden />
                                <div className="flex min-w-0 items-center justify-center px-1 py-0" dir="rtl">
                                    <div className="flex min-w-0 max-w-full items-center justify-center gap-x-2 overflow-hidden whitespace-nowrap text-center">
                                    <span className="shrink-0 text-[1.0625rem] font-extrabold leading-tight text-amber-50 sm:text-lg">
                                        {executionData.directorate || 'تنفيذ الكرخ'}
                                    </span>
                                    <span className="shrink-0 text-amber-700/65" aria-hidden>
                                        ·
                                    </span>
                                    <span className="shrink-0 tabular-nums text-[1.0625rem] font-bold text-amber-200/95 sm:text-lg">
                                        {executionData.fileNumber || '0000'} / {executionData.fileYear || '2026'}
                                    </span>
                                    {walnutHeaderClaimShort ? (
                                        <>
                                            <span className="shrink-0 text-amber-600/55" aria-hidden>
                                                ·
                                            </span>
                                            <span className="max-w-[min(14rem,50vw)] min-w-0 shrink truncate text-[1.0625rem] font-semibold text-amber-100/95 sm:max-w-[18rem] sm:text-lg">
                                                {walnutHeaderClaimShort}
                                            </span>
                                        </>
                                    ) : null}
                                    {walnutHeaderExecShort ? (
                                        <>
                                            <span className="shrink-0 text-amber-600/55" aria-hidden>
                                                ·
                                            </span>
                                            <span className="max-w-[min(12rem,44vw)] min-w-0 shrink truncate text-[1.0625rem] font-semibold text-amber-100/95 sm:max-w-[15rem] sm:text-lg">
                                                {walnutHeaderExecShort}
                                            </span>
                                        </>
                                    ) : null}
                                    </div>
                                </div>
                                {null}
                            </div>
                        </div>
                        
                        {/* EXPANDED STATE: Document Details Grid */}
                        <AnimatePresence>
                            {isHeaderExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden bg-[#0B1120]/55 border-2 border-t-0 border-amber-500/40 rounded-b-2xl -mt-[2px]"
                                >
                                    <div className="grid grid-cols-2 gap-2 px-4 py-3 text-sm sm:grid-cols-4">
                                        <div className="col-span-2 flex justify-end sm:col-span-4">
                                            <button
                                                type="button"
                                                onClick={openEditDossierMeta}
                                                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-950/20 px-2.5 py-1.5 text-[10px] font-bold text-amber-200 transition hover:bg-amber-950/40"
                                            >
                                                <Pencil size={12} />
                                                {isEvictionExecutionModule
                                                    ? 'تعديل رقم الإضبارة والمديرية والحكم والتخلية'
                                                    : 'تعديل رقم الإضبارة والمديرية والحكم'}
                                            </button>
                                        </div>
                                        <div className="rounded-xl border border-amber-500/15 bg-black/20 px-2.5 py-2 text-right">
                                            <p className="text-gray-400 text-xs mb-1">نوع السند:</p>
                                            <p className="text-white font-semibold">{executionData.docType || 'قرار حكم قضائي'}</p>
                                        </div>
                                        <div className="rounded-xl border border-amber-500/15 bg-black/20 px-2.5 py-2 text-right">
                                            <p className="text-gray-400 text-xs mb-1">التصنيف:</p>
                                            <p className="text-white font-semibold">{classificationDisplay}</p>
                                        </div>
                                        {showJudgmentMeta ? (
                                            <div className="rounded-xl border border-amber-500/15 bg-black/20 px-2.5 py-2 text-right">
                                                <p className="text-gray-400 text-xs mb-1">رقم الحكم:</p>
                                                <p className="text-white font-semibold font-mono break-all">{docNumber?.trim() || '—'}</p>
                                            </div>
                                        ) : null}
                                        {showJudgmentMeta ? (
                                            <div className="rounded-xl border border-amber-500/15 bg-black/20 px-2.5 py-2 text-right">
                                                <p className="text-gray-400 text-xs mb-1">تاريخ الحكم:</p>
                                                <p className="text-white font-semibold">{judgmentDateDisplay || '—'}</p>
                                            </div>
                                        ) : null}
                                        <div className="col-span-2 rounded-xl border border-amber-500/15 bg-black/20 px-2.5 py-2 text-right sm:col-span-2">
                                            <p className="text-gray-400 text-xs mb-1">المطالبة:</p>
                                            <p className="text-white font-semibold break-words">
                                                {claimTypeArabicDisplay || executionData.executionType || '—'}
                                            </p>
                                        </div>
                                        {isEvictionExecutionModule &&
                                            (String(evictionPropertyNumber || '').trim() ||
                                                String(evictionPropertyDistrict || '').trim() ||
                                                String(evictionPropertyTypeField || '').trim() ||
                                                String(evictionFullAddressField || '').trim()) && (
                                                <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-3 sm:grid-cols-3 lg:col-span-4 lg:grid-cols-4">
                                                    {String(evictionPropertyNumber || '').trim() ? (
                                                        <div className="rounded-xl border border-amber-500/15 bg-slate-900/35 px-2.5 py-2 text-right">
                                                            <p className="text-gray-400 text-xs mb-1">رقم العقار:</p>
                                                            <p className="text-white font-semibold break-words">
                                                                {evictionPropertyNumber}
                                                            </p>
                                                        </div>
                                                    ) : null}
                                                    {String(evictionPropertyDistrict || '').trim() ? (
                                                        <div className="rounded-xl border border-amber-500/15 bg-slate-900/35 px-2.5 py-2 text-right">
                                                            <p className="text-gray-400 text-xs mb-1">المقاطعة:</p>
                                                            <p className="text-white font-semibold break-words">
                                                                {evictionPropertyDistrict}
                                                            </p>
                                                        </div>
                                                    ) : null}
                                                    {String(evictionPropertyTypeField || '').trim() ? (
                                                        <div className="rounded-xl border border-amber-500/15 bg-slate-900/35 px-2.5 py-2 text-right">
                                                            <p className="text-gray-400 text-xs mb-1">صنف العقار:</p>
                                                            <p className="text-white font-semibold break-words">
                                                                {String(evictionPropertyTypeField || '').trim() || '—'}
                                                            </p>
                                                        </div>
                                                    ) : null}
                                                    {isEvictionExecutionModule ? (
                                                        <div className="rounded-xl border border-amber-500/15 bg-slate-900/35 px-2.5 py-2 text-right">
                                                            <p className="text-gray-400 text-xs mb-1">استعمال العقار:</p>
                                                            <p className="text-[#E6C673] text-xs font-semibold break-words">
                                                                {evictionPremisesUseResolved === 'commercial'
                                                                    ? 'محل / تجاري'
                                                                    : 'سكني'}
                                                            </p>
                                                        </div>
                                                    ) : null}
                                                    {String(evictionFullAddressField || '').trim() ? (
                                                        <div className="col-span-2 rounded-xl border border-amber-500/15 bg-slate-900/35 px-2.5 py-2 text-right sm:col-span-2 lg:col-span-2">
                                                            <p className="text-gray-400 text-xs mb-1">
                                                                مكان العقار (العنوان):
                                                            </p>
                                                            <p className="text-white font-semibold text-xs leading-relaxed break-words">
                                                                {evictionFullAddressField}
                                                            </p>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* CREDITOR — بطاقة لكل دائن أسفل الأخرى (أساسي + إضافي)؛ التنقل بالتبويب للمدينين فقط */}
                    <div className="mx-3 mt-2 space-y-2">
                                {creditorWorkspaceEntries.map((ent, idx) => {
                                    const c = ent.c;
                                    const ecIdx = ent.ecIndex >= 0 ? ent.ecIndex : idx;
                                    const isPmCred = ent.isPmCreditor;
                                    if (
                                        creditorWorkspaceEntries.length > 2 &&
                                        !showExtraCreditors &&
                                        idx >= 2
                                    ) {
                                        return null;
                                    }
                                    const creditorKey = ent.key;
                                    const creditorOpen = expandedCreditorById[creditorKey] ?? false;
                                    const creditorDisp = getExecutionPartyDisplayName(
                                        c as unknown as Party,
                                        'creditor',
                                        ecIdx,
                                        executionData
                                    );
                                    const creditorHeirsRows = buildPartyHeirsRows(c as unknown as Party, 'creditor');
                                    const creditorHasHeirs = creditorHeirsRows.length > 0;
                                    const creditorHeirsWord =
                                        creditorHasHeirs
                                            ? creditorHeirsRows.length > 1
                                                ? 'ورثة'
                                                : 'وريث'
                                            : null;
                                    const creditorPartyPreserveAppealInline =
                                        creditorHasHeirs || creditorDisp.showDeceasedGlyph;
                                    return (
                                        <div
                                            key={creditorKey}
                                            className="relative mt-2 w-full min-h-[56px] px-3 pb-2.5 pt-2 text-right backdrop-blur-2xl transition-all rounded-2xl border border-emerald-500/25 bg-[#0B1120]/35 shadow-[0_14px_46px_rgba(0,0,0,0.45)] ring-1 ring-emerald-500/10 hover:ring-emerald-500/20"
                                            dir="rtl"
                                            style={{
                                                backgroundImage:
                                                    'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 55%, rgba(0,0,0,0) 100%),' +
                                                    'repeating-linear-gradient(45deg, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 1px, transparent 1px, transparent 16px),' +
                                                    'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 16px)',
                                                backgroundBlendMode: 'overlay',
                                            }}
                                        >
                                            {!creditorOpen ? (
                                                <button
                                                    type="button"
                                                    className="absolute inset-0 z-0 rounded-2xl"
                                                    aria-label="Expand creditor"
                                                    onClick={() => toggleCreditorExpanded(creditorKey)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            toggleCreditorExpanded(creditorKey);
                                                        }
                                                    }}
                                                />
                                            ) : null}
                                            <div className="relative z-10">
                                            <span className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap rounded-full border border-emerald-400/35 bg-[#0B1120]/80 px-3 py-1 text-[11px] font-extrabold leading-none text-emerald-300 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                                                الدائن
                                                {creditorWorkspaceEntries.length > 1 ? (
                                                    <span className="ms-0.5 inline tabular-nums text-[10px] font-bold text-emerald-300/90">
                                                        {idx + 1}
                                                    </span>
                                                ) : effectiveCreditors.length > 1 ? (
                                                    <span className="ms-0.5 inline tabular-nums text-[10px] font-bold text-emerald-300/90">
                                                        {ecIdx + 1}
                                                    </span>
                                                ) : null}
                                                {isPmCred ? (
                                                    <span className="mr-1 inline text-[9px] font-semibold text-slate-500">
                                                        ·إضافي
                                                    </span>
                                                ) : null}
                                            </span>
                                            <div className="flex w-full items-center justify-between gap-2 text-right" dir="rtl">
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => toggleCreditorExpanded(creditorKey)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            toggleCreditorExpanded(creditorKey);
                                                        }
                                                    }}
                                                    className="min-w-0 flex-1 rounded-xl py-0 text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 cursor-pointer"
                                                >
                                                    <div
                                                        className="flex w-full min-w-0 flex-col items-stretch gap-1"
                                                        dir="rtl"
                                                    >
                                                                <div
                                                                    className="flex w-full min-w-0 flex-row flex-nowrap items-center justify-center gap-2 overflow-hidden"
                                                                    dir="rtl"
                                                                >
                                                                    <div
                                                                        className="flex min-w-0 max-w-full flex-row flex-nowrap items-center justify-center gap-1 overflow-hidden"
                                                                        dir="rtl"
                                                                    >
                                                                        {creditorHeirsWord ? (
                                                                            <span
                                                                                className="shrink-0 text-amber-500 text-xl font-bold cursor-pointer hover:underline"
                                                                                role="button"
                                                                                tabIndex={0}
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                    openHeirsQuickView(
                                                                                        c as unknown as Party,
                                                                                        'creditor',
                                                                                        'ورثة الدائن'
                                                                                    );
                                                                                }}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        openHeirsQuickView(
                                                                                            c as unknown as Party,
                                                                                            'creditor',
                                                                                            'ورثة الدائن'
                                                                                        );
                                                                                    }
                                                                                }}
                                                                            >
                                                                                {creditorHeirsWord}
                                                                            </span>
                                                                        ) : null}
                                                                        <span className="min-w-0 max-w-full truncate text-center text-xl font-bold leading-tight text-white py-2 block">
                                                                            {creditorHeirsWord ? creditorDisp.baseName : creditorDisp.text}
                                                                            {(creditorHasHeirs
                                                                                ? heirsDetailsIncludeClient(
                                                                                      (c as unknown as Party).heirs_details
                                                                                  )
                                                                                : c.isClient) &&
                                                                            !creditorDisp.showDeceasedGlyph ? (
                                                                                <span
                                                                                    className="ms-1 inline-block text-[#E6C673] text-[14px] leading-none select-none"
                                                                                    title="موكلي"
                                                                                    aria-label="موكلي"
                                                                                >
                                                                                    ★
                                                                                </span>
                                                                            ) : null}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div
                                                                    className="mt-1 flex flex-row flex-nowrap items-center justify-start gap-1 overflow-x-auto scrollbar-hide"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onKeyDown={(e) => e.stopPropagation()}
                                                                    role="presentation"
                                                                    dir="rtl"
                                                                >
                                                                    {creditorDisp.showDeceasedGlyph &&
                                                                    !creditorHeirsWord ? (
                                                                        <span className="shrink-0 rounded-md border border-rose-500/40 bg-rose-950/40 px-1.5 py-0.5 text-[10px] font-bold leading-none text-rose-200/95 select-none">
                                                                            متوفى
                                                                        </span>
                                                                    ) : null}
                                                                    {ent.ecIndex === 0 &&
                                                                    !isPmCred &&
                                                                    creditorPartyPreserveAppealInline &&
                                                                    executionAppealBanner.show ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setDecisionsModalBootHubTab('appeals');
                                                                                setShowDecisionsModal(true);
                                                                            }}
                                                                            className="max-w-[10rem] shrink-0 truncate inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-normal text-red-500 transition-colors hover:bg-red-500/15"
                                                                            title={`طعن ساري: ${executionAppealBanner.label} — افتح مركز الطعون`}
                                                                        >
                                                                            {executionAppealBanner.label}
                                                                        </button>
                                                                    ) : null}
                                                                </div>
                                                                {/* Interactive Badges - Moved under name */}
                                                                <div
                                                                    className="flex flex-row flex-wrap items-center justify-start gap-1 mt-1"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onKeyDown={(e) => e.stopPropagation()}
                                                                    role="presentation"
                                                                >
                                                                    <ExecutionPartyInteractiveBadges
                                                                        executionId={partyBadgesExecutionId}
                                                                        party="creditor"
                                                                        isPrimaryDebtor={false}
                                                                        executionData={viewExecutionData}
                                                                        activeCoerciveActions={activeCoerciveActions}
                                                                        seizedAssets={seizedAssets}
                                                                        timelineEvents={activeTimelineEvents}
                                                                        hasGuarantor={false}
                                                                        memoBadge={null}
                                                                        absenceBadge={null}
                                                                        showSummonsBadge={false}
                                                                        debtorArrested={false}
                                                                        forcedAttendancePending={false}
                                                                        decisionsReloadEpoch={decisionsReloadEpoch}
                                                                        isHistoricalMode={isHistoricalMode}
                                                                    />
                                                                </div>
                                                                {ent.ecIndex === 0 &&
                                                                !isPmCred &&
                                                                !creditorPartyPreserveAppealInline &&
                                                                executionAppealBanner.show ? (
                                                                    <div className="flex w-full justify-end" dir="rtl">
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setDecisionsModalBootHubTab('appeals');
                                                                                setShowDecisionsModal(true);
                                                                            }}
                                                                            className="max-w-[10rem] shrink-0 truncate inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-normal text-red-500 transition-colors hover:bg-red-500/15"
                                                                            title={`طعن ساري: ${executionAppealBanner.label} — افتح مركز الطعون`}
                                                                        >
                                                                            {executionAppealBanner.label}
																			</button>
																</div>
														) : null}
                                                    </div>
                                                </div>

                                            </div>
                                            {creditorOpen && (
                                                <div
                                                    className="border-t border-emerald-500/10 px-0 pb-1 pt-2 text-right"
                                                    dir="rtl"
                                                >
                                                    <div
                                                        className="mb-2 flex items-center justify-end"
                                                        onClick={(e) => e.stopPropagation()}
                                                        onKeyDown={(e) => e.stopPropagation()}
                                                        role="presentation"
                                                    >
                                                        <ExecutionPartySpecialActionsMenu
                                                            variant="creditor"
                                                            creditorDeathEntryLabel={creditorDeathMenuLabel}
                                                            onReportCreditorDeath={handleCreditorDeathMenuAction}
                                                            isHistoricalMode={isHistoricalMode}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        {c.occupation || c.phone ? (
                                                            <div
                                                                className={
                                                                    c.occupation && c.phone
                                                                        ? 'grid grid-cols-2 gap-2'
                                                                        : 'grid grid-cols-1 gap-2'
                                                                }
                                                            >
                                                                {c.occupation ? (
                                                                    <div className="min-w-0 rounded-lg border border-emerald-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                                        <p className="mb-0.5 text-[10px] text-gray-400">
                                                                            المهنة
                                                                        </p>
                                                                        <p className="text-xs font-medium leading-snug text-slate-200 break-words">
                                                                            {String(c.occupation ?? '')}
                                                                        </p>
                                                                    </div>
                                                                ) : null}
                                                                {c.phone ? (
                                                                    <div className="min-w-0 rounded-lg border border-emerald-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                                        <div className="mb-0.5 flex flex-row-reverse items-center justify-end gap-1 text-[10px] text-gray-400">
                                                                            <span>الهاتف</span>
                                                                            <Phone
                                                                                size={12}
                                                                                className="shrink-0 text-emerald-400"
                                                                            />
                                                                        </div>
                                                                        <p className="text-xs font-medium text-white [unicode-bidi:plaintext] break-all">
                                                                            {String(c.phone ?? '')}
                                                                        </p>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        ) : null}
                                                        {c.address ? (
                                                            <div className="min-w-0 rounded-lg border border-emerald-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                                <div className="mb-0.5 flex flex-row-reverse items-center justify-end gap-1 text-[10px] text-gray-400">
                                                                    <span>العنوان</span>
                                                                    <MapPin
                                                                        size={12}
                                                                        className="shrink-0 text-emerald-400"
                                                                    />
                                                                </div>
                                                                <p className="text-xs leading-snug text-white break-words">
                                                                    {String(c.address ?? '')}
                                                                </p>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    {!c.phone && !c.address && creditorExtraMinorNames.length === 0 && (
                                                        <p className="py-1.5 text-center text-[11px] text-gray-500">
                                                            لا توجد بيانات اتصال
                                                        </p>
                                                    )}
                                                    {creditorExtraMinorNames.length > 0 && creditorExtraMinorLabel && (
                                                        <div className="mt-2 border-t border-emerald-500/10 pt-2">
                                                            <div className="mb-0.5 flex flex-row-reverse items-center justify-end gap-1 text-[10px] text-gray-400">
                                                                <span>{creditorExtraMinorLabel}</span>
                                                                <Users
                                                                    size={12}
                                                                    className="shrink-0 text-emerald-400"
                                                                />
                                                            </div>
                                                            <p className="text-xs leading-snug text-white break-words">
                                                                {creditorExtraMinorNames.join('، ')}
                                                            </p>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-end border-t border-emerald-500/10 pt-2 mt-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (isPmCred) {
                                                                    showToast(
                                                                        'الدائن الإضافي مُعرَّف عند إنشاء الإضبارة ضمن تعدد الخصوم.',
                                                                        'info'
                                                                    );
                                                                    return;
                                                                }
                                                                openEditParty('creditor', ecIdx);
                                                            }}
                                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline"
                                                        >
                                                            <Pencil size={12} />
                                                            تعديل الاسم والهاتف والعنوان
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {creditorWorkspaceEntries.length > 2 && (
                                    <PartyOverflowToggle
                                        hiddenCount={creditorWorkspaceEntries.length - 2}
                                        expanded={showExtraCreditors}
                                        onToggle={() => setShowExtraCreditors((v) => !v)}
                                        variant="creditor"
                                    />
                                )}
                    </div>
                    
                    {/* DEBTOR — ذمة غير متضامنة: شريط أسماء فوق بطاقة واحدة (إضبارة فرعية لكل مدين). تضامن: بطاقات متتالية بدون شريط. */}
                    <div className="mx-3 mt-2 space-y-2">
                            <div className="space-y-2">
                                {debtorBrowserTabsMode && debtorWorkspaceEntries.length > 0 ? (
                                    <div
                                        ref={debtorWorkspaceChipStripRef}
                                        className="scrollbar-hide flex gap-1 overflow-x-auto rounded-xl border border-rose-500/25 bg-slate-950/40 p-1.5"
                                        dir="rtl"
                                    >
                                        {debtorWorkspaceEntries.map((ent, ti) => (
                                            <button
                                                key={ent.key}
                                                type="button"
                                                onClick={() => setExecutionDebtorTabIndex(ti)}
                                                className={`shrink-0 rounded-lg border px-3 py-2 text-[10px] font-bold transition-all ${
                                                    executionDebtorTabIndex === ti
                                                        ? 'border-rose-500/50 bg-rose-950/45 text-rose-50'
                                                        : 'border-transparent bg-slate-800/60 text-slate-400 hover:border-rose-500/25'
                                                }`}
                                            >
                                                {ent.unified.name}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                                {(debtorBrowserTabsMode
                                    ? debtorWorkspaceEntries.slice(
                                          executionDebtorTabIndex,
                                          executionDebtorTabIndex + 1
                                      )
                                    : multiDebtorMode
                                      ? debtorWorkspaceEntries
                                      : effectiveDebtors
                                ).map((raw: any, loopIdx: number) => {
                                            if (
                                                !multiDebtorMode &&
                                                effectiveDebtors.length > 2 &&
                                                !showExtraDebtors &&
                                                loopIdx >= 2
                                            ) {
                                                return null;
                                            }
                                            const wsDebt = multiDebtorMode;
                                            const d = wsDebt ? raw.d : raw;
                                            const idx = wsDebt ? (raw.fileDebtorIndex ?? 0) : loopIdx;
                                            const isPrimary = wsDebt ? raw.isPrimary : loopIdx === 0;
                                            /** يجب أن يطابق `toggleDebtorEmploymentStatus` و`debtorWorkspaceEntries[0].key` */
                                            const primaryDebtorStableKey = (() => {
                                                const primaryId = (
                                                    effectiveDebtors[0] as Debtor | undefined
                                                )?.id;
                                                return primaryId != null &&
                                                    String(primaryId).trim() !== ''
                                                    ? String(primaryId)
                                                    : 'primary_debtor';
                                            })();
                                            const debtorKey = wsDebt
                                                ? raw.key
                                                : isPrimary
                                                  ? primaryDebtorStableKey
                                                  : d.id != null && String(d.id) !== ''
                                                    ? String(d.id)
                                                    : `d-${idx}`;
                                            const debtorOpen = expandedDebtorById[debtorKey] ?? false;
                                            const salaryStored = isPrimary
                                                ? executionData?.employeeSalary
                                                : executionExtras.perDebtorSalaries?.[debtorKey];
                                            const garnishStored = isPrimary
                                                ? executionData?.garnishmentAmount
                                                : executionExtras.perDebtorGarnishments?.[debtorKey];
                                            const debtorDisp = getExecutionPartyDisplayName(
                                                d as unknown as Party,
                                                'debtor',
                                                wsDebt ? (isPrimary ? 0 : 1) : idx,
                                                executionData
                                            );
                                            const debtorHeirsRows = buildPartyHeirsRows(d as unknown as Party, 'debtor');
                                            const debtorHasHeirs = debtorHeirsRows.length > 0;
                                            const debtorHeirsWord =
                                                debtorHasHeirs
                                                    ? debtorHeirsRows.length > 1
                                                        ? 'ورثة'
                                                        : 'وريث'
                                                    : null;
                                            const debtorPartyPreserveAppealInline =
                                                debtorHasHeirs || debtorDisp.showDeceasedGlyph;
                                            /** استقلال إضبارة فرعية: صف المدين الحالي (تبويب ذمة مقسومة أو مدين إضافي متضامن) */
                                            const useRowScopedExecProfile =
                                                debtorBrowserTabsMode || (!isPrimary && wsDebt);
                                            const rowOccLower = String(
                                                (d as { occupation?: string }).occupation || ''
                                            ).toLowerCase();
                                            const rowIsGovEmp =
                                                rowOccLower.includes('موظف') ||
                                                rowOccLower.includes('حكومي') ||
                                                rowOccLower === 'موظف';
                                            const rowIsRetired =
                                                rowOccLower.includes('متقاعد') ||
                                                rowOccLower.includes('تقاعد');
                                            const rowIsEmployee = (() => {
                                                if (!executionData) {
                                                    return isDebtorRowEmployee(
                                                        effectiveDebtors[0] as Debtor | undefined
                                                    );
                                                }
                                                if (isPrimary) {
                                                    return isDebtorRowEmployee(
                                                        (executionData.debtors?.[0] as Debtor | undefined) ??
                                                            (d as Debtor)
                                                    );
                                                }
                                                const ad = executionData.party_multiplicity?.additionalDebtors?.find(
                                                    (a) => String(a.id) === debtorKey
                                                );
                                                if (ad) return ad.isEmployee !== false;
                                                return isDebtorRowEmployee(d as Debtor);
                                            })();
                                            const rowInitialWasEmployee = (() => {
                                                if (!executionData) return undefined;
                                                if (isPrimary) {
                                                    const p = executionData.debtors?.[0] as Debtor | undefined;
                                                    return typeof p?.employmentInitialWasEmployee === 'boolean'
                                                        ? p.employmentInitialWasEmployee
                                                        : undefined;
                                                }
                                                const adInit =
                                                    executionData.party_multiplicity?.additionalDebtors?.find(
                                                        (a) => String(a.id) === debtorKey
                                                    );
                                                return adInit &&
                                                    typeof adInit.employmentInitialWasEmployee === 'boolean'
                                                    ? adInit.employmentInitialWasEmployee
                                                    : undefined;
                                            })();
                                            const rowEmploymentToggleLabel = debtorEmploymentToggleMenuLabel(
                                                rowIsEmployee,
                                                rowInitialWasEmployee
                                            );
                                            const rowIsGovEmpEffective = useRowScopedExecProfile
                                                ? rowIsGovEmp
                                                : isDebtorGovernmentEmployee;
                                            const rowDebtorSummonsProfile = useRowScopedExecProfile
                                                ? getDebtorSummonsProfile({
                                                      isGovernmentEmployee: rowIsGovEmp || rowIsRetired,
                                                      parsedDebtAmount: principalDebtAmount,
                                                      parsedLawyerFees,
                                                      claimType: claimType || '',
                                                      isNonFinancialClaim,
                                                  })
                                                : debtorSummonsProfile;
                                            const rowShowSalaryCaptureForEmployee = useRowScopedExecProfile
                                                ? shouldShowEmployeeSalaryCapture({
                                                      profile: rowDebtorSummonsProfile,
                                                      claimType: claimType || '',
                                                      parsedLawyerFees,
                                                  })
                                                : showSalaryCaptureForEmployee;
                                            const rowIsDeceased = Boolean(
                                                (d as { isDeceased?: boolean })?.isDeceased ||
                                                    (isPrimary && executionData?.is_debtor_deceased)
                                            );
                                            const showDebtorNotificationPanel =
                                                (isPrimary || debtorBrowserTabsMode) && !rowIsDeceased;
                                            const rowPublicationNoticeBadge: PublicationNoticeBadgeInfo | null =
                                                (() => {
                                                    if (rowIsDeceased) return null;
                                                    const st = getPublicationNoticeForDebtorKey(
                                                        executionData,
                                                        debtorKey
                                                    );
                                                    if (!st?.publicationDateYmd) return null;
                                                    const deadlineYmd = publicationNoticeDeadlineYmd(
                                                        st.publicationDateYmd
                                                    );
                                                    const graceExpired = isAssignmentDeadlinePassed(deadlineYmd);
                                                    const remaining = daysRemainingUntilDeadline(deadlineYmd);
                                                    return {
                                                        publicationDateYmd: st.publicationDateYmd,
                                                        deadlineYmd,
                                                        remaining,
                                                        graceExpired,
                                                        newspaper1: st.newspaper1,
                                                        newspaper2: st.newspaper2,
                                                        recordedAt: st.recordedAt,
                                                        badgeHiddenAt: st.badgeHiddenAt,
                                                        periodEndedAt: st.periodEndedAt,
                                                    };
                                                })();
                                            const rowTaklifAssignmentBadge: TaklifAssignmentBadgeInfo | null =
                                                (() => {
                                                    if (rowIsDeceased || !executionData) return null;
                                                    const ta = getEmployeeAssignmentForDebtorKey(
                                                        executionData,
                                                        debtorKey,
                                                        primaryDebtorKeyResolved
                                                    );
                                                    if (!ta || ta.phase === 'none') return null;
                                                    const dlYmd =
                                                        ta.notifyDate != null && ta.notifyDate !== ''
                                                            ? computeTaklifDeadlineYmd(
                                                                  ta.notifyDate,
                                                                  ta.durationDays ?? 1
                                                              )
                                                            : ta.deadlineDate || '';
                                                    let remainingDays: number | null = null;
                                                    if (ta.phase === 'active' && dlYmd) {
                                                        remainingDays = isAssignmentDeadlinePassed(dlYmd)
                                                            ? 0
                                                            : daysRemainingUntilDeadline(dlYmd);
                                                    }
                                                    return {
                                                        purpose: ta.purpose ?? '',
                                                        notifyDateYmd: ta.notifyDate ?? '',
                                                        deadlineYmd: dlYmd,
                                                        phase: ta.phase,
                                                        remainingDays,
                                                        cycleGeneration: ta.taklifCycleGeneration,
                                                        confirmedAt: ta.confirmedAt,
                                                        badgeHiddenAt: ta.badgeHiddenAt,
                                                        periodEndedAt: ta.periodEndedAt,
                                                        durationDays: ta.durationDays ?? 1,
                                                    };
                                                })();
                                            const rowForcedBringDecisionState =
                                                getPersonalCoerciveSubtypeOutcome(
                                                    executionData?.id ?? executionId,
                                                    'forced_bring_in',
                                                    {
                                                        debtorKey: String(debtorKey),
                                                        primaryDebtorKey: primaryDebtorKeyResolved,
                                                    }
                                                );
                                            let rowMemoNoticeBadge =
                                                isPrimary && !rowIsDeceased
                                                    ? primaryMemoNoticeBadge
                                                    : null;
                                            const rowAbsenceNoticeBadge =
                                                isPrimary && !rowIsDeceased
                                                    ? primaryDebtorAbsenceBadge
                                                    : null;
                                            let rowShowSummonsBadge =
                                                !rowIsDeceased &&
                                                Boolean(
                                                    getDebtorSummonsMarkerForKey(
                                                        executionData,
                                                        debtorKey,
                                                        primaryDebtorKeyResolved
                                                    )
                                                );
                                            let rowRegularTablighBadge =
                                                !rowIsDeceased && executionData
                                                    ? (() => {
                                                          const m = getDebtorSummonsMarkerForKey(
                                                              executionData,
                                                              debtorKey,
                                                              primaryDebtorKeyResolved
                                                          );
                                                          if (!m?.date) return null;
                                                          return {
                                                              noticeDateYmd: String(m.date),
                                                              purpose: String(m.purpose || 'تبليغ'),
                                                              recordedAt: (m as { recordedAt?: string })
                                                                  .recordedAt,
                                                              badgeHiddenAt: (m as { badgeHiddenAt?: string })
                                                                  .badgeHiddenAt,
                                                              periodEndedAt: (m as { periodEndedAt?: string })
                                                                  .periodEndedAt,
                                                          };
                                                      })()
                                                    : null;
                                            let rowPublicationNoticeBadgeResolved =
                                                rowIsDeceased ? null : rowPublicationNoticeBadge;
                                            if (rowTaklifAssignmentBadge) {
                                                rowMemoNoticeBadge = null;
                                                rowPublicationNoticeBadgeResolved = null;
                                                rowShowSummonsBadge = false;
                                                rowRegularTablighBadge = null;
                                            } else if (rowPublicationNoticeBadgeResolved) {
                                                rowMemoNoticeBadge = null;
                                                rowShowSummonsBadge = false;
                                                rowRegularTablighBadge = null;
                                            } else if (rowMemoNoticeBadge) {
                                                rowShowSummonsBadge = false;
                                                rowRegularTablighBadge = null;
                                            } else if (rowRegularTablighBadge) {
                                                rowShowSummonsBadge = true;
                                            }
                                            const rowForcedAttendancePending = rowIsEmployee
                                                ? (() => {
                                                      const ra = executionData
                                                          ? getEmployeeAssignmentForDebtorKey(
                                                                executionData,
                                                                debtorKey,
                                                                primaryDebtorKeyResolved
                                                            )
                                                          : null;
                                                      const warrantOk =
                                                          ra?.phase === 'warrant_ui' &&
                                                          ra?.arrestOrderRecorded;
                                                      if (!warrantOk) return false;
                                                      if (rowForcedBringDecisionState.pending) return true;
                                                      if (!isPrimary) return false;
                                                      return (
                                                          rowForcedBringDecisionState.approved &&
                                                          executionData?.forced_bring_in_personal_outcome !==
                                                              'brought' &&
                                                          executionData?.forced_bring_in_personal_outcome !==
                                                              'absconded'
                                                      );
                                                  })()
                                                : (() => {
                                                      const attendanceResolved = isPrimary
                                                          ? debtorAttendedVoluntarily ||
                                                            forcedPathAttendanceSecured ||
                                                            debtorForcedToAttend ||
                                                            voluntaryAttendanceCount > 0
                                                          : false;
                                                      if (attendanceResolved) return false;
                                                      const forcedIndicator = isPrimary
                                                          ? forcedAttendanceIssued ||
                                                            activeNoticeState === 'forced_attendance' ||
                                                            Boolean(executionData?.forcedAttendanceIssued)
                                                          : false;
                                                      if (forcedIndicator) return true;
                                                      if (rowForcedBringDecisionState.pending) return true;
                                                      if (!isPrimary) return false;
                                                      return (
                                                          rowForcedBringDecisionState.approved &&
                                                          executionData?.forced_bring_in_personal_outcome !==
                                                              'brought' &&
                                                          executionData?.forced_bring_in_personal_outcome !==
                                                              'absconded'
                                                      );
                                                  })();
                                            return (
                                            <div key={debtorKey} className="mt-2 w-full flex flex-col gap-6" dir="rtl">
                                            <div
                                                className="relative w-full min-h-[56px] px-3 pb-2.5 pt-2 text-right backdrop-blur-2xl transition-all rounded-2xl border border-rose-500/25 bg-[#0B1120]/35 shadow-[0_14px_46px_rgba(0,0,0,0.45)] ring-1 ring-rose-500/10 hover:ring-rose-500/20"
                                                style={{
                                                    backgroundImage:
                                                        'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 55%, rgba(0,0,0,0) 100%),' +
                                                        'repeating-linear-gradient(45deg, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 1px, transparent 1px, transparent 16px),' +
                                                        'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 16px)',
                                                    backgroundBlendMode: 'overlay',
                                                }}
                                            >
                                                    {!debtorOpen ? (
                                                        <button
                                                            type="button"
                                                            className="absolute inset-0 z-0 rounded-2xl"
                                                            aria-label="Expand debtor"
                                                            onClick={() => toggleDebtorExpanded(debtorKey)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault();
                                                                    toggleDebtorExpanded(debtorKey);
                                                                }
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div className="relative z-10">
                                                    <span className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap rounded-full border border-rose-400/35 bg-[#0B1120]/80 px-3 py-1 text-[11px] font-extrabold leading-none text-rose-300 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                                                        المدين
                                                        {multiDebtorMode ? (
                                                            <span className="mr-1 inline text-[9px] font-semibold text-rose-300/85">
                                                                ·فرعية
                                                            </span>
                                                        ) : effectiveDebtors.length > 1 ? (
                                                            <span className="ms-0.5 inline tabular-nums text-[10px] font-bold text-rose-300/90">
                                                                {idx + 1}
                                                            </span>
                                                        ) : null}
                                                    </span>
                                                    <div
                                                        className="flex w-full items-center justify-between gap-2"
                                                        dir="rtl"
                                                    >
                                                        {isPrimary && (
                                                            <div
                                                                role="button"
                                                                tabIndex={0}
                                                                className="flex min-w-0 flex-1 cursor-pointer flex-col items-stretch gap-0.5 text-right"
                                                                onClick={() => toggleDebtorExpanded(debtorKey)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                        e.preventDefault();
                                                                        toggleDebtorExpanded(debtorKey);
                                                                    }
                                                                }}
                                                            >
                                                                <div
                                                                    className="flex w-full min-w-0 flex-row flex-nowrap items-center justify-center gap-2 overflow-hidden"
                                                                    dir="rtl"
                                                                >
                                                                    <div
                                                                        className="flex min-w-0 max-w-full flex-row flex-nowrap items-center justify-center gap-1 overflow-hidden"
                                                                        dir="rtl"
                                                                    >
                                                                        {debtorHeirsWord ? (
                                                                            <span
                                                                                className="shrink-0 text-amber-500 text-xl font-bold cursor-pointer hover:underline"
                                                                                role="button"
                                                                                tabIndex={0}
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                    openHeirsQuickView(d as unknown as Party, 'debtor', 'ورثة المدين');
                                                                                }}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        openHeirsQuickView(d as unknown as Party, 'debtor', 'ورثة المدين');
                                                                                    }
                                                                                }}
                                                                            >
                                                                                {debtorHeirsWord}
                                                                            </span>
                                                                        ) : null}
                                                                        <span className="min-w-0 max-w-full truncate text-center text-xl font-bold leading-tight text-white py-2 block">
                                                                            {debtorHeirsWord ? debtorDisp.baseName : debtorDisp.text}
                                                                            {(debtorHasHeirs
                                                                                ? heirsDetailsIncludeClient(
                                                                                      (d as unknown as Party).heirs_details
                                                                                  )
                                                                                : d.isClient) &&
                                                                            !debtorDisp.showDeceasedGlyph ? (
                                                                                <span
                                                                                    className="ms-1 inline-block text-[#E6C673] text-[14px] leading-none select-none"
                                                                                    title="موكلي"
                                                                                    aria-label="موكلي"
                                                                                >
                                                                                    ★
                                                                                </span>
                                                                            ) : null}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div
                                                                    className="mt-1 flex flex-row flex-wrap items-center justify-start gap-1"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onKeyDown={(e) => e.stopPropagation()}
                                                                    role="presentation"
                                                                    dir="rtl"
                                                                >
                                                                    {debtorDisp.showDeceasedGlyph && !debtorHeirsWord ? (
                                                                        <span className="shrink-0 rounded-md border border-rose-500/40 bg-rose-950/40 px-1.5 py-0.5 text-[10px] font-bold leading-none text-rose-200/95 select-none">
                                                                            متوفى
                                                                        </span>
                                                                    ) : null}
                                                                    {debtorPartyPreserveAppealInline &&
                                                                    executionAppealBanner.show ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setDecisionsModalBootHubTab('appeals');
                                                                                setShowDecisionsModal(true);
                                                                            }}
                                                                            className="shrink-0 whitespace-nowrap inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-normal text-red-500 transition-colors hover:bg-red-500/15"
                                                                            title={`طعن ساري: ${executionAppealBanner.label} — افتح مركز الطعون`}
                                                                        >
                                                                            {executionAppealBanner.label}
                                                                        </button>
                                                                    ) : null}
                                                                    {showDebtorNotificationPanel &&
                                                                    isPrimary &&
                                                                    showDebtorUnservedMemoBadge ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSummonsMarkerPopoverOpen(false);
                                                                                setExecutionMemoBadgePopoverOpen(true);
                                                                            }}
                                                                            className="shrink-0 whitespace-nowrap rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-100 hover:bg-amber-500/15"
                                                                            title="لم يُسجَّل بعد تبليغ بمذكرة الإخبار بالتنفيذ"
                                                                        >
                                                                            غير مبلّغ
                                                                        </button>
                                                                    ) : null}
                                                                    {null}
                                                                </div>
                                                                {(() => {
                                                                    const hasSeizureBadges =
                                                                        (seizedAssets?.length || 0) > 0 ||
                                                                        (realEstateSeizureAssets?.length || 0) > 0 ||
                                                                        (thirdPartySeizureAssets?.length || 0) > 0 ||
                                                                        (standaloneExecutionMarks?.length || 0) > 0;
                                                                    const showInteractive = Boolean(isPrimary || debtorBrowserTabsMode);
                                                                    if (!hasSeizureBadges && !showInteractive) return null;
                                                                    return (
                                                                        <div
                                                                            className="flex flex-col"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onKeyDown={(e) => e.stopPropagation()}
                                                                            role="presentation"
                                                                        >
                                                                            {hasSeizureBadges ? (
                                                                                <DebtorSeizureCategoryBadges
                                                                                    seizedAssets={seizedAssets}
                                                                                    realEstateSeizureAssets={realEstateSeizureAssets}
                                                                                    thirdPartySeizureAssets={thirdPartySeizureAssets}
                                                                                    standaloneExecutionMarks={standaloneExecutionMarks}
                                                                                />
                                                                            ) : null}

                                                                            {showInteractive ? (
                                                                                <div className="mt-2 flex flex-row-reverse flex-wrap items-center justify-start gap-1">
                                                                                    <ExecutionPartyInteractiveBadges
                                                                                        executionId={partyBadgesExecutionId}
                                                                                        party="debtor"
                                                                                        isPrimaryDebtor={isPrimary}
                                                                                        executionData={viewExecutionData}
                                                                                        activeCoerciveActions={activeCoerciveActions}
                                                                                        seizedAssets={seizedAssets}
                                                                                        realEstateSeizureAssets={realEstateSeizureAssets}
                                                                                        thirdPartySeizureAssets={thirdPartySeizureAssets}
                                                                                        standaloneExecutionMarks={standaloneExecutionMarks}
                                                                                        timelineEvents={
                                                                                            debtorBrowserTabsMode
                                                                                                ? activeTimelineEventsDebtorScoped
                                                                                                : activeTimelineEvents
                                                                                        }
                                                                                        hasGuarantor={Boolean(
                                                                                            smHasGuarantorFile ||
                                                                                                (effectiveDebtors[0] as Debtor | undefined)
                                                                                                    ?.hasGuarantor ||
                                                                                                (typeof smExecutionTarget === 'string' &&
                                                                                                    smExecutionTarget.includes('كفيل')) ||
                                                                                                executionData?.guarantor_followup
                                                                                                    ?.executor_approved
                                                                                        )}
                                                                                        memoBadge={rowMemoNoticeBadge}
                                                                                        onMemoActivate={() => {
                                                                                            setSummonsMarkerPopoverOpen(false);
                                                                                            setExecutionMemoBadgePopoverOpen(true);
                                                                                        }}
                                                                                        evictionGraceBadge={
                                                                                            isPrimary
                                                                                                ? evictionGraceBadgeInfo
                                                                                                : null
                                                                                        }
                                                                                        evictionGracePinned={evictionGracePinned}
                                                                                        onToggleEvictionGracePinned={toggleEvictionGracePinned}
                                                                                        onEvictionGraceActivate={
                                                                                            isPrimary && evictionGraceBadgeInfo
                                                                                                ? () => {
                                                                                                      setEvictionGraceDecisionId(null);
                                                                                                      openEvictionResidentialGraceModal();
                                                                                                  }
                                                                                                : undefined
                                                                                        }
                                                                                        onCompleteEvictionGrace={
                                                                                            isPrimary && evictionGraceBadgeInfo
                                                                                                ? completeEvictionResidentialGrace
                                                                                                : undefined
                                                                                        }
                                                                                        policeAssistanceBadge={
                                                                                            isPrimary
                                                                                                ? policeAssistanceBadgeInfo
                                                                                                : null
                                                                                        }
                                                                                        onPoliceAssistanceActivate={
                                                                                            isPrimary && policeAssistanceBadgeInfo
                                                                                                ? openPoliceAssistanceFromBadge
                                                                                                : undefined
                                                                                        }
                                                                                        onCompletePoliceAssistance={
                                                                                            isPrimary && policeAssistanceBadgeInfo
                                                                                                ? completePoliceAssistance
                                                                                                : undefined
                                                                                        }
                                                                                        publicationNoticeBadge={rowPublicationNoticeBadgeResolved}
                                                                                        onDismissPublicationNoticeBadge={
                                                                                            rowPublicationNoticeBadgeResolved &&
                                                                                            executionData?.id
                                                                                                ? () => {
                                                                                                      const st = getPublicationNoticeForDebtorKey(
                                                                                                          executionData,
                                                                                                          debtorKey
                                                                                                      );
                                                                                                      if (!st) return;
                                                                                                      const ts = new Date().toISOString();
                                                                                                      persistExecutionMerge({
                                                                                                          ...buildPublicationNoticePatchForDebtorKey(
                                                                                                              executionData,
                                                                                                              debtorKey,
                                                                                                              {
                                                                                                                  ...st,
                                                                                                                  badgeHiddenAt: ts,
                                                                                                              }
                                                                                                          ),
                                                                                                      });
                                                                                                  }
                                                                                                : undefined
                                                                                        }
                                                                                        onPublicationNoticeActivate={() => {
                                                                                            setSummonsContextDebtorKey(String(debtorKey));
                                                                                            setSummonsHubInitialMainTab('nashr');
                                                                                            setShowUnifiedSummonsModal(true);
                                                                                        }}
                                                                                        absenceBadge={rowAbsenceNoticeBadge}
                                                                                        onDismissAbsence={
                                                                                            rowAbsenceNoticeBadge
                                                                                                ? dismissDebtorAbsenceBadge
                                                                                                : undefined
                                                                                        }
                                                                                        showSummonsBadge={rowShowSummonsBadge}
                                                                                        onSummonsActivate={() => {
                                                                                            setSummonsContextDebtorKey(String(debtorKey));
                                                                                            setSummonsHubInitialMainTab('tabligh');
                                                                                            setShowUnifiedSummonsModal(true);
                                                                                        }}
                                                                                        regularTablighBadge={rowRegularTablighBadge}
                                                                                        onDismissRegularTablighBadge={
                                                                                            rowRegularTablighBadge && executionData?.id
                                                                                                ? () => {
                                                                                                      const m = getDebtorSummonsMarkerForKey(
                                                                                                          executionData,
                                                                                                          debtorKey,
                                                                                                          primaryDebtorKeyResolved
                                                                                                      );
                                                                                                      if (!m?.id) return;
                                                                                                      const ts = new Date().toISOString();
                                                                                                      const next = {
                                                                                                          ...m,
                                                                                                          badgeHiddenAt: ts,
                                                                                                      };
                                                                                                      persistExecutionMerge({
                                                                                                          ...buildDebtorSummonsMarkerPatchForKey(
                                                                                                              executionData,
                                                                                                              debtorKey,
                                                                                                              primaryDebtorKeyResolved,
                                                                                                              next
                                                                                                          ),
                                                                                                      });
                                                                                                      if (debtorSummonsMarkerLocal?.id === m.id) {
                                                                                                          setDebtorSummonsMarkerLocal(next);
                                                                                                      }
                                                                                                  }
                                                                                                : undefined
                                                                                        }
                                                                                        debtorArrested={Boolean(
                                                                                            debtorArrested || executionData?.debtorArrested
                                                                                        )}
                                                                                        onPersistGuarantorFollowup={persistGuarantorFollowupDetails}
                                                                                        personalCoerciveDecisionBadges={!rowIsEmployee}
                                                                                        activeDebtorKey={String(debtorKey)}
                                                                                        primaryDebtorKey={primaryDebtorKeyResolved}
                                                                                        forcedAttendancePending={rowForcedAttendancePending}
                                                                                        taklifAssignmentBadge={rowTaklifAssignmentBadge}
                                                                                        onTaklifAssignmentActivate={
                                                                                            rowTaklifAssignmentBadge
                                                                                                ? () => {
                                                                                                      const tb = rowTaklifAssignmentBadge;
                                                                                                      const ts = new Date().toISOString();
                                                                                                      const remLine =
                                                                                                          tb.remainingDays === null
                                                                                                              ? '—'
                                                                                                              : tb.remainingDays === 0
                                                                                                                ? 'انتهت المدة'
                                                                                                                : `${tb.remainingDays} يوماً`;
                                                                                                      pushTimelineEvent({
                                                                                                          id: nextTimelineId(),
                                                                                                          date: ts.slice(0, 10),
                                                                                                          timestamp: ts,
                                                                                                          title: 'عرض تفاصيل التكليف بالحضور (من بطاقة المدين)',
                                                                                                          description: `الغاية: ${tb.purpose}\nتاريخ التكليف: ${tb.notifyDateYmd}\nآخر أجل: ${tb.deadlineYmd || '—'}\nالمتبقي: ${remLine}`,
                                                                                                          type: 'summons',
                                                                                                          source: 'التبليغ',
                                                                                                          metadata: {
                                                                                                              ...timelineDebtorMetadata(debtorKey),
                                                                                                              timelineThreadKey: `taklif_badge_snapshot:${debtorKey}`,
                                                                                                          },
                                                                                                      });
                                                                                                      setSummonsContextDebtorKey(String(debtorKey));
                                                                                                      setSummonsHubInitialMainTab('taklif');
                                                                                                      setShowUnifiedSummonsModal(true);
                                                                                                  }
                                                                                                : undefined
                                                                                        }
                                                                                        onDismissTaklifAssignmentBadge={
                                                                                            rowTaklifAssignmentBadge && executionData?.id
                                                                                                ? () => {
                                                                                                      const ta = getEmployeeAssignmentForDebtorKey(
                                                                                                          executionData,
                                                                                                          debtorKey,
                                                                                                          primaryDebtorKeyResolved
                                                                                                      );
                                                                                                      if (!ta || ta.phase === 'none') return;
                                                                                                      const ts = new Date().toISOString();
                                                                                                      persistExecutionMerge({
                                                                                                          ...buildEmployeeAssignmentPatchForDebtorKey(
                                                                                                              executionData,
                                                                                                              debtorKey,
                                                                                                              {
                                                                                                                  ...ta,
                                                                                                                  badgeHiddenAt: ts,
                                                                                                              },
                                                                                                              primaryDebtorKeyResolved
                                                                                                          ),
                                                                                                      });
                                                                                                  }
                                                                                                : undefined
                                                                                        }
                                                                                        decisionsReloadEpoch={decisionsReloadEpoch}
                                                                                        isHistoricalMode={isHistoricalMode}
                                                                                    />
                                                                                </div>
                                                                            ) : null}
                                                                            {null}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                        {!isPrimary && (
                                                            <div
                                                                role="button"
                                                                tabIndex={0}
                                                                className="min-w-0 flex-1 cursor-pointer text-right"
                                                                onClick={() => toggleDebtorExpanded(debtorKey)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                        e.preventDefault();
                                                                        toggleDebtorExpanded(debtorKey);
                                                                    }
                                                                }}
                                                            >
                                                                <div
                                                                    className="flex w-full min-w-0 flex-col items-stretch gap-1"
                                                                    dir="rtl"
                                                                >
                                                                    <div
                                                                        className="flex w-full min-w-0 flex-row flex-nowrap items-center justify-center gap-2 overflow-hidden"
                                                                        dir="rtl"
                                                                    >
                                                                        <div
                                                                            className="flex min-w-0 max-w-full flex-row flex-nowrap items-center justify-center gap-1 overflow-hidden"
                                                                            dir="rtl"
                                                                        >
                                                                            {debtorHeirsWord ? (
                                                                                <span
                                                                                    className="shrink-0 text-amber-500 text-xl font-bold cursor-pointer hover:underline"
                                                                                    role="button"
                                                                                    tabIndex={0}
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        openHeirsQuickView(d as unknown as Party, 'debtor', 'ورثة المدين');
                                                                                    }}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                                                            e.preventDefault();
                                                                                            e.stopPropagation();
                                                                                            openHeirsQuickView(d as unknown as Party, 'debtor', 'ورثة المدين');
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    {debtorHeirsWord}
                                                                                </span>
                                                                            ) : null}
                                                                            <span
                                                                                className="min-w-0 max-w-full truncate text-center text-xl font-bold leading-tight text-white"
                                                                                style={
                                                                                    isPrimary && idx === 0
                                                                                        ? {
                                                                                              paddingTop: 10,
                                                                                              paddingBottom: 10,
                                                                                              display: 'block',
                                                                                          }
                                                                                        : undefined
                                                                                }
                                                                            >
                                                                                {debtorHeirsWord ? debtorDisp.baseName : debtorDisp.text}
                                                                                {(debtorHasHeirs
                                                                                    ? heirsDetailsIncludeClient(
                                                                                          (d as unknown as Party).heirs_details
                                                                                      )
                                                                                    : d.isClient) &&
                                                                                !debtorDisp.showDeceasedGlyph ? (
                                                                                    <span
                                                                                        className="ms-1 inline-block text-[#E6C673] text-[14px] leading-none select-none"
                                                                                        title="موكلي"
                                                                                        aria-label="موكلي"
                                                                                    >
                                                                                        ★
                                                                                    </span>
                                                                                ) : null}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div
                                                                        className="mt-1 flex flex-row flex-wrap items-center justify-start gap-1"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        onKeyDown={(e) => e.stopPropagation()}
                                                                        role="presentation"
                                                                        dir="rtl"
                                                                    >
                                                                        {debtorDisp.showDeceasedGlyph && !debtorHeirsWord ? (
                                                                            <span className="shrink-0 rounded-md border border-rose-500/40 bg-rose-950/40 px-1.5 py-0.5 text-[10px] font-bold leading-none text-rose-200/95 select-none">
                                                                                متوفى
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                    </div>

                                                {debtorOpen && (
                                                    <div
                                                        className="rounded-b-xl border-t border-rose-500/10 px-0 pb-1 pt-2 space-y-1.5 overflow-hidden text-right"
                                                        dir="rtl"
                                                    >
                                                        <div className="mb-2 flex items-center justify-end px-0">
                                                            <ExecutionPartySpecialActionsMenu
                                                                variant="debtor"
                                                                debtorDeathEntryLabel={debtorDeathMenuLabel}
                                                                onReportDebtorDeath={handleDebtorDeathMenuAction}
                                                                debtorIsEmployee={rowIsEmployee}
                                                                debtorEmploymentToggleLabel={rowEmploymentToggleLabel}
                                                                onToggleDebtorEmployment={() =>
                                                                    handleDebtorEmploymentToggle({
                                                                        debtorKey,
                                                                        isPrimary,
                                                                    })
                                                                }
                                                                debtorEmploymentToggleToKasabDisabled={false}
																hideDebtorEmploymentToggle={Boolean(
																(d as unknown as Debtor)?.isDeceased ||
																	(isPrimary && executionData?.is_debtor_deceased)
															)}
                                                                isHistoricalMode={isHistoricalMode}
                                                            />
                                                        </div>
                                                        {debtorDisp.heirSubstituteLines &&
                                                        debtorDisp.heirSubstituteLines.length > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => openHeirsNotificationCenter()}
                                                            className="mb-2 w-full rounded-xl border border-cyan-400/45 bg-gradient-to-r from-cyan-900/35 to-blue-900/35 px-3 py-2 text-[10px] font-black text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.18)] hover:from-cyan-800/40 hover:to-blue-800/40"
                                                        >
                                                            فتح مركز تبليغ الورثة
                                                        </button>
                                                    ) : null}
                                                    {showDebtorNotificationPanel && (
                                                        <div className="mb-1 rounded-xl border border-cyan-500/25 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-cyan-950/25 p-2.5 shadow-inner shadow-black/20">
                                                            <div className="mb-1.5 flex flex-row-reverse flex-wrap items-center justify-between gap-2">
                                                                <span className="text-[11px] font-bold text-cyan-100/95">
                                                                    التبليغ والإخبار
                                                                </span>
                                                            </div>
                                                            {null}
                                                            <button
                                                                type="button"
                                                                disabled={executionToolsTimelineLockedUi}
                                                                onClick={() => {
                                                                    if (
                                                                        activeDebtorIsDeceased &&
                                                                        activeDebtorHeirsForNotification.length > 0
                                                                    ) {
                                                                        openHeirsNotificationCenter();
                                                                        return;
                                                                    }
                                                                    setSummonsContextDebtorKey(null);
                                                                    setSummonsHubInitialMainTab(null);
                                                                    setShowUnifiedSummonsModal(true);
                                                                }}
                                                                className={`w-full flex flex-row-reverse items-center justify-center gap-2 rounded-lg border border-cyan-500/35 bg-cyan-950/40 py-2.5 text-[11px] font-bold text-cyan-50 transition-all ${
                                                                    executionToolsTimelineLockedUi
                                                                        ? 'opacity-40 cursor-not-allowed'
                                                                        : 'hover:bg-cyan-900/50 hover:border-cyan-400/45'
                                                                }`}
                                                            >
                                                                <Bell size={16} className="text-cyan-300 shrink-0" />
                                                                {activeDebtorIsDeceased &&
                                                                activeDebtorHeirsForNotification.length > 0
                                                                    ? 'فتح مركز تبليغ الورثة'
                                                                    : 'فتح مركز التبليغ والتكليف'}
															</button>
													</div>
											)}
                                                    <div className="flex flex-col gap-2">
                                                        {(isPrimary || d.occupation || multiDebtorMode) || d.phone ? (
                                                            <div
                                                                className={
                                                                    (isPrimary || d.occupation || multiDebtorMode) &&
                                                                    d.phone
                                                                        ? 'grid grid-cols-2 gap-2'
                                                                        : 'grid grid-cols-1 gap-2'
                                                                }
                                                            >
                                                                {(isPrimary || d.occupation || multiDebtorMode) ? (
                                                                    <div className="min-w-0 rounded-lg border border-rose-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                                        <p className="mb-0.5 text-[10px] text-gray-400">
                                                                            الوظيفة
                                                                        </p>
                                                                        <p className="text-xs font-medium text-slate-200 break-words">
                                                                            {rowIsEmployee ? 'موظف' : 'كاسب'}
                                                                        </p>
                                                                    </div>
                                                                ) : null}
                                                                {d.phone ? (
                                                                    <div className="min-w-0 rounded-lg border border-rose-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                                        <div className="mb-0.5 flex flex-row-reverse items-center justify-end gap-1 text-[10px] text-gray-400">
                                                                            <span>الهاتف</span>
                                                                            <Phone
                                                                                size={12}
                                                                                className="shrink-0 text-rose-400"
                                                                            />
                                                                        </div>
                                                                        <p className="text-xs font-medium text-white [unicode-bidi:plaintext] break-all">
                                                                            {d.phone}
                                                                        </p>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        ) : null}
                                                        {d.address ? (
                                                            <div className="min-w-0 rounded-lg border border-rose-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                                <div className="mb-0.5 flex flex-row-reverse items-center justify-end gap-1 text-[10px] text-gray-400">
                                                                    <span>العنوان (للتبليغ)</span>
                                                                    <MapPin
                                                                        size={12}
                                                                        className="shrink-0 text-rose-400"
                                                                    />
                                                                </div>
                                                                <p className="text-xs leading-snug text-white break-words [unicode-bidi:plaintext]">
                                                                    {d.address}
                                                                </p>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    <div className="mt-1.5 flex justify-end border-t border-rose-500/10 pt-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (
                                                                    multiDebtorMode &&
                                                                    raw.fileDebtorIndex === null
                                                                ) {
                                                                    showToast(
                                                                        'تعديل المدين الإضافي من بيانات إنشاء الإضبارة.',
                                                                        'info'
                                                                    );
                                                                    return;
                                                                }
                                                                openEditParty('debtor', idx);
                                                            }}
                                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 hover:text-rose-300 hover:underline"
                                                        >
                                                            <Pencil size={12} />
                                                            تعديل الاسم والهاتف والعنوان
                                                        </button>
                                                    </div>

                                                    {rowIsEmployee &&
                                                        !isEvictionExecutionModule &&
                                                        rowIsGovEmpEffective &&
                                                        rowShowSalaryCaptureForEmployee && (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-end gap-2">
                                                                {salaryStored ? (
                                                                    <span className="text-emerald-300 text-sm font-mono font-bold">
                                                                        {parseFloat(String(salaryStored)).toLocaleString('ar-IQ')} دينار
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const salary = prompt('أدخل صافي الراتب الشهري بالدينار:');
                                                                            if (!salary || isNaN(parseFloat(salary))) return;
                                                                            const parsedSalary = parseFloat(salary);
                                                                            const garnishment = parsedSalary / 5;
                                                                            const persistId =
                                                                                executionId != null && String(executionId).trim() !== ''
                                                                                    ? String(executionId).trim()
                                                                                    : String(executionData?.id ?? '').trim();
                                                                            if (!persistId || persistId === 'undefined') {
                                                                                showToast('⚠️ تعذر حفظ الراتب', 'warning');
                                                                                return;
                                                                            }
                                                                            const lsKey = executionStorageKey(persistId);
                                                                            const stored = storageCache.get(lsKey);
                                                                            let execution: Record<string, unknown>;
                                                                            if (stored) {
                                                                                execution = typeof stored === 'object' ? { ...(stored as object) } : { ...(executionData as object) };
                                                                            } else {
                                                                                execution = { ...(executionData as object) };
                                                                            }
                                                                            if (isPrimary) {
                                                                                execution.employeeSalary = parsedSalary;
                                                                                execution.garnishmentAmount = garnishment;
                                                                            } else {
                                                                                const prevSal =
                                                                                    execution.perDebtorSalaries != null &&
                                                                                    typeof execution.perDebtorSalaries ===
                                                                                        'object' &&
                                                                                    !Array.isArray(
                                                                                        execution.perDebtorSalaries
                                                                                    )
                                                                                        ? {
                                                                                              ...(execution.perDebtorSalaries as Record<
                                                                                                  string,
                                                                                                  string
                                                                                              >),
                                                                                          }
                                                                                        : {};
                                                                                const prevGar =
                                                                                    execution.perDebtorGarnishments !=
                                                                                        null &&
                                                                                    typeof execution.perDebtorGarnishments ===
                                                                                        'object' &&
                                                                                    !Array.isArray(
                                                                                        execution.perDebtorGarnishments
                                                                                    )
                                                                                        ? {
                                                                                              ...(execution.perDebtorGarnishments as Record<
                                                                                                  string,
                                                                                                  string
                                                                                              >),
                                                                                          }
                                                                                        : {};
                                                                                execution.perDebtorSalaries = {
                                                                                    ...prevSal,
                                                                                    [debtorKey]: String(parsedSalary),
                                                                                };
                                                                                execution.perDebtorGarnishments = {
                                                                                    ...prevGar,
                                                                                    [debtorKey]: String(garnishment),
                                                                                };
                                                                            }
                                                                            storageCache.set(lsKey, execution);
                                                                            const salaryEvent = {
                                                                                id: Date.now().toString(),
                                                                                date: new Date().toISOString(),
                                                                                title: '💼 تسجيل راتب الموظف المدين',
                                                                                description: `${d.name || 'مدين'} — صافي الراتب: ${parsedSalary.toLocaleString('ar-IQ')} دينار. مقدار الحجز الشهري (1/5): ${garnishment.toLocaleString('ar-IQ')} دينار.`,
                                                                                type: 'payment'
                                                                            };
                                                                            setTimelineEvents(prev => [salaryEvent, ...prev]);
                                                                            showToast('✅ تم تسجيل راتب الموظف وحساب مقدار الحجز', 'success');
                                                                            setExecutionStorageTick((n) => n + 1);
                                                                        }}
                                                                        className="bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                                                    >
                                                                        <DollarSign size={12} />
                                                                        ➕ إدخال مقدار الراتب كتابةً
                                                                    </button>
                                                                )}
                                                                <div className="flex items-center gap-1">
                                                                    <Wallet size={14} className="text-amber-400" />
                                                                    <span className="text-gray-400 text-xs">مقدار الراتب الصافي</span>
                                                                </div>
                                                            </div>
                                                            {garnishStored != null && String(garnishStored) !== '' && (
                                                                <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-2">
                                                                    <p className="text-amber-300 text-[10px] font-bold text-right mb-1">
                                                                        💼 مقدار الحجز الشهري (1/5):
                                                                    </p>
                                                                    <p className="text-amber-400 text-sm font-mono font-black text-right">
                                                                        {parseFloat(String(garnishStored)).toLocaleString('ar-IQ')} دينار
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {salaryStored && (
                                                        <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-2 text-right">
                                                            <p className="text-[10px] text-emerald-300/90">مقدار الراتب/الدخل المسجل</p>
                                                            <p className="text-sm font-black font-mono text-emerald-200">
                                                                {parseFloat(String(salaryStored)).toLocaleString('ar-IQ')} دينار
                                                            </p>
                                                        </div>
                                                    )}

                                                    {!d.phone && !d.address && (
                                                        <p className="text-gray-500 text-xs text-center py-2">لا توجد بيانات اتصال</p>
                                                    )}
                                                        </div>
                                                    )}

                                                    {typeof document !== 'undefined' &&
                                                        isPrimary &&
                                                        executionMemoBadgePopoverOpen &&
                                                        (primaryMemoNoticeBadge || showDebtorUnservedMemoBadge) &&
                                                            <div
                                                                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
                                                                onClick={() =>
                                                                    setExecutionMemoBadgePopoverOpen(false)
                                                                }
                                                                role="presentation"
                                                            >
                                                                <div
                                                                    role="dialog"
                                                                    aria-modal="true"
                                                                    aria-labelledby="execution-memo-badge-detail-title"
                                                                    className="relative w-full max-w-xs rounded-xl border border-[#E6C673]/30 bg-[#0A0F1C] shadow-2xl text-right max-h-[min(85vh,22rem)] flex flex-col overflow-hidden"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                                                                        <button
                                                                            type="button"
                                                                            aria-label="إغلاق"
                                                                            onClick={() =>
                                                                                setExecutionMemoBadgePopoverOpen(
                                                                                    false
                                                                                )
                                                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                                                                        >
                                                                            <X size={16} />
                                                                        </button>
                                                                        <h2
                                                                            id="execution-memo-badge-detail-title"
                                                                            className="text-xs font-bold text-[#E6C673] flex items-center gap-2 flex-row-reverse"
                                                                        >
                                                                            <Calendar
                                                                                size={14}
                                                                                className="text-[#E6C673]/90 shrink-0"
                                                                            />
                                                                            {primaryMemoNoticeBadge
                                                                                ? 'تم تبليغ المدين بالمذكرة'
                                                                                : 'مذكرة الإخبار بالتنفيذ'}
                                                                        </h2>
                                                                    </div>
                                                                    <div className="space-y-2 overflow-y-auto px-3 py-3 text-right flex-1 min-h-0">
                                                                        {primaryMemoNoticeBadge ? (
                                                                            <>
                                                                                <div>
                                                                                    <p className="text-[9px] text-slate-500 mb-0.5">
                                                                                        تاريخ المذكرة (مرجع المهلة)
                                                                                    </p>
                                                                                    <p className="text-xs text-white font-mono tabular-nums">
                                                                                        {primaryMemoNoticeBadge.anchor}
                                                                                    </p>
                                                                                </div>
                                                                                <p
                                                                                    className={`text-[10px] font-semibold tabular-nums leading-relaxed ${
                                                                                        primaryMemoNoticeBadge.graceExpired
                                                                                            ? 'text-amber-200/95'
                                                                                            : 'text-emerald-300/95'
                                                                                    }`}
                                                                                >
                                                                                    باقي {primaryMemoNoticeBadge.remaining}{' '}
                                                                                    يوماً ضمن المهلة التقويمية.
                                                                                    {primaryMemoNoticeBadge.graceExpired && (
                                                                                        <span className="block mt-1.5 text-amber-200/85 text-[9px]">
                                                                                            يمكنك تسجيل «تم انتهاء المدة» أو «حضور
                                                                                            المدين» من نافذة التبليغ.
                                                                                        </span>
                                                                                    )}
                                                                                </p>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <p className="text-[11px] font-bold text-amber-100">
                                                                                    لم يُسجَّل بعد تبليغ بمذكرة الإخبار بالتنفيذ
                                                                                </p>
                                                                                <p className="text-[10px] leading-relaxed text-slate-300">
                                                                                    هذه الإشارة مرتبطة بمرحلة مذكرة الإخبار فقط،
                                                                                    وتختفي نهائياً عند: تسجيل تبليغ المذكرة، أو
                                                                                    حضور المدين دون تبليغ، أو إنهاء مدة المذكرة.
                                                                                </p>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setExecutionMemoBadgePopoverOpen(false);
                                                                                        setSummonsContextDebtorKey(null);
                                                                                        setSummonsHubInitialMainTab('tabligh');
                                                                                        setShowUnifiedSummonsModal(true);
                                                                                    }}
                                                                                    className="w-full rounded-xl border border-cyan-500/35 bg-cyan-950/40 py-2.5 text-[11px] font-bold text-cyan-50 hover:bg-cyan-900/50 hover:border-cyan-400/45"
                                                                                >
                                                                                    فتح مركز التبليغ والتكليف
                                                                                </button>
                                                                            </>
                                                                        )}
												</div>
										</div>
									</div>,
								document.body
							)}

                                                    {typeof document !== 'undefined' &&
                                                        isPrimary &&
                                                        showDebtorSummonsAttendanceBadge &&
                                                        summonsMarkerPopoverOpen &&
                                                        debtorSummonsMarkerLocal?.id &&
                                                            <div
                                                                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
                                                                onClick={() =>
                                                                    setSummonsMarkerPopoverOpen(false)
                                                                }
                                                                role="presentation"
                                                            >
                                                                <div
                                                                    role="dialog"
                                                                    aria-modal="true"
                                                                    aria-labelledby="summons-marker-detail-title"
                                                                    className="relative w-full max-w-xs rounded-xl border border-[#E6C673]/30 bg-[#0A0F1C] shadow-2xl text-right max-h-[85vh] flex flex-col overflow-hidden"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                                                                        <button
                                                                            type="button"
                                                                            aria-label="إغلاق"
                                                                            onClick={() =>
                                                                                setSummonsMarkerPopoverOpen(false)
                                                                            }
                                                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                                                                        >
                                                                            <X size={16} />
                                                                        </button>
                                                                        <h2
                                                                            id="summons-marker-detail-title"
                                                                            className="text-xs font-bold text-[#E6C673] flex items-center gap-2 flex-row-reverse"
                                                                        >
                                                                            <Bell
                                                                                size={14}
                                                                                className="text-[#E6C673]/90 shrink-0"
                                                                            />
                                                                            تطلب حضوره
                                                                        </h2>
                                                                    </div>
                                                                    <div className="space-y-3 overflow-y-auto px-3 py-3 flex-1 min-h-0">
                                                                        <div>
                                                                            <p className="text-[9px] text-slate-500 mb-0.5">
                                                                                تاريخ التبليغ
                                                                            </p>
                                                                            <p className="text-xs text-white font-mono tabular-nums">
                                                                                {debtorSummonsMarkerLocal?.date ||
                                                                                    '—'}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <label
                                                                                htmlFor="summons-purpose-floating"
                                                                                className="block text-[9px] text-slate-500 mb-1"
                                                                            >
                                                                                الغاية من التبليغ أو الحضور
                                                                            </label>
                                                                            <textarea
                                                                                id="summons-purpose-floating"
                                                                                value={summonsPurposeDraft}
                                                                                onChange={(e) =>
                                                                                    setSummonsPurposeDraft(
                                                                                        e.target.value
                                                                                    )
                                                                                rows={3}
                                                                                className="w-full rounded-lg bg-white/[0.06] border border-[#E6C673]/20 px-2.5 py-2 text-white text-[11px] resize-none focus:outline-none focus:ring-1 focus:ring-[#E6C673]/40 min-h-[4.5rem]"
                                                                            />
                                                                        </div>
                                                                        <div className="flex flex-col gap-2 shrink-0">
                                                                            <button
                                                                                type="button"
                                                                                onClick={
                                                                                    saveSummonsMarkerPurposeEdit
                                                                                }
                                                                                className="rounded-lg bg-emerald-600/85 py-2 text-[11px] font-bold text-white shadow-md shadow-emerald-950/20"
                                                                            >
                                                                                حفظ التعديل
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setSummonsMarkerPopoverOpen(
                                                                                        false
                                                                                    );
                                                                                    clearDebtorSummonsMarker();
                                                                                }}
                                                                                className="rounded-lg border border-rose-500/45 bg-rose-950/45 py-2 text-[11px] font-bold text-rose-200"
                                                                            >
                                                                                إخفاء من الإشارة
																		</button>
																		</div>
																	</div>
																</div>
														</div>,
														document.body
												)}
											</div>
										</div>
                                        {isPrimary && executionData?.guarantor_followup?.executor_approved ? (
                                            <div className="w-full" dir="rtl">
                                                <div className="relative rounded-2xl border border-white/10 bg-[#0A0F1C]/55 px-3 py-3">
                                                    {guarantorMenuOpen ? (
                                                        <div
                                                            className="fixed inset-0 z-[9998]"
                                                            role="presentation"
                                                            onClick={() => setGuarantorMenuOpen(false)}
                                                        />
                                                    ) : null}
                                                    {guarantorSeizureOpen ? (
                                                        <div
                                                            className="fixed inset-0 z-[9998]"
                                                            role="presentation"
                                                            onClick={() => setGuarantorSeizureOpen(false)}
                                                        />
                                                    ) : null}

                                                    <div className="flex items-start justify-between gap-2 flex-row-reverse">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-row-reverse">
                                                                <p className="text-sm font-black text-white">
                                                                    الكفيل الضامن
                                                                </p>
                                                                <span
                                                                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                                                        executionData.guarantor_followup?.guarantee_type ===
                                                                        'attendance'
                                                                            ? 'bg-orange-500/20 text-orange-400'
                                                                            : 'bg-emerald-500/20 text-emerald-400'
                                                                    }`}
                                                                >
                                                                    {executionData.guarantor_followup?.guarantee_type ===
                                                                    'attendance'
                                                                        ? 'كفالة إحضار شخصية'
                                                                        : 'كفالة ضامنة للمبلغ'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            aria-expanded={guarantorMenuOpen}
                                                            aria-label="قائمة إجراءات الكفيل"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setGuarantorSeizureOpen(false);
                                                                setGuarantorMenuOpen((v) => !v);
                                                            }}
                                                            className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10"
                                                        >
                                                            <MoreVertical size={16} />
                                                        </button>
                                                        {guarantorMenuOpen ? (
                                                            <div className="absolute left-3 top-12 z-[9999] w-48 overflow-hidden rounded-xl border border-white/10 bg-[#0A0F1C]/95 shadow-2xl">
                                                                <button
                                                                    type="button"
                                                                    className="w-full px-3 py-2 text-right text-[12px] font-bold text-white hover:bg-white/5"
                                                                    onClick={() => {
                                                                        setGuarantorMenuOpen(false);
                                                                        openGuarantorDetailsModal();
                                                                    }}
                                                                >
                                                                    تعديل بيانات الكفيل
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="w-full px-3 py-2 text-right text-[12px] font-bold text-amber-100 hover:bg-white/5"
                                                                    onClick={() => {
                                                                        setGuarantorMenuOpen(false);
                                                                        setGuarantorReplaceConfirmOpen(true);
                                                                    }}
                                                                >
                                                                    استبدال الكفيل
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="w-full px-3 py-2 text-right text-[12px] font-bold text-rose-100 hover:bg-white/5"
                                                                    onClick={() => {
                                                                        setGuarantorMenuOpen(false);
                                                                        setGuarantorUnlinkConfirmOpen(true);
                                                                    }}
                                                                >
                                                                    فك الكفالة / حذف
                                                                </button>
                                                            </div>
                                                        ) : null}
                                                    </div>

                                                    {typeof document !== 'undefined' &&
                                                    (guarantorReplaceConfirmOpen || guarantorUnlinkConfirmOpen) &&
                                                            <div
                                                                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                                                                role="presentation"
                                                                onClick={() => {
                                                                    setGuarantorReplaceConfirmOpen(false);
                                                                    setGuarantorUnlinkConfirmOpen(false);
                                                                }}
                                                            >
                                                                <div
                                                                    role="dialog"
                                                                    aria-modal="true"
                                                                    className="w-full max-w-sm rounded-2xl border border-rose-500/25 bg-[#0A0F1C] p-4 text-right shadow-2xl"
                                                                    dir="rtl"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <p className="text-sm font-black text-rose-100">
                                                                        تحذير
                                                                    </p>
                                                                    <p className="mt-2 text-[12px] leading-relaxed text-slate-200/90">
                                                                        تحذير: هذا الإجراء يقوم بأرشفة بيانات الكفيل الحالية.
                                                                    </p>
                                                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                                                        <button
                                                                            type="button"
                                                                            className="rounded-xl bg-slate-800 py-2.5 text-[11px] font-bold text-white hover:bg-slate-700"
                                                                            onClick={() => {
                                                                                setGuarantorReplaceConfirmOpen(false);
                                                                                setGuarantorUnlinkConfirmOpen(false);
                                                                            }}
                                                                        >
                                                                            تراجع
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="rounded-xl border border-rose-500/35 bg-rose-950/35 py-2.5 text-[11px] font-black text-rose-100 hover:bg-rose-950/50"
                                                                            onClick={() => {
                                                                                if (guarantorReplaceConfirmOpen) {
                                                                                    setGuarantorReplaceConfirmOpen(false);
                                                                                    archiveAndClearGuarantor('replace');
                                                                                    handleGuarantorRequestFromFollowup();
                                                                                    return;
                                                                                }
                                                                                setGuarantorUnlinkConfirmOpen(false);
                                                                                archiveAndClearGuarantor('unlink');
                                                                            }}
                                                                        >
                                                                            {guarantorReplaceConfirmOpen
                                                                                ? 'تأكيد الاستبدال'
                                                                                : 'تأكيد فك الكفالة'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>,
                                                            document.body
                                                        )}

                                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                                        <div className="min-w-0">
                                                            <div className="text-sm text-gray-400">الاسم</div>
                                                            <div className="font-bold text-white truncate">
                                                                {executionData.guarantor_followup?.guarantor_name?.trim() ||
                                                                    '—'}
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm text-gray-400">عنوان العمل</div>
                                                            <div className="font-bold text-white truncate">
                                                                {executionData.guarantor_followup?.guarantor_workplace?.trim() ||
                                                                    '—'}
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm text-gray-400">الراتب</div>
                                                            <div className="font-bold text-white font-mono tabular-nums truncate">
                                                                {typeof executionData.guarantor_followup?.guarantor_salary_iqd ===
                                                                    'number' &&
                                                                Number.isFinite(
                                                                    executionData.guarantor_followup.guarantor_salary_iqd as number
                                                                ) &&
                                                                (executionData.guarantor_followup.guarantor_salary_iqd as number) >
                                                                    0
                                                                    ? `${(
                                                                          executionData.guarantor_followup.guarantor_salary_iqd as number
                                                                      ).toLocaleString('ar-IQ')} د.ع`
                                                                    : '—'}
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm text-gray-400">الاستقطاع</div>
                                                            <div className="font-bold text-white font-mono tabular-nums truncate">
                                                                {typeof executionData.guarantor_followup?.guarantor_deduction_iqd ===
                                                                    'number' &&
                                                                Number.isFinite(
                                                                    executionData.guarantor_followup.guarantor_deduction_iqd as number
                                                                ) &&
                                                                (executionData.guarantor_followup.guarantor_deduction_iqd as number) >
                                                                    0
                                                                    ? `${(
                                                                          executionData.guarantor_followup.guarantor_deduction_iqd as number
                                                                      ).toLocaleString('ar-IQ')} د.ع`
                                                                    : '—'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 flex flex-row gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSummonsContextDebtorKey(null);
                                                                setSummonsHubInitialMainTab('guarantor');
                                                                setShowUnifiedSummonsModal(true);
                                                            }}
                                                            className="flex-1 inline-flex items-center justify-center gap-2 flex-row-reverse rounded-xl border border-cyan-500/25 bg-cyan-500/10 py-2.5 text-[11px] font-bold text-cyan-50 hover:bg-cyan-500/15"
                                                        >
                                                            <Bell size={14} />
                                                            تبليغ الكفيل
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={executionData.guarantor_followup?.guarantee_type !== 'amount'}
                                                            onClick={() => setGuarantorSeizureOpen((v) => !v)}
                                                            className={`flex-1 inline-flex items-center justify-center gap-2 flex-row-reverse rounded-xl border py-2.5 text-[11px] font-bold transition-colors ${
                                                                executionData.guarantor_followup?.guarantee_type !== 'amount'
                                                                    ? 'border-white/10 bg-white/5 text-slate-400'
                                                                    : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15'
                                                            }`}
                                                            title={
                                                                executionData.guarantor_followup?.guarantee_type !== 'amount'
                                                                    ? 'كفالة إحضار فقط'
                                                                    : undefined
                                                            }
                                                        >
                                                            <Wallet size={14} />
                                                            اتخاذ إجراءات الحجز
                                                        </button>
                                                    </div>

                                                    {guarantorSeizureOpen &&
                                                    executionData.guarantor_followup?.guarantee_type === 'amount' ? (
                                                        <div className="mt-3 rounded-2xl border border-white/10 bg-[#0A0F1C]/70 p-2">
                                                            <div className="grid grid-cols-1 gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setGuarantorSeizureOpen(false);
                                                                        requestGuarantorSeizure('salary');
                                                                    }}
                                                                    className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-2 text-[11px] font-bold text-emerald-100 hover:bg-emerald-500/15"
                                                                >
                                                                    طلب حجز راتب الكفيل
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setGuarantorSeizureOpen(false);
                                                                        requestGuarantorSeizure('movable');
                                                                    }}
                                                                    className="w-full rounded-xl border border-sky-500/20 bg-sky-500/10 py-2 text-[11px] font-bold text-sky-100 hover:bg-sky-500/15"
                                                                >
                                                                    طلب حجز أموال منقولة
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setGuarantorSeizureOpen(false);
                                                                        requestGuarantorSeizure('property');
                                                                    }}
                                                                    className="w-full rounded-xl border border-amber-500/20 bg-amber-500/10 py-2 text-[11px] font-bold text-amber-100 hover:bg-amber-500/15"
                                                                >
                                                                    طلب حجز عقار
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ) : null}
                                        </div>
										);
                                        })}
                                        {!multiDebtorMode && effectiveDebtors.length > 2 && (
                                            <PartyOverflowToggle
                                                hiddenCount={effectiveDebtors.length - 2}
                                                expanded={showExtraDebtors}
                                                onToggle={() => setShowExtraDebtors(v => !v)}
                                                variant="debtor"
                                            />
                                        )}
                            </div>
                    </div>

                    {isEvictionExecutionModule && judicialCustodiansResolved.length > 0 && (
                        <div className="mx-3 mt-1.5 space-y-1">
                            <p className="text-[9px] font-bold text-amber-500/90 text-right px-0.5">
                                {judicialCustodiansResolved.length === 1
                                    ? 'الحارس القضائي'
                                    : 'الحرس القضائيون'}
                            </p>
                            {judicialCustodiansResolved.map((c) => (
                                <div
                                    key={c.id}
                                    dir="rtl"
                                    className="flex w-full items-center gap-2 rounded-lg border border-white/[0.07] bg-gradient-to-l from-[#0c1426]/98 to-[#080d18]/98 py-1.5 ps-1.5 pe-2 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
                                >
                                    <div className="min-w-0 flex-1 text-right">
                                        <div className="flex flex-row-reverse flex-wrap items-baseline justify-end gap-x-1.5 gap-y-0">
                                            <span className="inline text-[12px] font-bold leading-tight text-white [overflow-wrap:anywhere]">
                                                {c.fullName}
                                            </span>
                                            <span className="inline shrink-0 rounded bg-amber-500/12 px-1 py-px text-[8px] font-bold tracking-wide text-amber-400/95">
                                                حارس
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                                            <span className="text-slate-500/85">راتب</span>{' '}
                                            <span className="font-mono tabular-nums text-slate-300/95">
                                                {c.salary}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="shrink-0 self-center">
                                        <Suspense fallback={null}>
                                            <JudicialCustodianCardMenu
                                                onEdit={() => {
                                                    setJudicialCustodianModalCtx({
                                                        requestTitle:
                                                            judicialCustodiansResolved.length === 1
                                                                ? 'تعديل بيانات الحارس القاضي'
                                                                : 'تعديل بيانات أحد الحرس القضائين',
                                                        initialName: c.fullName,
                                                        initialSalary: c.salary,
                                                        onSaved: (payload) => {
                                                            const savedAt = new Date().toISOString();
                                                            const next = judicialCustodiansResolved.map((row) =>
                                                                String(row.id) === String(c.id)
                                                                    ? {
                                                                          ...row,
                                                                          fullName: payload.name,
                                                                          salary: payload.salary,
                                                                          savedAt,
                                                                      }
                                                                    : row
                                                            );
                                                            persistExecutionMerge({
                                                                eviction_judicial_custodians: next,
                                                                eviction_judicial_custodian: null,
                                                            });
                                                            showToast('تم تحديث بيانات الحارس', 'success');
                                                        },
                                                    });
                                                    setJudicialCustodianModalOpen(true);
                                                }}
                                                onDelete={() => removeJudicialCustodianEntry(c.id)}
                                            />
                                        </Suspense>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                        
                        {/* 🆕 V17: CLUNKY BROWN BOX DELETED - Status shown as Micro-Tag only */}
                        
                        {/* نقل أزرار محضر المتابعة داخل نافذة «محضر المتابعة» فقط */}
                    
                    {activeGraceTasks.length > 0 && evictionGracePinned && !evictionGraceHidden ? (
                        <div className="mx-3 mt-2 overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.10] via-white/[0.03] to-transparent backdrop-blur-3xl shadow-[0_18px_60px_rgba(0,0,0,0.38)]">
                            <div className="flex flex-row-reverse items-center justify-between gap-3 px-4 py-3">
                                <div className="min-w-0 flex-1 text-right">
                                    <p className="text-[12px] font-black text-white">المهلة</p>
                                </div>
                                <div className="flex flex-row-reverse items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEvictionGraceHidden(true);
                                            if (graceHiddenKey) {
                                                try {
                                                    localStorage.setItem(graceHiddenKey, '1');
                                                } catch {
                                                    /* ignore */
                                                }
                                            }
                                        }}
                                        className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold text-slate-200 hover:bg-white/[0.06]"
                                    >
                                        إخفاء
                                    </button>
                                    <span className="shrink-0 inline-flex items-center justify-center rounded-full border border-amber-400/25 bg-amber-500/[0.10] px-2.5 py-1 text-[10px] font-bold tabular-nums text-amber-200">
                                        {Math.min(1, activeGraceTasks.length)}
                                    </span>
                                </div>
                            </div>
                            <div className="px-3 pb-3" dir="rtl">
                                {activeGraceTasks.slice(0, 1).map((t) => (
                                    <div
                                        key={String(t.id)}
                                        className="rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2.5"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="min-w-0 flex-1 text-[13px] font-bold leading-snug text-white break-words">
                                                {t.title}
                                            </p>
                                            <span className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-slate-300">
                                                <Clock size={11} className="text-amber-500/90 shrink-0" />
                                                {new Date(t.dueDate).toLocaleDateString('ar-EG', {
                                                    weekday: 'long',
                                                    day: 'numeric',
                                                    month: 'short',
                                                })}
                                            </span>
                                        </div>
                                        {t.body ? (
                                            <p className="mt-1 text-[11px] leading-relaxed text-slate-400 whitespace-pre-line break-words">
                                                {t.body}
                                            </p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : activeGraceTasks.length > 0 && evictionGracePinned && evictionGraceHidden ? (
                        <div className="mx-3 mt-2 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2" dir="rtl">
                            <p className="text-[11px] font-bold text-slate-200">المهلة مخفية</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setEvictionGraceHidden(false);
                                    if (graceHiddenKey) {
                                        try {
                                            localStorage.setItem(graceHiddenKey, '0');
                                        } catch {
                                            /* ignore */
                                        }
                                    }
                                }}
                                className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-200 hover:bg-amber-500/15"
                            >
                                إظهار
                            </button>
                        </div>
                    ) : null}

                    {activeCaseTasksPending.length > 0 ? (
                        <div className="mx-3 mt-2 overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent backdrop-blur-3xl shadow-[0_22px_70px_rgba(0,0,0,0.40)]">
                            <div className="flex flex-row-reverse items-center justify-between gap-3 px-4 py-3">
                                <div className="min-w-0 flex-1 text-right">
                                    <p className="text-[12px] font-black text-white">المهام</p>
                                    <p className="text-[10px] text-slate-400">قائمة مستقلة — سريعة وخفيفة</p>
                                </div>
                                <span className="shrink-0 inline-flex items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/[0.10] px-2.5 py-1 text-[10px] font-bold tabular-nums text-emerald-200">
                                    {activeCaseTasksPending.length} نشطة
                                </span>
                            </div>
                            <div className="px-3 pb-3">
                                <ul className="flex max-h-[min(220px,42vh)] flex-col gap-2 overflow-y-auto pr-0.5">
                                    {activeCaseTasksPending.map((t) => (
                                        <li
                                            key={t.id}
                                            className="rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2.5 transition-all duration-200 hover:bg-white/[0.04]"
                                            dir="rtl"
                                        >
                                            <div className="flex items-start gap-2">
                                                <div className="min-w-0 flex-1 text-right">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="min-w-0 flex-1 text-[13px] font-bold leading-snug text-white break-words">
                                                            {t.title}
                                                        </p>
                                                        <span className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-slate-300">
                                                            <Clock size={11} className="text-amber-500/90 shrink-0" />
                                                            {new Date(t.dueDate).toLocaleDateString('ar-EG', {
                                                                weekday: 'long',
                                                                day: 'numeric',
                                                                month: 'short',
                                                            })}
                                                        </span>
                                                    </div>
                                                    {t.body ? (
                                                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400 whitespace-pre-line break-words">
                                                            {t.body}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveCaseTaskToTrash(t.id)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-500/35 text-rose-300 transition hover:bg-rose-950/45"
                                                        title="حذف المهمة"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => beginEditPendingTask(t.id)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-400/35 text-indigo-200 transition hover:bg-indigo-900/35"
                                                        title="تعديل المهمة"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => completePendingTask(t.id)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-700/30 text-emerald-100 transition-all hover:bg-emerald-600/40 active:scale-[0.97]"
                                                        title="إنجاز المهمة"
                                                    >
                                                        <CheckCircle size={13} className="opacity-95" strokeWidth={2.25} />
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : null}

                    {/* إدارة الأموال + المحفظة الخاصة: تُعرضان من «المركز المالي» في أدوات الإضبارة */}
                    
                    {/* أدوات الإضبارة — شبكة مدمجة، زجاجية، بدون أسطر فرعية */}
                    <div className="mx-3 mt-2 rounded-2xl border border-[#D4AF37]/18 bg-[#0A0F1C]/28 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.05] backdrop-blur-xl sm:p-3">
                        <div className="mb-2 flex items-center justify-end gap-1.5">
                            <BookOpen size={15} className="text-[#D4AF37]/85" strokeWidth={2} />
                            <h3 className="text-[11px] font-bold tracking-tight text-[#D4AF37]/92 sm:text-xs">
                                أدوات الإضبارة
                            </h3>
                        </div>
                        
                        {showEmployeeCompulsoryProceduresBanner && (
                            <div className="mb-3 rounded-2xl border border-amber-500/40 bg-amber-950/35 px-3 py-2.5 shadow-md shadow-amber-950/20">
                                <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center sm:justify-between">
                                    <p className="min-w-0 flex-1 text-right text-[11px] font-bold leading-relaxed text-amber-100">
                                        عدم حضور التكليف مسجّل — تابع من محضر المتابعة.
                                    </p>
                                    <div className="flex shrink-0 flex-row-reverse flex-wrap items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            disabled={executionToolsTimelineLockedUi}
                                            onClick={() => {
                                                setEmployeeCompulsoryBannerDismissed(true);
                                                setShowUnifiedExecutionModal(true);
                                                setUnifiedModalTab('personal');
                                            }}
                                            className="rounded-lg border border-amber-400/50 bg-amber-600/80 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm hover:bg-amber-500/90 disabled:opacity-40"
                                        >
                                            الانتقال إلى المحضر
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEmployeeCompulsoryBannerDismissed(true)}
                                            className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[10px] font-semibold text-slate-300 hover:bg-white/5"
                                        >
                                            إخفاء
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 sm:gap-4" dir="rtl">
                            {(
                                [
                                    {
                                        key: 'appt',
                                        icon: Calendar,
                                        label: 'إضافة موعد',
                                        tone:
                                            'border-violet-500/30 bg-violet-500/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-violet-400/50 hover:bg-violet-500/15 hover:shadow-[0_0_22px_-6px_rgba(139,92,246,0.45)] focus-visible:ring-violet-400/30',
                                        iconClass: 'text-violet-300',
                                        onClick: () => setShowAppointmentModal(true),
                                        locked: executionToolsTimelineLockedUi,
                                    },
                                    {
                                        key: 'notes',
                                        icon: FileText,
                                        label: 'ملاحظات',
                                        tone:
                                            'border-orange-500/30 bg-orange-500/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-orange-400/45 hover:bg-orange-500/12 hover:shadow-[0_0_22px_-6px_rgba(249,115,22,0.4)] focus-visible:ring-orange-400/30',
                                        iconClass: 'text-orange-300',
                                        onClick: () => setShowNotesModal(true),
                                        locked: executionToolsTimelineLockedUi,
                                    },
                                    {
                                        key: 'documents',
                                        icon: FolderOpen,
                                        label: 'المستندات',
                                        tone:
                                            'border-sky-500/30 bg-sky-500/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-sky-400/45 hover:bg-sky-500/12 hover:shadow-[0_0_22px_-6px_rgba(56,189,248,0.4)] focus-visible:ring-sky-400/30',
                                        iconClass: 'text-sky-300',
                                        onClick: () => setShowDocumentsModal(true),
                                        locked: executionToolsTimelineLockedUi,
                                    },
                                    {
                                        key: 'decisions',
                                        icon: Scale,
                                        label: 'القرارات والطعون',
                                        tone:
                                            'border-rose-500/35 bg-rose-500/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-rose-400/50 hover:bg-rose-500/14 hover:shadow-[0_0_22px_-6px_rgba(244,63,94,0.38)] focus-visible:ring-rose-400/30',
                                        iconClass: 'text-rose-300',
                                        onClick: () => setShowDecisionsModal(true),
                                        locked: executionToolsTimelineLockedUi,
                                    },
                                    {
                                        key: 'followup',
                                        icon: ClipboardList,
                                        label: 'محضر المتابعة',
                                        tone:
                                            'border-emerald-500/30 bg-emerald-500/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-emerald-400/45 hover:bg-emerald-500/12 hover:shadow-[0_0_22px_-6px_rgba(52,211,153,0.35)] focus-visible:ring-emerald-400/30',
                                        iconClass: 'text-emerald-300',
                                        onClick: () => {
                                            if (executionToolsTimelineLockedUi) {
                                                showToast(
                                                    executionActionsGridLocked
                                                        ? '⚠️ الإضبارة مستأخرة — ارفع الاستئخار من الشريط التنبيهي أعلى الصفحة عند انقضاء السبب.'
                                                        : '⚠️ معاينة تاريخية — لا يمكن فتح الأدوات من الوضع الزمني.',
                                                    'warning'
                                                );
                                                return;
                                            }
                                            setShowUnifiedExecutionModal(true);
                                            setUnifiedModalTab('coercive');
                                        },
                                        locked: executionToolsTimelineLockedUi,
                                    },
                                    {
                                        key: 'finance',
                                        icon: CreditCard,
                                        label: 'المركز المالي',
                                        tone:
                                            'border-amber-500/35 bg-amber-500/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-amber-400/45 hover:bg-amber-500/12 hover:shadow-[0_0_22px_-6px_rgba(245,158,11,0.38)] focus-visible:ring-amber-400/30',
                                        iconClass: 'text-amber-300',
                                        onClick: () => {
                                            if (executionToolsTimelineLockedUi) {
                                                showToast(
                                                    executionActionsGridLocked
                                                        ? '⚠️ الإضبارة مستأخرة — ارفع الاستئخار من الشريط التنبيهي أعلى الصفحة عند انقضاء السبب.'
                                                        : '⚠️ معاينة تاريخية — لا يمكن فتح الأدوات من الوضع الزمني.',
                                                    'warning'
                                                );
                                                return;
                                            }
                                            setIsFinancialCenterExpanded(true);
                                            setShowExecutionFinancialHub(true);
                                        },
                                        locked: executionToolsTimelineLockedUi,
                                    },
                                ] as const
                            ).map((tile) => {
                                const Ico = tile.icon;
                                return (
                                    <button
                                        key={tile.key}
                                        type="button"
                                        disabled={tile.locked}
                                        onClick={tile.onClick}
											className={`group flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-xl border px-2 py-4 text-center backdrop-blur-md transition-all duration-200 focus:outline-none focus-visible:ring-2 ${tile.tone} ${
                                            tile.locked
                                                ? 'cursor-not-allowed opacity-40 hover:shadow-none'
                                                : ''
                                        }`}
                                    >
											<Ico
												size={32}
												strokeWidth={2}
												className={`shrink-0 ${tile.iconClass} transition-transform duration-200 group-hover:scale-105`}
											/>
											<span className="text-center text-[10px] font-bold leading-tight text-white sm:text-[11px]">
												{tile.label}
											</span>
                                    </button>
                                );
                            })}
												<button
                                type="button"
                                onClick={() => setIsLawReferenceOpen(true)}
                                dir="rtl"
									className="col-span-2 flex min-h-[100px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-[#E6C673]/40 bg-gradient-to-br from-[#E6C673]/12 via-amber-500/10 to-[#0A0F1C]/50 px-3 py-4 text-center shadow-[0_0_28px_-8px_rgba(230,198,115,0.35)] backdrop-blur-md transition-all duration-200 hover:border-[#E6C673]/60 hover:shadow-[0_0_32px_-6px_rgba(230,198,115,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40"
                            >
									<Book size={32} className="text-[#E6C673]" strokeWidth={2} />
									<span className="text-center text-[11px] font-bold leading-tight text-[#F5E6B8] sm:text-xs" dir="rtl">
										قانون التنفيذ
									</span>
                            </button>
                        </div>
                    </div>
                    
                    {/* ========== السجل الزمني (Relocated below Tools) ========== */}
                    <div className="mx-3 mt-3 rounded-xl border border-slate-500/25 bg-[#0A0F1C]/30 p-0.5 shadow-md shadow-black/25 ring-1 ring-white/[0.05] backdrop-blur-xl">
                        {/* HEADER */}
                        <button
                            onClick={() => startTransition(() => setTimelineAccordionExpanded(prev => !prev))}
                            className="flex w-full items-center justify-between rounded-t-[0.65rem] px-3 py-2.5 transition-all hover:bg-white/[0.04]"
                        >
                            <ChevronUp 
                                size={18} 
                                className={`text-[#D4AF37]/80 transition-transform ${timelineAccordionExpanded ? '' : 'rotate-180'}`} 
                            />
                            <div className="flex items-center gap-2">
                                <Activity size={16} className="text-[#D4AF37]/85" />
                                <h3 className="text-xs font-semibold text-slate-200 sm:text-sm">السجل الزمني</h3>
                            </div>
                        </button>
                        
                        {/* رادار ذكي — 3 افتراضياً، 5 عند وجود تثبيت */}
                        {!timelineAccordionExpanded &&
                            (debtorBrowserTabsMode
                                ? activeTimelineEventsDebtorScoped
                                : activeTimelineEvents
                            ).length > 0 && (
                            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                                <SmartTimelineRadar
                                    events={
                                        debtorBrowserTabsMode
                                            ? activeTimelineEventsDebtorScoped
                                            : activeTimelineEvents
                                    }
                                    onTogglePin={toggleTimelineEventPin}
                                    onOpenFull={() => setShowTimelineModal(true)}
                                    previewLimit={timelineRadarPreviewLimit}
                                    isHistoricalMode={isHistoricalMode}
                                    onRequestHistoricalPreview={handleRequestHistoricalSnapshotPreview}
                                />
                            </Suspense>
                        )}
                        
                        {/* EXPANDED STATE - SMART FILTERS & FULL EVENT LIST */}
                        <AnimatePresence>
                            {timelineAccordionExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-slate-600/30"
                                >
                                    {/* SMART FILTER CHIPS */}
                                    <div className="p-3 pb-0">
                                        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide">
                                            {[
                                                { label: 'الكل', icon: null },
                                                { label: 'تبليغات وإخبار', icon: 'notification' },
                                                { label: 'مواعيد', icon: 'appointment' },
                                                { label: 'حركة الأموال والرسوم', icon: 'payment' },
                                                { label: 'محجوزات وتنفيذ جبري', icon: 'coercive' },
                                                { label: 'قرارات ومحاضر', icon: 'decision' },
                                                { label: 'مستندات وملاحظات', icon: 'other' },
                                            ].map((filter) => (
                                                <button
                                                    key={filter.label}
                                                    onClick={() => setActiveTimelineFilter(filter.label)}
                                                    className={`px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all ${
                                                        activeTimelineFilter === filter.label
                                                            ? 'bg-[#E6C673]/14 text-amber-100 border border-[#E6C673]/38'
                                                            : 'bg-slate-800/30 text-slate-300 border border-slate-700/40 hover:bg-slate-700/45'
                                                    }`}
                                                >
                                                    {filter.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="max-h-[min(70vh,32rem)] overflow-y-auto overscroll-contain px-4 py-5 pb-8">
                                        {activeTimelineFilter === 'مواعيد' ? (
										(() => {
											const today = todayYmd;
                                                const isAppt = (ev: any) => String(ev?.type || '') === 'appointment';
                                                const appts = filteredTimelineEvents.filter(isAppt);
                                                const ymdOf = (ev: any): string => {
                                                    const raw = String(ev?.date || '').trim();
                                                    const m = /^\d{4}-\d{2}-\d{2}/.exec(raw);
                                                    return m ? m[0] : '';
                                                };
                                                const active = appts.filter((ev) => {
                                                    const y = ymdOf(ev);
                                                    return y && y >= today;
                                                });
                                                const ended = appts.filter((ev) => {
                                                    const y = ymdOf(ev);
                                                    return y && y < today;
                                                });
                                                return (
                                                    <div className="space-y-6" dir="rtl">
                                                        <div className="space-y-2">
                                                            <p className="text-xs font-black text-slate-200">المواعيد النشطة</p>
                                                            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                                                                <PremiumTimelineAuditLog
                                                                    events={active.slice(0, 100)}
                                                                    onTogglePin={toggleTimelineEventPin}
                                                                    onRequestTrash={moveTimelineEventToTrash}
                                                                    onRequestEdit={(ev) => setTimelineEditDraft({ ...ev })}
                                                                    isHistoricalMode={isHistoricalMode}
                                                                    onRequestHistoricalPreview={
                                                                        handleRequestHistoricalSnapshotPreview
                                                                    }
                                                                />
                                                            </Suspense>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <p className="text-xs font-black text-slate-200">المواعيد المنتهية</p>
                                                            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                                                                <PremiumTimelineAuditLog
                                                                    events={ended.slice(0, 100)}
                                                                    onTogglePin={toggleTimelineEventPin}
                                                                    onRequestTrash={moveTimelineEventToTrash}
                                                                    onRequestEdit={(ev) => setTimelineEditDraft({ ...ev })}
                                                                    isHistoricalMode={isHistoricalMode}
                                                                    onRequestHistoricalPreview={
                                                                        handleRequestHistoricalSnapshotPreview
                                                                    }
                                                                />
                                                            </Suspense>
                                                        </div>
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                                                <PremiumTimelineAuditLog
                                                    events={filteredTimelineEvents.slice(0, 100)}
                                                    onTogglePin={toggleTimelineEventPin}
                                                    onRequestTrash={moveTimelineEventToTrash}
                                                    onRequestEdit={(ev) => setTimelineEditDraft({ ...ev })}
                                                    isHistoricalMode={isHistoricalMode}
                                                    onRequestHistoricalPreview={handleRequestHistoricalSnapshotPreview}
                                                />
                                            </Suspense>
                                        )}
                                    </div>
                                    
                                    {/* FULL VIEW BUTTON */}
                                    <div className="p-3 pt-0">
                                        <button
                                            onClick={() => setShowTimelineModal(true)}
                                            className="w-full rounded-lg border border-slate-600/45 bg-slate-800/40 p-2.5 transition-all hover:border-[#E6C673]/35 hover:bg-slate-800/55"
                                        >
                                            <div className="flex items-center justify-center gap-2 text-slate-200">
                                                <History size={16} className="text-[#E6C673]/85" />
                                                <span className="text-sm font-semibold">عرض السجل الكامل</span>
                                            </div>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                {typeof document !== 'undefined' &&
                        <AnimatePresence>
                            {isLawReferenceOpen ? (
                                <>
                                    <motion.div
                                        key="law-ref-backdrop"
                                        role="presentation"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
							className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md"
                                        style={{ zIndex: EXEC_MODAL_Z.lawReferencePanel }}
                                        onClick={() => setIsLawReferenceOpen(false)}
                                    />
                                    <motion.div
                                        key="law-ref-panel"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="law-reference-title"
                                        initial={{ x: '100%' }}
                                        animate={{ x: 0 }}
                                        exit={{ x: '100%' }}
                                        transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                                        className="fixed inset-y-0 right-0 flex min-h-0 w-full max-w-2xl flex-col border-l border-slate-700/50 bg-[#0A0F1C] shadow-2xl"
                                        style={{ zIndex: EXEC_MODAL_Z.lawReferencePanel + 1 }}
                                        dir="rtl"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-700/50 px-4 py-4">
                                            <button
                                                type="button"
                                                onClick={() => setIsLawReferenceOpen(false)}
                                                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                                                aria-label="إغلاق"
                                            >
                                                <X size={22} />
                                            </button>
                                            <h2
                                                id="law-reference-title"
                                                className="flex-1 text-center text-base font-bold text-slate-100 sm:text-lg"
                                            >
                                                قانون التنفيذ العراقي رقم 45 لسنة 1980
                                            </h2>
                                            <span className="w-10 shrink-0" aria-hidden />
                                        </div>
                                        <div className="flex min-h-0 flex-1 flex-col">
                                            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                                                <ExecutionLawReferencePanel
                                                    executionType={
                                                        isEvictionExecutionModule
                                                            ? 'تخلية'
                                                            : executionData?.executionType
                                                    }
                                                />
                                            </Suspense>
                                        </div>
                                    </motion.div>
                                </>
                            ) : null}
                        </AnimatePresence>,
                        document.body
                    )}

                {showExecutionFinancialHub &&
                    typeof document !== 'undefined' &&
                        <div
                            className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
                            style={{ zIndex: EXEC_MODAL_Z.unifiedFollowUp }}
                            role="presentation"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) setShowExecutionFinancialHub(false);
                            }}
                        >
                            <div
                                className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border-2 border-[#E6C673]/40 bg-[#0B1120] shadow-2xl shadow-black/50"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <FinancialSeizureLogModal
                                    showSeizureLogModal={showSeizureLogModal}
                                    setShowSeizureLogModal={setShowSeizureLogModal}
                                    financialSeizureLogPreview={financialSeizureLogPreview}
                                    financialSeizureLogEvents={financialSeizureLogEvents}
                                />
                                <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-[#E6C673]/30 bg-[#0B1120] p-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowExecutionFinancialHub(false)}
                                        className="rounded-lg p-2 text-slate-400 transition-all hover:bg-[#E6C673]/15 hover:text-white"
                                        aria-label="إغلاق المركز المالي"
                                    >
                                        <X size={20} />
                                    </button>
                                    <h2 className="flex flex-row-reverse items-center gap-2 text-base font-bold text-[#E6C673]">
                                        <Wallet size={20} className="shrink-0 text-[#E6C673]" />
                                        المركز المالي
                                    </h2>
                                    <span className="w-9 shrink-0" aria-hidden />
                                </div>

                                <FinancialTabsHeader
                                    executionFinancialHubTab={executionFinancialHubTab}
                                    setExecutionFinancialHubTab={setExecutionFinancialHubTab}
                                />

                                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-5 pt-2">
                                    {executionFinancialHubTab === 'ledger' ? (
                                        <>
                                        <Suspense fallback={EXEC_FOC_LAZY_FALLBACK}>
                                        <LazyFinancialOperationsCenter
                                            embeddedInFinancialHub
                                            isExpanded={true}
                                            onToggle={() =>
                                                setIsFinancialCenterExpanded((prev) => !prev)
                                            }
                                            activeTab={activeFinancialTab}
                                            onTabChange={setActiveFinancialTab}
                                            principal_amount={principalDebtAmount}
                                            court_ordered_fees={evictionLawyerFeesInTotals}
                                            evictionLawyerFeeWaivedAtIntake={Boolean(
                                                executionData?.eviction_lawyer_fee_waived_at_intake
                                            )}
                                            evictionReenableCourtOrderedFees={
                                                isEvictionExecutionModule &&
                                                executionData?.eviction_lawyer_fee_waived_at_intake &&
                                                parsedLawyerFees > 0
                                                    ? {
                                                          grossAmount: parsedLawyerFees,
                                                          onEnable: () =>
                                                              persistExecutionMerge({
                                                                  eviction_lawyer_fee_waived_at_intake: false,
                                                              }),
                                                      }
                                                    : undefined
                                            }
                                            execution_expenses_sum={total_execution_expenses}
                                            past_wife_alimony={executionData?.pastWifeAlimony || 0}
                                            past_children_alimony={executionData?.pastChildrenAlimony || 0}
                                            monthly_wife_alimony={executionData?.monthlyWifeAlimony || monthlyAlimony}
                                            monthly_children_alimony={
                                                executionData?.monthlyChildrenAlimony || 0
                                            }
                                            children_count={executionData?.childrenCount || 1}
                                            totalOwed={totalOwed}
                                            remaining={remaining}
                                            feesTotal={
                                                parsedCourtFees + parsedDirectorateFees + parsedClientFees
                                            }
                                            financialStatus={financialStatus}
                                            isNonFinancialClaim={isNonFinancialClaim}
                                            isAlimonyClaim={isAlimonyClaim}
                                            claimType={claimType}
                                            paidDebt={paidDebt}
                                            totalWithExecutionFee={totalWithExecutionFee}
                                            executionFee={calculatedExecutionFee}
                                            shouldCalculateExecutionFee={shouldCalculateExecutionFee}
                                            monthlyAlimony={monthlyAlimony}
                                            accumulatedAlimony={accumulatedAlimony}
                                            courtFees={parsedCourtFees}
                                            directorateFees={parsedDirectorateFees}
                                            clientFees={parsedClientFees}
                                            paidCourtFees={paidCourtFees}
                                            paidDirectorateFees={paidDirectorateFees}
                                            paidClientFees={paidClientFees}
                                            daysSinceNotice={daysSinceNoticeCalculated}
                                            gracePeriodEnded={gracePeriodEnded}
                                            debtorJob={debtors[0]?.occupation || 'كاسب'}
                                            debtorEmploymentType={
                                                (debtors[0] as Debtor | undefined)?.employmentType
                                            }
                                            debtorKinship={debtors[0]?.kinship || ''}
                                            initiator={initiator}
                                            onPayment={() => setShowPaymentCalculator(true)}
                                            onSettlement={() => setShowSettlementCalculator(true)}
                                            onCoerciveAction={(action) => {
                                                debug.log('🔨 Coercive action initiated:', action);
                                                handleCoerciveAction(action);
                                            }}
                                            executionStatus={executionStatus}
                                            statusMetadata={statusMetadata}
                                            isPaused={isPaused}
                                            onShowLedger={() => setShowLedgerModal(true)}
                                            onShowSeizureLog={() => setShowSeizureLogModal(true)}
                                            financialLedger={financialLedger}
											executionId={(() => {
												const resolved = String(executionData?.id ?? executionId ?? '').trim();
												return resolved && resolved !== 'undefined' ? resolved : undefined;
											})()}
											creditorsCount={Array.isArray(creditors) ? creditors.length : 0}
                                            eviction_case_expenses_sum={
                                                isEvictionExecutionModule ? evictionCaseExpensesTotalForFinancial : 0
                                            }
                                            evictionFinanceStrip={
                                                isEvictionExecutionModule
                                                    ? {
                                                          expensesSum: evictionCaseExpensesTotalForFinancial,
                                                          expenseRows: evictionCaseExpenses.length,
                                                          onRecordExpense: () =>
                                                              setShowEvictionExpenseModal(true),
                                                          onRequestLawyerFees: handleEvictionLawyerFeeRequest,
                                                          lawyerFeeRequestDisabled: lawyerFeePayoutApproved,
                                                          lawyerFeeRequestTitle: lawyerFeePayoutApproved
                                                              ? 'تم قبول صرف الأتعاب من المنفذ — لا يُعاد الطلب'
                                                              : undefined,
                                                      }
                                                    : undefined
                                            }
                                            onFundsLedgerPayment={handleFundsLedgerPayment}
                                            onFinancialTimelineNote={(title, description) => {
                                                const ev: TimelineEvent = {
                                                    id: nextTimelineId(),
                                                    date: new Date().toISOString(),
                                                    timestamp: new Date().toISOString(),
                                                    title,
                                                    description,
                                                    type: 'other',
                                                    source: 'إدارة الأموال والمصاريف',
                                                };
                                                setTimelineEvents((prev) => [ev, ...prev]);
                                            }}
                                            onGuarantorRequest={() => {
                                                if (
                                                    guarantorFollowupAwaitingDetailsSave(
                                                        executionData?.guarantor_followup
                                                    )
                                                ) {
                                                    setShowUnifiedExecutionModal(false);
                                                    setExecutionDebtorTabIndex(0);
                                                    if (primaryDebtorWorkspaceKey) {
                                                        setExpandedDebtorById((prev) => ({
                                                            ...prev,
                                                            [primaryDebtorWorkspaceKey]: true,
                                                        }));
                                                    }
                                                    openGuarantorDetailsModal();
                                                    return;
                                                }
                                                const gReq = appendGuarantorFollowupRequest({
                                                    executionId: decisionsStorageExecutionId,
                                                });
                                                if (!gReq.ok) {
                                                    showToast('يوجد طلب كفيل قيد البت لدى المنفذ.', 'warning', {
                                                        decisionsLink: true,
                                                    });
                                                    return;
                                                }
                                                if (gReq.decisionId) {
                                                    const ts = new Date().toISOString();
                                                    setTimelineEvents((prev) => [
                                                        {
                                                            id: nextTimelineId(),
                                                            date: ts.slice(0, 10),
                                                            timestamp: ts,
                                                            title: 'طلب إدخال كفيل ضامن — قيد البت',
                                                            type: 'decision',
                                                            source: 'القرارات والطعون',
                                                            metadata: {
                                                                ...timelineDebtorMetadata(
                                                                    assignmentWorkspaceCtx.activeDebtorKey
                                                                ),
                                                                timelineThreadKey: `executor_decision:${gReq.decisionId}`,
                                                                decisionRowId: gReq.decisionId,
                                                            },
                                                        },
                                                        ...prev,
                                                    ]);
                                                }
                                                showToast('تم إرسال طلب الكفيل إلى القرارات والطعون.', 'success', {
                                                    decisionsLink: true,
                                                });
                                            }}
                                            evictionLedgerActivatedPersisted={Boolean(
                                                executionData?.eviction_assets_tab_unlocked || evictionAssetsTabUnlocked
                                            )}
                                            onEvictionLedgerActivated={handleEvictionLedgerActivated}
                                            onAfterCollectionRequestSubmitted={() => {
                                                showToast(
                                                    'تم حفظ الطلب بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ',
                                                    'success',
                                                    { decisionsLink: true }
                                                );
                                            }}
                                            onMonthlySettlementDefault={({ dueDate, amount }) => {
                                                const ts = new Date().toISOString();
                                                const ymd = getLocalTodayYmd();
                                                const title = '⚠️ نكس التسوية الشهرية';
                                                const body = `لم يتم دفع التسوية المستحقة بتاريخ ${dueDate} بمبلغ ${Math.max(0, amount).toLocaleString(
                                                    'ar-IQ'
                                                )} د.ع.\nيلزم اتخاذ إجراءات جبرية.`;
                                                setCaseTasksPending((prev) => {
                                                    const due = String(dueDate || '').trim();
                                                    const prevDue = String(
                                                        (executionData as any)?.monthly_settlement_default_dueDate || ''
                                                    ).trim();
                                                    const prevDelay = Number(
                                                        (executionData as any)?.monthly_settlement_delay_count
                                                    );
                                                    const safePrevDelay = Number.isFinite(prevDelay) ? prevDelay : 0;
                                                    const nextDelay = prevDue && prevDue === due ? safePrevDelay : safePrevDelay + 1;
                                                    const exists = prev.some(
                                                        (t: any) =>
                                                            !t?.trashedAt &&
                                                            String(t?.title || '').trim() === title &&
                                                            String(t?.dueDate || '').trim() === String(dueDate || '').trim()
                                                    );
                                                    const next = exists
                                                        ? prev
                                                        : ([
                                                              ...prev,
                                                              {
                                                                  id: nextTimelineId(),
                                                                  title,
                                                                  body,
                                                                  dueDate: String(dueDate || ymd).trim(),
                                                                  createdAt: ts,
                                                              },
                                                          ] as any);
                                                    queueMicrotask(() =>
                                                        persistExecutionMerge({
                                                            caseTasksPending: next,
                                                            monthly_settlement_default_alert: true,
                                                            monthly_settlement_default_dueDate: due,
                                                            monthly_settlement_delay_count: nextDelay,
                                                            monthly_settlement_default_at: ts,
                                                        } as any)
                                                    );
                                                    return next as any;
                                                });
                                                showToast('⚠️ نكس التسوية: تم تفعيل التنبيه في الإضبارة.', 'warning');
                                            }}
                                            onMonthlySettlementPaid={({ dueDate, nextDueDate, amount }) => {
                                                const ts = new Date().toISOString();
                                                setCaseTasksPending((prev) => {
                                                    const next = prev.map((t: any) => {
                                                        if (
                                                            !t?.trashedAt &&
                                                            String(t?.title || '').trim() === '⚠️ نكس التسوية الشهرية' &&
                                                            String(t?.dueDate || '').trim() === String(dueDate || '').trim()
                                                        ) {
                                                            return { ...t, trashedAt: ts };
                                                        }
                                                        return t;
                                                    });
                                                    queueMicrotask(() =>
                                                        persistExecutionMerge({
                                                            caseTasksPending: next,
                                                            monthly_settlement_default_alert: false,
                                                            monthly_settlement_default_dueDate: null,
                                                            monthly_settlement_delay_count: 0,
                                                            monthly_settlement_last_paid_at: ts,
                                                            monthly_settlement_last_paid_amount: Math.max(0, amount || 0),
                                                            monthly_settlement_next_dueDate: String(nextDueDate || '').trim(),
                                                        } as any)
                                                    );
                                                    return next as any;
                                                });
                                            }}
                                            onToast={(
                                                message,
                                                variant = 'warning',
                                                options?: {
                                                    decisionsLink?: boolean;
                                                    decisionId?: string;
                                                    decisionsTab?: 'current' | 'previous' | 'appeals';
                                                    action?: { label: string; onClick: () => void };
                                                }
                                            ) => showToast(message, variant, options)}
                                            onEvictionCourtOrderedFeesActivatedFromLedger={(totalAmount) => {
                                                persistExecutionMerge({
                                                    eviction_lawyer_fee_waived_at_intake: false,
                                                    includeLawyerFees: true,
                                                    lawyerFeesAmount: totalAmount,
                                                });
                                                showToast(
                                                    'تم تفعيل الأتعاب المحكومة في بيانات الإضبارة من الوعاء الموحّد',
                                                    'success'
                                                );
                                            }}
                                        />
                                        </Suspense>

                                        <MovableSeizureRegistry
                                            movableSeizureRegistryAssets={movableSeizureRegistryAssets}
                                            patchSeizureMarkConfirmation={patchSeizureMarkConfirmation}
                                            saveSeizureAuctionDate={saveSeizureAuctionDate}
                                            beginSeizureSalePriceStep={beginSeizureSalePriceStep}
                                            confirmSeizureSaleWithPrice={confirmSeizureSaleWithPrice}
                                            cancelSeizureSalePriceStep={cancelSeizureSalePriceStep}
                                            releaseSeizureAssetRow={releaseSeizureAssetRow}
                                            undoReleaseSeizureAssetRow={undoReleaseSeizureAssetRow}
                                            getLocalTodayYmd={getLocalTodayYmd}
                                            seizureAuctionDateDraftById={seizureAuctionDateDraftById}
                                            setSeizureAuctionDateDraftById={setSeizureAuctionDateDraftById}
                                            updateSeizureSaleDraft={updateSeizureSaleDraft}
                                        />

                                        <SalarySeizureRegistry
                                            salarySeizureRegistryAssets={salarySeizureRegistryAssets}
                                            releaseSeizureAssetRow={releaseSeizureAssetRow}
                                            undoReleaseSeizureAssetRow={undoReleaseSeizureAssetRow}
                                        />

                                        <ThirdPartySeizureRegistry
                                            thirdPartySeizureRegistryAssets={thirdPartySeizureRegistryAssets}
                                            updateThirdPartyReceiveDraft={updateThirdPartyReceiveDraft}
                                            confirmThirdPartyReceive={confirmThirdPartyReceive}
                                            cancelThirdPartyReceiveStep={cancelThirdPartyReceiveStep}
                                            beginThirdPartyReceiveStep={beginThirdPartyReceiveStep}
                                        />

                                        <StandaloneExecutionMarksRegistry
                                            standaloneExecutionMarks={standaloneExecutionMarks}
                                            toggleStandaloneExecutionMarkConfirmed={toggleStandaloneExecutionMarkConfirmed}
                                            archiveStandaloneExecutionMark={archiveStandaloneExecutionMark}
                                            undoArchiveStandaloneExecutionMark={undoArchiveStandaloneExecutionMark}
                                        />
                                        </>
                                    ) : (
                                        <Suspense fallback={EXEC_FOC_LAZY_FALLBACK}>
                                            <ClientWalletExecutionSection
                                                embedded
                                                executionId={executionData?.id || executionId}
                                                agreedClientFees={parsedClientFees}
                                                legacyPaidClientFees={
                                                    typeof executionData?.paidClientFees === 'number'
                                                        ? executionData.paidClientFees
                                                        : 0
                                                }
                                                onPaidTotalSync={syncPaidClientFeesFromWallet}
                                            />
                                        </Suspense>
                                    )}
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}
                    
                    {/* BOTTOM SPACER FOR SMOOTH SCROLLING */}
                    <div className="h-6"></div>
                    
                </div>
                <NotificationModal
                    showNotificationModal={showNotificationModal}
                    setShowNotificationModal={setShowNotificationModal}
                    debtorNotificationDate={debtorNotificationDate}
                    setDebtorNotificationDate={setDebtorNotificationDate}
                    handleNotifyDebtor={handleNotifyDebtor}
                    getLocalTodayYmd={getLocalTodayYmd}
                />
                {showCoerciveModal && (
                    <CoerciveActionsModal
                        showCoerciveModal={showCoerciveModal}
                        setShowCoerciveModal={setShowCoerciveModal}
                        handleCoerciveAction={handleCoerciveAction}
                        followupEmployeeFinancialSalaryOnlyCoercive={followupEmployeeFinancialSalaryOnlyCoercive}
                        followupMonetaryCoerciveLimitedOnly={followupMonetaryCoerciveLimitedOnly}
                        executionCoerciveButtonDisabled={executionCoerciveButtonDisabled}
                        daysSinceNoticeCalculated={daysSinceNoticeCalculated}
                        remaining={remaining}
                        activeDebtorIsEmployee={activeDebtorIsEmployee}
                        isDebtorGovernmentEmployee={isDebtorGovernmentEmployee}
                        isDebtorFreelancer={isDebtorFreelancer}
                        isNonFinancialClaim={isNonFinancialClaim}
                        showToast={showToast}
                    />
                )}
                
                {/* UNIFIED EXECUTION & ASSETS MODAL — portal يتجنب احتواء fixed داخل backdrop-filter (كان يعطل نقرات شريط التبويب) */}
                <UnifiedExecutionModal
                    showUnifiedExecutionModal={showUnifiedExecutionModal}
                    setShowUnifiedExecutionModal={setShowUnifiedExecutionModal}
                    EXEC_MODAL_Z={EXEC_MODAL_Z}
                    EXEC_MODAL_BACKDROP_STRONG={EXEC_MODAL_BACKDROP_STRONG}
                    unifiedModalTab={unifiedModalTab}
                    setUnifiedModalTab={setUnifiedModalTab}
                    goFollowupSectionTabByDelta={goFollowupSectionTabByDelta}
                    showPersonalCoerciveFollowupTab={showPersonalCoerciveFollowupTab}
                    personalTabLockedForEmployee={personalTabLockedForEmployee}
                />

            {/* 🧠 STATE MACHINE: Pause/Resume Execution Modal */}
            <PauseModal
                showPauseModal={showPauseModal}
                setShowPauseModal={setShowPauseModal}
                isPaused={isPaused}
                setIsPaused={setIsPaused}
                pauseReason={pauseReason}
                setPauseReason={setPauseReason}
                executionData={executionData}
                executionId={executionId}
                showToast={showToast}
                setTimelineEvents={setTimelineEvents}
                storageCache={storageCache}
                executionStorageKey={executionStorageKey}
            />
            {isPaused && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed top-0 left-0 right-0 z-[150] bg-gradient-to-r from-amber-900 to-rose-900 border-b-2 border-amber-500 py-3 px-4 shadow-2xl"
                >
                    <div className="flex items-center justify-center gap-3">
                        <Pause size={20} className="text-white animate-pulse" />
                        <p className="text-white font-bold text-sm">
                            ⚠️ الإضبارة موقوفة قانونياً
                        </p>
                        {pauseReason && (
                            <p className="text-amber-200 text-xs">
                                ({pauseReason})
                            </p>
                        )}
                    </div>
                </motion.div>
            )}
            
            <UnifiedSummonsModal
                showUnifiedSummonsModal={showUnifiedSummonsModal}
                setShowUnifiedSummonsModal={setShowUnifiedSummonsModal}
                EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
                LazyUnifiedSummonsHub={LazyUnifiedSummonsHub}
            />
            
            {/* 🆕 V9: PAYMENT CALCULATOR */}
            {showPaymentCalculator && (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazyPaymentCalculator
                        isOpen
                        onClose={() => setShowPaymentCalculator(false)}
                        currentTotal={totalOwed}
                        onPayment={handlePaymentFromCalculator}
                    />
                </Suspense>
            )}
            
            {/* 🆕 V9: SETTLEMENT CALCULATOR */}
            {showSettlementCalculator && (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazySettlementCalculator
                        isOpen
                        onClose={() => setShowSettlementCalculator(false)}
                        currentTotal={totalOwed}
                        onSettlement={handleSettlementFromCalculator}
                    />
                </Suspense>
            )}
            
            {/* 🆕 LEDGER MODAL (مفصول إلى مكون مستقل) */}
            <LedgerModal
                showLedgerModal={showLedgerModal}
                setShowLedgerModal={setShowLedgerModal}
            />

                {/* EXECUTION TRASH MODAL */}
                {showExecutionTrashModal && (
                    <ExecutionTrashModal
                        visible={showExecutionTrashModal}
                        onClose={() => setShowExecutionTrashModal(false)}
                        trashedTimelineEvents={trashedTimelineEvents}
                        trashedCaseNotes={trashedCaseNotes}
                        trashedCaseTasks={trashedCaseTasks}
                        onRestoreTimelineEvent={restoreTimelineEventFromTrash}
                        onPermanentDeleteTimeline={permanentlyDeleteTimelineEvent}
                        onRestoreCaseNote={restoreCaseNoteFromTrash}
                        onPermanentDeleteCaseNote={permanentlyDeleteCaseNote}
                        onRestoreCaseTask={restoreCaseTaskFromTrash}
                        onPermanentDeleteCaseTask={permanentlyDeleteCaseTask}
                    />
                )}

        </div>
            )
            }}