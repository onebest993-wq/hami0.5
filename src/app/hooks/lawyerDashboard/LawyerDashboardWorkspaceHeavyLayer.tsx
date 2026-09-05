import { useEffect, useRef } from 'react';
import { useLawyerDashboardWorkspaceHeavy } from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspaceHeavy';
import type { LawyerDashboardWorkspaceProviderParams } from '@/app/hooks/lawyerDashboard/LawyerDashboardWorkspaceProvider';
import type { LawyerDashboardWorkspaceStem } from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceStem.types';

type LawyerDashboardWorkspaceHeavyLayerProps = {
    params: LawyerDashboardWorkspaceProviderParams;
    stem: LawyerDashboardWorkspaceStem;
    onHeavyChange: (heavy: ReturnType<typeof useLawyerDashboardWorkspaceHeavy>) => void;
};

/** يُحمَّل ديناميكياً — يحتوي كل hooks workspace الثقيلة. */
export function LawyerDashboardWorkspaceHeavyLayer({
    params,
    stem,
    onHeavyChange,
}: LawyerDashboardWorkspaceHeavyLayerProps) {
    const heavy = useLawyerDashboardWorkspaceHeavy({
        ...params,
        stem,
    });
    const lastSyncRef = useRef<ReturnType<typeof useLawyerDashboardWorkspaceHeavy> | null>(null);

    useEffect(() => {
        const prev = lastSyncRef.current;
        if (
            prev &&
            prev.globalNotes === heavy.globalNotes &&
            prev.executionFiles === heavy.executionFiles &&
            prev.isNewCaseModalOpen === heavy.isNewCaseModalOpen &&
            prev.isExecutionModalOpen === heavy.isExecutionModalOpen &&
            prev.storageHydrated === heavy.storageHydrated &&
            prev.consolidationSpawnNav === heavy.consolidationSpawnNav &&
            prev.caseLinkBrowse === heavy.caseLinkBrowse &&
            prev.caseLinkViewOnly === heavy.caseLinkViewOnly &&
            prev.consolidationNavActive === heavy.consolidationNavActive &&
            prev.caseLinkNav === heavy.caseLinkNav &&
            prev.permanentlyDeleteLawsuits === heavy.permanentlyDeleteLawsuits &&
            prev.moveLawsuitToTrash === heavy.moveLawsuitToTrash &&
            prev.restoreLawsuitFromTrash === heavy.restoreLawsuitFromTrash &&
            prev.archiveLawsuit === heavy.archiveLawsuit &&
            prev.permanentlyDeleteExecutions === heavy.permanentlyDeleteExecutions
        ) {
            return;
        }
        lastSyncRef.current = heavy;
        onHeavyChange(heavy);
    }, [
        heavy,
        heavy.caseLinkNav,
        heavy.consolidationNavActive,
        heavy.executionFiles,
        heavy.globalNotes,
        heavy.caseLinkBrowse,
        heavy.caseLinkViewOnly,
        heavy.consolidationSpawnNav,
        heavy.isExecutionModalOpen,
        heavy.isNewCaseModalOpen,
        heavy.storageHydrated,
        heavy.permanentlyDeleteLawsuits,
        heavy.moveLawsuitToTrash,
        heavy.restoreLawsuitFromTrash,
        heavy.archiveLawsuit,
        heavy.permanentlyDeleteExecutions,
        onHeavyChange,
    ]);

    return null;
}
