import { describe, expect, it } from 'vitest';
import {
    buildForcedBringLifecycleRestartBase,
    buildForcedBringPersonalOutcomePatch,
    buildInvestigationDebtorAttendedPatch,
    buildInvestigationSecuredBringPatch,
    buildInvestigationWarrantIssuedPatch,
    isForcedBringAbsconded,
    resolveForcedBringNeedsOutcomeUi,
    resolveForcedBringUiPhase,
    resolveInvestigationUiPhase,
    shouldShowForcedBringCard,
    shouldShowInvestigationCourtBlock,
} from '@/app/components/lawyer/execution/forcedBringInvestigationLifecycle';

describe('forcedBringInvestigationLifecycle', () => {
    it('brought/dismissed restart full cycle for a new request', () => {
        const brought = buildForcedBringPersonalOutcomePatch('brought');
        expect(brought.forced_bring_in_personal_outcome).toBeNull();
        expect(brought.investigationCourtRequested).toBe(false);
        expect(brought.debtorForcedToAttend).toBe(true);

        const dismissed = buildForcedBringPersonalOutcomePatch('dismissed');
        expect(dismissed.forced_bring_in_personal_outcome).toBeNull();
        expect(dismissed.debtorForcedToAttend).toBe(false);
    });

    it('absconded hides forced card and opens investigation gate without pre-approving request', () => {
        const absconded = buildForcedBringPersonalOutcomePatch('absconded');
        expect(absconded.forced_bring_in_personal_outcome).toBe('absconded');
        expect(absconded.debtorEvaded).toBe(true);
        expect(absconded.investigationCourtRequested).toBe(false);
        expect(absconded.personal_arrest_investigation_session_open).toBe(true);

        expect(
            shouldShowForcedBringCard({
                showEmbedded: true,
                absconded: isForcedBringAbsconded(absconded as never),
            }),
        ).toBe(true);

        expect(
            shouldShowInvestigationCourtBlock(absconded as never, {
                pending: false,
                approved: false,
                alternative: false,
            }),
        ).toBe(true);
    });

    it('investigation attend / secured bring return to forced-bring start', () => {
        const attend = buildInvestigationDebtorAttendedPatch();
        expect(attend.forced_bring_in_personal_outcome).toBeNull();
        expect(attend.debtorEvaded).toBe(false);

        const secured = buildInvestigationSecuredBringPatch();
        expect(secured.forced_bring_in_personal_outcome).toBeNull();
        expect(secured.debtor_arrest_warrant_cleared_after_custody).toBe(true);

        const restart = buildForcedBringLifecycleRestartBase();
        expect(restart.personal_arrest_warrant_stage).toBe('none');
    });

    it('warrant issued exposes single custody step', () => {
        const warrant = buildInvestigationWarrantIssuedPatch();
        expect(warrant.personal_arrest_warrant_stage).toBe('issued');
        expect(warrant.debtor_wanted_arrest_warrant).toBe(true);

        expect(
            resolveInvestigationUiPhase({
                showCard: true,
                pending: false,
                rejected: false,
                approved: true,
                alternative: false,
                followupBlocked: false,
                blocksFieldwork: false,
                postApprovalActive: true,
                warrantIssued: true,
                warrantCustodyRecorded: false,
            }),
        ).toBe('warrant_custody');
    });

    it('forced phase is outcome_choice only after approval without recorded outcome', () => {
        expect(
            resolveForcedBringNeedsOutcomeUi({
                forcedApproved: true,
                forcedPending: false,
                outcome: null,
            }),
        ).toBe(true);

        expect(
            resolveForcedBringUiPhase({
                showCard: true,
                pending: false,
                rejected: false,
                alternative: false,
                needsOutcome: true,
                followupBlocked: false,
                blocksFieldwork: false,
            }),
        ).toBe('outcome_choice');

        expect(
            resolveForcedBringUiPhase({
                showCard: true,
                pending: false,
                rejected: false,
                alternative: false,
                needsOutcome: true,
                followupBlocked: false,
                blocksFieldwork: true,
            }),
        ).toBe('followup_blocked');
    });

    it('investigation send_request appears after absconded before executor approval', () => {
        expect(
            resolveInvestigationUiPhase({
                showCard: true,
                pending: false,
                rejected: false,
                approved: false,
                alternative: false,
                followupBlocked: false,
                blocksFieldwork: false,
                postApprovalActive: false,
                warrantIssued: false,
                warrantCustodyRecorded: false,
            }),
        ).toBe('send_request');
    });
});
