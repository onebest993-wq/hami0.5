import React, {
    useEffect,
    useMemo,
    useState,
    type ComponentType,
    type ReactNode,
} from 'react';
import { createLawyerDashboardWorkspaceHeavyStubs } from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceStubs';
import {
    useLawyerDashboardWorkspaceStem,
} from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspaceStem';
import type {
    LawyerDashboardWorkspaceHeavy,
} from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspaceHeavy';
import {
    LawyerDashboardWorkspaceContext,
    type LawyerDashboardWorkspaceProviderParams,
    type LawyerDashboardWorkspaceValue,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceContext';

export type {
    LawyerDashboardWorkspaceProviderParams,
    LawyerDashboardWorkspaceValue,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceContext';
export { useLawyerDashboardWorkspace } from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceContext';

const STUB = createLawyerDashboardWorkspaceHeavyStubs();

type HeavyLayerProps = {
    params: LawyerDashboardWorkspaceProviderParams;
    stem: ReturnType<typeof useLawyerDashboardWorkspaceStem>;
    onHeavyChange: (heavy: LawyerDashboardWorkspaceHeavy) => void;
};

type LawyerDashboardWorkspaceProviderProps = LawyerDashboardWorkspaceProviderParams & {
    enabled: boolean;
    children: ReactNode;
};

/**
 * يوفّر stem فوراً (ملفات الدعاوى + activeFile) ويؤجّل mutations/execution/dossier/notes
 * إلى مقطع ديناميكي بعد interactive — لا يدخل ~١١٠٠ ك.ب في إغلاق orchestration.
 */
export function LawyerDashboardWorkspaceProvider({
    enabled,
    children,
    archiveType,
    setArchiveType,
    localAutoSave,
    backgroundRuntimeEnabled,
    ...heavyParams
}: LawyerDashboardWorkspaceProviderProps) {
    const stem = useLawyerDashboardWorkspaceStem({ localAutoSave, backgroundRuntimeEnabled });
    const [heavySlice, setHeavySlice] = useState<LawyerDashboardWorkspaceHeavy>(STUB);
    const [HeavyLayer, setHeavyLayer] = useState<ComponentType<HeavyLayerProps> | null>(null);

    useEffect(() => {
        if (!enabled) {
            setHeavySlice(STUB);
            setHeavyLayer(null);
            return;
        }
        let cancelled = false;
        void import('@/app/hooks/lawyerDashboard/LawyerDashboardWorkspaceHeavyLayer')
            .then((mod) => {
                if (!cancelled) setHeavyLayer(() => mod.LawyerDashboardWorkspaceHeavyLayer);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [enabled]);

    const value = useMemo((): LawyerDashboardWorkspaceValue => {
        return {
            ...stem,
            ...heavySlice,
            archiveType,
            setArchiveType,
        };
    }, [archiveType, heavySlice, setArchiveType, stem]);

    const providerParams = useMemo(
        (): LawyerDashboardWorkspaceProviderParams => ({
            localAutoSave,
            backgroundRuntimeEnabled,
            archiveType,
            setArchiveType,
            user: heavyParams.user,
            authUserId: heavyParams.authUserId,
            refreshAppAlerts: heavyParams.refreshAppAlerts,
            showLawsuitsWorkspace: heavyParams.showLawsuitsWorkspace,
            criminalBridge: heavyParams.criminalBridge,
            onOpenCriminalDashboard: heavyParams.onOpenCriminalDashboard,
            bumpSearchIndex: heavyParams.bumpSearchIndex,
            selectCase: heavyParams.selectCase,
            closeNotepad: heavyParams.closeNotepad,
        }),
        [
            archiveType,
            backgroundRuntimeEnabled,
            heavyParams.authUserId,
            heavyParams.bumpSearchIndex,
            heavyParams.closeNotepad,
            heavyParams.criminalBridge,
            heavyParams.onOpenCriminalDashboard,
            heavyParams.refreshAppAlerts,
            heavyParams.selectCase,
            heavyParams.showLawsuitsWorkspace,
            heavyParams.user,
            localAutoSave,
            setArchiveType,
        ],
    );

    return (
        <LawyerDashboardWorkspaceContext.Provider value={value}>
            {enabled && HeavyLayer ? (
                <HeavyLayer params={providerParams} stem={stem} onHeavyChange={setHeavySlice} />
            ) : null}
            {children}
        </LawyerDashboardWorkspaceContext.Provider>
    );
}
