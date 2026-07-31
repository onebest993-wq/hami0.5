import { describe, expect, it } from 'vitest';
import {
    buildSummonsHubActiveSnapshot,
    countActiveSummonsPaths,
    getSummonsKindLockReason,
    resolvePrimaryActiveKind,
} from '../summonsHubActiveLocks';
import {
    getActivePublicationNoticeForDebtorKey,
    isPublicationNoticeActive,
} from '@/app/utils/publicationNoticeDebtor';
import type { ExecutionFile } from '@/app/types/execution';

describe('summonsHubActiveLocks — استبعاد متبادل', () => {
    it('يمنع فتح مسار جديد بينما يوجد مسار سارٍ آخر', () => {
        const snapshot = buildSummonsHubActiveSnapshot({
            tablighTask: null,
            employeeAssignment: {
                phase: 'active',
                purpose: 'حضور',
                notifyDate: '2020-01-01',
                durationDays: 3,
            },
            publicationNotice: null,
            guarantor: null,
        });
        expect(countActiveSummonsPaths(snapshot)).toBe(1);
        expect(getSummonsKindLockReason('nashr', snapshot)).toMatch(/تكليف بالحضور سارٍ/);
        expect(getSummonsKindLockReason('taklif', snapshot)).toBeNull();
        expect(resolvePrimaryActiveKind(snapshot)).toBe('taklif');
    });

    it('لا يعتبر التبليغ بالنشر منتهياً مساراً سارياً', () => {
        const snapshot = buildSummonsHubActiveSnapshot({
            tablighTask: null,
            employeeAssignment: null,
            publicationNotice: {
                publicationDateYmd: '2020-01-01',
                newspaper1: 'أ',
                newspaper2: 'ب',
                periodEndedAt: '2020-01-20T00:00:00.000Z',
            },
            guarantor: null,
        });
        expect(countActiveSummonsPaths(snapshot)).toBe(0);
        expect(getSummonsKindLockReason('taklif', snapshot)).toBeNull();
    });

    it('لا يعتبر التبليغ العادي المنتهي (periodEndedAt) مساراً سارياً', () => {
        const snapshot = buildSummonsHubActiveSnapshot({
            tablighTask: {
                noticeDateYmd: '2020-01-01',
                purpose: 'تبليغ',
                periodEndedAt: '2020-01-20T00:00:00.000Z',
            },
            employeeAssignment: null,
            publicationNotice: null,
            guarantor: null,
        });
        expect(countActiveSummonsPaths(snapshot)).toBe(0);
        expect(getSummonsKindLockReason('nashr', snapshot)).toBeNull();
    });
});

describe('publicationNotice active semantics', () => {
    it('isPublicationNoticeActive يعيد false عند periodEndedAt', () => {
        expect(
            isPublicationNoticeActive({
                publicationDateYmd: '2020-01-01',
                newspaper1: 'أ',
                newspaper2: 'ب',
                periodEndedAt: '2020-01-20',
            }),
        ).toBe(false);
        expect(
            isPublicationNoticeActive({
                publicationDateYmd: '2020-01-01',
                newspaper1: 'أ',
                newspaper2: 'ب',
            }),
        ).toBe(true);
    });

    it('getActivePublicationNoticeForDebtorKey يتجاهل المنتهي', () => {
        const file = {
            id: 'e1',
            publication_notice_by_debtor: {
                d1: {
                    publicationDateYmd: '2020-01-01',
                    newspaper1: 'أ',
                    newspaper2: 'ب',
                    periodEndedAt: '2020-01-20T00:00:00.000Z',
                },
            },
        } as ExecutionFile;
        expect(getActivePublicationNoticeForDebtorKey(file, 'd1')).toBeNull();
    });
});
