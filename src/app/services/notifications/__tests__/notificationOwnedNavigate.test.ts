import { describe, expect, it } from 'vitest';
import {
    collectInboxPostIds,
    resolveNotificationOwnedNavigate,
} from '@/app/services/notifications/notificationOwnedNavigate';
import { staleHamiNotificationChannelIds } from '@/app/services/notifications/native/nativeNotificationChannels';

describe('resolveNotificationOwnedNavigate', () => {
    const base = {
        signedIn: true,
        lawsuitCases: [{ id: 'ls-1', caseNo: '1/ك/2024' }],
        executionCases: [{ id: 'ex-9', caseNo: '9/ت/2024' }],
        inboxPostIds: new Set(['post-owned']),
    };

    it('يرفض بلا جلسة', () => {
        expect(
            resolveNotificationOwnedNavigate({
                ...base,
                signedIn: false,
                path: 'vault',
                payload: {},
            }),
        ).toEqual({ kind: 'noop' });
    });

    it('لا يفتح إضبارة غير مملوكة ولا يسقط إلى الأرشيف', () => {
        expect(
            resolveNotificationOwnedNavigate({
                ...base,
                path: 'case_details',
                payload: { caseId: 'foreign-99', caseNo: '99/غ/2024' },
            }),
        ).toEqual({ kind: 'noop' });
    });

    it('يفتح إضبارة التنفيذ المملوكة فقط', () => {
        expect(
            resolveNotificationOwnedNavigate({
                ...base,
                path: 'case_details',
                payload: { caseId: 'ex-9' },
            }),
        ).toEqual({ kind: 'open-execution', id: 'ex-9' });
    });

    it('لا يمرّر postId منتدى إلا من صندوق المستخدم', () => {
        expect(
            resolveNotificationOwnedNavigate({
                ...base,
                path: 'community',
                payload: { postId: 'foreign-post' },
            }),
        ).toEqual({ kind: 'community', postId: undefined });
        expect(
            resolveNotificationOwnedNavigate({
                ...base,
                path: 'community',
                payload: { postId: 'post-owned' },
            }),
        ).toEqual({ kind: 'community', postId: 'post-owned' });
    });

    it('المخرن من الإشعار بلا fileId', () => {
        expect(
            resolveNotificationOwnedNavigate({
                ...base,
                path: 'vault',
                payload: { fileId: 'other-file' },
            }),
        ).toEqual({ kind: 'vault' });
    });
});

describe('collectInboxPostIds / stale channels', () => {
    it('يجمع postId من الصندوق', () => {
        expect(
            collectInboxPostIds([
                { actionPayload: { postId: 'a' } },
                { actionPayload: { fileId: 'x' } },
            ]),
        ).toEqual(new Set(['a']));
    });

    it('يحذف قنوات hami القديمة ويبقي الجيل الحالي', () => {
        const stale = staleHamiNotificationChannelIds([
            'hami-community-v2',
            'hami-community-v3',
            'other-app',
        ]);
        expect(stale).toContain('hami-community-v2');
        expect(stale).not.toContain('hami-community-v3');
        expect(stale).not.toContain('other-app');
    });
});
