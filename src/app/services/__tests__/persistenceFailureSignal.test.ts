/**
 * فشل التثبيت لم يبقَ صامتاً.
 *
 * كل مسار فشل في `webDbSetItem` كان يعود بلا خبر: قاعدة محجوبة، حصّة ممتلئة،
 * معاملة مُجهَضة. والذاكرة تحتفظ بالقيمة فتبدو الجلسة سليمة تماماً — الواجهة تقول
 * «حُفِظ» والقراءة تُرجع ما كُتب — ثم يُقلع المحامي في الغد فلا يجد شيئاً.
 *
 * الاختبار يُثبت أن الحالة صارت مقروءة، وأن التبليغ لا يغرق الرصد حين تُفشل
 * الحصّة الممتلئة كل كتابة.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
    getLastPersistenceFailure,
    hasPersistenceFailed,
    signalPersistenceFailure,
    __resetPersistenceFailureSignalForTests,
} from '../persistenceFailureSignal';

describe('إشارة فشل التثبيت', () => {
    beforeEach(() => {
        __resetPersistenceFailureSignalForTests();
    });

    it('الجلسة السليمة: لا فشل مُسجَّل', () => {
        expect(hasPersistenceFailed()).toBe(false);
        expect(getLastPersistenceFailure()).toBeNull();
    });

    it('الحصّة الممتلئة تُسجَّل بمفتاحها وسببها', () => {
        signalPersistenceFailure('hami:execution:dossier:e-1', 'transaction-failed', 'QuotaExceededError');

        expect(hasPersistenceFailed()).toBe(true);
        const last = getLastPersistenceFailure();
        expect(last?.key).toBe('hami:execution:dossier:e-1');
        expect(last?.reason).toBe('transaction-failed');
    });

    it('القاعدة المحجوبة سبب متمايز عن إجهاض المعاملة', () => {
        signalPersistenceFailure('hami:notes:v1', 'db-unavailable');
        expect(getLastPersistenceFailure()?.reason).toBe('db-unavailable');
    });

    it('آخر فشل هو الظاهر — والحالة تبقى صادقة عبر مفاتيح متعدّدة', () => {
        signalPersistenceFailure('key-a', 'db-unavailable');
        signalPersistenceFailure('key-b', 'transaction-failed');

        expect(hasPersistenceFailed()).toBe(true);
        expect(getLastPersistenceFailure()?.key).toBe('key-b');
    });

    it('التصفير يُعيد الحال نظيفاً — لا تسرّب بين الاختبارات', () => {
        signalPersistenceFailure('key-a', 'db-unavailable');
        __resetPersistenceFailureSignalForTests();
        expect(hasPersistenceFailed()).toBe(false);
    });
});
