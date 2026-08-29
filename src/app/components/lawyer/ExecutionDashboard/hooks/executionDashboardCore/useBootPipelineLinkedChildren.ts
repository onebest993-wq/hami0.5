import { useMemo, useState } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { useExecutionDashboardStore } from '@/app/stores';

export function useBootPipelineLinkedChildren(currentFileId: string, currentFile: ExecutionFile | null | undefined) {
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
