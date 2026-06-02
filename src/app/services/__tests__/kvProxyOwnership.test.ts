/**
 * اختبار وحدة لمنطق التحقق من ملكية المفتاح في kv-proxy.
 * الـ logic موجود في الـ Edge Function، لكنّنا نُعيد تطبيقه هنا
 * بنفس القواعد كـ contract test لضمان أي تغيير يبقى ضمن النموذج المتوقع.
 *
 * إذا غُيِّر الـ Edge Function، يجب تحديث هذه الاختبارات لتطابق.
 */
import { describe, it, expect } from 'vitest';

function isKeyOwnedBy(rawKey: string, userId: string, op: 'read' | 'write'): boolean {
    if (!rawKey || !userId) return false;
    const k = rawKey;
    const u = userId;
    if (k.startsWith(`user:${u}:`)) return true;
    if (k.startsWith(`calendar:${u}:`)) return true;
    if (k.startsWith(`lawyer_files:${u}:`)) return true;
    if (k.startsWith(`urgentActions:${u}:`)) return true;
    if (k.startsWith(`transactions:${u}:`)) return true;
    if (k.startsWith(`transactionsThreading:${u}:`)) return true;
    if (k.startsWith(`notifications:${u}:`)) return true;
    if (k === `notifications_${u}`) return true;
    if (k.startsWith(`vault:docs:${u}:`)) return true;
    if (k === `hami:push:${u}`) return true;
    if (k === `hami:calendar:events:${u}:v1`) return true;
    if (k.startsWith(`follow:${u}:`)) return true;
    if (op === 'read') {
        if (k.startsWith('community:posts:')) return true;
        if (k.startsWith('community:reports:')) return true;
        if (k.startsWith('repository:docs:')) return true;
        if (k.startsWith('banned:users:')) return true;
        if (k.startsWith('follow:')) return true;
    }
    return false;
}

function isPrefixOwnedBy(rawPrefix: string, userId: string): boolean {
    if (!rawPrefix || !userId) return false;
    const p = rawPrefix;
    const u = userId;
    if (p.startsWith(`user:${u}:`)) return true;
    if (p.startsWith(`calendar:${u}:`)) return true;
    if (p.startsWith(`lawyer_files:${u}:`)) return true;
    if (p.startsWith(`urgentActions:${u}:`)) return true;
    if (p.startsWith(`transactions:${u}:`)) return true;
    if (p.startsWith(`notifications:${u}:`)) return true;
    if (p.startsWith(`vault:docs:${u}:`)) return true;
    if (p === 'community:posts:' || p.startsWith('community:posts:')) return true;
    if (p === 'community:reports:' || p.startsWith('community:reports:')) return true;
    if (p === 'repository:docs:' || p.startsWith('repository:docs:')) return true;
    return false;
}

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

    it('يرفض الكتابة المباشرة على community/repository (تحدث عبر routes منفصلة)', () => {
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
    });

    it('يرفض prefix يخص مستخدماً آخر', () => {
        expect(isPrefixOwnedBy(`calendar:${OTHER}:`, ME)).toBe(false);
        expect(isPrefixOwnedBy(`user:${OTHER}:cases:`, ME)).toBe(false);
        expect(isPrefixOwnedBy(`urgentActions:${OTHER}:`, ME)).toBe(false);
    });

    it('يرفض prefix فضفاض عام (الذي كان الثغرة الكارثية)', () => {
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
        // user:userId:other has userId in path; but key like xxxUSERIDxxx shouldn't match
        expect(isKeyOwnedBy(`prefix-user:${ME}:profile`, ME, 'read')).toBe(false);
    });

    it('يرفض محاولة دس userId في مكان غير صحيح', () => {
        // محاولة استخدام userId كقيمة بدل موضع المالك
        expect(isKeyOwnedBy(`user:${OTHER}:cases:${ME}`, ME, 'read')).toBe(false);
        expect(isKeyOwnedBy(`calendar:${OTHER}:${ME}-event`, ME, 'read')).toBe(false);
    });
});
