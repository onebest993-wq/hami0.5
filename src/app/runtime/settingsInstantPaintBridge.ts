import { persistSettingsSection, readPersistedSettingsSection } from '@/app/services/settings/settingsSectionPersistence';
import { isSettingsSectionId } from '@/app/services/settings/nav';
import type { SettingsSectionId } from '@/app/services/settings/types';
import { blurFocusWithin } from '@/app/utils/inertProps';
import { isSettingsOpenGestureBlockingClose } from './settingsInstantPaintInteract';
import { SETTINGS_INSTANT_DISMISS_EVENT, SETTINGS_INSTANT_SECTION_EVENT } from './settingsShellEvents';
import {
    buildSettingsInstantChromeInnerHtml,
    syncSettingsInstantTabActive,
} from './settingsInstantChromeMarkup';
import {
    SETTINGS_INSTANT_BRIDGE_ID,
    SETTINGS_INSTANT_CHROME,
} from './settingsInstantPaintConstants';
import { adoptSettingsOverlayHostNode } from './settingsInstantPaintHostAdopt';

export function detachSettingsInstantBridge(): void {
    if (typeof document === 'undefined') return;
    const bridge = document.getElementById(SETTINGS_INSTANT_BRIDGE_ID);
    if (!(bridge instanceof HTMLElement)) return;
    blurFocusWithin(bridge);
    bridge.remove();
}

function prefetchInstantSection(id: SettingsSectionId): void {
    if (id === 'security' || typeof window === 'undefined') return;
    void import('@/app/components/lawyer/HamiSettings/settingsSectionLoad')
        .then((m) => {
            m.prefetchSettingsSection(id);
        })
        .catch(() => {
            /* Host يحمّل القسم عند التركيب */
        });
}

function applyInstantSection(bridge: HTMLElement, id: SettingsSectionId): void {
    persistSettingsSection(id);
    bridge.setAttribute('data-instant-section', id);
    syncSettingsInstantTabActive(bridge, id);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(SETTINGS_INSTANT_SECTION_EVENT, { detail: id }));
    }
    prefetchInstantSection(id);
}

function bindSettingsInstantClose(bridge: HTMLElement): void {
    const closeBtn = bridge.querySelector('[data-testid="settings-instant-close"]');
    if (!(closeBtn instanceof HTMLElement) || closeBtn.dataset.hamiBound === '1') return;
    closeBtn.dataset.hamiBound = '1';
    const dismiss = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isSettingsOpenGestureBlockingClose()) return;
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new Event(SETTINGS_INSTANT_DISMISS_EVENT));
    };
    closeBtn.addEventListener('pointerdown', dismiss);
    closeBtn.addEventListener('click', dismiss);
}

function bindSettingsInstantTabs(bridge: HTMLElement): void {
    bridge.querySelectorAll('[data-instant-tab]').forEach((el) => {
        if (!(el instanceof HTMLElement) || el.dataset.hamiBound === '1') return;
        el.dataset.hamiBound = '1';
        el.addEventListener('pointerdown', (event) => {
            if (typeof event.button === 'number' && event.button !== 0) return;
            if (isSettingsOpenGestureBlockingClose()) return;
            const id = el.getAttribute('data-instant-tab');
            if (!isSettingsSectionId(id)) return;
            if (bridge.getAttribute('data-instant-section') === id) {
                prefetchInstantSection(id);
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            applyInstantSection(bridge, id);
        });
    });
}

function bindSettingsInstantChrome(bridge: HTMLElement): void {
    bindSettingsInstantClose(bridge);
    bindSettingsInstantTabs(bridge);
}

export function ensureSettingsInstantChromeBridge(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const active = readPersistedSettingsSection();
    const existing = document.getElementById(SETTINGS_INSTANT_BRIDGE_ID);
    if (existing instanceof HTMLElement) {
        if (existing.getAttribute('data-instant-section') === active) {
            bindSettingsInstantChrome(existing);
            return existing;
        }
        existing.remove();
    }

    const bridge = document.createElement('div');
    bridge.id = SETTINGS_INSTANT_BRIDGE_ID;
    bridge.setAttribute('data-testid', 'settings-instant-bridge');
    bridge.setAttribute('data-settings-instant-chrome', '1');
    bridge.setAttribute('data-instant-section', active);
    bridge.setAttribute('role', 'presentation');
    bridge.setAttribute('aria-hidden', 'true');
    bridge.dir = document.documentElement.dir === 'ltr' ? 'ltr' : 'rtl';
    Object.assign(bridge.style, {
        position: 'absolute',
        inset: '0',
        zIndex: '2',
        backgroundColor: SETTINGS_INSTANT_CHROME,
        color: '#fff',
        pointerEvents: 'none',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
    } as CSSStyleDeclaration);

    bridge.innerHTML = buildSettingsInstantChromeInnerHtml(active);
    bindSettingsInstantChrome(bridge);
    const host = adoptSettingsOverlayHostNode();
    if (host) host.appendChild(bridge);
    else document.body.appendChild(bridge);
    return bridge;
}
