import React from 'react';
import { motion } from 'motion/react';
import { X, Scale, History } from '@/app/components/ui/lucideIcons';
import { isEvictionClaim } from '@/app/utils/executionModuleStrategies';
import { ExecutionArchivePartyBlock } from './ExecutionArchivePartyBlock';
import type { LooseArchiveFile } from '../types';
import {
    executionClaimBadgeArabic,
    resolveExecutionArchiveCardView,
} from '../utils';

type ArchivePortalExecutionPreviewModalProps = {
    file: LooseArchiveFile;
    previewTimelineEvents: NonNullable<LooseArchiveFile['timelineEvents']>;
    onClose: () => void;
    onOpenFull: (file: LooseArchiveFile) => void;
};

export function ArchivePortalExecutionPreviewModal({
    file,
    previewTimelineEvents,
    onClose,
    onOpenFull,
}: ArchivePortalExecutionPreviewModalProps) {
    const cardView = resolveExecutionArchiveCardView(file);
    const demandAmount =
        cardView.remainingDemand > 0 && cardView.remainingDemand < cardView.totalDemand
            ? cardView.remainingDemand
            : cardView.totalDemand;
    const demandFormatted =
        demandAmount > 0
            ? new Intl.NumberFormat('ar-IQ').format(Math.round(demandAmount)) + ' د.ع'
            : '—';

    return (
        <div
            className="fixed inset-0 z-[120] bg-black/85 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#0B1120] border border-[#E6C673]/35 rounded-3xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-white/10 p-4 shrink-0">
                    <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
                        <X className="text-white" size={20} />
                    </button>
                    <h3 className="text-[#E6C673] font-bold text-lg flex items-center gap-2">
                        <Scale size={20} />
                        تفاصيل وسجل زمني
                    </h3>
                </div>
                <div className="p-5 overflow-y-auto text-right space-y-4 flex-1 min-h-0">
                    <div>
                        <p className="text-white/50 text-xs mb-1">نوع الإضبارة</p>
                        <p className="text-white font-bold">{executionClaimBadgeArabic(file)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <p className="text-white/50">رقم الإضبارة</p>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <p className="text-white font-mono">
                                    {file.fileNumber || file.caseNo || '—'} /{' '}
                                    {file.year || file.fileYear || new Date().getFullYear()}
                                </p>
                                <span className="text-[10px] font-bold text-emerald-300">
                                    {cardView.dossierLifecycleBadge}
                                </span>
                            </div>
                        </div>
                        <div>
                            <p className="text-white/50">{cardView.demandLabel}</p>
                            <p className="text-[#E6C673] font-bold tabular-nums">{demandFormatted}</p>
                        </div>
                    </div>
                    <div>
                        {cardView.directorateLabel ? (
                            <p className="mb-3 text-right text-xs">
                                <span className="text-white/50">مديرية التنفيذ: </span>
                                <span className="font-bold text-slate-100">{cardView.directorateLabel}</span>
                            </p>
                        ) : null}
                        <ExecutionArchivePartyBlock
                            view={cardView}
                            className="mb-3 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                        />
                    </div>
                    {isEvictionClaim(String(file.claimType || file.docType || '')) && (
                        <div className="rounded-xl border border-blue-500/25 bg-blue-950/20 p-3 space-y-1">
                            <p className="text-blue-300 text-xs font-bold">بيانات العقار</p>
                            <p className="text-slate-300 text-xs">
                                رقم {file.property_number || '—'} — مقاطعة {file.district || '—'}
                            </p>
                            <p className="text-slate-400 text-[11px] leading-relaxed">
                                صنف: {file.property_type || '—'}
                            </p>
                            <p className="text-slate-400 text-[11px] leading-relaxed">
                                {file.full_address || '—'}
                            </p>
                        </div>
                    )}
                    <div>
                        <p className="text-white/50 text-xs mb-2 flex items-center justify-end gap-2">
                            <History size={14} />
                            السجل الزمني (من آخر الأحداث)
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2">
                            {previewTimelineEvents.length > 0 ? (
                                previewTimelineEvents.slice(0, 25).map((ev, idx) => (
                                    <div
                                        key={ev.id || String(idx)}
                                        className="text-right border-b border-white/5 pb-2 last:border-0"
                                    >
                                        <p className="text-[#E6C673] text-[11px] font-semibold">
                                            {ev.title || 'حدث'}
                                        </p>
                                        {ev.description && (
                                            <p className="text-slate-400 text-[10px] mt-0.5 leading-relaxed">
                                                {ev.description}
                                            </p>
                                        )}
                                        <p className="text-slate-600 text-[9px] mt-1 font-mono">
                                            {ev.date || ev.timestamp || ''}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-500 text-xs text-center py-4">
                                    لا توجد أحداث في الملف المخزّن أو في ذاكرة الجلسة لهذه الإضبارة — افتح اللوحة
                                    لإكمال السجل.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-white/10 shrink-0">
                    <button
                        type="button"
                        onClick={() => onOpenFull(file)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#E6C673] to-amber-600 text-[#0B1021] font-bold text-sm"
                    >
                        فتح لوحة الإضبارة الكاملة
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
