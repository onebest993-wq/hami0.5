import React, { memo, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLawyerSettingsData, useLawyerSettingsSecurity } from '@/app/context/LawyerSettingsContext';
import {
    isCloudSyncBuildEnabled,
    resolveCloudSyncStatusMessage,
} from '@/app/services/cloudSync/cloudSyncStatusDisplay';
import {
    BUCKET_ORDER,
    useCloudSyncStatusStore,
} from '@/app/services/cloudSync/cloudSyncStatusStore';
import { useSettingsSectionActive } from '../settingsSectionActiveContext';

const TONE_CLASS: Record<ReturnType<typeof resolveCloudSyncStatusMessage>['tone'], string> = {
    muted: 'text-white/40',
    active: 'text-[#E6C673]/85',
    success: 'text-emerald-400/85',
    warning: 'text-amber-300/85',
    error: 'text-red-300/90',
};

function selectIsSyncing(s: ReturnType<typeof useCloudSyncStatusStore.getState>): boolean {
    return BUCKET_ORDER.some((id) => s.buckets[id].isSyncing);
}

function selectLastSyncTimeMs(s: ReturnType<typeof useCloudSyncStatusStore.getState>): number | null {
    const ms = BUCKET_ORDER.reduce((max, id) => Math.max(max, s.buckets[id].lastSyncTime ?? 0), 0);
    return ms > 0 ? ms : null;
}

function selectLastError(s: ReturnType<typeof useCloudSyncStatusStore.getState>): string | null {
    for (let i = BUCKET_ORDER.length - 1; i >= 0; i -= 1) {
        const err = s.buckets[BUCKET_ORDER[i]].syncError;
        if (err) return err;
    }
    return null;
}

export const DataSyncStatusLine = memo(function DataSyncStatusLine() {
    const isSectionActive = useSettingsSectionActive();
    const data = useLawyerSettingsData();
    const security = useLawyerSettingsSecurity();
    const signedIn = useCloudSyncStatusStore((s) => s.signedIn);
    const isOnline = useCloudSyncStatusStore((s) => s.isOnline);
    const isSyncing = useCloudSyncStatusStore(selectIsSyncing);
    const lastSyncTime = useCloudSyncStatusStore(selectLastSyncTimeMs);
    const lastError = useCloudSyncStatusStore(selectLastError);
    const syncAllNow = useCloudSyncStatusStore((s) => s.syncAllNow);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (!isSectionActive) return;

        let timer: number | undefined;

        const start = () => {
            if (document.hidden) return;
            timer = window.setInterval(() => setTick((n) => n + 1), 30_000);
        };

        const stop = () => {
            if (timer !== undefined) {
                window.clearInterval(timer);
                timer = undefined;
            }
        };

        const onVisibility = () => {
            stop();
            if (!document.hidden) start();
        };

        start();
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            stop();
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [isSectionActive]);

    const message = useMemo(
        () =>
            resolveCloudSyncStatusMessage({
                localOnlyMode: security.localOnlyMode,
                cloudSyncEnabled: data.cloudSync,
                anyBucketEnabled: data.cloudSync,
                cloudBuildEnabled: isCloudSyncBuildEnabled(),
                signedIn,
                isOnline,
                isSyncing,
                lastSyncTime,
                lastError,
                now: new Date(),
            }),
        [
            security.localOnlyMode,
            data.cloudSync,
            signedIn,
            isOnline,
            isSyncing,
            lastSyncTime,
            lastError,
            tick,
        ],
    );

    const onSyncNow = () => {
        void syncAllNow();
    };

    return (
        <div
            className="flex items-center justify-between gap-3 px-4 pb-3 -mt-1 border-b border-white/[0.03]"
            data-testid="settings-sync-status-row"
        >
            <p
                data-testid="settings-sync-status"
                data-sync-tone={message.tone}
                className={`text-[10px] leading-relaxed min-w-0 ${TONE_CLASS[message.tone]}`}
            >
                {message.text}
            </p>
            {message.canSyncNow ? (
                <button
                    type="button"
                    data-testid="settings-sync-now"
                    onClick={onSyncNow}
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-[#E6C673]/90 transition-opacity active:opacity-80"
                >
                    <RefreshCw size={11} aria-hidden />
                    مزامنة الآن
                </button>
            ) : null}
        </div>
    );
});
