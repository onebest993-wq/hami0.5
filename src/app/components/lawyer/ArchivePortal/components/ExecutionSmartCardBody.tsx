import React from 'react';
import {
    ExecutionArchiveBoxMark,
    ExecutionArchiveEyeMark,
    ExecutionArchiveLinkMark,
    ExecutionArchiveRotateMark,
    ExecutionArchiveTrashMark,
} from '../executionArchiveMarks';
import { executionArchiveLifecycleBadgeClass } from '../executionArchiveStatusLabel';
import { isEvictionClaim } from '@/app/utils/isEvictionClaim';
import { executionTrashDaysRemaining } from '@/app/utils/executionTrash';
import type { LooseArchiveFile } from '../types';
import type { ExecutionArchiveCardView } from '../executionArchiveCardView';
import type { WorkspacePinnedItem } from '@/app/workspace/types';
import { ExecutionArchivePartyBlock } from './ExecutionArchivePartyBlock';
import { ExecutionArchiveCardPin } from './ExecutionArchiveCardPin';
import { warmExecutionDossierFromArchiveCard } from '../executionArchiveCardIntentWarm';
import {
    BiDiText,
    outlineIconActionClassName,
    outlineTextActionClassName,
    stopToolbarPointerEvent,
    ToolbarIconButton,
} from './executionSmartCardChrome';

export type ExecutionSmartCardBodyProps = {
    loose: LooseArchiveFile;
    cardView: ExecutionArchiveCardView;
    unifiedCount: number;
    claimTypeLine: string;
    executionTypeLine: string;
    venueLabel: { prefix: string; name: string } | null;
    pinPayload: WorkspacePinnedItem | null;
    variant: 'active' | 'archived' | 'trash';
    trashDaysRemaining?: number;
    selected?: boolean;
    onToggleSelect?: () => void;
    onRequestMoveToTrash?: () => void;
    onRequestArchive?: () => void;
    onRestoreFromTrash?: () => void;
    onRestoreFromArchive?: () => void;
    onRequestPermanentDelete?: () => void;
    onPreview: () => void;
    openSurfaceProps: {
        onClick: (e: React.MouseEvent) => void;
        onPointerDown: (e: React.PointerEvent) => void;
        onPointerMove?: (e: React.PointerEvent) => void;
        onPointerUp?: (e: React.PointerEvent) => void;
        onPointerCancel?: (e: React.PointerEvent) => void;
        className: string;
    };
};

export function ExecutionSmartCardBody({
    loose,
    cardView,
    unifiedCount,
    claimTypeLine,
    executionTypeLine,
    venueLabel,
    pinPayload,
    variant,
    trashDaysRemaining,
    selected,
    onToggleSelect,
    onRequestMoveToTrash,
    onRequestArchive,
    onRestoreFromTrash,
    onRestoreFromArchive,
    onRequestPermanentDelete,
    onPreview,
    openSurfaceProps,
}: ExecutionSmartCardBodyProps) {
    const snapLoose = cardView.snap as unknown as LooseArchiveFile;
    const lifecycleBadgeClass = executionArchiveLifecycleBadgeClass(cardView.dossierLifecycleStatus);

    const showTrashSelect = variant === 'trash' && Boolean(onToggleSelect);
    const showPin = variant === 'active' && Boolean(pinPayload);
    const showArchive = variant === 'active' && Boolean(onRequestArchive);
    const showTrash = variant === 'active' && Boolean(onRequestMoveToTrash);
    const showPermanentDelete = variant === 'trash' && Boolean(onRequestPermanentDelete);
    const hasIconToolbar =
        showTrashSelect || showPin || showArchive || showTrash || showPermanentDelete;

    return (
        <>
            {variant === 'trash' && (
                <div className="mb-1.5 flex flex-wrap items-center justify-end gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/35 bg-amber-950/40 px-2 py-0.5 text-[10px] font-bold text-amber-100">
                        <ExecutionArchiveTrashMark size={12} className="shrink-0" />
                        في سلة المهملات
                    </span>
                    <span className="inline-flex rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-300">
                        حذف تلقائي خلال {trashDaysRemaining ?? executionTrashDaysRemaining(loose)} يوماً
                    </span>
                </div>
            )}

            <div className="relative mb-1.5" dir="rtl">
                <div className="flex items-start justify-between gap-2">
                    <div
                        className={['min-w-0 flex-1', openSurfaceProps.className].filter(Boolean).join(' ')}
                        data-testid="execution-archive-card-open"
                        onClick={openSurfaceProps.onClick}
                        onPointerDown={openSurfaceProps.onPointerDown}
                        onPointerMove={openSurfaceProps.onPointerMove}
                        onPointerUp={openSurfaceProps.onPointerUp}
                        onPointerCancel={openSurfaceProps.onPointerCancel}
                    >
                        <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-slate-400">رقم الإضبارة</span>
                            <span
                                className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold leading-tight ${lifecycleBadgeClass}`}
                            >
                                {cardView.dossierLifecycleBadge}
                            </span>
                            {unifiedCount > 0 ? (
                                <span className="inline-flex shrink-0 items-center rounded-md border border-[#E6C673]/25 bg-[#0B1120]/55 px-1.5 py-0.5 text-[10px] font-bold text-[#E6C673]">
                                    موحّدة · {unifiedCount}
                                </span>
                            ) : null}
                        </div>
                        <p className="text-[15px] font-bold leading-tight tracking-tight text-white">
                            <BiDiText className="tabular-nums">
                                {`${cardView.fileNumber} / ${cardView.year}`}
                            </BiDiText>
                        </p>
                        {venueLabel ? (
                            <p className="mt-1 leading-snug">
                                <span className="block text-[10px] font-semibold text-slate-400">
                                    {venueLabel.prefix}
                                </span>
                                <BiDiText className="mt-0.5 block text-[12px] font-bold text-slate-50">
                                    {venueLabel.name}
                                </BiDiText>
                            </p>
                        ) : null}
                        {claimTypeLine || executionTypeLine ? (
                            <div className="mt-1 space-y-0.5">
                                {claimTypeLine ? (
                                    <p className="truncate text-[11px] text-white/55">
                                        <span className="text-white/35">نوع المطالبة · </span>
                                        <BiDiText className="font-semibold text-white/80">
                                            {claimTypeLine}
                                        </BiDiText>
                                    </p>
                                ) : null}
                                {executionTypeLine ? (
                                    <p className="truncate text-[11px] text-white/55">
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
                        className="relative z-40 inline-flex shrink-0 flex-col items-stretch gap-1"
                        onPointerDown={stopToolbarPointerEvent}
                        onMouseDown={stopToolbarPointerEvent}
                        onClick={stopToolbarPointerEvent}
                    >
                        {hasIconToolbar ? (
                            <div className="inline-flex items-center justify-end gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
                                {showTrashSelect ? (
                                    <button
                                        type="button"
                                        aria-checked={selected}
                                        role="checkbox"
                                        onClick={onToggleSelect}
                                        className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border touch-manipulation ${
                                            selected
                                                ? 'border-[#E6C673]/45 bg-[#E6C673]/14 text-[#E6C673]'
                                                : 'border-white/12 bg-white/[0.03] text-white/62'
                                        }`}
                                    >
                                        {selected ? '✓' : ''}
                                    </button>
                                ) : null}
                                {showPin ? <ExecutionArchiveCardPin item={pinPayload!} /> : null}
                                {showArchive ? (
                                    <ToolbarIconButton
                                        title="أرشفة الإضبارة"
                                        aria-label="أرشفة الإضبارة"
                                        data-testid="execution-smart-card-archive"
                                        onAction={onRequestArchive}
                                        className={outlineIconActionClassName('accent')}
                                    >
                                        <ExecutionArchiveBoxMark size={16} />
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
                                        <ExecutionArchiveTrashMark size={16} />
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
                                        <ExecutionArchiveTrashMark size={16} />
                                    </ToolbarIconButton>
                                ) : null}
                            </div>
                        ) : null}
                        <div className="flex flex-col gap-1">
                            {variant === 'trash' && onRestoreFromTrash ? (
                                <button
                                    type="button"
                                    onClick={onRestoreFromTrash}
                                    className={`${outlineTextActionClassName('success')} w-full justify-center`}
                                >
                                    <ExecutionArchiveRotateMark />
                                    استرجاع
                                </button>
                            ) : null}
                            {variant === 'archived' && onRestoreFromArchive ? (
                                <button
                                    type="button"
                                    onClick={onRestoreFromArchive}
                                    className={`${outlineTextActionClassName('success')} w-full justify-center`}
                                >
                                    <ExecutionArchiveRotateMark />
                                    إعادة للنشطة
                                </button>
                            ) : null}
                            <button
                                type="button"
                                data-testid="execution-smart-card-preview"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    warmExecutionDossierFromArchiveCard('urgent');
                                    onPreview();
                                }}
                                className={`${outlineTextActionClassName('accent')} w-full justify-center`}
                            >
                                <ExecutionArchiveEyeMark />
                                التفاصيل
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isEvictionClaim(String(cardView.snap.claimType || cardView.snap.docType || '')) && (
                <div
                    {...openSurfaceProps}
                    className="mb-1.5 space-y-0.5 rounded-lg border border-blue-500/20 bg-blue-950/20 px-2.5 py-1.5 text-right"
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
                <ExecutionArchivePartyBlock view={cardView} className="border-t border-slate-800/50 pt-1.5" />
                {cardView.relationship ? (
                    <div className="mt-1.5 flex items-center justify-end gap-2 border-t border-purple-500/20 pt-1.5">
                        <span className="text-[11px] text-purple-200">
                            الصلة: <span className="font-bold">({cardView.relationship})</span> للمدين{' '}
                            <BiDiText className="font-bold">{cardView.linkedDebtorLabel}</BiDiText>
                        </span>
                        <ExecutionArchiveLinkMark className="shrink-0 text-purple-400" />
                    </div>
                ) : null}
            </div>
        </>
    );
}
