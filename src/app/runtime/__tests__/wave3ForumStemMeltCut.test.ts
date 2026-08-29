import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('wave3 forum stem melt cut', () => {
    /*
     * كان هذا الاختبار يشترط وجود `import('…forumApiService')` الديناميّ في
     * `lazyComponents` — أي أنه يحمي **صيغة** الاستيراد داخل `prefetchCommunityScreen`.
     * ثم ثبت أن الدالّة نفسها ميتة: لا يستوردها أحد ولا ينادي عضوها أحد، فحُذفت مع
     * ٣٩ تصديراً ميتاً آخر. فالغاية الأصلية — ألّا يشحن المحور خدمة المنتدى — صارت
     * مُحقَّقة أقوى: لا استيراد ثابتاً ولا ديناميّاً، ولا ضلع إلى `communityHubLoader`
     * كان يُغلق دائرة من سبعة ملفّات على مسار المنتدى.
     *
     * فالشرط الآن على الغاية لا على الصيغة.
     */
    it('lazyComponents لا يشحن خدمة المنتدى بأي صيغة', () => {
        const src = fs.readFileSync(path.join(root, 'src/app/utils/lazyComponents.tsx'), 'utf8');
        /*
         * على جُمَل الاستيراد لا على النصّ الخام: رأس الملفّ يشرح ما حُذف ولِمَ، فيذكر
         * `communityHubLoader` و`CommunityScreen` بالاسم. ومطابقة النصّ تعدّ التعليقَ
         * شيفرةً — وهو الخطأ نفسه الذي وقع في حارس الإغلاق فأبلغ عن استيرادات معلَّقة.
         */
        for (const spec of ['forumApiService', 'communityHubLoader', 'CommunityScreen']) {
            expect(src).not.toMatch(new RegExp(`import[^\\n]*['"][^'"\\n]*${spec}`));
            expect(src).not.toMatch(new RegExp(`import\\(\\s*['"][^'"\\n]*${spec}`));
        }
    });

    it('useLawyerDashboardNavigation يستورد من lazyComponentsIntent لا البرميل الثقيل', () => {
        const src = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerDashboardNavigation.ts'),
            'utf8',
        );
        expect(src).toContain("import('@/app/utils/lazyComponentsIntent')");
        expect(src).not.toContain("from '@/app/utils/lazyComponentsIntent'");
        expect(src).not.toContain("from '@/app/utils/lazyComponents'");
    });
});
