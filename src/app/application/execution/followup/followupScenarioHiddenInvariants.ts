import type { FollowupHiddenActionSnapshot } from './resolveFollowupHiddenActions';
import type { FollowupScenarioDefinition } from './followupScenarioDefinitions';
import { resolveFollowupScenario } from './followupScenarioResolver';

export function assertFollowupHiddenInvariants(
    hidden: FollowupHiddenActionSnapshot,
    scenario: FollowupScenarioDefinition,
): void {
    if (!hidden.hiddenToggleVisible) {
        if (hidden.hasAnyHiddenContent) {
            throw new Error(`${scenario.id}: toggle off but hasAnyHiddenContent true`);
        }
        if (hidden.hiddenPersonalCoerciveKeys.length > 0) {
            throw new Error(`${scenario.id}: toggle off but personal keys non-empty`);
        }
        if (hidden.hiddenGuarantorKeys.length > 0) {
            throw new Error(`${scenario.id}: toggle off but guarantor keys non-empty`);
        }
        if (hidden.breakInventoryVisible) {
            throw new Error(`${scenario.id}: toggle off but breakInventory visible`);
        }
    }

    if (scenario.input.activeDebtorIsDeceased && hidden.hiddenToggleVisible) {
        throw new Error(`${scenario.id}: deceased debtor must hide toggle`);
    }

    if (hidden.breakInventoryVisible && !hidden.hasAnyHiddenContent) {
        throw new Error(`${scenario.id}: break inventory visible without hidden content`);
    }

    const scenarioResult = resolveFollowupScenario(scenario.input);
    if (
        scenarioResult.modalShowPersonalCoerciveFollowupTab &&
        !scenarioResult.personalTabLockedForEmployee &&
        hidden.hiddenToggleVisible
    ) {
        const buriedExceptForcedBring = hidden.hiddenPersonalCoerciveKeys.filter(
            (key) => key !== 'forced_bring_in',
        );
        if (buriedExceptForcedBring.length > 0) {
            throw new Error(
                `${scenario.id}: unlocked personal tab should not list buried coercive keys`,
            );
        }
    }
}

export function serializeFollowupHiddenSnapshot(
    hidden: FollowupHiddenActionSnapshot,
): Pick<
    FollowupHiddenActionSnapshot,
    | 'hiddenToggleVisible'
    | 'hiddenPersonalCoerciveKeys'
    | 'hiddenGuarantorKeys'
    | 'breakInventoryVisible'
    | 'hasAnyHiddenContent'
> {
    return {
        hiddenToggleVisible: hidden.hiddenToggleVisible,
        hiddenPersonalCoerciveKeys: hidden.hiddenPersonalCoerciveKeys,
        hiddenGuarantorKeys: hidden.hiddenGuarantorKeys,
        breakInventoryVisible: hidden.breakInventoryVisible,
        hasAnyHiddenContent: hidden.hasAnyHiddenContent,
    };
}
