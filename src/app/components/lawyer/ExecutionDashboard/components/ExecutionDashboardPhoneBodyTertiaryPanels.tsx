import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionDashboardPhoneBodyDeferredScope } from './ExecutionDashboardPhoneBodyDeferredScope';
import { ExecutionDashboardPhoneBodyTertiaryPanelsReady } from './ExecutionDashboardPhoneBodyTertiaryPanelsReady';

export type { ExecutionDashboardPhoneBodyTertiaryPanelsProps } from './ExecutionDashboardPhoneBodyTertiaryPanelsReady';
import type { ExecutionDashboardPhoneBodyTertiaryPanelsProps } from './ExecutionDashboardPhoneBodyTertiaryPanelsReady';

export function ExecutionDashboardPhoneBodyTertiaryPanels(
    props: ExecutionDashboardPhoneBodyTertiaryPanelsProps,
) {
    return <ExecutionDashboardPhoneBodyTertiaryPanelsReady {...props} />;
}

export type TertiaryPanelsCtx = {
    scope: ExecutionDashboardPhoneBodyDeferredScope;
    setShowUnifiedExecutionModal?: Dispatch<SetStateAction<boolean>>;
};
