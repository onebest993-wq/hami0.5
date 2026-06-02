import { describe, expect, it } from 'vitest';
import type { CriminalCase } from './criminalStore';
import {
    patchJudicialDecisionLegalArticle,
    patchJudicialDecisionPartyName,
    syncCaseLegalArticleCorrection,
    syncCasePartyNameCorrection,
} from './caseIdentitySyncEngine';

describe('caseIdentitySyncEngine', () => {
    it('syncCasePartyNameCorrection updates linked judicial decision summary', () => {
        const caseRecord = {
            defendants: [{ id: 'd1', fullName: 'لبيليب' }],
            judicialDecisions: [
                {
                    id: 'jd1',
                    issuedAt: '2026-05-01',
                    title: 'تكفيل المتهم',
                    summary: 'تم تكفيل المتهم لبيليب',
                    defendantIds: ['d1'],
                    appeals: [],
                },
            ],
            lawyerRequests: [],
            timelineEvents: [],
            statements: [],
        } as unknown as CriminalCase;

        const synced = syncCasePartyNameCorrection(caseRecord, 'd1', 'لبيليب', 'أحمد');
        expect(synced.judicialDecisions?.[0]?.summary).toBe('تم تكفيل المتهم أحمد');
    });

    it('patchJudicialDecisionLegalArticle replaces stored legal basis', () => {
        const patched = patchJudicialDecisionLegalArticle(
            {
                id: 'jd1',
                issuedAt: '2026-05-01',
                title: 'قرار',
                summary: 'مادة 55',
                legalArticleBasis: '55',
                appeals: [],
            },
            '55',
            '413',
        );
        expect(patched.legalArticleBasis).toBe('413');
        expect(patched.summary).toBe('مادة 413');
    });

    it('syncCaseLegalArticleCorrection updates lawyer request article basis', () => {
        const caseRecord = {
            judicialDecisions: [],
            lawyerRequests: [
                {
                    id: 'r1',
                    requestDate: '2026-05-01',
                    type: 'طلب',
                    lawyerNote: '',
                    status: 'approved',
                    legalArticleBasis: '55',
                },
            ],
            timelineEvents: [],
        } as unknown as CriminalCase;

        const synced = syncCaseLegalArticleCorrection(caseRecord, '55', '413');
        expect(synced.lawyerRequests?.[0]?.legalArticleBasis).toBe('413');
    });

    it('patchJudicialDecisionPartyName ignores unrelated decisions', () => {
        const unchanged = patchJudicialDecisionPartyName(
            {
                id: 'jd1',
                issuedAt: '2026-05-01',
                title: 'قرار',
                summary: 'لبيليب',
                defendantIds: ['other'],
                appeals: [],
            },
            'd1',
            'لبيليب',
            'أحمد',
        );
        expect(unchanged.summary).toBe('لبيليب');
    });
});
