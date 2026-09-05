import { snapSettingsShellClose, snapSettingsShellOpen } from '@/app/services/settings/settingsShellSnap';

/**
 * مصدر حقيقة كشف الطبقة قبل التزام React.
 * علم html[data-hami-settings-open] إسقاط CSS فقط — لا يُقرأ في isSettingsLayerOpen.
 */
let revealed = false;

export function isSettingsForceVisible(): boolean {
    return revealed;
}

/** React open أو كشف الطلاء الفوري — بلا قراءة سمة html */
export function isSettingsLayerOpen(reactOpen: boolean): boolean {
    return reactOpen || revealed;
}

/** إسقاط CSS للخروج — لا يُعاد الفتح/الطلاء أثناء التلاشي */
export function isSettingsOverlayCssExiting(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute('data-hami-settings-closing') === '1';
}

export function markSettingsOverlayRevealed(): void {
    revealed = true;
    snapSettingsShellOpen();
}

export function clearSettingsOverlayPresence(): void {
    revealed = false;
    snapSettingsShellClose();
}

/** يُشفي العلم والإسقاط معاً — لا يترك html مفتوحاً بلا revealed */
export function clearSettingsForceVisible(): void {
    clearSettingsOverlayPresence();
}
