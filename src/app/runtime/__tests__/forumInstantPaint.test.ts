import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    applyForumOpaqueChrome,
    concealForumWarmShell,
    isForumShellPaintedOpen,
    paintForumInstantChrome,
} from '../forumInstantPaint';

describe('forumInstantPaint', () => {
    beforeEach(() => {
        document.documentElement.innerHTML = '';
        document.head.innerHTML = '';
        concealForumWarmShell();
    });

    afterEach(() => {
        document.documentElement.removeAttribute('data-hami-forum-open');
    });

    it('applyForumOpaqueChrome يضع علم html وtheme-color', () => {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        meta.setAttribute('content', '#111111');
        document.head.appendChild(meta);

        applyForumOpaqueChrome();

        expect(document.documentElement.getAttribute('data-hami-forum-open')).toBe('1');
        expect(meta.getAttribute('content')).toBe('#0A0F1C');
        expect(isForumShellPaintedOpen()).toBe(true);
    });

    it('paintForumInstantChrome يكشف الـ Host إن وُجد', () => {
        const host = document.createElement('div');
        host.setAttribute('data-testid', 'forum-overlay-host');
        host.hidden = true;
        document.body.appendChild(host);

        const painted = paintForumInstantChrome();

        expect(painted).toBe(true);
        expect(host.classList.contains('hami-forum-overlay-layer--visible')).toBe(true);
        expect(host.hidden).toBe(false);
        expect(host.getAttribute('data-forum-layer-open')).toBe('1');
        expect(host.hasAttribute('inert')).toBe(false);
    });

    it('paintForumInstantChrome يضع العلم فقط إن لم توجد طبقة', () => {
        const painted = paintForumInstantChrome();
        expect(painted).toBe(false);
        expect(document.documentElement.getAttribute('data-hami-forum-open')).toBe('1');
    });

    it('concealForumWarmShell يخفّي الطبقة ويزيل العلم', () => {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        meta.setAttribute('content', '#222222');
        document.head.appendChild(meta);

        const host = document.createElement('div');
        host.setAttribute('data-testid', 'forum-overlay-host');
        document.body.appendChild(host);

        paintForumInstantChrome();
        concealForumWarmShell();

        expect(host.classList.contains('hami-forum-overlay-layer--visible')).toBe(false);
        expect(host.hidden).toBe(true);
        expect(host.hasAttribute('inert')).toBe(true);
        expect(document.documentElement.hasAttribute('data-hami-forum-open')).toBe(false);
        expect(meta.getAttribute('content')).toBe('#222222');
    });
});
