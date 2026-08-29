import React, { useCallback } from 'react';
import type { useBusinessBackup } from '../hooks/useBusinessBackup';
import { Toggle } from '../settings-ui/index';

type BackupVm = ReturnType<typeof useBusinessBackup>;

export function BusinessBackupExportPanel({ backup }: { backup: BackupVm }) {
    const onDateFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
        event.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, []);

    return (
        <div
            className="px-4 pb-4 border-b border-white/[0.04]"
            data-testid="business-backup-export-panel"
        >
            <div className="text-[11px] text-white/50 mb-2">اختر ما تريد تصديره مع نطاق زمني اختياري</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
                {(
                    [
                        ['القضايا', backup.backupIncludeLawsuits, backup.setBackupIncludeLawsuits],
                        ['التنفيذ', backup.backupIncludeExecution, backup.setBackupIncludeExecution],
                        ['الملاحظات', backup.backupIncludeNotes, backup.setBackupIncludeNotes],
                        ['المخزن الذكي', backup.backupIncludeVault, backup.setBackupIncludeVault],
                    ] as const
                ).map(([label, checked, onChange]) => (
                    <div
                        key={label}
                        className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2"
                    >
                        <span className="text-xs text-white/70">{label}</span>
                        <Toggle label={label} checked={checked} onChange={onChange} />
                    </div>
                ))}
                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2 col-span-2">
                    <span className="text-xs text-white/70">الطلبات المستعجلة</span>
                    <Toggle
                        label="الطلبات المستعجلة"
                        checked={backup.backupIncludeUrgent}
                        onChange={backup.setBackupIncludeUrgent}
                    />
                </div>
            </div>

            <div className="flex gap-2 mb-2">
                <input
                    type="date"
                    value={backup.backupFrom}
                    onChange={(e) => backup.setBackupFrom(e.target.value)}
                    onFocus={onDateFocus}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl min-h-[44px] py-2 px-3 text-xs text-white outline-none focus:border-[#E6C673]/50"
                    aria-label="من تاريخ"
                />
                <input
                    type="date"
                    value={backup.backupTo}
                    onChange={(e) => backup.setBackupTo(e.target.value)}
                    onFocus={onDateFocus}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl min-h-[44px] py-2 px-3 text-xs text-white outline-none focus:border-[#E6C673]/50"
                    aria-label="إلى تاريخ"
                />
            </div>
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2 mb-3">
                <span className="text-xs text-white/70">تضمين العناصر بلا تاريخ</span>
                <Toggle
                    label="تضمين العناصر بلا تاريخ"
                    checked={backup.backupIncludeUndated}
                    onChange={backup.setBackupIncludeUndated}
                />
            </div>

            <div className="bg-black/20 border border-white/[0.06] rounded-xl p-3 mb-3">
                <div className="flex justify-between text-[11px] text-white/70">
                    <span>المعاينة</span>
                    <span className="text-white/45">
                        {backup.backupPreview.isLoading
                            ? '...'
                            : `${backup.backupPreview.keys} مفاتيح • ${(backup.backupPreview.bytes / 1024 / 1024).toFixed(2)} MB`}
                    </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-white/55">
                    <div>
                        قضايا: {backup.backupPreview.counts.lawsuits.items}
                        {backup.backupPreview.counts.lawsuits.undated
                            ? ` (+${backup.backupPreview.counts.lawsuits.undated} بلا تاريخ)`
                            : ''}
                    </div>
                    <div>
                        تنفيذ: {backup.backupPreview.counts.execution.items}
                        {backup.backupPreview.counts.execution.undated
                            ? ` (+${backup.backupPreview.counts.execution.undated} بلا تاريخ)`
                            : ''}
                    </div>
                    <div>
                        ملاحظات: {backup.backupPreview.counts.notes.items}
                        {backup.backupPreview.counts.notes.undated
                            ? ` (+${backup.backupPreview.counts.notes.undated} بلا تاريخ)`
                            : ''}
                    </div>
                    <div>
                        مخزن: {backup.backupPreview.counts.vault.items}
                        {backup.backupPreview.counts.vault.undated
                            ? ` (+${backup.backupPreview.counts.vault.undated} بلا تاريخ)`
                            : ''}
                    </div>
                    <div className="col-span-2">
                        طلبات مستعجلة: {backup.backupPreview.counts.urgent.keys} مفاتيح
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => void backup.refreshBackupPreview()}
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white min-h-[44px] min-w-[44px]"
                >
                    تحديث المعاينة
                </button>
                <button
                    type="button"
                    onClick={() => void backup.exportBusinessBackup()}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#E6C673] text-[#0B1021] text-xs font-bold min-h-[44px] min-w-[44px]"
                >
                    تصدير النسخة
                </button>
            </div>
        </div>
    );
}
