import { createContext, useContext } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { createLawyerDashboardWorkspaceHeavyStubs } from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceStubs';
import type { UseLawyerDashboardWorkspaceHeavyParams } from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspaceHeavy';
import type {
    LawyerDashboardWorkspaceStem,
    UseLawyerDashboardWorkspaceStemParams,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceStem.types';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';

export type LawyerDashboardWorkspaceProviderParams = Omit<
    UseLawyerDashboardWorkspaceHeavyParams,
    'stem'
> &
    UseLawyerDashboardWorkspaceStemParams & {
        archiveType: LawyerArchiveOverlay;
        setArchiveType: Dispatch<SetStateAction<LawyerArchiveOverlay>>;
    };

export type LawyerDashboardWorkspaceValue = LawyerDashboardWorkspaceStem &
    ReturnType<typeof createLawyerDashboardWorkspaceHeavyStubs> & {
        archiveType: LawyerArchiveOverlay;
        setArchiveType: Dispatch<SetStateAction<LawyerArchiveOverlay>>;
    };

export const LawyerDashboardWorkspaceContext = createContext<LawyerDashboardWorkspaceValue | null>(
    null,
);

export function useLawyerDashboardWorkspace(): LawyerDashboardWorkspaceValue {
    const value = useContext(LawyerDashboardWorkspaceContext);
    if (!value) {
        throw new Error('useLawyerDashboardWorkspace must be used within LawyerDashboardWorkspaceProvider');
    }
    return value;
}
