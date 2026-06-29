/** فتح مركز المعاملات من لوحة المحامي */
export const TRANSACTIONS_SHELL_FEATURE = 'مركز المعاملات';

export type OpenTransactionsShellInput = {
    signedIn: boolean;
    onOpen: () => void;
    onSignedOut?: () => void;
};

export function openTransactionsFromShell(input: OpenTransactionsShellInput): boolean {
    if (!input.signedIn) {
        input.onSignedOut?.();
        return false;
    }
    input.onOpen();
    return true;
}
