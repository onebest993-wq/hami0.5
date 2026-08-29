import React from 'react';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import type { DossierLifecycleStatus } from '@/app/types/execution';
import { ColleagueConsultationHeaderButton } from '@/app/components/lawyer/caseShare/ColleagueConsultationHeaderButton';
import {
    EXECUTION_DOSSIER_CONSULT_BTN,
    EXECUTION_DOSSIER_PHONE_HEADER_GRID,
    EXECUTION_DOSSIER_PHONE_HEADER_SHELL,
    EXECUTION_DOSSIER_TRASH_BTN,
} from '@/app/components/lawyer/ExecutionDashboard/executionDossierVisualLite';
import { LazyDossierLifecyclePanel } from '../executionDashboardLazyRegistryShell';
import { prefetchExecutionDossierActionsOverlay } from '../executionDashboardOverlayPrefetch';
import {
    dossierLifecycleLabelAr,
    dossierLifecycleTriggerDotClass,
    dossierLifecycleTriggerTextClass,
} from '../helpers';
import type { DossierLifecyclePopStyle } from '../orchestrators/executionOrchestratorSliceTypes';
import { ExecutionDossierHeaderNavButtons } from './ExecutionDossierHeaderNavButtons';

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
}: ExecutionDashboardPhoneBodyHeaderProps) {
    const trashCount =
        trashedTimelineEvents.length + trashedCaseNotes.length + trashedCaseTasks.length;

    return (
        <div className={EXECUTION_DOSSIER_PHONE_HEADER_SHELL}>
            <div className={EXECUTION_DOSSIER_PHONE_HEADER_GRID}>
                <ExecutionDossierHeaderNavButtons
                    onBack={handleDossierBack}
                    onExit={handleDossierExit}
                    nestedNavigation={dossierNestedNav}
                />

                <div
                    className="relative flex min-w-0 items-center justify-center justify-self-center"
                    ref={dossierLifecyclePopoverRef as React.Ref<HTMLDivElement>}
                >
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
                        className={`inline-flex h-9 min-h-[44px] max-w-full items-center justify-center gap-1.5 rounded-lg px-2 transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45 touch-manipulation ${dossierLifecycleTriggerTextClass(dossierStatusDraft)}`}
                        aria-expanded={dossierLifecyclePanelOpen}
                        aria-haspopup="dialog"
                        aria-label={`الإضبارة التنفيذية — ${dossierLifecycleLabelAr(dossierStatusDraft)}`}
                        title="تغيير حالة الإضبارة — اضغط للقائمة"
                    >
                        <span className="truncate text-[12px] font-semibold tracking-tight">
                            الإضبارة التنفيذية
                        </span>
                        <span
                            className={`h-2 w-2 shrink-0 rounded-full ring-2 ring-white/15 ${dossierLifecycleTriggerDotClass(dossierStatusDraft)}`}
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
                    className={EXECUTION_DOSSIER_CONSULT_BTN}
                />

                <button
                    type="button"
                    onPointerEnter={() => {
                        void import('../executionDashboardLazyRegistryOverlays')
                            .then((m) => {
                                m.prefetchExecutionOverlayModals();
                            })
                            .catch(() => undefined);
                    }}
                    onClick={() => setShowExecutionTrashModal(true)}
                    data-testid="execution-dossier-trash"
                    className={EXECUTION_DOSSIER_TRASH_BTN}
                    title="سلة مهملات الإضبارة (السجل والملاحظات)"
                    aria-label="سلة مهملات الإضبارة"
                >
                    <Trash2 size={16} strokeWidth={1.75} />
                    {trashCount > 0 ? (
                        <span className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-amber-500/35 bg-amber-950/90 px-1 text-[9px] font-bold tabular-nums text-amber-200/95">
                            {trashCount}
                        </span>
                    ) : null}
                </button>
            </div>
        </div>
    );
}
