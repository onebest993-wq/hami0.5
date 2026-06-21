/** فتح hub tiles (تنفيذ / دعاوى / معاملات) من الرئيسية */
export type HubArchiveId = 'execution' | 'lawsuit' | 'transaction';

export const HUB_SHELL_FEATURES: Record<HubArchiveId, string> = {
    execution: 'تنفيذ',
    lawsuit: 'دعاوى',
    transaction: 'معاملات',
};

export function hubShellFeature(archiveId: HubArchiveId): string {
    return HUB_SHELL_FEATURES[archiveId];
}

export type OpenHubArchiveShellInput = {
    signedIn: boolean;
    archiveId: HubArchiveId;
    onOpen: (archiveId: HubArchiveId) => void;
    onSignedOut?: () => void;
};

export function openHubArchiveFromShell(input: OpenHubArchiveShellInput): boolean {
    if (!input.signedIn) {
        input.onSignedOut?.();
        return false;
    }
    input.onOpen(input.archiveId);
    return true;
}

export function hubArchiveIdFromWidget(widgetId: string): HubArchiveId | null {
    if (widgetId === 'hubExecution') return 'execution';
    if (widgetId === 'hubLawsuit') return 'lawsuit';
    if (widgetId === 'hubTransaction') return 'transaction';
    return null;
}
