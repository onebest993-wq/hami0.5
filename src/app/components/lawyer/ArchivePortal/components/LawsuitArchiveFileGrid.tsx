import React, { Suspense, lazy, useCallback, useMemo } from 'react';
import { isLawsuitDecryptBlocked } from '@/app/runtime/lawsuitDecryptBlockedFlag';
import { prepareLawsuitDossierChrome, prepareLawsuitDossierChromeOnce } from '@/app/runtime/lawsuitOpenContract';
import { LAWSUIT_VAULT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/lawsuitVaultTestIds';
import { LawsuitArchiveCard } from './LawsuitArchiveCard';
import { criminalCaseReferenceLite } from '../criminalArchiveReferenceLite';
import { ArchiveVirtualGrid } from './ArchiveVirtualGrid';
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
    onFileClick: (file: unknown) => void;
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

    const decryptBlocked = isLawsuitDecryptBlocked();

    const lawsuitItems = useMemo((): LawsuitVirtualItem[] => {
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
                    <Suspense fallback={null}>
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
                    <Suspense fallback={null}>
                        <LazyCriminalArchiveCard
                            record={c}
                            variant="compact"
                            onOpen={() => onOpenCriminalCase?.(String(c.id))}
                        />
                    </Suspense>
                );
            }
            const file = item.file;
            const row = file as ArchiveEnrichedRow;
            const isTx = String((row as { type?: unknown }).type ?? '') === 'transaction';
            return (
                <button
                    type="button"
                    onPointerEnter={() => prepareLawsuitDossierChromeOnce()}
                    onPointerDown={() => prepareLawsuitDossierChrome()}
                    onFocus={() => prepareLawsuitDossierChromeOnce()}
                    onClick={() => onFileClick(file)}
                    className="w-full text-right rounded-xl border border-white/10 bg-[#151825] p-2.5 hover:border-[#E6C673]/40 flex items-start gap-2.5"
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

    if (archiveHydrating && !hasLawsuitBody) {
        return (
            <div
                className="flex flex-col items-center justify-center h-full text-center py-10 px-4"
                aria-busy="true"
                data-testid="lawsuit-archive-loading"
            >
                <div
                    className="mb-4 h-10 w-10 rounded-full border-2 border-[#E6C673]/25 border-t-[#E6C673]/80 animate-spin"
                    aria-hidden
                />
                <h3 className="text-white/55 text-xl font-bold mb-1.5">جاري تجهيز الإضابير…</h3>
                <p className="text-white/35 text-sm max-w-xs leading-relaxed">
                    فكّ التشفير المحلي — لحظة واحدة
                </p>
            </div>
        );
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
                    className="grid grid-cols-1 gap-2.5"
                    resolveColumns={resolveLawsuitColumns}
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
                        {dossierSearchQuery
                            ? 'لا توجد نتائج'
                            : decryptBlocked && lawsuitViewMode === 'active'
                              ? 'الإضابير محمية بالتشفير'
                              : 'لا توجد ملفات'}
                    </h3>
                    {dossierSearchQuery ? (
                        <p className="text-white/40 text-sm">جرب تغيير معايير البحث أو الفلترة</p>
                    ) : lawsuitViewMode === 'trash' ? (
                        <p className="text-white/40 text-sm">لا توجد إضابير في السلة.</p>
                    ) : lawsuitViewMode === 'archived' ? (
                        <p className="text-white/40 text-sm">لا توجد إضابير في مخزن الأرشيف.</p>
                    ) : decryptBlocked ? (
                        <p className="text-white/40 text-sm max-w-sm leading-relaxed">
                            البيانات موجودة على الجهاز لكن مفتاح الفكّ غير متاح. أعد تسجيل الدخول أو
                            استورد نسخة العمل من الإعدادات — الإضابير لا تُمسح تلقائياً.
                        </p>
                    ) : (
                        <p className="text-white/40 text-sm">
                            السلة والأرشيف من زر الفلاتر بجانب البحث.
                        </p>
                    )}
                </div>
            ) : null}
        </>
    );
}
