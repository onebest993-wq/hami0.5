import React, { memo, useEffect, useMemo } from 'react';
import type { Dispatch, ElementType, SetStateAction } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { ExecutionPinnedNotesTray } from './ExecutionPinnedNotesTray';
import { prefetchLawReferencePanel, prefetchExecutionDashboardShell } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell';
import { prefetchExecutionActionGridTile } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardOverlayPrefetch';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';

type CaseNoteLogRow = NonNullable<ExecutionFile['caseNotesLog']>[number];
type CaseTaskRow = NonNullable<ExecutionFile['caseTasksPending']>[number];

interface ActionGridSectionProps {
    Book: ElementType;
    Calendar: ElementType;
    FileText: ElementType;
    FolderOpen: ElementType;
    Scale: ElementType;
    ClipboardList: ElementType;
    CreditCard: ElementType;
    showEmployeeCompulsoryProceduresBanner: boolean;
    executionToolsTimelineLockedUi: boolean;
    executionActionsGridLocked: boolean;
    setEmployeeCompulsoryBannerDismissed: (dismissed: boolean) => void;
    setShowUnifiedExecutionModal: (show: boolean) => void;
    setUnifiedModalTab: Dispatch<
        SetStateAction<
            'personal' | 'coercive' | 'financial' | 'seizure_requests' | 'other_party' | 'correspondences' | 'admin' | 'special' | 'dossier_controls'
        >
    >;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info'
    ) => void;
    setShowAppointmentModal: (show: boolean) => void;
    setShowNotesModal: (show: boolean) => void;
    setShowDocumentsModal: (show: boolean) => void;
    setShowDecisionsModal: (show: boolean) => void;
    onOpenDecisionsModal?: () => void;
    setIsFinancialCenterExpanded: Dispatch<SetStateAction<boolean>>;
    setShowExecutionFinancialHub: Dispatch<SetStateAction<boolean>>;
    onMemoFollowupClick: () => void;
    onOpenSeizureLog: () => void;
    showSeizureLogButton: boolean;
    pinnedNotes: CaseNoteLogRow[];
    pinnedTasks: CaseTaskRow[];
    onToggleNotePin: (id: string) => void;
    onToggleTaskPin: (id: string) => void;
    onTrashPinnedNote: (id: string) => void;
    showVisitationCalendarButton?: boolean;
    onOpenVisitationCalendar?: () => void;
}

export const ActionGridSection = memo(function ActionGridSection({
    Book,
    Calendar,
    FileText,
    FolderOpen,
    Scale,
    ClipboardList,
    CreditCard,
    showEmployeeCompulsoryProceduresBanner,
    executionToolsTimelineLockedUi,
    executionActionsGridLocked,
    setEmployeeCompulsoryBannerDismissed,
    setShowUnifiedExecutionModal,
    setUnifiedModalTab,
    showToast,
    setShowAppointmentModal,
    setShowNotesModal,
    setShowDocumentsModal,
    setShowDecisionsModal,
    onOpenDecisionsModal,
    setIsFinancialCenterExpanded,
    setShowExecutionFinancialHub,
    onMemoFollowupClick,
    onOpenSeizureLog,
    showSeizureLogButton,
    pinnedNotes,
    pinnedTasks,
    onToggleNotePin,
    onToggleTaskPin,
    onTrashPinnedNote,
    showVisitationCalendarButton = false,
    onOpenVisitationCalendar,
}: ActionGridSectionProps) {
    const pinnedCount = pinnedNotes.length + pinnedTasks.length;

    useEffect(() => {
        prefetchExecutionDashboardShell();
        prefetchLawReferencePanel();
    }, []);

    const gridTiles = useMemo(
        () =>
            [
                {
                    key: 'appt',
                    icon: Calendar,
                    label: 'إضافة موعد',
                    tone: 'border-violet-500/30 bg-violet-500/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-violet-400/50 hover:bg-violet-500/15 hover:shadow-[0_0_22px_-6px_rgba(139,92,246,0.45)] focus-visible:ring-violet-400/30',
                    iconClass: 'text-violet-300',
                    onClick: () => setShowAppointmentModal(true),
                    locked: executionToolsTimelineLockedUi,
                },
                {
                    key: 'notes',
                    icon: FileText,
                    label: 'ملاحظات',
                    tone: 'border-orange-500/30 bg-orange-500/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-orange-400/45 hover:bg-orange-500/12 hover:shadow-[0_0_22px_-6px_rgba(249,115,22,0.4)] focus-visible:ring-orange-400/30',
                    iconClass: 'text-orange-300',
                    onClick: () => setShowNotesModal(true),
                    locked: executionToolsTimelineLockedUi,
                },
                {
                    key: 'documents',
                    icon: FolderOpen,
                    label: 'المستندات',
                    tone: 'border-sky-500/30 bg-sky-500/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-sky-400/45 hover:bg-sky-500/12 hover:shadow-[0_0_22px_-6px_rgba(56,189,248,0.4)] focus-visible:ring-sky-400/30',
                    iconClass: 'text-sky-300',
                    onClick: () => setShowDocumentsModal(true),
                    locked: executionToolsTimelineLockedUi,
                },
                {
                    key: 'decisions',
                    icon: Scale,
                    label: 'القرارات والطعون',
                    tone: 'border-rose-500/35 bg-rose-500/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-rose-400/50 hover:bg-rose-500/14 hover:shadow-[0_0_22px_-6px_rgba(244,63,94,0.38)] focus-visible:ring-rose-400/30',
                    iconClass: 'text-rose-300',
                    onClick: () =>
                        (onOpenDecisionsModal ?? (() => setShowDecisionsModal(true)))(),
                    locked: executionToolsTimelineLockedUi,
                },
                {
                    key: 'followup',
                    icon: ClipboardList,
                    label: 'محضر المتابعة',
                    tone: 'border-emerald-500/30 bg-emerald-500/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-emerald-400/45 hover:bg-emerald-500/12 hover:shadow-[0_0_22px_-6px_rgba(52,211,153,0.35)] focus-visible:ring-emerald-400/30',
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
                        onMemoFollowupClick();
                    },
                    locked: executionToolsTimelineLockedUi,
                },
                {
                    key: 'finance',
                    icon: CreditCard,
                    label: 'المركز المالي',
                    tone: 'border-amber-500/35 bg-amber-500/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-amber-400/45 hover:bg-amber-500/12 hover:shadow-[0_0_22px_-6px_rgba(245,158,11,0.38)] focus-visible:ring-amber-400/30',
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
                ...(showVisitationCalendarButton && onOpenVisitationCalendar
                    ? [
                          {
                              key: 'visitation_cal',
                              icon: Calendar,
                              label: 'تقويم المواعيد',
                              tone: 'border-[#E6C673]/35 bg-[#E6C673]/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#E6C673]/50 hover:bg-[#E6C673]/15 focus-visible:ring-[#E6C673]/30',
                              iconClass: 'text-[#E6C673]',
                              onClick: onOpenVisitationCalendar,
                              locked: executionToolsTimelineLockedUi,
                          },
                      ]
                    : []),
            ] as const,
        [
            Calendar,
            ClipboardList,
            CreditCard,
            FileText,
            FolderOpen,
            Scale,
            executionActionsGridLocked,
            executionToolsTimelineLockedUi,
            onMemoFollowupClick,
            onOpenVisitationCalendar,
            setIsFinancialCenterExpanded,
            setShowAppointmentModal,
            setShowDecisionsModal,
            setShowDocumentsModal,
            setShowExecutionFinancialHub,
            setShowNotesModal,
            showToast,
            showVisitationCalendarButton,
        ]
    );

    return (
        <div className="relative mx-3 mt-2 overflow-visible rounded-2xl border border-[#D4AF37]/18 bg-[#0A0F1C]/28 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.05] backdrop-blur-xl sm:p-3">
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
                {gridTiles.map((tile) => {
                    const Ico = tile.icon;
                    const isNotes = tile.key === 'notes';

                    const tileButton = (
                        <button
                            type="button"
                            disabled={tile.locked}
                            onPointerEnter={() => prefetchExecutionActionGridTile(tile.key)}
                            onClick={tile.onClick}
                            className={`group flex min-h-[100px] w-full flex-col items-center justify-center gap-2 rounded-xl border px-2 py-4 text-center backdrop-blur-md transition-all duration-200 focus:outline-none focus-visible:ring-2 ${tile.tone} ${
                                tile.locked ? 'cursor-not-allowed opacity-40 hover:shadow-none' : ''
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

                    if (!isNotes) {
                        return (
                            <div key={tile.key}>{tileButton}</div>
                        );
                    }

                    return (
                        <div key={tile.key} className="relative z-20 min-h-[100px] overflow-visible">
                            <div className="relative">
                                {tileButton}
                                {pinnedCount > 0 ? (
                                    <ExecutionPinnedNotesTray
                                        variant="dock"
                                        pinnedNotes={pinnedNotes}
                                        pinnedTasks={pinnedTasks}
                                        onToggleNotePin={onToggleNotePin}
                                        onToggleTaskPin={onToggleTaskPin}
                                        onTrashNote={onTrashPinnedNote}
                                    />
                                ) : null}
                            </div>
                        </div>
                    );
                })}
                {showSeizureLogButton ? (
                    <button
                        type="button"
                        onClick={onOpenSeizureLog}
                        dir="rtl"
                        className="flex min-h-[100px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-[#E6C673]/40 bg-gradient-to-br from-[#E6C673]/10 via-slate-900/25 to-[#0A0F1C]/55 px-3 py-4 text-center shadow-[0_0_24px_-10px_rgba(230,198,115,0.28)] backdrop-blur-md transition-all duration-200 hover:border-[#E6C673]/60 hover:shadow-[0_0_28px_-10px_rgba(230,198,115,0.42)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40"
                    >
                        <ClipboardList size={32} className="text-[#E6C673]" strokeWidth={2} />
                        <span className="text-center text-[11px] font-bold leading-tight text-[#F5E6B8] sm:text-xs" dir="rtl">
                            سجل الحجز
                        </span>
                    </button>
                ) : null}
                <button
                    type="button"
                    onPointerEnter={() => prefetchLawReferencePanel()}
                    onClick={() => {
                        prefetchLawReferencePanel();
                        useExecutionDashboardStore.getState().openModal('showLawReferencePanel');
                    }}
                    dir="rtl"
                    className="col-span-2 flex min-h-[100px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-[#E6C673]/40 bg-gradient-to-br from-[#E6C673]/12 via-amber-500/10 to-[#0A0F1C]/50 px-4 py-4 text-center shadow-[0_0_28px_-8px_rgba(230,198,115,0.35)] backdrop-blur-md transition-all duration-200 hover:border-[#E6C673]/60 hover:shadow-[0_0_32px_-6px_rgba(230,198,115,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40"
                    data-testid="execution-law-reference-open"
                >
                    <Book size={32} className="shrink-0 text-[#E6C673]" strokeWidth={2} />
                    <span
                        className="text-center text-[11px] font-bold leading-tight text-[#F5E6B8] sm:text-xs"
                        dir="rtl"
                    >
                        قانون التنفيذ
                    </span>
                </button>
            </div>
        </div>
    );
});
