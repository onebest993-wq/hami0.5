export const SETTINGS_INSTANT_CHROME = '#0B1021';
export const SETTINGS_INSTANT_BRIDGE_ID = 'hami-settings-instant-bridge';
export const SETTINGS_OVERLAY_HOST_SELECTOR = '[data-testid="hami-settings-overlay-host"]';
export const SETTINGS_GEAR_TRIGGER_SELECTOR = '[data-testid="header-settings-trigger"]';
/** طبقة الـ overlay — قشرة الطلاء وHost يتبنيان العقدة نفسها */
export const SETTINGS_OVERLAY_HOST_CLASS =
    'fixed inset-0 z-[200] flex h-[100dvh] flex-col overflow-hidden overscroll-none font-sans hami-settings-overlay-layer hami-settings-overlay-host';
export const SETTINGS_OVERLAY_REACT_READY_SELECTOR =
    '[data-settings-root], [data-testid="hami-settings-shell"]';
/** قسم ظاهر ومخطوط — لا قشرة فارغة ولا تبويب مركون */
export const SETTINGS_OVERLAY_SECTION_INTERACTIVE_SELECTOR =
    '.hami-settings-section-frame > :not([hidden]):not([data-settings-section-park="1"]) [data-settings-interactive="true"]';
