import { useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { SeizedAsset } from '@/app/types/execution';
import { isMovablePropertySeizureRow } from '../../helpers/seizureUtils';
import { useSeizureRegistryAssets } from '../useSeizureRegistryAssets';
import { useExecutionDashboardSalarySeizureTabRows } from './useExecutionDashboardSalarySeizureTabRows';
import { useExecutionDashboardExecutionFileCoerciveRefresh } from './useExecutionDashboardSubDossierTimelineLifecycle';
import { useExecutionSeizureOrchestrator } from '../../orchestrators/useExecutionSeizureOrchestrator';
import type { ExecutionDashboardCoreWorkspacePipelineInput } from './executionDashboardCoreWorkspacePipelineInput';
import type { CoercionBridge } from './timelineAssetsClusterHelpers';

export function useTimelineAssetsSeizureTail(input: {
    p: ExecutionDashboardCoreWorkspacePipelineInput;
    coercionOrchestrator: CoercionBridge;
    setForcedAttendanceIssued: Dispatch<SetStateAction<boolean>>;
    seizedAssets: SeizedAsset[];
    setSeizedAssets: Dispatch<SetStateAction<SeizedAsset[]>>;
    realEstateSeizureAssets: unknown[];
    thirdPartySeizureAssets: unknown[];
    seizureDraftsByDecisionId: Record<string, SeizedAsset>;
    setSeizureDraftsByDecisionId: Dispatch<SetStateAction<Record<string, SeizedAsset>>>;
    setActiveCoerciveActions: Dispatch<SetStateAction<string[]>>;
    setCaseTasksPending: Dispatch<SetStateAction<unknown[]>>;
}) {
    const { p, coercionOrchestrator, setForcedAttendanceIssued } = input;

    const [showCoerciveActionForm, setShowCoerciveActionForm] = useState<string | null>(null);
    const [seizureDetailCompletion, setSeizureDetailCompletion] = useState<{
        decisionRowId: string;
        assetId: string;
        actionType: 'salary' | 'property' | 'vehicle';
    } | null>(null);
    const saveCoerciveActionRef = useRef<(actionType: string, details: Record<string, string>) => void>(
        () => {},
    );
    const focusSeizurePropertyInlineRef = useRef<(decisionId: string, subject?: string) => void>(
        () => {},
    );
    const focusSeizureMovableInlineRef = useRef<(decisionId: string, subject?: string) => void>(
        () => {},
    );
    const focusSeizureThirdPartyInlineRef = useRef<(decisionId: string, subject?: string) => void>(
        () => {},
    );
    const focusSeizureNoticeInlineRef = useRef<(decisionId: string, subject?: string) => void>(
        () => {},
    );

    const seizureOrchestrator = useExecutionSeizureOrchestrator({
        executionData: p.executionData,
        executionId: p.executionId,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        executionDataRef: p.executionDataRef,
        focusSeizurePropertyInlineRef,
        focusSeizureMovableInlineRef,
    });

    const approvedSeizedAssets = useMemo(
        () => input.seizedAssets.filter((asset) => String(asset?.status || '') !== 'pending'),
        [input.seizedAssets],
    );
    const movableSeizureRegistryAssets = useMemo(
        () =>
            input.seizedAssets.filter(
                (asset) => String(asset?.status || '') !== 'pending' && isMovablePropertySeizureRow(asset),
            ),
        [input.seizedAssets],
    );

    const {
        salarySeizureRegistryAssets,
        realEstateSeizureRegistryAssets,
        thirdPartySeizureRegistryAssets,
    } = useSeizureRegistryAssets(
        input.seizedAssets,
        input.realEstateSeizureAssets as never,
        input.thirdPartySeizureAssets as never,
    );

    const salarySeizureTabRows = useExecutionDashboardSalarySeizureTabRows({
        salarySeizureRegistryAssets,
        seizureDraftsByDecisionId: input.seizureDraftsByDecisionId as Record<string, SeizedAsset>,
        executionData: p.executionData,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        executionId: p.executionId,
    });

    useExecutionDashboardExecutionFileCoerciveRefresh({
        executionData: p.executionData,
        setSeizedAssets: input.setSeizedAssets,
        setActiveCoerciveActions: input.setActiveCoerciveActions,
        setSeizureDraftsByDecisionId: input.setSeizureDraftsByDecisionId,
        setForcedAttendanceIssued,
        setActiveNoticeState: coercionOrchestrator.setActiveNoticeState,
        setCaseTasksPending: input.setCaseTasksPending as never,
    });

    return {
        showCoerciveActionForm,
        setShowCoerciveActionForm,
        seizureDetailCompletion,
        setSeizureDetailCompletion,
        saveCoerciveActionRef,
        focusSeizurePropertyInlineRef,
        focusSeizureMovableInlineRef,
        focusSeizureThirdPartyInlineRef,
        focusSeizureNoticeInlineRef,
        seizureOrchestrator,
        approvedSeizedAssets,
        movableSeizureRegistryAssets,
        salarySeizureRegistryAssets,
        realEstateSeizureRegistryAssets,
        thirdPartySeizureRegistryAssets,
        salarySeizureTabRows,
    };
}
