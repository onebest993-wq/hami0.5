import { describe, expect, it } from 'vitest';
import { getHamiOverlayPortalRoot } from '@/app/utils/overlayPortal';

describe('getHamiOverlayPortalRoot', () => {
    it('ينشئ anchor صفرياً بدون تغطية الشاشة', () => {
        const root = getHamiOverlayPortalRoot({ id: 'hami-test-portal-root', zIndex: 230 });

        expect(root.style.width).toBe('0px');
        expect(root.style.height).toBe('0px');
        expect(root.style.pointerEvents).toBe('none');
        expect(root.style.zIndex).toBe('230');
    });

    it('لا يعيد تطبيق النمط إن كان الـ anchor جاهزاً بنفس z-index', () => {
        const root = getHamiOverlayPortalRoot({ id: 'hami-test-portal-root-once', zIndex: 229 });
        root.style.zIndex = '1';
        root.dataset.hamiPortalZ = '229';
        const again = getHamiOverlayPortalRoot({ id: 'hami-test-portal-root-once', zIndex: 229 });
        expect(again).toBe(root);
        expect(root.style.zIndex).toBe('1');
    });
});
