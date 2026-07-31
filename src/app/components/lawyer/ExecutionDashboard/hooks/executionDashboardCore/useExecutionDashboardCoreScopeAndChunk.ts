/** Phase C Slice 24 — scope orchestration + modal scope + lazy chunk */
import { useEffect, useMemo, useRef, useState } from 'react';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import { useExecutionDashboardCoreScopeRuntimeBindings } from './useExecutionDashboardCoreScopeRuntimeBindings';
import { buildExecutionDashboardModalScope } from './buildExecutionDashboardModalScope';
import { buildFollowupModalSnapshotInput } from '../buildFollowupModalSnapshotInput';
import { useExecutionDashboardLazyChunkSetup } from '../useExecutionDashboardLazyChunkSetup';
import { pickExecutionPhoneBodyProps } from '../pickExecutionPhoneBodyProps';
import { pickExecutionShellOverlayProps } from '../pickExecutionShellOverlayProps';
import { buildExecutionDashboardDirectFollowupScopeSnapshot } from './buildExecutionDashboardDirectFollowupScopeSnapshot';
import { hasSelectedScopeDeltaForLazySync } from './executionScopeLazySyncDelta';
import type { ExecutionModalFlags } from './buildExecutionDashboardModalScope';
import {
    getCachedExecutionDashboardBaseScopeBuilder,
    loadAndCacheExecutionDashboardBaseScopeBuilder,
} from './executionDashboardBaseScopeCache';

const executionDashboardCoreScopeSourcesOverlayImport = () =>
    import('./executionDashboardCoreScopeSourcesOverlayLazy');

const EMPTY_BASE_SCOPE: Record<string, unknown> = Object.freeze({});

/** نوع محلي — لا يستورد executionDashboardCoreScopeSourceGroups حتى لا يُسحب إلى الـ chunk الرئيسي */
type BaseScopeBuilderInput = {
    scopeRuntimeBindings: Record<string, unknown>;
    assemblyHandlers: Record<string, unknown>;
    handlerCluster: Record<string, unknown>;
    scopeLocalFlat: Record<string, unknown>;
    scopeRestFlat: Record<string, unknown>;
    specificDeliveryConvertedAmount: number | null;
    specificDeliveryFinancialized: boolean;
    executionModalFlags: Record<string, unknown>;
    executionModalSetters: Record<string, unknown>;
};

type BaseScopeBuilder = (input: BaseScopeBuilderInput) => Record<string, unknown>;

function fingerprintExecutionModalFlags(flags: ExecutionModalFlags): string {
    return Object.values(flags)
        .map((value) => (value ? '1' : '0'))
        .join('');
}

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
        (): ExecutionModalFlags => ({
            showUnifiedExecutionModal: modalScopeParams.showUnifiedExecutionModal,
            showDecisionsModal: modalScopeParams.showDecisionsModal,
            showDocumentsModal: modalScopeParams.showDocumentsModal,
            showTimelineModal: modalScopeParams.showTimelineModal,
            showCoerciveModal: modalScopeParams.showCoerciveModal,
            showNotificationModal: modalScopeParams.showNotificationModal,
            showUnifiedSummonsModal: modalScopeParams.showUnifiedSummonsModal,
            showPaymentModal: modalScopeParams.showPaymentModal,
            showSeizedAssetsModal: modalScopeParams.showSeizedAssetsModal,
            showNotesModal: modalScopeParams.showNotesModal,
            showAppointmentModal: modalScopeParams.showAppointmentModal,
            showPaymentCalculator: modalScopeParams.showPaymentCalculator,
            showSettlementCalculator: modalScopeParams.showSettlementCalculator,
            showPauseModal: modalScopeParams.showPauseModal,
            showLedgerModal: modalScopeParams.showLedgerModal,
            showEditDossierMetaModal: modalScopeParams.showEditDossierMetaModal,
            showEvictionExpenseModal: modalScopeParams.showEvictionExpenseModal,
            showEvictionLawyerFeeModal: modalScopeParams.showEvictionLawyerFeeModal,
            showEvictionResidentialGraceModal: modalScopeParams.showEvictionResidentialGraceModal,
            showGuarantorDetailsModal: modalScopeParams.showGuarantorDetailsModal,
            showHeirsNotificationModal: modalScopeParams.showHeirsNotificationModal,
            showLinkedDossierTimeline: modalScopeParams.showLinkedDossierTimeline,
            showRealEstateSeizureModal: modalScopeParams.showRealEstateSeizureModal,
            showSolidaryCoerciveTargetModal: modalScopeParams.showSolidaryCoerciveTargetModal,
            showStayOfExecutionModal: modalScopeParams.showStayOfExecutionModal,
            showTransferFileNumberChangeModal: modalScopeParams.showTransferFileNumberChangeModal,
        }),
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

    const overlayUrgent = useMemo(() => {
        const local = p.scopeLocalFlat;
        const rest = p.scopeRestFlat;
        return Boolean(
            local.showExecutionFinancialHub ||
                local.showUnifiedSeizureLogModal ||
                local.movableSeizureRequestModalOpen ||
                local.propertySeizureRequestModalOpen ||
                rest.showExecutionFinancialHub ||
                rest.showUnifiedSeizureLogModal ||
                rest.movableSeizureRequestModalOpen ||
                rest.propertySeizureRequestModalOpen,
        );
    }, [
        p.scopeLocalFlat.showExecutionFinancialHub,
        p.scopeLocalFlat.showUnifiedSeizureLogModal,
        p.scopeLocalFlat.movableSeizureRequestModalOpen,
        p.scopeLocalFlat.propertySeizureRequestModalOpen,
        p.scopeRestFlat.showExecutionFinancialHub,
        p.scopeRestFlat.showUnifiedSeizureLogModal,
        p.scopeRestFlat.movableSeizureRequestModalOpen,
        p.scopeRestFlat.propertySeizureRequestModalOpen,
    ]);

    const shellOverlayStateToken = useMemo(() => {
        const local = p.scopeLocalFlat as Record<string, unknown>;
        const rest = p.scopeRestFlat as Record<string, unknown>;
        const unifiedModalTab = String(local.unifiedModalTab ?? rest.unifiedModalTab ?? '');
        const executionDebtorTabIndex = String(
            local.executionDebtorTabIndex ?? rest.executionDebtorTabIndex ?? '',
        );
        const followupSolidaryDebtorIndex = String(
            local.followupSolidaryDebtorIndex ?? rest.followupSolidaryDebtorIndex ?? '',
        );
        return `${unifiedModalTab}|${executionDebtorTabIndex}|${followupSolidaryDebtorIndex}`;
    }, [
        p.scopeLocalFlat.unifiedModalTab,
        p.scopeRestFlat.unifiedModalTab,
        p.scopeLocalFlat.executionDebtorTabIndex,
        p.scopeRestFlat.executionDebtorTabIndex,
        p.scopeLocalFlat.followupSolidaryDebtorIndex,
        p.scopeRestFlat.followupSolidaryDebtorIndex,
    ]);

    const overlayIntentUrgent = useMemo(() => {
        const local = p.scopeLocalFlat as Record<string, unknown>;
        const rest = p.scopeRestFlat as Record<string, unknown>;
        return Boolean(
            executionModalFlags.showEditDossierMetaModal ||
                local.showEditDossierMetaModal ||
                rest.showEditDossierMetaModal ||
                local.editPartyTarget ||
                rest.editPartyTarget ||
                local.timelineEditDraft ||
                rest.timelineEditDraft ||
                local.heirsQuickView ||
                rest.heirsQuickView ||
                local.permanentDeleteTimelineId ||
                rest.permanentDeleteTimelineId,
        );
    }, [
        executionModalFlags.showEditDossierMetaModal,
        p.scopeLocalFlat.showEditDossierMetaModal,
        p.scopeRestFlat.showEditDossierMetaModal,
        p.scopeLocalFlat.editPartyTarget,
        p.scopeRestFlat.editPartyTarget,
        p.scopeLocalFlat.timelineEditDraft,
        p.scopeRestFlat.timelineEditDraft,
        p.scopeLocalFlat.heirsQuickView,
        p.scopeRestFlat.heirsQuickView,
        p.scopeLocalFlat.permanentDeleteTimelineId,
        p.scopeRestFlat.permanentDeleteTimelineId,
    ]);

    const dossierScopeId = useMemo(() => {
        const local = p.scopeLocalFlat as Record<string, unknown>;
        const rest = p.scopeRestFlat as Record<string, unknown>;
        return String(
            local.executionId ??
                rest.executionId ??
                (local.executionData as { id?: string })?.id ??
                (rest.executionData as { id?: string })?.id ??
                '',
        );
    }, [
        p.scopeLocalFlat.executionId,
        p.scopeRestFlat.executionId,
        (p.scopeLocalFlat as { executionData?: { id?: string } }).executionData?.id,
        (p.scopeRestFlat as { executionData?: { id?: string } }).executionData?.id,
    ]);

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

    const phoneBodyScopeSyncToken = String(phoneBodyScopeTokenRef.current);
    const shellOverlayScopeSyncToken = String(shellOverlayScopeTokenRef.current);

    // أي نافذة مفتوحة تجعل تحميل الـ overlay scope فورياً — الانتظار حتى idle كان
    // يترك بيانات النوافذ العادية على snapshot ناقص حتى ~540ms بعد الفتح.
    const overlayAnyModalOpen = useMemo(
        () => executionModalFlagsFingerprint.includes('1'),
        [executionModalFlagsFingerprint],
    );

    useEffect(() => {
        let cancelled = false;
        const loadFingerprint = overlayScopeLoadFingerprint;
        const loadOverlay = () => {
            if (lastAppliedOverlayFingerprintRef.current === loadFingerprint) {
                return;
            }
            void executionDashboardCoreScopeSourcesOverlayImport()
                .then(({ buildExecutionDashboardCoreDeferredOverlayChunkScopeSources }) => {
                    if (cancelled) return;
                    if (lastAppliedOverlayFingerprintRef.current === loadFingerprint) {
                        return;
                    }
                    const nextPatch = buildExecutionDashboardCoreDeferredOverlayChunkScopeSources(
                        scopeSourcesBuildInputRef.current,
                    );
                    if (
                        !hasSelectedScopeDeltaForLazySync(overlayPatchRef.current, nextPatch)
                    ) {
                        lastAppliedOverlayFingerprintRef.current = loadFingerprint;
                        return;
                    }
                    overlayPatchRef.current = nextPatch;
                    lastAppliedOverlayFingerprintRef.current = loadFingerprint;
                    setOverlayPatchEpoch((epoch) => epoch + 1);
                })
                .catch(() => {});
        };

        if (overlayUrgent || overlayAnyModalOpen || overlayIntentUrgent) {
            loadOverlay();
            return () => {
                cancelled = true;
            };
        }

        // الوحدة تُسخَّن مسبقاً في deep warm — الانتظار هنا مجرد فسحة للـ first paint
        const cancelIdleLoad = scheduleIdleWork(loadOverlay, 240);
        return () => {
            cancelled = true;
            cancelIdleLoad();
        };
    }, [overlayUrgent, overlayAnyModalOpen, overlayIntentUrgent, overlayScopeLoadFingerprint]);

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
        modalFlags: executionModalFlags,
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
                scopeSources: scopeSourcesRef.current,
                scopeLocalFlat: p.scopeLocalFlat,
                scopeRestFlat: p.scopeRestFlat,
                executionModalSetters,
            }),
        [executionModalSetters, p.scopeLocalFlat, p.scopeRestFlat, shellOverlayScopeSyncToken],
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
