import { useEffect, useRef } from 'react';
import { useLawyerDashboardWorkspaceHeavy } from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspaceHeavy';
import type { LawyerDashboardWorkspaceProviderParams } from '@/app/hooks/lawyerDashboard/LawyerDashboardWorkspaceProvider';
import type { LawyerDashboardWorkspaceStem } from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspaceStem';

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
            prev.caseLinkNav === heavy.caseLinkNav
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
        onHeavyChange,
    ]);

    return null;
}
