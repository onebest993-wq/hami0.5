/**
 * عقد فتح إضبارة الدعوى — يُقاس بسلوكه لا بنصّه.
 *
 * العقد نفسه مكتوب في `lawsuitOpenContract.ts`: الفتح يُسخّن **chrome** وحده، ولا
 * يُعيد Prime لمساحة الدعاوى، لأن ذلك «يسرق فكّ المفاتيح وحزم الأرشيف من أوّل إطار
 * SmartFile». والفارق بين الدالّتين هو بيت القصيد:
 *
 *   prepareLawsuitDossierChrome()  →  تسخين مقاطع SmartFile فقط        (خفيف)
 *   prepareLawsuitDossierOpen()    →  ما سبق + warmLawsuitWorkspace     (ثقيل)
 *
 * ## لماذا اختبارٌ جديد بدل الذي كان
 *
 * كان العقد محروساً في `lawsuitOpenPathPerf.test.ts` بتعبير نمطيّ على نصّ الملف:
 *
 *     /export function openLawsuitDossierWithContract[\s\S]{0,400}prepareLawsuitDossierChrome\(\)/
 *
 * أي أن الاستدعاء يجب أن يقع **خلال ٤٠٠ حرف** من تعريف الدالّة. وقد صارت المسافة
 * **٤٥٥ حرفاً**، فأخفق الاختبار — **بينما العقد سليم تماماً**: الدالّة موجودة
 * وتستدعي `prepareLawsuitDossierChrome` ولا تستدعي `prepareLawsuitDossierOpen`.
 *
 * **فكان يقيس التنسيق ويُبلّغ عن العقد.** وهذا الملف يقيس العقد نفسه: مَن استُدعي
 * ومَن لم يُستدعَ — فتوسيعُ الدالّة أو إعادة ترتيبها لا تكسره، وخرقُ العقد يكسره.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prefetchOverlayEntry = vi.fn();
const prefetchModalPortal = vi.fn();
const prefetchModalPhased = vi.fn();
const prefetchPersonalStatus = vi.fn();
const warmWorkspace = vi.fn();
const tearDownFloating = vi.fn();

vi.mock('@/app/runtime/smartFileOverlayEntryLoader', () => ({
    prefetchSmartFileOverlayEntry: () => prefetchOverlayEntry(),
}));
vi.mock('@/app/components/lawyer/dashboard/smartFileModalPortalLazy', () => ({
    prefetchSmartFileModalPortal: () => prefetchModalPortal(),
}));
vi.mock('@/app/runtime/smartFileModalLoader', () => ({
    prefetchSmartFileModalPhased: () => prefetchModalPhased(),
}));
vi.mock('@/app/components/lawyer/personal-status/personalStatusDossierLazy', () => ({
    prefetchPersonalStatusDossierSurface: () => prefetchPersonalStatus(),
}));
vi.mock('@/app/runtime/lawsuitWorkspaceWarm', () => ({
    warmLawsuitWorkspace: (...args: unknown[]) => warmWorkspace(...args),
}));
vi.mock('@/app/services/litigation/tearDownLitigationFloatingState', () => ({
    tearDownLitigationFloatingState: (...args: unknown[]) => tearDownFloating(...args),
}));

/** يكفي لهبوط الاستيرادات الديناميّة لو وقعت */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('عقد فتح إضبارة الدعوى — سلوكاً', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يُسخّن مقاطع SmartFile الأربعة ثم يُنفّذ commit', async () => {
        const { openLawsuitDossierWithContract, resetLawsuitDossierSessionForTests } = await import(
            '@/app/runtime/lawsuitOpenContract'
        );
        resetLawsuitDossierSessionForTests();
        const commit = vi.fn();

        openLawsuitDossierWithContract(commit);

        expect(prefetchOverlayEntry).toHaveBeenCalled();
        expect(prefetchModalPortal).toHaveBeenCalled();
        expect(prefetchModalPhased).toHaveBeenCalled();
        expect(prefetchPersonalStatus).toHaveBeenCalled();
        expect(commit).toHaveBeenCalledTimes(1);
    });

    it('ولا يُعيد Prime لمساحة الدعاوى — هذا هو العقد', async () => {
        const { openLawsuitDossierWithContract, resetLawsuitDossierSessionForTests } = await import(
            '@/app/runtime/lawsuitOpenContract'
        );
        resetLawsuitDossierSessionForTests();

        openLawsuitDossierWithContract(vi.fn());
        await settle();

        /* لو استُبدل chrome بـ open لَاستُدعي هذا — وهو ما يكسر أوّل إطار SmartFile */
        expect(warmWorkspace).not.toHaveBeenCalled();
    });

    it('commit يقع قبل أيّ await — النقرة لا تُعلَّق على التسخين', async () => {
        const { openLawsuitDossierWithContract, resetLawsuitDossierSessionForTests } = await import(
            '@/app/runtime/lawsuitOpenContract'
        );
        resetLawsuitDossierSessionForTests();
        const commit = vi.fn();

        openLawsuitDossierWithContract(commit);

        /*
         * لا `await` بين السطرين. فوقوع commit هنا يعني أنه لم يُوضَع خلف انتظار،
         * وأن تفكيك الحالة العائمة — وهو استيراد ديناميّ — لم يهبط بعد.
         * وهذا هو «commit-first» الذي كان يُقاس بتجاور نصّي: `chrome();\s*commit()`.
         */
        expect(commit).toHaveBeenCalledTimes(1);
        expect(tearDownFloating).not.toHaveBeenCalled();

        await settle();
        expect(tearDownFloating).toHaveBeenCalled();
    });

    it('ضابط — المسار الثقيل يُسخّن المساحة فعلاً، فالفرق بين الدالّتين حقيقي', async () => {
        const { prepareLawsuitDossierOpen, resetLawsuitDossierSessionForTests } = await import(
            '@/app/runtime/lawsuitOpenContract'
        );
        resetLawsuitDossierSessionForTests();

        prepareLawsuitDossierOpen();
        await settle();

        expect(warmWorkspace).toHaveBeenCalled();
    });
});
