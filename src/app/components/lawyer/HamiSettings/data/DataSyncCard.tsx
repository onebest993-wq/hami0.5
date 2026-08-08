import React, { useCallback } from 'react';
import { Cloud, Database } from '@/app/components/ui/lucideIcons';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useLawyerSettingsData, useLawyerSettingsSecurity } from '@/app/context/LawyerSettingsContext';
import type { AppSettingsState } from '@/app/services/settings';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import { isCloudSyncEnabled } from '@/lib/cloudSyncEnv.js';
import { collectAppData, saveToCloud, resolveCloudSyncUserKey } from '@/lib/syncService.js';
import { SettingRow, Toggle } from '../settings-ui';
import { AsyncSettingToggle } from '../AsyncSettingToggle';
import { useSettingsPatches } from '../hooks/useSettingsPatches';

export function DataSyncCard() {
    const data = useLawyerSettingsData();
    const security = useLawyerSettingsSecurity();
    const { patchData } = useSettingsPatches();

    const patchDataWithToast = useCallback(
        (partial: Partial<AppSettingsState['data']>) => {
            if (partial.cloudSync === true) {
                patchData({
                    cloudSync: true,
                    syncNotes: true,
                    syncFiles: true,
                    syncExecution: true,
                });
                SmartToast.success('تم تفعيل المزامنة السحابية');
                return;
            }

            if (partial.cloudSync === false) {
                patchData({
                    cloudSync: false,
                    syncNotes: false,
                    syncFiles: false,
                    syncExecution: false,
                });
                SmartToast.info('تم إيقاف المزامنة السحابية');
                return;
            }

            patchData(partial);

            if (partial.autoSave === false) {
                SmartToast.info('تم إيقاف الحفظ التلقائي — التغييرات لن تُحفظ محلياً');
            } else if (partial.autoSave === true) {
                SmartToast.success('الحفظ التلقائي مفعّل');
            }
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

    const onCloudSyncChange = useCallback(
        async (next: boolean): Promise<boolean | void> => {
            if (next) {
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

                const userKey = await resolveCloudSyncUserKey();
                if (!userKey) {
                    SmartToast.warning('سجّل الدخول بحساب Supabase حقيقي لتفعيل المزامنة السحابية');
                    return false;
                }

                const snap = getLawyerSettingsSnapshot();
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

                patchData({
                    cloudSync: true,
                    syncNotes: true,
                    syncFiles: true,
                    syncExecution: true,
                });
                SmartToast.success('تم تفعيل المزامنة السحابية');

                try {
                    await saveToCloud(collectAppData({ lawyer_settings: nextSettings }));
                    SmartToast.success('تم رفع بيانات التطبيق إلى السحابة');
                } catch {
                    SmartToast.error('تعذر رفع البيانات إلى السحابة — تحقق من الاتصال وتسجيل الدخول');
                }
                return;
            }

            patchDataWithToast({ cloudSync: false });
        },
        [patchData, patchDataWithToast],
    );

    return (
        <>
            <SettingRow
                icon={Database}
                label="حفظ تلقائي"
                action={
                    <AsyncSettingToggle
                        label="حفظ تلقائي"
                        checked={data.autoSave}
                        onCommit={onAutoSaveChange}
                    />
                }
            />
            <SettingRow
                icon={Cloud}
                label="المزامنة السحابية"
                isLast
                action={
                    <AsyncSettingToggle
                        label="المزامنة السحابية"
                        testId="settings-toggle-data-cloudSync"
                        checked={data.cloudSync}
                        disabled={security.localOnlyMode || !isCloudSyncEnabled()}
                        onCommit={onCloudSyncChange}
                    />
                }
            />
        </>
    );
}
