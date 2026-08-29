import { describe, expect, it } from 'vitest';
import { FOLLOWUP_SCENARIO_CATALOG } from './support/followupScenarioDefinitions';
import { FOLLOWUP_SCENARIO_HIDDEN_BASELINE } from './support/followupScenarioHiddenBaseline';
import {
    assertFollowupHiddenInvariants,
    serializeFollowupHiddenSnapshot,
} from './support/followupScenarioHiddenInvariants';
import { resolveFollowupHiddenActions } from './support/resolveFollowupHiddenActions';

describe('followupScenarioHiddenBaseline', () => {
    it('baseline covers every catalog scenario', () => {
        for (const scenario of FOLLOWUP_SCENARIO_CATALOG) {
            expect(FOLLOWUP_SCENARIO_HIDDEN_BASELINE[scenario.id]).toBeDefined();
        }
        expect(Object.keys(FOLLOWUP_SCENARIO_HIDDEN_BASELINE).length).toBe(
            FOLLOWUP_SCENARIO_CATALOG.length,
        );
    });

    for (const scenario of FOLLOWUP_SCENARIO_CATALOG) {
        describe(scenario.id, () => {
            it('matches committed hidden baseline', () => {
                const hidden = resolveFollowupHiddenActions(scenario.input);
                expect(serializeFollowupHiddenSnapshot(hidden)).toEqual(
                    FOLLOWUP_SCENARIO_HIDDEN_BASELINE[scenario.id],
                );
            });

            it('satisfies hidden action invariants', () => {
                const hidden = resolveFollowupHiddenActions(scenario.input);
                assertFollowupHiddenInvariants(hidden, scenario);
            });
        });
    }
});
