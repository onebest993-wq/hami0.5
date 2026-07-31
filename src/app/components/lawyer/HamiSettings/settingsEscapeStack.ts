export type SettingsEscapeSnapshot = {
    smartDialogOpen: boolean;
    /** عدّاد المسح النهائي نشط — Escape يلغي العدّ لا يغلق الإعدادات */
    wipeCountdownActive?: boolean;
    /** لوحة نسخ/معاينة استيراد مفتوحة */
    backupUiOpen?: boolean;
};

export type SettingsEscapeAction =
    | 'dismiss-dialog'
    | 'cancel-wipe-countdown'
    | 'dismiss-backup-ui'
    | 'close-settings';

export function resolveSettingsEscapeAction(snapshot: SettingsEscapeSnapshot): SettingsEscapeAction {
    if (snapshot.smartDialogOpen) return 'dismiss-dialog';
    if (snapshot.wipeCountdownActive) return 'cancel-wipe-countdown';
    if (snapshot.backupUiOpen) return 'dismiss-backup-ui';
    return 'close-settings';
}

/** حراس Escape عابرة — تُسجَّل من hooks الأقسام */
let wipeCountdownCancel: (() => void) | null = null;
let wipeCountdownActive = false;
let backupUiDismiss: (() => void) | null = null;
let backupUiOpen = false;

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

export function readSettingsEscapeGuards(): {
    wipeCountdownActive: boolean;
    backupUiOpen: boolean;
    cancelWipeCountdown: (() => void) | null;
    dismissBackupUi: (() => void) | null;
} {
    return {
        wipeCountdownActive,
        backupUiOpen,
        cancelWipeCountdown: wipeCountdownCancel,
        dismissBackupUi: backupUiDismiss,
    };
}

/** للاختبارات */
export function resetSettingsEscapeGuardsForTests(): void {
    wipeCountdownActive = false;
    wipeCountdownCancel = null;
    backupUiOpen = false;
    backupUiDismiss = null;
}
