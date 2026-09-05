import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    applySettingsOpaqueChrome,
    armSettingsOverlayInteraction,
    beginSettingsOpenGesture,
    clearSettingsForceVisible,
    clearSettingsReopenSuppress,
    concealSettingsWarmShell,
    dismissSettingsInstantBridgeIfHostReady,
    getSettingsShellRevealedAt,
    isSettingsCloseGuarded,
    isSettingsForceVisible,
    isSettingsLayerOpen,
    isSettingsOpenGestureBlockingClose,
    isSettingsOverlayInteractionArmed,
    isSettingsReopenSuppressed,
    paintSettingsInstantChrome,
    removeSettingsInstantBridge,
    scheduleSettingsOverlayInteractionArm,
    SETTINGS_INTERACT_ARM_MS,
    suppressSettingsReopen,
} from '../settingsInstantPaint';

describe('settingsInstantPaint', () => {
    beforeEach(() => {
        clearSettingsForceVisible();
        clearSettingsReopenSuppress();
        sessionStorage.clear();
        document.body.innerHTML = '';
        document.documentElement.removeAttribute('data-settings-close-guard');
        document.documentElement.removeAttribute('data-hami-settings-open');
        document.documentElement.removeAttribute('data-hami-native');
        vi.useFakeTimers();
    });

    afterEach(() => {
        concealSettingsWarmShell();
        clearSettingsForceVisible();
        clearSettingsReopenSuppress();
        removeSettingsInstantBridge();
        document.documentElement.removeAttribute('data-settings-close-guard');
        document.documentElement.removeAttribute('data-hami-settings-open');
        document.documentElement.removeAttribute('data-hami-native');
        vi.useRealTimers();
    });

    it('applySettingsOpaqueChrome masks dashboard theme before host reveal', () => {
        const dash = document.createElement('div');
        dash.setAttribute('data-hami-lawyer-dashboard', '');
        dash.style.backgroundColor = 'rgb(26, 20, 12)';
        document.body.appendChild(dash);

        applySettingsOpaqueChrome();

        expect(document.documentElement.style.backgroundColor).toBe('rgb(11, 16, 33)');
        expect(document.body.style.backgroundColor).toBe('rgb(11, 16, 33)');
        expect(dash.style.backgroundColor).toBe('rgb(26, 20, 12)');
        expect(dash.style.contentVisibility).toBe('');
        expect(dash.style.pointerEvents).toBe('none');
    });

    it('على الأصلي لا يخفي شجرة اللوحة بـ content-visibility', () => {
        document.documentElement.setAttribute('data-hami-native', '1');
        const dash = document.createElement('div');
        dash.setAttribute('data-hami-lawyer-dashboard', '');
        dash.style.backgroundColor = 'rgb(26, 20, 12)';
        document.body.appendChild(dash);

        applySettingsOpaqueChrome();

        expect(dash.style.pointerEvents).toBe('none');
        expect(dash.style.contentVisibility).toBe('');
        document.documentElement.removeAttribute('data-hami-native');
    });

    it('conceal يعيد رسم اللوحة بعد تجميد الفتح', () => {
        const dash = document.createElement('div');
        dash.setAttribute('data-hami-lawyer-dashboard', '');
        dash.style.backgroundColor = 'rgb(26, 20, 12)';
        document.body.appendChild(dash);

        applySettingsOpaqueChrome();
        concealSettingsWarmShell();

        expect(dash.style.pointerEvents).toBe('');
        expect(dash.style.backgroundColor).toBe('rgb(26, 20, 12)');
    });

    it('reveals portal host with opaque visibility and pointer events', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'hami-settings-overlay-host');
        layer.style.visibility = 'hidden';
        document.body.appendChild(layer);

        expect(paintSettingsInstantChrome()).toBe(true);
        expect(isSettingsForceVisible()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-settings-open')).toBe('1');
        expect(layer.style.visibility).toBe('visible');
        expect(layer.style.pointerEvents).toBe('auto');
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(false);
        expect(isSettingsCloseGuarded()).toBe(true);
        expect(isSettingsLayerOpen(false)).toBe(true);
        expect(layer.contains(document.getElementById('hami-settings-instant-bridge'))).toBe(true);
    });

    it('paints instant chrome bridge when no host exists', () => {
        expect(paintSettingsInstantChrome()).toBe(true);
        const bridge = document.getElementById('hami-settings-instant-bridge');
        expect(bridge).toBeTruthy();
        expect(bridge?.textContent).toContain('مركز الإعدادات');
        expect(bridge?.style.pointerEvents).toBe('none');
        expect(bridge?.style.zIndex).toBe('2');
        expect(bridge?.style.position).toBe('absolute');
        const overlay = document.querySelector('[data-testid="hami-settings-overlay-host"]');
        expect(overlay).toBeTruthy();
        expect(overlay?.contains(bridge)).toBe(true);
        expect(bridge?.getAttribute('data-instant-section')).toBe('security');
        expect(bridge?.querySelector('[data-instant-tab="security"]')?.getAttribute('data-instant-active')).toBe(
            '1',
        );
        expect(isSettingsForceVisible()).toBe(true);
        expect(isSettingsCloseGuarded()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-settings-open')).toBe('1');
        expect(bridge?.querySelector('[data-testid="settings-instant-close"]')).toBeTruthy();
        expect(bridge?.querySelector('[data-instant-tab="security"] svg')).toBeTruthy();
        expect(bridge?.querySelector('[data-instant-tab="appearance"]')?.tagName).toBe('BUTTON');
        expect(bridge?.querySelector('[data-testid="settings-instant-skeleton"]')).toBeTruthy();
        expect(bridge?.innerHTML).toContain('--hami-lawyer-header-safe-top');
        expect(bridge?.innerHTML).toContain('pointer-events:auto');
    });

    it('الجسر يبرز التبويب المحفوظ في الجلسة', () => {
        sessionStorage.setItem('hami:settings-active-section', 'data');
        expect(paintSettingsInstantChrome()).toBe(true);
        const bridge = document.getElementById('hami-settings-instant-bridge');
        expect(bridge?.getAttribute('data-instant-section')).toBe('data');
        expect(bridge?.querySelector('[data-instant-tab="data"]')?.getAttribute('data-instant-active')).toBe('1');
        expect(bridge?.querySelector('[data-instant-tab="security"]')?.getAttribute('data-instant-active')).toBe(
            '0',
        );
    });

    it('إغلاق القشرة يُطلق الحدث بعد انتهاء حراسة إيماءة الفتح', () => {
        const seen: string[] = [];
        const onDismiss = () => {
            seen.push('dismiss');
        };
        window.addEventListener('hami:settings-instant-dismiss', onDismiss);
        expect(paintSettingsInstantChrome()).toBe(true);
        const btn = document.querySelector('[data-testid="settings-instant-close"]');
        expect(btn).toBeTruthy();
        btn?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        expect(seen).toEqual([]);
        vi.advanceTimersByTime(SETTINGS_INTERACT_ARM_MS);
        btn?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        expect(seen).toEqual(['dismiss']);
        window.removeEventListener('hami:settings-instant-dismiss', onDismiss);
    });

    it('لمس تبويب القشرة يحفظ القسم ويحدّث التمييز بعد انتهاء حراسة الفتح', () => {
        const seen: string[] = [];
        const onSection = (event: Event) => {
            seen.push(String((event as CustomEvent).detail));
        };
        window.addEventListener('hami:settings-instant-section', onSection);
        expect(paintSettingsInstantChrome()).toBe(true);
        const tab = document.querySelector('[data-instant-tab="appearance"]');
        expect(tab).toBeTruthy();
        tab?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        expect(sessionStorage.getItem('hami:settings-active-section')).toBeNull();
        expect(seen).toEqual([]);

        vi.advanceTimersByTime(SETTINGS_INTERACT_ARM_MS);
        const appearanceTab = document.querySelector('[data-instant-tab="appearance"]');
        appearanceTab?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        expect(sessionStorage.getItem('hami:settings-active-section')).toBe('appearance');
        expect(document.getElementById('hami-settings-instant-bridge')?.getAttribute('data-instant-section')).toBe(
            'appearance',
        );
        expect(appearanceTab?.getAttribute('data-instant-active')).toBe('1');
        expect(
            document.querySelector('[data-instant-tab="security"]')?.getAttribute('data-instant-active'),
        ).toBe('0');
        expect(seen).toEqual(['appearance']);
        window.removeEventListener('hami:settings-instant-section', onSection);
    });

    it('لا يزيل الجسر على data-settings-root بلا قسم تفاعلي ظاهر', () => {
        expect(paintSettingsInstantChrome()).toBe(true);
        expect(document.getElementById('hami-settings-instant-bridge')).toBeTruthy();

        const host = document.querySelector('[data-testid="hami-settings-overlay-host"]');
        expect(host).toBeTruthy();
        const shell = document.createElement('div');
        shell.setAttribute('data-settings-root', '');
        host?.appendChild(shell);

        expect(dismissSettingsInstantBridgeIfHostReady()).toBe(false);
        expect(document.getElementById('hami-settings-instant-bridge')).toBeTruthy();
    });

    it('يزيل الجسر عندما يكون القسم الظاهر تفاعلياً', () => {
        expect(paintSettingsInstantChrome()).toBe(true);
        expect(document.getElementById('hami-settings-instant-bridge')).toBeTruthy();

        const host = document.querySelector('[data-testid="hami-settings-overlay-host"]');
        expect(host).toBeTruthy();
        const shell = document.createElement('div');
        shell.setAttribute('data-settings-root', '');
        const frame = document.createElement('div');
        frame.className = 'hami-settings-section-frame';
        const wrap = document.createElement('div');
        const interactive = document.createElement('div');
        interactive.setAttribute('data-settings-interactive', 'true');
        wrap.appendChild(interactive);
        frame.appendChild(wrap);
        shell.appendChild(frame);
        host?.appendChild(shell);

        expect(dismissSettingsInstantBridgeIfHostReady()).toBe(true);
        expect(document.getElementById('hami-settings-instant-bridge')).toBeNull();
        expect((host as HTMLElement).style.visibility).toBe('visible');
    });

    it('لا يزيل الجسر على تبويب مركون ولو كان تفاعلياً', () => {
        expect(paintSettingsInstantChrome()).toBe(true);
        const host = document.querySelector('[data-testid="hami-settings-overlay-host"]');
        const shell = document.createElement('div');
        shell.setAttribute('data-settings-root', '');
        const frame = document.createElement('div');
        frame.className = 'hami-settings-section-frame';
        const wrap = document.createElement('div');
        wrap.setAttribute('data-settings-section-park', '1');
        const interactive = document.createElement('div');
        interactive.setAttribute('data-settings-interactive', 'true');
        wrap.appendChild(interactive);
        frame.appendChild(wrap);
        shell.appendChild(frame);
        host?.appendChild(shell);

        expect(dismissSettingsInstantBridgeIfHostReady()).toBe(false);
        expect(document.getElementById('hami-settings-instant-bridge')).toBeTruthy();
    });

    it('لا يزيل الجسر أثناء غطاء التحميل ولو وُجد قسم تفاعلي', () => {
        expect(paintSettingsInstantChrome()).toBe(true);
        const host = document.querySelector('[data-testid="hami-settings-overlay-host"]');
        const shell = document.createElement('div');
        shell.setAttribute('data-settings-root', '');
        const frame = document.createElement('div');
        frame.className = 'hami-settings-section-frame';
        const wrap = document.createElement('div');
        const cover = document.createElement('div');
        cover.setAttribute('data-settings-section-cover', '1');
        cover.setAttribute('aria-busy', 'true');
        const interactive = document.createElement('div');
        interactive.setAttribute('data-settings-interactive', 'true');
        wrap.appendChild(cover);
        wrap.appendChild(interactive);
        frame.appendChild(wrap);
        shell.appendChild(frame);
        host?.appendChild(shell);

        expect(dismissSettingsInstantBridgeIfHostReady()).toBe(false);
        expect(document.getElementById('hami-settings-instant-bridge')).toBeTruthy();
    });

    it('skips bridge when host already has an interactive shown section', () => {
        const host = document.createElement('div');
        host.setAttribute('data-testid', 'hami-settings-overlay-host');
        const header = document.createElement('header');
        header.className = 'hami-settings-header';
        Object.defineProperty(header, 'getBoundingClientRect', {
            value: () => ({ height: 72, width: 320, top: 0, left: 0, bottom: 72, right: 320, x: 0, y: 0, toJSON: () => ({}) }),
        });
        const shell = document.createElement('div');
        shell.setAttribute('data-testid', 'hami-settings-shell');
        shell.setAttribute('data-settings-root', '');
        const frame = document.createElement('div');
        frame.className = 'hami-settings-section-frame';
        const wrap = document.createElement('div');
        const interactive = document.createElement('div');
        interactive.setAttribute('data-settings-interactive', 'true');
        wrap.appendChild(interactive);
        frame.appendChild(wrap);
        shell.appendChild(frame);
        host.appendChild(shell);
        host.appendChild(header);
        document.body.appendChild(host);

        expect(paintSettingsInstantChrome()).toBe(true);
        expect(document.getElementById('hami-settings-instant-bridge')).toBeNull();
        expect(host.style.visibility).toBe('visible');
    });

    it('conceals the portal host without blocking reopen by default (prime-safe)', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'hami-settings-overlay-host');
        document.body.appendChild(layer);
        paintSettingsInstantChrome();
        concealSettingsWarmShell();

        expect(isSettingsForceVisible()).toBe(false);
        expect(layer.style.visibility).toBe('hidden');
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(false);
        expect(isSettingsCloseGuarded()).toBe(false);
        expect(isSettingsReopenSuppressed()).toBe(false);
    });

    it('conceal with suppressReopen blocks reopen briefly (real user close)', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'hami-settings-overlay-host');
        document.body.appendChild(layer);
        paintSettingsInstantChrome();
        concealSettingsWarmShell({ suppressReopen: true });

        expect(isSettingsReopenSuppressed()).toBe(true);
        vi.advanceTimersByTime(500);
        expect(isSettingsReopenSuppressed()).toBe(false);
    });

    it('suppressSettingsReopen blocks until window elapses', () => {
        suppressSettingsReopen(200);
        expect(isSettingsReopenSuppressed()).toBe(true);
        vi.advanceTimersByTime(200);
        expect(isSettingsReopenSuppressed()).toBe(false);
    });

    it('لا يطلي أثناء كبح إعادة الفتح أو سمة الإغلاق', () => {
        suppressSettingsReopen(200);
        expect(paintSettingsInstantChrome()).toBe(false);
        expect(isSettingsForceVisible()).toBe(false);
        expect(document.documentElement.getAttribute('data-hami-settings-open')).toBeNull();

        clearSettingsReopenSuppress();
        document.documentElement.setAttribute('data-hami-settings-closing', '1');
        expect(paintSettingsInstantChrome()).toBe(false);
        expect(isSettingsForceVisible()).toBe(false);
        document.documentElement.removeAttribute('data-hami-settings-closing');
    });

    it('arms the connected host after the instant bridge is removed', () => {
        expect(paintSettingsInstantChrome()).toBe(true);
        const bridge = document.getElementById('hami-settings-instant-bridge');
        expect(bridge).toBeTruthy();

        const host = document.querySelector('[data-testid="hami-settings-overlay-host"]');
        expect(host).toBeTruthy();
        host?.classList.add('hami-settings-overlay-layer--visible');
        bridge?.remove();

        window.dispatchEvent(new Event('pointerup', { bubbles: true }));
        window.dispatchEvent(new Event('click', { bubbles: true }));

        expect(isSettingsCloseGuarded()).toBe(false);
        expect(isSettingsOverlayInteractionArmed(host as HTMLElement)).toBe(true);
        expect(host?.classList.contains('hami-settings-overlay-layer--interact')).toBe(true);
    });

    it('arms interaction immediately after open-gesture click is swallowed', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'hami-settings-overlay-host');
        document.body.appendChild(layer);

        paintSettingsInstantChrome();
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(false);
        expect(isSettingsCloseGuarded()).toBe(true);

        window.dispatchEvent(new Event('pointerup', { bubbles: true }));
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(false);
        window.dispatchEvent(new Event('click', { bubbles: true }));
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(true);
        expect(isSettingsCloseGuarded()).toBe(false);
    });

    it('بعد تسليح التفاعل يُسمح بالإغلاق بنفس المؤشر — WebView يعيد استخدام pointerId', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'hami-settings-overlay-host');
        document.body.appendChild(layer);

        beginSettingsOpenGesture(11);
        paintSettingsInstantChrome();
        expect(isSettingsOpenGestureBlockingClose()).toBe(true);

        window.dispatchEvent(new Event('pointerup', { bubbles: true }));
        window.dispatchEvent(new Event('click', { bubbles: true }));

        expect(isSettingsCloseGuarded()).toBe(false);
        expect(isSettingsOpenGestureBlockingClose()).toBe(false);
    });

    it('scheduleSettingsOverlayInteractionArm falls back by timeout', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'hami-settings-overlay-host');
        layer.classList.add('hami-settings-overlay-layer--visible');
        document.body.appendChild(layer);

        scheduleSettingsOverlayInteractionArm(layer);
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(false);

        vi.advanceTimersByTime(SETTINGS_INTERACT_ARM_MS);
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(true);
        expect(isSettingsCloseGuarded()).toBe(false);
    });

    it('does not restart arm schedule when Host/Shell re-invoke', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'hami-settings-overlay-host');
        layer.classList.add('hami-settings-overlay-layer--visible');
        document.body.appendChild(layer);

        scheduleSettingsOverlayInteractionArm(layer);
        window.dispatchEvent(new Event('pointerup', { bubbles: true }));
        scheduleSettingsOverlayInteractionArm(layer);
        window.dispatchEvent(new Event('click', { bubbles: true }));
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(true);
    });

    it('suppressSettingsReopen swallows residual gear click then clears', () => {
        const gear = document.createElement('button');
        gear.setAttribute('data-testid', 'header-settings-trigger');
        document.body.appendChild(gear);

        suppressSettingsReopen();
        expect(isSettingsReopenSuppressed()).toBe(true);

        const residual = new MouseEvent('click', { bubbles: true, cancelable: true });
        const stopped = vi.fn();
        residual.stopImmediatePropagation = stopped;
        gear.dispatchEvent(residual);

        expect(residual.defaultPrevented).toBe(true);
        expect(stopped).toHaveBeenCalled();
        expect(isSettingsReopenSuppressed()).toBe(false);
    });

    it('suppressSettingsReopen ignores non-gear click and keeps window until timeout', () => {
        suppressSettingsReopen(90);
        expect(isSettingsReopenSuppressed()).toBe(true);
        window.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(isSettingsReopenSuppressed()).toBe(true);
        vi.advanceTimersByTime(90);
        expect(isSettingsReopenSuppressed()).toBe(false);
    });

    it('suppressSettingsReopen allows intentional gear open after window elapses', () => {
        const gear = document.createElement('button');
        gear.setAttribute('data-testid', 'header-settings-trigger');
        document.body.appendChild(gear);

        suppressSettingsReopen(90);
        vi.advanceTimersByTime(90);
        expect(isSettingsReopenSuppressed()).toBe(false);

        const intentional = new MouseEvent('click', { bubbles: true, cancelable: true });
        gear.dispatchEvent(intentional);
        expect(intentional.defaultPrevented).toBe(false);
    });

    it('conceal blurs close button before aria-hidden and restores gear focus', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'hami-settings-overlay-host');
        const close = document.createElement('button');
        close.className = 'hami-settings-close';
        close.setAttribute('data-testid', 'settings-shell-close');
        layer.appendChild(close);
        document.body.appendChild(layer);

        const gear = document.createElement('button');
        gear.setAttribute('data-testid', 'header-settings-trigger');
        document.body.appendChild(gear);

        paintSettingsInstantChrome();
        close.focus();
        expect(document.activeElement).toBe(close);

        concealSettingsWarmShell({ suppressReopen: true });

        expect(layer.getAttribute('aria-hidden')).toBe('true');
        expect(layer.hasAttribute('inert')).toBe(true);
        expect(layer.contains(document.activeElement)).toBe(false);
        expect(document.activeElement).toBe(gear);
    });

    it('conceal priming does not steal focus from outside the overlay', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'hami-settings-overlay-host');
        const close = document.createElement('button');
        close.className = 'hami-settings-close';
        layer.appendChild(close);
        document.body.appendChild(layer);

        const home = document.createElement('button');
        home.setAttribute('data-testid', 'home-tile');
        document.body.appendChild(home);
        home.focus();

        concealSettingsWarmShell();

        expect(document.activeElement).toBe(home);
        expect(layer.getAttribute('aria-hidden')).toBe('true');
    });

    it('armSettingsOverlayInteraction enables pointer events immediately', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'hami-settings-overlay-host');
        document.body.appendChild(layer);
        armSettingsOverlayInteraction(layer);
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(true);
        expect(layer.style.pointerEvents).toBe('auto');
        expect(isSettingsCloseGuarded()).toBe(false);
    });
});
