import { describe, expect, it } from 'vitest';
import {
    asHqVerificationFlag,
    buildPendingLawyerVerificationSeed,
    clipHqVerificationField,
    hqVerificationHasIdentityPair,
    toHqDossierRecord,
    toHqQueueRecord,
    toHqSelfStatusRecord,
} from './hqVerificationQueueRecord';

const preview = `data:image/jpeg;base64,${'A'.repeat(80)}`;

const base = {
    userId: '11111111-1111-4111-8111-111111111111',
    status: 'pending' as const,
    submittedAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    email: 'a@b.c',
    fullName: 'محمد',
    familyName: 'المياحي',
    phone: '07800000000',
    governorate: 'كربلاء',
    lawyerBarRoom: 'كربلاء',
    faceAssistOptedIn: true,
};

describe('toHqQueueRecord', () => {
    it('يحذف معاينات الهوية من حمولة طابور المقر ويبقي أعلام المرفقات', () => {
        const queued = toHqQueueRecord({
            ...base,
            hasIdFront: false,
            hasIdBack: false,
            hasFaceSelfie: false,
            idFrontPreview: preview,
            idBackPreview: preview,
            faceSelfiePreview: preview,
        });
        expect(queued).not.toBeNull();
        expect(queued?.hasIdFront).toBe(true);
        expect(queued?.hasIdBack).toBe(true);
        expect(queued?.hasFaceSelfie).toBe(true);
        expect(queued).not.toHaveProperty('idFrontPreview');
        expect(queued).not.toHaveProperty('idBackPreview');
        expect(queued).not.toHaveProperty('faceSelfiePreview');
        expect(JSON.stringify(queued)).not.toContain('data:image');
    });

    it('لا يعامل السلسلة false كمرفق، ويعامل true النصّي كعلم', () => {
        expect(asHqVerificationFlag('false')).toBe(false);
        expect(asHqVerificationFlag(false)).toBe(false);
        expect(asHqVerificationFlag('true')).toBe(true);
        expect(Boolean('false')).toBe(true);
        const queued = toHqQueueRecord({
            ...base,
            hasIdFront: 'false',
            hasIdBack: 'true',
            hasFaceSelfie: '0',
        });
        expect(queued?.hasIdFront).toBe(false);
        expect(queued?.hasIdBack).toBe(true);
        expect(queued?.hasFaceSelfie).toBe(false);
        expect(hqVerificationHasIdentityPair(queued!)).toBe(false);
    });

    it('يرفض حالة غير كانونية ويقص الحقول', () => {
        expect(toHqQueueRecord({ ...base, status: 'superuser' })).toBeNull();
        expect(toHqQueueRecord({ ...base, userId: '' })).toBeNull();
        const queued = toHqQueueRecord({
            ...base,
            fullName: `علي\u0000${'م'.repeat(200)}`,
            rejectionReason: 'سبب كافٍ للرفض',
        });
        expect(queued?.fullName.includes('\u0000')).toBe(false);
        expect(queued?.fullName.length).toBeLessThanOrEqual(80);
        expect(queued?.rejectionReason).toBe('سبب كافٍ للرفض');
        expect(clipHqVerificationField('  x\u0001  ', 8)).toBe('x');
    });
});

describe('toHqSelfStatusRecord / toHqDossierRecord', () => {
    it('self لا يحمل صوراً', () => {
        const self = toHqSelfStatusRecord({
            ...base,
            status: 'rejected',
            rejectionReason: 'وثائق غير واضحة',
            idFrontPreview: preview,
            hasIdFront: true,
            hasIdBack: true,
        });
        expect(self?.status).toBe('rejected');
        expect(self?.rejectionReason).toBe('وثائق غير واضحة');
        expect(self).not.toHaveProperty('idFrontPreview');
        expect(JSON.stringify(self)).not.toContain('data:image');
    });

    it('dossier يعقّم SVG ويبقي jpeg', () => {
        const dossier = toHqDossierRecord({
            ...base,
            idFrontPreview: 'data:image/svg+xml;base64,PHN2Zz4=',
            idBackPreview: preview,
            faceSelfiePreview: 'javascript:alert(1)',
            hasIdFront: true,
            hasIdBack: true,
        });
        expect(dossier?.idFrontPreview).toBeNull();
        expect(dossier?.idBackPreview).toContain('data:image/jpeg');
        expect(dossier?.faceSelfiePreview).toBeNull();
        expect(dossier?.hasIdFront).toBe(false);
        expect(dossier?.hasIdBack).toBe(true);
    });
});

describe('buildPendingLawyerVerificationSeed', () => {
    it('يبني بذرة معلّقة بلا وثائق', () => {
        const seed = buildPendingLawyerVerificationSeed(
            {
                userId: base.userId,
                email: 'new@lawyer.com',
                submittedAt: '2026-08-26T19:46:02.712Z',
            },
            '2026-08-29T17:00:00.000Z',
        );
        expect(seed.status).toBe('pending');
        expect(seed.hasIdFront).toBe(false);
        expect(seed.hasIdBack).toBe(false);
        expect(seed.idFrontPreview).toBeNull();
        expect(seed.email).toBe('new@lawyer.com');
        expect(seed.submittedAt).toBe('2026-08-26T19:46:02.712Z');
        expect(seed.updatedAt).toBe('2026-08-29T17:00:00.000Z');
    });
});
