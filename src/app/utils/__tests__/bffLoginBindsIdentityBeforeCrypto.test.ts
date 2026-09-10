/**
 * الدخول يربط الهوية قبل أن يُهيّئ التشفير — وإلا وُلدت نافذة `FINDING-022`.
 *
 * `authLogin` تمسح جلسة Supabase المحفوظة (`:282`) ثم تنادي `bffLogin` (`:283`) ثم
 * تضبط المستخدم (`:284`). فبين المسح والضبط لا هوية يقرأها
 * `resolveLiveAuthUserIdForStorage()`، و`CryptoService.initialize()` تقع في تلك
 * الفجوة من داخل `bffLogin` نفسها. والجلسة بهوية فارغة تُعدّ **عابرة**، وسلسلة
 * الاستعادة تُعطي العابرة «السجلّ الوحيد على الجهاز» — أي مفتاح المحامي السابق.
 *
 * الحارس على العَرَض في `masterKeyOwnerIsolation`؛ وهذا يقيس منع السبب: أن يكون
 * المفتاح مربوطاً بالداخل الجديد **لحظة عودة `bffLogin`**، لا بعدها بسطر.
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let respondAs = 'lawyer-B';

vi.mock('@/app/security/wifeNativeFetch', () => ({
    getWifeNativeFetch: () => async (input: RequestInfo | URL) => {
        const body = String(input).includes('/api/auth/login')
            ? { ok: true, user: { id: respondAs, email: `${respondAs}@example.com` }, cryptoWrapCredential: `wrap-${respondAs}` }
            : { ok: true };
        return new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
    },
}));

import { CryptoService } from '@/app/services/CryptoService';
import SecureStoreService from '@/app/services/SecureStoreService';
import { getLiveAuthUserId, setLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import { LAWSUIT_FILES_STORAGE_KEY } from '@/app/services/dossierPersistence/dossierStorageKeys';

const SECRET = 'ملف-موكّل-سرّي';
const boundUserId = (): string =>
    String((CryptoService as unknown as { boundStorageUserId: unknown }).boundStorageUserId);

async function seedLawyerAThenLogOut(): Promise<string> {
    CryptoService.destroy();
    localStorage.clear();
    sessionStorage.clear();
    SecureStoreService.deleteItemSync(LAWSUIT_FILES_STORAGE_KEY);
    SecureStoreService.dropMemoryMirrorsForTests();
    await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('hami-crypto-keystore');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
    });

    setLiveAuthUserId('lawyer-A');
    await CryptoService.initialize();
    const cipherA = await CryptoService.encrypt(SECRET);
    await SecureStoreService.setItem(LAWSUIT_FILES_STORAGE_KEY, JSON.stringify({ o: 'A' }));

    /* ما يفعله authLogin قبل bffLogin: الجلسة المحفوظة تُمسح فتغيب الهوية */
    CryptoService.destroy();
    setLiveAuthUserId(null);
    return cipherA;
}

describe('bffLogin تربط الهوية قبل التشفير', () => {
    beforeEach(() => {
        respondAs = 'lawyer-B';
    });

    it('لحظة عودة bffLogin تكون الهوية مربوطة بالداخل الجديد — لا فارغة ولا ضيفاً', async () => {
        const { bffLogin, stopBffSessionKeeper } = await import('@/app/utils/bffAuthClient');
        await seedLawyerAThenLogOut();

        await bffLogin('b@example.com', 'password');
        const bound = boundUserId();
        stopBffSessionKeeper();

        expect(bound).toBe('lawyer-B');
        expect(getLiveAuthUserId()).toBe('lawyer-B');
    });

    it('ولا يفكّ الداخل الجديد نصّ الأوّل', async () => {
        const { bffLogin, stopBffSessionKeeper } = await import('@/app/utils/bffAuthClient');
        const cipherA = await seedLawyerAThenLogOut();

        await bffLogin('b@example.com', 'password');
        const reads = await CryptoService.decrypt(cipherA).then((v) => v === SECRET).catch(() => false);
        stopBffSessionKeeper();

        expect(reads).toBe(false);
    });

    /* الضابط: المنع يجب ألّا يمنع صاحب الجهاز نفسه */

    it('ضابط — المحامي نفسه يدخل فيستعيد مفتاحه أثناء الدخول لا بعده', async () => {
        const { bffLogin, stopBffSessionKeeper } = await import('@/app/utils/bffAuthClient');
        const cipherA = await seedLawyerAThenLogOut();
        respondAs = 'lawyer-A';

        await bffLogin('a@example.com', 'password');
        const bound = boundUserId();
        const reads = await CryptoService.decrypt(cipherA).then((v) => v === SECRET).catch(() => false);
        stopBffSessionKeeper();

        expect(bound).toBe('lawyer-A');
        expect(reads).toBe(true);
    });
});
