import type { SettingsSectionId } from '@/app/services/settings/types';
import { SETTINGS_NAV } from '@/app/services/settings/nav';
import {
    SETTINGS_CLOSE_ICON_INNER,
    SETTINGS_NAV_ICON_INNER,
} from '@/app/services/settings/settingsNavIconInner';

const TAB_ON_COLOR = '#f4ead0';
const TAB_OFF_COLOR = 'rgba(255,255,255,0.48)';
const TAB_ON_BG = 'rgba(230,198,115,0.14)';
const TAB_ON_ICON = '#e6c673';

function stemSvg(inner: string, size = 14): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

const CLOSE_SVG = stemSvg(SETTINGS_CLOSE_ICON_INNER, 16);

const TAB_BASE_STYLE =
    'flex:1 1 0;min-width:0;min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:0.25rem;border:0;padding:0;border-radius:0.55rem;font-size:12px;font-weight:600;pointer-events:auto;touch-action:manipulation;-webkit-tap-highlight-color:transparent;cursor:pointer;font-family:inherit;';

export function applySettingsInstantTabPaint(tab: HTMLElement, on: boolean): void {
    tab.setAttribute('data-instant-active', on ? '1' : '0');
    tab.classList.toggle('hami-settings-tab--active', on);
    tab.style.color = on ? TAB_ON_COLOR : TAB_OFF_COLOR;
    tab.style.background = on ? TAB_ON_BG : 'transparent';
    const icon = tab.querySelector('.hami-settings-tab-icon');
    if (icon instanceof HTMLElement) {
        icon.style.opacity = on ? '1' : '0.7';
        icon.style.color = on ? TAB_ON_ICON : 'currentColor';
    }
}

export function syncSettingsInstantTabActive(root: ParentNode, active: SettingsSectionId): void {
    root.querySelectorAll('[data-instant-tab]').forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        applySettingsInstantTabPaint(el, el.getAttribute('data-instant-tab') === active);
    });
}

/**
 * قشرة الهيدر — نفس هندسة الكروم الحي (إغلاق 44px + أيقونات + عرض 36rem)
 * حتى لا تقفز التبويبات عند تسليم Host. الأنماط مضمَّنة لأن CSS المركز قد لا يكون محمّلاً.
 * التبويبات قابلة للمس قبل Host حتى لا يُفتح الأمن دائماً بعد لمس «المنظر».
 */
export function buildSettingsInstantChromeInnerHtml(active: SettingsSectionId): string {
    const tabs = SETTINGS_NAV.map((tab) => {
        const on = tab.id === active;
        const color = on ? TAB_ON_COLOR : TAB_OFF_COLOR;
        const bg = on ? TAB_ON_BG : 'transparent';
        const iconColor = on ? TAB_ON_ICON : 'currentColor';
        return (
            `<button type="button" data-instant-tab="${tab.id}" data-instant-active="${on ? '1' : '0'}" class="hami-settings-tab${on ? ' hami-settings-tab--active' : ''}" style="${TAB_BASE_STYLE}color:${color};background:${bg};">` +
            `<span class="hami-settings-tab-icon" style="width:14px;height:14px;flex-shrink:0;opacity:${on ? '1' : '0.7'};color:${iconColor};display:inline-flex;">${stemSvg(SETTINGS_NAV_ICON_INNER[tab.id])}</span>` +
            `<span class="hami-settings-tab-label" style="line-height:1.1;white-space:nowrap;">${tab.label}</span>` +
            '</button>'
        );
    }).join('');

    return (
        `<header class="hami-settings-header" style="padding-top:max(0.5rem,var(--hami-lawyer-header-safe-top,env(safe-area-inset-top,0px)));padding-bottom:0.25rem;padding-inline-start:max(0.75rem,env(safe-area-inset-left,0px));padding-inline-end:max(0.75rem,env(safe-area-inset-right,0px));box-sizing:border-box;">` +
        '<div class="hami-settings-header-inner">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;margin-bottom:0.25rem;">' +
        '<h1 class="hami-settings-title" style="margin:0;font-size:0.9375rem;font-weight:600;letter-spacing:-0.02em;line-height:1.25;color:rgba(255,255,255,0.96);">مركز الإعدادات</h1>' +
        `<button type="button" data-testid="settings-instant-close" class="hami-settings-close" aria-label="إغلاق الإعدادات" style="display:flex;height:44px;width:44px;min-height:44px;min-width:44px;align-items:center;justify-content:center;border-radius:0.75rem;border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.78);background:transparent;pointer-events:auto;touch-action:manipulation;-webkit-tap-highlight-color:transparent;">${CLOSE_SVG}</button>` +
        '</div>' +
        `<nav aria-hidden="true" class="hami-settings-tabs" style="display:flex;align-items:stretch;gap:0.15rem;width:min(100%,36rem);margin-inline:auto;padding:0.15rem;border-radius:0.75rem;background:rgba(255,255,255,0.045);border:1px solid rgba(255,255,255,0.06);">${tabs}</nav>` +
        '</div></header>' +
        '<div data-testid="settings-instant-skeleton" aria-hidden="true" style="width:min(100%,36rem);margin:0.25rem auto 0;padding:0.5rem max(0.75rem,env(safe-area-inset-left,0px)) 0 max(0.75rem,env(safe-area-inset-right,0px));box-sizing:border-box;display:flex;flex-direction:column;gap:0.5rem;">' +
        '<div style="min-height:44px;border-radius:0.55rem;border:1px solid rgba(255,255,255,0.05);background:rgba(255,255,255,0.035);"></div>' +
        '<div style="min-height:44px;border-radius:0.55rem;border:1px solid rgba(255,255,255,0.05);background:rgba(255,255,255,0.035);"></div>' +
        '<div style="min-height:44px;border-radius:0.55rem;border:1px solid rgba(255,255,255,0.05);background:rgba(255,255,255,0.035);"></div>' +
        '</div>'
    );
}
