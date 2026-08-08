import React from 'react';
import { motion } from 'motion/react';
import { Archive, Trash2, Link2, Eye, RotateCcw } from '@/app/components/ui/lucideIcons';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { dossierLifecycleBadgeClass } from '@/app/components/lawyer/ExecutionDashboard/helpers/dossierLifecycleUtils';
import { isEvictionClaim } from '@/app/utils/executionModuleStrategies';
import { executionTrashDaysRemaining } from '@/app/utils/executionTrash';
import type { LooseArchiveFile } from '../types';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildExecutionWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import { resolveExecutionArchiveCardView } from '../utils';
import { ExecutionArchivePartyBlock } from './ExecutionArchivePartyBlock';
import { warmExecutionDossier } from '@/app/utils/lazyComponentsIntent';
import { dispatchExecutionDossierPrimeHost } from '@/app/runtime/executionDossierPrimeHost';
import { resolveDossierHeaderFields } from '@/app/utils/executionDossierHeaderFields';

interface ExecutionSmartCardProps {
    file: LooseArchiveFile & {
        unifiedCount?: unknown;
        unifiedTotalDemand?: unknown;
    };
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

function BiDiText({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <bdi dir="auto" className={`[unicode-bidi:plaintext] ${className}`.trim()}>
            {children}
        </bdi>
    );
}

function outlineIconActionClassName(tone: 'neutral' | 'accent' | 'danger') {
    const tones = {
        neutral:
            'border-white/12 bg-white/[0.03] text-white/62 hover:border-white/22 hover:bg-white/[0.06] hover:text-white',
        accent:
            'border-[#E6C673]/28 bg-[#E6C673]/[0.045] text-[#E6C673] hover:border-[#E6C673]/45 hover:bg-[#E6C673]/[0.09]',
        danger:
            'border-rose-500/28 bg-rose-500/[0.045] text-rose-200 hover:border-rose-400/45 hover:bg-rose-500/[0.09]',
    } as const;
    return `flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-all duration-200 touch-manipulation ${tones[tone]}`;
}

function outlineTextActionClassName(tone: 'accent' | 'success') {
    const tones = {
        accent:
            'border-[#E6C673]/28 bg-[#E6C673]/[0.06] text-[#E6C673] hover:border-[#E6C673]/45 hover:bg-[#E6C673]/[0.1]',
        success:
            'border-emerald-500/28 bg-emerald-500/[0.06] text-emerald-300 hover:border-emerald-400/45 hover:bg-emerald-500/[0.1]',
    } as const;
    return `inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-bold transition-all duration-200 ${tones[tone]}`;
}

function stopToolbarPointerEvent(event: React.SyntheticEvent) {
    event.stopPropagation();
}

function fireToolbarAction(event: React.MouseEvent, action?: () => void) {
    event.preventDefault();
    event.stopPropagation();
    action?.();
}

function ToolbarIconButton({
    onAction,
    className,
    children,
    ...rest
}: {
    onAction?: () => void;
    className: string;
    children: React.ReactNode;
    title?: string;
    'aria-label'?: string;
    'data-testid'?: string;
}) {
    return (
        <button
            type="button"
            {...rest}
            onPointerDown={stopToolbarPointerEvent}
            onMouseDown={stopToolbarPointerEvent}
            onClick={(event) => fireToolbarAction(event, onAction)}
            className={className}
        >
            {children}
        </button>
    );
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

    const loose = file;
    const unifiedCount = Number(file.unifiedCount || 0);
    const unifiedTotalDemandRaw = Number(file.unifiedTotalDemand);
    const cardView = React.useMemo(
        () =>
            resolveExecutionArchiveCardView(loose, {
                unifiedCount,
                unifiedTotalDemand: unifiedTotalDemandRaw,
            }),
        [loose, unifiedCount, unifiedTotalDemandRaw, liveRevision],
    );

    // قراءة blob الإضبارة (فك تشفير + JSON.parse) عند النية بدل لحظة النقر —
    // buildExecutionViewData يقرأها متزامناً أثناء أول mount، وهذا يجعلها cache hit.
    const warmDossierBlobRef = React.useRef(false);
    const warmDossierBlob = React.useCallback(() => {
        if (warmDossierBlobRef.current) return;
        warmDossierBlobRef.current = true;
        const fileId = String(loose.id ?? '').trim();
        if (!fileId) return;
        void import('@/app/infrastructure/execution/ExecutionDossierRepository')
            .then((m) => {
                m.readExecutionDossierByIdFromCache(fileId);
            })
            .catch(() => undefined);
    }, [loose.id]);

    const primeExecutionDossier = React.useCallback(() => {
        if (prefetchFiredRef.current) return;
        prefetchFiredRef.current = true;
        warmExecutionDossier();
        warmDossierBlob();
        dispatchExecutionDossierPrimeHost({
            ...(loose as Record<string, unknown>),
            type: 'execution',
        });
    }, [warmDossierBlob, loose]);

    const handleOpen = React.useCallback(() => {
        warmExecutionDossier('urgent');
        warmDossierBlob();
        // تسليح Host قبل commit — إن كان مركّباً يُظهر فوراً؛ وإلا يُركّب بنفس الملف
        dispatchExecutionDossierPrimeHost({
            ...(loose as Record<string, unknown>),
            type: 'execution',
        });
        onOpen();
    }, [warmDossierBlob, onOpen, loose]);

    const handleCardClick = React.useCallback(
        (e: React.MouseEvent) => {
            const target = e.target;
            if (!(target instanceof Element)) return;
            if (target.closest('button,a,[role="checkbox"],input,textarea,select,label')) return;
            handleOpen();
        },
        [handleOpen],
    );

    // click يُطلق عند pointerup — البدء من pointerdown يكسب ~100ms من تحميل الـ chunks
    const handleCardPointerDown = React.useCallback(
        (e: React.PointerEvent) => {
            const target = e.target;
            if (!(target instanceof Element)) return;
            if (target.closest('button,a,[role="checkbox"],input,textarea,select,label')) return;
            warmExecutionDossier('urgent');
            warmDossierBlob();
        },
        [warmDossierBlob],
    );

    const openSurfaceProps = {
        onClick: handleCardClick,
        onPointerDown: handleCardPointerDown,
        className: 'cursor-pointer',
    } as const;

    const headerMeta = React.useMemo(
        () => resolveDossierHeaderFields(cardView.snap),
        [cardView.snap],
    );
    const claimTypeLine = headerMeta.claimTypeDisplay || cardView.claimLabelAr;
    const executionTypeLine =
        headerMeta.docType ||
        cardView.docTypeLabel ||
        headerMeta.classificationDisplay ||
        '';

    const snapLoose = cardView.snap as unknown as LooseArchiveFile;
    const lifecycleBadgeClass = dossierLifecycleBadgeClass(cardView.dossierLifecycleStatus);
    const venueLabel = cardView.directorateLabel
        ? { prefix: 'مديرية التنفيذ', name: cardView.directorateLabel }
        : cardView.court && cardView.court !== 'غير محدد'
          ? { prefix: 'المحكمة', name: cardView.court }
          : null;

    const pinPayload =
        variant === 'active' ? buildExecutionWorkspacePin(cardView.snap, lawsuitFilesForCluster) : null;

    const showTrashSelect = variant === 'trash' && Boolean(onToggleSelect);
    const showPin = variant === 'active' && Boolean(pinPayload);
    const showArchive = variant === 'active' && Boolean(onRequestArchive);
    const showTrash = variant === 'active' && Boolean(onRequestMoveToTrash);
    const showPermanentDelete = variant === 'trash' && Boolean(onRequestPermanentDelete);
    const hasIconToolbar =
        showTrashSelect || showPin || showArchive || showTrash || showPermanentDelete;

    const cardClassName = `
                group relative overflow-hidden rounded-3xl
                border border-white/10 bg-gradient-to-br from-[#0B1120]/95 to-[#05060D]/90
                p-4 sm:p-[1.125rem] shadow-[0_16px_42px_rgba(0,0,0,0.42)] backdrop-blur-xl
                transition-all duration-300 hover:border-[#E6C673]/35 hover:shadow-[0_20px_52px_rgba(230,198,115,0.08)]
                ${variant === 'trash' ? 'opacity-95 ring-1 ring-rose-500/25' : ''}
                ${variant === 'archived' ? 'opacity-90 ring-1 ring-amber-500/20' : ''}
            `;

    const cardBody = (
        <>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white/[0.04] to-transparent" />

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
                <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1" {...openSurfaceProps}>
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-400">رقم الإضبارة</span>
                            <span
                                className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold leading-tight ${lifecycleBadgeClass}`}
                            >
                                {cardView.dossierLifecycleBadge}
                            </span>
                            {unifiedCount > 0 ? (
                                <span className="inline-flex shrink-0 items-center rounded-lg border border-[#E6C673]/25 bg-[#0B1120]/55 px-2 py-0.5 text-[10px] font-bold text-[#E6C673]">
                                    موحّدة · {unifiedCount}
                                </span>
                            ) : null}
                        </div>
                        <p className="text-[1.375rem] font-black leading-none tracking-tight text-white sm:text-2xl">
                            <BiDiText className="tabular-nums">
                                {`${cardView.fileNumber} / ${cardView.year}`}
                            </BiDiText>
                        </p>
                        {venueLabel ? (
                            <p className="mt-2 leading-snug">
                                <span className="block text-[11px] font-semibold text-slate-400">
                                    {venueLabel.prefix}
                                </span>
                                <BiDiText className="mt-0.5 block text-[14px] font-bold text-slate-50 sm:text-[15px]">
                                    {venueLabel.name}
                                </BiDiText>
                            </p>
                        ) : null}
                        {claimTypeLine || executionTypeLine ? (
                            <div className="mt-2.5 space-y-1">
                                {claimTypeLine ? (
                                    <p className="truncate text-[12px] text-white/55">
                                        <span className="text-white/35">نوع المطالبة · </span>
                                        <BiDiText className="font-semibold text-white/80">
                                            {claimTypeLine}
                                        </BiDiText>
                                    </p>
                                ) : null}
                                {executionTypeLine ? (
                                    <p className="truncate text-[12px] text-white/55">
                                        <span className="text-white/35">نوع التنفيذ · </span>
                                        <BiDiText className="font-semibold text-white/75">
                                            {executionTypeLine}
                                        </BiDiText>
                                    </p>
                                ) : null}
                            </div>
                        ) : null}
                    </div>

                    <div
                        className="relative z-40 inline-flex shrink-0 flex-col items-stretch gap-1.5"
                        onPointerDown={stopToolbarPointerEvent}
                        onMouseDown={stopToolbarPointerEvent}
                        onClick={stopToolbarPointerEvent}
                    >
                        {hasIconToolbar ? (
                            <div className="inline-flex items-center justify-end gap-1.5 rounded-2xl border border-white/10 bg-black/20 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                                {showTrashSelect ? (
                                    <button
                                        type="button"
                                        aria-checked={selected}
                                        role="checkbox"
                                        onClick={onToggleSelect}
                                        className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-all duration-200 touch-manipulation ${
                                            selected
                                                ? 'border-[#E6C673]/45 bg-[#E6C673]/14 text-[#E6C673]'
                                                : 'border-white/12 bg-white/[0.03] text-white/62 hover:border-white/22 hover:bg-white/[0.06] hover:text-white'
                                        }`}
                                    >
                                        {selected ? '✓' : ''}
                                    </button>
                                ) : null}
                                {showPin ? (
                                    <WorkspacePinButton
                                        item={pinPayload!}
                                        size={15}
                                        className="min-h-[44px] min-w-[44px] rounded-xl border-white/12 bg-white/[0.03] text-white/62 hover:border-white/22 hover:bg-white/[0.06] hover:text-white touch-manipulation"
                                    />
                                ) : null}
                                {showArchive ? (
                                    <ToolbarIconButton
                                        title="أرشفة الإضبارة"
                                        aria-label="أرشفة الإضبارة"
                                        data-testid="execution-smart-card-archive"
                                        onAction={onRequestArchive}
                                        className={outlineIconActionClassName('accent')}
                                    >
                                        <Archive size={16} />
                                    </ToolbarIconButton>
                                ) : null}
                                {showTrash ? (
                                    <ToolbarIconButton
                                        title="نقل إلى سلة المهملات"
                                        aria-label="نقل إلى سلة المهملات"
                                        data-testid="execution-smart-card-trash"
                                        onAction={onRequestMoveToTrash}
                                        className={outlineIconActionClassName('danger')}
                                    >
                                        <Trash2 size={16} />
                                    </ToolbarIconButton>
                                ) : null}
                                {showPermanentDelete ? (
                                    <ToolbarIconButton
                                        title="حذف نهائي"
                                        aria-label="حذف نهائي"
                                        data-testid="execution-smart-card-permanent-delete"
                                        onAction={onRequestPermanentDelete}
                                        className={outlineIconActionClassName('danger')}
                                    >
                                        <Trash2 size={16} />
                                    </ToolbarIconButton>
                                ) : null}
                            </div>
                        ) : null}
                        <div className="flex flex-col gap-1.5">
                            {variant === 'trash' && onRestoreFromTrash ? (
                                <button
                                    type="button"
                                    onClick={onRestoreFromTrash}
                                    className={`${outlineTextActionClassName('success')} w-full justify-center`}
                                >
                                    <RotateCcw size={12} />
                                    استرجاع
                                </button>
                            ) : null}
                            {variant === 'archived' && onRestoreFromArchive ? (
                                <button
                                    type="button"
                                    onClick={onRestoreFromArchive}
                                    className={`${outlineTextActionClassName('success')} w-full justify-center`}
                                >
                                    <RotateCcw size={12} />
                                    إعادة للنشطة
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    warmExecutionDossier('urgent');
                                    onPreview();
                                }}
                                className={`${outlineTextActionClassName('accent')} min-h-[36px] w-full justify-center`}
                            >
                                <Eye size={13} />
                                التفاصيل
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isEvictionClaim(String(cardView.snap.claimType || cardView.snap.docType || '')) && (
                <div
                    {...openSurfaceProps}
                    className="mb-3 space-y-1 rounded-2xl border border-blue-500/20 bg-blue-950/20 px-3 py-2 text-right"
                >
                    <p className="text-[10px] font-semibold text-blue-300/90">العقار (من بيانات الإضبارة)</p>
                    <p className="text-[11px] text-slate-300">
                        رقم: {snapLoose.property_number || '—'} · المقاطعة: {snapLoose.district || '—'}
                    </p>
                    <p className="line-clamp-2 text-[11px] text-slate-400">
                        الصنف: {snapLoose.property_type || '—'} — {snapLoose.full_address || '—'}
                    </p>
                </div>
            )}

            <div {...openSurfaceProps}>
                <ExecutionArchivePartyBlock view={cardView} className="border-t border-slate-800/50 pt-3" />
                {cardView.relationship ? (
                    <div className="mt-2.5 flex items-center justify-end gap-2 border-t border-purple-500/20 pt-2.5">
                        <span className="text-[11px] text-purple-200">
                            الصلة: <span className="font-bold">({cardView.relationship})</span> للمدين{' '}
                            <BiDiText className="font-bold">{cardView.linkedDebtorLabel}</BiDiText>
                        </span>
                        <Link2 size={12} className="shrink-0 text-purple-400" />
                    </div>
                ) : null}
            </div>
        </>
    );

    if (reduceMotion) {
        return (
            <div
                onPointerEnter={primeExecutionDossier}
                onFocus={primeExecutionDossier}
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
            onPointerEnter={primeExecutionDossier}
            onFocus={primeExecutionDossier}
            className={cardClassName}
        >
            {cardBody}
        </motion.div>
    );
}

export default ExecutionSmartCard;
