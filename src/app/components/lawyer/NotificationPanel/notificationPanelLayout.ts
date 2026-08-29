/** ثوابت تخطيط لوحة الإشعارات — بدون منطق */
export const NOTIFICATION_TAB_ORDER = ['forum', 'system'] as const;

export const NOTIFICATION_PANEL_ROOT_CLASS =
    'hami-notif-root fixed inset-0 z-[200] flex flex-col justify-end sm:justify-start sm:items-end sm:pe-[max(1rem,env(safe-area-inset-right))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:ps-[max(0px,env(safe-area-inset-left))] overscroll-none';

export const NOTIFICATION_PANEL_SHEET_CLASS =
    'hami-notif-sheet relative w-full sm:max-w-[min(100%,420px)] md:max-w-[min(100%,460px)] lg:max-w-[min(100%,480px)] flex flex-col overflow-hidden touch-pan-y ps-[env(safe-area-inset-left)] pe-[env(safe-area-inset-right)] pb-[max(12px,env(safe-area-inset-bottom))]';
