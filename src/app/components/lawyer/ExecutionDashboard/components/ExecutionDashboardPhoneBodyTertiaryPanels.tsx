import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { PropertyInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureInlinePersistence';
import type { MovableInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureInlinePersistence';
import type { SaveSeizedMovableInitInput } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardFollowupSeizureInits';
import type { ExecutionDashboardPhoneBodyDeferredScope } from './ExecutionDashboardPhoneBodyDeferredScope';
import type { SeizedMovable } from '@/app/types/execution';
import { ExecutionDashboardPhoneBodyTertiaryPanelsReady } from './ExecutionDashboardPhoneBodyTertiaryPanelsReady';

export type { ExecutionDashboardPhoneBodyTertiaryPanelsProps } from './ExecutionDashboardPhoneBodyTertiaryPanelsReady';
import type { ExecutionDashboardPhoneBodyTertiaryPanelsProps } from './ExecutionDashboardPhoneBodyTertiaryPanelsReady';

export function ExecutionDashboardPhoneBodyTertiaryPanels(
    props: ExecutionDashboardPhoneBodyTertiaryPanelsProps,
) {
    return <ExecutionDashboardPhoneBodyTertiaryPanelsReady {...props} />;
}

export type TertiaryPanelsSaveSeizedMovable = (
    input: SaveSeizedMovableInitInput,
) => SeizedMovable | null | void;
export type TertiaryPanelsCtx = {
    propertyInlineSaveCtx: PropertyInlineSaveContext;
    movableInlineSaveCtx: MovableInlineSaveContext;
    scope: ExecutionDashboardPhoneBodyDeferredScope;
    setShowUnifiedExecutionModal?: Dispatch<SetStateAction<boolean>>;
};
