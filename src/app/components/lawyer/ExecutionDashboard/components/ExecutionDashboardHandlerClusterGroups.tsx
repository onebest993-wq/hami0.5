import React, { Suspense } from 'react';
import { readHandlerClusterContextValue } from '../hooks/executionDashboardCore/handlerClusterContextShared';
import type { ExecutionDashboardCoreHandlerClusterInput } from '../hooks/executionDashboardCore/executionDashboardCoreHandlerClusterTypes';
import type { FollowupAdminSpecialHandlerClusterInput } from '../hooks/executionDashboardCore/followupAdminSpecialHandlerClusterInput';
import type { FollowupOtherPartyHandlerClusterInput } from '../hooks/executionDashboardCore/followupOtherPartyHandlerClusterInput';
import {
    LazyExecutionDashboardHandlerClusterCoerciveActionHandlersBridge,
    LazyExecutionDashboardHandlerClusterCoerciveEvictionBridge,
    LazyExecutionDashboardHandlerClusterCoerciveLifecycleBridge,
    LazyExecutionDashboardHandlerClusterCoerciveOpsBridge,
    LazyExecutionDashboardHandlerClusterCoerciveSupportBridge,
    LazyExecutionDashboardHandlerClusterDossierSupportBridge,
    LazyExecutionDashboardHandlerClusterEmployeeAssignmentBridge,
    LazyExecutionDashboardHandlerClusterFollowupAdminSpecialBridge,
    LazyExecutionDashboardHandlerClusterFollowupDossierControlsBridge,
    LazyExecutionDashboardHandlerClusterFollowupOtherPartyBridge,
    LazyExecutionDashboardHandlerClusterFollowupOtherPartyDebtorBridge,
    LazyExecutionDashboardHandlerClusterLightBridge,
    LazyExecutionDashboardHandlerClusterPaymentBridge,
    LazyExecutionDashboardHandlerClusterPublicationNoticeBridge,
    LazyExecutionDashboardHandlerClusterSeizureHeavyBridge,
    LazyExecutionDashboardHandlerClusterSeizureLogAssetModalBridge,
    LazyExecutionDashboardHandlerClusterSeizureLogResolutionBridge,
    LazyExecutionDashboardHandlerClusterThirdPartySeizureBridge,
} from '../executionDashboardHandlerClusterBridgeLazy';

type ClusterReady = (cluster: Record<string, unknown>) => void;

export type ExecutionDashboardCoerciveHandlerClusterGroupProps = {
    mountKey: string;
    input: ExecutionDashboardCoreHandlerClusterInput;
    loadBaseCoerciveBridges: boolean;
    loadEmployeeAssignmentBridge: boolean;
    loadPublicationNoticeHandlerCluster: boolean;
    onCluster: ClusterReady;
};

export function ExecutionDashboardCoerciveHandlerClusterGroup({
    mountKey,
    input,
    loadBaseCoerciveBridges,
    loadEmployeeAssignmentBridge,
    loadPublicationNoticeHandlerCluster,
    onCluster,
}: ExecutionDashboardCoerciveHandlerClusterGroupProps) {
    // input هو bag-of-bags — العلم يُقرأ من الحقائب الداخلية
    const isEvictionExecutionModule = Boolean(
        readHandlerClusterContextValue(input, 'isEvictionExecutionModule'),
    );
    return (
        <>
            {loadBaseCoerciveBridges ? (
                <Suspense fallback={null}>
                    <>
                        <LazyExecutionDashboardHandlerClusterCoerciveLifecycleBridge
                            key={`${mountKey}:heavy-coercive-lifecycle`}
                            input={input}
                            onCluster={onCluster}
                        />
                        <LazyExecutionDashboardHandlerClusterCoerciveOpsBridge
                            key={`${mountKey}:heavy-coercive-ops`}
                            input={input}
                            onCluster={onCluster}
                        />
                        <LazyExecutionDashboardHandlerClusterPaymentBridge
                            key={`${mountKey}:heavy-payment`}
                            input={input}
                            onCluster={onCluster}
                        />
                        {loadEmployeeAssignmentBridge ? (
                            <LazyExecutionDashboardHandlerClusterEmployeeAssignmentBridge
                                key={`${mountKey}:heavy-employee-assignment`}
                                input={input}
                                onCluster={onCluster}
                            />
                        ) : null}
                        <LazyExecutionDashboardHandlerClusterCoerciveSupportBridge
                            key={`${mountKey}:heavy-coercive-support`}
                            input={input}
                            onCluster={onCluster}
                        />
                        <LazyExecutionDashboardHandlerClusterCoerciveActionHandlersBridge
                            key={`${mountKey}:heavy-coercive-action`}
                            input={input}
                            onCluster={onCluster}
                        />
                        {isEvictionExecutionModule ? (
                            <LazyExecutionDashboardHandlerClusterCoerciveEvictionBridge
                                key={`${mountKey}:heavy-coercive-eviction`}
                                input={input}
                                onCluster={onCluster}
                            />
                        ) : null}
                    </>
                </Suspense>
            ) : null}
            {loadPublicationNoticeHandlerCluster ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardHandlerClusterPublicationNoticeBridge
                        key={`${mountKey}:heavy-publication-notice`}
                        input={input}
                        onCluster={onCluster}
                    />
                </Suspense>
            ) : null}
        </>
    );
}

export type ExecutionDashboardSeizureHandlerClusterGroupProps = {
    mountKey: string;
    input: ExecutionDashboardCoreHandlerClusterInput;
    loadSeizureRequestsHandlerCluster: boolean;
    loadSeizureLogHandlerCluster: boolean;
    onCluster: ClusterReady;
};

export function ExecutionDashboardSeizureHandlerClusterGroup({
    mountKey,
    input,
    loadSeizureRequestsHandlerCluster,
    loadSeizureLogHandlerCluster,
    onCluster,
}: ExecutionDashboardSeizureHandlerClusterGroupProps) {
    return (
        <>
            {loadSeizureRequestsHandlerCluster ? (
                <Suspense fallback={null}>
                    <>
                        <LazyExecutionDashboardHandlerClusterSeizureHeavyBridge
                            key={`${mountKey}:heavy-seizure-requests`}
                            input={input}
                            onCluster={onCluster}
                        />
                        <LazyExecutionDashboardHandlerClusterThirdPartySeizureBridge
                            key={`${mountKey}:heavy-seizure-third-party`}
                            input={input}
                            onCluster={onCluster}
                        />
                    </>
                </Suspense>
            ) : null}
            {loadSeizureLogHandlerCluster ? (
                <>
                    <Suspense fallback={null}>
                        <LazyExecutionDashboardHandlerClusterSeizureLogAssetModalBridge
                            key={`${mountKey}:heavy-seizure-log-asset-modal`}
                            input={input}
                            onCluster={onCluster}
                        />
                    </Suspense>
                    <Suspense fallback={null}>
                        <LazyExecutionDashboardHandlerClusterSeizureLogResolutionBridge
                            key={`${mountKey}:heavy-seizure-log-resolution`}
                            input={input}
                            onCluster={onCluster}
                        />
                    </Suspense>
                </>
            ) : null}
        </>
    );
}

export type ExecutionDashboardFollowupHandlerClusterGroupProps = {
    mountKey: string;
    lightHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    followupAdminSpecialHandlerClusterInput: FollowupAdminSpecialHandlerClusterInput;
    followupDossierControlsHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    followupOtherPartyHandlerClusterInput: FollowupOtherPartyHandlerClusterInput;
    dossierSupportHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    loadFollowupAdminSpecialHandlerCluster: boolean;
    loadFollowupDossierControlsHandlerCluster: boolean;
    loadFollowupOtherPartyHandlerCluster: boolean;
    loadDossierSupportHandlerCluster: boolean;
    loadLightOnlyCluster: boolean;
    onLightHandlerClusterReady: ClusterReady;
    onFollowupAdminSpecialHandlerClusterReady: ClusterReady;
    onFollowupDossierControlsHandlerClusterReady: ClusterReady;
    onFollowupOtherPartyHandlerClusterReady: ClusterReady;
    onDossierSupportHandlerClusterReady: ClusterReady;
};

export function ExecutionDashboardFollowupHandlerClusterGroup({
    mountKey,
    lightHandlerClusterInput,
    followupAdminSpecialHandlerClusterInput,
    followupDossierControlsHandlerClusterInput,
    followupOtherPartyHandlerClusterInput,
    dossierSupportHandlerClusterInput,
    loadFollowupAdminSpecialHandlerCluster,
    loadFollowupDossierControlsHandlerCluster,
    loadFollowupOtherPartyHandlerCluster,
    loadDossierSupportHandlerCluster,
    loadLightOnlyCluster,
    onLightHandlerClusterReady,
    onFollowupAdminSpecialHandlerClusterReady,
    onFollowupDossierControlsHandlerClusterReady,
    onFollowupOtherPartyHandlerClusterReady,
    onDossierSupportHandlerClusterReady,
}: ExecutionDashboardFollowupHandlerClusterGroupProps) {
    return (
        <>
            {loadFollowupAdminSpecialHandlerCluster ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardHandlerClusterFollowupAdminSpecialBridge
                        key={`${mountKey}:followup-admin-special`}
                        input={followupAdminSpecialHandlerClusterInput}
                        onCluster={onFollowupAdminSpecialHandlerClusterReady}
                    />
                </Suspense>
            ) : null}
            {loadFollowupDossierControlsHandlerCluster ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardHandlerClusterFollowupDossierControlsBridge
                        key={`${mountKey}:followup-dossier-controls`}
                        input={followupDossierControlsHandlerClusterInput}
                        onCluster={onFollowupDossierControlsHandlerClusterReady}
                    />
                </Suspense>
            ) : null}
            {loadFollowupOtherPartyHandlerCluster ? (
                followupOtherPartyHandlerClusterInput.isRepresentingDebtor ? (
                    <Suspense fallback={null}>
                        <LazyExecutionDashboardHandlerClusterFollowupOtherPartyDebtorBridge
                            key={`${mountKey}:followup-other-party-debtor`}
                            input={followupOtherPartyHandlerClusterInput}
                            onCluster={onFollowupOtherPartyHandlerClusterReady}
                        />
                    </Suspense>
                ) : (
                    <Suspense fallback={null}>
                        <LazyExecutionDashboardHandlerClusterFollowupOtherPartyBridge
                            key={`${mountKey}:followup-other-party-creditor`}
                            input={followupOtherPartyHandlerClusterInput}
                            onCluster={onFollowupOtherPartyHandlerClusterReady}
                        />
                    </Suspense>
                )
            ) : null}
            {loadDossierSupportHandlerCluster ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardHandlerClusterDossierSupportBridge
                        key={`${mountKey}:dossier-support`}
                        input={dossierSupportHandlerClusterInput}
                        onCluster={onDossierSupportHandlerClusterReady}
                    />
                </Suspense>
            ) : null}
            {loadLightOnlyCluster ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardHandlerClusterLightBridge
                        key={`${mountKey}:light`}
                        input={lightHandlerClusterInput}
                        onCluster={onLightHandlerClusterReady}
                    />
                </Suspense>
            ) : null}
        </>
    );
}
