import { describe, it } from 'vitest';
import { FOLLOWUP_SCENARIO_CATALOG } from '../followupScenarioDefinitions';
import { resolveFollowupHiddenActions } from '../resolveFollowupHiddenActions';

describe('print baseline', () => {
    it('prints hidden baseline json', () => {
        const baseline: Record<string, unknown> = {};
        for (const s of FOLLOWUP_SCENARIO_CATALOG) {
            const h = resolveFollowupHiddenActions(s.input);
            baseline[s.id] = {
                hiddenToggleVisible: h.hiddenToggleVisible,
                hiddenPersonalCoerciveKeys: h.hiddenPersonalCoerciveKeys,
                hiddenGuarantorKeys: h.hiddenGuarantorKeys,
                breakInventoryVisible: h.breakInventoryVisible,
                hasAnyHiddenContent: h.hasAnyHiddenContent,
            };
        }
        console.log(JSON.stringify(baseline, null, 2));
    });
});
