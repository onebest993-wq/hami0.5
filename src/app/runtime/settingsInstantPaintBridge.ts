import { SETTINGS_NAV } from '@/app/services/settings/nav';
import { readPersistedSettingsSection } from '@/app/services/settings/settingsSectionPersistence';
import { blurFocusWithin } from '@/app/utils/inertProps';
import {
    SETTINGS_INSTANT_BRIDGE_ID,
    SETTINGS_INSTANT_CHROME,
} from './settingsInstantPaintConstants';

export function detachSettingsInstantBridge(): void {
    if (typeof document === 'undefined') return;
    const bridge = document.getElementById(SETTINGS_INSTANT_BRIDGE_ID);
    if (!(bridge instanceof HTMLElement)) return;
    blurFocusWithin(bridge);
    bridge.remove();
}

export function ensureSettingsInstantChromeBridge(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const active = readPersistedSettingsSection();
    const existing = document.getElementById(SETTINGS_INSTANT_BRIDGE_ID);
    if (existing instanceof HTMLElement) {
        if (existing.getAttribute('data-instant-section') === active) return existing;
        existing.remove();
    }

    const bridge = document.createElement('div');
    bridge.id = SETTINGS_INSTANT_BRIDGE_ID;
    bridge.setAttribute('data-testid', 'settings-instant-bridge');
    bridge.setAttribute('data-settings-instant-chrome', '1');
    bridge.setAttribute('data-instant-section', active);
    bridge.setAttribute('role', 'presentation');
    bridge.setAttribute('aria-hidden', 'true');
    bridge.dir = 'rtl';
    Object.assign(bridge.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '199',
        backgroundColor: SETTINGS_INSTANT_CHROME,
        color: '#fff',
        pointerEvents: 'none',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
    } as CSSStyleDeclaration);

    bridge.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;min-height:0;padding-top:max(0.65rem,env(safe-area-inset-top,0px));padding-inline-start:max(1rem,env(safe-area-inset-left,0px));padding-inline-end:max(1rem,env(safe-area-inset-right,0px));box-sizing:border-box;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;margin-bottom:0.85rem;">
          <h1 style="margin:0;font-size:1.0625rem;font-weight:600;letter-spacing:-0.02em;line-height:1.25;color:#fff;">مركز الإعدادات</h1>
        </div>
        <nav aria-hidden="true" style="display:flex;align-items:stretch;gap:0.15rem;width:min(100%,22.5rem);margin-inline:auto;padding:0.2rem;border-radius:0.75rem;background:rgba(255,255,255,0.045);border:1px solid rgba(255,255,255,0.06);">
          ${SETTINGS_NAV.map((tab) => {
              const on = tab.id === active;
              return `<span data-instant-tab="${tab.id}" data-instant-active="${on ? '1' : '0'}" style="flex:1 1 0;min-width:0;min-height:44px;display:inline-flex;align-items:center;justify-content:center;border-radius:0.55rem;font-size:12.5px;font-weight:600;color:${on ? '#f4ead0' : 'rgba(255,255,255,0.48)'};background:${on ? 'rgba(230,198,115,0.14)' : 'transparent'};">${tab.label}</span>`;
          }).join('')}
        </nav>
      </div>
    `;

    document.body.appendChild(bridge);
    return bridge;
}
