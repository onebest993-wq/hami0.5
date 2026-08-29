import { describe, expect, it } from 'vitest';
import {
    applyShareAccessPolicy,
    canFetchShareDetail,
    toShareListSummary,
} from '../caseShareAccessControl';
import type { CaseShareRecord } from '../caseShareTypes';
import { fieldsWith, PERSONAS, richLawsuitSource } from './caseShareTestFixtures';
import { buildMaskedView } from '../caseShareMasking';

function buildPendingShare(): CaseShareRecord {
    const source = richLawsuitSource();
    const maskedView = buildMaskedView(source, fieldsWith({}), PERSONAS.sender.name, 60);
    return {
        id: 'share-1',
        ownerId: PERSONAS.sender.id,
        ownerName: PERSONAS.sender.name,
        recipientId: PERSONAS.recipient.id,
        recipientName: PERSONAS.recipient.name,
        dossierModule: source.module,
        dossierId: source.dossierId,
        dossierTitle: source.title,
        visibleFields: fieldsWith({}),
        maskedView,
        status: 'pending',
        createdAt: new Date().toISOString(),
        sessionDurationMinutes: 60,
    };
}

describe('caseShareAccessControl', () => {
    it('يخفي تفاصيل الإضبارة عن المستقبل قبل الموافقة', () => {
        const share = buildPendingShare();
        const sanitized = applyShareAccessPolicy(share, PERSONAS.recipient.id);

        expect(sanitized.maskedView.parties).toEqual([]);
        expect(sanitized.maskedView.caseNumbers).toEqual([]);
        expect(sanitized.maskedView.visibleCatalog).toEqual([]);
        expect(sanitized.dossierId).toBe('');
        expect(sanitized.maskedView.narrative).toContain('بعد الموافقة');
    });

    it('يُبقي المرسل يرى المعاينة المقنّعة كما أرسلها', () => {
        const share = buildPendingShare();
        const forSender = applyShareAccessPolicy(share, PERSONAS.sender.id);
        expect(forSender.maskedView.parties.length).toBeGreaterThan(0);
        expect(forSender.dossierId).toBeTruthy();
    });

    it('قائمة الإشعارات لا تحتوي محتوى حساساً', () => {
        const share = buildPendingShare();
        const summary = toShareListSummary(share, PERSONAS.sender.id);
        expect(summary.maskedView.visibleCatalog).toEqual([]);
        expect(summary.maskedView.caseNumbers).toEqual([]);
        expect(summary.maskedView.parties).toEqual([]);
    });

    it('يمنع جلب التفاصيل قبل موافقة المستقبل', () => {
        const share = buildPendingShare();
        expect(canFetchShareDetail(share, PERSONAS.recipient.id)).toBe(false);
        expect(canFetchShareDetail(share, PERSONAS.sender.id)).toBe(true);
    });

    it('يسحب المحتوى الحساس من المستقبل بعد إنهاء الجلسة', () => {
        const share = buildPendingShare();
        const accepted = {
            ...share,
            status: 'accepted' as const,
            sessionStartedAt: new Date(Date.now() - 3_600_000).toISOString(),
            sessionDurationMinutes: 60,
        };
        const ended = {
            ...accepted,
            status: 'ended' as const,
            sessionEndedAt: new Date().toISOString(),
        };

        const sanitized = applyShareAccessPolicy(ended, PERSONAS.recipient.id);
        expect(sanitized.maskedView.parties).toEqual([]);
        expect(sanitized.maskedView.caseNumbers).toEqual([]);
        expect(sanitized.maskedView.visibleCatalog).toEqual([]);
        expect(sanitized.dossierId).toBe('');
        expect(canFetchShareDetail(ended, PERSONAS.recipient.id)).toBe(false);
        expect(canFetchShareDetail(ended, PERSONAS.sender.id)).toBe(true);
    });
});
