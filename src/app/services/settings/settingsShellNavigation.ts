/** فتح الإعدادات من هيدر لوحة المحامي */
export const SETTINGS_SHELL_FEATURE = 'الإعدادات';

type OpenSettingsShellInput = {
    signedIn: boolean;
    onOpen: () => void;
    onSignedOut?: () => void;
};

export function openSettingsFromShell(input: OpenSettingsShellInput): boolean {
    if (!input.signedIn) {
        input.onSignedOut?.();
        return false;
    }
    input.onOpen();
    return true;
}
