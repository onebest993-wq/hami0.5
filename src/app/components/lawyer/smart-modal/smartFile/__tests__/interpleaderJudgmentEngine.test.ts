import { describe, expect, it } from 'vitest';
import {
    INTERPLEADER_JUDGMENT_BOTH_DISMISSED,
    INTERPLEADER_JUDGMENT_PLAINTIFF_FULL,
    INTERPLEADER_JUDGMENT_THIRD_FULL,
    INTERPLEADER_JUDGMENT_THIRD_PARTIAL,
    hasInterpleaderParties,
    interpleaderClientAwaitingOpponentAppeal,
    interpleaderOriginalClaimOutcome,
    resolveInterpleaderHadoriAppealRights,
    resolveLawyerJudgmentBucket,
} from '../interpleaderJudgmentEngine';

describe('interpleaderJudgmentEngine', () => {
    it('detects interpleader parties in dossier', () => {
        expect(
            hasInterpleaderParties([
                { id: 1, name: 'أ', role: 'المدعي' },
                { id: 2, name: 'ب', role: 'شخص ثالث (اختصامي)' },
            ]),
        ).toBe(true);
        expect(hasInterpleaderParties([{ id: 1, name: 'أ', role: 'المدعي' }])).toBe(false);
    });

    it('resolves lawyer bucket from client party role', () => {
        expect(
            resolveLawyerJudgmentBucket('المدعى عليه', [
                { id: 1, name: 'ثالث', role: 'شخص ثالث (اختصامي)', isClient: true },
            ]),
        ).toBe('interpleader');
        expect(
            resolveLawyerJudgmentBucket(null, [
                { id: 1, name: 'مدعى', role: 'المدعى عليه', isClient: true },
            ]),
        ).toBe('defendant');
    });

    it('plaintiff full win: plaintiff waits, defendant and interpleader appeal', () => {
        expect(
            resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_PLAINTIFF_FULL, 'plaintiff').action,
        ).toBe('wait_opponent');
        expect(
            resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_PLAINTIFF_FULL, 'defendant').action,
        ).toBe('self_appeal');
        expect(
            resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_PLAINTIFF_FULL, 'interpleader').action,
        ).toBe('self_appeal');
    });

    it('third party full win: interpleader waits, plaintiff appeals, defendant wins', () => {
        expect(
            resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_THIRD_FULL, 'interpleader').action,
        ).toBe('wait_opponent');
        expect(
            resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_THIRD_PARTIAL, 'interpleader').action,
        ).toBe('wait_opponent');
        expect(
            resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_THIRD_FULL, 'plaintiff').action,
        ).toBe('self_appeal');
        expect(
            resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_THIRD_FULL, 'defendant').action,
        ).toBe('wait_opponent');
    });

    it('third party request dismissed: interpleader may appeal', () => {
        expect(
            resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_PLAINTIFF_FULL, 'interpleader').action,
        ).toBe('self_appeal');
    });

    it('both dismissed: only defendant is winner', () => {
        expect(
            resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_BOTH_DISMISSED, 'defendant').action,
        ).toBe('wait_opponent');
        expect(
            resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_BOTH_DISMISSED, 'plaintiff').action,
        ).toBe('self_appeal');
        expect(interpleaderClientAwaitingOpponentAppeal(INTERPLEADER_JUDGMENT_BOTH_DISMISSED, 'defendant')).toBe(
            true,
        );
    });

    it('maps original claim outcome for attachment shield', () => {
        expect(interpleaderOriginalClaimOutcome(INTERPLEADER_JUDGMENT_PLAINTIFF_FULL)).toBe('full_win');
        expect(interpleaderOriginalClaimOutcome(INTERPLEADER_JUDGMENT_THIRD_FULL)).toBe('full_loss');
        expect(interpleaderOriginalClaimOutcome(INTERPLEADER_JUDGMENT_BOTH_DISMISSED)).toBe('full_loss');
    });
});
