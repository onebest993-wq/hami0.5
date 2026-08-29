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
        expect(getSettingsShellRevealedAt()).not.toBeNull();
        expect(layer.style.visibility).toBe('visible');
        expect(layer.style.pointerEvents).toBe('auto');
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(false);
        expect(isSettingsCloseGuarded()).toBe(true);
        expect(isSettingsLayerOpen(false)).toBe(true);
    });

    it('paints instant chrome bridge when no host exists', () => {
        expect(paintSettingsInstantChrome()).toBe(true);
        const bridge = document.getElementById('hami-settings-instant-bridge');
        expect(bridge).toBeTruthy();
        expect(bridge?.textContent).toContain('مركز الإعدادات');
        expect(bridge?.style.pointerEvents).toBe('none');
        expect(bridge?.style.zIndex).toBe('199');
        expect(bridge?.getAttribute('data-instant-section')).toBe('security');
        expect(bridge?.querySelector('[data-instant-tab="security"]')?.getAttribute('data-instant-active')).toBe(
            '1',
        );
        expect(isSettingsForceVisible()).toBe(true);
        expect(isSettingsCloseGuarded()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-settings-open')).toBe('1');
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

    it('يزيل الجسر فور وجود Host ولا يترك طبقة حاجبة', () => {
        expect(paintSettingsInstantChrome()).toBe(true);
        expect(document.getElementById('hami-settings-instant-bridge')).toBeTruthy();

        const host = document.createElement('div');
        host.setAttribute('data-testid', 'hami-settings-overlay-host');
        document.body.appendChild(host);

        expect(dismissSettingsInstantBridgeIfHostReady()).toBe(true);
        expect(document.getElementById('hami-settings-instant-bridge')).toBeNull();
        expect(host.style.visibility).toBe('visible');
    });

    it('skips bridge when host already has laid-out settings header', () => {
        const host = document.createElement('div');
        host.setAttribute('data-testid', 'hami-settings-overlay-host');
        const header = document.createElement('header');
        header.className = 'hami-settings-header';
        Object.defineProperty(header, 'getBoundingClientRect', {
            value: () => ({ height: 72, width: 320, top: 0, left: 0, bottom: 72, right: 320, x: 0, y: 0, toJSON: () => ({}) }),
        });
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

    it('arms the connected host after the instant bridge is removed', () => {
        expect(paintSettingsInstantChrome()).toBe(true);
        const bridge = document.getElementById('hami-settings-instant-bridge');
        expect(bridge).toBeTruthy();

        const host = document.createElement('div');
        host.setAttribute('data-testid', 'hami-settings-overlay-host');
        host.classList.add('hami-settings-overlay-layer--visible');
        document.body.appendChild(host);
        bridge?.remove();

        window.dispatchEvent(new Event('pointerup', { bubbles: true }));
        window.dispatchEvent(new Event('click', { bubbles: true }));

        expect(isSettingsCloseGuarded()).toBe(false);
        expect(isSettingsOverlayInteractionArmed(host)).toBe(true);
        expect(host.classList.contains('hami-settings-overlay-layer--interact')).toBe(true);
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
