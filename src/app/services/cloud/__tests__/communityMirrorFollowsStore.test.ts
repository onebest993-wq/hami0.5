import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { CommunityDB } from '@/app/services/cloud/lawyerCommunityCloud';

/*
 * سلسلة الاختفاء التي تغلقها هذه الحالة:
 * قراءة تتجاوز مهلتها → `[]` → حفظة كانت تكتب `[]` في مرآة localStorage → حارس
 * المسح يرفض الكتابة على القرص فتبقى المنشورات سليمة هناك → لكن المرآة تُقرأ أوّلاً
 * في كل مرّة بعدها. الحفظ الآن يكتب SecureStore ويمحو المرآة — لا تظليل صريح.
 *
 * الحذف المقصود لا يمرّ من هنا: المحذوفات تُرشَّح من قائمة معرّفات مستقلّة.
 */

const COMMUNITY_LOCAL_KEY = 'hami:community:posts:v1';

function post(id: string) {
    return {
        id,
        authorId: 'lawyer-1',
        authorName: 'محامٍ',
        content: `منشور ${id}`,
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: [],
    };
}

describe('مرآة المنتدى تتبع المخزن المحمي', () => {
    beforeEach(async () => {
        for (const key of SecureStoreService.listKeysSync()) {
            await SecureStoreService.deleteItem(key);
        }
        localStorage.clear();
    });

    it('لا تُبقي المرآة فارغة بعد أن يرفض الحارس التفريغ', async () => {
        const stored = JSON.stringify([post('a'), post('b')]);
        await SecureStoreService.setItem(COMMUNITY_LOCAL_KEY, stored);

        // حفظة فارغة كالتي تنتج عن قراءة فاشلة
        await CommunityDB.persistPostsBatch([]);
        await new Promise((resolve) => setTimeout(resolve, 0));

        // القرص لم يُمسّ — الحارس رفض
        const onDisk = await SecureStoreService.getItem(COMMUNITY_LOCAL_KEY);
        expect(JSON.parse(String(onDisk))).toHaveLength(2);

        // لا مرآة صريحة تُظلّ القرص
        expect(localStorage.getItem(COMMUNITY_LOCAL_KEY)).toBeNull();

        // فالمنشورات تُقرأ فعلاً
        expect(await CommunityDB.listPosts()).toHaveLength(2);
    });

    it('تمرّ الحفظة الحقيقية إلى SecureStore بلا مرآة صريحة', async () => {
        await CommunityDB.persistPostsBatch([post('a'), post('b')]);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(localStorage.getItem(COMMUNITY_LOCAL_KEY)).toBeNull();
        expect(JSON.parse(String(SecureStoreService.getItemSync(COMMUNITY_LOCAL_KEY)))).toHaveLength(2);
        expect(await CommunityDB.listPosts()).toHaveLength(2);
    });
});
