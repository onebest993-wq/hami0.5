import { useCallback, useMemo, useState, type MouseEvent } from 'react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useLawyerSettingsData, useLawyerSettingsSecurity } from '@/app/context/LawyerSettingsContext';
import type { AppSettingsState } from '@/app/services/settings';
import {
    isCloudSyncBuildEnabled,
    resolveCloudSyncStatusMessage,
} from '@/app/services/cloudSync/cloudSyncStatusDisplay';
import {
    useAggregateCloudSyncRuntime,
    useCloudSyncStatusStore,
} from '@/app/services/cloudSync/cloudSyncStatusStore';
import { isCloudSyncEnabled } from '@/lib/cloudSyncEnv.js';
import {
    networkAccessDenialReason,
} from '@/app/services/auth/lawyerAccountStatus';
import { getLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import { useSettingsPatches } from '../hooks/useSettingsPatches';
import { commitCloudSyncChange } from './dataCloudSyncToggle';
import { applyDataSyncToastPatch } from './dataSyncToastPatch';

export function useDataSyncCard() {
    const data = useLawyerSettingsData();
    const security = useLawyerSettingsSecurity();
    const { patchData } = useSettingsPatches();
    const [syncNowPending, setSyncNowPending] = useState(false);

    const runtime = useAggregateCloudSyncRuntime();
    const cloudBuildEnabled = isCloudSyncBuildEnabled();
    const liveUserId = getLiveAuthUserId();
    const denial = networkAccessDenialReason(liveUserId);
    const networkOk = denial === null;
    const verificationBlocked = denial === 'pending' || denial === 'rejected';

    const statusMessage = useMemo(
        () =>
            resolveCloudSyncStatusMessage({
                localOnlyMode: security.localOnlyMode,
                cloudSyncEnabled: data.cloudSync,
                anyBucketEnabled: data.syncNotes || data.syncFiles || data.syncExecution,
                cloudBuildEnabled,
                signedIn: networkOk,
                verificationBlocked,
                isOnline: runtime.isOnline,
                isSyncing: runtime.isSyncing || syncNowPending,
                lastSyncTime: runtime.lastSyncTime,
                lastError: runtime.lastError,
            }),
        [
            cloudBuildEnabled,
            data.cloudSync,
            data.syncExecution,
            data.syncFiles,
            data.syncNotes,
            networkOk,
            runtime.isOnline,
            runtime.isSyncing,
            runtime.lastError,
            runtime.lastSyncTime,
            security.localOnlyMode,
            syncNowPending,
            verificationBlocked,
        ],
    );

    const patchDataWithToast = useCallback(
        (partial: Partial<AppSettingsState['data']>) => {
            applyDataSyncToastPatch(patchData, partial);
        },
        [patchData],
    );

    const onAutoSaveChange = useCallback(
        async (next: boolean): Promise<boolean | void> => {
            if (!next) {
                const ok = await SmartDialog.confirm(
                    'لن تُحفظ تغييراتك محلياً تلقائياً — قد تفقد بيانات غير محفوظة.',
                    {
                        title: 'إيقاف الحفظ التلقائي؟',
                        confirmText: 'إيقاف',
                        cancelText: 'إلغاء',
                    },
                );
                if (!ok) return false;
            }
            patchDataWithToast({ autoSave: next });
        },
        [patchDataWithToast],
    );

    const runSyncAllNow = useCallback(async (): Promise<boolean> => {
        setSyncNowPending(true);
        try {
            const summary = await useCloudSyncStatusStore.getState().syncAllNow();
            if (summary.failed) {
                SmartToast.warning('فشلت المزامنة جزئياً — أعد المحاولة عند استقرار الاتصال');
                return false;
            }
            if (summary.skipped) {
                SmartToast.warning('لم تُرفع بيانات — تحقق من تسجيل الدخول والاتصال وأن المزامنة مفعّلة');
                return false;
            }
            SmartToast.success('اكتملت المزامنة مع السحابة');
            return true;
        } catch {
            SmartToast.warning('تعذر إكمال المزامنة الآن — أعد المحاولة عند استقرار الاتصال');
            return false;
        } finally {
            setSyncNowPending(false);
        }
    }, []);

    const onSyncNowClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            event.stopPropagation();
            if (!statusMessage.canSyncNow || syncNowPending) return;
            void runSyncAllNow();
        },
        [runSyncAllNow, statusMessage.canSyncNow, syncNowPending],
    );

    const onCloudSyncChange = useCallback(
        (next: boolean) =>
            commitCloudSyncChange({
                next,
                patchData,
                patchDataWithToast,
                runSyncAllNow,
            }),
        [patchData, patchDataWithToast, runSyncAllNow],
    );

    return {
        data,
        statusMessage,
        syncNowPending,
        cloudToggleDisabled: security.localOnlyMode || !isCloudSyncEnabled(),
        onAutoSaveChange,
        onCloudSyncChange,
        onSyncNowClick,
    };
}
