/** Phase C Slice 24 — scope orchestration + modal scope + lazy chunk */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useExecutionDashboardCoreScopeRuntimeBindings } from './useExecutionDashboardCoreScopeRuntimeBindings';
import { buildExecutionDashboardModalScope, type ExecutionModalFlags } from './buildExecutionDashboardModalScope';
import { buildFollowupModalSnapshotInput } from '../buildFollowupModalSnapshotInput';
import { useExecutionDashboardLazyChunkSetup } from '../useExecutionDashboardLazyChunkSetup';
import { pickExecutionPhoneBodyProps } from '../pickExecutionPhoneBodyProps';
import { pickExecutionShellOverlayProps } from '../pickExecutionShellOverlayProps';
import { buildExecutionDashboardDirectFollowupScopeSnapshot } from './buildExecutionDashboardDirectFollowupScopeSnapshot';
import { hasSelectedScopeDeltaForLazySync } from './executionScopeLazySyncDelta';
import {
    getCachedExecutionDashboardBaseScopeBuilder,
    loadAndCacheExecutionDashboardBaseScopeBuilder,
} from './executionDashboardBaseScopeCache';
import { pickExecutionModalFlags } from './pickExecutionModalFlags';
import { useExecutionDashboardOverlayScopeLoad } from './useExecutionDashboardOverlayScopeLoad';
import {
    fingerprintExecutionModalFlags,
    type BaseScopeBuilder,
} from './useExecutionDashboardCoreScopeAndChunk.types';
import { useExecutionDashboardCoreScopeOverlaySignals } from './useExecutionDashboardCoreScopeOverlaySignals';

const EMPTY_BASE_SCOPE: Record<string, unknown> = Object.freeze({});

export function useExecutionDashboardCoreScopeAndChunk(p: {
    scopeRuntimeInput: Record<string, unknown>;
    handlerCluster: Record<string, unknown>;
    assemblyHandlers: Record<string, unknown>;
    scopeLocalFlat: Record<string, unknown>;
    scopeRestFlat: Record<string, unknown>;
    specificDeliveryConvertedAmount: number | null;
    specificDeliveryFinancialized: boolean;
    modalScopeInput: Record<string, unknown>;
    chunkSetupInput: {
        fingerprintInput: Record<string, unknown>;
        chunkDataReady: boolean;
    };
}) {
    const specificDeliveryConvertedAmount = p.specificDeliveryConvertedAmount;
    const specificDeliveryFinancialized = p.specificDeliveryFinancialized;

    const scopeRuntimeBindings = useExecutionDashboardCoreScopeRuntimeBindings(
        p.scopeRuntimeInput as Parameters<typeof useExecutionDashboardCoreScopeRuntimeBindings>[0],
    );

    const modalScopeParams = p.modalScopeInput as Parameters<
        typeof buildExecutionDashboardModalScope
    >[0];
    const { executionModalSetters } = buildExecutionDashboardModalScope(modalScopeParams);
    const executionModalFlags = useMemo(
        (): ExecutionModalFlags => pickExecutionModalFlags(modalScopeParams),
        [
            modalScopeParams.showUnifiedExecutionModal,
            modalScopeParams.showDecisionsModal,
            modalScopeParams.showDocumentsModal,
            modalScopeParams.showTimelineModal,
            modalScopeParams.showCoerciveModal,
            modalScopeParams.showNotificationModal,
            modalScopeParams.showUnifiedSummonsModal,
            modalScopeParams.showPaymentModal,
            modalScopeParams.showSeizedAssetsModal,
            modalScopeParams.showNotesModal,
            modalScopeParams.showAppointmentModal,
            modalScopeParams.showPaymentCalculator,
            modalScopeParams.showSettlementCalculator,
            modalScopeParams.showPauseModal,
            modalScopeParams.showLedgerModal,
            modalScopeParams.showEditDossierMetaModal,
            modalScopeParams.showEvictionExpenseModal,
            modalScopeParams.showEvictionLawyerFeeModal,
            modalScopeParams.showEvictionResidentialGraceModal,
            modalScopeParams.showGuarantorDetailsModal,
            modalScopeParams.showHeirsNotificationModal,
            modalScopeParams.showLinkedDossierTimeline,
            modalScopeParams.showRealEstateSeizureModal,
            modalScopeParams.showSolidaryCoerciveTargetModal,
            modalScopeParams.showStayOfExecutionModal,
            modalScopeParams.showTransferFileNumberChangeModal,
        ],
    );

    const scopeSourcesRef = useRef<Record<string, unknown>>({});
    const overlayPatchRef = useRef<Record<string, unknown>>({});
    const lastCommittedScopeRef = useRef<Record<string, unknown> | null>(null);
    const phoneBodyScopeSelectionRef = useRef<Record<string, unknown>>({});
    const shellOverlayScopeSelectionRef = useRef<Record<string, unknown>>({});
    const phoneBodyScopeTokenRef = useRef(0);
    const shellOverlayScopeTokenRef = useRef(0);
    const [overlayPatchEpoch, setOverlayPatchEpoch] = useState(0);

    const scopeSourcesBuildInput = useMemo(
        () => ({
            scopeRuntimeBindings,
            assemblyHandlers: p.assemblyHandlers,
            handlerCluster: p.handlerCluster,
            scopeLocalFlat: p.scopeLocalFlat,
            scopeRestFlat: p.scopeRestFlat,
            specificDeliveryConvertedAmount,
            specificDeliveryFinancialized,
            executionModalFlags,
            executionModalSetters,
        }),
        [
            executionModalFlags,
            executionModalSetters,
            p.assemblyHandlers,
            p.handlerCluster,
            p.scopeLocalFlat,
            p.scopeRestFlat,
            scopeRuntimeBindings,
            specificDeliveryConvertedAmount,
            specificDeliveryFinancialized,
        ],
    );

    const { overlayUrgent, shellOverlayStateToken, overlayIntentUrgent, dossierScopeId } =
        useExecutionDashboardCoreScopeOverlaySignals({
            scopeLocalFlat: p.scopeLocalFlat,
            scopeRestFlat: p.scopeRestFlat,
            executionModalFlags,
        });

    const executionModalFlagsFingerprint = useMemo(
        () => fingerprintExecutionModalFlags(executionModalFlags),
        [executionModalFlags],
    );

    /** بناء base scope — من الكاش فوراً إن وُجد (warm)، وإلا تحميل بلا تأجيل إطارين */
    const cachedBaseBuilder = getCachedExecutionDashboardBaseScopeBuilder();
    const baseScopeBuilderRef = useRef<BaseScopeBuilder | null>(cachedBaseBuilder);
    const [baseScopeBuilderVersion, setBaseScopeBuilderVersion] = useState(() =>
        cachedBaseBuilder ? 1 : 0,
    );

    useEffect(() => {
        let cancelled = false;
        const applyBuilder = (builder: BaseScopeBuilder) => {
            if (cancelled) return;
            if (baseScopeBuilderRef.current === builder) return;
            baseScopeBuilderRef.current = builder;
            setBaseScopeBuilderVersion((version) => version + 1);
        };

        const hit = getCachedExecutionDashboardBaseScopeBuilder();
        if (hit) {
            applyBuilder(hit);
            return () => {
                cancelled = true;
            };
        }

        void loadAndCacheExecutionDashboardBaseScopeBuilder()
            .then((builder) => applyBuilder(builder))
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [dossierScopeId]);

    const baseScopeReady = baseScopeBuilderVersion > 0 && baseScopeBuilderRef.current != null;

    const baseScopeSources = useMemo(() => {
        const builder = baseScopeBuilderRef.current;
        if (!builder) return EMPTY_BASE_SCOPE;
        return builder(scopeSourcesBuildInput);
    }, [scopeSourcesBuildInput, baseScopeBuilderVersion]);

    const scopeSourcesBuildInputRef = useRef(scopeSourcesBuildInput);
    scopeSourcesBuildInputRef.current = scopeSourcesBuildInput;
    const lastAppliedOverlayFingerprintRef = useRef('');

    useEffect(() => {
        lastAppliedOverlayFingerprintRef.current = '';
        overlayPatchRef.current = {};
    }, [dossierScopeId]);

    const overlayScopeLoadFingerprint = useMemo(
        () =>
            [
                executionModalFlagsFingerprint,
                shellOverlayStateToken,
                String(specificDeliveryConvertedAmount ?? ''),
                specificDeliveryFinancialized ? '1' : '0',
                overlayUrgent ? '1' : '0',
                overlayIntentUrgent ? '1' : '0',
                dossierScopeId,
            ].join('|'),
        [
            executionModalFlagsFingerprint,
            shellOverlayStateToken,
            specificDeliveryConvertedAmount,
            specificDeliveryFinancialized,
            overlayUrgent,
            overlayIntentUrgent,
            dossierScopeId,
        ],
    );

    const scopeSources = useMemo(
        () => ({ ...baseScopeSources, ...overlayPatchRef.current }),
        [baseScopeSources, overlayPatchEpoch],
    );

    /**
     * مزامنة ref + توكنات في نفس الـ render عند تغيّر هوية scopeSources.
     * مهم: أي تغيّر في openEditDossierMeta / showEditDossierMetaModal يجب أن يرفع shell token
     * وإلا تبقى نوافذ التعديل على snapshot قديم ويبدو الزر «لا يعمل».
     */
    if (lastCommittedScopeRef.current !== scopeSources) {
        lastCommittedScopeRef.current = scopeSources;
        scopeSourcesRef.current = scopeSources;

        const nextPhoneBodyScopeSelection = pickExecutionPhoneBodyProps(scopeSources);
        if (
            hasSelectedScopeDeltaForLazySync(
                phoneBodyScopeSelectionRef.current,
                nextPhoneBodyScopeSelection,
            )
        ) {
            phoneBodyScopeSelectionRef.current = nextPhoneBodyScopeSelection;
            phoneBodyScopeTokenRef.current += 1;
        }
        const nextShellOverlayScopeSelection = pickExecutionShellOverlayProps(scopeSources);
        if (
            hasSelectedScopeDeltaForLazySync(
                shellOverlayScopeSelectionRef.current,
                nextShellOverlayScopeSelection,
            )
        ) {
            shellOverlayScopeSelectionRef.current = nextShellOverlayScopeSelection;
            shellOverlayScopeTokenRef.current += 1;
        }
    }

    const phoneBodyStorageSyncTick = String(
        p.chunkSetupInput.fingerprintInput.executionStorageTick ?? 0,
    );
    const phoneBodyDecisionsSyncTick = String(
        p.chunkSetupInput.fingerprintInput.decisionsReloadEpoch ?? 0,
    );
    const phoneBodyScopeSyncToken = `${phoneBodyScopeTokenRef.current}|${phoneBodyStorageSyncTick}|${phoneBodyDecisionsSyncTick}`;
    const shellOverlayClusterEpoch = String(
        p.chunkSetupInput.fingerprintInput.handlerClusterEpoch ?? 0,
    );
    const shellOverlayScopeSyncToken = `${shellOverlayScopeTokenRef.current}|${shellOverlayClusterEpoch}`;

    // أي نافذة مفتوحة تجعل تحميل الـ overlay scope فورياً — الانتظار حتى idle كان
    // يترك بيانات النوافذ العادية على snapshot ناقص حتى ~540ms بعد الفتح.
    const overlayAnyModalOpen = useMemo(
        () =>
            executionModalFlagsFingerprint.includes('1') ||
            Boolean(
                (p.scopeLocalFlat as Record<string, unknown>).showExecutionTrashModal ??
                    (p.scopeRestFlat as Record<string, unknown>).showExecutionTrashModal,
            ),
        [
            executionModalFlagsFingerprint,
            (p.scopeLocalFlat as Record<string, unknown>).showExecutionTrashModal,
            (p.scopeRestFlat as Record<string, unknown>).showExecutionTrashModal,
        ],
    );

    useExecutionDashboardOverlayScopeLoad({
        overlayUrgent,
        overlayAnyModalOpen,
        overlayIntentUrgent,
        overlayScopeLoadFingerprint,
        lastAppliedOverlayFingerprintRef,
        overlayPatchRef,
        scopeSourcesBuildInputRef,
        setOverlayPatchEpoch,
    });

    const shellModalFlags = useMemo(
        () => ({
            ...executionModalFlags,
            showExecutionTrashModal: Boolean(
                (p.scopeLocalFlat as Record<string, unknown>).showExecutionTrashModal ??
                    (p.scopeRestFlat as Record<string, unknown>).showExecutionTrashModal,
            ),
        }),
        [
            executionModalFlags,
            (p.scopeLocalFlat as Record<string, unknown>).showExecutionTrashModal,
            (p.scopeRestFlat as Record<string, unknown>).showExecutionTrashModal,
        ],
    );

    const {
        phoneBodyFingerprint,
        shellOverlayFingerprint,
        phoneBodyReady,
        shellOverlaysReady,
        phoneBodyScopeRef,
        shellOverlayScopeRef,
    } = useExecutionDashboardLazyChunkSetup({
        ...p.chunkSetupInput,
        chunkDataReady: Boolean(p.chunkSetupInput.chunkDataReady) && baseScopeReady,
        modalFlags: shellModalFlags,
        getScopeSources: () => scopeSourcesRef.current,
        phoneBodyScopeSyncToken,
        shellOverlayScopeSyncToken,
        shellOverlayStateToken,
        overlayIntentUrgent,
    });

    const shellOverlayScopeSnapshot = useMemo(
        () => ({
            ...scopeSourcesRef.current,
        }),
        [shellOverlayFingerprint, shellOverlayScopeSyncToken],
    );

    const directFollowupScopeSnapshot = useMemo(
        () =>
            buildExecutionDashboardDirectFollowupScopeSnapshot({
                scopeSources,
                scopeLocalFlat: p.scopeLocalFlat,
                scopeRestFlat: p.scopeRestFlat,
                executionModalSetters,
            }),
        [executionModalSetters, p.scopeLocalFlat, p.scopeRestFlat, scopeSources],
    );

    const followupModalSnapshot = useMemo(
        () => buildFollowupModalSnapshotInput(directFollowupScopeSnapshot),
        [directFollowupScopeSnapshot],
    );

    return {
        phoneBodyFingerprint,
        shellOverlayFingerprint,
        phoneBodyReady,
        shellOverlaysReady,
        phoneBodyScopeRef,
        shellOverlayScopeRef,
        shellOverlayScopeSnapshot,
        followupModalSnapshot,
    };
}
