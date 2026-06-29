import { describe, expect, it } from 'vitest';
import {
    appendImplicitForcedBringBroughtPatch,
    buildPersonalCoerciveStaleExecutionPatch,
    isArrestWarrantEnforceable,
    isExecutiveDetentionPathEnforceable,
    isInvestigationCoerciveLaneSettled,
    isTravelBanEnforceable,
    isTravelBanLaneSettled,
    isTravelBanRequestCycleWithdrawn,
    isTravelBanRequestWithdrawn,
    resolveExecutiveDetentionJudgeUiOutcome,
    resolveForcedBringNeedsOutcomeUi,
    resolvePrimaryDebtorCoerciveStack,
    shouldShowInvestigationCourtBlock,
} from '@/app/components/lawyer/execution/coerciveStackUtils';

describe('isTravelBanRequestWithdrawn', () => {
    it('returns false when only personal_coercive_cycle_closed_at is set', () => {
        expect(
            isTravelBanRequestWithdrawn({
                personal_coercive_cycle_closed_at: '2026-01-01T00:00:00.000Z',
            } as { travel_ban_withdrawn_at?: string | null })
        ).toBe(false);
    });

    it('returns true only for explicit travel_ban_withdrawn_at', () => {
        expect(isTravelBanRequestWithdrawn({ travel_ban_withdrawn_at: '2026-01-02' })).toBe(true);
        expect(isTravelBanRequestWithdrawn({ travel_ban_withdrawn_at: null })).toBe(false);
    });
});

describe('badge enforceability', () => {
    it('does not treat pending arrest investigation as enforceable warrant', () => {
        expect(
            isArrestWarrantEnforceable({
                personal_arrest_warrant_stage: 'pending_court',
                investigationCourtRequested: true,
            } as Parameters<typeof isArrestWarrantEnforceable>[0])
        ).toBe(false);
    });

    it('treats issued warrant as enforceable', () => {
        expect(
            isArrestWarrantEnforceable({
                debtor_wanted_arrest_warrant: true,
                personal_arrest_warrant_stage: 'issued',
            })
        ).toBe(true);
    });

    it('does not show travel ban badge before debtor_travel_ban_active', () => {
        expect(isTravelBanEnforceable({ debtor_travel_ban_active: false })).toBe(false);
        expect(isTravelBanEnforceable({ debtor_travel_ban_active: true })).toBe(false);
    });

    it('shows travel ban badge only when governing row is enforced', () => {
        const row = {
            id: 'tb1',
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'travel_ban',
            executorOutcome: 'approved',
        };
        expect(
            isTravelBanEnforceable(
                { debtor_travel_ban_active: true },
                { travelDecisionRow: row, allDecisions: [row] }
            )
        ).toBe(true);
    });

    it('does not treat dossier handoff alone as enforceable detention badge', () => {
        expect(
            isExecutiveDetentionPathEnforceable(
                { executive_dossier_phase: 'handed_to_judge' },
                false
            )
        ).toBe(false);
    });

    it('shows detention badge path only after judge approval or active period', () => {
        expect(
            isExecutiveDetentionPathEnforceable(
                { executive_dossier_phase: 'judge_decided' },
                false,
                'approved'
            )
        ).toBe(true);
        expect(
            isExecutiveDetentionPathEnforceable(
                {
                    debtor_executive_detention_active: true,
                    executive_detention_until: '2099-12-31',
                },
                false
            )
        ).toBe(true);
        expect(
            isExecutiveDetentionPathEnforceable(
                { executive_dossier_phase: 'judge_decided' },
                false,
                'rejected'
            )
        ).toBe(false);
    });

    it('hides arrest warrant party badge while request is only pending', () => {
        const stack = resolvePrimaryDebtorCoerciveStack({
            executionData: {
                personal_arrest_warrant_stage: 'none',
                investigationCourtRequested: true,
            },
            decisionsExecutionId: 'ex-1',
            personalCoerciveDecisionBadges: true,
        });
        expect(stack.showArrestWarrantBadge).toBe(false);
    });
});

describe('resolveForcedBringNeedsOutcomeUi', () => {
    it('shows outcome UI after executor approval without recorded outcome', () => {
        expect(
            resolveForcedBringNeedsOutcomeUi({
                forcedApproved: true,
                forcedPending: false,
                outcome: null,
            })
        ).toBe(true);
    });

    it('hides outcome UI while pending or after brought/absconded', () => {
        expect(
            resolveForcedBringNeedsOutcomeUi({
                forcedApproved: true,
                forcedPending: true,
                outcome: null,
            })
        ).toBe(false);
        expect(
            resolveForcedBringNeedsOutcomeUi({
                forcedApproved: true,
                forcedPending: false,
                outcome: 'brought',
            })
        ).toBe(false);
        expect(
            resolveForcedBringNeedsOutcomeUi({
                forcedApproved: true,
                forcedPending: false,
                outcome: 'absconded',
            })
        ).toBe(false);
    });

    it('still shows outcome UI when investigation lane was settled earlier', () => {
        expect(
            resolveForcedBringNeedsOutcomeUi({
                forcedApproved: true,
                forcedPending: false,
                outcome: null,
            })
        ).toBe(true);
    });

    it('hides outcome UI while appeal or grievance blocks fieldwork', () => {
        expect(
            resolveForcedBringNeedsOutcomeUi({
                forcedApproved: true,
                forcedPending: false,
                outcome: null,
                appealBlocksFieldwork: true,
            })
        ).toBe(false);
    });

    it('hides outcome UI when request is not effectively enforced', () => {
        expect(
            resolveForcedBringNeedsOutcomeUi({
                forcedApproved: true,
                forcedPending: false,
                outcome: null,
                requestEffectivelyEnforced: false,
            })
        ).toBe(false);
    });
});

describe('resolveExecutiveDetentionJudgeUiOutcome', () => {
    it('treats cassation overturn of judge rejection as approved', () => {
        expect(
            resolveExecutiveDetentionJudgeUiOutcome({
                storedOutcome: 'rejected',
                judgeRow: {
                    executorOutcome: 'rejected',
                    appealResult: 'نقض القرار',
                    appealStatus: 'final',
                },
            })
        ).toBe('approved');
        expect(
            resolveExecutiveDetentionJudgeUiOutcome({
                storedOutcome: 'rejected',
                judgeRow: {
                    executorOutcome: 'approved',
                    appealResult: 'نقض القرار',
                    appealStatus: 'final',
                },
            })
        ).toBe('approved');
    });

    it('keeps stored rejection when appeal did not overturn', () => {
        expect(
            resolveExecutiveDetentionJudgeUiOutcome({
                storedOutcome: 'rejected',
                judgeRow: {
                    executorOutcome: 'rejected',
                    appealResult: 'تصديق القرار',
                    appealStatus: 'final',
                },
            })
        ).toBe('rejected');
    });
});

describe('isTravelBanLaneSettled', () => {
    it('returns true after explicit withdrawal', () => {
        expect(
            isTravelBanLaneSettled(
                { travel_ban_withdrawn_at: '2026-06-04', debtor_travel_ban_active: false },
                { travelCycleActive: false }
            )
        ).toBe(true);
    });

    it('returns true when decision cycle closed and ban inactive', () => {
        expect(
            isTravelBanLaneSettled(
                { debtor_travel_ban_active: false },
                { travelCycleActive: false }
            )
        ).toBe(true);
    });

    it('returns false while ban is enforced with active cycle', () => {
        expect(
            isTravelBanLaneSettled(
                { debtor_travel_ban_active: true },
                { travelCycleActive: true }
            )
        ).toBe(false);
    });

    it('returns true when decision cycle closed even if ban flag remains', () => {
        expect(
            isTravelBanLaneSettled(
                { debtor_travel_ban_active: true },
                { travelCycleActive: false }
            )
        ).toBe(true);
    });
});

describe('isTravelBanRequestCycleWithdrawn', () => {
    it('detects procedural withdraw while ban may remain active', () => {
        expect(
            isTravelBanRequestCycleWithdrawn({
                travel_ban_request_cycle_withdrawn_at: '2026-06-04T12:00:00.000Z',
                debtor_travel_ban_active: true,
            })
        ).toBe(true);
    });
});

describe('shouldShowInvestigationCourtBlock', () => {
    it('hides investigation block before absconded outcome is recorded', () => {
        expect(
            shouldShowInvestigationCourtBlock(
                { forced_bring_in_personal_outcome: null, investigationCourtRequested: true },
                { pending: true, approved: false, alternative: false }
            )
        ).toBe(false);
        expect(
            shouldShowInvestigationCourtBlock(
                { forced_bring_in_personal_outcome: 'brought' },
                { pending: false, approved: false, alternative: false }
            )
        ).toBe(false);
    });

    it('shows investigation block after absconded outcome', () => {
        expect(
            shouldShowInvestigationCourtBlock(
                { forced_bring_in_personal_outcome: 'absconded' },
                { pending: false, approved: false, alternative: false }
            )
        ).toBe(true);
    });

    it('hides investigation block when lane is settled', () => {
        expect(
            shouldShowInvestigationCourtBlock(
                {
                    forced_bring_in_personal_outcome: 'absconded',
                    investigationPathDebtorPresent: true,
                },
                { pending: false, approved: false, alternative: false }
            )
        ).toBe(false);
    });
});

describe('isInvestigationCoerciveLaneSettled', () => {
    it('returns true when investigation path debtor present', () => {
        expect(isInvestigationCoerciveLaneSettled({ investigationPathDebtorPresent: true })).toBe(
            true
        );
    });

    it('returns true when warrant custody secured', () => {
        expect(
            isInvestigationCoerciveLaneSettled({ debtor_arrest_warrant_cleared_after_custody: true })
        ).toBe(true);
    });

    it('returns false for open investigation lane', () => {
        expect(isInvestigationCoerciveLaneSettled({ investigationPathDebtorPresent: false })).toBe(
            false
        );
    });
});

describe('appendImplicitForcedBringBroughtPatch', () => {
    it('resolves pending forced bring when detention path implies custody', () => {
        const patch = appendImplicitForcedBringBroughtPatch({}, {}, true);
        expect(patch.forced_bring_in_personal_outcome).toBe('brought');
        expect(patch.activeNoticeState).toBeNull();
    });

    it('skips when cycle already resolved', () => {
        const patch = appendImplicitForcedBringBroughtPatch(
            { foo: 1 },
            { forced_bring_in_personal_outcome: 'brought' },
            true
        );
        expect(patch).toEqual({ foo: 1 });
    });
});

describe('buildPersonalCoerciveStaleExecutionPatch', () => {
    it('clears orphan dossier phase when eligible decision row is missing', () => {
        const patch = buildPersonalCoerciveStaleExecutionPatch({
            executionId: 'exec-no-dossier-row',
            executionData: {
                executive_dossier_phase: 'handed_to_judge',
                executive_detention_judge_eligible_decision_id: 'personal_coercive_dossier_1',
            },
        });
        expect(patch?.executive_dossier_phase).toBeNull();
        expect(patch?.executive_detention_judge_eligible_decision_id).toBeNull();
    });
});
