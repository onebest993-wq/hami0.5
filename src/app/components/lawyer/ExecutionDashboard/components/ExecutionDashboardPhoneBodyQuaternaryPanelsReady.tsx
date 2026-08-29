import React from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { EXEC_OVERLAY_INNER_SILENT_FALLBACK } from '../executionDashboardLazyShellUi';
import { PreloadableOverlayGate } from '../preloadableOverlayGate';
import { LazyVisitationScheduleModule } from '../executionDashboardLazyRegistryShell';
import { LazyGuarantorExternalHub } from '../executionGuarantorHubLazy';
import type {
    ExecutionDashboardPhoneBodyDeferredScope,
    GraceTaskCard,
} from './ExecutionDashboardPhoneBodyDeferredScope';
import { ExecutionDashboardPhoneBodyQuaternaryLatePanels } from './ExecutionDashboardPhoneBodyQuaternaryLatePanels';

export type ExecutionDashboardPhoneBodyQuaternaryPanelsProps = {
    scope: ExecutionDashboardPhoneBodyDeferredScope;
    quaternaryStageReady: boolean;
    safeActiveGraceTasks: GraceTaskCard[];
    safeShouldShowGuarantorExternalHub: (value: unknown) => boolean;
    visitationFileNumber?: string;
    directOpenUnifiedSummonsHub: (options?: {
        debtorKey?: string | null;
        initialMainTab?: 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null;
    }) => void;
    removeJudicialCustodianEntry: (id: string) => void;
    openGuarantorFollowupDetails: () => void;
};

export function ExecutionDashboardPhoneBodyQuaternaryPanelsReady({
    scope,
    quaternaryStageReady,
    safeActiveGraceTasks,
    safeShouldShowGuarantorExternalHub,
    visitationFileNumber,
    directOpenUnifiedSummonsHub,
    removeJudicialCustodianEntry,
    openGuarantorFollowupDetails,
}: ExecutionDashboardPhoneBodyQuaternaryPanelsProps) {
    const {
        archiveAndClearGuarantor,
        evictionGraceHidden,
        evictionGracePinned,
        executionData,
        followupSpecialization,
        graceHiddenKey,
        handleGuarantorRequestFromFollowup,
        isEvictionExecutionModule,
        isVisitationClaim,
        judicialCustodiansResolved,
        nextTimelineId,
        persistExecutionMerge,
        pushTimelineEvent,
        setEvictionGraceHidden,
        setJudicialCustodianModalCtx,
        setJudicialCustodianModalOpen,
        showToast,
        todayYmd,
        viewExecutionData,
        visitChildNames,
    } = scope;

    const followupSpec = followupSpecialization ?? {};
    const resolvedVisitationFileNumber =
        visitationFileNumber ?? String(executionData?.fileNumber ?? '');

    if (!quaternaryStageReady) {
        return null;
    }

    return (
        <>
            {safeShouldShowGuarantorExternalHub(viewExecutionData) &&
            !Boolean(followupSpec.hideAllGuarantorPresence) ? (
                <div className="mx-3 mt-2">
                    <PreloadableOverlayGate
                        lazy={LazyGuarantorExternalHub}
                        lazyProps={{
                            executionData: viewExecutionData as ExecutionFile | null,
                            openGuarantorDetailsModal: openGuarantorFollowupDetails,
                            archiveAndClearGuarantor,
                            handleGuarantorRequestFromFollowup,
                            onOpenUnifiedSummonsHub: (options) =>
                                directOpenUnifiedSummonsHub(
                                    options as
                                        | {
                                              debtorKey?: string | null;
                                              initialMainTab?:
                                                  | 'tabligh'
                                                  | 'taklif'
                                                  | 'nashr'
                                                  | 'guarantor'
                                                  | null;
                                          }
                                        | undefined,
                                ),
                        }}
                        fallback={EXEC_OVERLAY_INNER_SILENT_FALLBACK}
                    />
                </div>
            ) : null}

            {isVisitationClaim ? (
                <PreloadableOverlayGate
                    lazy={LazyVisitationScheduleModule}
                    lazyProps={{
                        executionData: viewExecutionData,
                        visitChildNames,
                        fileNumber: resolvedVisitationFileNumber,
                        todayYmd,
                        persistExecutionMerge,
                        pushTimelineEvent,
                        nextTimelineId,
                        showToast,
                    }}
                    fallback={EXEC_OVERLAY_INNER_SILENT_FALLBACK}
                />
            ) : null}

            <ExecutionDashboardPhoneBodyQuaternaryLatePanels
                isEvictionExecutionModule={isEvictionExecutionModule}
                judicialCustodiansResolved={judicialCustodiansResolved}
                persistExecutionMerge={persistExecutionMerge}
                showToast={showToast}
                setJudicialCustodianModalCtx={setJudicialCustodianModalCtx}
                setJudicialCustodianModalOpen={setJudicialCustodianModalOpen}
                removeJudicialCustodianEntry={removeJudicialCustodianEntry}
                safeActiveGraceTasks={safeActiveGraceTasks}
                evictionGracePinned={evictionGracePinned}
                evictionGraceHidden={evictionGraceHidden}
                setEvictionGraceHidden={setEvictionGraceHidden}
                graceHiddenKey={graceHiddenKey}
            />
        </>
    );
}
