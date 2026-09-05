import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { prepareLawsuitDossierChrome, prepareLawsuitDossierChromeOnce } from '@/app/runtime/lawsuitOpenContract';
import { LAWSUIT_VAULT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/lawsuitVaultTestIds';
import { LawsuitArchiveCard } from './LawsuitArchiveCard';
import { criminalCaseReferenceLite } from '../criminalArchiveReferenceLite';
import { ArchiveVirtualGrid } from './ArchiveVirtualGrid';
import {
    archiveGridClassForColumnCount,
    readArchiveGridWidthGuess,
    resolveArchiveGridColumnCount,
} from '../archiveGridGeometry';
import { LawsuitArchiveCardPaintSlot } from './LawsuitArchiveCardPaintSlot';
import { LinkedLawsuitDossierCluster } from './LinkedLawsuitDossierCluster';
import {
    groupLinkedLawsuitArchiveFiles,
    resolveLinkedClusterInnerColumns,
    resolveLinkedDossierClusterRole,
    linkedDossierClusterRoleLabel,
    type LinkedDossierClusterRole,
} from '../groupLinkedLawsuitArchiveFiles';
import type { LooseArchiveFile, ArchiveEnrichedRow } from '../types';
import type { ArchiveDossierViewMode } from './ArchiveDossierToolbar';

const LazyCriminalArchiveCard = lazy(() =>
    import('./CriminalArchiveCard').then((m) => ({ default: m.CriminalArchiveCard })),
);

export type LawsuitArchiveFileGridProps = {
    enrichedFiles: ArchiveEnrichedRow[];
    hasLawsuitLifecycle: boolean;
    dossierViewMode: ArchiveDossierViewMode;
    showCriminalCardsInGrid: boolean;
    filteredCriminalCases: Array<Record<string, unknown> & { id?: string | number }>;
    showLawsuitCardsInGrid: boolean;
    onOpenCriminalCase?: (id: string) => void;
    lawsuitViewMode: 'active' | 'archived' | 'trash';
    onFileClick: (file: ArchiveEnrichedRow) => void;
    onMoveLawsuitToTrash?: (id: string) => void;
    onArchiveLawsuit?: (id: string) => void;
    onRestoreLawsuitFromTrash?: (id: string) => void;
    onRestoreArchivedLawsuit?: (id: string) => void;
    onPermanentlyDeleteLawsuits?: (ids: string[]) => void;
    setLawsuitTrashConfirmTarget: (file: LooseArchiveFile) => void;
    setCriminalDeleteTarget: (target: { id: string; title: string }) => void;
    onDeleteCriminalCase?: (id: string) => boolean | void;
    dossierSearchQuery: string;
    selectedTrashIds: Set<string>;
    toggleTrashSelect: (id: string) => void;
    getArchiveScrollElement?: () => Element | null;
    lawsuitFilesHydrating?: boolean;
    lawsuitSegmentHydrating?: boolean;
};

type LawsuitVirtualItem =
    | { kind: 'criminal'; id: string; record: Record<string, unknown> & { id?: string | number } }
    | { kind: 'lawsuit'; id: string; file: ArchiveEnrichedRow }
    | { kind: 'linked-cluster'; id: string; files: ArchiveEnrichedRow[] };

/** سقف هيكل التحميل — إن لم تُعلن الجاهزية تُعرض الحالة الفارغة بدل فتحات دائمة. */
const ARCHIVE_HYDRATE_SLOT_MAX_MS = 6_000;

export function LawsuitArchiveFileGrid(props: LawsuitArchiveFileGridProps) {
    const {
        enrichedFiles,
        dossierViewMode,
        showCriminalCardsInGrid,
        filteredCriminalCases,
        showLawsuitCardsInGrid,
        onOpenCriminalCase,
        lawsuitViewMode,
        onFileClick,
        onMoveLawsuitToTrash,
        onArchiveLawsuit,
        onRestoreLawsuitFromTrash,
        onRestoreArchivedLawsuit,
        onPermanentlyDeleteLawsuits,
        setLawsuitTrashConfirmTarget,
        setCriminalDeleteTarget,
        onDeleteCriminalCase,
        dossierSearchQuery,
        selectedTrashIds,
        toggleTrashSelect,
        getArchiveScrollElement,
        lawsuitFilesHydrating = false,
        lawsuitSegmentHydrating = false,
    } = props;

    const archiveHydrating = lawsuitFilesHydrating || lawsuitSegmentHydrating;
    const [hydrateSlotTimedOut, setHydrateSlotTimedOut] = useState(false);
    const [hostWidth, setHostWidth] = useState(() => readArchiveGridWidthGuess(0));
    const hostColumns = resolveArchiveGridColumnCount(hostWidth);

    const lawsuitItems = useMemo((): LawsuitVirtualItem[] => {
        const out: LawsuitVirtualItem[] = [];
        if (showCriminalCardsInGrid) {
            for (const c of filteredCriminalCases) {
                out.push({ kind: 'criminal', id: `criminal:${String(c.id)}`, record: c });
            }
        }
        if (showLawsuitCardsInGrid) {
            const grouped = groupLinkedLawsuitArchiveFiles(enrichedFiles);
            for (const unit of grouped) {
                if (unit.kind === 'single') {
                    out.push({ kind: 'lawsuit', id: unit.id, file: unit.file });
                } else {
                    out.push({ kind: 'linked-cluster', id: unit.id, files: unit.files });
                }
            }
        }
        return out;
    }, [
        showCriminalCardsInGrid,
        filteredCriminalCases,
        showLawsuitCardsInGrid,
        enrichedFiles,
    ]);

    const renderLawsuitCard = useCallback(
        (file: ArchiveEnrichedRow, clusterRole?: LinkedDossierClusterRole) => {
            const variant =
                lawsuitViewMode === 'trash'
                    ? 'trash'
                    : lawsuitViewMode === 'archived'
                      ? 'archived'
                      : 'active';
            return (
                <LawsuitArchiveCard
                    file={file}
                    variant={variant}
                    clusterRole={clusterRole}
                    testIdPrefix={LAWSUIT_VAULT_TEST_IDS.lawsuitFilePrefix}
                    onOpen={() => onFileClick(file)}
                    onMoveToTrash={
                        variant === 'active' && onMoveLawsuitToTrash
                            ? () => setLawsuitTrashConfirmTarget(file as LooseArchiveFile)
                            : undefined
                    }
                    onArchive={
                        variant === 'active' && onArchiveLawsuit
                            ? () => onArchiveLawsuit((file as LooseArchiveFile).id)
                            : undefined
                    }
                    onRestoreFromTrash={
                        variant === 'trash' && onRestoreLawsuitFromTrash
                            ? () => onRestoreLawsuitFromTrash((file as LooseArchiveFile).id)
                            : undefined
                    }
                    onRestoreFromArchive={
                        variant === 'archived' && onRestoreArchivedLawsuit
                            ? () => onRestoreArchivedLawsuit((file as LooseArchiveFile).id)
                            : undefined
                    }
                    selected={selectedTrashIds.has(String((file as LooseArchiveFile).id))}
                    onToggleSelect={
                        variant === 'trash' && onPermanentlyDeleteLawsuits
                            ? () => toggleTrashSelect((file as LooseArchiveFile).id)
                            : undefined
                    }
                />
            );
        },
        [
            lawsuitViewMode,
            onFileClick,
            onMoveLawsuitToTrash,
            setLawsuitTrashConfirmTarget,
            onArchiveLawsuit,
            onRestoreLawsuitFromTrash,
            onRestoreArchivedLawsuit,
            selectedTrashIds,
            onPermanentlyDeleteLawsuits,
            toggleTrashSelect,
        ],
    );

    const renderLawsuitGridItem = useCallback(
        (item: LawsuitVirtualItem) => {
            if (item.kind === 'criminal') {
                const c = item.record;
                return (
                    <Suspense fallback={<LawsuitArchiveCardPaintSlot />}>
                        <LazyCriminalArchiveCard
                            record={c}
                            variant="grid"
                            onOpen={() => onOpenCriminalCase?.(String(c.id))}
                            onDelete={
                                lawsuitViewMode === 'active' && onDeleteCriminalCase
                                    ? () => {
                                          const ref = criminalCaseReferenceLite(c);
                                          setCriminalDeleteTarget({
                                              id: String(c.id),
                                              title: `${ref.primary} • ${ref.secondary}`,
                                          });
                                      }
                                    : undefined
                            }
                        />
                    </Suspense>
                );
            }
            if (item.kind === 'linked-cluster') {
                return (
                    <LinkedLawsuitDossierCluster
                        memberCount={item.files.length}
                        hostColumnCount={hostColumns}
                    >
                        {item.files.map((file) => (
                            <div key={String(file.id)} className="min-w-0">
                                {renderLawsuitCard(
                                    file,
                                    resolveLinkedDossierClusterRole(file, item.files),
                                )}
                            </div>
                        ))}
                    </LinkedLawsuitDossierCluster>
                );
            }
            return renderLawsuitCard(item.file);
        },
        [
            lawsuitViewMode,
            onDeleteCriminalCase,
            onOpenCriminalCase,
            setCriminalDeleteTarget,
            renderLawsuitCard,
            hostColumns,
        ],
    );

    const renderLawsuitCompactItem = useCallback(
        (item: LawsuitVirtualItem) => {
            if (item.kind === 'criminal') {
                const c = item.record;
                return (
                    <Suspense fallback={<LawsuitArchiveCardPaintSlot compact />}>
                        <LazyCriminalArchiveCard
                            record={c}
                            variant="compact"
                            onOpen={() => onOpenCriminalCase?.(String(c.id))}
                        />
                    </Suspense>
                );
            }

            const renderCompactRow = (
                file: ArchiveEnrichedRow,
                clusterRole?: LinkedDossierClusterRole,
            ) => {
                const row = file as ArchiveEnrichedRow;
                const isTx = String((row as { type?: unknown }).type ?? '') === 'transaction';
                const fileId = String((file as LooseArchiveFile).id);
                const canSelectTrash =
                    lawsuitViewMode === 'trash' && Boolean(onPermanentlyDeleteLawsuits);
                return (
                    <div className="flex w-full items-stretch gap-1.5 max-w-4xl mx-auto">
                        {canSelectTrash ? (
                            <button
                                type="button"
                                role="checkbox"
                                aria-checked={selectedTrashIds.has(fileId)}
                                aria-label={
                                    selectedTrashIds.has(fileId)
                                        ? 'إلغاء تحديد الإضبارة'
                                        : 'تحديد الإضبارة للحذف النهائي'
                                }
                                data-testid={`${LAWSUIT_VAULT_TEST_IDS.lawsuitFilePrefix}-${fileId}-select`}
                                onClick={() => toggleTrashSelect(fileId)}
                                className={`flex shrink-0 min-h-[44px] min-w-[44px] items-center justify-center self-center rounded-lg border touch-manipulation ${
                                    selectedTrashIds.has(fileId)
                                        ? 'border-[#E6C673]/50 bg-[#E6C673]/16 text-[#E6C673]'
                                        : 'border-white/20 bg-white/[0.05] text-white/55'
                                }`}
                            >
                                {selectedTrashIds.has(fileId) ? '✓' : (
                                    <span className="h-3.5 w-3.5 rounded-[3px] border border-current opacity-80" />
                                )}
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onPointerEnter={() => prepareLawsuitDossierChromeOnce()}
                            onPointerDown={() => prepareLawsuitDossierChrome()}
                            onFocus={() => prepareLawsuitDossierChromeOnce()}
                            onClick={() => onFileClick(file)}
                            className="min-w-0 flex-1 text-right rounded-xl border border-white/10 bg-[#151825] p-2.5 hover:border-[#E6C673]/40 flex items-start gap-2.5"
                        >
                            <span className="flex shrink-0 flex-col items-stretch gap-1">
                                <span
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                        isTx
                                            ? 'border-purple-500/35 bg-purple-500/10 text-purple-200'
                                            : 'border-[#E6C673]/35 bg-[#E6C673]/10 text-[#E6C673]'
                                    }`}
                                >
                                    {isTx ? 'معاملة' : 'مدني'}
                                </span>
                                {clusterRole ? (
                                    <span
                                        data-testid={`${LAWSUIT_VAULT_TEST_IDS.linkedDossierRole}-${fileId}`}
                                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border text-center ${
                                            clusterRole === 'base'
                                                ? 'border-[#E6C673]/45 bg-[#E6C673]/14 text-[#F3E4B8]'
                                                : clusterRole === 'independent'
                                                  ? 'border-indigo-400/40 bg-indigo-500/12 text-indigo-100'
                                                  : 'border-white/15 bg-white/[0.06] text-white/70'
                                        }`}
                                    >
                                        {linkedDossierClusterRoleLabel(clusterRole)}
                                    </span>
                                ) : null}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-[12px] font-bold text-white truncate">
                                    {row.docType ?? row.title ?? 'دعوى'}
                                </span>
                                <span className="block text-[10px] text-white/45 font-mono mt-0.5">
                                    {row.caseNo || row.caseNumber || '—'}
                                    {'court' in row && row.court
                                        ? ` · ${typeof row.court === 'string' ? row.court : row.court.name}`
                                        : ''}
                                </span>
                            </span>
                            <span className="text-[10px] text-white/40 shrink-0">
                                {file.smartStatus.label}
                            </span>
                        </button>
                    </div>
                );
            };

            if (item.kind === 'linked-cluster') {
                return (
                    <LinkedLawsuitDossierCluster memberCount={item.files.length} hostColumnCount={1}>
                        <div className="space-y-2">
                            {item.files.map((file) => (
                                <div key={String(file.id)}>
                                    {renderCompactRow(
                                        file,
                                        resolveLinkedDossierClusterRole(file, item.files),
                                    )}
                                </div>
                            ))}
                        </div>
                    </LinkedLawsuitDossierCluster>
                );
            }
            return renderCompactRow(item.file);
        },
        [onOpenCriminalCase, onFileClick, lawsuitViewMode, onPermanentlyDeleteLawsuits, selectedTrashIds, toggleTrashSelect],
    );

    const hasLawsuitBody =
        (showCriminalCardsInGrid && filteredCriminalCases.length > 0) ||
        (showLawsuitCardsInGrid && enrichedFiles.length > 0);

    useEffect(() => {
        if (!archiveHydrating || hasLawsuitBody) {
            setHydrateSlotTimedOut(false);
            return;
        }
        const id = window.setTimeout(() => setHydrateSlotTimedOut(true), ARCHIVE_HYDRATE_SLOT_MAX_MS);
        return () => window.clearTimeout(id);
    }, [archiveHydrating, hasLawsuitBody]);

    const isFullWidthItem = useCallback(
        (item: LawsuitVirtualItem) => item.kind === 'linked-cluster',
        [],
    );

    const estimateFullWidthRowSize = useCallback(
        (item: LawsuitVirtualItem) => {
            if (item.kind !== 'linked-cluster') return 260;
            const cols = resolveLinkedClusterInnerColumns(item.files.length, hostColumns);
            const rows = Math.ceil(item.files.length / Math.max(1, cols));
            return 48 + rows * 260;
        },
        [hostColumns],
    );

    if (archiveHydrating && !hasLawsuitBody && !hydrateSlotTimedOut) {
        if (dossierViewMode === 'compact') {
            return (
                <div
                    className="space-y-2 max-w-4xl mx-auto"
                    aria-busy="true"
                    aria-label="الإضابير"
                    data-testid="lawsuit-archive-loading"
                >
                    {Array.from({ length: 4 }, (_, slot) => (
                        <LawsuitArchiveCardPaintSlot key={slot} compact />
                    ))}
                </div>
            );
        }
        const hydrateColumnCount = resolveArchiveGridColumnCount(readArchiveGridWidthGuess(0));
        const hydrateGridClass = archiveGridClassForColumnCount(hydrateColumnCount);
        const slotCount = Math.max(hydrateColumnCount * 2, 2);
        return (
            <div
                className={hydrateGridClass}
                aria-busy="true"
                aria-label="الإضابير"
                data-testid="lawsuit-archive-loading"
            >
                {Array.from({ length: slotCount }, (_, slot) => (
                    <LawsuitArchiveCardPaintSlot key={slot} />
                ))}
            </div>
        );
    }

    return (
        <div
            className="w-full min-w-0"
            ref={(node) => {
                if (!node) return;
                const w = node.clientWidth;
                if (w > 0) setHostWidth((prev) => (prev === w ? prev : w));
            }}
        >
            {dossierViewMode === 'compact' ? (
                lawsuitItems.length > 0 ? (
                    <ArchiveVirtualGrid
                        items={lawsuitItems}
                        estimateRowSize={72}
                        estimateFullWidthRowSize={(item) =>
                            item.kind === 'linked-cluster' ? 36 + item.files.length * 72 : 72
                        }
                        getItemKey={(item) => item.id}
                        testId="lawsuit-archive-grid"
                        className="space-y-2 max-w-4xl mx-auto"
                        resolveColumns={() => 1}
                        isFullWidthItem={isFullWidthItem}
                        getScrollElement={getArchiveScrollElement}
                        renderItem={renderLawsuitCompactItem}
                    />
                ) : null
            ) : lawsuitItems.length > 0 ? (
                <ArchiveVirtualGrid
                    items={lawsuitItems}
                    estimateRowSize={260}
                    estimateFullWidthRowSize={estimateFullWidthRowSize}
                    getItemKey={(item) => item.id}
                    testId="lawsuit-archive-grid"
                    className="grid grid-cols-1 gap-2.5"
                    resolveColumns={resolveArchiveGridColumnCount}
                    isFullWidthItem={isFullWidthItem}
                    getScrollElement={getArchiveScrollElement}
                    renderItem={renderLawsuitGridItem}
                />
            ) : null}

            {!hasLawsuitBody ? (
                <div
                    className="flex flex-col items-center justify-center h-full text-center py-10 px-4"
                    data-testid="lawsuit-archive-empty"
                >
                    <h3 className="text-white/55 text-2xl font-bold mb-2">
                        {dossierSearchQuery ? 'لا توجد نتائج' : 'لا توجد ملفات'}
                    </h3>
                    {dossierSearchQuery ? (
                        <p className="text-white/40 text-sm">جرب تغيير معايير البحث أو الفلترة</p>
                    ) : lawsuitViewMode === 'trash' ? (
                        <p className="text-white/40 text-sm">لا توجد إضابير في السلة.</p>
                    ) : lawsuitViewMode === 'archived' ? (
                        <p className="text-white/40 text-sm">لا توجد إضابير في مخزن الأرشيف.</p>
                    ) : (
                        <p className="text-white/40 text-sm">لا توجد إضابير.</p>
                    )}
                </div>
            ) : null}
        </div>
    );
}
