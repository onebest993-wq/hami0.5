import { describe, expect, it } from 'vitest';
import {
    CHECKING_HQ_STATUS,
    DOWN_HQ_STATUS,
    hqCountOrDash,
    hqReportsTotalOrDash,
    markHqStatusFetchFailed,
    markHqStatusFetched,
    parseHeadquartersLiveStatus,
    pendingHqActionTotal,
    pendingHqReportsTotal,
    toHqLiveOverview,
    isHqStatusSessionDenied,
    isHqAdminLiveReady,
} from '@/app/components/admin/hqLiveOverview';

describe('hqLiveOverview', () => {
    it('يجمع بلاغات المنشورات والتعليقات للشارة وطابور الإجراء', () => {
        expect(pendingHqReportsTotal({ pendingReports: 2, pendingCommentReports: 3 })).toBe(5);
        expect(pendingHqReportsTotal({ pendingReports: -1, pendingCommentReports: 4 })).toBe(4);
        expect(
            pendingHqActionTotal({
                pendingVerification: 2,
                pendingReports: 3,
                pendingCommentReports: 1,
            }),
        ).toBe(6);
    });

    it('يشتق الحسابات النشطة إن غاب الحقل', () => {
        const parsed = parseHeadquartersLiveStatus({
            system: 'connected',
            db: true,
            kvOk: true,
            usersTotal: 10,
            usersFrozen: 3,
            pendingReports: 1,
            pendingCommentReports: 2,
            mail: { configured: true, channel: 'resend', mailboxMasked: 'h***@p.me' },
        });
        expect(parsed.usersActive).toBe(7);
        expect(parsed.pendingVerification).toBe(0);
        expect(parsed.mail?.mailboxMasked).toBe('h***@p.me');
        const dirty = parseHeadquartersLiveStatus({
            mail: { configured: true, channel: 'resend\u0000', mailboxMasked: 'h***@p.me\u0007' },
        });
        expect(dirty.mail?.channel).toBe('resend');
        expect(dirty.mail?.mailboxMasked).toBe('h***@p.me');
        expect(toHqLiveOverview(parsed)?.pendingCommentReports).toBe(2);
        expect(parsed.contentPartial).toBe(false);
    });

    it('لا يعرض نظرة عامة أثناء التحقق', () => {
        expect(toHqLiveOverview(CHECKING_HQ_STATUS)).toBeNull();
        expect(CHECKING_HQ_STATUS.contentGaps).toContain('pendingVerification');
        expect(CHECKING_HQ_STATUS.contentGaps).toContain('usersTotal');
        expect(DOWN_HQ_STATUS.contentPartial).toBe(true);
        expect(parseHeadquartersLiveStatus({ system: 'weird' }).system).toBe('down');
        expect(parseHeadquartersLiveStatus({ system: 'connected' }).db).toBe(true);
        expect(parseHeadquartersLiveStatus({ system: 'connected' }).kvOk).toBe(true);
        expect(parseHeadquartersLiveStatus({ system: 'degraded' }).db).toBe(true);
        expect(parseHeadquartersLiveStatus({ system: 'degraded' }).kvOk).toBe(false);
        expect(parseHeadquartersLiveStatus({ system: 'connected', contentPartial: true }).contentPartial).toBe(
            true,
        );
        expect(
            parseHeadquartersLiveStatus({
                system: 'connected',
                contentGaps: ['forumComments', 'nope'],
            }).contentGaps,
        ).toEqual(['forumComments']);
        expect(
            parseHeadquartersLiveStatus({
                system: 'connected',
                contentGaps: ['forumComments'],
            }).contentPartial,
        ).toBe(true);
        expect(hqCountOrDash(0, ['forumComments'], 'forumComments')).toBe('—');
        expect(hqCountOrDash(4, ['forumComments'], 'forumPosts')).toBe(4);
        expect(hqReportsTotalOrDash({ pendingReports: 0, pendingCommentReports: 0, contentGaps: ['pendingReports'] })).toBe(
            '—',
        );
    });

    it('يحفظ آخر أرقام ناجحة عند فشل التحديث ولا يصفرّها', () => {
        const live = markHqStatusFetched(
            parseHeadquartersLiveStatus({
                system: 'connected',
                db: true,
                kvOk: true,
                usersTotal: 12,
            }),
            '2026-08-27T21:00:00.000Z',
        );
        const failed = markHqStatusFetchFailed(live);
        expect(failed.usersTotal).toBe(12);
        expect(failed.stale).toBe(true);
        expect(failed.system).toBe('down');
        expect(failed.fetchedAt).toBe('2026-08-27T21:00:00.000Z');
        expect(markHqStatusFetchFailed(CHECKING_HQ_STATUS)).toEqual(DOWN_HQ_STATUS);
        expect(markHqStatusFetchFailed(CHECKING_HQ_STATUS, 'session').sessionRequired).toBe(true);
        expect(markHqStatusFetchFailed(CHECKING_HQ_STATUS, 'session').db).toBe(false);
        expect(isHqStatusSessionDenied({ status: 401 })).toBe(true);
        expect(isHqStatusSessionDenied({ status: 403 })).toBe(true);
        expect(isHqStatusSessionDenied({ status: 500 })).toBe(false);
        expect(isHqAdminLiveReady({ system: 'checking', sessionRequired: false })).toBe(false);
        expect(isHqAdminLiveReady({ system: 'connected', sessionRequired: false })).toBe(true);
        expect(isHqAdminLiveReady({ system: 'connected', sessionRequired: true })).toBe(false);
        expect(isHqAdminLiveReady({ system: 'connected', sessionRequired: false }, true)).toBe(false);
    });
});
