// @ts-nocheck
/** Phase C Slice 30 — dossier boot: store, execution data, modals, lifecycle */
import { useState, useMemo, useRef } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import type { DebtorsSectionHandle } from '../components/DebtorsSection';
import type { ExecutionDashboardProps } from '../../types';
import { storageCache } from '@/app/utils/storageCache';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { normalizeExecutionFileRecord } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { useExecutionAppealBannerState } from '@/app/hooks/useHasActiveExecutionAppeals';
import { useExecutionDashboardStore, isInabaSubFileId, resolveParentDossierId } from '@/app/stores';
import { useExecutionData, useStableExecutionFileForStore } from '../useExecutionData';
import { getInabaCorrespondenceLog } from '../../utils/inabaCorrespondenceLog';
import {
    useExecutionDashboardDecisionsNamespaceReconcile,
    useExecutionDashboardDecisionsStorageMigration,
    useExecutionDashboardDossierLifecycleReconcile,
    useExecutionDashboardShellPrefetch,
    useExecutionDashboardStoreFileSync,
    useExecutionDashboardUrlDelegationSync,
} from './useExecutionDashboardDossierBootLifecycle';
import { useExecutionDashboardModalControls } from '../useExecutionDashboardModalControls';
import { useExecutionDossierTabOrchestrator } from '../../orchestrators/useExecutionDossierTabOrchestrator';
import { useExecutionPartiesOrchestrator } from '../../orchestrators/useExecutionPartiesOrchestrator';

export function useExecutionDashboardCoreBootPipeline({
    file,
    executionId,
}: Pick<ExecutionDashboardProps, 'file' | 'executionId'>) {
    const [executionStorageTick, setExecutionStorageTick] = useState(0);
    const currentFile = useExecutionDashboardStore((s) => s.currentFile);
    const activeSubFileId = useExecutionDashboardStore((s) => s.activeSubFileId);
    const allSubFiles = useExecutionDashboardStore((s) => s.subFiles);
    const setActiveSubFileId = useExecutionDashboardStore((s) => s.setActiveSubFileId);
    const delegationParentFileId = useExecutionDashboardStore((s) => s.delegationParentFileId);
    const setDelegationParentFileId = useExecutionDashboardStore((s) => s.setDelegationParentFileId);
    const parentDossierId = useMemo(
        () =>
            resolveParentDossierId(
                { currentFile, delegationParentFileId, activeSubFileId },
                String(executionId ?? file?.id ?? ''),
            ),
        [currentFile, delegationParentFileId, activeSubFileId, executionId, file?.id],
    );
    const currentFileId = parentDossierId || executionId || file?.id || '';
    const isInabaActive = isInabaSubFileId(activeSubFileId);
    const preferStoreExecutionView = Boolean(activeSubFileId) || isInabaSubFileId(currentFile?.id);
    const inabaTargets = useMemo(() => {
        return allSubFiles
            .filter((f) => isInabaSubFileId(f.id) && String(f.parentFileId || '') === String(parentDossierId))
            .map((f) => ({
                id: f.id,
                directorate: String((f as any).delegationTargetDirectorate || f.directorate || '').trim() || '---',
            }))
            .filter((x) => x.id);
    }, [allSubFiles, parentDossierId]);

    const urlDelegationParentId =
        typeof window !== 'undefined'
            ? (() => {
                  try {
                      return new URLSearchParams(window.location.search).get('delegationParentId');
                  } catch {
                      return null;
                  }
              })()
            : null;

    const subFiles = useMemo(
        () => allSubFiles.filter((f) => String(f.parentFileId || '') === String(parentDossierId)),
        [allSubFiles, parentDossierId],
    );
    const hasInabaForThisDossier = allSubFiles.some(
        (f) => isInabaSubFileId(f.id) && String(f.parentFileId || '') === String(parentDossierId),
    );

    useExecutionDashboardUrlDelegationSync(
        urlDelegationParentId,
        delegationParentFileId,
        setDelegationParentFileId,
    );

    const { activeTabId, setActiveTabId } = useExecutionDossierTabOrchestrator(String(currentFileId || ''));

    const baseExecutionData = useExecutionData(
        currentFile,
        file,
        executionId,
        executionStorageTick,
        preferStoreExecutionView,
    );

    const isHistoricalMode = false;

    const isUnifiedTabActive = useMemo(() => {
        if (activeSubFileId) return false;
        const tabId = String(activeTabId || '').trim();
        const baseId = String(currentFileId || '').trim();
        return Boolean(tabId && baseId && tabId !== baseId);
    }, [activeTabId, currentFileId, activeSubFileId]);

    const unifiedTabId = useMemo(() => {
        if (!isUnifiedTabActive) return '';
        return String(activeTabId || '').trim();
    }, [isUnifiedTabActive, activeTabId]);

    const unifiedTabFileRow = useMemo(() => {
        if (!unifiedTabId) return null;
        try {
            const allFiles = loadExecutionFilesRaw();
            const row = allFiles.find((f: unknown) => f && String((f as { id?: unknown }).id) === unifiedTabId);
            return row ? normalizeExecutionFileRecord(row) : null;
        } catch {
            return null;
        }
    }, [unifiedTabId, executionStorageTick]);

    const unifiedTabExecutionData = useExecutionData(
        null,
        unifiedTabFileRow,
        unifiedTabId || undefined,
        executionStorageTick,
    );

    const executionData = isUnifiedTabActive ? unifiedTabExecutionData : baseExecutionData;

    const parentExecutionFile = useMemo((): ExecutionFile | null => {
        if (!isInabaActive) return null;
        const pid = String(parentDossierId || '').trim();
        if (!pid) return null;
        try {
            const cached = storageCache.get(executionStorageKey(pid));
            if (cached && typeof cached === 'object') return cached as ExecutionFile;
        } catch {
            /* ignore */
        }
        return null;
    }, [isInabaActive, parentDossierId, executionStorageTick]);

    const inabaCorrespondenceLog = useMemo(() => {
        const source =
            isInabaActive && parentExecutionFile
                ? parentExecutionFile
                : !isInabaActive && activeSubFileId === null
                  ? (executionData as ExecutionFile | null)
                  : null;
        return getInabaCorrespondenceLog(source);
    }, [isInabaActive, parentExecutionFile, activeSubFileId, executionData, executionStorageTick]);

    const viewExecutionData = executionData;

    const executionDataRef = useRef<ExecutionFile | null>(null);
    executionDataRef.current = executionData ?? null;

    const partyBadgesExecutionId = String(executionData?.id ?? executionId ?? file?.id ?? 'unknown');

    const decisionsStorageExecutionId = useMemo(() => {
        const parent = String(parentDossierId || executionId || file?.id || '').trim();
        if (parent && parent !== 'default' && parent !== 'undefined') return parent;
        return String(executionData?.id ?? 'default');
    }, [parentDossierId, executionId, file?.id, executionData?.id]);
    const executionAppealBanner = useExecutionAppealBannerState(
        decisionsStorageExecutionId !== 'default' ? decisionsStorageExecutionId : undefined,
    );

    useExecutionDashboardDecisionsStorageMigration({
        isHistoricalMode,
        decisionsStorageExecutionId,
        executionId,
        fileId: file?.id,
        activeSubFileId,
        activeTabId,
        currentFileId: String(currentFileId || ''),
    });

    useExecutionDashboardDecisionsNamespaceReconcile({
        isHistoricalMode,
        decisionsStorageExecutionId,
        executionDataRef,
        executionData,
    });

    const dossierFileKey = String(executionData?.id ?? executionId ?? file?.id ?? '');
    const executionFileKey = String(file?.id ?? executionId ?? '');
    const reconcileDossierLifecycle = useExecutionDashboardStore((s) => s.reconcileDossierLifecycle);
    const dossierLifecycleRow = useExecutionDashboardStore((s) => {
        const k = dossierFileKey;
        if (!k || k === 'undefined') return undefined;
        return s.dossierLifecycleByFileId[k];
    });

    useExecutionDashboardDossierLifecycleReconcile({
        dossierFileKey,
        executionData,
        reconcileDossierLifecycle,
    });

    const [debtorSummonsMarkerLocal, setDebtorSummonsMarkerLocal] = useState<
        ExecutionFile['debtor_summons_marker'] | null
    >(() => (executionData ? (executionData.debtor_summons_marker ?? null) : null));

    const fileForStoreSync = useStableExecutionFileForStore(
        isUnifiedTabActive ? unifiedTabFileRow : (file as ExecutionFile | null | undefined),
    );

    useExecutionDashboardStoreFileSync({
        fileForStoreSync,
        isUnifiedTabActive,
        activeSubFileId,
    });

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadError, setLoadError] = useState<string | null>(
        executionData ? null : 'لم يتم العثور على بيانات التنفيذ',
    );

    const debtorsSectionRef = useRef<DebtorsSectionHandle>(null);

    useExecutionDashboardShellPrefetch();
    const {
        showExtraCreditors,
        setShowExtraCreditors,
        showExtraDebtors,
        setShowExtraDebtors,
    } = useExecutionPartiesOrchestrator(executionFileKey);

    const executionDashboardFileId = executionData?.id ?? null;
    const {
        modals,
        setExecutionModal,
        activeBottomTab,
        isHeaderExpanded,
        toggleHeaderExpanded,
    } = useExecutionDashboardModalControls(executionDashboardFileId);

    const showNotesModal = modals.showNotesModal;
    const setShowNotesModal = (show: boolean) => setExecutionModal('showNotesModal', show);
    const showAppointmentModal = modals.showAppointmentModal;
    const setShowAppointmentModal = (show: boolean) => setExecutionModal('showAppointmentModal', show);
    const showDocumentsModal = modals.showDocumentsModal;
    const setShowDocumentsModal = (show: boolean) => setExecutionModal('showDocumentsModal', show);
    const showDecisionsModal = modals.showDecisionsModal;
    const setShowDecisionsModal = (show: boolean) => setExecutionModal('showDecisionsModal', show);
    const showSeizedAssetsModal = modals.showSeizedAssetsModal;
    const setShowSeizedAssetsModal = (show: boolean) => setExecutionModal('showSeizedAssetsModal', show);
    const showTimelineModal = modals.showTimelineModal;
    const setShowTimelineModal = (show: boolean) => setExecutionModal('showTimelineModal', show);
    const showPaymentModal = modals.showPaymentModal;
    const setShowPaymentModal = (show: boolean) => setExecutionModal('showPaymentModal', show);
    const showNotificationModal = modals.showNotificationModal;
    const setShowNotificationModal = (show: boolean) => setExecutionModal('showNotificationModal', show);
    const showCoerciveModal = modals.showCoerciveModal;
    const setShowCoerciveModal = (show: boolean) => setExecutionModal('showCoerciveModal', show);
    const showPaymentCalculator = modals.showPaymentCalculator;
    const setShowPaymentCalculator = (show: boolean) => setExecutionModal('showPaymentCalculator', show);
    const showSettlementCalculator = modals.showSettlementCalculator;
    const setShowSettlementCalculator = (show: boolean) => setExecutionModal('showSettlementCalculator', show);
    const showPauseModal = modals.showPauseModal;
    const setShowPauseModal = (show: boolean) => setExecutionModal('showPauseModal', show);

    const [showLinkedDossierTimeline, setShowLinkedDossierTimeline] = useState(false);
    const [linkedDossierToView, setLinkedDossierToView] = useState<
        NonNullable<ExecutionFile['linkedDossiers']>[number] | null
    >(null);
    const [showTransferFileNumberChangeModal, setShowTransferFileNumberChangeModal] = useState(false);

    const rootFileId = String(currentFileId || '').trim();
    const unificationTick = useExecutionDashboardStore((s) => s.unificationTick);
    const childDossiers = useMemo(() => {
        if (!rootFileId) return [];
        try {
            const store = useExecutionDashboardStore.getState();
            return store.getChildDossiers(rootFileId);
        } catch {
            return [];
        }
    }, [rootFileId, currentFile?.updatedAt, unificationTick]);
    const hasChildDossiers = childDossiers.length > 0;

    return {
        executionStorageTick,
        setExecutionStorageTick,
        currentFile,
        activeSubFileId,
        allSubFiles,
        setActiveSubFileId,
        delegationParentFileId,
        setDelegationParentFileId,
        parentDossierId,
        currentFileId,
        isInabaActive,
        preferStoreExecutionView,
        inabaTargets,
        urlDelegationParentId,
        subFiles,
        hasInabaForThisDossier,
        activeTabId,
        setActiveTabId,
        baseExecutionData,
        isHistoricalMode,
        isUnifiedTabActive,
        unifiedTabId,
        unifiedTabFileRow,
        unifiedTabExecutionData,
        executionData,
        parentExecutionFile,
        inabaCorrespondenceLog,
        viewExecutionData,
        executionDataRef,
        partyBadgesExecutionId,
        decisionsStorageExecutionId,
        executionAppealBanner,
        dossierFileKey,
        executionFileKey,
        reconcileDossierLifecycle,
        dossierLifecycleRow,
        debtorSummonsMarkerLocal,
        setDebtorSummonsMarkerLocal,
        fileForStoreSync,
        isLoading,
        setIsLoading,
        loadError,
        setLoadError,
        debtorsSectionRef,
        showExtraCreditors,
        setShowExtraCreditors,
        showExtraDebtors,
        setShowExtraDebtors,
        executionDashboardFileId,
        modals,
        setExecutionModal,
        activeBottomTab,
        isHeaderExpanded,
        toggleHeaderExpanded,
        showNotesModal,
        setShowNotesModal,
        showAppointmentModal,
        setShowAppointmentModal,
        showDocumentsModal,
        setShowDocumentsModal,
        showDecisionsModal,
        setShowDecisionsModal,
        showSeizedAssetsModal,
        setShowSeizedAssetsModal,
        showTimelineModal,
        setShowTimelineModal,
        showPaymentModal,
        setShowPaymentModal,
        showNotificationModal,
        setShowNotificationModal,
        showCoerciveModal,
        setShowCoerciveModal,
        showPaymentCalculator,
        setShowPaymentCalculator,
        showSettlementCalculator,
        setShowSettlementCalculator,
        showPauseModal,
        setShowPauseModal,
        showLinkedDossierTimeline,
        setShowLinkedDossierTimeline,
        linkedDossierToView,
        setLinkedDossierToView,
        showTransferFileNumberChangeModal,
        setShowTransferFileNumberChangeModal,
        rootFileId,
        unificationTick,
        childDossiers,
        hasChildDossiers,
    };
}
