import { describe, expect, it } from 'vitest';
import {
    applyComplaintCourtReferralToCase,
    restoreComplaintCourtReferralOnQuash,
    shouldRestoreCourtAfterReferralQuash,
} from './complaintCourtReferralEngine';
import type { CriminalCase } from './criminalStore';
import { COMPLAINT_COURT_REFERRAL_TEMPLATE } from './proceduralRequestTypes';

function baseCase(partial: Partial<CriminalCase> = {}): CriminalCase {
    return {
        id: 'c1',
        createdAt: '2026-01-01',
        basics: {
            role: 'lawyer',
            ourRepresentation: 'defense',
            stage: 'مرحلة التحقيق',
            legalArticle: '109',
            crimeType: 'جنحة',
        },
        location: {
            investigationCourtName: 'ديوانية',
            investigationPapersAt: 'محكمة',
            policeStationName: '',
            baseRegisterNumberAndDate: '',
            investigationOfficeName: '',
            investigationDossierNumber: '12/2026',
            courtName: '',
            caseNumber: '',
        },
        complainants: [],
        unknownDefendant: false,
        defendants: [],
        statements: [],
        timelineEvents: [],
        investigationLogs: [],
        proceduralContainers: [],
        lawyerRequests: [],
        physicalLocation: 'court',
        isMutualComplaint: false,
        legalArticleHistory: [],
        ...partial,
    } as CriminalCase;
}

describe('complaintCourtReferralEngine', () => {
    it('updates investigation court name and stores snapshot', () => {
        const next = applyComplaintCourtReferralToCase(baseCase(), 'محكمة الرصافة', 'req_1');
        expect(next.location.investigationCourtName).toBe('محكمة الرصافة');
        expect(next.location.courtName).toBe('محكمة الرصافة');
        expect(next.complaintCourtReferral?.priorInvestigationCourtName).toBe('ديوانية');
        expect(next.complaintCourtReferral?.sourceRequestId).toBe('req_1');
    });

    it('restores prior court name on quash of referral decision', () => {
        const referred = applyComplaintCourtReferralToCase(baseCase(), 'محكمة الكرخ', 'req_2');
        const restored = restoreComplaintCourtReferralOnQuash(referred, 'req_2');
        expect(restored.location.investigationCourtName).toBe('ديوانية');
        expect(restored.complaintCourtReferral).toBeUndefined();
    });

    it('shouldRestoreCourtAfterReferralQuash matches complaint referral only', () => {
        const referred = applyComplaintCourtReferralToCase(baseCase(), 'محكمة أخرى', 'req_3');
        expect(
            shouldRestoreCourtAfterReferralQuash(
                {
                    proceduralTemplate: COMPLAINT_COURT_REFERRAL_TEMPLATE,
                    title: COMPLAINT_COURT_REFERRAL_TEMPLATE,
                    sourceRequestId: 'req_3',
                },
                referred,
                'quash_remand',
            ),
        ).toBe(true);
        expect(
            shouldRestoreCourtAfterReferralQuash(
                {
                    proceduralTemplate: COMPLAINT_COURT_REFERRAL_TEMPLATE,
                    title: COMPLAINT_COURT_REFERRAL_TEMPLATE,
                    sourceRequestId: 'req_3',
                },
                referred,
                'affirmation',
            ),
        ).toBe(false);
    });
});
