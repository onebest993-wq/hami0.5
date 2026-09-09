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
import { beforeEach, describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => vi.fn());
vi.mock('@/app/observability/sentryClient', () => ({
    sentryCaptureMessage: (...args: unknown[]) => captured(...args),
}));

import {
    getLastPersistenceFailure,
    hasPersistenceFailed,
    signalPersistenceFailure,
    __resetPersistenceFailureSignalForTests,
} from '../persistenceFailureSignal';

/**
 * التبليغ يمرّ باستيراد ديناميّ، فيُنتظر هبوطه.
 *
 * ويُفصل بين البلاغين ببلوغ هذه الدورة عمداً: بلاغان في **نبضة واحدة** لا يلتقط
 * المشغّل إلا أوّلهما (قِيس: استدعاءان لمفتاحين مختلفين ⇒ التقاط واحد؛ وبينهما
 * `await` ⇒ التقاطان). وهو أثر تخزين الاستيراد الديناميّ في المشغّل لا أثر الشفرة،
 * والإنتاج يفصل بينهما بعمليات قرص أصلاً — فالقياس هنا على الحالة الواقعية.
 */
const flushReport = () => new Promise((resolve) => setTimeout(resolve, 40));
const reportedDetails = (): unknown[] =>
    captured.mock.calls.map((call) => (call[1] as { detail?: unknown })?.detail);

describe('إشارة فشل التثبيت', () => {
    beforeEach(() => {
        __resetPersistenceFailureSignalForTests();
        captured.mockClear();
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

    /*
     * الحدث الأشدّ على مفتاحٍ سبق أن أخفق أخفّ منه: الاستسلام النهائي عن حمولته.
     * بإزالة التكرار بالمفتاح وحده كان لا يصل الرصد أبداً — أي أن `reportGivingUp`
     * الذي أُضيف ليكسر الصمت يُبتلع بالضبط للمفاتيح التي سبق أن تعثّرت.
     */
    it('الاستسلام يصل الرصد ولو سبقه فشلٌ أخفّ على المفتاح نفسه', async () => {
        signalPersistenceFailure('lawyer_files', 'transaction-failed', 'first, minor');
        await flushReport();
        signalPersistenceFailure('lawyer_files', 'encrypt-or-write-failed', 'master key never arrived');
        await flushReport();

        expect(captured).toHaveBeenCalledTimes(2);
        expect(reportedDetails()).toContain('master key never arrived');
    });

    /* والضابط: السبب نفسه لا يُبلَّغ مرّتين — الحصّة الممتلئة تُفشل كل كتابة */
    it('ضابط — تكرار السبب نفسه على المفتاح نفسه بلاغٌ واحد', async () => {
        signalPersistenceFailure('lawyer_files', 'transaction-failed', 'QuotaExceededError');
        await flushReport();
        signalPersistenceFailure('lawyer_files', 'transaction-failed', 'QuotaExceededError');
        await flushReport();

        expect(captured).toHaveBeenCalledTimes(1);
    });

    /* وضابط ثانٍ: مفتاح آخر بالسبب نفسه بلاغٌ مستقلّ — الإزالة بالزوج لا بالسبب */
    it('ضابط — مفتاحان بالسبب نفسه بلاغان', async () => {
        signalPersistenceFailure('key-a', 'db-unavailable');
        await flushReport();
        signalPersistenceFailure('key-b', 'db-unavailable');
        await flushReport();

        expect(captured).toHaveBeenCalledTimes(2);
    });

    /*
     * النداء المزدوج من IndexedDB: خطأُ الطلب يُبعث `onerror` على المعاملة ثم
     * يُجهضها فيُبعث `onabort`، و`done()` تُبلّغ في المسارين — عطلٌ واحد ونداءان.
     * فيجب ألّا ينفخ العدّاد الذي يصل الرصد.
     */
    it('العطل الواحد يُعدّ مرّة ولو نادى مسارَي onerror وonabort', async () => {
        signalPersistenceFailure('lawyer_files', 'transaction-failed', 'AbortError');
        await flushReport();
        /* النداء الثاني للعطل نفسه */
        signalPersistenceFailure('lawyer_files', 'transaction-failed', 'AbortError');
        await flushReport();
        /* ثم عطلٌ متمايز حقيقي */
        signalPersistenceFailure('lawyer_notes', 'db-unavailable');
        await flushReport();

        const counts = captured.mock.calls.map(
            (call) => (call[1] as { failureCount?: number }).failureCount,
        );
        expect(counts).toEqual([1, 2]);
    });
});
