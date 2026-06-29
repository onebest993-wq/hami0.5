import React from 'react';
import { Database } from 'lucide-react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SettingRow } from '../settings-ui';
import type { useBusinessBackup } from '../hooks/useBusinessBackup';
import { BusinessBackupExportPanel } from './BusinessBackupExportPanel';
import { BusinessBackupImportPreview } from './BusinessBackupImportPreview';

type BackupVm = ReturnType<typeof useBusinessBackup>;

export function BusinessBackupSection({ backup }: { backup: BackupVm }) {
    const confirmImport = async (entries: Array<[string, string]>) => {
        const ok = await SmartDialog.confirm(
            `سيتم استبدال ${entries.length} مفتاحاً محلياً بالبيانات المستوردة. لا يمكن التراجع تلقائياً.`,
            { title: 'تأكيد استيراد النسخة؟', confirmText: 'استيراد', cancelText: 'إلغاء' },
        );
        if (!ok) return;
        backup.setPendingBusinessImport(null);
        await backup.importBusinessBackup(entries);
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
                            onChange={(e) => void backup.prepareBusinessImport(e.target.files?.[0])}
                        />
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={backup.toggleBackupPanel}
                                className="text-[#E6C673] text-xs font-bold"
                            >
                                إعداد
                            </button>
                            <button
                                type="button"
                                onClick={() => backup.importBusinessInputRef.current?.click()}
                                className="text-white/50 text-xs hover:text-white"
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
                    onConfirm={() => void confirmImport(backup.pendingBusinessImport!.entries)}
                />
            ) : null}
        </>
    );
}
