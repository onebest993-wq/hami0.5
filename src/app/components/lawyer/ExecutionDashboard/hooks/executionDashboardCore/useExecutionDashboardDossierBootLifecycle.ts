/** boot URL، قرارات، lifecycle، store sync — موجة 13 */
import { useEffect } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import SecureStoreService from '@/app/services/SecureStoreService';
import { mergeExecutorDecisionsInto } from '@/app/utils/executorSeizureDecisionQueue';
import { ensureDecisionsNamespaceMigrated } from '@/app/utils/executionDecisionsNamespace';
import { reconcileDomainViolatingDecisions } from '@/app/utils/executionDomainReconcile';
import { isInabaSubFileId, useExecutionDashboardStore } from '@/app/stores';
import { executionFileContentSignature } from '../useExecutionData';
import { buildLegacyDecisionMigrationSources } from './executionDashboardDossierBootSync';
import { prefetchExecutionDashboardShell } from '../../executionDashboardLazyRegistryShell';

export function useExecutionDashboardUrlDelegationSync(
    urlDelegationParentId: string | undefined,
    delegationParentFileId: string | null | undefined,
    setDelegationParentFileId: (id: string) => void,
) {
    useEffect(() => {
        if (urlDelegationParentId && !delegationParentFileId) {
            setDelegationParentFileId(urlDelegationParentId);
        }
    }, [urlDelegationParentId, delegationParentFileId, setDelegationParentFileId]);
}

export function useExecutionDashboardDecisionsStorageMigration({
    isHistoricalMode,
    decisionsStorageExecutionId,
    executionId,
    fileId,
    activeSubFileId,
    activeTabId,
    currentFileId,
}: {
    isHistoricalMode: boolean;
    decisionsStorageExecutionId: string;
    executionId?: string;
    fileId?: string;
    activeSubFileId: string | null | undefined;
    activeTabId: string;
    currentFileId: string;
}) {
    useEffect(() => {
        if (isHistoricalMode) return;
        const target = String(decisionsStorageExecutionId || '').trim();
        if (!target || target === 'default' || target === 'undefined') return;

        const sources = buildLegacyDecisionMigrationSources({
            decisionsStorageExecutionId: target,
            executionId,
            fileId,
            activeSubFileId,
            activeTabId,
            currentFileId,
        });
        if (sources.length === 0) return;

        const markerKey = `decisions-migration:${target}`;
        const markerVal = [...new Set(sources)].sort().join('|');
        try {
            const prev = String(SecureStoreService.getItemSync(markerKey) || '');
            if (prev === markerVal) return;
            mergeExecutorDecisionsInto({
                targetExecutionId: target,
                sourceExecutionIds: sources,
            });
            SecureStoreService.setItemSync(markerKey, markerVal);
        } catch {
            /* ignore */
        }
    }, [
        activeSubFileId,
        activeTabId,
        currentFileId,
        decisionsStorageExecutionId,
        executionId,
        fileId,
        isHistoricalMode,
    ]);
}

export function useExecutionDashboardDecisionsNamespaceReconcile({
    isHistoricalMode,
    decisionsStorageExecutionId,
    executionDataRef,
    executionData,
}: {
    isHistoricalMode: boolean;
    decisionsStorageExecutionId: string;
    executionDataRef: React.MutableRefObject<ExecutionFile | null>;
    executionData: ExecutionFile | null | undefined;
}) {
    useEffect(() => {
        if (isHistoricalMode) return;
        const target = String(decisionsStorageExecutionId || '').trim();
        if (!target || target === 'default' || target === 'undefined') return;
        const dataRef = executionDataRef.current as Record<string, unknown> | null | undefined;
        ensureDecisionsNamespaceMigrated(target, dataRef);
        reconcileDomainViolatingDecisions(target, dataRef);
    }, [
        decisionsStorageExecutionId,
        executionData?.claimType,
        executionData?.claimTypes,
        executionData?.representedParty,
        executionData?.debtors,
        executionData?.docType,
        executionData?.classification,
        isHistoricalMode,
        executionDataRef,
    ]);
}

export function useExecutionDashboardDossierLifecycleReconcile({
    dossierFileKey,
    executionData,
    reconcileDossierLifecycle,
}: {
    dossierFileKey: string;
    executionData: ExecutionFile | null | undefined;
    reconcileDossierLifecycle: (fileKey: string, data?: ExecutionFile) => void;
}) {
    useEffect(() => {
        if (!dossierFileKey || dossierFileKey === 'undefined') return;
        reconcileDossierLifecycle(dossierFileKey, executionData ?? undefined);
    }, [
        dossierFileKey,
        reconcileDossierLifecycle,
        executionData?.dossier_lifecycle_status,
        executionData?.dossier_last_action_date,
        executionData?.lastActionDate,
        executionData?.dossier_status_reason,
        executionData?.dossier_status_date,
    ]);
}

export function useExecutionDashboardStoreFileSync({
    fileForStoreSync,
    isUnifiedTabActive,
    activeSubFileId,
}: {
    fileForStoreSync: ExecutionFile | null | undefined;
    isUnifiedTabActive: boolean;
    activeSubFileId: string | null | undefined;
}) {
    useEffect(() => {
        if (!fileForStoreSync) return;
        const store = useExecutionDashboardStore.getState();
        if (store.activeSubFileId || isInabaSubFileId(store.currentFile?.id)) return;
        if (isUnifiedTabActive) return;
        const prevSig = executionFileContentSignature(store.currentFile);
        const nextSig = executionFileContentSignature(fileForStoreSync);
        if (prevSig === nextSig) return;
        const prevTs = Date.parse(String(store.currentFile?.updatedAt || ''));
        const nextTs = Date.parse(String(fileForStoreSync.updatedAt || ''));
        if (Number.isFinite(prevTs) && Number.isFinite(nextTs) && prevTs > nextTs) return;
        store.setCurrentFile(fileForStoreSync);
    }, [fileForStoreSync, isUnifiedTabActive, activeSubFileId]);
}

export function useExecutionDashboardShellPrefetch() {
    useEffect(() => {
        prefetchExecutionDashboardShell();
    }, []);
}

/** يُحمّل بلوب الإضبارة إلى ذاكرة القراءة المتزامنة؛ يرحّل ciphertext قديماً إن وُجد */
export function useExecutionDashboardDossierBlobWarm(executionId: string | undefined) {
    useEffect(() => {
        const id = String(executionId ?? '').trim();
        if (!id || id === 'default' || id === 'undefined') return;
        void import('@/app/utils/executionDossierBlobPersistence')
            .then((m) => m.ensureExecutionDossierBlobReady(id))
            .catch(() => undefined);
    }, [executionId]);
}
