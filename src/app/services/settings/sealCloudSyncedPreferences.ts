/**
 * تحصين كيس تفضيلات السحابة.
 * مزامنة العمل (إضابير / معاملات / مستودع / …) تبقى خلف `isLawyerWorkCloudLive`.
 * هذا الكيس لا يجوز أن يُعطّل قاطع الجهاز ولا أن يُفعّل المزامنة عن بُعد.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const DEVICE_LOCK_DATA_KEYS = ['cloudSync', 'syncNotes', 'syncFiles', 'syncExecution'] as const;

export function sealCloudSyncedLawyerSettings(raw: unknown): Record<string, unknown> | null {
    if (!isRecord(raw)) return null;
    const next: Record<string, unknown> = { ...raw };
    delete next.security;
    if (isRecord(next.data)) {
        const data = { ...next.data };
        for (const key of DEVICE_LOCK_DATA_KEYS) {
            delete data[key];
        }
        next.data = data;
    }
    if (isRecord(next.appearance)) {
        const appearance = { ...next.appearance };
        delete appearance.wallpaper;
        next.appearance = appearance;
    }
    return next;
}

export function sealCloudSyncedAppData(raw: unknown): Record<string, unknown> | null {
    if (raw == null) return {};
    if (!isRecord(raw)) return null;
    const next: Record<string, unknown> = { ...raw };
    if ('lawyer_settings' in next) {
        const sealed = sealCloudSyncedLawyerSettings(next.lawyer_settings);
        if (sealed) next.lawyer_settings = sealed;
        else delete next.lawyer_settings;
    }
    return next;
}

export function mergeRemoteLawyerSettingsPreservingDeviceLock(
    remote: unknown,
    local: unknown,
): unknown {
    const sealed = sealCloudSyncedLawyerSettings(remote);
    if (!sealed) return local ?? remote;
    if (!isRecord(local)) return sealed;
    const localData = isRecord(local.data) ? local.data : null;
    const sealedData = isRecord(sealed.data) ? sealed.data : {};
    return {
        ...local,
        ...sealed,
        security: local.security,
        data: {
            ...(localData ?? {}),
            ...sealedData,
            ...(localData
                ? {
                      cloudSync: localData.cloudSync,
                      syncNotes: localData.syncNotes,
                      syncFiles: localData.syncFiles,
                      syncExecution: localData.syncExecution,
                  }
                : {}),
        },
    };
}
