/** Flat return-object assembly for useExecutionDashboardPhoneBodyScope — no nested shape. */
import type { SeizedMovable } from '@/app/types/execution';
import type { SaveSeizedMovableInitInput } from './executionDashboardCore/executionDashboardFollowupSeizureInits';
import type { useExecutionDashboardPhoneBodyScopeRead } from './useExecutionDashboardPhoneBodyScopeRead';
import type { useExecutionDashboardPhoneBodyLocalState } from './useExecutionDashboardPhoneBodyLocalState';
import type { useExecutionDashboardPhoneBodySafeHandlers } from './useExecutionDashboardPhoneBodySafeHandlers';
import { assemblePhoneBodyScopeHead } from './assemblePhoneBodyScopeHead';
import { assemblePhoneBodyScopeTail } from './assemblePhoneBodyScopeTail';

type PhoneBodyScopeRead = ReturnType<typeof useExecutionDashboardPhoneBodyScopeRead>;
type PhoneBodyLocalState = ReturnType<typeof useExecutionDashboardPhoneBodyLocalState>;
type PhoneBodySafeHandlers = ReturnType<typeof useExecutionDashboardPhoneBodySafeHandlers>;

export type AssembleExecutionDashboardPhoneBodyScopeInput = {
    scope: PhoneBodyScopeRead;
    local: PhoneBodyLocalState;
    handlers: PhoneBodySafeHandlers;
    removeJudicialCustodianEntry: unknown;
    propertyInlineSaveCtx: unknown;
    movableInlineSaveCtx: unknown;
    saveSeizedMovableInitForDecision: (
        input: SaveSeizedMovableInitInput,
    ) => SeizedMovable | null | void;
    secondaryStageReady: boolean;
    tertiaryStageReady: boolean;
    quaternaryStageReady: boolean;
    liveExecutionData: PhoneBodyScopeRead['executionData'];
};

/** Identical flat keys as the prior inline return in useExecutionDashboardPhoneBodyScope. */
export function assembleExecutionDashboardPhoneBodyScope(
    input: AssembleExecutionDashboardPhoneBodyScopeInput,
) {
    return {
        ...assemblePhoneBodyScopeHead(input),
        ...assemblePhoneBodyScopeTail(input),
    };
}
