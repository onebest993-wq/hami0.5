/**
 * «هل استقرّ الترطيب من القرص؟» — سؤالٌ كان يُجاب عنه بـ`true` دائماً تحت الاختبار.
 *
 * `isDiskHydrationSettledSync` تحرس مساراً أدّى إلى فقدان بيانات فعلاً. وتعليق
 * `lawsuitSegmentStorage.ts` يسمّيه: «لا تكتب مقاطع من مرآة قديمة قبل أن تُملأ
 * مرآة IndexedDB — **هذا كان مسار اختفاء الأحوال**». فقبل استقرار الترطيب، لا
 * يعني `hasItemSync=false` أن المستخدم جديد؛ وقد يمسح كتابةٌ من مرآة قديمة إضبارةً
 * أُنشئت ولم تُفلَش بعد.
 *
 * وثلاثة مواضع تتوقّف عليها: `lawsuitFilesRepository` و`lawsuitSegmentStorage`
 * (كلاهما يمتنع عن الكتابة) و`lawsuitFilesHydrateCycle` (ينتظر المفاتيح).
 *
 * وكان أول سطر فيها `if (import.meta.env.VITEST) return true;` — **فالفرع الحامي
 * لم يكن يُنفَّذ في أيّ اختبار قطّ**، وكذلك فرع الانتظار في دورة الترطيب. أي أن
 * حارس عطل فقدان بيانات معروف كان بلا تغطية لسلوكه الحارس.
 *
 * وتبيّن أن الاستثناء لم يكن ضرورياً: `webInfraReady` تُضبط `true` تحت الاختبار
 * أيضاً داخل `ensureWebInfrastructureReady` قبل أوّل `await`، فأوّل تعامل مع
 * التخزين يجعلها مستقرّة. فأُزيل الاستثناء وصار الحارس يقول الصدق في الحالتين.
 *
 * **ترتيب الحالات هنا مقصود:** الأولى يجب أن تسبق أيّ لمسة للتخزين في هذا الملف.
 */
import { describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';

describe('صدق حارس استقرار الترطيب', () => {
    it('يقول «لم تستقرّ» قبل أن تُهيَّأ البنية — وهو ما كان يستحيل قياسه', () => {
        expect(SecureStoreService.isDiskHydrationSettledSync()).toBe(false);
    });

    it('ثم يقول «استقرّت» بعد أوّل تعامل مع التخزين', () => {
        /* `ensureBootShellReady` لا تكفي — تضبط قشرة الإقلاع لا بنية الويب */
        SecureStoreService.getItemSync('probe:hydration');
        expect(SecureStoreService.isDiskHydrationSettledSync()).toBe(true);
    });
});
