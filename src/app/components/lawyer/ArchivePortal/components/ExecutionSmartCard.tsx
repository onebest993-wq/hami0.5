import React from 'react';
import { motion } from 'motion/react';
import { Archive, Trash2, Scale, Link2, Eye, RotateCcw } from 'lucide-react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { dossierLifecycleBadgeClass } from '@/app/components/lawyer/ExecutionDashboard/helpers/dossierLifecycleUtils';
import { isEvictionClaim } from '@/app/utils/executionModuleStrategies';
import { executionTrashDaysRemaining } from '@/app/utils/executionTrash';
import type { LooseArchiveFile } from '../types';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildExecutionWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import { resolveExecutionArchiveCardView } from '../utils';
import { ExecutionArchivePartyBlock } from './ExecutionArchivePartyBlock';
import { warmExecutionWorkspace } from '@/app/utils/lazyComponents';

interface ExecutionSmartCardProps {
    file: any;
    liveRevision?: number;
    lawsuitFilesForCluster?: unknown[];
    onOpen: () => void;
    onPreview: () => void;
    variant: 'active' | 'archived' | 'trash';
    onRequestMoveToTrash?: () => void;
    onRequestArchive?: () => void;
    onRestoreFromTrash?: () => void;
    onRestoreFromArchive?: () => void;
    onRequestPermanentDelete?: () => void;
    trashDaysRemaining?: number;
    selected?: boolean;
    onToggleSelect?: () => void;
}

function getClaimStyle(type: string) {
    if (type?.includes('نفقة') || type?.includes('مهر') || type?.includes('شرعي')) {
        return {
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/30',
            text: 'text-purple-300',
            accent: 'from-purple-500/20 via-transparent to-transparent',
        };
    }
    if (type?.includes('دين') || type?.includes('مدني') || type?.includes('استحصال') || type?.includes('استخلاص')) {
        return {
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/30',
            text: 'text-emerald-300',
            accent: 'from-emerald-500/20 via-transparent to-transparent',
        };
    }
    if (type?.includes('إخلاء') || type?.includes('تخلية') || type?.toLowerCase?.() === 'eviction') {
        return {
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/30',
            text: 'text-blue-300',
            accent: 'from-blue-500/20 via-transparent to-transparent',
        };
    }
    return {
        bg: 'bg-white/5',
        border: 'border-white/15',
        text: 'text-slate-300',
        accent: 'from-white/10 via-transparent to-transparent',
    };
}

function ExecutionSmartCard({
    file,
    liveRevision = 0,
    lawsuitFilesForCluster = [],
    onOpen,
    onPreview,
    variant,
    onRequestMoveToTrash,
    onRequestArchive,
    onRestoreFromTrash,
    onRestoreFromArchive,
    onRequestPermanentDelete,
    trashDaysRemaining,
    selected,
    onToggleSelect,
}: ExecutionSmartCardProps) {
    const reduceMotion = useReduceMotion();
    const prefetchFiredRef = React.useRef(false);

    const warmExecutionDossier = React.useCallback(() => {
        if (prefetchFiredRef.current) return;
        prefetchFiredRef.current = true;
        warmExecutionWorkspace();
    }, []);

    const handleOpen = React.useCallback(() => {
        warmExecutionDossier();
        onOpen();
    }, [onOpen, warmExecutionDossier]);

    const handleToolbarAction = React.useCallback(
        (event: React.MouseEvent, action?: () => void) => {
            event.preventDefault();
            event.stopPropagation();
            action?.();
        },
        [],
    );

    const handleCardClick = React.useCallback(
        (e: React.MouseEvent) => {
            const target = e.target;
            if (!(target instanceof Element)) return;
            if (target.closest('button,a,[role="checkbox"],input,textarea,select,label')) return;
            handleOpen();
        },
        [handleOpen],
    );

    const loose = file as LooseArchiveFile;
    const unifiedCount = Number((file as any)?.unifiedCount || 0);
    const unifiedTotalDemandRaw = Number((file as any)?.unifiedTotalDemand);
    const cardView = React.useMemo(
        () =>
            resolveExecutionArchiveCardView(loose, {
                unifiedCount,
                unifiedTotalDemand: unifiedTotalDemandRaw,
            }),
        [loose, unifiedCount, unifiedTotalDemandRaw, liveRevision]
    );

    const snapLoose = cardView.snap as unknown as LooseArchiveFile;
    const claimStyle = getClaimStyle(
        String(cardView.snap.claimType || cardView.snap.docType || '').trim()
    );
    const lifecycleBadgeClass = dossierLifecycleBadgeClass(cardView.dossierLifecycleStatus);
    const venueLabel = cardView.directorateLabel
        ? { prefix: 'مديرية التنفيذ:', name: cardView.directorateLabel }
        : cardView.court && cardView.court !== 'غير محدد'
          ? { prefix: 'المحكمة:', name: cardView.court }
          : null;

    const pinPayload =
        variant === 'active' ? buildExecutionWorkspacePin(cardView.snap, lawsuitFilesForCluster) : null;

    const cardClassName = `
                group relative cursor-pointer overflow-hidden rounded-3xl
                border border-white/10 bg-gradient-to-br from-[#0B1120]/95 to-[#05060D]/90
                p-5 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl
                transition-all duration-300 hover:border-[#E6C673]/35 hover:shadow-[0_22px_60px_rgba(230,198,115,0.08)]
                [content-visibility:auto] [contain-intrinsic-size:auto_280px]
                ${variant === 'trash' ? 'opacity-95 ring-1 ring-rose-500/25' : ''}
                ${variant === 'archived' ? 'opacity-90 ring-1 ring-amber-500/20' : ''}
            `;

    const cardBody = (
        <>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/[0.04] to-transparent" />

            {variant === 'trash' && (
                <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-950/40 px-2.5 py-1 text-[10px] font-bold text-amber-100">
                        <Trash2 size={12} className="shrink-0" />
                        في سلة المهملات
                    </span>
                    <span className="inline-flex rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-slate-300">
                        حذف تلقائي خلال {trashDaysRemaining ?? executionTrashDaysRemaining(loose)} يوماً
                    </span>
                </div>
            )}

            <div className="relative mb-3" dir="rtl">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium text-slate-500">رقم الإضبارة</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="shrink-0 text-xl font-black tabular-nums tracking-tight text-white">
                                {cardView.fileNumber}
                                <span className="mx-1 text-slate-500">/</span>
                                <span className="text-[#E6C673]">{cardView.year}</span>
                            </p>
                            <span
                                className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-bold leading-tight ${lifecycleBadgeClass}`}
                            >
                                {cardView.dossierLifecycleBadge}
                            </span>
                            <span
                                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${claimStyle.bg} ${claimStyle.border} ${claimStyle.text}`}
                            >
                                <Scale size={10} className="shrink-0 opacity-80" />
                                {cardView.claimLabelAr}
                            </span>
                            {unifiedCount > 0 ? (
                                <span className="inline-flex shrink-0 items-center rounded-lg border border-[#E6C673]/25 bg-[#0B1120]/55 px-2 py-0.5 text-[10px] font-bold text-[#E6C673]">
                                    موحّدة · {unifiedCount}
                                </span>
                            ) : null}
                        </div>
                        {venueLabel ? (
                            <div className="mt-2 flex items-center justify-between gap-3">
                                <p className="min-w-0 flex-1 text-right leading-snug">
                                    <span className="text-[10px] font-medium text-slate-500">
                                        {venueLabel.prefix}{' '}
                                    </span>
                                    <span className="text-[12px] font-bold text-slate-100">
                                        {venueLabel.name}
                                    </span>
                                </p>
                                <div
                                    className="flex shrink-0 items-center gap-1.5 self-end"
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    role="presentation"
                                >
                                    {variant === 'trash' && onRestoreFromTrash ? (
                                        <button
                                            type="button"
                                            onClick={onRestoreFromTrash}
                                            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-950/30 px-2.5 py-1.5 text-[10px] font-bold text-emerald-300 hover:text-emerald-200"
                                        >
                                            <RotateCcw size={12} />
                                            استرجاع
                                        </button>
                                    ) : null}
                                    {variant === 'archived' && onRestoreFromArchive ? (
                                        <button
                                            type="button"
                                            onClick={onRestoreFromArchive}
                                            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-950/30 px-2.5 py-1.5 text-[10px] font-bold text-emerald-300 hover:text-emerald-200"
                                        >
                                            <RotateCcw size={12} />
                                            إعادة للنشطة
                                        </button>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            warmExecutionDossier();
                                            onPreview();
                                        }}
                                        className="flex items-center gap-1.5 rounded-lg border border-[#E6C673]/30 bg-[#E6C673]/10 px-2.5 py-1.5 text-[10px] font-bold text-[#E6C673] hover:bg-[#E6C673]/15"
                                    >
                                        <Eye size={12} />
                                        التفاصيل
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="mt-2 flex justify-start"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                role="presentation"
                            >
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        warmExecutionDossier();
                                        onPreview();
                                    }}
                                    className="flex items-center gap-1.5 rounded-lg border border-[#E6C673]/30 bg-[#E6C673]/10 px-2.5 py-1.5 text-[10px] font-bold text-[#E6C673] hover:bg-[#E6C673]/15"
                                >
                                    <Eye size={12} />
                                    التفاصيل
                                </button>
                            </div>
                        )}
                    </div>

                    <div
                        className="relative z-20 flex shrink-0 items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        role="presentation"
                    >
                        {variant === 'trash' && onToggleSelect ? (
                            <button
                                type="button"
                                aria-checked={selected}
                                role="checkbox"
                                onClick={onToggleSelect}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                                    selected
                                        ? 'border-rose-400 bg-rose-600/90 text-white'
                                        : 'border-white/20 bg-black/40 text-white/70 hover:border-[#E6C673]/50'
                                }`}
                            >
                                {selected ? '✓' : ''}
                            </button>
                        ) : null}
                        {variant === 'active' && pinPayload ? (
                            <WorkspacePinButton item={pinPayload} />
                        ) : null}
                        {variant === 'active' && onRequestArchive ? (
                            <button
                                type="button"
                                title="أرشفة الإضبارة"
                                aria-label="أرشفة الإضبارة"
                                data-testid="execution-smart-card-archive"
                                onClick={(event) => handleToolbarAction(event, onRequestArchive)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/35 bg-amber-950/40 text-amber-200 transition-colors hover:bg-amber-900/50 touch-manipulation"
                            >
                                <Archive size={16} />
                            </button>
                        ) : null}
                        {variant === 'active' && onRequestMoveToTrash ? (
                            <button
                                type="button"
                                title="نقل إلى سلة المهملات"
                                aria-label="نقل إلى سلة المهملات"
                                data-testid="execution-smart-card-trash"
                                onClick={(event) => handleToolbarAction(event, onRequestMoveToTrash)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/35 bg-rose-950/50 text-rose-200 transition-colors hover:bg-rose-900/60 touch-manipulation"
                            >
                                <Trash2 size={16} />
                            </button>
                        ) : null}
                        {variant === 'trash' && onRequestPermanentDelete ? (
                            <button
                                type="button"
                                title="حذف نهائي"
                                aria-label="حذف نهائي"
                                data-testid="execution-smart-card-permanent-delete"
                                onClick={(event) => handleToolbarAction(event, onRequestPermanentDelete)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/50 bg-rose-900/70 text-rose-100 transition-colors hover:bg-rose-800 touch-manipulation"
                            >
                                <Trash2 size={16} />
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

            {isEvictionClaim(String(cardView.snap.claimType || cardView.snap.docType || '')) && (
                <div className="mb-2 space-y-1 rounded-2xl border border-blue-500/20 bg-blue-950/20 px-3 py-2 text-right">
                    <p className="text-[10px] font-semibold text-blue-300/90">العقار (من بيانات الإضبارة)</p>
                    <p className="text-[11px] text-slate-300">
                        رقم: {snapLoose.property_number || '—'} · المقاطعة: {snapLoose.district || '—'}
                    </p>
                    <p className="line-clamp-2 text-[11px] text-slate-400">
                        الصنف: {snapLoose.property_type || '—'} — {snapLoose.full_address || '—'}
                    </p>
                </div>
            )}

            <ExecutionArchivePartyBlock view={cardView} className="mb-3 space-y-2 rounded-2xl border border-white/8 bg-white/[0.03] p-3" />
            {cardView.relationship ? (
                <div className="mb-3 flex items-center justify-end gap-2 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-2.5">
                    <span className="text-[10px] text-purple-200">
                        الصلة: <span className="font-bold">({cardView.relationship})</span> للمدين{' '}
                        <span className="font-bold">{cardView.linkedDebtorLabel}</span>
                    </span>
                    <Link2 size={12} className="shrink-0 text-purple-400" />
                </div>
            ) : null}

        </>
    );

    if (reduceMotion) {
        return (
            <div
                onPointerEnter={warmExecutionDossier}
                onFocus={warmExecutionDossier}
                onClick={handleCardClick}
                className={cardClassName}
            >
                {cardBody}
            </div>
        );
    }

    return (
        <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            whileHover={reduceMotion ? undefined : { y: -6 }}
            onPointerEnter={warmExecutionDossier}
            onFocus={warmExecutionDossier}
            onClick={handleCardClick}
            className={cardClassName}
        >
            {cardBody}
        </motion.div>
    );
}

export default ExecutionSmartCard;
