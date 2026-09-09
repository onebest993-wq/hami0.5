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
    resetCryptoDeferredForTests,
    type CryptoDeferredHost,
} from '@/app/services/secureStoreCryptoDeferred';

/** مضيفٌ مزيَّف يسجّل ما جرى ويحتفظ بالجولة المؤجَّلة ليقودها الاختبار */
function makeHost(overrides: Partial<CryptoDeferredHost> = {}) {
    const persisted: Array<[string, string]> = [];
    const scheduled: Array<() => void> = [];
    const host: CryptoDeferredHost = {
        persist: async (key, value) => {
            persisted.push([key, value]);
        },
        shouldDropStaleWrite: () => false,
        atomicGateHeld: () => false,
        schedule: (run) => {
            scheduled.push(run);
            return true;
        },
        reportError: () => undefined,
        ...overrides,
    };
    configureCryptoDeferred(host);
    /** يشغّل الجولة المجدولة الأخيرة كما لو انقضى مؤقّتها */
    const runScheduled = async () => {
        const next = scheduled.shift();
        if (next) next();
        await Promise.resolve();
        await flushCryptoDeferredWrites();
    };
    return { persisted, scheduled, runScheduled };
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
        const { persisted, scheduled } = makeHost();

        queueCryptoDeferredWrite('k2', '{"a":1}');
        await flushCryptoDeferredWrites();

        expect(persisted).toEqual([]);
        /* جولةٌ أولى عند الإدراج وأخرى لإعادة المحاولة */
        expect(scheduled.length).toBeGreaterThan(0);
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
});
