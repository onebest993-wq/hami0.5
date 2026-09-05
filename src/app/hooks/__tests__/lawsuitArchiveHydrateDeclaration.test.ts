import { describe, expect, it } from 'vitest';
import { resolveLawsuitArchiveHydrateDeclaration } from '@/app/hooks/lawsuitArchiveHydrateDeclaration';

describe('resolveLawsuitArchiveHydrateDeclaration', () => {
    it('سجلات ظاهرة → جاهز بلا حجب فكّ', () => {
        expect(
            resolveLawsuitArchiveHydrateDeclaration({
                hasVisibleRecords: true,
                mayDeclareHydrated: false,
                decryptBlocked: true,
                stillColdAfterHydrate: true,
                diskHydrationSettled: false,
            }),
        ).toEqual({ declareHydrated: true, markDecryptBlocked: false });
    });

    it('الإعلان الطبيعي يمرّر حجب الفكّ إن وُجد', () => {
        expect(
            resolveLawsuitArchiveHydrateDeclaration({
                hasVisibleRecords: false,
                mayDeclareHydrated: true,
                decryptBlocked: true,
                stillColdAfterHydrate: false,
                diskHydrationSettled: true,
            }),
        ).toEqual({ declareHydrated: true, markDecryptBlocked: true });
    });

    it('حجب فكّ معروف → جاهز حتى لو المِسنَنة ترفض الإعلان', () => {
        expect(
            resolveLawsuitArchiveHydrateDeclaration({
                hasVisibleRecords: false,
                mayDeclareHydrated: false,
                decryptBlocked: true,
                stillColdAfterHydrate: true,
                diskHydrationSettled: false,
            }),
        ).toEqual({ declareHydrated: true, markDecryptBlocked: true });
    });

    it('القرص استقرّ وما زال بارداً → جاهز مع حجب فكّ بدل فتحات دائمة', () => {
        expect(
            resolveLawsuitArchiveHydrateDeclaration({
                hasVisibleRecords: false,
                mayDeclareHydrated: false,
                decryptBlocked: false,
                stillColdAfterHydrate: true,
                diskHydrationSettled: true,
            }),
        ).toEqual({ declareHydrated: true, markDecryptBlocked: true });
    });

    it('القرص استقرّ وفارغ حقاً → جاهز بلا حجب (حالة لا توجد ملفات)', () => {
        expect(
            resolveLawsuitArchiveHydrateDeclaration({
                hasVisibleRecords: false,
                mayDeclareHydrated: false,
                decryptBlocked: false,
                stillColdAfterHydrate: false,
                diskHydrationSettled: true,
            }),
        ).toEqual({ declareHydrated: true, markDecryptBlocked: false });
    });

    it('القرص لم يستقرّ بعد → لا إعلان (ما زال انتظاراً شرعياً)', () => {
        expect(
            resolveLawsuitArchiveHydrateDeclaration({
                hasVisibleRecords: false,
                mayDeclareHydrated: false,
                decryptBlocked: false,
                stillColdAfterHydrate: true,
                diskHydrationSettled: false,
            }),
        ).toEqual({ declareHydrated: false, markDecryptBlocked: false });
    });
});
