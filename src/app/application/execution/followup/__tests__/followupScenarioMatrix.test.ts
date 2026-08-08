import { describe, expect, it } from 'vitest';
import { FOLLOWUP_SCENARIO_CATALOG } from '../followupScenarioDefinitions';
import { resolveFollowupScenario } from '../followupScenarioResolver';

describe('followupScenarioMatrix', () => {
    it('catalog has minimum coverage breadth', () => {
        expect(FOLLOWUP_SCENARIO_CATALOG.length).toBeGreaterThanOrEqual(20);
        const debtors = new Set(FOLLOWUP_SCENARIO_CATALOG.map((s) => s.axes.debtor));
        expect(debtors.has('earner')).toBe(true);
        expect(debtors.has('employee')).toBe(true);
    });

    for (const scenario of FOLLOWUP_SCENARIO_CATALOG) {
        describe(scenario.id, () => {
            it('effective tabs match catalog expectation', () => {
                const result = resolveFollowupScenario(scenario.input);
                expect(result.effectiveTabIds).toEqual(scenario.expectedEffectiveTabIds);
            });

            it('section tab order matches effective tab ids order', () => {
                const result = resolveFollowupScenario(scenario.input);
                if (scenario.modalSectionTabOrderDrift) {
                    expect(result.effectiveSectionTabOrder).not.toEqual(result.effectiveTabIds);
                    return;
                }
                expect(result.effectiveSectionTabOrder).toEqual(result.effectiveTabIds);
            });

            if (scenario.expectedFlags) {
                it('flags match expectation (earner-gated)', () => {
                    const result = resolveFollowupScenario(scenario.input);
                    for (const [key, value] of Object.entries(scenario.expectedFlags)) {
                        expect(result.flagsWithEarnerGate[key as keyof typeof result.flagsWithEarnerGate]).toBe(
                            value,
                        );
                    }
                });
            }

            if (scenario.personalTabLocked !== undefined) {
                it('personal tab lock state', () => {
                    const result = resolveFollowupScenario(scenario.input);
                    expect(result.personalTabLockedForEmployee).toBe(scenario.personalTabLocked);
                });
            }

            if (scenario.knownDebtorPipelineDrift) {
                it('documents known drift: debtor inline pipeline ≠ effective earner path', () => {
                    const result = resolveFollowupScenario(scenario.input);
                    expect(result.debtorPipelineInlineTabIds).not.toEqual(result.effectiveTabIds);
                });
            } else {
                it('debtor inline pipeline matches effective when no earner drift', () => {
                    const result = resolveFollowupScenario(scenario.input);
                    expect(result.debtorPipelineInlineTabIds).toEqual(result.effectiveTabIds);
                });
            }

            it('restricted tabs hide personal/seizure; coercive only when flag allows', () => {
                const result = resolveFollowupScenario(scenario.input);
                if (result.followupTabsRestricted) {
                    expect(result.effectiveTabIds).not.toContain('personal');
                    expect(result.effectiveTabIds).not.toContain('seizure_requests');
                    if (!result.flagsWithEarnerGate.hideFollowupCoerciveTab) {
                        expect(result.effectiveTabIds).toContain('coercive');
                    } else {
                        expect(result.effectiveTabIds).not.toContain('coercive');
                    }
                }
            });
        });
    }

    it('earner overlay unlocks personal tab but keeps coercive tab hidden for financial claim', () => {
        const base = resolveFollowupScenario({
            claimType: 'استحصال دين مالي',
            isEmployee: false,
            financialCenterTotalIqd: 100_000,
        });
        const high = resolveFollowupScenario({
            claimType: 'استحصال دين مالي',
            isEmployee: false,
            financialCenterTotalIqd: 400_000,
        });
        expect(base.flagsWithEarnerGate.hideFollowupCoerciveTab).toBe(true);
        expect(high.flagsWithEarnerGate.hideFollowupCoerciveTab).toBe(true);
        expect(high.flagsWithEarnerGate.hidePersonalCoerciveFollowupTab).toBe(false);
        expect(high.effectiveTabIds).toContain('personal');
        expect(high.effectiveTabIds).not.toContain('coercive');
    });

    it('employee financial claim keeps personal tab hidden even with high financial center', () => {
        const result = resolveFollowupScenario({
            claimType: 'استحصال دين مالي',
            isEmployee: true,
            financialCenterTotalIqd: 500_000,
        });
        expect(result.effectiveTabIds).not.toContain('personal');
        expect(result.flagsWithEarnerGate.hidePersonalCoerciveFollowupTab).toBe(true);
    });
});
