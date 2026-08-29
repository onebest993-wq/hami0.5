import React from 'react';
import type { PendingBusinessImport } from '@/app/services/settings/businessBackupTypes';

function formatImportCounts(counts: Record<string, unknown> | null) {
    const c = (counts ?? {}) as Record<string, { items?: number; undated?: number; keys?: number }>;
    const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    const lawsuits = c.lawsuits ?? {};
    const execution = c.execution ?? {};
    const notes = c.notes ?? {};
    const vault = c.vault ?? {};
    const urgent = c.urgent ?? {};
    return { lawsuits, execution, notes, vault, urgent, n };
}

export function BusinessBackupImportPreview({
    pending,
    onCancel,
    onConfirm,
}: {
    pending: PendingBusinessImport;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const { lawsuits, execution, notes, vault, urgent, n } = formatImportCounts(pending.counts);
    const range = (pending.range ?? {}) as Record<string, string>;
    const from = typeof range.from === 'string' ? range.from : '';
    const to = typeof range.to === 'string' ? range.to : '';
    const rangeText = from || to ? `${from || '—'} → ${to || '—'}` : '—';

    return (
        <div className="px-4 pb-4 border-b border-white/[0.04]" data-testid="business-backup-import-preview">
            <div className="text-[11px] text-white/60 mb-2">تقرير النسخة قبل الاستيراد</div>
            <div className="bg-black/20 border border-white/[0.06] rounded-xl p-3 mb-3">
                <div className="flex justify-between text-[11px] text-white/70">
                    <span>{pending.fileName}</span>
                    <span className="text-white/45">
                        v{pending.version} • {pending.keys.length} مفاتيح
                    </span>
                </div>
                {pending.createdAt ? (
                    <div className="text-[10px] text-white/45 mt-1">{pending.createdAt}</div>
                ) : null}
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-white/55">
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
                </div>
                <div className="mt-2 max-h-28 overflow-y-auto scrollbar-hide text-[10px] text-white/45 border-t border-white/[0.06] pt-2">
                    {pending.keys.map((k) => (
                        <div key={k} className="truncate">
                            {k}
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white min-h-[44px] min-w-[44px]"
                >
                    إلغاء
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#E6C673] text-[#0B1021] text-xs font-bold min-h-[44px] min-w-[44px]"
                >
                    استيراد
                </button>
            </div>
        </div>
    );
}
