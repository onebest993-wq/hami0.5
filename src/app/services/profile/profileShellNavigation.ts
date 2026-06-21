/** فتح الملف المهني من هيدر لوحة المحامي */
export const PROFILE_SHELL_FEATURE = 'الملف المهني';

export type OpenProfileShellInput = {
    signedIn: boolean;
    onOpen: () => void;
    onSignedOut?: () => void;
};

export function openProfileFromShell(input: OpenProfileShellInput): boolean {
    if (!input.signedIn) {
        input.onSignedOut?.();
        return false;
    }
    input.onOpen();
    return true;
}
