import type { User } from '@supabase/supabase-js';
import type { Dispatch, SetStateAction } from 'react';
import type { useCriminalDashboardBridge } from '@/app/components/lawyer/criminal-system/criminalDashboardBridge';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';

export type { LawyerDashboardWorkspaceValue } from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceContext';
export { useLawyerDashboardWorkspace } from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceContext';
export { LawyerDashboardWorkspaceProvider } from '@/app/hooks/lawyerDashboard/LawyerDashboardWorkspaceProvider';

type CriminalBridge = ReturnType<typeof useCriminalDashboardBridge>;

/** @deprecated استخدم LawyerDashboardWorkspaceProvider — يُبقى للتوافق مع الأنواع فقط */
export type UseLawyerDashboardWorkspaceParams = {
    localAutoSave: boolean;
    backgroundRuntimeEnabled: boolean;
    user: User | null;
    authUserId: string | undefined;
    refreshAppAlerts: () => void;
    showLawsuitsWorkspace: boolean;
    archiveType: LawyerArchiveOverlay;
    setArchiveType: Dispatch<SetStateAction<LawyerArchiveOverlay>>;
    criminalBridge: CriminalBridge;
    onOpenCriminalDashboard: (caseId: string) => void;
    bumpSearchIndex: () => void;
    selectCase: (caseId: string) => void;
    closeNotepad: () => void;
};
