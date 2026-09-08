/**
 * عقد التخزين الدائم.
 *
 * أصلٌ لم يطلب الدوام يبقى «أفضل جهد»، وهي الفئة التي يُخليها المحرّك أولاً تحت
 * ضغط تخزين الجهاز. وما يُخلى هنا يشمل `hami-crypto-keystore` — المفتاح الوحيد
 * الذي يفكّ الأرشيف السحابي. فالطلب ليس تحسيناً، بل حاجز فقدان بيانات.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ensurePersistentStorage,
    resetPersistentStorageGrantForTests,
} from '../persistentStorageGrant';

type StorageStub = {
    persist?: () => Promise<boolean>;
    persisted?: () => Promise<boolean>;
    estimate?: () => Promise<{ usage?: number; quota?: number }>;
};

function stubStorage(stub: StorageStub | undefined): void {
    Object.defineProperty(navigator, 'storage', {
        value: stub,
        configurable: true,
        writable: true,
    });
}

describe('ensurePersistentStorage', () => {
    let warn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        resetPersistentStorageGrantForTests();
        warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        resetPersistentStorageGrantForTests();
        warn.mockRestore();
    });

    it('يمنح الدوام ويُعلن النتيجة للفحص عن بُعد', async () => {
        const persist = vi.fn(async () => true);
        stubStorage({ persist, persisted: async () => false });

        const report = await ensurePersistentStorage();

        expect(report.outcome).toBe('granted');
        expect(persist).toHaveBeenCalledTimes(1);
        expect(window.__hamiStoragePersistence__?.outcome).toBe('granted');
    });

    /* أصلٌ مُنح سابقاً: طلبٌ ثانٍ لا يغيّر شيئاً ويستهلك دورة */
    it('لا يُعيد الطلب على أصل دائم أصلاً', async () => {
        const persist = vi.fn(async () => true);
        stubStorage({ persist, persisted: async () => true });

        const report = await ensurePersistentStorage();

        expect(report.outcome).toBe('already-persistent');
        expect(persist).not.toHaveBeenCalled();
    });

    /*
     * الحالة التي تهمّ فعلاً: الرفض يعني أن البيانات قابلة للإخلاء. يجب ألّا
     * يمرّ صامتاً، ويجب أن يحمل الحصّة لأن الرفض وحده لا يقول كم بقي من هامش.
     */
    it('يُصرّح بالرفض ويقيس الحصّة بدل أن يصمت', async () => {
        stubStorage({
            persist: async () => false,
            persisted: async () => false,
            estimate: async () => ({ usage: 52_428_800, quota: 104_857_600 }),
        });

        const report = await ensurePersistentStorage();

        expect(report.outcome).toBe('denied');
        expect(report.usageBytes).toBe(52_428_800);
        expect(report.quotaBytes).toBe(104_857_600);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0]?.[0])).toContain('50MB من 100MB');
    });

    /* مسار إقلاع: لا يرمي مهما فعل المحرّك */
    it('لا يرمي حين يفشل persist', async () => {
        stubStorage({
            persist: async () => {
                throw new Error('quota subsystem down');
            },
            persisted: async () => false,
        });

        await expect(ensurePersistentStorage()).resolves.toEqual({ outcome: 'error' });
    });

    it('لا يرمي حين تغيب الواجهة كلياً', async () => {
        stubStorage(undefined);
        await expect(ensurePersistentStorage()).resolves.toEqual({ outcome: 'unsupported' });
    });

    it('يتحمّل غياب estimate وحدها', async () => {
        stubStorage({ persist: async () => false, persisted: async () => false });

        const report = await ensurePersistentStorage();

        expect(report.outcome).toBe('denied');
        expect(report.usageBytes).toBeUndefined();
        expect(warn).toHaveBeenCalledTimes(1);
    });

    /* الإقلاع قد يستدعيه من أكثر من مسار — طلب واحد لا أكثر */
    it('يطلب مرة واحدة مهما تكرّر الاستدعاء', async () => {
        const persist = vi.fn(async () => true);
        stubStorage({ persist, persisted: async () => false });

        const [a, b, c] = await Promise.all([
            ensurePersistentStorage(),
            ensurePersistentStorage(),
            ensurePersistentStorage(),
        ]);

        expect(persist).toHaveBeenCalledTimes(1);
        expect(a).toBe(b);
        expect(b).toBe(c);
    });
});
