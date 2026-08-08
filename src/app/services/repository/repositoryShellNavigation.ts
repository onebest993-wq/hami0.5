export const REPOSITORY_SHELL_FEATURE = 'المستودع';

export type OpenRepositoryFromShellParams = {
    signedIn: boolean;
    onSignedOut: () => void;
    onOpen: () => void;
};

export function openRepositoryFromShell(params: OpenRepositoryFromShellParams): void {
    if (!params.signedIn) {
        params.onSignedOut();
        return;
    }
    params.onOpen();
}
