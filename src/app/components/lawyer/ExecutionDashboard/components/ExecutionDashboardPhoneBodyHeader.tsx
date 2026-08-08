import React from 'react';
import { Trash2 } from '@/app/components/ui/lucideIcons';
import type { DossierLifecycleStatus } from '@/app/types/execution';
import { ExecutionDossierHeaderNavButtons } from './ExecutionDossierHeaderNavButtons';
import { ColleagueConsultationHeaderButton } from '@/app/components/lawyer/caseShare/ColleagueConsultationHeaderButton';
import {
    LazyDossierLifecyclePanel,
    prefetchExecutionOverlayModals,
} from '../executionDashboardLazyRegistry';
import { prefetchExecutionDossierActionsOverlay } from '../executionDashboardOverlayPrefetch';
import {
    dossierLifecycleLabelAr,
    dossierLifecycleTriggerDotClass,
    dossierLifecycleTriggerTextClass,
} from '../helpers';
import type { DossierLifecyclePopStyle } from '../orchestrators/executionOrchestratorSliceTypes';

export type ExecutionDashboardPhoneBodyHeaderProps = {
    handleDossierBack: () => void;
    handleDossierExit: () => void;
    dossierNestedNav?: boolean;
    dossierLifecyclePopoverRef: React.RefObject<HTMLDivElement | null>;
    dossierLifecyclePanelPortalRef: React.RefObject<HTMLDivElement | null>;
    dossierLifecyclePanelOpen: boolean;
    dossierLifecyclePopStyle: DossierLifecyclePopStyle | null | undefined;
    dossierLifecyclePanelPhase: 'menu' | 'details';
    dossierStatusDraft: DossierLifecycleStatus;
    dossierPendingStatus: DossierLifecycleStatus | null;
    dossierReasonDraft: string;
    dossierDateDraft: string;
    setDossierLifecyclePanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setDossierLifecyclePanelPhase: React.Dispatch<React.SetStateAction<'menu' | 'details'>>;
    setDossierPendingStatus: React.Dispatch<React.SetStateAction<DossierLifecycleStatus | null>>;
    setDossierReasonDraft: React.Dispatch<React.SetStateAction<string>>;
    setDossierDateDraft: React.Dispatch<React.SetStateAction<string>>;
    safeHandleDossierLifecyclePick: (status: DossierLifecycleStatus) => void;
    safeHandleDossierLifecycleConfirmDetails: (reasonOverride?: string, dateOverride?: string) => void;
    trashedTimelineEvents: unknown[];
    trashedCaseNotes: unknown[];
    trashedCaseTasks: unknown[];
    setShowExecutionTrashModal: (open: boolean) => void;
    sparkNudgeSlot?: React.ReactNode;
};

export function ExecutionDashboardPhoneBodyHeader({
    handleDossierBack,
    handleDossierExit,
    dossierNestedNav = false,
    dossierLifecyclePopoverRef,
    dossierLifecyclePanelPortalRef,
    dossierLifecyclePanelOpen,
    dossierLifecyclePopStyle,
    dossierLifecyclePanelPhase,
    dossierStatusDraft,
    dossierPendingStatus,
    dossierReasonDraft,
    dossierDateDraft,
    setDossierLifecyclePanelOpen,
    setDossierLifecyclePanelPhase,
    setDossierPendingStatus,
    setDossierReasonDraft,
    setDossierDateDraft,
    safeHandleDossierLifecyclePick,
    safeHandleDossierLifecycleConfirmDetails,
    trashedTimelineEvents,
    trashedCaseNotes,
    trashedCaseTasks,
    setShowExecutionTrashModal,
    sparkNudgeSlot,
}: ExecutionDashboardPhoneBodyHeaderProps) {
    const trashCount =
        trashedTimelineEvents.length + trashedCaseNotes.length + trashedCaseTasks.length;

    return (
        <div className="bg-gradient-to-r from-slate-800/40 via-slate-700/20 to-slate-800/40 backdrop-blur-xl border-t border-white/10 border-b border-black/50 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] rounded-xl mx-2 mt-2">
            <div className="grid w-full grid-cols-[4.75rem_minmax(0,1fr)_2.25rem_2.25rem] items-center gap-1.5 px-2.5 py-2">
                <ExecutionDossierHeaderNavButtons
                    onBack={handleDossierBack}
                    onExit={handleDossierExit}
                    nestedNavigation={dossierNestedNav}
                />

                <div
                    className="relative flex min-w-0 items-center justify-center justify-self-center ps-10"
                    ref={dossierLifecyclePopoverRef as React.Ref<HTMLDivElement>}
                >
                    {sparkNudgeSlot ? (
                        <div className="absolute right-0 top-1/2 z-[55] -translate-y-1/2 shrink-0">
                            {sparkNudgeSlot}
                        </div>
                    ) : null}
                    <button
                        type="button"
                        onPointerEnter={() => prefetchExecutionDossierActionsOverlay()}
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
                        className={`inline-flex h-9 max-w-full items-center justify-center gap-1.5 rounded-xl px-2 transition-all hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45 ${dossierLifecycleTriggerTextClass(dossierStatusDraft)}`}
                        aria-expanded={dossierLifecyclePanelOpen}
                        aria-haspopup="dialog"
                        aria-label={`الإضبارة التنفيذية — ${dossierLifecycleLabelAr(dossierStatusDraft)}`}
                        title="تغيير حالة الإضبارة — اضغط للقائمة"
                    >
                        <span className="truncate text-sm font-semibold tracking-tight sm:text-[15px]">
                            الإضبارة التنفيذية
                        </span>
                        <span
                            className={`h-2 w-2 shrink-0 rounded-full ring-2 ring-white/15 shadow-[0_0_8px_rgba(255,255,255,0.2)] ${dossierLifecycleTriggerDotClass(dossierStatusDraft)}`}
                            aria-hidden
                        />
                    </button>
                    {dossierLifecyclePanelOpen && dossierLifecyclePopStyle ? (
                        <LazyDossierLifecyclePanel
                            dossierLifecyclePanelOpen={dossierLifecyclePanelOpen}
                            dossierLifecyclePopStyle={dossierLifecyclePopStyle}
                            dossierLifecyclePanelPhase={dossierLifecyclePanelPhase}
                            setDossierLifecyclePanelPhase={setDossierLifecyclePanelPhase}
                            dossierStatusDraft={dossierStatusDraft}
                            dossierPendingStatus={dossierPendingStatus}
                            setDossierPendingStatus={(status) =>
                                setDossierPendingStatus(status as DossierLifecycleStatus | null)
                            }
                            dossierReasonDraft={dossierReasonDraft}
                            setDossierReasonDraft={setDossierReasonDraft}
                            dossierDateDraft={dossierDateDraft}
                            setDossierDateDraft={setDossierDateDraft}
                            dossierLifecycleLabelAr={(value) =>
                                dossierLifecycleLabelAr(value as DossierLifecycleStatus)
                            }
                            handleDossierLifecyclePick={(status) =>
                                safeHandleDossierLifecyclePick(status as DossierLifecycleStatus)
                            }
                            handleDossierLifecycleConfirmDetails={safeHandleDossierLifecycleConfirmDetails}
                            dossierLifecyclePanelPortalRef={dossierLifecyclePanelPortalRef}
                        />
                    ) : null}
                </div>

                <ColleagueConsultationHeaderButton
                    iconOnly
                    iconSize={15}
                    className="inline-flex h-9 w-9 items-center justify-center justify-self-center rounded-xl border border-[#E6C673]/30 bg-[#E6C673]/10 px-0 text-[#E6C673] transition-all hover:bg-[#E6C673]/16"
                />

                <button
                    type="button"
                    onPointerEnter={() => prefetchExecutionOverlayModals()}
                    onClick={() => setShowExecutionTrashModal(true)}
                    className="group relative inline-flex h-9 w-9 items-center justify-center justify-self-end rounded-xl border border-white/8 bg-hami-navy/45 text-slate-400 backdrop-blur-md transition-all duration-200 hover:border-amber-500/30 hover:bg-amber-500/8 hover:text-amber-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                    title="سلة مهملات الإضبارة (السجل والملاحظات)"
                    aria-label="سلة مهملات الإضبارة"
                >
                    <Trash2
                        size={16}
                        strokeWidth={1.75}
                        className="transition-transform duration-200 group-hover:scale-105"
                    />
                    {trashCount > 0 ? (
                        <span className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-amber-500/35 bg-amber-950/90 px-1 text-[9px] font-bold tabular-nums text-amber-200/95 shadow-[0_0_10px_-2px_rgba(230,198,115,0.45)]">
                            {trashCount}
                        </span>
                    ) : null}
                </button>
            </div>
        </div>
    );
}
