import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    HOME_MAIN_GRID_PAINTED_EVENT,
    isHomeMainGridPainted,
    notifyHomeMainGridPainted,
    resetHomeMainGridPaintGateForTests,
    scheduleHomeMainGridPainted,
} from '@/app/bootstrap/homeMainGridPaintGate';
import {
    markHomeBootChromeReadyForTests,
    resetHomeBootChromeForTests,
} from '@/app/bootstrap/homeBootChrome';

vi.mock('@/app/bootstrap/bootStaticShell', () => ({
    removeStaticBootShell: vi.fn(),
}));

vi.mock('@/app/bootstrap/bootReveal', () => ({
    isBootRevealDone: vi.fn(() => false),
    markBootRevealDone: vi.fn(),
    notifyBootContentReady: vi.fn(),
    getBootRevealMinMs: vi.fn(() => 0),
    BOOT_REVEAL_DONE_EVENT: 'hami:boot-reveal-done',
}));

vi.mock('@/app/bootstrap/lawyerDashboardFirstTabMark', () => ({
    markLawyerDashboardFirstTabOpenOnce: vi.fn(),
}));

vi.mock('@/app/bootstrap/dashboardInteractiveMark', () => ({
    markDashboardInteractiveOnce: vi.fn(),
}));

vi.mock('@/app/bootstrap/BootLaunchOrchestrator', () => ({
    beforeBootShellReveal: vi.fn(),
}));

vi.mock('@/app/observability/sentryClient', () => ({
    sentryCaptureMessage: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/app/runtime/deferredAppStyles', () => ({
    isDeferredAppStylesLoaded: () => true,
    ensureDeferredAppStylesLoaded: () => Promise.resolve(),
    scheduleDeferredAppStyles: () => undefined,
}));

import { removeStaticBootShell } from '@/app/bootstrap/bootStaticShell';
import { markBootRevealDone, notifyBootContentReady } from '@/app/bootstrap/bootReveal';
import { markLawyerDashboardFirstTabOpenOnce } from '@/app/bootstrap/lawyerDashboardFirstTabMark';
import { markDashboardInteractiveOnce } from '@/app/bootstrap/dashboardInteractiveMark';
import { sentryCaptureMessage } from '@/app/observability/sentryClient';

function mockRect(el: HTMLElement, width: number, height: number) {
    Object.defineProperty(el, 'getBoundingClientRect', {
        value: () => ({ width, height, top: 0, left: 0, right: width, bottom: height }),
    });
}

function appendReadyEmptyHub(grid: HTMLElement) {
    const card = document.createElement('section');
    card.setAttribute('data-testid', 'home-hub-card');
    card.setAttribute('data-hub-boot-settling', '0');
    card.setAttribute('data-hub-state', 'empty');
    mockRect(card, 320, 140);
    const empty = document.createElement('div');
    empty.setAttribute('data-testid', 'home-hub-fully-empty');
    card.appendChild(empty);
    grid.appendChild(card);
    const tile = document.createElement('button');
    tile.setAttribute('data-testid', 'hub-archive-lawsuit');
    grid.appendChild(tile);
    return card;
}

describe('homeMainGridPaintGate', () => {
    beforeEach(() => {
        resetHomeMainGridPaintGateForTests();
        resetHomeBootChromeForTests();
        markHomeBootChromeReadyForTests();
        vi.mocked(removeStaticBootShell).mockClear();
        vi.mocked(markBootRevealDone).mockClear();
        vi.mocked(notifyBootContentReady).mockClear();
        vi.mocked(markLawyerDashboardFirstTabOpenOnce).mockClear();
        vi.mocked(markDashboardInteractiveOnce).mockClear();
        vi.mocked(sentryCaptureMessage).mockClear();
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'setTimeout'] });
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('يُطلق الحدث مرة واحدة بعد rAF', () => {
        const handler = vi.fn();
        window.addEventListener(HOME_MAIN_GRID_PAINTED_EVENT, handler);

        const grid = document.createElement('div');
        grid.dataset.testid = 'home-main-grid';
        mockRect(grid, 320, 480);
        appendReadyEmptyHub(grid);
        document.body.appendChild(grid);

        scheduleHomeMainGridPainted(grid);
        vi.runAllTimers();
        expect(isHomeMainGridPainted()).toBe(true);
        expect(handler).toHaveBeenCalledTimes(1);

        notifyHomeMainGridPainted();
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('يزيل الطبقة الثابتة قطعاً بعد paint الشبكة', async () => {
        notifyHomeMainGridPainted();
        expect(markLawyerDashboardFirstTabOpenOnce).toHaveBeenCalledTimes(1);
        expect(markDashboardInteractiveOnce).toHaveBeenCalledTimes(1);
        expect(notifyBootContentReady).toHaveBeenCalled();
        expect(removeStaticBootShell).toHaveBeenCalledWith();
        expect(markBootRevealDone).toHaveBeenCalled();
    });

    it('لا يكشف هيكل FirstPaint قبل البطاقة الحية', () => {
        const handler = vi.fn();
        window.addEventListener(HOME_MAIN_GRID_PAINTED_EVENT, handler);

        const cover = document.createElement('div');
        cover.setAttribute('data-hami-home-first-paint-layer', '');
        const stub = document.createElement('div');
        stub.dataset.testid = 'home-main-grid';
        Object.defineProperty(stub, 'getBoundingClientRect', {
            value: () => ({ width: 320, height: 480, top: 0, left: 0, right: 320, bottom: 480 }),
        });
        const skeleton = document.createElement('section');
        skeleton.setAttribute('data-testid', 'home-hub-card-skeleton');
        stub.appendChild(skeleton);
        cover.appendChild(stub);
        document.body.appendChild(cover);

        scheduleHomeMainGridPainted(stub);
        vi.advanceTimersToNextFrame();
        vi.advanceTimersToNextFrame();
        expect(isHomeMainGridPainted()).toBe(false);
        expect(handler).not.toHaveBeenCalled();
    });

    it('يكشف بوابة الدخول فوراً دون انتظار الهاب', async () => {
        const splash = document.createElement('div');
        splash.id = 'hami-static-boot';
        document.body.appendChild(splash);
        const gate = document.createElement('div');
        gate.setAttribute('data-hami-auth-gate', '');
        document.body.appendChild(gate);

        window.dispatchEvent(new Event('hami:app-runtime-ready'));
        vi.advanceTimersByTime(50);
        expect(isHomeMainGridPainted()).toBe(true);
        await vi.runAllTimersAsync();
        expect(removeStaticBootShell).toHaveBeenCalled();
    });

    it('يكشف الهاب الحي فوراً دون فتيل', async () => {
        const splash = document.createElement('div');
        splash.id = 'hami-static-boot';
        document.body.appendChild(splash);
        const dash = document.createElement('div');
        dash.setAttribute('data-hami-lawyer-dashboard', '');
        const card = document.createElement('section');
        card.setAttribute('data-testid', 'home-hub-card');
        card.setAttribute('data-hub-boot-settling', '0');
        card.setAttribute('data-hub-state', 'empty');
        const empty = document.createElement('div');
        empty.setAttribute('data-testid', 'home-hub-fully-empty');
        card.appendChild(empty);
        const tile = document.createElement('button');
        tile.setAttribute('data-testid', 'hub-archive-lawsuit');
        const grid = document.createElement('div');
        grid.setAttribute('data-testid', 'home-main-grid');
        grid.appendChild(card);
        grid.appendChild(tile);
        dash.appendChild(grid);
        document.body.appendChild(dash);

        window.dispatchEvent(new Event('hami:app-runtime-ready'));
        vi.advanceTimersByTime(50);
        expect(isHomeMainGridPainted()).toBe(true);

        /* المسار السعيد لا يُشعل الفتيل، فلا بلاغ — وإلا صار البلاغ ضجيجاً لا إشارة */
        await vi.runAllTimersAsync();
        expect(sentryCaptureMessage).not.toHaveBeenCalled();
    });

    it('لا يكشف هيكل المركز مع بلاطات حية', async () => {
        const splash = document.createElement('div');
        splash.id = 'hami-static-boot';
        document.body.appendChild(splash);
        const dash = document.createElement('div');
        dash.setAttribute('data-hami-lawyer-dashboard', '');
        const skeleton = document.createElement('section');
        skeleton.setAttribute('data-testid', 'home-hub-card-skeleton');
        const copy = document.createElement('div');
        copy.setAttribute('data-testid', 'home-hub-skeleton-empty-copy');
        skeleton.appendChild(copy);
        const tile = document.createElement('button');
        tile.setAttribute('data-testid', 'hub-archive-lawsuit');
        dash.appendChild(skeleton);
        dash.appendChild(tile);
        document.body.appendChild(dash);

        window.dispatchEvent(new Event('hami:app-runtime-ready'));
        vi.advanceTimersByTime(50);
        expect(isHomeMainGridPainted()).toBe(false);
    });

    /**
     * كان هذا الاختبار يؤكّد أنّ الغطاء لا يُرفع **أبداً** قبل استقرار الهوية، حتى بعد
     * الفتيل. والقصد صحيح — لا يقفز اسم المحامي أو صورته بعد الكشف — لكنّه كان بلا سقف،
     * وقياس ٢٠٢٦-٠٩-١١ أظهر ما يفعله غيابُ السقف:
     *
     *   • الربع الحيّ (ForumTileProfileQuarterSlot) لا يُركَّب إلا بعد
     *     HOME_MAIN_GRID_PAINTED_EVENT، وهو وحده من يضبط data-identity-settled='1'.
     *   • ومخارج رفع الغطاء الأربعة كلّها تشترط تلك السمة.
     *   ⇒ حلقة مغلقة: ملفٌّ لم يُحمَّل كروَمه يُبقي `#hami-static-boot` فوق لوحةٍ جاهزة
     *     عند z-index 99990 و pointer-events:auto — فتُبتلع كل نقرة، بلا نهاية.
     *
     * الضمانة باقية داخل النافذة القصيرة، والفتيل صار حدّاً لها:
     * كشفٌ ناقص بعد ثماني ثوانٍ أهونُ من حبسٍ دائم. وبعد الكشف تستقرّ الهوية من نفسها
     * لأنّ الإعلان هو ما يُركّب الربع الحيّ. التفاصيل:
     * .audit/FINDING_BOOT_COVER_IDENTITY_DEADLOCK.md
     */
    it('يحفظ الهوية داخل النافذة القصيرة ثم يكشف بالفتيل — لا حبس دائم', async () => {
        const splash = document.createElement('div');
        splash.id = 'hami-static-boot';
        document.body.appendChild(splash);
        const dash = document.createElement('div');
        dash.setAttribute('data-hami-lawyer-dashboard', '');
        const card = document.createElement('section');
        card.setAttribute('data-testid', 'home-hub-card');
        card.setAttribute('data-hub-boot-settling', '0');
        card.setAttribute('data-hub-state', 'empty');
        const empty = document.createElement('div');
        empty.setAttribute('data-testid', 'home-hub-fully-empty');
        card.appendChild(empty);
        const tile = document.createElement('button');
        tile.setAttribute('data-testid', 'hub-archive-lawsuit');
        const profile = document.createElement('div');
        profile.setAttribute('data-testid', 'home-dock-forum-profile');
        profile.setAttribute('data-identity-settled', '0');
        dash.appendChild(card);
        dash.appendChild(tile);
        dash.appendChild(profile);
        document.body.appendChild(dash);

        window.dispatchEvent(new Event('hami:app-runtime-ready'));
        vi.advanceTimersByTime(50);
        expect(isHomeMainGridPainted()).toBe(false);
        vi.advanceTimersByTime(1_200);
        expect(isHomeMainGridPainted()).toBe(false);

        /* الحدّ: بعد الفتيل يُكشف رغم أنّ الهوية لم تستقرّ */
        vi.advanceTimersByTime(8_000);
        expect(isHomeMainGridPainted()).toBe(true);

        await vi.runAllTimersAsync();
        expect(removeStaticBootShell).toHaveBeenCalled();
        expect(markDashboardInteractiveOnce).toHaveBeenCalled();

        /* الحدُّ يمنع الحبس ويُبلّغ عنه — وإلا بقي «هل يقع عند مستخدم حقيقي؟» بلا جواب */
        expect(sentryCaptureMessage).toHaveBeenCalledWith(
            'boot-uncover:identity-fuse',
            expect.objectContaining({ identitySettled: '0', profileTilePresent: true }),
        );
    });

    it('لا يكشف هيكل المركز بعد استقرار الارتفاع', () => {
        const grid = document.createElement('div');
        grid.dataset.testid = 'home-main-grid';
        mockRect(grid, 320, 480);
        const skeleton = document.createElement('section');
        skeleton.setAttribute('data-testid', 'home-hub-card-skeleton');
        mockRect(skeleton, 320, 140);
        const copy = document.createElement('div');
        copy.setAttribute('data-testid', 'home-hub-skeleton-empty-copy');
        skeleton.appendChild(copy);
        grid.appendChild(skeleton);
        document.body.appendChild(grid);

        scheduleHomeMainGridPainted(grid);
        vi.runAllTimers();
        expect(isHomeMainGridPainted()).toBe(false);
    });

    it('لا يكشف هيكل اللوحة الناقص بعد الفتيل', async () => {
        const splash = document.createElement('div');
        splash.id = 'hami-static-boot';
        document.body.appendChild(splash);
        const dash = document.createElement('div');
        dash.setAttribute('data-hami-lawyer-dashboard', '');
        const skeleton = document.createElement('section');
        skeleton.setAttribute('data-testid', 'home-hub-card-skeleton');
        dash.appendChild(skeleton);
        document.body.appendChild(dash);

        window.dispatchEvent(new Event('hami:app-runtime-ready'));
        vi.advanceTimersByTime(50);
        expect(isHomeMainGridPainted()).toBe(false);
        vi.advanceTimersByTime(1_200);
        expect(isHomeMainGridPainted()).toBe(false);
        vi.advanceTimersByTime(8_000);
        expect(isHomeMainGridPainted()).toBe(false);
        expect(removeStaticBootShell).not.toHaveBeenCalled();
    });

    it('لا يكشف الهيكل الناقص حتى بعد استنفاد محاولات القياس', () => {
        const stub = document.createElement('div');
        stub.dataset.testid = 'home-main-grid';
        Object.defineProperty(stub, 'getBoundingClientRect', {
            value: () => ({ width: 320, height: 480, top: 0, left: 0, right: 320, bottom: 480 }),
        });
        const skeleton = document.createElement('section');
        skeleton.setAttribute('data-testid', 'home-hub-card-skeleton');
        stub.appendChild(skeleton);
        document.body.appendChild(stub);

        scheduleHomeMainGridPainted(stub);
        vi.runAllTimers();
        expect(isHomeMainGridPainted()).toBe(false);
    });

    it('لا يكشف البطاقة أثناء التحميل حتى بعد استنفاد القياس', () => {
        const handler = vi.fn();
        window.addEventListener(HOME_MAIN_GRID_PAINTED_EVENT, handler);

        const grid = document.createElement('div');
        grid.dataset.testid = 'home-main-grid';
        mockRect(grid, 320, 480);
        const card = document.createElement('section');
        card.setAttribute('data-testid', 'home-hub-card');
        card.setAttribute('data-hub-state', 'loading');
        card.setAttribute('data-hub-boot-settling', '1');
        mockRect(card, 320, 140);
        grid.appendChild(card);
        document.body.appendChild(grid);

        scheduleHomeMainGridPainted(grid);
        vi.runAllTimers();
        expect(isHomeMainGridPainted()).toBe(false);
        expect(handler).not.toHaveBeenCalled();
        window.removeEventListener(HOME_MAIN_GRID_PAINTED_EVENT, handler);
    });

    it('لا يعلن طلاء الشبكة قبل هندسة الهاب النهائية', () => {
        const grid = document.createElement('div');
        grid.dataset.testid = 'home-main-grid';
        Object.defineProperty(grid, 'getBoundingClientRect', {
            value: () => ({ width: 320, height: 480, top: 0, left: 0, right: 320, bottom: 480 }),
        });
        const card = document.createElement('section');
        card.setAttribute('data-testid', 'home-hub-card');
        card.setAttribute('data-hub-state', 'loading');
        card.setAttribute('data-hub-boot-settling', '1');
        mockRect(card, 320, 140);
        grid.appendChild(card);
        document.body.appendChild(grid);

        scheduleHomeMainGridPainted(grid);
        vi.advanceTimersToNextFrame();
        expect(isHomeMainGridPainted()).toBe(false);

        const empty = document.createElement('div');
        empty.setAttribute('data-testid', 'home-hub-fully-empty');
        card.appendChild(empty);
        card.setAttribute('data-hub-boot-settling', '0');
        card.setAttribute('data-hub-state', 'empty');
        const tile = document.createElement('button');
        tile.setAttribute('data-testid', 'hub-archive-lawsuit');
        grid.appendChild(tile);
        vi.runAllTimers();
        expect(isHomeMainGridPainted()).toBe(true);
    });
});
