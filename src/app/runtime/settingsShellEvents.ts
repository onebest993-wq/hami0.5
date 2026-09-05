/** أحداث فتح/ترطيب مركز الإعدادات — بلا اعتماد على hydrator أو loader */

export const SETTINGS_SHELL_HYDRATED_EVENT = 'hami:settings-shell-hydrated';
/** pointerdown على زر الإعدادات — يركّب Host مخفياً قبل الـ click */
export const SETTINGS_PRIME_HOST_EVENT = 'hami:settings-prime-host';
/** إغلاق من زر X على قشرة الطلاء — قبل تركيب Host */
export const SETTINGS_INSTANT_DISMISS_EVENT = 'hami:settings-instant-dismiss';
/** تبديل تبويب على قشرة الطلاء — Host يزامن الحالة إن كان مركّباً */
export const SETTINGS_INSTANT_SECTION_EVENT = 'hami:settings-instant-section';
