import { afterEach, describe, expect, it, vi } from 'vitest';
import { startBootProgressMotion } from '@/app/bootstrap/bootProgressMotion';

describe('bootProgressMotion', () => {
    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('يحرّك شريط الإقلاع عبر left حتى لو أُوقف transform', () => {
        vi.useFakeTimers();
        const fill = document.createElement('span');
        fill.className = 'hami-boot-progress-fill';
        fill.style.transform = 'translate3d(-110%,0,0)';
        document.body.appendChild(fill);

        const stop = startBootProgressMotion(document.body);
        expect(fill.style.animation).toBe('none');
        expect(fill.style.transform).toBe('none');
        expect(fill.style.left).toMatch(/%/);

        vi.advanceTimersByTime(64);
        expect(fill.style.left).toMatch(/%/);

        stop();
    });
});
