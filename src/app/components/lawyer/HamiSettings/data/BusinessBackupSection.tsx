import React from 'react';
import { Database } from '@/app/components/ui/icons/Database';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import {
    mintSensitiveConfirmChallenge,
    verifySensitiveSettingsAction,
} from '@/app/services/settings/verifySensitiveSettingsAction';
import { markSettingsFilePickerOpening } from '../settingsFilePickerGrace';
import { SettingRow } from '../settings-ui/index';
import { type useBusinessBackup } from '../hooks/useBusinessBackup';
import { prefetchBusinessBackupEngine } from '../hooks/businessBackupEngine';
import { BusinessBackupExportPanel } from './BusinessBackupExportPanel';
import { BusinessBackupImportPreview } from './BusinessBackupImportPreview';
import type { PendingBusinessImport } from '@/app/services/settings/businessBackupTypes';

type BackupVm = ReturnType<typeof useBusinessBackup>;

export function BusinessBackupSection({ backup }: { backup: BackupVm }) {
    const confirmInFlightRef = React.useRef(false);

    const confirmImport = async (pending: PendingBusinessImport) => {
        if (confirmInFlightRef.current) return;
        confirmInFlightRef.current = true;
        try {
            const localFiles = pending.vaultBlobs.length;
            const ok = await SmartDialog.confirm(
                `سيتم استبدال ${pending.entries.length} مفتاحاً محلياً${
                    localFiles ? ` و${localFiles} ملفاً من المخزن الذكي` : ''
                }. عند فشل العملية سيُستعاد المحتوى السابق تلقائياً.`,
                { title: 'تأكيد استيراد النسخة؟', confirmText: 'استيراد', cancelText: 'إلغاء' },
            );
            if (!ok) return;
            const challenge = mintSensitiveConfirmChallenge('استيراد نسخة');
            const verified = await verifySensitiveSettingsAction({
                confirmPhrase: challenge.confirmPhrase,
                title: 'تحقق قبل الاستيراد',
                promptMessage: challenge.promptMessage,
            });
            if (!verified) return;
            const imported = await backup.importBusinessBackup(
                pending.entries,
                pending.vaultBlobs,
            );
            if (imported) {
                backup.setPendingBusinessImport(null);
            }
        } finally {
            confirmInFlightRef.current = false;
        }
    };

    const openImportPicker = () => {
        prefetchBusinessBackupEngine();
        markSettingsFilePickerOpening();
        backup.importBusinessInputRef.current?.click();
    };

    return (
        <>
            <SettingRow
                icon={Database}
                label="نسخة احتياطية للبيانات"
                action={
                    <>
                        <input
                            ref={backup.importBusinessInputRef}
                            type="file"
                            accept="application/json,.json"
                            className="hidden"
                            onClick={() => markSettingsFilePickerOpening()}
                            onChange={(e) => void backup.prepareBusinessImport(e.target.files?.[0])}
                        />
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onPointerDown={(event) => {
                                    if (event.button !== 0) return;
                                    prefetchBusinessBackupEngine();
                                }}
                                onClick={backup.toggleBackupPanel}
                                data-testid="settings-backup-setup"
                                className="text-[#E6C673] text-xs font-bold min-h-[44px] min-w-[44px] px-2 touch-manipulation inline-flex items-center"
                            >
                                إعداد
                            </button>
                            <button
                                type="button"
                                onClick={openImportPicker}
                                data-testid="settings-backup-import"
                                className="text-white/60 text-xs hover:text-white min-h-[44px] min-w-[44px] px-2 touch-manipulation inline-flex items-center"
                            >
                                استيراد
                            </button>
                        </div>
                    </>
                }
            />
            {backup.backupPanelOpen ? <BusinessBackupExportPanel backup={backup} /> : null}
            {backup.pendingBusinessImport ? (
                <BusinessBackupImportPreview
                    pending={backup.pendingBusinessImport}
                    onCancel={() => backup.setPendingBusinessImport(null)}
                    onConfirm={() => void confirmImport(backup.pendingBusinessImport!)}
                />
            ) : null}
        </>
    );
}
