import { afterEach, describe, expect, it } from 'vitest';
import {
    isHomeBootChromeReady,
    isHomeGridRevealReady,
    markHomeBootChromeReadyForTests,
    resetHomeBootChromeForTests,
} from '@/app/bootstrap/homeBootChrome';

function appendLiveTile(root: HTMLElement) {
    const tile = document.createElement('button');
    tile.setAttribute('data-testid', 'hub-archive-lawsuit');
    root.appendChild(tile);
    return tile;
}

describe('homeBootChrome', () => {
    afterEach(() => {
        resetHomeBootChromeForTests();
        document.body.innerHTML = '';
    });

    it('يرفض الهيكل الناقص حتى لو الكروم جاهزاً', () => {
        markHomeBootChromeReadyForTests();
        expect(isHomeBootChromeReady()).toBe(true);

        const grid = document.createElement('div');
        const skeleton = document.createElement('section');
        skeleton.setAttribute('data-testid', 'home-hub-card-skeleton');
        grid.appendChild(skeleton);
        expect(isHomeGridRevealReady(grid)).toBe(false);
    });

    it('يرفض هيكل المركز حتى لو الكروم جاهزاً', () => {
        markHomeBootChromeReadyForTests();
        const grid = document.createElement('div');
        const skeleton = document.createElement('section');
        skeleton.setAttribute('data-testid', 'home-hub-card-skeleton');
        const copy = document.createElement('div');
        copy.setAttribute('data-testid', 'home-hub-skeleton-empty-copy');
        skeleton.appendChild(copy);
        grid.appendChild(skeleton);
        expect(isHomeGridRevealReady(grid)).toBe(false);
    });

    it('يقبل البطاقة الحية الفارغة المستقرة', () => {
        markHomeBootChromeReadyForTests();
        const grid = document.createElement('div');
        const live = document.createElement('section');
        live.setAttribute('data-testid', 'home-hub-card');
        live.setAttribute('data-hub-boot-settling', '0');
        live.setAttribute('data-hub-state', 'empty');
        const empty = document.createElement('div');
        empty.setAttribute('data-testid', 'home-hub-fully-empty');
        live.appendChild(empty);
        appendLiveTile(grid);
        grid.appendChild(live);
        expect(isHomeGridRevealReady(grid)).toBe(true);
    });

    it('يقبل ربع الملف المشغول إن استقرت الهوية (الحرف يكفي)', () => {
        markHomeBootChromeReadyForTests();
        const grid = document.createElement('div');
        const live = document.createElement('section');
        live.setAttribute('data-testid', 'home-hub-card');
        live.setAttribute('data-hub-state', 'empty');
        const empty = document.createElement('div');
        empty.setAttribute('data-testid', 'home-hub-fully-empty');
        live.appendChild(empty);
        const profile = document.createElement('div');
        profile.setAttribute('data-testid', 'home-dock-forum-profile');
        profile.setAttribute('aria-busy', 'true');
        profile.setAttribute('data-identity-settled', '1');
        grid.appendChild(live);
        appendLiveTile(grid);
        grid.appendChild(profile);
        expect(isHomeGridRevealReady(grid)).toBe(true);
    });

    it('يرفض الشبكة بلا بطاقة هاب حية', () => {
        markHomeBootChromeReadyForTests();
        const grid = document.createElement('div');
        expect(isHomeGridRevealReady(grid)).toBe(false);
    });

    it('يرفض هيكل التحميل حتى لو الحالة content', () => {
        markHomeBootChromeReadyForTests();
        const grid = document.createElement('div');
        const live = document.createElement('section');
        live.setAttribute('data-testid', 'home-hub-card');
        live.setAttribute('data-hub-boot-settling', '0');
        live.setAttribute('data-hub-state', 'content');
        live.setAttribute('data-hub-has-items', '1');
        const loading = document.createElement('div');
        loading.setAttribute('data-testid', 'home-hub-alerts-loading');
        live.appendChild(loading);
        grid.appendChild(live);
        expect(isHomeGridRevealReady(grid)).toBe(false);
    });

    it('يرفض البطاقة أثناء التسوية حتى مع رسالة الفراغ', () => {
        markHomeBootChromeReadyForTests();
        const grid = document.createElement('div');
        const live = document.createElement('section');
        live.setAttribute('data-testid', 'home-hub-card');
        live.setAttribute('data-hub-boot-settling', '1');
        live.setAttribute('data-hub-state', 'loading');
        live.setAttribute('aria-busy', 'true');
        const empty = document.createElement('div');
        empty.setAttribute('data-testid', 'home-hub-fully-empty');
        live.appendChild(empty);
        grid.appendChild(live);
        expect(isHomeGridRevealReady(grid)).toBe(false);
    });

    it('يرفض هياكل بلاطات الدوك', () => {
        markHomeBootChromeReadyForTests();
        const grid = document.createElement('div');
        const live = document.createElement('section');
        live.setAttribute('data-testid', 'home-hub-card');
        live.setAttribute('data-hub-boot-settling', '0');
        live.setAttribute('data-hub-state', 'empty');
        const empty = document.createElement('div');
        empty.setAttribute('data-testid', 'home-hub-fully-empty');
        live.appendChild(empty);
        const tile = document.createElement('div');
        tile.setAttribute('data-testid', 'home-widget-slot-skeleton-hubLawsuit');
        grid.appendChild(live);
        grid.appendChild(tile);
        expect(isHomeGridRevealReady(grid)).toBe(false);
    });

    it('يرفض الحالة content بلا عناصر', () => {
        markHomeBootChromeReadyForTests();
        const grid = document.createElement('div');
        const live = document.createElement('section');
        live.setAttribute('data-testid', 'home-hub-card');
        live.setAttribute('data-hub-boot-settling', '0');
        live.setAttribute('data-hub-state', 'content');
        live.setAttribute('data-hub-has-items', '0');
        grid.appendChild(live);
        expect(isHomeGridRevealReady(grid)).toBe(false);
    });

    it('يرفض ربع الملف قبل استقرار الهوية', () => {
        markHomeBootChromeReadyForTests();
        const grid = document.createElement('div');
        const live = document.createElement('section');
        live.setAttribute('data-testid', 'home-hub-card');
        live.setAttribute('data-hub-boot-settling', '0');
        live.setAttribute('data-hub-state', 'empty');
        const empty = document.createElement('div');
        empty.setAttribute('data-testid', 'home-hub-fully-empty');
        live.appendChild(empty);
        const profile = document.createElement('div');
        profile.setAttribute('data-testid', 'home-dock-forum-profile');
        profile.setAttribute('data-identity-settled', '0');
        grid.appendChild(live);
        grid.appendChild(profile);
        expect(isHomeGridRevealReady(grid)).toBe(false);
    });

    it('يقبل الشعار المتوقع قبل ظهور img', () => {
        markHomeBootChromeReadyForTests();
        const grid = document.createElement('div');
        const live = document.createElement('section');
        live.setAttribute('data-testid', 'home-hub-card');
        live.setAttribute('data-hub-boot-settling', '0');
        live.setAttribute('data-hub-state', 'empty');
        const empty = document.createElement('div');
        empty.setAttribute('data-testid', 'home-hub-fully-empty');
        live.appendChild(empty);
        const profile = document.createElement('div');
        profile.setAttribute('data-testid', 'home-dock-forum-profile');
        profile.setAttribute('data-identity-settled', '1');
        profile.setAttribute('data-avatar-expected', '1');
        const frame = document.createElement('div');
        frame.setAttribute('data-testid', 'home-dock-forum-profile-avatar');
        profile.appendChild(frame);
        grid.appendChild(live);
        appendLiveTile(grid);
        grid.appendChild(profile);
        expect(isHomeGridRevealReady(grid)).toBe(true);
    });

    it('يقبل الهوية المستقرة مع الشعار المرسوم', () => {
        markHomeBootChromeReadyForTests();
        const grid = document.createElement('div');
        const live = document.createElement('section');
        live.setAttribute('data-testid', 'home-hub-card');
        live.setAttribute('data-hub-boot-settling', '0');
        live.setAttribute('data-hub-state', 'empty');
        const empty = document.createElement('div');
        empty.setAttribute('data-testid', 'home-hub-fully-empty');
        live.appendChild(empty);
        const profile = document.createElement('div');
        profile.setAttribute('data-testid', 'home-dock-forum-profile');
        profile.setAttribute('data-identity-settled', '1');
        profile.setAttribute('data-avatar-expected', '1');
        const frame = document.createElement('div');
        frame.setAttribute('data-testid', 'home-dock-forum-profile-avatar');
        const img = document.createElement('img');
        frame.appendChild(img);
        profile.appendChild(frame);
        grid.appendChild(live);
        appendLiveTile(grid);
        grid.appendChild(profile);
        expect(isHomeGridRevealReady(grid)).toBe(true);
    });

    it('لا يُعلن الجاهزية أثناء فك الملف المحلي', async () => {
        const { setLawyerProfileBootWarmPending, resetLawyerProfileBootWarmPendingForTests } =
            await import('@/app/services/profile/profileBootWarmPending');
        setLawyerProfileBootWarmPending(true);
        markHomeBootChromeReadyForTests();
        expect(isHomeBootChromeReady()).toBe(false);
        resetLawyerProfileBootWarmPendingForTests();
        expect(isHomeBootChromeReady()).toBe(true);
    });
});
