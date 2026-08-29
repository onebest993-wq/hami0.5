import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    applyRepositoryOpaqueChrome,
    concealRepositoryWarmShell,
    isRepositoryShellPaintedOpen,
    paintRepositoryInstantChrome,
} from '../repositoryInstantPaint';

describe('repositoryInstantPaint', () => {
    beforeEach(() => {
        document.documentElement.innerHTML = '';
        document.head.innerHTML = '';
        concealRepositoryWarmShell();
    });

    afterEach(() => {
        document.documentElement.removeAttribute('data-hami-repository-open');
    });

    it('applyRepositoryOpaqueChrome يضع علم html وtheme-color', () => {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        meta.setAttribute('content', '#111111');
        document.head.appendChild(meta);

        applyRepositoryOpaqueChrome();

        expect(document.documentElement.getAttribute('data-hami-repository-open')).toBe('1');
        expect(meta.getAttribute('content')).toBe('#0A0F1C');
        expect(isRepositoryShellPaintedOpen()).toBe(true);
    });

    it('paintRepositoryInstantChrome يكشف المودال إن وُجد', () => {
        const modal = document.createElement('div');
        modal.setAttribute('data-testid', 'smart-repository-modal');
        modal.setAttribute('aria-hidden', 'true');
        document.body.appendChild(modal);

        const painted = paintRepositoryInstantChrome();

        expect(painted).toBe(true);
        expect(modal.classList.contains('hami-repository-overlay-layer--visible')).toBe(true);
        expect(modal.style.opacity).toBe('1');
        expect(modal.getAttribute('aria-hidden')).toBe('false');
        expect(modal.hasAttribute('inert')).toBe(false);
    });

    it('paintRepositoryInstantChrome يضع العلم فقط إن لم توجد طبقة', () => {
        const painted = paintRepositoryInstantChrome();
        expect(painted).toBe(false);
        expect(document.documentElement.getAttribute('data-hami-repository-open')).toBe('1');
    });

    it('concealRepositoryWarmShell يخفّي الطبقة ويزيل العلم', () => {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        meta.setAttribute('content', '#222222');
        document.head.appendChild(meta);

        const modal = document.createElement('div');
        modal.setAttribute('data-testid', 'smart-repository-modal');
        document.body.appendChild(modal);

        paintRepositoryInstantChrome();
        concealRepositoryWarmShell();

        expect(modal.classList.contains('hami-repository-overlay-layer--visible')).toBe(false);
        expect(modal.style.visibility).toBe('hidden');
        expect(modal.hasAttribute('inert')).toBe(true);
        expect(document.documentElement.hasAttribute('data-hami-repository-open')).toBe(false);
        expect(meta.getAttribute('content')).toBe('#222222');
    });
});
