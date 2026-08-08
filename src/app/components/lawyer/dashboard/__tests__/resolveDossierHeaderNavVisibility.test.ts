import { describe, expect, it } from 'vitest';
import { resolveDossierHeaderNavVisibility } from '../resolveDossierHeaderNavVisibility';

describe('resolveDossierHeaderNavVisibility', () => {
    it('يعرض زر الإغلاق فقط في وضع النافذة', () => {
        expect(resolveDossierHeaderNavVisibility(false)).toEqual({
            showBack: false,
            showExit: true,
        });
    });

    it('يعرض زر الرجوع فقط عند التنقل المتداخل', () => {
        expect(resolveDossierHeaderNavVisibility(true)).toEqual({
            showBack: true,
            showExit: false,
        });
    });
});
