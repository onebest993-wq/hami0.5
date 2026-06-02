import React from 'react';
import { motion } from 'motion/react';
import {
    Trash2,
    Scale,
    User,
    Link2,
    Clock,
    Eye,
    RotateCcw,
    Gavel,
} from 'lucide-react';
import {
    isEvictionClaim,
} from '@/app/utils/executionModuleStrategies';
import { executionTrashDaysRemaining } from '@/app/utils/executionTrash';
import type { LooseArchiveFile } from '../types';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildExecutionWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import { parseLooseAmount, executionClaimBadgeArabic, executionTotalDemandEstimate } from '../utils';

interface ExecutionSmartCardProps {
    file: any;
    /** لاستخراج رقم الدعوى المرتبطة عند التثبيت (الربط العنقودي) */
    lawsuitFilesForCluster?: unknown[];
    onOpen: () => void;
    onPreview: () => void;
    variant: 'active' | 'trash';
    onRequestMoveToTrash?: () => void;
    onRestoreFromTrash?: () => void;
    trashDaysRemaining?: number;
    selected?: boolean;
    onToggleSelect?: () => void;
}

function getClaimStyle(type: string) {
    if (type?.includes('نفقة') || type?.includes('مهر') || type?.includes('شرعي')) {
        return { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' };
    }
    if (type?.includes('دين') || type?.includes('مدني')) {
        return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' };
    }
    if (type?.includes('إخلاء') || type?.includes('تخلية') || type?.toLowerCase?.() === 'eviction') {
        return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' };
    }
    return { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400' };
}

function getStatusStyle(status: string) {
    if (status?.includes('متلكئ')) {
        return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' };
    }
    if (status?.includes('بانتظار')) {
        return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' };
    }
    if (status?.includes('قيد')) {
        return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' };
    }
    if (status?.includes('منتهية')) {
        return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' };
    }
    return { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400' };
}

function getPartyName(party: any): string {
    if (!party) return 'غير محدد';
    if (typeof party === 'string') return party;
    if (typeof party === 'object' && party.name) return party.name;
    return 'غير محدد';
}

function formatAmount(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) return '—';
    return new Intl.NumberFormat('ar-IQ').format(Math.round(amount)) + ' ع.د';
}

function ExecutionSmartCard({
    file,
    lawsuitFilesForCluster = [],
    onOpen,
    onPreview,
    variant,
    onRequestMoveToTrash,
    onRestoreFromTrash,
    trashDaysRemaining,
    selected,
    onToggleSelect,
}: ExecutionSmartCardProps) {
    const loose = file as LooseArchiveFile;
    const claimLabelAr = executionClaimBadgeArabic(loose);
    const claimStyle = getClaimStyle(file.claimType || file.docType || '');
    const statusStyle = getStatusStyle(file.status || '');

    const creditor = getPartyName(file.creditor || file.clientName || file.parties?.[0]);
    const debtor = getPartyName(file.debtor || file.opponentName || file.parties?.[1]);
    const relationship = file.relationship;
    const linkedDebtor = getPartyName(file.linkedDebtor) || debtor;
    const totalDemand = executionTotalDemandEstimate(loose);
    const unifiedCount = Number((file as any)?.unifiedCount || 0);
    const unifiedTotalDemandRaw = Number((file as any)?.unifiedTotalDemand);
    const displayDemand =
        unifiedCount > 0 && Number.isFinite(unifiedTotalDemandRaw) ? unifiedTotalDemandRaw : totalDemand;
    const fileNumber = file.fileNumber || file.caseNo || 'غير محدد';
    const year = file.year || new Date().getFullYear();
    const court = file.court || file.directorate || 'غير محدد';
    const pinPayload =
        variant === 'active' ? buildExecutionWorkspacePin(file, lawsuitFilesForCluster) : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={onOpen}
            className={`
                relative bg-[#151825]/80 backdrop-blur-sm rounded-2xl 
                border ${statusStyle.border} shadow-xl
                p-6 cursor-pointer transition-all duration-200
                hover:border-[#E6C673]/50 hover:shadow-2xl
                ${variant === 'trash' ? 'opacity-95 ring-1 ring-rose-500/25' : ''}
            `}
        >
            {variant === 'trash' && onToggleSelect && (
                <button
                    type="button"
                    aria-checked={selected}
                    role="checkbox"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect();
                    }}
                    className={`absolute top-4 right-4 z-30 w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                        selected
                            ? 'bg-rose-600/90 border-rose-400 text-white'
                            : 'bg-black/40 border-white/20 text-white/70 hover:border-[#E6C673]/50'
                    }`}
                >
                    {selected ? '✓' : ''}
                </button>
            )}

            {variant === 'active' && (
                <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
                    {onRequestMoveToTrash ? (
                        <button
                            type="button"
                            title="نقل إلى سلة المهملات"
                            aria-label="نقل إلى سلة المهملات"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRequestMoveToTrash();
                            }}
                            className="w-9 h-9 rounded-xl border border-rose-500/35 bg-rose-950/50 text-rose-200 hover:bg-rose-900/60 flex items-center justify-center transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                    ) : null}
                    {pinPayload ? (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            role="presentation"
                        >
                            <WorkspacePinButton item={pinPayload} />
                        </div>
                    ) : null}
                </div>
            )}

            {variant === 'trash' && (
                <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-950/40 px-2.5 py-1 text-[10px] font-bold text-amber-100">
                        <Trash2 size={12} className="shrink-0" />
                        في سلة المهملات
                    </span>
                    <span className="inline-flex rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-300 tabular-nums">
                        حذف تلقائي خلال {trashDaysRemaining ?? 0} يوماً
                    </span>
                </div>
            )}

            {/* TOP ROW: File Identifiers */}
            <div className="flex items-start justify-between mb-4">
                {/* Court Icon + File Number */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E6C673]/10 flex items-center justify-center text-[#E6C673] border border-[#E6C673]/20">
                        <Scale size={18} />
                    </div>
                    <div>
                        <div className="text-white font-bold text-lg">
                            {fileNumber} / {year}
                        </div>
                        <div className="text-white/40 text-xs mt-0.5">
                            رقم الإضبارة
                        </div>
                        {unifiedCount > 0 && (
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-lg border border-[#E6C673]/25 bg-[#0B1120]/55 px-2 py-0.5 text-[10px] font-bold text-[#E6C673]">
                                    موحّدة
                                </span>
                                <span className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300 tabular-nums">
                                    {unifiedCount} إضبارة
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Claim Type Badge */}
                <div className={`
                    px-3 py-1.5 rounded-xl text-xs font-bold
                    ${claimStyle.bg} ${claimStyle.border} ${claimStyle.text}
                    border backdrop-blur-sm
                `}>
                    {claimLabelAr}
                </div>
            </div>

            {isEvictionClaim(String(file.claimType || file.docType || '')) && (
                <div className="mb-3 space-y-1 text-right rounded-xl border border-blue-500/20 bg-blue-950/20 px-3 py-2">
                    <p className="text-[10px] text-blue-300/90 font-semibold">العقار (من بيانات الإضبارة)</p>
                    <p className="text-[11px] text-slate-300">
                        رقم: {file.property_number || '—'} · المقاطعة: {file.district || '—'}
                    </p>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                        الصنف: {file.property_type || '—'} — {file.full_address || '—'}
                    </p>
                </div>
            )}

            {/* MIDDLE ROW: Parties & Kinship */}
            <div className="space-y-2 mb-4 pb-4 border-b border-white/5">
                {/* Creditor */}
                <div className="flex items-center gap-2">
                    <User size={14} className="text-[#E6C673]" />
                    <span className="text-white/60 text-sm">الدائن (موكلي):</span>
                    <span className="text-white font-bold text-sm">{creditor}</span>
                </div>

                {/* Debtor */}
                <div className="flex items-center gap-2">
                    <User size={14} className="text-white/40" />
                    <span className="text-white/60 text-sm">المدين:</span>
                    <span className="text-white font-bold text-sm">{debtor}</span>
                </div>

                {relationship ? (
                    <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-purple-500/5 border border-purple-500/20">
                        <Link2 size={14} className="text-purple-400" />
                        <span className="text-purple-300 text-xs">
                            الصلة: <span className="font-bold">({relationship})</span> للمدين{' '}
                            <span className="font-bold">{linkedDebtor}</span>
                        </span>
                    </div>
                ) : null}
            </div>

            {/* BOTTOM ROW: Status & Amount */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div
                    className={`
                    px-3 py-1.5 rounded-xl text-xs font-bold
                    ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}
                    border backdrop-blur-sm flex items-center gap-2 w-fit
                `}
                >
                    <Clock size={12} />
                    {file.status === 'active' ? 'نشط' : file.status || 'نشط'}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
                    {displayDemand > 0 && (
                        <div className="text-right min-w-[120px]">
                            <div className="text-[#E6C673] font-bold text-lg tracking-wide tabular-nums">
                                {formatAmount(displayDemand)}
                            </div>
                            <div className="text-white/40 text-[10px]">
                                {unifiedCount > 0 ? 'إجمالي المطلوب (بعد التوحيد)' : 'إجمالي المطلوب (تقدير)'}
                            </div>
                        </div>
                    )}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {variant === 'trash' && onRestoreFromTrash && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRestoreFromTrash();
                                }}
                                className="flex items-center gap-2 text-emerald-300 text-sm font-bold hover:text-emerald-200 transition-colors border border-emerald-500/35 rounded-xl px-3 py-2 bg-emerald-950/30"
                            >
                                <RotateCcw size={16} />
                                <span>استرجاع</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onPreview();
                            }}
                            className="flex items-center gap-2 text-[#E6C673] text-sm font-bold hover:text-[#D4AF37] transition-colors border border-[#E6C673]/30 rounded-xl px-3 py-2"
                        >
                            <Eye size={16} />
                            <span>التفاصيل والسجل الزمني</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5">
                <div className="flex items-center gap-2 text-white/40 text-xs">
                    <Gavel size={12} />
                    <span className="line-clamp-1">{court}</span>
                </div>
            </div>
        </motion.div>
    );
}

export default ExecutionSmartCard;
