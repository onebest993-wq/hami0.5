import React from 'react';
import { Bell, Cloud, Database, RotateCcw } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import { settingWiringHint } from '@/app/services/settings/settingsCapabilities';
import type { AppSettingsState } from '@/app/services/settings';
import { SectionHeader, SettingCard, SettingRow, Toggle } from './settings-ui';
import { useBusinessBackup } from './hooks/useBusinessBackup';
import { useLocalDataClear } from './hooks/useLocalDataClear';
import { useSettingsPatches } from './hooks/useSettingsPatches';

export function DataSection() {
    const { settings, resetToDefaults } = useLawyerSettings();
    const { patchData } = useSettingsPatches();
    const backup = useBusinessBackup();
    const { wipePhase, countdown, cancelCountdown, requestFullWipe } = useLocalDataClear(resetToDefaults);

    const patchDataWithToast = (partial: Partial<AppSettingsState['data']>) => {
        patchData(partial);
        if (partial.weeklyBackupReminder === true) {
            SmartToast.info('سيظهر التذكير مرة كل أسبوع عند فتح لوحة المحامي');
        }
        if (partial.autoSave === false) {
            SmartToast.info('تم إيقاف الحفظ التلقائي — التغييرات لن تُحفظ محلياً');
        } else if (partial.autoSave === true) {
            SmartToast.success('الحفظ التلقائي مفعّل');
        }
        if (partial.cloudSync === true) {
            SmartToast.success('تم تفعيل المزامنة السحابية');
        } else if (partial.cloudSync === false) {
            SmartToast.info('تم إيقاف المزامنة السحابية');
        }
    };

    const cloudDisabled = !settings.data.cloudSync || settings.security.localOnlyMode;

    const confirmReset = async () => {
        const ok = await SmartDialog.confirm(
            'ستُستعاد تفضيلات المنظر والأمان والبيانات — ملفات القضايا المحلية لا تُمس.',
            { title: 'إعادة ضبط الإعدادات؟' },
        );
        if (!ok) return;
        resetToDefaults();
        SmartToast.success('تمت إعادة الضبط');
    };

    return (
        <>
            <SectionHeader title="البيانات" subtitle="حفظ ونسخ وتصدير" icon={Database} />
            <SettingCard>
                <SettingRow
                    icon={Database}
                    label="حفظ تلقائي"
                    subLabel={settingWiringHint('data.autoSave')}
                    action={<Toggle checked={settings.data.autoSave} onChange={(v) => patchDataWithToast({ autoSave: v })} />}
                />
                <SettingRow
                    icon={Cloud}
                    label="المزامنة السحابية"
                    subLabel={
                        settings.security.localOnlyMode
                            ? 'معطّلة أثناء «قطع الاتصال» — راجع تبويب الأمان'
                            : settingWiringHint('data.cloudSync')
                    }
                    action={
                        <Toggle
                            checked={settings.data.cloudSync}
                            disabled={settings.security.localOnlyMode}
                            onChange={(v) => patchDataWithToast({ cloudSync: v })}
                        />
                    }
                />
                <div className={cloudDisabled ? 'opacity-40 pointer-events-none' : ''}>
                    <SettingRow
                        icon={Database}
                        label="مزامنة الملاحظات"
                        subLabel={settingWiringHint('data.syncNotes')}
                        action={
                            <Toggle
                                checked={settings.data.syncNotes}
                                onChange={(v) => patchData({ syncNotes: v })}
                            />
                        }
                    />
                    <SettingRow
                        icon={Database}
                        label="مزامنة القضايا"
                        subLabel={settingWiringHint('data.syncFiles')}
                        action={
                            <Toggle
                                checked={settings.data.syncFiles}
                                onChange={(v) => patchData({ syncFiles: v })}
                            />
                        }
                    />
                    <SettingRow
                        icon={Database}
                        label="مزامنة التنفيذ"
                        subLabel={settingWiringHint('data.syncExecution')}
                        action={
                            <Toggle
                                checked={settings.data.syncExecution}
                                onChange={(v) => patchData({ syncExecution: v })}
                            />
                        }
                    />
                </div>
                <SettingRow
                    icon={Bell}
                    label="تذكير نسخ أسبوعي"
                    subLabel={settingWiringHint('data.weeklyBackupReminder')}
                    action={
                        <Toggle
                            checked={settings.data.weeklyBackupReminder}
                            onChange={(v) => patchDataWithToast({ weeklyBackupReminder: v })}
                        />
                    }
                />
                <SettingRow
                    icon={Database}
                    label="نسخة احتياطية للبيانات"
                    subLabel={settingWiringHint('data.businessBackup')}
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
                {backup.backupPanelOpen && (
                    <div className="px-4 pb-4 border-b border-white/[0.04]">
                        <div className="text-[11px] text-white/50 mb-2">اختر ما تريد تصديره مع نطاق زمني اختياري</div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                                <span className="text-xs text-white/70">القضايا</span>
                                <Toggle checked={backup.backupIncludeLawsuits} onChange={backup.setBackupIncludeLawsuits} />
                            </div>
                            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                                <span className="text-xs text-white/70">التنفيذ</span>
                                <Toggle checked={backup.backupIncludeExecution} onChange={backup.setBackupIncludeExecution} />
                            </div>
                            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                                <span className="text-xs text-white/70">الملاحظات</span>
                                <Toggle checked={backup.backupIncludeNotes} onChange={backup.setBackupIncludeNotes} />
                            </div>
                            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                                <span className="text-xs text-white/70">المخزن الذكي</span>
                                <Toggle checked={backup.backupIncludeVault} onChange={backup.setBackupIncludeVault} />
                            </div>
                            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2 col-span-2">
                                <span className="text-xs text-white/70">الطلبات المستعجلة</span>
                                <Toggle checked={backup.backupIncludeUrgent} onChange={backup.setBackupIncludeUrgent} />
                            </div>
                        </div>

                        <div className="flex gap-2 mb-2">
                            <input
                                type="date"
                                value={backup.backupFrom}
                                onChange={(e) => backup.setBackupFrom(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-[#E6C673]/50"
                            />
                            <input
                                type="date"
                                value={backup.backupTo}
                                onChange={(e) => backup.setBackupTo(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-[#E6C673]/50"
                            />
                        </div>
                        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2 mb-3">
                            <span className="text-xs text-white/70">تضمين العناصر بلا تاريخ</span>
                            <Toggle checked={backup.backupIncludeUndated} onChange={backup.setBackupIncludeUndated} />
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
                                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white"
                            >
                                تحديث المعاينة
                            </button>
                            <button
                                type="button"
                                onClick={() => void backup.exportBusinessBackup()}
                                className="flex-1 px-3 py-2 rounded-xl bg-[#E6C673] text-[#0B1021] text-xs font-bold"
                            >
                                تصدير النسخة
                            </button>
                        </div>
                    </div>
                )}
                {backup.pendingBusinessImport && (
                    <div className="px-4 pb-4 border-b border-white/[0.04]">
                        <div className="text-[11px] text-white/60 mb-2">تقرير النسخة قبل الاستيراد</div>
                        <div className="bg-black/20 border border-white/[0.06] rounded-xl p-3 mb-3">
                            <div className="flex justify-between text-[11px] text-white/70">
                                <span>{backup.pendingBusinessImport.fileName}</span>
                                <span className="text-white/45">
                                    v{backup.pendingBusinessImport.version} • {backup.pendingBusinessImport.keys.length}{' '}
                                    مفاتيح
                                </span>
                            </div>
                            {backup.pendingBusinessImport.createdAt ? (
                                <div className="text-[10px] text-white/45 mt-1">{backup.pendingBusinessImport.createdAt}</div>
                            ) : null}
                            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-white/55">
                                {(() => {
                                    const c = (backup.pendingBusinessImport.counts ?? {}) as Record<
                                        string,
                                        { items?: number; undated?: number; keys?: number }
                                    >;
                                    const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
                                    const lawsuits = c?.lawsuits ?? {};
                                    const execution = c?.execution ?? {};
                                    const notes = c?.notes ?? {};
                                    const vault = c?.vault ?? {};
                                    const urgent = c?.urgent ?? {};
                                    const r = (backup.pendingBusinessImport.range ?? {}) as Record<string, string>;
                                    const from = typeof r?.from === 'string' ? r.from : '';
                                    const to = typeof r?.to === 'string' ? r.to : '';
                                    const rangeText = from || to ? `${from || '—'} → ${to || '—'}` : '—';
                                    return (
                                        <>
                                            <div>
                                                قضايا: {n(lawsuits.items)}
                                                {n(lawsuits.undated) ? ` (+${n(lawsuits.undated)} بلا تاريخ)` : ''}
                                            </div>
                                            <div>
                                                تنفيذ: {n(execution.items)}
                                                {n(execution.undated) ? ` (+${n(execution.undated)} بلا تاريخ)` : ''}
                                            </div>
                                            <div>
                                                ملاحظات: {n(notes.items)}
                                                {n(notes.undated) ? ` (+${n(notes.undated)} بلا تاريخ)` : ''}
                                            </div>
                                            <div>
                                                مخزن: {n(vault.items)}
                                                {n(vault.undated) ? ` (+${n(vault.undated)} بلا تاريخ)` : ''}
                                            </div>
                                            <div className="col-span-2">طلبات مستعجلة: {n(urgent.keys)} مفاتيح</div>
                                            <div className="col-span-2">النطاق الزمني: {rangeText}</div>
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="mt-2 max-h-28 overflow-y-auto scrollbar-hide text-[10px] text-white/45 border-t border-white/[0.06] pt-2">
                                {backup.pendingBusinessImport.keys.map((k) => (
                                    <div key={k} className="truncate">
                                        {k}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => backup.setPendingBusinessImport(null)}
                                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const entries = backup.pendingBusinessImport!.entries;
                                    backup.setPendingBusinessImport(null);
                                    void backup.importBusinessBackup(entries);
                                }}
                                className="flex-1 px-3 py-2 rounded-xl bg-[#E6C673] text-[#0B1021] text-xs font-bold"
                            >
                                استيراد
                            </button>
                        </div>
                    </div>
                )}
                <SettingRow
                    icon={RotateCcw}
                    label="مسح كل البيانات"
                    subLabel={settingWiringHint('data.clearLocal')}
                    action={
                        wipePhase === 'countdown' ? (
                            <div className="flex items-center gap-2">
                                <span className="text-amber-400 text-xs font-bold tabular-nums">{countdown}</span>
                                <button
                                    type="button"
                                    onClick={cancelCountdown}
                                    className="text-white/50 text-xs hover:text-white"
                                >
                                    إلغاء
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                disabled={wipePhase === 'wiping'}
                                onClick={() => void requestFullWipe()}
                                className="text-rose-400 text-xs font-bold disabled:opacity-40"
                            >
                                {wipePhase === 'wiping' ? 'جاري المسح…' : 'مسح'}
                            </button>
                        )
                    }
                />
                <SettingRow
                    icon={RotateCcw}
                    label="إعادة ضبط الإعدادات"
                    subLabel={settingWiringHint('data.resetSettings')}
                    isLast
                    action={
                        <button type="button" onClick={() => void confirmReset()} className="text-rose-400 text-xs font-bold">
                            إعادة ضبط
                        </button>
                    }
                />
            </SettingCard>
        </>
    );
}
