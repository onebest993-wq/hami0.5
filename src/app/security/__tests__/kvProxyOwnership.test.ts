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
    it('يسمح بالقراءة من community/repository/banned للجميع', () => {
        expect(isKeyOwnedBy('community:posts:abc', ME, 'read')).toBe(true);
        expect(isKeyOwnedBy('community:reports:xyz', ME, 'read')).toBe(true);
        expect(isKeyOwnedBy('repository:docs:legal-doc-1', ME, 'read')).toBe(true);
        expect(isKeyOwnedBy('banned:users:somebody', ME, 'read')).toBe(true);
        expect(isKeyOwnedBy(`follow:${OTHER}:${ME}`, ME, 'read')).toBe(true);
    });

    it('يرفض الكتابة المباشرة على community/repository', () => {
        expect(isKeyOwnedBy('community:posts:abc', ME, 'write')).toBe(false);
        expect(isKeyOwnedBy('community:reports:xyz', ME, 'write')).toBe(false);
        expect(isKeyOwnedBy('repository:docs:legal-doc-1', ME, 'write')).toBe(false);
        expect(isKeyOwnedBy('banned:users:somebody', ME, 'write')).toBe(false);
    });
});

describe('kv-proxy ownership — follow', () => {
    it('يسمح للمتابِع بكتابة follow:ME:OTHER', () => {
        expect(isKeyOwnedBy(`follow:${ME}:${OTHER}`, ME, 'write')).toBe(true);
    });

    it('يرفض كتابة follow على متابعة شخص آخر', () => {
        expect(isKeyOwnedBy(`follow:${OTHER}:${ME}`, ME, 'write')).toBe(false);
    });
});

describe('kv-proxy ownership — getByPrefix', () => {
    it('يسمح بـ prefix يخص نفس المستخدم', () => {
        expect(isPrefixOwnedBy(`calendar:${ME}:`, ME)).toBe(true);
        expect(isPrefixOwnedBy(`user:${ME}:cases:`, ME)).toBe(true);
        expect(isPrefixOwnedBy(`urgentActions:${ME}:`, ME)).toBe(true);
        expect(isPrefixOwnedBy(`vault:docs:${ME}:`, ME)).toBe(true);
        expect(isPrefixOwnedBy(`transactionsThreading:${ME}:`, ME)).toBe(true);
    });

    it('يرفض prefix يخص مستخدماً آخر', () => {
        expect(isPrefixOwnedBy(`calendar:${OTHER}:`, ME)).toBe(false);
        expect(isPrefixOwnedBy(`user:${OTHER}:cases:`, ME)).toBe(false);
        expect(isPrefixOwnedBy(`urgentActions:${OTHER}:`, ME)).toBe(false);
    });

    it('يرفض prefix فضفاض عام', () => {
        expect(isPrefixOwnedBy('calendar:', ME)).toBe(false);
        expect(isPrefixOwnedBy('user:', ME)).toBe(false);
        expect(isPrefixOwnedBy('lawyer_files:', ME)).toBe(false);
        expect(isPrefixOwnedBy('', ME)).toBe(false);
    });

    it('يرفض prefix بمعرّف مستخدم فارغ', () => {
        expect(isPrefixOwnedBy(`calendar:`, ME)).toBe(false);
        expect(isPrefixOwnedBy(`calendar::`, ME)).toBe(false);
    });

    it('يسمح بـ prefix عام للقوائم العامة', () => {
        expect(isPrefixOwnedBy('community:posts:', ME)).toBe(true);
        expect(isPrefixOwnedBy('community:reports:', ME)).toBe(true);
        expect(isPrefixOwnedBy('repository:docs:', ME)).toBe(true);
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
