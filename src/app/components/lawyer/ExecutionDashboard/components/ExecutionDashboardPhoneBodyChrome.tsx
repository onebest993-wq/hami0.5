import React, { Suspense } from 'react';
import { Trash2 } from 'lucide-react';
import { ExecutionDossierHeaderNavButtons } from './ExecutionDossierHeaderNavButtons';
import { useExecutionDossierHeaderNavigation } from '../hooks/useExecutionDossierHeaderNavigation';
import { dossierLifecycleLabelAr } from '../helpers';
import {
    dossierLifecycleTriggerTextClass,
    dossierLifecycleTriggerDotClass,
} from '../helpers';
import {
    LazyColleagueConsultationHeaderButton,
    LazyDossierSwitcher,
    prefetchExecutionTrashOverlay,
} from '../executionDashboardLazyRegistry';
import type { DossierLifecycleStatus } from '@/app/types/execution';
import { DossierLifecyclePanel } from './DossierLifecyclePanel';
import { ExecutionDashboardPhoneBodyChildDossiersStrip } from './ExecutionDashboardPhoneBodyChildDossiersStrip';
import { EXEC_MODAL_HEADER_SAFE_TOP } from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';

export type ExecutionDashboardPhoneBodyChromeProps = {
    onClose: (() => void) | undefined;
    localDossierLifecyclePopoverRef: React.RefObject<HTMLDivElement | null>;
    localDossierLifecyclePanelPortalRef: React.RefObject<HTMLDivElement | null>;
    localDossierLifecyclePanelOpen: boolean;
    setLocalDossierLifecyclePanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
    localDossierLifecyclePanelPhase: 'menu' | 'details';
    setLocalDossierLifecyclePanelPhase: React.Dispatch<React.SetStateAction<'menu' | 'details'>>;
    localDossierStatusDraft: DossierLifecycleStatus;
    setLocalDossierStatusDraft: React.Dispatch<React.SetStateAction<DossierLifecycleStatus>>;
    localDossierPendingStatus: DossierLifecycleStatus | null;
    setLocalDossierPendingStatus: React.Dispatch<React.SetStateAction<DossierLifecycleStatus | null>>;
    localDossierReasonSeed: string;
    localDossierDateSeed: string;
    safeApplyDossierLifecycleToFileAndTimeline: (
        status: DossierLifecycleStatus,
        reason: string,
        date: string,
    ) => boolean;
    safeSetShowExecutionTrashModal: (show: boolean) => void;
    safeTrashedTimelineEvents: unknown[];
    safeTrashedCaseNotes: unknown[];
    safeTrashedCaseTasks: unknown[];
    stayOfExecutionActive: boolean | undefined;
    parentDossierId: string | number | null | undefined;
    file: unknown;
    hasChildDossiers: boolean | undefined;
    isInabaActive: boolean | undefined;
    activeTabId: string | number | null | undefined;
    currentFileId: string | number | null | undefined;
    currentFile: { fileNumber?: string | number | null } | null | undefined;
    childDossiers: unknown;
    setActiveTabId: (id: string) => void;
    setExecutionStorageTick: React.Dispatch<React.SetStateAction<number>>;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info', options?: unknown) => void;
};

/** Top toolbar / stay banner / dossier switcher / child dossiers strip */
export function ExecutionDashboardPhoneBodyChrome({
    onClose,
    localDossierLifecyclePopoverRef,
    localDossierLifecyclePanelPortalRef,
    localDossierLifecyclePanelOpen,
    setLocalDossierLifecyclePanelOpen,
    localDossierLifecyclePanelPhase,
    setLocalDossierLifecyclePanelPhase,
    localDossierStatusDraft,
    setLocalDossierStatusDraft,
    localDossierPendingStatus,
    setLocalDossierPendingStatus,
    localDossierReasonSeed,
    localDossierDateSeed,
    safeApplyDossierLifecycleToFileAndTimeline,
    safeSetShowExecutionTrashModal,
    safeTrashedTimelineEvents,
    safeTrashedCaseNotes,
    safeTrashedCaseTasks,
    stayOfExecutionActive,
    parentDossierId,
    file,
    hasChildDossiers,
    isInabaActive,
    activeTabId,
    currentFileId,
    currentFile,
    childDossiers,
    setActiveTabId,
    setExecutionStorageTick,
    showToast,
}: ExecutionDashboardPhoneBodyChromeProps) {
    const { handleDossierBack, handleDossierExit } = useExecutionDossierHeaderNavigation({
        onClose: () => onClose?.(),
        dossierContextBack: () => {
            if (localDossierLifecyclePanelOpen) {
                setLocalDossierLifecyclePanelOpen(false);
                return true;
            }
            if (
                hasChildDossiers &&
                !isInabaActive &&
                String(activeTabId) !== String(currentFileId)
            ) {
                setActiveTabId(String(currentFileId || ''));
                return true;
            }
            return false;
        },
    });

    return (
        <>
            {/* 🆕 V16: PREMIUM DIAMOND GLASS HEADER */}
            <div
                className={`bg-gradient-to-r from-slate-800/40 via-slate-700/20 to-slate-800/40 backdrop-blur-xl border-t border-white/10 border-b border-black/50 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] rounded-xl mx-2 mt-2 ${EXEC_MODAL_HEADER_SAFE_TOP}`}
            >
                <div className="flex w-full items-center gap-2 px-2.5 py-2">
                    <ExecutionDossierHeaderNavButtons
                        onBack={handleDossierBack}
                        onExit={handleDossierExit}
                    />

                    <div className="relative min-w-0 flex-1" ref={localDossierLifecyclePopoverRef}>
                        <button
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                setLocalDossierLifecyclePanelOpen((open) => {
                                    const next = !open;
                                    if (next) {
                                        setLocalDossierLifecyclePanelPhase('menu');
                                        setLocalDossierPendingStatus(null);
                                    }
                                    return next;
                                });
                            }}
                            className={`touch-manipulation inline-flex min-h-[44px] max-w-full select-none items-center justify-center gap-1.5 rounded-xl px-2.5 transition-all hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45 ${dossierLifecycleTriggerTextClass(localDossierStatusDraft)}`}
                            aria-expanded={localDossierLifecyclePanelOpen}
                            aria-haspopup="dialog"
                            aria-label={`الإضبارة التنفيذية — ${dossierLifecycleLabelAr(localDossierStatusDraft)}`}
                            title="تغيير حالة الإضبارة — اضغط للقائمة"
                        >
                            <span className="truncate text-sm font-semibold tracking-tight sm:text-[15px]">
                                الإضبارة التنفيذية
                            </span>
                            <span
                                className={`h-2 w-2 shrink-0 rounded-full ring-2 ring-white/15 shadow-[0_0_8px_rgba(255,255,255,0.2)] ${dossierLifecycleTriggerDotClass(localDossierStatusDraft)}`}
                                aria-hidden
                            />
                        </button>
                        {localDossierLifecyclePanelOpen
                            ? (
                            <DossierLifecyclePanel dossierLifecyclePanelOpen={localDossierLifecyclePanelOpen} dossierLifecyclePopStyle={null} dossierLifecyclePanelPhase={localDossierLifecyclePanelPhase} setDossierLifecyclePanelPhase={setLocalDossierLifecyclePanelPhase} dossierStatusDraft={localDossierStatusDraft} dossierPendingStatus={localDossierPendingStatus} setDossierPendingStatus={setLocalDossierPendingStatus} dossierReasonDraft={localDossierReasonSeed} setDossierReasonDraft={() => undefined} dossierDateDraft={localDossierDateSeed} setDossierDateDraft={() => undefined}
                                dossierLifecycleLabelAr={dossierLifecycleLabelAr} handleDossierLifecyclePick={(picked: DossierLifecycleStatus) => {
                                    if (picked === 'active') {
                                        const applied = safeApplyDossierLifecycleToFileAndTimeline('active', '', '');
                                        if (applied) {
                                            setLocalDossierStatusDraft('active');
                                            setLocalDossierPendingStatus(null);
                                            setLocalDossierLifecyclePanelPhase('menu');
                                            setLocalDossierLifecyclePanelOpen(false);
                                        }
                                        return;
                                    }
                                    setLocalDossierPendingStatus(picked);
                                    setLocalDossierLifecyclePanelPhase('details');
                                }} handleDossierLifecycleConfirmDetails={(reasonOverride?: string, dateOverride?: string) => {
                                    if (!localDossierPendingStatus) return;
                                    const applied = safeApplyDossierLifecycleToFileAndTimeline(
                                        localDossierPendingStatus,
                                        typeof reasonOverride === 'string' ? reasonOverride : localDossierReasonSeed,
                                        typeof dateOverride === 'string' ? dateOverride : localDossierDateSeed,
                                    );
                                    if (!applied) return;
                                    setLocalDossierStatusDraft(localDossierPendingStatus);
                                    setLocalDossierPendingStatus(null);
                                    setLocalDossierLifecyclePanelPhase('menu');
                                    setLocalDossierLifecyclePanelOpen(false);
                                }} dossierLifecyclePanelPortalRef={localDossierLifecyclePanelPortalRef} dossierLifecyclePopoverRef={localDossierLifecyclePopoverRef}
                            />
                            )
                            : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                        <Suspense fallback={null}>
                            <LazyColleagueConsultationHeaderButton
                                iconOnly
                                iconSize={15}
                                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#E6C673]/30 bg-[#E6C673]/10 px-0 text-[#E6C673] transition-all hover:bg-[#E6C673]/16 touch-manipulation"
                            />
                        </Suspense>

                        <button
                            type="button"
                            onPointerEnter={() => prefetchExecutionTrashOverlay()}
                            onClick={() => safeSetShowExecutionTrashModal(true)}
                            className="group relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/8 bg-hami-navy/45 text-slate-400 backdrop-blur-md transition-all duration-200 hover:border-amber-500/30 hover:bg-amber-500/8 hover:text-amber-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] touch-manipulation"
                            title="سلة مهملات الإضبارة (السجل والملاحظات)"
                            aria-label="سلة مهملات الإضبارة"
                        >
                            <Trash2 size={16} strokeWidth={1.75} className="transition-transform duration-200 group-hover:scale-105" />
                            {safeTrashedTimelineEvents.length + safeTrashedCaseNotes.length + safeTrashedCaseTasks.length > 0 ? (
                                <span className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-amber-500/35 bg-amber-950/90 px-1 text-[9px] font-bold tabular-nums text-amber-200/95 shadow-[0_0_10px_-2px_rgba(230,198,115,0.45)]">
                                    {safeTrashedTimelineEvents.length + safeTrashedCaseNotes.length + safeTrashedCaseTasks.length}
                                </span>
                            ) : null}
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

            {/* 🆕 Delegation Switcher — يُظهر نفسه حسب حالة الـ Store والـ URL */}
            <Suspense fallback={null}>
                <LazyDossierSwitcher
                    parentFileId={String(parentDossierId ?? '')}
                    parentFileSnapshot={
                        (file ?? null) as React.ComponentProps<
                            typeof LazyDossierSwitcher
                        >['parentFileSnapshot']
                    }
                />
            </Suspense>

            <ExecutionDashboardPhoneBodyChildDossiersStrip
                hasChildDossiers={hasChildDossiers as boolean}
                isInabaActive={isInabaActive as boolean}
                activeTabId={activeTabId}
                currentFileId={currentFileId}
                currentFile={currentFile}
                childDossiers={childDossiers as React.ComponentProps<typeof ExecutionDashboardPhoneBodyChildDossiersStrip>['childDossiers']}
                setActiveTabId={setActiveTabId}
                setExecutionStorageTick={setExecutionStorageTick}
                showToast={showToast}
            />
        </>
    );
}
