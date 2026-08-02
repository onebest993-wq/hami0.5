import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    applyRepositoryOpaqueChrome,
    concealRepositoryWarmShell,
    isRepositoryShellPaintedOpen,
    markRepositoryShellOpenCommitted,
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

        markRepositoryShellOpenCommitted(true);
        applyRepositoryOpaqueChrome();

        expect(document.documentElement.getAttribute('data-hami-repository-open')).toBe('1');
        expect(meta.getAttribute('content')).toBe('#050810');
        expect(isRepositoryShellPaintedOpen()).toBe(true);
    });

    it('paintRepositoryInstantChrome يكشف instant shell إن وُجد', () => {
        const shell = document.createElement('div');
        shell.setAttribute('data-testid', 'smart-repository-instant-shell');
        shell.setAttribute('aria-hidden', 'true');
        document.body.appendChild(shell);

        markRepositoryShellOpenCommitted(true);
        const painted = paintRepositoryInstantChrome();

        expect(painted).toBe(true);
        expect(shell.classList.contains('hami-repository-overlay-layer--visible')).toBe(true);
        expect(shell.style.opacity).toBe('1');
        expect(shell.getAttribute('aria-hidden')).toBeNull();
    });

    it('paintRepositoryInstantChrome يفضّل modal على instant shell', () => {
        const instant = document.createElement('div');
        instant.setAttribute('data-testid', 'smart-repository-instant-shell');
        document.body.appendChild(instant);

        const modal = document.createElement('div');
        modal.setAttribute('data-testid', 'smart-repository-modal');
        modal.setAttribute('aria-hidden', 'true');
        document.body.appendChild(modal);

        markRepositoryShellOpenCommitted(true);
        paintRepositoryInstantChrome();

        expect(modal.classList.contains('hami-repository-overlay-layer--visible')).toBe(true);
        expect(instant.classList.contains('hami-repository-overlay-layer--visible')).toBe(false);
    });

    it('concealRepositoryWarmShell يخفّي الطبقة ويزيل العلم', () => {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        meta.setAttribute('content', '#222222');
        document.head.appendChild(meta);

        const shell = document.createElement('div');
        shell.setAttribute('data-testid', 'smart-repository-instant-shell');
        document.body.appendChild(shell);

        markRepositoryShellOpenCommitted(true);
        paintRepositoryInstantChrome();
        concealRepositoryWarmShell();

        expect(shell.classList.contains('hami-repository-overlay-layer--visible')).toBe(false);
        expect(shell.style.visibility).toBe('hidden');
        expect(document.documentElement.hasAttribute('data-hami-repository-open')).toBe(false);
        expect(meta.getAttribute('content')).toBe('#222222');
    });
});
