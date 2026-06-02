import { describe, expect, it } from 'vitest';
import { canShowVerdictCassationCorrection, type VerdictCard } from './verdictCardsEngine';

const baseCard = (patch: Partial<VerdictCard> = {}): VerdictCard => ({
    id: 'v1',
    outcome: 'conviction',
    issuedAt: '2026-05-01',
    appealDeadline: '2026-06-01',
    finalDecisionKind: 'conviction_penalty',
    ordinaryAppeal: {
        filedAt: '2026-05-05',
        cassationDossierNumber: '765756',
        result: 'verdict_substantive_affirmation',
        resultRecordedAt: '2026-05-10',
        courtLabel: 'محكمة التمييز',
    },
    ...patch,
});

describe('verdict card cassation correction visibility', () => {
    it('shows for defendant lawyer on upheld conviction within 30 days', () => {
        expect(
            canShowVerdictCassationCorrection(baseCard(), {
                userRole: 'defendant_lawyer',
                referenceDate: new Date('2026-05-20'),
            }),
        ).toBe(true);
    });

    it('shows for substantive modify outcomes within 30 days', () => {
        expect(
            canShowVerdictCassationCorrection(
                baseCard({
                    ordinaryAppeal: {
                        filedAt: '2026-05-05',
                        cassationDossierNumber: '765756',
                        result: 'verdict_quash_modify_mitigate',
                        resultRecordedAt: '2026-05-10',
                        penaltyModificationText: 'تخfيف العقوبة',
                    },
                }),
                { userRole: 'defendant_lawyer', referenceDate: new Date('2026-05-20') },
            ),
        ).toBe(true);
    });

    it('hides for complainant lawyer on conviction and after deadline', () => {
        expect(
            canShowVerdictCassationCorrection(baseCard(), {
                userRole: 'complainant_lawyer',
                referenceDate: new Date('2026-05-20'),
            }),
        ).toBe(false);
        expect(
            canShowVerdictCassationCorrection(baseCard(), {
                userRole: 'defendant_lawyer',
                referenceDate: new Date('2026-06-15'),
            }),
        ).toBe(false);
    });

    it('blocks formal dismissal, remand retrial, and general assembly under m267', () => {
        expect(
            canShowVerdictCassationCorrection(
                baseCard({
                    ordinaryAppeal: {
                        filedAt: '2026-05-05',
                        result: 'verdict_formal_dismissal',
                        resultRecordedAt: '2026-05-10',
                    },
                }),
                { userRole: 'defendant_lawyer', referenceDate: new Date('2026-05-20') },
            ),
        ).toBe(false);
        expect(
            canShowVerdictCassationCorrection(
                baseCard({
                    ordinaryAppeal: {
                        filedAt: '2026-05-05',
                        result: 'verdict_quash_remand_retrial',
                        resultRecordedAt: '2026-05-10',
                    },
                }),
                { userRole: 'defendant_lawyer', referenceDate: new Date('2026-05-20') },
            ),
        ).toBe(false);
        expect(
            canShowVerdictCassationCorrection(
                baseCard({
                    ordinaryAppeal: {
                        filedAt: '2026-05-05',
                        result: 'verdict_substantive_affirmation',
                        resultRecordedAt: '2026-05-10',
                        issuedBy: 'الهيئة العامة',
                    },
                }),
                { userRole: 'defendant_lawyer', referenceDate: new Date('2026-05-20') },
            ),
        ).toBe(false);
    });
});
