/** فتح مهام الميدان من لوحة المحامي */
export const FIELD_TASKS_SHELL_FEATURE = 'مهام اليوم الميدانية';

export type OpenFieldTasksShellInput = {
    signedIn: boolean;
    onOpen: () => void;
    onSignedOut?: () => void;
};

export function openFieldTasksFromShell(input: OpenFieldTasksShellInput): boolean {
    if (!input.signedIn) {
        input.onSignedOut?.();
        return false;
    }
    input.onOpen();
    return true;
}
