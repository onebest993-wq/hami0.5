/**
 * المسار المباشر (بلا BFF) لا نافذةَ هويةٍ فيه — وهذا يُقاس لا يُستنتج.
 *
 * في وضع BFF تمسح `authLogin` الجلسة المحفوظة (`:282`) قبل أن تنادي الخادم، فتغيب
 * الهوية حتى `setUser` (`:284`) — وتلك نافذة `FINDING-022`، وأُغلقت في `bffAuthClient`.
 * وفي المسار المباشر لا تُمسح: `signInWithPassword` تكتب جلسة Supabase في
 * `localStorage`، و`resolveLiveAuthUserIdForStorage` ترتدّ إليها حين تكون المرآة
 * الحيّة فارغة. فالهوية محلولةٌ قبل أن يلمسها `AuthContext`.
 *
 * وقد كتبتُ ذلك أوّلاً استنتاجاً من قراءة السلسلة. **البند ٣ يقدّم القياس على
 * الاستنتاج**، وهذا هو القياس. وهو حارسٌ كذلك: من يُسقط الارتداد إلى الجلسة المحفوظة
 * يفتح النافذة في المسار المباشر بلا أن يمسّ سطراً في مسار الدخول.
 */
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { CryptoService } from '@/app/services/CryptoService';
import SecureStoreService from '@/app/services/SecureStoreService';
import { setLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import { LAWSUIT_FILES_STORAGE_KEY } from '@/app/domain/dossier/dossierStorageKeys';

const SECRET = 'ملف-موكّل-سرّي';
const boundUserId = (): string =>
    String((CryptoService as unknown as { boundStorageUserId: unknown }).boundStorageUserId);

/** ما تكتبه `signInWithPassword` فعلاً: مفتاحٌ ينتهي بـ`-auth-token` فيه الجلسة */
function persistSupabaseSession(userId: string): void {
    localStorage.setItem(
        'sb-project-auth-token',
        JSON.stringify({
            access_token: `token-${userId}`,
            refresh_token: `refresh-${userId}`,
            user: { id: userId, email: `${userId}@example.com` },
        }),
    );
}

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

    CryptoService.destroy();
    setLiveAuthUserId(null);
    return cipherA;
}

describe('الدخول المباشر عبر Supabase — لا نافذة هوية', () => {
    it('الهوية محلولةٌ من الجلسة المحفوظة قبل أن يضبطها AuthContext', async () => {
        const cipherA = await seedLawyerAThenLogOut();

        /* هذا كل ما يقع قبل setUser في المسار المباشر */
        persistSupabaseSession('lawyer-B');
        await CryptoService.initialize();

        expect(boundUserId()).toBe('lawyer-B');
        await expect(
            CryptoService.decrypt(cipherA).then((v) => v === SECRET).catch(() => false),
        ).resolves.toBe(false);
    });

    it('ضابط — صاحب الجهاز يعود بالمسار نفسه فيستعيد مفتاحه', async () => {
        const cipherA = await seedLawyerAThenLogOut();

        persistSupabaseSession('lawyer-A');
        await CryptoService.initialize();

        expect(boundUserId()).toBe('lawyer-A');
        await expect(
            CryptoService.decrypt(cipherA).then((v) => v === SECRET).catch(() => false),
        ).resolves.toBe(true);
    });
});
