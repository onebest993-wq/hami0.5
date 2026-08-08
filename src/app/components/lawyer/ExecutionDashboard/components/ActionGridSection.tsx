import React, { memo, useMemo } from 'react';
import type { ElementType } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { ExecutionPinnedNotesTray } from './ExecutionPinnedNotesTray';
import { prefetchLawReferencePanel } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell';
import { openFollowupModalStoreFallback } from '@/app/components/lawyer/ExecutionDashboard/utils/followupModalOpen';
import { prefetchExecutionActionGridTile } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardOverlayPrefetch';
import { EXECUTION_DOSSIER_TEST_IDS } from '@/app/components/lawyer/ExecutionDashboard/executionDossierTestIds';
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
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info'
    ) => void;
    onOpenAppointmentModal?: () => void;
    onOpenNotesModal?: () => void;
    onOpenDocumentsModal?: () => void;
    onOpenDecisionsModal?: () => void;
    onOpenFinancialCenter?: () => void;
    onMemoFollowupClick?: () => void;
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
    showToast,
    onOpenAppointmentModal,
    onOpenNotesModal,
    onOpenDocumentsModal,
    onOpenDecisionsModal,
    onOpenFinancialCenter,
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
    const safePinnedNotes = Array.isArray(pinnedNotes) ? pinnedNotes : [];
    const safePinnedTasks = Array.isArray(pinnedTasks) ? pinnedTasks : [];
    const pinnedCount = safePinnedNotes.length + safePinnedTasks.length;

    const gridTiles = useMemo(
        () =>
            [
                {
                    key: 'appt',
                    icon: Calendar,
                    label: 'إضافة موعد',
                    tone: 'border-violet-400/25 bg-gradient-to-b from-violet-500/[0.14] to-[#0A0F1C]/70 hover:border-violet-300/40 hover:shadow-[0_10px_28px_-14px_rgba(139,92,246,0.55)] focus-visible:ring-violet-400/35',
                    iconWrapClass: 'group-hover:border-violet-300/35 group-hover:bg-violet-500/15',
                    iconClass: 'text-violet-200',
                    onClick: () => {
                        if (typeof onOpenAppointmentModal === 'function') {
                            onOpenAppointmentModal();
                            return;
                        }
                        showToast('تعذر فتح نافذة إضافة الموعد لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
                    },
                    locked: executionToolsTimelineLockedUi,
                },
                {
                    key: 'notes',
                    icon: FileText,
                    label: 'ملاحظات',
                    tone: 'border-orange-400/25 bg-gradient-to-b from-orange-500/[0.12] to-[#0A0F1C]/70 hover:border-orange-300/40 hover:shadow-[0_10px_28px_-14px_rgba(249,115,22,0.5)] focus-visible:ring-orange-400/35',
                    iconWrapClass: 'group-hover:border-orange-300/35 group-hover:bg-orange-500/15',
                    iconClass: 'text-orange-200',
                    onClick: () => {
                        if (typeof onOpenNotesModal === 'function') {
                            onOpenNotesModal();
                            return;
                        }
                        showToast('تعذر فتح الملاحظات لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
                    },
                    locked: executionToolsTimelineLockedUi,
                },
                {
                    key: 'documents',
                    icon: FolderOpen,
                    label: 'المستندات',
                    tone: 'border-sky-400/25 bg-gradient-to-b from-sky-500/[0.12] to-[#0A0F1C]/70 hover:border-sky-300/40 hover:shadow-[0_10px_28px_-14px_rgba(56,189,248,0.5)] focus-visible:ring-sky-400/35',
                    iconWrapClass: 'group-hover:border-sky-300/35 group-hover:bg-sky-500/15',
                    iconClass: 'text-sky-200',
                    onClick: () => {
                        if (typeof onOpenDocumentsModal === 'function') {
                            onOpenDocumentsModal();
                            return;
                        }
                        showToast('تعذر فتح المستندات لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
                    },
                    locked: executionToolsTimelineLockedUi,
                },
                {
                    key: 'decisions',
                    icon: Scale,
                    label: 'القرارات والطعون',
                    tone: 'border-rose-400/30 bg-gradient-to-b from-rose-500/[0.16] to-[#0A0F1C]/75 hover:border-rose-300/45 hover:shadow-[0_10px_28px_-14px_rgba(244,63,94,0.48)] focus-visible:ring-rose-400/35',
                    iconWrapClass: 'group-hover:border-rose-300/40 group-hover:bg-rose-500/15',
                    iconClass: 'text-rose-200',
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
                        if (typeof onOpenDecisionsModal === 'function') {
                            onOpenDecisionsModal();
                            return;
                        }
                        showToast('تعذر فتح القرارات والطعون لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
                    },
                    locked: executionToolsTimelineLockedUi,
                },
                {
                    key: 'followup',
                    icon: ClipboardList,
                    label: 'محضر المتابعة',
                    tone: 'border-emerald-400/25 bg-gradient-to-b from-emerald-500/[0.12] to-[#0A0F1C]/70 hover:border-emerald-300/40 hover:shadow-[0_10px_28px_-14px_rgba(52,211,153,0.45)] focus-visible:ring-emerald-400/35',
                    iconWrapClass: 'group-hover:border-emerald-300/35 group-hover:bg-emerald-500/15',
                    iconClass: 'text-emerald-200',
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
                        if (typeof onMemoFollowupClick === 'function') {
                            onMemoFollowupClick();
                            return;
                        }
                        openFollowupModalStoreFallback();
                    },
                    locked: executionToolsTimelineLockedUi,
                },
                {
                    key: 'finance',
                    icon: CreditCard,
                    label: 'المركز المالي',
                    tone: 'border-amber-400/30 bg-gradient-to-b from-amber-500/[0.14] to-[#0A0F1C]/75 hover:border-amber-300/45 hover:shadow-[0_10px_28px_-14px_rgba(245,158,11,0.48)] focus-visible:ring-amber-400/35',
                    iconWrapClass: 'group-hover:border-amber-300/40 group-hover:bg-amber-500/15',
                    iconClass: 'text-amber-200',
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
                        (
                            onOpenFinancialCenter
                        )?.();
                        if (typeof onOpenFinancialCenter === 'function') {
                            return;
                        }
                        showToast('تعذر فتح المركز المالي لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
                    },
                    locked: executionToolsTimelineLockedUi,
                },
                ...(showVisitationCalendarButton && onOpenVisitationCalendar
                    ? [
                          {
                              key: 'visitation_cal',
                              icon: Calendar,
                              label: 'تقويم المواعيد',
                              tone: 'border-[#E6C673]/30 bg-gradient-to-b from-[#E6C673]/[0.12] to-[#0A0F1C]/75 hover:border-[#E6C673]/45 hover:shadow-[0_10px_28px_-14px_rgba(230,198,115,0.42)] focus-visible:ring-[#E6C673]/35',
                              iconWrapClass: 'group-hover:border-[#E6C673]/40 group-hover:bg-[#E6C673]/15',
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
            onOpenAppointmentModal,
            onOpenDocumentsModal,
            onOpenDecisionsModal,
            onOpenFinancialCenter,
            onOpenNotesModal,
            onOpenVisitationCalendar,
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
                                    if (typeof onMemoFollowupClick === 'function') {
                                        onMemoFollowupClick();
                                        return;
                                    }
                                    openFollowupModalStoreFallback();
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
                            data-testid={
                                tile.key === 'followup' ? EXECUTION_DOSSIER_TEST_IDS.followupMemo : undefined
                            }
                            onPointerEnter={() => prefetchExecutionActionGridTile(tile.key)}
                            // pointerdown يغطّي اللمس — pointerenter وحده لا يسخّن قبل النقر على الموبايل
                            onPointerDown={() => prefetchExecutionActionGridTile(tile.key)}
                            onClick={tile.onClick}
                            className={`group relative flex min-h-[108px] w-full flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl border px-2.5 py-4 text-center backdrop-blur-xl transition-all duration-300 focus:outline-none focus-visible:ring-2 ${tile.tone} ${
                                tile.locked ? 'cursor-not-allowed opacity-40 hover:shadow-none' : ''
                            }`}
                        >
                            <span
                                aria-hidden
                                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                            />
                            <span
                                className={`relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.10] bg-[#0B1120]/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform duration-300 group-hover:scale-[1.04] ${tile.iconWrapClass}`}
                            >
                                <Ico
                                    size={22}
                                    strokeWidth={2}
                                    className={`shrink-0 ${tile.iconClass}`}
                                />
                            </span>
                            <span className="relative text-center text-[11px] font-bold leading-snug text-[#F8FAFC] sm:text-xs">
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
                                        pinnedNotes={safePinnedNotes}
                                        pinnedTasks={safePinnedTasks}
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
                        onPointerEnter={() => prefetchExecutionActionGridTile('seizure-log')}
                        onClick={onOpenSeizureLog}
                        dir="rtl"
                        className="group relative flex min-h-[108px] w-full flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-[#E6C673]/35 bg-gradient-to-b from-[#E6C673]/[0.14] to-[#0A0F1C]/75 px-3 py-4 text-center shadow-[0_10px_28px_-16px_rgba(230,198,115,0.35)] backdrop-blur-xl transition-all duration-300 hover:border-[#E6C673]/55 hover:shadow-[0_14px_32px_-14px_rgba(230,198,115,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40 touch-manipulation"
                    >
                        <span className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#E6C673]/30 bg-[#0B1120]/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform duration-300 group-hover:scale-[1.04] group-hover:border-[#E6C673]/45 group-hover:bg-[#E6C673]/15">
                            <ClipboardList size={22} className="text-[#E6C673]" strokeWidth={2} />
                        </span>
                        <span className="relative text-center text-[11px] font-bold leading-snug text-[#F5E6B8] sm:text-xs" dir="rtl">
                            سجل الحجز
                        </span>
                    </button>
                ) : null}
            </div>

            <div className="mt-3 border-t border-white/[0.06] pt-3">
                <button
                    type="button"
                    onPointerEnter={() => prefetchLawReferencePanel()}
                    onClick={() => {
                        prefetchLawReferencePanel();
                        useExecutionDashboardStore.getState().openModal('showLawReferencePanel');
                    }}
                    dir="rtl"
                    className="group relative flex min-h-[52px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-[#E6C673]/28 bg-gradient-to-b from-[#E6C673]/[0.10] to-[#0A0F1C]/70 px-4 py-3 text-center shadow-[0_8px_24px_-16px_rgba(230,198,115,0.35)] backdrop-blur-xl transition-all duration-300 hover:border-[#E6C673]/45 hover:shadow-[0_12px_28px_-14px_rgba(230,198,115,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/35"
                    data-testid="execution-law-reference-open"
                >
                    <span className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#E6C673]/25 bg-[#0B1120]/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-transform duration-300 group-hover:scale-[1.04]">
                        <Book size={18} className="shrink-0 text-[#E6C673]" strokeWidth={2} />
                    </span>
                    <span className="relative text-[11px] font-bold leading-snug text-[#F5E6B8] sm:text-xs">
                        قانون التنفيذ
                    </span>
                </button>
            </div>
        </div>
    );
});
