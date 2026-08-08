import React, { useCallback, useMemo } from 'react';
import { warmLawsuitWorkspace } from '@/app/utils/lazyComponentsIntent';
import { LawsuitArchiveCard } from './LawsuitArchiveCard';
import { CriminalArchiveCard } from './CriminalArchiveCard';
import { criminalCaseReference } from '../criminalArchiveUtils';
import { ArchiveVirtualGrid } from './ArchiveVirtualGrid';
import type { LooseArchiveFile, ArchiveEnrichedRow } from '../types';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import type { ArchiveDossierViewMode } from './ArchiveDossierToolbar';

export type LawsuitArchiveFileGridProps = {
    enrichedFiles: ArchiveEnrichedRow[];
    hasLawsuitLifecycle: boolean;
    dossierViewMode: ArchiveDossierViewMode;
    showCriminalCardsInGrid: boolean;
    filteredCriminalCases: Array<Record<string, unknown> & { id?: string | number }>;
    showLawsuitCardsInGrid: boolean;
    onOpenCriminalCase?: (id: string) => void;
    lawsuitViewMode: 'active' | 'archived' | 'trash';
    onFileClick: (file: unknown) => void;
    onMoveLawsuitToTrash?: (id: string) => void;
    onArchiveLawsuit?: (id: string) => void;
    onRestoreLawsuitFromTrash?: (id: string) => void;
    onRestoreArchivedLawsuit?: (id: string) => void;
    onPermanentlyDeleteLawsuits?: (ids: string[]) => void;
    setLawsuitTrashConfirmTarget: (file: LooseArchiveFile) => void;
    setCriminalDeleteTarget: (target: { id: string; title: string }) => void;
    onDeleteCriminalCase?: (id: string) => void;
    dossierSearchQuery: string;
    lawsuitJurisdictionTab: LawsuitJurisdictionTab;
    selectedTrashIds: Set<string>;
    toggleTrashSelect: (id: string) => void;
    getArchiveScrollElement?: () => Element | null;
};

type LawsuitVirtualItem =
    | { kind: 'criminal'; id: string; record: Record<string, unknown> & { id?: string | number } }
    | { kind: 'lawsuit'; id: string; file: ArchiveEnrichedRow };

function resolveLawsuitColumns(width: number): number {
    if (width >= 1280) return 4;
    if (width >= 1024) return 3;
    if (width >= 768) return 2;
    return 1;
}

export function LawsuitArchiveFileGrid(props: LawsuitArchiveFileGridProps) {
    const {
        enrichedFiles,
        hasLawsuitLifecycle,
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
    } = props;

    const lawsuitItems = useMemo((): LawsuitVirtualItem[] => {
        if (!hasLawsuitLifecycle) return [];
        const out: LawsuitVirtualItem[] = [];
        if (showCriminalCardsInGrid) {
            for (const c of filteredCriminalCases) {
                out.push({ kind: 'criminal', id: `criminal:${String(c.id)}`, record: c });
            }
        }
        if (showLawsuitCardsInGrid) {
            for (const file of enrichedFiles) {
                out.push({ kind: 'lawsuit', id: String(file.id), file });
            }
        }
        return out;
    }, [
        hasLawsuitLifecycle,
        showCriminalCardsInGrid,
        filteredCriminalCases,
        showLawsuitCardsInGrid,
        enrichedFiles,
    ]);

    const renderLawsuitGridItem = useCallback(
        (item: LawsuitVirtualItem) => {
            if (item.kind === 'criminal') {
                const c = item.record;
                return (
                    <CriminalArchiveCard
                        record={c}
                        variant="grid"
                        onOpen={() => onOpenCriminalCase?.(String(c.id))}
                        onDelete={
                            lawsuitViewMode === 'active' && onDeleteCriminalCase
                                ? () => {
                                      const ref = criminalCaseReference(c);
                                      setCriminalDeleteTarget({
                                          id: String(c.id),
                                          title: `${ref.primary} • ${ref.secondary}`,
                                      });
                                  }
                                : undefined
                        }
                    />
                );
            }
            const file = item.file;
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
                    testIdPrefix="lawsuit-card"
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
            onDeleteCriminalCase,
            onOpenCriminalCase,
            setCriminalDeleteTarget,
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

    const renderLawsuitCompactItem = useCallback(
        (item: LawsuitVirtualItem) => {
            if (item.kind === 'criminal') {
                const c = item.record;
                return (
                    <CriminalArchiveCard
                        record={c}
                        variant="compact"
                        onOpen={() => onOpenCriminalCase?.(String(c.id))}
                    />
                );
            }
            const file = item.file;
            const row = file as ArchiveEnrichedRow;
            const isTx = row.type === 'transaction';
            return (
                <button
                    type="button"
                    onPointerEnter={() => warmLawsuitWorkspace({ includeSecondary: false })}
                    onFocus={() => warmLawsuitWorkspace({ includeSecondary: false })}
                    onClick={() => onFileClick(file)}
                    className="w-full text-right rounded-xl border border-white/10 bg-[#151825] p-3 hover:border-[#E6C673]/40 flex items-start gap-3"
                >
                    <span
                        className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            isTx
                                ? 'border-purple-500/35 bg-purple-500/10 text-purple-200'
                                : 'border-[#E6C673]/35 bg-[#E6C673]/10 text-[#E6C673]'
                        }`}
                    >
                        {isTx ? 'معاملة' : 'مدني'}
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
            );
        },
        [onOpenCriminalCase, onFileClick],
    );

    const hasLawsuitBody =
        (showCriminalCardsInGrid && filteredCriminalCases.length > 0) ||
        (showLawsuitCardsInGrid && enrichedFiles.length > 0);

    if (!hasLawsuitLifecycle) {
        return null;
    }

    return (
        <>
            {dossierViewMode === 'compact' ? (
                lawsuitItems.length > 0 ? (
                    <ArchiveVirtualGrid
                        items={lawsuitItems}
                        estimateRowSize={72}
                        getItemKey={(item) => item.id}
                        testId="lawsuit-archive-grid"
                        className="space-y-2 max-w-4xl mx-auto"
                        resolveColumns={() => 1}
                        getScrollElement={getArchiveScrollElement}
                        renderItem={renderLawsuitCompactItem}
                    />
                ) : null
            ) : lawsuitItems.length > 0 ? (
                <ArchiveVirtualGrid
                    items={lawsuitItems}
                    estimateRowSize={260}
                    getItemKey={(item) => item.id}
                    testId="lawsuit-archive-grid"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5"
                    resolveColumns={resolveLawsuitColumns}
                    getScrollElement={getArchiveScrollElement}
                    renderItem={renderLawsuitGridItem}
                />
            ) : null}

            {!hasLawsuitBody ? (
                <div
                    className="flex flex-col items-center justify-center h-full text-center py-20 px-6"
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
                    ) : null}
                </div>
            ) : null}
        </>
    );
}
