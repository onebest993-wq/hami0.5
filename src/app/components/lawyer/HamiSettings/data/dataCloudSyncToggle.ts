import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import type { AppSettingsState } from '@/app/services/settings';
import { getLawyerSettingsSnapshot, invalidateLawyerSettingsCache } from '@/app/services/settings/settingsSnapshot';
import { isCloudSyncEnabled } from '@/lib/cloudSyncEnv.js';
import {
    applyAppData,
    collectAppData,
    loadFromCloud,
    resolveCloudSyncUserKey,
    saveToCloud,
} from '@/lib/syncService.js';
import {
    canUseNetworkFeatures,
    networkAccessDenialMessage,
    networkAccessDenialReason,
} from '@/app/services/auth/lawyerAccountStatus';
import { getLiveAuthUserId } from '@/app/utils/liveAuthUserId';

export async function commitCloudSyncChange(args: {
    next: boolean;
    patchData: (partial: Partial<AppSettingsState['data']>) => void;
    patchDataWithToast: (partial: Partial<AppSettingsState['data']>) => void;
    runSyncAllNow: () => Promise<boolean>;
}): Promise<boolean | void> {
    const { next, patchData, patchDataWithToast } = args;
    const snap = getLawyerSettingsSnapshot();
    if (next) {
        if (snap.security.localOnlyMode) {
            SmartToast.info('أوقف «قطع الاتصال» أولاً لتفعيل المزامنة السحابية');
            return false;
        }

        const ok = await SmartDialog.confirm(
            'سيتم مزامنة الملاحظات والملفات وبيانات التنفيذ مع السحابة عند الاتصال.',
            {
                title: 'تفعيل المزامنة السحابية؟',
                confirmText: 'تفعيل',
                cancelText: 'إلغاء',
            },
        );
        if (!ok) return false;

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

        const nextSettings: AppSettingsState = {
            ...snap,
            data: {
                ...snap.data,
                cloudSync: true,
                syncNotes: true,
                syncFiles: true,
                syncExecution: true,
            },
        };

        try {
            await saveToCloud(collectAppData({ lawyer_settings: nextSettings }));
        } catch {
            SmartToast.error('تعذر بدء المزامنة — لم يتغير الإعداد');
            return false;
        }

        try {
            const remote = await loadFromCloud();
            if (remote && applyAppData(remote)) {
                invalidateLawyerSettingsCache();
            }
        } catch {
            /* السحب اختياري — التفعيل المحلي يبقى */
        }

        patchData({
            cloudSync: true,
            syncNotes: true,
            syncFiles: true,
            syncExecution: true,
        });

        const { runCloudSyncAllNow } = await import('@/app/services/cloudSync/runCloudSyncAllNow');
        const summary = await runCloudSyncAllNow(nextSettings);
        if (summary.failed) {
            SmartToast.warning('حُفظ التفعيل محلياً — تعذر مطابقة السحابة الآن');
            return;
        }
        if (!summary.skipped) {
            void import('@/app/services/cloud/workCloudCheckpoint')
                .then(({ restoreLastWorkCloudCheckpoint }) =>
                    restoreLastWorkCloudCheckpoint({ onlyIfLocalEmpty: true }),
                )
                .catch(() => undefined);
        }
        if (summary.skipped) {
            SmartToast.success('تم تفعيل المزامنة — ستُطابق البيانات عند توفر الحساب والاتصال');
            return;
        }
        SmartToast.success('تم تفعيل المزامنة — تمّت مطابقة البيانات مع السحابة');
        return;
    }

    const nextSettings: AppSettingsState = {
        ...snap,
        data: {
            ...snap.data,
            cloudSync: false,
            syncNotes: false,
            syncFiles: false,
            syncExecution: false,
        },
    };
    patchDataWithToast({ cloudSync: false });
    if (!isCloudSyncEnabled()) return;
    const userKey = await resolveCloudSyncUserKey();
    if (!userKey) return;
    try {
        await saveToCloud(collectAppData({ lawyer_settings: nextSettings }));
    } catch {
        SmartToast.warning(
            'توقفت المزامنة على هذا الجهاز، لكن تعذر تحديث التفضيل السحابي الآن',
        );
    }
}
