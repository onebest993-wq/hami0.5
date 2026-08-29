import { describe, expect, it } from 'vitest';
import {
    assertLawyerIdentityImagesReady,
    compactIdentityPreviewForSignup,
    isIdentityImageDataUrl,
} from '@/app/services/auth/identityImageDataUrl';

const jpeg = `data:image/jpeg;base64,${'A'.repeat(80)}`;
const heic = `data:image/heic;base64,${'A'.repeat(80)}`;

describe('identityImageDataUrl', () => {
    it('يقبل jpeg/png ويرفض HEIC والنصوص', () => {
        expect(isIdentityImageDataUrl(jpeg)).toBe(true);
        expect(isIdentityImageDataUrl(`data:image/png;base64,${'B'.repeat(80)}`)).toBe(true);
        expect(isIdentityImageDataUrl(heic)).toBe(false);
        expect(isIdentityImageDataUrl('')).toBe(false);
        expect(isIdentityImageDataUrl('[omitted]')).toBe(false);
    });

    it('يقص معاينة التسجيل دون كسر الصيغة', () => {
        const huge = `data:image/jpeg;base64,${'C'.repeat(80_000)}`;
        const compact = compactIdentityPreviewForSignup(huge);
        expect(compact).toBeTruthy();
        expect(String(compact).length).toBeLessThanOrEqual(12_000);
        expect(isIdentityImageDataUrl(compact)).toBe(true);
    });

    it('يرفض تخطّي الوجه أو الظهر', () => {
        expect(assertLawyerIdentityImagesReady(null, jpeg)).toMatch(/وجه/);
        expect(assertLawyerIdentityImagesReady(jpeg, null)).toMatch(/ظهر/);
        expect(assertLawyerIdentityImagesReady(jpeg, jpeg)).toBeNull();
    });
});
