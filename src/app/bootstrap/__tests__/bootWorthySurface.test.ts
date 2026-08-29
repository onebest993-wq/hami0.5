import { describe, expect, it } from 'vitest';
import {
    findLiveHomeMainGrid,
    hasLiveCommandTiles,
    isHubChromePaintWorthy,
    isLiveHubPaintWorthy,
    isWorthyBootSurface,
} from '@/app/bootstrap/bootWorthySurface';

function appendEmptyCopy(skeleton: HTMLElement) {
    const copy = document.createElement('div');
    copy.setAttribute('data-testid', 'home-hub-skeleton-empty-copy');
    skeleton.appendChild(copy);
}

describe('bootWorthySurface', () => {
    it('يرفض الهيكل ويكشف الهاب الفارغ الحي', () => {
        const root = document.createElement('div');
        const skeleton = document.createElement('section');
        skeleton.setAttribute('data-testid', 'home-hub-card-skeleton');
        root.appendChild(skeleton);
        expect(isLiveHubPaintWorthy(root)).toBe(false);

        skeleton.remove();
        const live = document.createElement('section');
        live.setAttribute('data-testid', 'home-hub-card');
        live.setAttribute('data-hub-boot-settling', '0');
        live.setAttribute('data-hub-state', 'empty');
        const empty = document.createElement('div');
        empty.setAttribute('data-testid', 'home-hub-fully-empty');
        live.appendChild(empty);
        root.appendChild(live);
        expect(isLiveHubPaintWorthy(root)).toBe(true);
        expect(isHubChromePaintWorthy(root)).toBe(true);
    });

    it('كروم الهيكل المكتمل يستحق الكشف — لا البطاقة الحية فقط', () => {
        const root = document.createElement('div');
        const skeleton = document.createElement('section');
        skeleton.setAttribute('data-testid', 'home-hub-card-skeleton');
        appendEmptyCopy(skeleton);
        root.appendChild(skeleton);
        expect(isHubChromePaintWorthy(root)).toBe(true);
        expect(isLiveHubPaintWorthy(root)).toBe(false);
        expect(isWorthyBootSurface(root)).toBe(false);

        const tile = document.createElement('button');
        tile.setAttribute('data-testid', 'hub-archive-lawsuit');
        root.appendChild(tile);
        expect(hasLiveCommandTiles(root)).toBe(true);
        expect(isWorthyBootSurface(root)).toBe(false);
    });

    it('ينتظر استقرار الاسم وإن اكتمل المركز الحي', () => {
        const root = document.createElement('div');
        const live = document.createElement('section');
        live.setAttribute('data-testid', 'home-hub-card');
        live.setAttribute('data-hub-boot-settling', '0');
        live.setAttribute('data-hub-state', 'empty');
        const empty = document.createElement('div');
        empty.setAttribute('data-testid', 'home-hub-fully-empty');
        live.appendChild(empty);
        const tile = document.createElement('button');
        tile.setAttribute('data-testid', 'hub-archive-lawsuit');
        const profile = document.createElement('div');
        profile.setAttribute('data-testid', 'home-dock-forum-profile');
        profile.setAttribute('data-identity-settled', '0');
        root.appendChild(live);
        root.appendChild(tile);
        root.appendChild(profile);
        expect(isWorthyBootSurface(root)).toBe(false);
        profile.setAttribute('data-identity-settled', '1');
        expect(isWorthyBootSurface(root)).toBe(true);
    });

    it('يكشف بوابة الدخول فوراً', () => {
        const root = document.createElement('div');
        const gate = document.createElement('div');
        gate.setAttribute('data-hami-auth-gate', '');
        root.appendChild(gate);
        expect(isWorthyBootSurface(root)).toBe(true);
    });

    it('لا يكشف طبقة FirstPaint حتى مع هيكل مكتمل', () => {
        const root = document.createElement('div');
        root.setAttribute('data-hami-home-first-paint-layer', '');
        const skeleton = document.createElement('section');
        skeleton.setAttribute('data-testid', 'home-hub-card-skeleton');
        appendEmptyCopy(skeleton);
        root.appendChild(skeleton);
        const tile = document.createElement('button');
        tile.setAttribute('data-testid', 'hub-archive-execution');
        root.appendChild(tile);
        expect(isWorthyBootSurface(root)).toBe(false);
    });

    it('يرفض فتحات الشبكة الفارغة حتى لا تُكشف بطاقة واحدة عائمة', () => {
        const root = document.createElement('div');
        const grid = document.createElement('div');
        grid.setAttribute('data-testid', 'home-main-grid');
        const live = document.createElement('section');
        live.setAttribute('data-testid', 'home-hub-card');
        live.setAttribute('data-hub-boot-settling', '0');
        live.setAttribute('data-hub-state', 'empty');
        const empty = document.createElement('div');
        empty.setAttribute('data-testid', 'home-hub-fully-empty');
        live.appendChild(empty);
        const filled = document.createElement('div');
        filled.setAttribute('data-hami-widget-slot', '');
        const tile = document.createElement('button');
        tile.setAttribute('data-testid', 'hub-archive-lawsuit');
        filled.appendChild(tile);
        const hole = document.createElement('div');
        hole.setAttribute('data-hami-widget-slot', '');
        const profile = document.createElement('div');
        profile.setAttribute('data-testid', 'home-dock-forum-profile');
        profile.setAttribute('data-identity-settled', '1');
        grid.appendChild(filled);
        grid.appendChild(hole);
        root.appendChild(live);
        root.appendChild(grid);
        root.appendChild(profile);
        expect(isWorthyBootSurface(root)).toBe(false);
        const second = document.createElement('button');
        second.setAttribute('data-testid', 'hub-archive-execution');
        hole.appendChild(second);
        expect(isWorthyBootSurface(root)).toBe(true);
    });

    it('findLiveHomeMainGrid يتجاهل طبقة FirstPaint', () => {
        const root = document.createElement('div');
        const first = document.createElement('div');
        first.setAttribute('data-hami-home-first-paint-layer', '');
        const firstGrid = document.createElement('div');
        firstGrid.setAttribute('data-testid', 'home-main-grid');
        first.appendChild(firstGrid);
        const liveGrid = document.createElement('div');
        liveGrid.setAttribute('data-testid', 'home-main-grid');
        root.appendChild(first);
        root.appendChild(liveGrid);
        expect(findLiveHomeMainGrid(root)).toBe(liveGrid);
        first.remove();
        liveGrid.remove();
        expect(findLiveHomeMainGrid(root)).toBeNull();
    });
});
