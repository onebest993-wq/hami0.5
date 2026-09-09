/**
 * جلسة عابرة لا ترث مفتاح حسابٍ حقيقيّ آخر — `FINDING-022`.
 *
 * قِيس على `bffLogin` الإنتاجية: الدخول يُهيّئ التشفير **قبل** أن يضبط الهوية
 * (`authProviderRuntime.ts:283` ثم `:284`)، فتقع `CryptoService.initialize()` وهوية
 * المستخدم `null`. والفارغ يُعدّ عابراً (`isTransientStorageUserId('')`)، فتسقط سلسلة
 * الاستعادة إلى «سجلٌّ واحد على الجهاز ⇒ نفس المفتاح» — وبعد خروج المحامي الأوّل يكون
 * سجلّه هو الوحيد. فيُتبنّى مفتاحه، ثم يُعاد كتابته تحت اسم الثاني عند الربط.
 *
 * والنيّة الأصلية مشروعة (`ضيف ثم حساب` لنفس الشخص) — ولذلك تبقى مضبوطة أدناه: الفرق
 * بين الحالتين مقروءٌ من اسم السجلّ نفسه، لا من حالةٍ جديدة.
 */
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { CryptoService } from '@/app/services/CryptoService';
import SecureStoreService from '@/app/services/SecureStoreService';
import { setLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
import { LAWSUIT_FILES_STORAGE_KEY } from '@/app/services/dossierPersistence/dossierStorageKeys';

const SECRET = 'ملف-موكّل-سرّي';

async function resetDevice(): Promise<void> {
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
}

/** يسجّل الدخول بالهوية المعطاة، ويمرّ بنافذة الهوية الفارغة كما يفعل مسار الدخول */
async function signInThroughIdentityWindow(uid: string): Promise<void> {
    setLiveAuthUserId(null);
    await CryptoService.initialize();
    setLiveAuthUserId(uid);
    await CryptoService.initialize();
}

async function canRead(cipher: string): Promise<boolean> {
    if (!CryptoService.hasMasterKey()) return false;
    try {
        return (await CryptoService.decrypt(cipher)) === SECRET;
    } catch {
        return false;
    }
}

async function workAs(uid: string): Promise<string> {
    setLiveAuthUserId(uid);
    await CryptoService.initialize();
    const cipher = await CryptoService.encrypt(SECRET);
    await SecureStoreService.setItem(LAWSUIT_FILES_STORAGE_KEY, JSON.stringify({ o: uid }));
    return cipher;
}

describe('عزل مفتاح المحامي عن محامٍ آخر على الجهاز نفسه', () => {
    it('محامٍ ثانٍ لا يرث مفتاح الأوّل عبر نافذة الهوية', async () => {
        await resetDevice();
        const cipherA = await workAs('lawyer-A');
        expect(CryptoService.hasMasterKey()).toBe(true);

        CryptoService.destroy();
        await signInThroughIdentityWindow('lawyer-B');

        await expect(canRead(cipherA)).resolves.toBe(false);
    });

    it('ولا يُكتب مفتاح الأوّل على القرص تحت اسم الثاني', async () => {
        await resetDevice();
        await workAs('lawyer-A');

        CryptoService.destroy();
        await signInThroughIdentityWindow('lawyer-B');

        const rows = await (
            CryptoService as unknown as {
                readAllMasterKeyRecords: () => Promise<Array<{ id?: string }>>;
            }
        ).readAllMasterKeyRecords();
        expect(rows.map((r) => String(r?.id ?? '')).sort()).toEqual(['master-key-v3:u:lawyer-A']);
    });

    /*
     * وسجلّ الضيافة لا يُترك خلفه بعد أن يتبنّاه حسابٌ حقيقيّ: كان يبقى على القرص
     * حاملاً ما صار مفتاح الأوّل، فيرثه الثاني عبر النافذة نفسها. والقاعدة مطبَّقة
     * أصلاً على السجلّ المشترك الإرثيّ في `initializeInner` — وهذه هي هي.
     */
    it('ولا يرث الثاني مفتاحاً عبر سجلّ ضيافةٍ تبنّاه الأوّل', async () => {
        await resetDevice();
        const cipherGuest = await workAs(GUEST_LAWYER_ID);

        CryptoService.destroy();
        await signInThroughIdentityWindow('lawyer-A');
        await expect(canRead(cipherGuest)).resolves.toBe(true);

        CryptoService.destroy();
        await signInThroughIdentityWindow('lawyer-B');
        await expect(canRead(cipherGuest)).resolves.toBe(false);
    });

    /* ضوابط — ما كان السلوك القائم يحميه، ويجب أن يبقى عاملاً */

    it('ضابط — ضيفٌ ثم حساب لنفس الشخص: المفتاح ينتقل ولا يضيع عمل الضيافة', async () => {
        await resetDevice();
        const cipherGuest = await workAs(GUEST_LAWYER_ID);
        expect(CryptoService.hasMasterKey()).toBe(true);

        CryptoService.destroy();
        await signInThroughIdentityWindow('lawyer-A');

        await expect(canRead(cipherGuest)).resolves.toBe(true);
    });

    it('ضابط — المحامي يخرج ثم يعود: يستعيد مفتاحه ويقرأ إضباراته', async () => {
        await resetDevice();
        const cipherA = await workAs('lawyer-A');

        CryptoService.destroy();
        await signInThroughIdentityWindow('lawyer-A');

        await expect(canRead(cipherA)).resolves.toBe(true);
    });

    /*
     * الضابط الذي يحرس الحذف نفسه. `tryRestoreClaimedMasterKeyWhenTransient` كانت
     * تخدم جهازاً إرثياً عليه `claimed-by`: تُعطي الجلسة العابرة مفتاح صاحب الادّعاء.
     * وحُذفت لأن ذلك هو التسريب حين يكون الداخل شخصاً آخر. وما كانت تشتريه — أن يقرأ
     * صاحب الجهاز مفتاحه قبل أن تُحلّ الهوية — يشتريه الرابط الأوّل من السلسلة بمجرّد
     * أن تستقرّ. وهذا يُقاس هنا لا يُفترض.
     */
    it('ضابط — جهازٌ عليه claimed-by: صاحبه يعود ويقرأ، والآخر لا', async () => {
        await resetDevice();
        const cipherA = await workAs('lawyer-A');
        localStorage.setItem('hami-crypto-legacy-key-claimed-by', 'lawyer-A');

        CryptoService.destroy();
        setLiveAuthUserId(null);
        await CryptoService.initialize();
        expect(CryptoService.hasMasterKey()).toBe(false);

        setLiveAuthUserId('lawyer-A');
        await CryptoService.initialize();
        await expect(canRead(cipherA)).resolves.toBe(true);

        CryptoService.destroy();
        await signInThroughIdentityWindow('lawyer-B');
        await expect(canRead(cipherA)).resolves.toBe(false);
    });

    it('ضابط — عودة الأوّل بعد أن دخل الثاني وخرج', async () => {
        await resetDevice();
        const cipherA = await workAs('lawyer-A');

        CryptoService.destroy();
        await signInThroughIdentityWindow('lawyer-B');
        CryptoService.destroy();
        await signInThroughIdentityWindow('lawyer-A');

        await expect(canRead(cipherA)).resolves.toBe(true);
    });
});
