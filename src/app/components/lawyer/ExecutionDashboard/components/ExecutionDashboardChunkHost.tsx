import React, { Suspense, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { LazyExecutionDashboardPhoneBody } from '../executionDashboardPhoneBodyLazy';
import { LazyExecutionDashboardShellOverlays } from '../executionDashboardShellOverlaysLazy';
import { LazyExecutionDashboardHandlerClusterPartyDeathBridge } from '../executionDashboardHandlerClusterBridgeLazy';
import { ExecutionPhoneBodyScopeProvider } from '../hooks/executionPhoneBodyScope';
import { ExecutionShellOverlayScopeProvider } from '../hooks/executionShellOverlayScope';
import { prefetchExecutionCoreHandlers } from '../executionCoreHandlersPrefetch';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import { readHandlerClusterContextValue } from '../hooks/executionDashboardCore/handlerClusterContextShared';
import { shouldLoadExecutionEmployeeAssignmentBridge } from '../hooks/executionHandlerClusterGate';
import type { ExecutionDashboardCoreHandlerClusterInput } from '../hooks/executionDashboardCore/executionDashboardCoreHandlerClusterTypes';
import type { FollowupAdminSpecialHandlerClusterInput } from '../hooks/executionDashboardCore/followupAdminSpecialHandlerClusterInput';
import type { FollowupOtherPartyHandlerClusterInput } from '../hooks/executionDashboardCore/followupOtherPartyHandlerClusterInput';

const LazyExecutionDashboardCoerciveHandlerClusterGroup = React.lazy(() =>
    import('./ExecutionDashboardHandlerClusterGroups').then((m) => ({
        default: m.ExecutionDashboardCoerciveHandlerClusterGroup,
    })),
);

const LazyExecutionDashboardSeizureHandlerClusterGroup = React.lazy(() =>
    import('./ExecutionDashboardHandlerClusterGroups').then((m) => ({
        default: m.ExecutionDashboardSeizureHandlerClusterGroup,
    })),
);

const LazyExecutionDashboardFollowupHandlerClusterGroup = React.lazy(() =>
    import('./ExecutionDashboardHandlerClusterGroups').then((m) => ({
        default: m.ExecutionDashboardFollowupHandlerClusterGroup,
    })),
);

const PHONE_BODY_PLACEHOLDER_CLASS =
    'bg-slate-900/95 w-full max-w-md h-full flex flex-col shadow-2xl border border-slate-700/30';

/** هيكل هندسي يطابق بطاقة تفاصيل الإضبارة — صفر CLS أثناء hydration. */
function PhoneBodyLoadingShell() {
    return (
        <div
            className={PHONE_BODY_PLACEHOLDER_CLASS}
            dir="rtl"
            aria-busy="true"
            aria-label="جاري تحميل الإضبارة"
        >
            <div className="mx-2 mt-2 rounded-xl border-b border-black/50 border-t border-white/10 bg-gradient-to-r from-slate-800/40 via-slate-700/20 to-slate-800/40">
                <div className="flex w-full items-center gap-2 px-3 py-2.5">
                    <span className="inline-flex h-9 w-9 shrink-0 rounded-xl border border-white/8 bg-hami-navy/45" aria-hidden />
                    <div className="flex min-w-0 flex-1 justify-center">
                        <span className="h-4 w-36 animate-pulse rounded bg-white/10" aria-hidden />
                    </div>
                    <span className="inline-flex h-9 w-9 shrink-0 rounded-xl border border-white/8 bg-hami-navy/30" aria-hidden />
                    <span className="inline-flex h-9 w-9 shrink-0 rounded-xl border border-white/8 bg-hami-navy/30" aria-hidden />
                </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pt-3">
                <div className="mb-3 rounded-2xl border border-amber-500/25 bg-[#0B1120]/55 px-3 py-3">
                    <div className="mx-auto h-3 w-24 animate-pulse rounded bg-white/10" aria-hidden />
                    <div className="mx-auto mt-2 h-4 w-40 animate-pulse rounded bg-amber-50/10" aria-hidden />
                </div>
                <div className="space-y-3">
                    <div className="h-20 animate-pulse rounded-2xl border border-white/8 bg-white/[0.04]" aria-hidden />
                    <div className="h-28 animate-pulse rounded-2xl border border-white/8 bg-white/[0.04]" aria-hidden />
                    <div className="h-24 animate-pulse rounded-2xl border border-white/8 bg-white/[0.04]" aria-hidden />
                </div>
            </div>
        </div>
    );
}

export type ExecutionDashboardChunkHostProps = {
    phoneBodyReady: boolean;
    shellOverlaysReady: boolean;
    phoneBodyScopeRef: MutableRefObject<Record<string, unknown>>;
    shellOverlayScopeRef: MutableRefObject<Record<string, unknown>>;
    shellOverlayScopeSnapshot: Record<string, unknown>;
    followupModalSnapshot: Record<string, unknown>;
    phoneBodyFingerprint: string;
    shellOverlayFingerprint: string;
    showUnifiedExecutionModal: boolean;
    unifiedModalTab?: string | null;
    loadLightHandlerCluster: boolean;
    loadFollowupHeavyHandlerCluster: boolean;
    loadFollowupAdminSpecialHandlerCluster: boolean;
    loadFollowupDossierControlsHandlerCluster: boolean;
    loadFollowupOtherPartyHandlerCluster: boolean;
    loadSeizureHeavyHandlerCluster: boolean;
    loadSeizureRequestsHandlerCluster: boolean;
    loadSeizureLogHandlerCluster: boolean;
    loadCoerciveHeavyHandlerCluster: boolean;
    loadPublicationNoticeHandlerCluster: boolean;
    loadDossierSupportHandlerCluster: boolean;
    loadPartyDeathHandlerCluster: boolean;
    lightHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    followupAdminSpecialHandlerClusterInput: FollowupAdminSpecialHandlerClusterInput;
    followupDossierControlsHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    followupOtherPartyHandlerClusterInput: FollowupOtherPartyHandlerClusterInput;
    seizureHeavyHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    coerciveHeavyHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    publicationNoticeHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    dossierSupportHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    partyDeathHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    handlerClusterMountKey: string;
    onLightHandlerClusterReady: (cluster: Record<string, unknown>) => void;
    onFollowupAdminSpecialHandlerClusterReady: (cluster: Record<string, unknown>) => void;
    onFollowupDossierControlsHandlerClusterReady: (cluster: Record<string, unknown>) => void;
    onFollowupOtherPartyHandlerClusterReady: (cluster: Record<string, unknown>) => void;
    onSeizureHeavyHandlerClusterReady: (cluster: Record<string, unknown>) => void;
    onCoerciveHeavyHandlerClusterReady: (cluster: Record<string, unknown>) => void;
    onDossierSupportHandlerClusterReady: (cluster: Record<string, unknown>) => void;
    onPartyDeathHandlerClusterReady: (cluster: Record<string, unknown>) => void;
};

/** جسم الإضبارة lazy (chunk منفصل) + shell overlays عند الحاجة */
export function ExecutionDashboardChunkHost({
    phoneBodyReady,
    shellOverlaysReady,
    phoneBodyScopeRef,
    shellOverlayScopeRef,
    shellOverlayScopeSnapshot,
    followupModalSnapshot,
    phoneBodyFingerprint,
    shellOverlayFingerprint,
    showUnifiedExecutionModal,
    unifiedModalTab,
    loadLightHandlerCluster,
    loadFollowupHeavyHandlerCluster,
    loadFollowupAdminSpecialHandlerCluster,
    loadFollowupDossierControlsHandlerCluster,
    loadFollowupOtherPartyHandlerCluster,
    loadSeizureHeavyHandlerCluster,
    loadSeizureRequestsHandlerCluster,
    loadSeizureLogHandlerCluster,
    loadCoerciveHeavyHandlerCluster,
    loadPublicationNoticeHandlerCluster,
    loadDossierSupportHandlerCluster,
    loadPartyDeathHandlerCluster,
    lightHandlerClusterInput,
    followupAdminSpecialHandlerClusterInput,
    followupDossierControlsHandlerClusterInput,
    followupOtherPartyHandlerClusterInput,
    seizureHeavyHandlerClusterInput,
    coerciveHeavyHandlerClusterInput,
    publicationNoticeHandlerClusterInput,
    dossierSupportHandlerClusterInput,
    partyDeathHandlerClusterInput,
    handlerClusterMountKey,
    onLightHandlerClusterReady,
    onFollowupAdminSpecialHandlerClusterReady,
    onFollowupDossierControlsHandlerClusterReady,
    onFollowupOtherPartyHandlerClusterReady,
    onSeizureHeavyHandlerClusterReady,
    onCoerciveHeavyHandlerClusterReady,
    onDossierSupportHandlerClusterReady,
    onPartyDeathHandlerClusterReady,
}: ExecutionDashboardChunkHostProps) {
    const loadCoerciveEmployeeAssignmentBridge = shouldLoadExecutionEmployeeAssignmentBridge(
        loadCoerciveHeavyHandlerCluster,
        coerciveHeavyHandlerClusterInput,
    );
    const coerciveInputIsEvictionModule = Boolean(
        readHandlerClusterContextValue(coerciveHeavyHandlerClusterInput, 'isEvictionExecutionModule'),
    );

    useEffect(() => {
        if (!phoneBodyReady) return;

        const prefetchSecondaryHandlers = () => {
            if (loadCoerciveHeavyHandlerCluster) {
                prefetchExecutionCoreHandlers('coercive');
                if (loadCoerciveEmployeeAssignmentBridge) {
                    prefetchExecutionCoreHandlers('coercive-employee');
                }
                if (coerciveInputIsEvictionModule) {
                    prefetchExecutionCoreHandlers('coercive-eviction');
                }
            }
            if (loadSeizureHeavyHandlerCluster) {
                if (loadSeizureRequestsHandlerCluster) {
                    prefetchExecutionCoreHandlers('seizure-requests');
                }
                if (loadSeizureLogHandlerCluster) {
                    prefetchExecutionCoreHandlers('seizure-log');
                }
            }
            if (loadFollowupHeavyHandlerCluster) {
                if (loadFollowupAdminSpecialHandlerCluster) {
                    prefetchExecutionCoreHandlers('followup-admin-special');
                }
                if (loadFollowupDossierControlsHandlerCluster) {
                    prefetchExecutionCoreHandlers('followup-dossier-controls');
                }
                if (loadFollowupOtherPartyHandlerCluster) {
                    prefetchExecutionCoreHandlers(
                        followupOtherPartyHandlerClusterInput.isRepresentingDebtor
                            ? 'followup-other-party-debtor'
                            : 'followup-other-party-creditor',
                    );
                }
            }
            if (loadLightHandlerCluster) {
                prefetchExecutionCoreHandlers('light');
            }
            if (loadDossierSupportHandlerCluster) {
                prefetchExecutionCoreHandlers('dossier-support');
            }
        };

        // idle مبكر بدل مؤقّت 2.4s — أول تفاعل سريع مع المحضر/الحجز كان يصطدم بجسور باردة
        const cancelIdlePrefetch = scheduleIdleWork(prefetchSecondaryHandlers, 350);
        return cancelIdlePrefetch;
    }, [
        phoneBodyReady,
        loadFollowupHeavyHandlerCluster,
        loadFollowupAdminSpecialHandlerCluster,
        loadFollowupDossierControlsHandlerCluster,
        loadFollowupOtherPartyHandlerCluster,
        followupOtherPartyHandlerClusterInput.isRepresentingDebtor,
        loadCoerciveHeavyHandlerCluster,
        loadCoerciveEmployeeAssignmentBridge,
        coerciveInputIsEvictionModule,
        loadDossierSupportHandlerCluster,
        loadLightHandlerCluster,
        loadSeizureLogHandlerCluster,
        loadSeizureRequestsHandlerCluster,
        loadSeizureHeavyHandlerCluster,
    ]);

    if (!phoneBodyReady && !shellOverlaysReady) {
        return <PhoneBodyLoadingShell />;
    }

    return (
        <ExecutionShellOverlayScopeProvider scopeRef={shellOverlayScopeRef}>
            <ExecutionPhoneBodyScopeProvider scopeRef={phoneBodyScopeRef}>
                {loadPartyDeathHandlerCluster ? (
                    <Suspense fallback={null}>
                        <LazyExecutionDashboardHandlerClusterPartyDeathBridge
                            key={`${handlerClusterMountKey}:party-death`}
                            input={partyDeathHandlerClusterInput}
                            onCluster={onPartyDeathHandlerClusterReady}
                        />
                    </Suspense>
                ) : null}
                {loadCoerciveHeavyHandlerCluster ? (
                    <Suspense fallback={null}>
                        <LazyExecutionDashboardCoerciveHandlerClusterGroup
                            key={`${handlerClusterMountKey}:heavy-coercive-group`}
                            mountKey={handlerClusterMountKey}
                            input={coerciveHeavyHandlerClusterInput}
                            loadBaseCoerciveBridges
                            loadEmployeeAssignmentBridge={loadCoerciveEmployeeAssignmentBridge}
                            loadPublicationNoticeHandlerCluster={loadPublicationNoticeHandlerCluster}
                            onCluster={onCoerciveHeavyHandlerClusterReady}
                        />
                    </Suspense>
                ) : loadPublicationNoticeHandlerCluster ? (
                    <Suspense fallback={null}>
                        <LazyExecutionDashboardCoerciveHandlerClusterGroup
                            key={`${handlerClusterMountKey}:heavy-publication-group`}
                            mountKey={handlerClusterMountKey}
                            input={publicationNoticeHandlerClusterInput}
                            loadBaseCoerciveBridges={false}
                            loadEmployeeAssignmentBridge={false}
                            loadPublicationNoticeHandlerCluster
                            onCluster={onCoerciveHeavyHandlerClusterReady}
                        />
                    </Suspense>
                ) : null}
                {loadSeizureHeavyHandlerCluster ? (
                    <Suspense fallback={null}>
                        <LazyExecutionDashboardSeizureHandlerClusterGroup
                            key={`${handlerClusterMountKey}:heavy-seizure-group`}
                            mountKey={handlerClusterMountKey}
                            input={seizureHeavyHandlerClusterInput}
                            loadSeizureRequestsHandlerCluster={loadSeizureRequestsHandlerCluster}
                            loadSeizureLogHandlerCluster={loadSeizureLogHandlerCluster}
                            onCluster={onSeizureHeavyHandlerClusterReady}
                        />
                    </Suspense>
                ) : null}
                {(loadFollowupAdminSpecialHandlerCluster ||
                    loadFollowupDossierControlsHandlerCluster ||
                    loadFollowupOtherPartyHandlerCluster ||
                    loadDossierSupportHandlerCluster ||
                    (loadLightHandlerCluster &&
                        !loadCoerciveHeavyHandlerCluster &&
                        !loadSeizureHeavyHandlerCluster &&
                        !loadFollowupHeavyHandlerCluster)) ? (
                    <Suspense fallback={null}>
                        <LazyExecutionDashboardFollowupHandlerClusterGroup
                            key={`${handlerClusterMountKey}:followup-group`}
                            mountKey={handlerClusterMountKey}
                            lightHandlerClusterInput={lightHandlerClusterInput}
                            followupAdminSpecialHandlerClusterInput={followupAdminSpecialHandlerClusterInput}
                            followupDossierControlsHandlerClusterInput={
                                followupDossierControlsHandlerClusterInput
                            }
                            followupOtherPartyHandlerClusterInput={followupOtherPartyHandlerClusterInput}
                            dossierSupportHandlerClusterInput={dossierSupportHandlerClusterInput}
                            loadFollowupAdminSpecialHandlerCluster={
                                loadFollowupAdminSpecialHandlerCluster
                            }
                            loadFollowupDossierControlsHandlerCluster={
                                loadFollowupDossierControlsHandlerCluster
                            }
                            loadFollowupOtherPartyHandlerCluster={loadFollowupOtherPartyHandlerCluster}
                            loadDossierSupportHandlerCluster={loadDossierSupportHandlerCluster}
                            loadLightOnlyCluster={
                                loadLightHandlerCluster &&
                                !loadCoerciveHeavyHandlerCluster &&
                                !loadSeizureHeavyHandlerCluster &&
                                !loadFollowupHeavyHandlerCluster
                            }
                            onLightHandlerClusterReady={onLightHandlerClusterReady}
                            onFollowupAdminSpecialHandlerClusterReady={
                                onFollowupAdminSpecialHandlerClusterReady
                            }
                            onFollowupDossierControlsHandlerClusterReady={
                                onFollowupDossierControlsHandlerClusterReady
                            }
                            onFollowupOtherPartyHandlerClusterReady={
                                onFollowupOtherPartyHandlerClusterReady
                            }
                            onDossierSupportHandlerClusterReady={onDossierSupportHandlerClusterReady}
                        />
                    </Suspense>
                ) : null}
                {shellOverlaysReady ? (
                    <Suspense
                        fallback={
                            showUnifiedExecutionModal ? (
                                <div
                                    className="fixed inset-0 z-[240] flex items-center justify-center bg-black/80 p-4"
                                    data-testid="execution-followup-modal"
                                    role="dialog"
                                    aria-modal="true"
                                    aria-busy="true"
                                    aria-label="جاري تحميل محضر المتابعة"
                                />
                            ) : null
                        }
                    >
                        <LazyExecutionDashboardShellOverlays
                            showUnifiedExecutionModal={showUnifiedExecutionModal}
                            unifiedModalTab={unifiedModalTab ?? null}
                            scope={shellOverlayScopeSnapshot}
                            followupSnapshot={followupModalSnapshot}
                        />
                    </Suspense>
                ) : null}
                {phoneBodyReady ? (
                    <Suspense fallback={<PhoneBodyLoadingShell />}>
                        <LazyExecutionDashboardPhoneBody renderFingerprint={phoneBodyFingerprint} />
                    </Suspense>
                ) : (
                    <PhoneBodyLoadingShell />
                )}
            </ExecutionPhoneBodyScopeProvider>
        </ExecutionShellOverlayScopeProvider>
    );
}
