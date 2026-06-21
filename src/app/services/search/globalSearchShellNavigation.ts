/** فتح البحث الشامل من هيدر اللوحة */
export const GLOBAL_SEARCH_SHELL_FEATURE = 'البحث الشامل';

export type OpenGlobalSearchShellInput = {
    signedIn: boolean;
    seed?: string;
    onOpen: (seed: string) => void;
    onSignedOut?: () => void;
};

export function openGlobalSearchFromShell(input: OpenGlobalSearchShellInput): boolean {
    if (!input.signedIn) {
        input.onSignedOut?.();
        return false;
    }
    input.onOpen(input.seed ?? '');
    return true;
}
