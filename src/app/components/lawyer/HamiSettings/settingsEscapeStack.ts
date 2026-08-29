export type SettingsEscapeSnapshot = {
    smartDialogOpen: boolean;
    /** عدّاد المسح النهائي نشط — Escape يلغي العدّ لا يغلق الإعدادات */
    wipeCountdownActive?: boolean;
    /** لوحة نسخ/معاينة استيراد مفتوحة */
    backupUiOpen?: boolean;
    /** ورقة تخصيص قسم المنظر */
    appearanceCustomizeOpen?: boolean;
    /** ورقة الشروط/النبذة في تبويب الحساب */
    accountLegalDocumentOpen?: boolean;
};

export type SettingsEscapeAction =
    | 'dismiss-dialog'
    | 'cancel-wipe-countdown'
    | 'dismiss-backup-ui'
    | 'dismiss-appearance-customize'
    | 'dismiss-account-legal-document'
    | 'close-settings';

export function resolveSettingsEscapeAction(snapshot: SettingsEscapeSnapshot): SettingsEscapeAction {
    if (snapshot.smartDialogOpen) return 'dismiss-dialog';
    if (snapshot.wipeCountdownActive) return 'cancel-wipe-countdown';
    if (snapshot.backupUiOpen) return 'dismiss-backup-ui';
    if (snapshot.appearanceCustomizeOpen) return 'dismiss-appearance-customize';
    if (snapshot.accountLegalDocumentOpen) return 'dismiss-account-legal-document';
    return 'close-settings';
}

/** حراس Escape عابرة — تُسجَّل من hooks الأقسام */
let wipeCountdownCancel: (() => void) | null = null;
let wipeCountdownActive = false;
let backupUiDismiss: (() => void) | null = null;
let backupUiOpen = false;
let appearanceCustomizeDismiss: (() => void) | null = null;
let appearanceCustomizeOpen = false;
let accountLegalDocumentDismiss: (() => void) | null = null;
let accountLegalDocumentOpen = false;

export function registerSettingsWipeCountdownGuard(
    active: boolean,
    onCancel: (() => void) | null = null,
): void {
    wipeCountdownActive = active;
    wipeCountdownCancel = active ? onCancel : null;
}

export function registerSettingsBackupUiGuard(
    active: boolean,
    onDismiss: (() => void) | null = null,
): void {
    backupUiOpen = active;
    backupUiDismiss = active ? onDismiss : null;
}

export function registerAppearanceCustomizeGuard(
    active: boolean,
    onDismiss: (() => void) | null = null,
): void {
    appearanceCustomizeOpen = active;
    appearanceCustomizeDismiss = active ? onDismiss : null;
}

export function registerAccountLegalDocumentGuard(
    active: boolean,
    onDismiss: (() => void) | null = null,
): void {
    accountLegalDocumentOpen = active;
    accountLegalDocumentDismiss = active ? onDismiss : null;
}

export function readSettingsEscapeGuards(): {
    wipeCountdownActive: boolean;
    backupUiOpen: boolean;
    appearanceCustomizeOpen: boolean;
    accountLegalDocumentOpen: boolean;
    cancelWipeCountdown: (() => void) | null;
    dismissBackupUi: (() => void) | null;
    dismissAppearanceCustomize: (() => void) | null;
    dismissAccountLegalDocument: (() => void) | null;
} {
    return {
        wipeCountdownActive,
        backupUiOpen,
        appearanceCustomizeOpen,
        accountLegalDocumentOpen,
        cancelWipeCountdown: wipeCountdownCancel,
        dismissBackupUi: backupUiDismiss,
        dismissAppearanceCustomize: appearanceCustomizeDismiss,
        dismissAccountLegalDocument: accountLegalDocumentDismiss,
    };
}

/** للاختبارات */
export function resetSettingsEscapeGuardsForTests(): void {
    wipeCountdownActive = false;
    wipeCountdownCancel = null;
    backupUiOpen = false;
    backupUiDismiss = null;
    appearanceCustomizeOpen = false;
    appearanceCustomizeDismiss = null;
    accountLegalDocumentOpen = false;
    accountLegalDocumentDismiss = null;
}
