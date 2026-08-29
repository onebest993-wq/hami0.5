import {
    NOTIFICATION_BRIDGE_ID,
    NOTIFICATION_LAYER_SELECTOR,
} from './notificationInstantPaintConstants';
import { applyNotificationLayerVisible } from './notificationInstantPaintDom';
import { isNotificationForceVisible } from './notificationInstantPaintState';
import {
    HAMI_APP_STATE_EVENT,
    type HamiAppStateDetail,
} from '@/app/runtime/appStateEvents';

let chromeHandoffRaf = 0;
let handoffBackgroundUnbind: (() => void) | null = null;

function clearNotificationChromeHandoffRaf(): void {
    if (!chromeHandoffRaf || typeof window === 'undefined') return;
    window.cancelAnimationFrame(chromeHandoffRaf);
    chromeHandoffRaf = 0;
}

function unbindNotificationChromeHandoffBackground(): void {
    if (!handoffBackgroundUnbind) return;
    handoffBackgroundUnbind();
    handoffBackgroundUnbind = null;
}

export function cancelNotificationChromeHandoff(): void {
    clearNotificationChromeHandoffRaf();
    unbindNotificationChromeHandoffBackground();
}

function hostHasLaidOutSheet(host: HTMLElement): boolean {
    const sheet = host.querySelector('[data-testid="notification-panel"]');
    if (!(sheet instanceof HTMLElement)) return false;
    return sheet.getBoundingClientRect().height > 8;
}

export function ensureNotificationInstantBridge(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const existing = document.getElementById(NOTIFICATION_BRIDGE_ID);
    if (existing instanceof HTMLElement) return existing;

    const bridge = document.createElement('div');
    bridge.id = NOTIFICATION_BRIDGE_ID;
    bridge.setAttribute('data-testid', 'notifications-instant-bridge');
    bridge.setAttribute('role', 'dialog');
    bridge.setAttribute('aria-modal', 'true');
    bridge.setAttribute('aria-label', 'الإشعارات');
    bridge.setAttribute('aria-busy', 'true');
    bridge.dir = 'rtl';
    Object.assign(bridge.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483000',
        backgroundColor: 'transparent',
        color: '#fff',
        pointerEvents: 'auto',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
    } as CSSStyleDeclaration);

    /* بلا transform/opacity inline — CSS يحرّك الورقة والتعتيم */
    bridge.innerHTML = `
      <button type="button" aria-hidden="true" tabindex="-1" class="hami-notif-overlay-btn" style="position:absolute;inset:0;border:0;padding:0;"></button>
      <div style="display:flex;flex-direction:column;justify-content:flex-end;height:100%;min-height:0;position:relative;">
        <div class="hami-notif-sheet-track">
          <div class="hami-notif-sheet" style="width:100%;max-height:92dvh;border-radius:1.35rem 1.35rem 0 0;background:#080D18;padding:max(0.85rem,env(safe-area-inset-top,0px)) 1rem max(12px,env(safe-area-inset-bottom,0px));box-sizing:border-box;">
            <h1 style="margin:0;font-size:1.15rem;font-weight:800;letter-spacing:-0.03em;color:#fff;">الإشعارات</h1>
            <span class="sr-only">جاري فتح الإشعارات</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(bridge);
    return bridge;
}

export function removeNotificationInstantBridge(): void {
    if (typeof document === 'undefined') return;
    cancelNotificationChromeHandoff();
    const bridge = document.getElementById(NOTIFICATION_BRIDGE_ID);
    if (!(bridge instanceof HTMLElement)) return;
    bridge.remove();
}

export function scheduleNotificationChromeHandoff(): void {
    if (typeof window === 'undefined') return;
    cancelNotificationChromeHandoff();
    let ticks = 0;

    const finishIfHostReady = (): boolean => {
        if (!isNotificationForceVisible()) return true;
        const host = document.querySelector(NOTIFICATION_LAYER_SELECTOR);
        if (!(host instanceof HTMLElement) || !hostHasLaidOutSheet(host)) return false;
        applyNotificationLayerVisible(host, true);
        const bridge = document.getElementById(NOTIFICATION_BRIDGE_ID);
        if (bridge instanceof HTMLElement) {
            bridge.style.zIndex = '199';
        }
        chromeHandoffRaf = window.requestAnimationFrame(() => {
            chromeHandoffRaf = 0;
            removeNotificationInstantBridge();
        });
        return true;
    };

    const tick = () => {
        chromeHandoffRaf = 0;
        if (!isNotificationForceVisible()) return;
        if (typeof document !== 'undefined' && document.hidden) return;
        if (finishIfHostReady()) return;
        if (!document.getElementById(NOTIFICATION_BRIDGE_ID)) {
            ensureNotificationInstantBridge();
        }
        if (++ticks > 120) return;
        chromeHandoffRaf = window.requestAnimationFrame(tick);
    };

    const onBackground = () => {
        clearNotificationChromeHandoffRaf();
        if (finishIfHostReady()) {
            unbindNotificationChromeHandoffBackground();
        }
    };

    const onForeground = () => {
        if (!isNotificationForceVisible()) return;
        if (finishIfHostReady()) {
            unbindNotificationChromeHandoffBackground();
            return;
        }
        ticks = 0;
        clearNotificationChromeHandoffRaf();
        chromeHandoffRaf = window.requestAnimationFrame(tick);
    };

    const onVisibility = () => {
        if (document.hidden) onBackground();
        else onForeground();
    };

    const onAppState = (event: Event) => {
        const detail = (event as CustomEvent<HamiAppStateDetail>).detail;
        if (detail?.isActive === false) onBackground();
        else onForeground();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onBackground);
    window.addEventListener(HAMI_APP_STATE_EVENT, onAppState);
    handoffBackgroundUnbind = () => {
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('pagehide', onBackground);
        window.removeEventListener(HAMI_APP_STATE_EVENT, onAppState);
    };

    chromeHandoffRaf = window.requestAnimationFrame(tick);
}
