import { describe, expect, it } from 'vitest';
import {
    asHqIdentityImage,
    countHqVerificationByStatus,
    filterHqVerificationRows,
    hqVerificationCanApprove,
    hqVerificationHasDocuments,
    hqVerificationNameMismatches,
    hqVerificationStatusLabel,
    matchesHqVerificationQuery,
    sanitizeHqVerificationQueueRow,
} from '../hqVerificationQueue';

describe('hqVerificationQueue', () => {
    it('يقص الحقول ولا يمرّر معاينات الهوية من قائمة الطابور', () => {
        const row = sanitizeHqVerificationQueueRow({
            userId: 'u-1',
            status: 'pending',
            fullName: `علي${'\u0000'}`.repeat(2),
            idFrontPreview: `data:image/jpeg;base64,${'A'.repeat(80)}`,
            hasIdFront: true,
            email: 'a@b.c',
        });
        expect(row?.fullName).not.toContain('\u0000');
        expect(row?.hasIdFront).toBe(true);
        expect(row).not.toHaveProperty('idFrontPreview');
        expect(asHqIdentityImage('javascript:alert(1)')).toBeNull();
        expect(asHqIdentityImage('data:image/svg+xml;base64,PHN2Zz4=')).toBeNull();
        expect(asHqIdentityImage(`data:image/jpeg;base64,${'A'.repeat(80)}`)).toContain('data:image/jpeg');
    });

    it('يصفي الحالة ويلخّص الأختام', () => {
        const rows = [
            sanitizeHqVerificationQueueRow({ userId: 'a', status: 'pending', hasIdFront: true })!,
            sanitizeHqVerificationQueueRow({ userId: 'b', status: 'active' })!,
            sanitizeHqVerificationQueueRow({ userId: 'c', status: 'rejected' })!,
        ];
        expect(countHqVerificationByStatus(rows, 'pending')).toBe(1);
        expect(filterHqVerificationRows(rows, 'active')).toHaveLength(1);
        expect(hqVerificationHasDocuments(rows[0])).toBe(true);
        expect(hqVerificationHasDocuments(rows[1])).toBe(false);
        expect(hqVerificationCanApprove(rows[0])).toBe(false);
        expect(
            hqVerificationCanApprove(
                sanitizeHqVerificationQueueRow({ userId: 'd', status: 'pending', hasIdFront: true, hasIdBack: true })!,
            ),
        ).toBe(true);
        expect(hqVerificationStatusLabel('pending')).toBe('قيد التدقيق');
        expect(hqVerificationStatusLabel('active')).toBe('معتمد');
        const named = sanitizeHqVerificationQueueRow({
            userId: 'n',
            status: 'pending',
            fullName: 'وجدان',
            liveFullName: 'وجدان علي',
            governorate: 'كربلاء',
        })!;
        expect(matchesHqVerificationQuery(named, 'وجدان')).toBe(true);
        expect(matchesHqVerificationQuery(named, 'اختلاف الاسم')).toBe(true);
        expect(hqVerificationNameMismatches(named)).toBe(true);
        expect(matchesHqVerificationQuery(named, 'بغداد')).toBe(false);
    });
});
