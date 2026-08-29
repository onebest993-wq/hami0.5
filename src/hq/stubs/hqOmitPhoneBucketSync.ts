/** بديل بناء المقر — مزامنة إضابير الدعاوى/التنفيذ ليست سطح المقر. */
export type CloudSyncBucket = 'execution' | 'lawsuit' | 'notes' | 'unsupported';

export type PerformCloudSyncResult = {
    ok: boolean;
    skipped?: boolean;
    error?: Error;
};

export function resolveSyncBucket(_localKey: string): CloudSyncBucket {
    return 'unsupported';
}

export async function canRunCloudSync(): Promise<boolean> {
    return false;
}

export async function performCloudSyncBuckets(): Promise<PerformCloudSyncResult[]> {
    return [];
}

export async function performCloudSyncBucket(): Promise<PerformCloudSyncResult> {
    return { ok: true, skipped: true };
}
