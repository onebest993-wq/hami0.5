/**
 * لا تُتلَف مادّة المفتاح لأننا عجزنا عن فحصها.
 *
 * كان مسارا الاستعادة القديمان يمحوان اللفّة المخزَّنة من كل `catch` خارجي — أي على
 * **أي** استثناء، بما فيه العابر: `crypto.subtle` غير متاح في سياق غير آمن لحظةً،
 * أو ضغط ذاكرة أثناء PBKDF2 بـ٦٠٠ ألف دورة.
 *
 * ومسار الجهاز **آخر** مسار في سلسلة الاستعادة. فمحوُه عند عطل عابر يعني: هذه
 * الجلسة بلا مفتاح (والسلسلة ترفض سكّ جديد إن وُجد ciphertext — وهو صواب)، ثم
 * **كل جلسة بعدها بلا مفتاح** لأن اللفّة اختفت. أي فقدانٌ نهائي وصامت لبيانات محامٍ.
 *
 * وأوضح ما قِيس أن `deriveKey` كان يُسقط اللفّة **قبل أن تُقرأ أصلاً** — إتلافُ
 * مادّةٍ لم يُنظر إليها.
 *
 * والقاعدة المطبَّقة هي قاعدة الملف نفسه في `initializeMasterKey`: «فشل الفحص ≠ لا
 * بيانات». والمحو المتعمَّد يبقى حيث ثبت العطب — مالك مختلف، أو JSON تالف، أو لفّة
 * ناقصة — وضوابط هذا الملف تحرس بقاءه.
 *
 * التفصيل: `hami-audit/FINDING-015`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CryptoService } from '@/app/services/CryptoService';

const DEVICE_KEY = 'hami-crypto-device-wrapped-key';
const CLAIMED_BY = 'hami-crypto-legacy-key-claimed-by';
const SESSION_KEY = 'hami-crypto-session-key';
const WRAPPED = JSON.stringify({ wrapped: 'AAAAAAAAAAAAAAAAAAAAAA' });

const restoreDeviceKey = () =>
    (
        CryptoService as unknown as { tryRestoreLegacyDeviceKey: () => Promise<boolean> }
    ).tryRestoreLegacyDeviceKey();

const restoreSessionKey = () =>
    (
        CryptoService as unknown as { tryRestoreKeyFromSession: () => Promise<boolean> }
    ).tryRestoreKeyFromSession();

describe('مادّة المفتاح تنجو من الفشل العابر', () => {
    beforeEach(() => {
        localStorage.removeItem(CLAIMED_BY);
        localStorage.setItem(DEVICE_KEY, WRAPPED);
        sessionStorage.setItem(SESSION_KEY, WRAPPED);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        localStorage.removeItem(DEVICE_KEY);
        localStorage.removeItem(CLAIMED_BY);
        sessionStorage.removeItem(SESSION_KEY);
    });

    it('فشل unwrapKey العابر لا يمحو لفّة الجهاز', async () => {
        vi.spyOn(crypto.subtle, 'unwrapKey').mockRejectedValue(new Error('transient'));
        await expect(restoreDeviceKey()).resolves.toBe(false);
        expect(localStorage.getItem(DEVICE_KEY)).toBe(WRAPPED);
    });

    it('فشل deriveKey العابر لا يمحو لفّةً لم تُقرأ بعد', async () => {
        vi.spyOn(crypto.subtle, 'deriveKey').mockRejectedValue(new Error('transient'));
        await expect(restoreDeviceKey()).resolves.toBe(false);
        expect(localStorage.getItem(DEVICE_KEY)).toBe(WRAPPED);
    });

    it('فشل عابر لا يمحو لفّة الجلسة كذلك', async () => {
        /* بلا اعتماد مُهيّأ يعود المسار مبكراً عند `if (!credential)` فلا يبلغ الـcatch أصلاً */
        const priv = CryptoService as unknown as { sessionWrapCredential: string | null };
        priv.sessionWrapCredential = 'test-wrap-credential';
        try {
            vi.spyOn(crypto.subtle, 'deriveKey').mockRejectedValue(new Error('transient'));
            await expect(restoreSessionKey()).resolves.toBe(false);
            expect(sessionStorage.getItem(SESSION_KEY)).toBe(WRAPPED);
        } finally {
            priv.sessionWrapCredential = null;
        }
    });

    /* ضوابط: المحو المتعمَّد حيث ثبت العطب يجب أن يبقى عاملاً */

    it('ضابط — JSON تالف يُمحى، فالعطب ثابت لا مظنون', async () => {
        localStorage.setItem(DEVICE_KEY, 'not-json{{{');
        await expect(restoreDeviceKey()).resolves.toBe(false);
        expect(localStorage.getItem(DEVICE_KEY)).toBeNull();
    });

    it('ضابط — لفّة ناقصة تُمحى', async () => {
        localStorage.setItem(DEVICE_KEY, JSON.stringify({ notWrapped: 1 }));
        await expect(restoreDeviceKey()).resolves.toBe(false);
        expect(localStorage.getItem(DEVICE_KEY)).toBeNull();
    });
});
