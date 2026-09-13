import { describe, expect, it } from 'vitest';
import {
    FOLLOWUP_ACTION_REGISTRY,
    FOLLOWUP_REGISTRY_ACTION_IDS,
    registryIdForHiddenPersonalKey,
} from './support/followupActionRegistry';
import { resolveFollowupHiddenActions } from './support/resolveFollowupHiddenActions';

describe('followupActionRegistry', () => {
    it('covers all hidden personal and guarantor catalog keys', () => {
        const personalIds = FOLLOWUP_ACTION_REGISTRY.filter(
            (e) => e.surface === 'hidden_personal_coercive',
        ).map((e) => e.id);
        const guarantorIds = FOLLOWUP_ACTION_REGISTRY.filter(
            (e) => e.surface === 'hidden_guarantor',
        ).map((e) => e.id);
        expect(personalIds).toHaveLength(5);
        expect(guarantorIds).toHaveLength(4);
        expect(FOLLOWUP_REGISTRY_ACTION_IDS).toContain('hidden:toggle');
        expect(FOLLOWUP_REGISTRY_ACTION_IDS).toContain('hidden:break_inventory');
    });

    it('maps registry ids for personal keys', () => {
        expect(registryIdForHiddenPersonalKey('travel_ban')).toBe('hidden_personal:travel_ban');
    });
});

/**
 * **طلبُ الكفيل المخفيّ أُلغي عمداً — وهذا الملفّ بقي على السلوك الملغى.**
 *
 * `shouldListGuarantorRequestInHiddenRequests` صار `return false` دائماً، وتعليقُه:
 * «طلب الكفيل المخفي أُلغي — الشارة من التسوية فقط». ونظيرُه
 * `shouldShowGuarantorRequestInSeizureTab`: «مسار الكفيل أصبح شارة تسوية فقط».
 * دخل الإلغاءُ في `f2fdef53` (٢٠٢٦-٠٩-٠٦)، وسُجّل هذان الاختباران ساقطَين في خطّ
 * الأساس **في اليوم نفسه** (`92b26425`) بدل أن يُحدَّثا.
 *
 * **والقدرةُ انتقلت ولم تختفِ** — وهذا ما يجعل تحديثهما صحيحاً لا رخيصاً:
 *   ١) الطلبُ صار **شارةً في التسوية** تظهر بعد إخلالٍ مسجَّل، ومُثبَتٌ بالاتّجاهين في
 *      `settlementContext.test.ts` («shows the guarantor badge once a breach is
 *      actually recorded»). وهي **سابقةٌ في هذا المستودع** لاختبارٍ ساقطٍ بالسبب نفسه
 *      حُدِّث مع اختبارٍ مضادّ (`e076ee1f`)، ومبرّرُها المكتوب: «طلب الكفيل تصعيد،
 *      والمدين الملتزم بتسوية لم يُخلّ بها في وضع سليم».
 *   ٢) **حجوزُ الكفيل الثلاثة تبقى** متى وُجدت متابعةُ كفيلٍ نشطة — والاختباران
 *      المضادّان أدناه يُسقطان الملفّ إن حُذف ذلك.
 *
 * وقيست مصفوفةُ السلوك (٢×٢×٢) قبل الكتابة: `guarantor_request` لا يظهر في أيٍّ من
 * الحالات الثماني، والحجوزُ الثلاثة تظهر **إن وفقط إن** كانت المتابعةُ نشطة — مستقلّةً
 * عن نوع الدعوى وعن كون المدين موظّفاً.
 */
describe('resolveFollowupHiddenActions', () => {
    it('employee financial lists buried personal without detention paths', () => {
        const snapshot = resolveFollowupHiddenActions({
            claimType: 'استحصال دين مالي',
            isEmployee: true,
            financialCenterTotalIqd: 400_000,
        });
        expect(snapshot.hiddenPersonalCoerciveKeys).toEqual(['forced_bring_in', 'travel_ban']);
        /* أُلغي من القائمة المخفية وانتقل شارةً إلى التسوية — انظر الوثيقة أعلاه */
        expect(snapshot.hiddenGuarantorKeys).not.toContain('guarantor_request');
        expect(snapshot.hasAnyHiddenContent).toBe(true);
        expect(snapshot.registryActionIds).toContain(registryIdForHiddenPersonalKey('forced_bring_in'));
    });

    it('active guarantor followup still surfaces all three guarantor seizures — the capability survives', () => {
        const snapshot = resolveFollowupHiddenActions({
            claimType: 'استحصال دين مالي',
            isEmployee: true,
            financialCenterTotalIqd: 400_000,
            guarantorFollowupActive: true,
        });
        expect(snapshot.hiddenGuarantorKeys).toEqual([
            'guarantor_seizure_salary',
            'guarantor_seizure_property',
            'guarantor_seizure_movable',
        ]);
        expect(snapshot.hiddenGuarantorKeys).not.toContain('guarantor_request');
    });

    it('earner financial with open personal tab hides buried personal coercive', () => {
        const snapshot = resolveFollowupHiddenActions({
            claimType: 'استحصال دين مالي',
            isEmployee: false,
            financialCenterTotalIqd: 400_000,
        });
        expect(snapshot.hiddenPersonalCoerciveKeys).toHaveLength(0);
        expect(snapshot.hasAnyHiddenContent).toBe(false);
    });

    it('deceased debtor disables hidden toggle and content', () => {
        const snapshot = resolveFollowupHiddenActions({
            claimType: 'استحصال دين مالي',
            isEmployee: false,
            activeDebtorIsDeceased: true,
            financialCenterTotalIqd: 400_000,
        });
        expect(snapshot.hiddenToggleVisible).toBe(false);
        expect(snapshot.hasAnyHiddenContent).toBe(false);
        expect(snapshot.registryActionIds).toHaveLength(0);
    });

    it('specific delivery immovable pending exposes break inventory in hidden', () => {
        const snapshot = resolveFollowupHiddenActions({
            claimType: 'تسليم شيء معين',
            isEmployee: false,
            specificDeliveryItems: [
                { id: 'sd-1', name: 'عقار', nature: 'immovable', status: 'pending' },
            ],
        });
        expect(snapshot.breakInventoryVisible).toBe(true);
        expect(snapshot.hasAnyHiddenContent).toBe(true);
        expect(snapshot.registryActionIds).toContain('hidden:break_inventory');
    });

    /**
     * **كان اسمه «treats alimony claim type as personal guarantor claim»، ولم يعد صادقاً.**
     * `isAlimonyClaim` ما زال يُحسب في الأعلام، **لكنّ مسار الكفيل لا يقرؤه**: النفقةُ
     * تُعامَل كالدَّين تماماً (مقيس). وكان التوكيد `length > 0` **بلا متابعةٍ نشطة** —
     * ولا يتحقّق ذلك إلا بـ`guarantor_request` الملغى لكلّ الدعاوى لا للنفقة وحدها.
     *
     * **فهذا التحديثُ يُطابق قراراً عامّاً موثَّقاً، ولا يُقرّر حكماً في النفقة.** وسؤالُ
     * «أيجب أن يكون لإضبارة نفقةٍ بلا تسويةٍ مدخلٌ لطلب الكفيل؟» سؤالُ منتجٍ وقانون
     * مفتوح، **مرفوعٌ إلى المالك** — ولا يُحسم باختبارٍ ساقطٍ في خطّ الأساس لم يقرأه أحد.
     */
    it('alimony surfaces guarantor seizures only through an active guarantor followup — like any claim', () => {
        const withoutFollowup = resolveFollowupHiddenActions({
            claimType: 'نفقة',
            isEmployee: true,
            financialCenterTotalIqd: 400_000,
            guarantorFollowupActive: false,
        });
        expect(withoutFollowup.hiddenGuarantorKeys).toEqual([]);

        const withFollowup = resolveFollowupHiddenActions({
            claimType: 'نفقة',
            isEmployee: true,
            financialCenterTotalIqd: 400_000,
            guarantorFollowupActive: true,
        });
        expect(withFollowup.hiddenGuarantorKeys).toEqual([
            'guarantor_seizure_salary',
            'guarantor_seizure_property',
            'guarantor_seizure_movable',
        ]);
    });
});
