import { useCallback, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
    prefetchCriminalDashboard,
} from '@/app/utils/lazyComponents';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import {
    readInitialLawyerTab,
    type LawyerDashboardTab,
    type OpenCriminalCaseOptions,
} from './lawyerDashboard/lawyerDashboardNav';

export type UseLawyerDashboardOverlaysParams = {
    setArchiveType: Dispatch<SetStateAction<LawyerArchiveOverlay>>;
};

export function useLawyerDashboardOverlays({
    setArchiveType,
}: UseLawyerDashboardOverlaysParams) {
    const [activeTab, setActiveTab] = useState<LawyerDashboardTab>(readInitialLawyerTab);
    const [showLawsuitsWorkspace, setShowLawsuitsWorkspace] = useState(false);
    const [lawsuitsWorkspaceTab, setLawsuitsWorkspaceTab] = useState<'civil' | 'urgent'>('civil');
    const [lawsuitsDossierSection, setLawsuitsDossierSection] = useState<
        'all' | 'civil' | 'personal' | 'criminal'
    >('all');
    const [urgentFocusCaseId, setUrgentFocusCaseId] = useState<string | undefined>();
    const [criminalDashboardCaseId, setCriminalDashboardCaseId] = useState<string | null>(null);
    const criminalReturnTargetRef = useRef<'lawsuits_workspace' | 'main'>('main');

    const isCriminalDossierOpen = Boolean(criminalDashboardCaseId);

    const openUrgentInLawsuitsWorkspace = useCallback((caseId?: string) => {
        setUrgentFocusCaseId(caseId?.trim() ? caseId.trim() : undefined);
        setLawsuitsWorkspaceTab('urgent');
        setShowLawsuitsWorkspace(true);
        setArchiveType(null);
    }, [setArchiveType]);

    const closeHubShellOverlays = useCallback(() => {
        setArchiveType(null);
        setShowLawsuitsWorkspace(false);
        setUrgentFocusCaseId(undefined);
    }, [setArchiveType]);

    const openCriminalCase = useCallback(
        (caseId: string, options?: OpenCriminalCaseOptions) => {
            const trimmed = String(caseId ?? '').trim();
            if (!trimmed) return;
            prefetchCriminalDashboard();

            if (options?.keepReturnTarget) {
                setCriminalDashboardCaseId(trimmed);
                return;
            }

            if (options?.fromLawsuitsWorkspace) {
                criminalReturnTargetRef.current = 'lawsuits_workspace';
            } else {
                criminalReturnTargetRef.current = 'main';
                setShowLawsuitsWorkspace(false);
                setArchiveType(null);
            }

            setCriminalDashboardCaseId(trimmed);
        },
        [setArchiveType],
    );

    const closeCriminalCase = useCallback(() => {
        const returnTarget = criminalReturnTargetRef.current;
        setCriminalDashboardCaseId(null);
        criminalReturnTargetRef.current = 'main';

        if (returnTarget === 'lawsuits_workspace') {
            setShowLawsuitsWorkspace(true);
        }
    }, []);

    return {
        activeTab,
        setActiveTab,
        showLawsuitsWorkspace,
        setShowLawsuitsWorkspace,
        lawsuitsWorkspaceTab,
        setLawsuitsWorkspaceTab,
        lawsuitsDossierSection,
        setLawsuitsDossierSection,
        urgentFocusCaseId,
        setUrgentFocusCaseId,
        openUrgentInLawsuitsWorkspace,
        criminalDashboardCaseId,
        setCriminalDashboardCaseId,
        isCriminalDossierOpen,
        closeHubShellOverlays,
        openCriminalCase,
        closeCriminalCase,
    };
}
