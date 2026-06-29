export type SettingsEscapeSnapshot = {
    smartDialogOpen: boolean;
};

export type SettingsEscapeAction = 'dismiss-dialog' | 'close-settings';

export function resolveSettingsEscapeAction(snapshot: SettingsEscapeSnapshot): SettingsEscapeAction {
    if (snapshot.smartDialogOpen) return 'dismiss-dialog';
    return 'close-settings';
}
