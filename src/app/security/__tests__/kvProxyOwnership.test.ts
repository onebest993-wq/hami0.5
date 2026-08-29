/**
 * KV key/prefix ownership rules — canonical module tests.
 */
import { describe, it, expect } from 'vitest';
import { isKeyOwnedBy, isPrefixOwnedBy } from '@/app/security/kvProxyKeyOwnership';

const ME = 'user-aaa';
const OTHER = 'user-bbb';

describe('kv-proxy ownership — PRIVATE keys', () => {
    it('يسمح للمستخدم بالكتابة على مفتاحه الخاص', () => {
        expect(isKeyOwnedBy(`user:${ME}:profile`, ME, 'write')).toBe(true);
        expect(isKeyOwnedBy(`calendar:${ME}:event-1`, ME, 'write')).toBe(true);
        expect(isKeyOwnedBy(`lawyer_files:${ME}:file-1`, ME, 'write')).toBe(true);
        expect(isKeyOwnedBy(`urgentActions:${ME}:state`, ME, 'write')).toBe(true);
        expect(isKeyOwnedBy(`transactions:${ME}:tx-1`, ME, 'write')).toBe(true);
        expect(isKeyOwnedBy(`notifications:${ME}:n-1`, ME, 'write')).toBe(true);
        expect(isKeyOwnedBy(`notifications_${ME}`, ME, 'write')).toBe(true);
        expect(isKeyOwnedBy(`vault:docs:${ME}:doc-1`, ME, 'write')).toBe(true);
        expect(isKeyOwnedBy(`hami:push:${ME}`, ME, 'write')).toBe(true);
        expect(isKeyOwnedBy(`hami:calendar:events:${ME}:v1`, ME, 'write')).toBe(true);
        expect(isKeyOwnedBy(`profile:${ME}`, ME, 'write')).toBe(true);
    });

    it('يرفض الكتابة على مفتاح profile لمستخدم آخر', () => {
        expect(isKeyOwnedBy(`profile:${OTHER}`, ME, 'write')).toBe(false);
        expect(isKeyOwnedBy(`profile:${ME}`, OTHER, 'write')).toBe(false);
    });

    it('يسمح بالقراءة العامة ويمنع الكتابة على profile لمستخدم آخر', () => {
        expect(isKeyOwnedBy(`profile:${OTHER}`, ME, 'read')).toBe(true);
        expect(isKeyOwnedBy(`profile:${OTHER}`, ME, 'write')).toBe(false);
    });

    it('يرفض الكتابة على مفتاح مستخدم آخر', () => {
        expect(isKeyOwnedBy(`user:${OTHER}:profile`, ME, 'write')).toBe(false);
        expect(isKeyOwnedBy(`calendar:${OTHER}:event-1`, ME, 'write')).toBe(false);
        expect(isKeyOwnedBy(`lawyer_files:${OTHER}:file-1`, ME, 'write')).toBe(false);
        expect(isKeyOwnedBy(`urgentActions:${OTHER}:state`, ME, 'write')).toBe(false);
        expect(isKeyOwnedBy(`transactions:${OTHER}:tx-1`, ME, 'write')).toBe(false);
        expect(isKeyOwnedBy(`notifications:${OTHER}:n-1`, ME, 'write')).toBe(false);
        expect(isKeyOwnedBy(`notifications_${OTHER}`, ME, 'write')).toBe(false);
        expect(isKeyOwnedBy(`vault:docs:${OTHER}:doc-1`, ME, 'write')).toBe(false);
        expect(isKeyOwnedBy(`hami:push:${OTHER}`, ME, 'write')).toBe(false);
    });

    it('يرفض القراءة من مفتاح مستخدم آخر', () => {
        expect(isKeyOwnedBy(`calendar:${OTHER}:event-1`, ME, 'read')).toBe(false);
        expect(isKeyOwnedBy(`urgentActions:${OTHER}:state`, ME, 'read')).toBe(false);
        expect(isKeyOwnedBy(`vault:docs:${OTHER}:doc-1`, ME, 'read')).toBe(false);
    });
});

describe('kv-proxy ownership — READABLE_GLOBAL', () => {
    it('يسمح فقط بقراءة المحتوى العام غير الحساس', () => {
        expect(isKeyOwnedBy('community:posts:abc', ME, 'read')).toBe(false);
        expect(isKeyOwnedBy('repository:docs:legal-doc-1', ME, 'read')).toBe(false);
        expect(isKeyOwnedBy(`repository:docs:${ME}:legal-doc-1`, ME, 'read')).toBe(true);
        expect(isKeyOwnedBy(`follow:${OTHER}:${ME}`, ME, 'read')).toBe(true);
        expect(isKeyOwnedBy(`follow:${ME}:${OTHER}`, ME, 'read')).toBe(true);
        expect(isKeyOwnedBy(`follow:${OTHER}:stranger-id`, ME, 'read')).toBe(false);
    });

    it('يحجب البلاغات والحظر عن KV العام', () => {
        expect(isKeyOwnedBy('community:reports:xyz', ME, 'read')).toBe(false);
        expect(isKeyOwnedBy('banned:users:somebody', ME, 'read')).toBe(false);
    });

    it('يرفض الكتابة المباشرة على community/repository غير المملوك', () => {
        expect(isKeyOwnedBy('community:posts:abc', ME, 'write')).toBe(false);
        expect(isKeyOwnedBy('community:reports:xyz', ME, 'write')).toBe(false);
        expect(isKeyOwnedBy('repository:docs:legal-doc-1', ME, 'write')).toBe(false);
        expect(isKeyOwnedBy(`repository:docs:${ME}:legal-doc-1`, ME, 'write')).toBe(true);
        expect(isKeyOwnedBy(`repository:docs:${OTHER}:legal-doc-1`, ME, 'write')).toBe(false);
        expect(isKeyOwnedBy('banned:users:somebody', ME, 'write')).toBe(false);
    });
});

describe('kv-proxy ownership — follow', () => {
    it('يسمح للمتابِع بكتابة follow:ME:OTHER', () => {
        expect(isKeyOwnedBy(`follow:${ME}:${OTHER}`, ME, 'write')).toBe(true);
    });

    it('يرفض قراءة متابعة بين طرفين أجنبيين', () => {
        expect(isKeyOwnedBy(`follow:${OTHER}:stranger-id`, ME, 'read')).toBe(false);
        expect(isKeyOwnedBy(`follow:${OTHER}:stranger-id`, ME, 'write')).toBe(false);
    });

    it('لا يخلط followers: مع follow: ولا يسمح بزرع متابِع مزيف', () => {
        expect(isKeyOwnedBy(`followers:${ME}:${OTHER}`, ME, 'write')).toBe(false);
        expect(isKeyOwnedBy(`followers:${ME}:${OTHER}`, OTHER, 'write')).toBe(true);
        expect(isKeyOwnedBy(`followers:${ME}:${OTHER}`, ME, 'read')).toBe(true);
        expect(isKeyOwnedBy(`followers:${OTHER}:${ME}`, ME, 'write')).toBe(true);
        expect(isKeyOwnedBy(`followers:${OTHER}:stranger-id`, ME, 'read')).toBe(false);
        expect(isKeyOwnedBy(`followers:${OTHER}:stranger-id`, ME, 'write')).toBe(false);
    });
});

describe('kv-proxy ownership — getByPrefix', () => {
    it('يسمح بـ prefix يخص نفس المستخدم', () => {
        expect(isPrefixOwnedBy(`calendar:${ME}:`, ME, 'read')).toBe(true);
        expect(isPrefixOwnedBy(`user:${ME}:cases:`, ME, 'write')).toBe(true);
        expect(isPrefixOwnedBy(`urgentActions:${ME}:`, ME, 'read')).toBe(true);
        expect(isPrefixOwnedBy(`vault:docs:${ME}:`, ME, 'write')).toBe(true);
        expect(isPrefixOwnedBy(`transactionsThreading:${ME}:`, ME, 'read')).toBe(true);
        expect(isPrefixOwnedBy(`follow:${ME}:`, ME, 'read')).toBe(true);
        expect(isPrefixOwnedBy(`follow:${ME}:`, ME, 'write')).toBe(true);
        expect(isPrefixOwnedBy(`followers:${ME}:`, ME, 'read')).toBe(true);
        expect(isPrefixOwnedBy(`followers:${ME}:`, ME, 'write')).toBe(true);
        expect(isPrefixOwnedBy(`repository:docs:${ME}:`, ME, 'read')).toBe(true);
        expect(isPrefixOwnedBy(`repository:docs:${ME}:`, ME, 'write')).toBe(true);
    });

    it('يرفض prefix يخص مستخدماً آخر', () => {
        expect(isPrefixOwnedBy(`calendar:${OTHER}:`, ME, 'read')).toBe(false);
        expect(isPrefixOwnedBy(`user:${OTHER}:cases:`, ME, 'write')).toBe(false);
        expect(isPrefixOwnedBy(`urgentActions:${OTHER}:`, ME, 'read')).toBe(false);
        expect(isPrefixOwnedBy(`follow:${OTHER}:`, ME, 'read')).toBe(false);
        expect(isPrefixOwnedBy(`followers:${OTHER}:`, ME, 'read')).toBe(false);
        expect(isPrefixOwnedBy(`repository:docs:${OTHER}:`, ME, 'read')).toBe(false);
    });

    it('يرفض prefix فضفاض عام', () => {
        expect(isPrefixOwnedBy('calendar:', ME, 'read')).toBe(false);
        expect(isPrefixOwnedBy('user:', ME, 'write')).toBe(false);
        expect(isPrefixOwnedBy('lawyer_files:', ME, 'read')).toBe(false);
        expect(isPrefixOwnedBy('follow:', ME, 'read')).toBe(false);
        expect(isPrefixOwnedBy('followers:', ME, 'read')).toBe(false);
        expect(isPrefixOwnedBy('', ME, 'write')).toBe(false);
    });

    it('يرفض prefix بمعرّف مستخدم فارغ', () => {
        expect(isPrefixOwnedBy(`calendar:`, ME, 'read')).toBe(false);
        expect(isPrefixOwnedBy(`calendar::`, ME, 'write')).toBe(false);
    });

    it('يسمح بقراءة القوائم العامة ويمنع حذفها الجماعي', () => {
        expect(isPrefixOwnedBy('community:posts:', ME, 'read')).toBe(false);
        expect(isPrefixOwnedBy('repository:docs:', ME, 'read')).toBe(false);
        expect(isPrefixOwnedBy('community:posts:', ME, 'write')).toBe(false);
        expect(isPrefixOwnedBy('repository:docs:', ME, 'write')).toBe(false);
    });

    it('يحجب prefix البلاغات في القراءة والكتابة', () => {
        expect(isPrefixOwnedBy('community:reports:', ME, 'read')).toBe(false);
        expect(isPrefixOwnedBy('community:reports:', ME, 'write')).toBe(false);
    });
});

describe('kv-proxy ownership — حالات حدية', () => {
    it('يرفض مفاتيح ومعرّفات فارغة', () => {
        expect(isKeyOwnedBy('', ME, 'read')).toBe(false);
        expect(isKeyOwnedBy('user:U:profile', '', 'read')).toBe(false);
        expect(isKeyOwnedBy('', '', 'read')).toBe(false);
    });

    it('لا يخدع بـ prefix يحتوي userId كجزء من قيمة', () => {
        expect(isKeyOwnedBy(`prefix-user:${ME}:profile`, ME, 'read')).toBe(false);
    });

    it('يرفض محاولة دس userId في مكان غير صحيح', () => {
        expect(isKeyOwnedBy(`user:${OTHER}:cases:${ME}`, ME, 'read')).toBe(false);
        expect(isKeyOwnedBy(`calendar:${OTHER}:${ME}-event`, ME, 'read')).toBe(false);
    });
});
