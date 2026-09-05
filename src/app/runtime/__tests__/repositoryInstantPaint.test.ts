import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
    applyRepositoryOpaqueChrome,
    concealRepositoryWarmShell,
    isRepositoryShellPaintedOpen,
    paintRepositoryInstantChrome,
    removeRepositoryInstantChrome,
    REPOSITORY_INSTANT_CHROME_ID,
} from '../repositoryInstantPaint';

describe('repositoryInstantPaint', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-hami-repository-open');
        document.documentElement.removeAttribute('data-hami-repository-enter');
        document.body.replaceChildren();
        document.getElementById('hami-overlay-portal')?.remove();
        concealRepositoryWarmShell();
    });

    afterEach(() => {
        concealRepositoryWarmShell();
        removeRepositoryInstantChrome();
        document.getElementById('hami-overlay-portal')?.remove();
        document.documentElement.removeAttribute('data-hami-repository-open');
    });

    it('applyRepositoryOpaqueChrome يضع علم html وtheme-color وقشرة فورية', () => {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        meta.setAttribute('content', '#111111');
        document.head.appendChild(meta);

        applyRepositoryOpaqueChrome();

        expect(document.documentElement.getAttribute('data-hami-repository-open')).toBe('1');
        expect(meta.getAttribute('content')).toBe('#0A0F1C');
        expect(isRepositoryShellPaintedOpen()).toBe(true);
        const chrome = document.getElementById(REPOSITORY_INSTANT_CHROME_ID);
        expect(chrome).not.toBeNull();
        expect(chrome?.textContent).toContain('المستودع');
        expect(chrome?.textContent).not.toContain('بحث في المستودع');
        expect(chrome?.textContent).not.toContain('إضافة');
        expect(chrome?.textContent).not.toContain('العام');
        expect(chrome?.querySelector('[data-testid="repository-instant-toolbar"]')).toBeNull();
        expect(chrome?.innerHTML).not.toContain('hami-repo-card');
        expect(chrome?.querySelector('[data-testid="repository-instant-close"]')).not.toBeNull();
        expect(chrome?.className).toContain('z-[219]');
        expect(chrome?.className).toContain('pointer-events-none');
        expect(chrome?.className).not.toContain('pointer-events-auto');
        expect(chrome?.className).not.toContain('z-[220]');
        expect(chrome?.parentElement).toBe(document.body);
        expect(chrome?.style.pointerEvents).toBe('none');
        expect(chrome?.style.getPropertyPriority('pointer-events')).toBe('important');
        expect(chrome?.style.zIndex).toBe('219');
        expect(chrome?.querySelector('[data-testid="repository-instant-close"]')?.className).toContain(
            'pointer-events-auto',
        );
    });

    it('ينقل قشرة عالقة داخل بوابة overlay إلى document.body', () => {
        const portal = document.createElement('div');
        portal.id = 'hami-overlay-portal';
        document.body.appendChild(portal);
        const stale = document.createElement('div');
        stale.id = REPOSITORY_INSTANT_CHROME_ID;
        stale.className = 'pointer-events-auto z-[220]';
        portal.appendChild(stale);

        applyRepositoryOpaqueChrome();

        const chrome = document.getElementById(REPOSITORY_INSTANT_CHROME_ID);
        expect(chrome?.parentElement).toBe(document.body);
        expect(portal.contains(chrome)).toBe(false);
        expect(chrome?.className).toContain('z-[219]');
        expect(chrome?.className).toContain('pointer-events-none');
        expect(chrome?.className).not.toContain('z-[220]');
    });

    it('paintRepositoryInstantChrome يكشف المودال الظاهر ويزيل القشرة', () => {
        const modal = document.createElement('div');
        modal.setAttribute('data-testid', 'smart-repository-modal');
        modal.classList.add('hami-repository-overlay-layer--visible');
        modal.setAttribute('aria-hidden', 'false');
        document.body.appendChild(modal);

        const painted = paintRepositoryInstantChrome();

        expect(painted).toBe(true);
        expect(modal.classList.contains('hami-repository-overlay-layer--visible')).toBe(true);
        expect(modal.style.opacity).toBe('1');
        expect(modal.getAttribute('aria-hidden')).toBe('false');
        expect(modal.hasAttribute('inert')).toBe(false);
        expect(document.getElementById(REPOSITORY_INSTANT_CHROME_ID)).toBeNull();
        expect(document.documentElement.hasAttribute('data-hami-repository-enter')).toBe(false);
    });

    it('paintRepositoryInstantChrome يضع القشرة إن كانت الطبقة مخفية', () => {
        const modal = document.createElement('div');
        modal.setAttribute('data-testid', 'smart-repository-modal');
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('inert', '');
        document.body.appendChild(modal);

        const painted = paintRepositoryInstantChrome();

        expect(painted).toBe(false);
        expect(document.documentElement.getAttribute('data-hami-repository-open')).toBe('1');
        expect(document.getElementById(REPOSITORY_INSTANT_CHROME_ID)).not.toBeNull();
        expect(modal.getAttribute('aria-hidden')).toBe('true');
    });

    it('paintRepositoryInstantChrome يضع العلم والقشرة إن لم توجد طبقة', () => {
        const painted = paintRepositoryInstantChrome();
        expect(painted).toBe(false);
        expect(document.documentElement.getAttribute('data-hami-repository-open')).toBe('1');
        expect(document.getElementById(REPOSITORY_INSTANT_CHROME_ID)?.textContent).toContain('المستودع');
        expect(document.getElementById(REPOSITORY_INSTANT_CHROME_ID)?.textContent).not.toContain('بحث في المستودع');
    });

    it('concealRepositoryWarmShell يخفّي الطبقة ويزيل العلم والقشرة', () => {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        meta.setAttribute('content', '#222222');
        document.head.appendChild(meta);

        const modal = document.createElement('div');
        modal.setAttribute('data-testid', 'smart-repository-modal');
        modal.classList.add('hami-repository-overlay-layer--visible');
        document.body.appendChild(modal);

        paintRepositoryInstantChrome();
        concealRepositoryWarmShell();

        expect(modal.classList.contains('hami-repository-overlay-layer--visible')).toBe(false);
        expect(modal.style.visibility).toBe('hidden');
        expect(modal.hasAttribute('inert')).toBe(true);
        expect(document.documentElement.hasAttribute('data-hami-repository-open')).toBe(false);
        expect(document.getElementById(REPOSITORY_INSTANT_CHROME_ID)).toBeNull();
        expect(meta.getAttribute('content')).toBe('#222222');
    });

    it('يزيل القشرة فور ظهور المودال الحي في الشجرة', async () => {
        paintRepositoryInstantChrome();
        expect(document.getElementById(REPOSITORY_INSTANT_CHROME_ID)).not.toBeNull();

        const modal = document.createElement('div');
        modal.setAttribute('data-testid', 'smart-repository-modal');
        modal.classList.add('hami-repository-overlay-layer--visible');
        modal.setAttribute('aria-hidden', 'false');
        document.body.appendChild(modal);

        await waitFor(() => {
            expect(document.getElementById(REPOSITORY_INSTANT_CHROME_ID)).toBeNull();
        });
        expect(modal.classList.contains('hami-repository-overlay-layer--visible')).toBe(true);
        expect(document.documentElement.hasAttribute('data-hami-repository-enter')).toBe(false);
    });
});
