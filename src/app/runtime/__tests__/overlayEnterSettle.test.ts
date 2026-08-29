import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    armOverlayEnterSettle,
    clearOverlayEnterSettle,
} from '@/app/runtime/overlayEnterSettle';

function nextFrame(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => resolve());
    });
}

describe('overlayEnterSettle', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-hami-test-enter');
        document.body.innerHTML = '';
    });

    afterEach(() => {
        clearOverlayEnterSettle('data-hami-test-enter');
    });

    it('يثبت السمة ثم يزيلها بعد وجود العنصر وإطار', async () => {
        const el = document.createElement('div');
        el.id = 'ready';
        document.body.appendChild(el);

        armOverlayEnterSettle('data-hami-test-enter', () => document.getElementById('ready'));
        expect(document.documentElement.getAttribute('data-hami-test-enter')).toBe('1');

        await nextFrame();
        await nextFrame();
        expect(document.documentElement.hasAttribute('data-hami-test-enter')).toBe(false);
    });

    it('clear يلغي التسوية المعلقة', async () => {
        armOverlayEnterSettle('data-hami-test-enter', () => null);
        expect(document.documentElement.getAttribute('data-hami-test-enter')).toBe('1');
        clearOverlayEnterSettle('data-hami-test-enter');
        expect(document.documentElement.hasAttribute('data-hami-test-enter')).toBe(false);
        await nextFrame();
        await nextFrame();
        expect(document.documentElement.hasAttribute('data-hami-test-enter')).toBe(false);
    });
});
