import React from 'react';
import { Archive, Bell, ChevronLeft, Database, FileSpreadsheet, RotateCcw } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { AppSettingsState } from '@/app/services/settings';
import { SectionHeader, SettingCard, SettingRow, Toggle } from './settings-ui';

export type DataSectionProps = {
    settings: AppSettingsState;
    patchData: (partial: Partial<AppSettingsState['data']>) => void;
    exportSettings: () => void;
    importSettingsInputRef: React.RefObject<HTMLInputElement>;
    importSettings: (file: File | null | undefined) => Promise<void>;
    importBusinessInputRef: React.RefObject<HTMLInputElement>;
    prepareBusinessImport: (file: File | null | undefined) => Promise<void>;
    backupPanelOpen: boolean;
    toggleBackupPanel: () => void;
    backupIncludeLawsuits: boolean;
    setBackupIncludeLawsuits: (v: boolean) => void;
    backupIncludeExecution: boolean;
    setBackupIncludeExecution: (v: boolean) => void;
    backupIncludeNotes: boolean;
    setBackupIncludeNotes: (v: boolean) => void;
    backupIncludeVault: boolean;
    setBackupIncludeVault: (v: boolean) => void;
    backupIncludeUrgent: boolean;
    setBackupIncludeUrgent: (v: boolean) => void;
    backupIncludeUndated: boolean;
    setBackupIncludeUndated: (v: boolean) => void;
    backupFrom: string;
    setBackupFrom: (v: string) => void;
    backupTo: string;
    setBackupTo: (v: string) => void;
    backupPreview: {
        isLoading: boolean;
        keys: number;
        bytes: number;
        counts: {
            lawsuits: { items: number; undated: number };
            execution: { items: number; undated: number };
            notes: { items: number; undated: number };
            vault: { items: number; undated: number };
            urgent: { keys: number };
        };
    };
    refreshBackupPreview: () => Promise<void>;
    exportBusinessBackup: () => Promise<void>;
    pendingBusinessImport: null | {
        fileName: string;
        version: 1 | 2;
        createdAt: string | null;
        selection: Record<string, unknown> | null;
        range: Record<string, unknown> | null;
        counts: Record<string, unknown> | null;
        keys: string[];
        entries: Array<[string, string]>;
    };
    setPendingBusinessImport: (v: DataSectionProps['pendingBusinessImport']) => void;
    importBusinessBackup: (entries: Array<[string, string]>) => Promise<void>;
    onOpenArchive?: () => void;
    onClose: () => void;
    clearArmed: boolean;
    armClear: () => void;
    clearLocalData: () => Promise<void>;
};

export function DataSection({
    settings,
    patchData,
    exportSettings,
    importSettingsInputRef,
    importSettings,
    importBusinessInputRef,
    prepareBusinessImport,
    backupPanelOpen,
    toggleBackupPanel,
    backupIncludeLawsuits,
    setBackupIncludeLawsuits,
    backupIncludeExecution,
    setBackupIncludeExecution,
    backupIncludeNotes,
    setBackupIncludeNotes,
    backupIncludeVault,
    setBackupIncludeVault,
    backupIncludeUrgent,
    setBackupIncludeUrgent,
    backupIncludeUndated,
    setBackupIncludeUndated,
    backupFrom,
    setBackupFrom,
    backupTo,
    setBackupTo,
    backupPreview,
    refreshBackupPreview,
    exportBusinessBackup,
    pendingBusinessImport,
    setPendingBusinessImport,
    importBusinessBackup,
    onOpenArchive,
    onClose,
    clearArmed,
    armClear,
    clearLocalData,
}: DataSectionProps) {
    return (
        <>
            <SectionHeader title="البيانات" subtitle="حفظ ونسخ وتصدير" icon={Database} />
            <SettingCard>
                <SettingRow
                    icon={Database}
                    label="حفظ تلقائي"
                    subLabel="موصى به — إيقافه قد يمنع حفظ تغييراتك محلياً"
                    action={<Toggle checked={settings.data.autoSave} onChange={(v) => patchData({ autoSave: v })} />}
                />
                <SettingRow
                    icon={Bell}
                    label="تذكير نسخ أسبوعي"
                    subLabel="تنبيه داخل التطبيق — ليس نسخاً تلقائياً للملفات"
                    action={<Toggle checked={settings.data.weeklyBackupReminder} onChange={(v) => patchData({ weeklyBackupReminder: v })} />}
                />
                <SettingRow
                    icon={FileSpreadsheet}
                    label="تصدير الإعدادات"
                    subLabel="تنزيل نسخة JSON أو نسخها للحافظة"
                    action={<button type="button" onClick={exportSettings} className="text-[#E6C673] text-xs font-bold">تصدير</button>}
                />
                <SettingRow
                    icon={FileSpreadsheet}
                    label="استيراد الإعدادات"
                    subLabel="ملف JSON صادر من حامي"
                    action={
                        <>
                            <input
                                ref={importSettingsInputRef}
                                type="file"
                                accept="application/json,.json"
                                className="hidden"
                                onChange={(e) => void importSettings(e.target.files?.[0])}
                            />
                            <button
                                type="button"
                                onClick={() => importSettingsInputRef.current?.click()}
                                className="text-white/50 text-xs hover:text-white"
                            >
                                استيراد
                            </button>
                        </>
                    }
                />
                <SettingRow
                    icon={Database}
                    label="نسخة احتياطية للبيانات"
                    subLabel="القضايا، التنفيذ، الملاحظات، الطلبات المستعجلة"
                    action={
                        <>
                            <input
                                ref={importBusinessInputRef}
                                type="file"
                                accept="application/json,.json"
                                className="hidden"
                                onChange={(e) => void prepareBusinessImport(e.target.files?.[0])}
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={toggleBackupPanel}
                                    className="text-[#E6C673] text-xs font-bold"
                                >
                                    إعداد
                                </button>
                                <button
                                    type="button"
                                    onClick={() => importBusinessInputRef.current?.click()}
                                    className="text-white/50 text-xs hover:text-white"
                                >
                                    استيراد
                                </button>
                            </div>
                        </>
                    }
                />
                {backupPanelOpen && (
                    <div className="px-4 pb-4 border-b border-white/[0.04]">
                        <div className="text-[11px] text-white/50 mb-2">اختر ما تريد تصديره مع نطاق زمني اختياري</div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                                <span className="text-xs text-white/70">القضايا</span>
                                <Toggle checked={backupIncludeLawsuits} onChange={setBackupIncludeLawsuits} />
                            </div>
                            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                                <span className="text-xs text-white/70">التنفيذ</span>
                                <Toggle checked={backupIncludeExecution} onChange={setBackupIncludeExecution} />
                            </div>
                            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                                <span className="text-xs text-white/70">الملاحظات</span>
                                <Toggle checked={backupIncludeNotes} onChange={setBackupIncludeNotes} />
                            </div>
                            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                                <span className="text-xs text-white/70">المخزن الذكي</span>
                                <Toggle checked={backupIncludeVault} onChange={setBackupIncludeVault} />
                            </div>
                            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2 col-span-2">
                                <span className="text-xs text-white/70">الطلبات المستعجلة</span>
                                <Toggle checked={backupIncludeUrgent} onChange={setBackupIncludeUrgent} />
                            </div>
                        </div>

                        <div className="flex gap-2 mb-2">
                            <input
                                type="date"
                                value={backupFrom}
                                onChange={(e) => setBackupFrom(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-[#E6C673]/50"
                            />
                            <input
                                type="date"
                                value={backupTo}
                                onChange={(e) => setBackupTo(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-[#E6C673]/50"
                            />
                        </div>
                        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2 mb-3">
                            <span className="text-xs text-white/70">تضمين العناصر بلا تاريخ</span>
                            <Toggle checked={backupIncludeUndated} onChange={setBackupIncludeUndated} />
                        </div>

                        <div className="bg-black/20 border border-white/[0.06] rounded-xl p-3 mb-3">
                            <div className="flex justify-between text-[11px] text-white/70">
                                <span>المعاينة</span>
                                <span className="text-white/45">
                                    {backupPreview.isLoading ? '...' : `${backupPreview.keys} مفاتيح • ${(backupPreview.bytes / 1024 / 1024).toFixed(2)} MB`}
                                </span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-white/55">
                                <div>قضايا: {backupPreview.counts.lawsuits.items}{backupPreview.counts.lawsuits.undated ? ` (+${backupPreview.counts.lawsuits.undated} بلا تاريخ)` : ''}</div>
                                <div>تنفيذ: {backupPreview.counts.execution.items}{backupPreview.counts.execution.undated ? ` (+${backupPreview.counts.execution.undated} بلا تاريخ)` : ''}</div>
                                <div>ملاحظات: {backupPreview.counts.notes.items}{backupPreview.counts.notes.undated ? ` (+${backupPreview.counts.notes.undated} بلا تاريخ)` : ''}</div>
                                <div>مخزن: {backupPreview.counts.vault.items}{backupPreview.counts.vault.undated ? ` (+${backupPreview.counts.vault.undated} بلا تاريخ)` : ''}</div>
                                <div className="col-span-2">طلبات مستعجلة: {backupPreview.counts.urgent.keys} مفاتيح</div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => void refreshBackupPreview()}
                                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white"
                            >
                                تحديث المعاينة
                            </button>
                            <button
                                type="button"
                                onClick={() => void exportBusinessBackup()}
                                className="flex-1 px-3 py-2 rounded-xl bg-[#E6C673] text-[#0B1021] text-xs font-bold"
                            >
                                تصدير النسخة
                            </button>
                        </div>
                    </div>
                )}
                {pendingBusinessImport && (
                    <div className="px-4 pb-4 border-b border-white/[0.04]">
                        <div className="text-[11px] text-white/60 mb-2">تقرير النسخة قبل الاستيراد</div>
                        <div className="bg-black/20 border border-white/[0.06] rounded-xl p-3 mb-3">
                            <div className="flex justify-between text-[11px] text-white/70">
                                <span>{pendingBusinessImport.fileName}</span>
                                <span className="text-white/45">
                                    v{pendingBusinessImport.version} • {pendingBusinessImport.keys.length} مفاتيح
                                </span>
                            </div>
                            {pendingBusinessImport.createdAt ? (
                                <div className="text-[10px] text-white/45 mt-1">
                                    {pendingBusinessImport.createdAt}
                                </div>
                            ) : null}
                            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-white/55">
                                {(() => {
                                    const c = (pendingBusinessImport.counts ?? {}) as any;
                                    const n = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
                                    const lawsuits = c?.lawsuits ?? {};
                                    const execution = c?.execution ?? {};
                                    const notes = c?.notes ?? {};
                                    const vault = c?.vault ?? {};
                                    const urgent = c?.urgent ?? {};
                                    const lawsuitText = `${n(lawsuits.items)}${n(lawsuits.undated) ? ` (+${n(lawsuits.undated)} بلا تاريخ)` : ''}`;
                                    const executionText = `${n(execution.items)}${n(execution.undated) ? ` (+${n(execution.undated)} بلا تاريخ)` : ''}`;
                                    const notesText = `${n(notes.items)}${n(notes.undated) ? ` (+${n(notes.undated)} بلا تاريخ)` : ''}`;
                                    const vaultText = `${n(vault.items)}${n(vault.undated) ? ` (+${n(vault.undated)} بلا تاريخ)` : ''}`;
                                    const urgentText = `${n(urgent.keys)} مفاتيح`;
                                    const r = (pendingBusinessImport.range ?? {}) as any;
                                    const from = typeof r?.from === 'string' ? r.from : '';
                                    const to = typeof r?.to === 'string' ? r.to : '';
                                    const rangeText = from || to ? `${from || '—'} → ${to || '—'}` : '—';
                                    return (
                                        <>
                                            <div>قضايا: {lawsuitText}</div>
                                            <div>تنفيذ: {executionText}</div>
                                            <div>ملاحظات: {notesText}</div>
                                            <div>مخزن: {vaultText}</div>
                                            <div className="col-span-2">طلبات مستعجلة: {urgentText}</div>
                                            <div className="col-span-2">النطاق الزمني: {rangeText}</div>
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="mt-2 max-h-28 overflow-y-auto scrollbar-hide text-[10px] text-white/45 border-t border-white/[0.06] pt-2">
                                {pendingBusinessImport.keys.map((k) => (
                                    <div key={k} className="truncate">
                                        {k}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setPendingBusinessImport(null)}
                                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const entries = pendingBusinessImport.entries;
                                    setPendingBusinessImport(null);
                                    void importBusinessBackup(entries);
                                }}
                                className="flex-1 px-3 py-2 rounded-xl bg-[#E6C673] text-[#0B1021] text-xs font-bold"
                            >
                                استيراد
                            </button>
                        </div>
                    </div>
                )}
                <SettingRow
                    icon={Archive}
                    label="إدارة الأرشيف"
                    subLabel="فتح بوابة الأرشيف الشاملة"
                    action={
                        <button
                            type="button"
                            onClick={() => {
                                if (!onOpenArchive) {
                                    SmartToast.warning('الأرشيف غير متاح من هنا');
                                    return;
                                }
                                onClose();
                                onOpenArchive();
                            }}
                            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-[#E6C673] hover:text-black"
                        >
                            <ChevronLeft size={16} className="rotate-180" />
                        </button>
                    }
                />
                <SettingRow
                    icon={RotateCcw}
                    label="مسح البيانات المحلية"
                    subLabel="حل أعطال التخزين وإعادة البدء"
                    isLast
                    action={
                        <button
                            type="button"
                            onClick={() => {
                                if (!clearArmed) {
                                    armClear();
                                    SmartToast.warning('اضغط مرة ثانية للتأكيد');
                                    return;
                                }
                                void clearLocalData();
                            }}
                            className="text-rose-400 text-xs font-bold"
                        >
                            {clearArmed ? 'تأكيد المسح' : 'مسح'}
                        </button>
                    }
                />
            </SettingCard>
        </>
    );
}

