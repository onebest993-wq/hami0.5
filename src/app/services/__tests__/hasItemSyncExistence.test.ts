/**
 * الوجود لا يُستنتج من تعذّر القراءة المتزامنة.
 *
 * `getItemSync` تُرجع `null` لسببين متمايزين: لا قيمة، أو قيمة مشفّرة وذاكرة الفكّ
 * باردة. وذاكرة الفكّ LRU بحدّ ٦٤، فالبرود حالة طبيعية لا حافّة نادرة.
 *
 * ومن خلط السببين — كما كان `storageCache.get` — استنتج حذفاً لم يقع، فمحا مدخله
 * وأعلن الغياب على بيانات قائمة سليمة. `hasItemSync` تفصل السؤالين.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';

const SENSITIVE_KEY = 'wife_probe_existence';
const PLAIN_KEY = 'hami:plain:probe:existence';

describe('hasItemSync يفصل الغياب عن تعذّر الفكّ', () => {
    beforeEach(async () => {
        await SecureStoreService.deleteItem(SENSITIVE_KEY);
        await SecureStoreService.deleteItem(PLAIN_KEY);
    });

    it('المفتاح غير الموجود: كلتاهما تُنكره', () => {
        expect(SecureStoreService.getItemSync('hami:absent:key')).toBeNull();
        expect(SecureStoreService.hasItemSync('hami:absent:key')).toBe(false);
    });

    it('المفتاح العاديّ الموجود: كلتاهما تُثبته', async () => {
        await SecureStoreService.setItem(PLAIN_KEY, 'قيمة صريحة');
        expect(SecureStoreService.getItemSync(PLAIN_KEY)).toBe('قيمة صريحة');
        expect(SecureStoreService.hasItemSync(PLAIN_KEY)).toBe(true);
    });

    it('المفتاح الحسّاس بعد برود ذاكرة الفكّ: الوجود يبقى مُثبتاً', async () => {
        await SecureStoreService.setItem(SENSITIVE_KEY, JSON.stringify({ secret: 'محضر جلسة' }));

        /*
         * إغراق الذاكرة يطرد نصّ المفتاح الحسّاس — ٦٤ هو الحدّ، فما فوقه يكفي.
         * هذا ما يحدث لمحامٍ لديه عشرات الإضابير: لا حالة اصطناعية.
         */
        for (let i = 0; i < 80; i++) {
            await SecureStoreService.setItem(`hami:flood:${i}`, `v${i}`);
        }

        // القراءة المتزامنة تتعذّر — ولا فكّ تشفير في مسار متزامن
        expect(SecureStoreService.getItemSync(SENSITIVE_KEY)).toBeNull();

        // والوجود مع ذلك حقّ: القيمة على القرص لم تُمسّ
        expect(SecureStoreService.hasItemSync(SENSITIVE_KEY)).toBe(true);

        // والدليل القاطع: القراءة غير المتزامنة تُرجعها كما هي
        const restored = await SecureStoreService.getItem(SENSITIVE_KEY);
        expect(restored).toBe(JSON.stringify({ secret: 'محضر جلسة' }));

        for (let i = 0; i < 80; i++) {
            await SecureStoreService.deleteItem(`hami:flood:${i}`);
        }
    });
});
