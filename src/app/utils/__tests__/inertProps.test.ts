import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { blurFocusWithin } from '@/app/utils/inertProps';

describe('blurFocusWithin', () => {
    let container: HTMLDivElement;
    let button: HTMLButtonElement;

    beforeEach(() => {
        container = document.createElement('div');
        button = document.createElement('button');
        button.textContent = 'tile';
        container.appendChild(button);
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('يزيل التركيز من عنصر داخل الحاوية', () => {
        button.focus();
        expect(document.activeElement).toBe(button);
        blurFocusWithin(container);
        expect(document.activeElement).not.toBe(button);
    });

    it('لا يؤثر إذا التركيز خارج الحاوية', () => {
        const outside = document.createElement('button');
        document.body.appendChild(outside);
        outside.focus();
        const blurSpy = vi.spyOn(button, 'blur');
        blurFocusWithin(container);
        expect(blurSpy).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(outside);
    });
});
