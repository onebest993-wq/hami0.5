/**
 * طابور الكتابات المؤجَّلة — أوّل تغطية له على الإطلاق.
 *
 * كانت الآلية داخل `SecureStoreService` وتمتنع عن الجدولة تحت `VITEST`، فلم يكن
 * لأيّ اختبار سبيلٌ إلى تشغيلها. وهذه أوّل مرّة تُقاد فيها فعلاً: المضيف هنا
 * يُمرّر مشغّلاً يدوياً بدل `setTimeout`، فتُقاد الجولات خطوةً خطوة بلا مؤقتات.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CryptoService } from '@/app/services/CryptoService';
import { StorageEncryptionError } from '@/app/services/storage/storageEncryptionError';
import {
    configureCryptoDeferred,
    dropCryptoDeferredWrite,
    flushCryptoDeferredWrites,
    queueCryptoDeferredWrite,
    resetCryptoDeferredAttempts,
    resetCryptoDeferredForTests,
    type CryptoDeferredHost,
} from '@/app/services/secureStoreCryptoDeferred';

/** مضيفٌ مزيَّف يسجّل ما جرى ويحتفظ بالجولة المؤجَّلة ليقودها الاختبار */
function makeHost(overrides: Partial<CryptoDeferredHost> = {}) {
    const persisted: Array<[string, string]> = [];
    const gaveUp: Array<[string, string]> = [];
    /*
     * تُرجع false — أي «لم أجدول» — فيقود الاختبار الجولات بنفسه بلا مؤقتات، وهو
     * ما صُمّم `schedule` ليُرجعه. والعدّ هنا هو عدّ **طلبات** إعادة المحاولة.
     */
    let retryRequests = 0;
    const host: CryptoDeferredHost = {
        persist: async (key, value) => {
            persisted.push([key, value]);
        },
        shouldDropStaleWrite: () => false,
        atomicGateHeld: () => false,
        schedule: () => {
            retryRequests += 1;
            return null;
        },
        reportError: () => undefined,
        reportGivingUp: (key, reason) => {
            gaveUp.push([key, reason]);
        },
        ...overrides,
    };
    configureCryptoDeferred(host);
    const drive = async (rounds: number) => {
        for (let i = 0; i < rounds; i += 1) await flushCryptoDeferredWrites();
    };
    return { persisted, gaveUp, drive, retries: () => retryRequests };
}

describe('طابور الكتابات المؤجَّلة', () => {
    beforeEach(() => {
        resetCryptoDeferredForTests();
        vi.restoreAllMocks();
    });

    it('يكتب الحمولة المؤجَّلة متى صار المفتاح متاحاً', async () => {
        vi.spyOn(CryptoService, 'hasMasterKey').mockReturnValue(true);
        const { persisted } = makeHost();

        queueCryptoDeferredWrite('k1', '{"a":1}');
        await flushCryptoDeferredWrites();

        expect(persisted).toEqual([['k1', '{"a":1}']]);
    });

    it('ينتظر ولا يكتب ما دام المفتاح غائباً', async () => {
        vi.spyOn(CryptoService, 'hasMasterKey').mockReturnValue(false);
        vi.spyOn(CryptoService, 'initialize').mockResolvedValue(undefined as never);
        const { persisted, retries } = makeHost();

        queueCryptoDeferredWrite('k2', '{"a":1}');
        await flushCryptoDeferredWrites();

        expect(persisted).toEqual([]);
        /* جولةٌ أولى عند الإدراج وأخرى لإعادة المحاولة */
        expect(retries()).toBeGreaterThan(0);
    });

    it('الحمولة المسقَطة لا تُكتب بعد إسقاطها', async () => {
        vi.spyOn(CryptoService, 'hasMasterKey').mockReturnValue(true);
        const { persisted } = makeHost();

        queueCryptoDeferredWrite('k3', '{"a":1}');
        dropCryptoDeferredWrite('k3');
        await flushCryptoDeferredWrites();

        expect(persisted).toEqual([]);
    });

    it('تُتخطّى الحمولة التي سبقتها معاملة ذرّية', async () => {
        vi.spyOn(CryptoService, 'hasMasterKey').mockReturnValue(true);
        const { persisted } = makeHost({ shouldDropStaleWrite: (key) => key === 'stale' });

        queueCryptoDeferredWrite('stale', '{"old":1}');
        queueCryptoDeferredWrite('fresh', '{"new":1}');
        await flushCryptoDeferredWrites();

        expect(persisted).toEqual([['fresh', '{"new":1}']]);
    });

    it('فشل التشفير يُعيد الحمولة للطابور فلا تضيع', async () => {
        vi.spyOn(CryptoService, 'hasMasterKey').mockReturnValue(true);
        const { persisted } = makeHost({
            persist: async () => {
                throw new StorageEncryptionError('k4', 'encrypt failed');
            },
        });

        queueCryptoDeferredWrite('k4', '{"a":1}');
        await flushCryptoDeferredWrites();
        expect(persisted).toEqual([]);

        /* المفتاح ما زال في الطابور: كتابةٌ ناجحة لاحقاً يجب أن تُخرجه */
        const second = makeHost();
        await flushCryptoDeferredWrites();
        expect(second.persisted).toEqual([['k4', '{"a":1}']]);
    });

    /* ما يلي هو ما لم يكن يُختبَر — ولذلك عاش فيه العطلان */

    it('يكفّ عن إعادة المحاولة حين يبقى التشفير فاشلاً والمفتاح حاضر', async () => {
        vi.spyOn(CryptoService, 'hasMasterKey').mockReturnValue(true);
        const { drive, retries } = makeHost({
            persist: async () => {
                throw new StorageEncryptionError('loop', 'encrypt failed');
            },
        });

        queueCryptoDeferredWrite('loop', '{"a":1}');
        await drive(40);

        /*
         * كان عدّادٌ واحد يخدم ميزانيتين: وصولُ المفتاح يُصفّره في كل جولة، فلا
         * يبلغ سقفه أبداً في مسار فشل الكتابة. فيبقى مؤقّتٌ يوقظ الهاتف كل ١٫٢
         * ثانية ما دام التطبيق حياً — استنزافُ بطارية لا نهاية له.
         */
        expect(retries()).toBeLessThanOrEqual(10);
    });

    it('يُبلّغ حين يستسلم بدل أن تموت الحمولة صامتة', async () => {
        vi.spyOn(CryptoService, 'hasMasterKey').mockReturnValue(true);
        const { drive, gaveUp } = makeHost({
            persist: async () => {
                throw new StorageEncryptionError('quiet', 'encrypt failed');
            },
        });

        queueCryptoDeferredWrite('quiet', '{"a":1}');
        await drive(40);

        expect(gaveUp.map(([key]) => key)).toContain('quiet');
    });

    it('ينتظر المفتاح بميزانيته ثم يستسلم مُبلِّغاً', async () => {
        vi.spyOn(CryptoService, 'hasMasterKey').mockReturnValue(false);
        vi.spyOn(CryptoService, 'initialize').mockResolvedValue(undefined as never);
        const { drive, gaveUp, retries } = makeHost();

        queueCryptoDeferredWrite('waiting', '{"a":1}');
        await drive(40);

        expect(retries()).toBeLessThanOrEqual(26);
        expect(gaveUp.map(([key]) => key)).toContain('waiting');
    });

    /*
     * الميزانية لكل مفتاح لا للجلسة. كان عدّاداً واحداً، فمفتاحٌ عالق يستنفده ثم
     * **يُجوّع كل مفتاحٍ يليه**: أوّل فشلٍ لحمولة جديدة يُستسلم عنها فوراً، بينما
     * يَعِد الثابت بثمانِ محاولات.
     */
    it('مفتاحٌ جديد يأخذ ميزانيته كاملة ولو استنفدها عالقٌ قبله', async () => {
        vi.spyOn(CryptoService, 'hasMasterKey').mockReturnValue(true);
        const attempts = new Map<string, number>();
        const { drive, gaveUp } = makeHost({
            persist: async (key) => {
                attempts.set(key, (attempts.get(key) ?? 0) + 1);
                throw new StorageEncryptionError(key, 'encrypt failed');
            },
        });

        queueCryptoDeferredWrite('stuck', '{"a":1}');
        await drive(20);
        expect(gaveUp.map(([key]) => key)).toContain('stuck');

        queueCryptoDeferredWrite('fresh', '{"b":2}');
        await drive(1);

        /* محاولة واحدة فقط جرت للجديد حتى الآن، ولم يُستسلم عنه */
        expect(attempts.get('fresh')).toBe(1);
        expect(gaveUp.map(([key]) => key)).not.toContain('fresh');
    });

    /*
     * والوجه الآخر للعدّاد العام: الثمانية كانت تحدّ إعادة الجدولة لا المحاولات،
     * فحمولةٌ عالقة تُعاد محاولتها في كل جولة يُطلقها غيرها — قِيس عشرون محاولة.
     */
    it('العالق لا يُحاوَل بعد نفاد ميزانيته مهما جرت جولات لغيره', async () => {
        vi.spyOn(CryptoService, 'hasMasterKey').mockReturnValue(true);
        const attempts = new Map<string, number>();
        const { drive } = makeHost({
            persist: async (key) => {
                attempts.set(key, (attempts.get(key) ?? 0) + 1);
                throw new StorageEncryptionError(key, 'encrypt failed');
            },
        });

        queueCryptoDeferredWrite('stuck', '{"a":1}');
        await drive(30);

        expect(attempts.get('stuck')).toBe(8);
    });

    it('الاستسلام لا يُتلف الحمولة — وصولُ المفتاح متأخراً ما زال يُنقذها', async () => {
        const keyPresent = vi.spyOn(CryptoService, 'hasMasterKey').mockReturnValue(false);
        vi.spyOn(CryptoService, 'initialize').mockResolvedValue(undefined as never);
        const first = makeHost();

        queueCryptoDeferredWrite('late', '{"saved":true}');
        await first.drive(40);
        expect(first.gaveUp.length).toBeGreaterThan(0);

        /* ثم يصل wrap الجلسة متأخراً — وهو ما يستدعي rewarmSensitiveAfterWrapChange */
        keyPresent.mockReturnValue(true);
        const second = makeHost();
        resetCryptoDeferredAttempts();
        await flushCryptoDeferredWrites();

        expect(second.persisted).toEqual([['late', '{"saved":true}']]);
    });
});
