import type { MutableRefObject } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import type { AppSettingsState } from '@/app/services/settings';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import { isCloudSyncEnabled } from '@/lib/cloudSyncEnv.js';
import { resolveCloudSyncUserKey } from '@/lib/syncService.js';
import {
    canUseNetworkFeatures,
    networkAccessDenialMessage,
    networkAccessDenialReason,
} from '@/app/services/auth/lawyerAccountStatus';
import { getLiveAuthUserId } from '@/app/utils/liveAuthUserId';

const DOSSIER_SYNC_FLAGS = {
    cloudSync: true,
    syncNotes: true,
    syncFiles: true,
    syncExecution: true,
} as const;

function cloudSyncBlockedByLocalOnly(): boolean {
    if (!getLawyerSettingsSnapshot().security.localOnlyMode) return false;
    SmartToast.info('أوقف «قطع الاتصال» أولاً لتفعيل المزامنة السحابية');
    return true;
}

/**
 * يفعّل مزامنة سطوح العمل القابلة للسحابة (إضابير / ملاحظات / تنفيذ)
 * ثم يطابقها. قاطع الجهاز ومفتاح المزامنة لا يُرفعان ولا يُسحبان.
 */
export async function commitCloudSyncChange(args: {
    next: boolean;
    patchData: (partial: Partial<AppSettingsState['data']>) => void;
    patchDataWithToast: (partial: Partial<AppSettingsState['data']>) => void;
    inFlightRef: MutableRefObject<boolean>;
}): Promise<boolean | void> {
    const { next, patchData, patchDataWithToast, inFlightRef } = args;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
        if (next) {
            if (cloudSyncBlockedByLocalOnly()) return false;

            const ok = await SmartDialog.confirm(
                'سيتم مزامنة الملاحظات والملفات وبيانات التنفيذ مع السحابة عند الاتصال.',
                {
                    title: 'تفعيل المزامنة السحابية؟',
                    confirmText: 'تفعيل',
                    cancelText: 'إلغاء',
                },
            );
            if (!ok) return false;
            if (cloudSyncBlockedByLocalOnly()) return false;

            if (!isCloudSyncEnabled()) {
                SmartToast.warning('المزامنة السحابية غير مفعّلة في البيئة');
                return false;
            }

            if (!canUseNetworkFeatures(getLiveAuthUserId())) {
                const reason = networkAccessDenialReason(getLiveAuthUserId()) ?? 'guest';
                SmartToast.warning(networkAccessDenialMessage(reason));
                return false;
            }

            const userKey = await resolveCloudSyncUserKey();
            if (!userKey) {
                SmartToast.warning('سجّل الدخول بحساب Supabase حقيقي لتفعيل المزامنة السحابية');
                return false;
            }
            if (cloudSyncBlockedByLocalOnly()) return false;

            const live = getLawyerSettingsSnapshot();
            const nextSettings: AppSettingsState = {
                ...live,
                data: {
                    ...live.data,
                    ...DOSSIER_SYNC_FLAGS,
                },
            };

            patchData({ ...DOSSIER_SYNC_FLAGS });

            const { runCloudSyncAllNow } = await import('@/app/services/cloudSync/runCloudSyncAllNow');
            const summary = await runCloudSyncAllNow(nextSettings);
            if (summary.failed) {
                SmartToast.warning('حُفظ التفعيل محلياً — تعذر مطابقة السحابة الآن');
                return;
            }
            if (!summary.skipped) {
                try {
                    const { restoreLastWorkCloudCheckpoint } = await import(
                        '@/app/services/cloud/workCloudCheckpoint'
                    );
                    const restored = await restoreLastWorkCloudCheckpoint({
                        onlyIfLocalEmpty: true,
                    });
                    if (restored.failed) {
                        SmartToast.warning('حُفظ التفعيل محلياً — تعذر مطابقة السحابة الآن');
                        return;
                    }
                } catch {
                    SmartToast.warning('حُفظ التفعيل محلياً — تعذر مطابقة السحابة الآن');
                    return;
                }
            }
            if (summary.skipped) {
                SmartToast.success('تم تفعيل المزامنة — ستُطابق البيانات عند توفر الحساب والاتصال');
                return;
            }
            SmartToast.success('تم تفعيل المزامنة — تمّت مطابقة البيانات مع السحابة');
            return;
        }

        patchDataWithToast({ cloudSync: false });
    } finally {
        inFlightRef.current = false;
    }
}
