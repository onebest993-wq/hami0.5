import { performCloudSyncBuckets, type PerformCloudSyncResult } from '@/app/services/cloudSyncEngine';
import { STORAGE_KEYS } from '@/app/utils/constants';
import { resolveExecutionFilesStorageKey } from '@/app/utils/executionFilesStorage';
import { resolveLiveAuthUserIdForStorage } from '@/app/utils/liveAuthUserId';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import { isCloudSyncBucketEnabled } from '@/app/services/settings/cloudSyncBucket';
import type { AppSettingsState } from '@/app/services/settings/types';
import type { WorkCloudCheckpointPushResult } from '@/app/services/cloud/workCloudCheckpoint';

export type CloudSyncAllSummary = {
    ok: boolean;
    skipped: boolean;
    failed: boolean;
};

function summarize(values: PerformCloudSyncResult[]): CloudSyncAllSummary {
    if (values.length === 0) return { ok: false, skipped: true, failed: false };
    const failed = values.some((v) => !v.ok);
    const skipped = values.every((v) => v.skipped);
    return { ok: !failed && !skipped, skipped, failed };
}

function canAttemptWorkCheckpoint(settings: AppSettingsState): boolean {
    if (settings.security.localOnlyMode) return false;
    if (!settings.data.cloudSync) return false;
    return true;
}

async function pushWorkCheckpointIntoSummary(
    summary: CloudSyncAllSummary,
): Promise<CloudSyncAllSummary> {
    if (!summary.ok) return summary;
    try {
        const { pushWorkCloudCheckpointNow } = await import(
            '@/app/services/cloud/workCloudCheckpoint'
        );
        const checkpoint: WorkCloudCheckpointPushResult = await pushWorkCloudCheckpointNow();
        if (checkpoint.failed) {
            return { ok: false, skipped: false, failed: true };
        }
        return summary;
    } catch {
        return { ok: false, skipped: false, failed: true };
    }
}

async function pushCalendarCheckpointWhenBucketsEmpty(): Promise<CloudSyncAllSummary> {
    try {
        const { pushWorkCloudCheckpointNow } = await import(
            '@/app/services/cloud/workCloudCheckpoint'
        );
        const checkpoint: WorkCloudCheckpointPushResult = await pushWorkCloudCheckpointNow();
        if (checkpoint.pushed) return { ok: true, skipped: false, failed: false };
        if (checkpoint.failed) return { ok: false, skipped: false, failed: true };
        return { ok: false, skipped: true, failed: false };
    } catch {
        return { ok: false, skipped: false, failed: true };
    }
}

/** مزامنة صريحة من الإعدادات — لا تعتمد على hooks قد تكون لا تزال disabled بعد setState */
export async function runCloudSyncAllNow(
    settings: AppSettingsState = getLawyerSettingsSnapshot(),
): Promise<CloudSyncAllSummary> {
    const keys: string[] = [];
    if (isCloudSyncBucketEnabled(settings, 'notes')) keys.push(STORAGE_KEYS.LAWYER_NOTES);
    if (isCloudSyncBucketEnabled(settings, 'files')) keys.push(STORAGE_KEYS.LAWYER_FILES);
    if (isCloudSyncBucketEnabled(settings, 'execution')) {
        keys.push(resolveExecutionFilesStorageKey(resolveLiveAuthUserIdForStorage()));
    }
    if (keys.length === 0) {
        if (!canAttemptWorkCheckpoint(settings)) {
            return { ok: false, skipped: true, failed: false };
        }
        return pushCalendarCheckpointWhenBucketsEmpty();
    }

    const results = await performCloudSyncBuckets(keys, { allowWhenRealtimeActive: true });
    const values = [...results.values()];
    const summary = summarize(values);
    if (!summary.skipped && typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent('hami:data-imported', {
                detail: { keys },
            }),
        );
    }
    return pushWorkCheckpointIntoSummary(summary);
}
