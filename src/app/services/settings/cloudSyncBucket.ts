import { isCloudSyncEnabled } from '@/lib/cloudSyncEnv.js';
import { getLawyerSettingsSnapshot } from './settingsSnapshot';
import type { AppSettingsState } from './types';

export function isCloudSyncBucketEnabled(
    settings: AppSettingsState,
    bucket: 'notes' | 'files' | 'execution',
): boolean {
    if (settings.security.localOnlyMode) return false;
    if (!settings.data.cloudSync) return false;
    if (bucket === 'notes') return settings.data.syncNotes;
    if (bucket === 'files') return settings.data.syncFiles;
    return settings.data.syncExecution;
}

/** سلة جاهزة للشبكة: إعدادات + بيئة المزامنة */
export function isLiveCloudSyncBucketEnabled(bucket: 'notes' | 'files' | 'execution'): boolean {
    if (!isCloudSyncEnabled()) return false;
    return isCloudSyncBucketEnabled(getLawyerSettingsSnapshot(), bucket);
}
