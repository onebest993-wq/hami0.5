import React, { useCallback, useMemo } from 'react';
import { AlertCircle, Clock, RotateCcw } from 'lucide-react';
import { warmLawsuitWorkspace } from '@/app/utils/lazyComponentsIntent';
import { LawsuitArchiveCard } from './LawsuitArchiveCard';
import { CriminalArchiveCard } from './CriminalArchiveCard';
import { UnifiedDossierCard, type DossierKind } from './UnifiedDossierCard';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildLawsuitWorkspacePin, buildTransactionWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import { criminalCaseReference } from '../criminalArchiveUtils';
import { ArchiveVirtualGrid } from './ArchiveVirtualGrid';
import type { LooseArchiveFile, ArchiveEnrichedRow } from '../types';
import type { ExecutionArchiveFilter } from './ExecutionArchiveToolbar';
import type { ExecutionPerspectiveFilter, ExecutionViewMode } from '../executionArchiveFilterUtils';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import type { ArchiveDossierViewMode } from './ArchiveDossierToolbar';

export type ArchivePortalFileGridProps = {
    type: 'lawsuits' | 'executions' | 'deleted' | 'execution' | 'transaction' | 'criminal' | 'all';
    enrichedFiles: ArchiveEnrichedRow[];
    searchQuery: string;
    filterType: ExecutionArchiveFilter;
    perspectiveFilter: ExecutionPerspectiveFilter;
    executionViewMode: ExecutionViewMode;
    setExecutionViewMode: (mode: ExecutionViewMode) => void;
    lawsuitFilesForCluster: unknown[];
    onFileClick: (file: unknown) => void;
    setExecutionPreviewFile: (file: LooseArchiveFile | null) => void;
    onMoveExecutionToTrash?: (id: string) => void;
    onArchiveExecution?: (id: string) => void;
    onRestoreExecutionFromTrash?: (id: string) => void;
    onRestoreArchivedExecution?: (id: string) => void;
    onPermanentlyDeleteExecutions?: (ids: string[]) => void;
    executionTrashDaysRemaining: (file: LooseArchiveFile) => number | undefined;
    selectedTrashIds: Set<string>;
    toggleTrashSelect: (id: string) => void;
    setTrashConfirmTarget: (file: LooseArchiveFile) => void;
    setArchiveConfirmTarget: (file: LooseArchiveFile) => void;
    hasLawsuitLifecycle: boolean;
    dossierViewMode: ArchiveDossierViewMode;
    showCriminalCardsInGrid: boolean;
    filteredCriminalCases: Array<Record<string, unknown> & { id?: string | number }>;
    showLawsuitCardsInGrid: boolean;
    onOpenCriminalCase?: (id: string) => void;
    lawsuitViewMode: 'active' | 'archived' | 'trash';
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
    executionFilesHydrating?: boolean;
    beginPermanentDeleteForIds?: (ids: Array<string | number>) => void;
    /** تمرير InstantShell / Chrome overflow للـ virtualizer */
    getArchiveScrollElement?: () => Element | null;
    onAddAction?: () => void;
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

export function ArchivePortalFileGrid(props: ArchivePortalFileGridProps) {
    const {
        type,
        enrichedFiles,
        searchQuery,
        filterType,
        perspectiveFilter: _perspectiveFilter,
        executionViewMode: _executionViewMode,
        setExecutionViewMode: _setExecutionViewMode,
        lawsuitFilesForCluster: _lawsuitFilesForCluster,
        onFileClick,
        setExecutionPreviewFile: _setExecutionPreviewFile,
        onMoveExecutionToTrash: _onMoveExecutionToTrash,
        onArchiveExecution: _onArchiveExecution,
        onRestoreExecutionFromTrash: _onRestoreExecutionFromTrash,
        onRestoreArchivedExecution: _onRestoreArchivedExecution,
        onPermanentlyDeleteExecutions: _onPermanentlyDeleteExecutions,
        executionTrashDaysRemaining: _executionTrashDaysRemaining,
        selectedTrashIds,
        toggleTrashSelect,
        setTrashConfirmTarget: _setTrashConfirmTarget,
        setArchiveConfirmTarget: _setArchiveConfirmTarget,
        hasLawsuitLifecycle,
        dossierViewMode,
        showCriminalCardsInGrid,
        filteredCriminalCases,
        showLawsuitCardsInGrid,
        onOpenCriminalCase,
        lawsuitViewMode,
        onMoveLawsuitToTrash,
        onArchiveLawsuit,
        onRestoreLawsuitFromTrash,
        onRestoreArchivedLawsuit,
        onPermanentlyDeleteLawsuits,
        setLawsuitTrashConfirmTarget,
        setCriminalDeleteTarget,
        onDeleteCriminalCase,
        dossierSearchQuery,
        lawsuitJurisdictionTab: _lawsuitJurisdictionTab,
        executionFilesHydrating: _executionFilesHydrating = false,
        beginPermanentDeleteForIds: _beginPermanentDeleteForIds,
        getArchiveScrollElement,
        onAddAction: _onAddAction,
    } = props;

    const lawsuitItems = useMemo((): LawsuitVirtualItem[] => {
        if (!(type === 'lawsuits' && hasLawsuitLifecycle)) return [];
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
        type,
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

    return (
        <>
            {type === 'lawsuits' && hasLawsuitLifecycle && dossierViewMode === 'compact' ? (
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
            ) : type === 'lawsuits' && hasLawsuitLifecycle ? (
                lawsuitItems.length > 0 ? (
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
                ) : null
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {enrichedFiles.map((file) => {
                        const status = file.smartStatus;
                        const row = file as ArchiveEnrichedRow;

                        const isTransactionFile =
                            (file as LooseArchiveFile).type === 'transaction';
                        const kind: DossierKind = isTransactionFile ? 'transaction' : 'civil';

                        const pinPayload =
                            type === 'lawsuits'
                                ? buildLawsuitWorkspacePin(file)
                                : type === 'execution'
                                  ? null
                                  : buildTransactionWorkspacePin(file);

                        const courtName =
                            'court' in file && file.court
                                ? typeof file.court === 'string'
                                    ? file.court
                                    : file.court.name
                                : '';
                        const directorate =
                            'directorate' in file ? String(file.directorate ?? '') : '';
                        const docType =
                            (file as { docType?: string }).docType ??
                            file.title ??
                            String(file.type ?? 'دعوى');
                        const caseNumber = row.caseNo || row.caseNumber || '';

                        const title = courtName || directorate || docType || 'دعوى';
                        const subtitle = caseNumber || (courtName ? docType : '');

                        const parties = Array.isArray(row.parties) ? row.parties : [];

                        return (
                            <UnifiedDossierCard
                                key={String(file.id)}
                                kind={kind}
                                testId={type === 'lawsuits' ? `lawsuit-file-${file.id}` : undefined}
                                statusBadge={{
                                    label: status.label,
                                    className: `${status.bgColor} ${status.borderColor} ${status.color}`,
                                }}
                                pinNode={
                                    pinPayload ? (
                                        <div
                                            onClick={(event) => event.stopPropagation()}
                                            onKeyDown={(event) => event.stopPropagation()}
                                            role="presentation"
                                        >
                                            <WorkspacePinButton item={pinPayload} />
                                        </div>
                                    ) : undefined
                                }
                                title={title}
                                subtitle={subtitle}
                                bodyExtra={
                                    <>
                                        {status.timers ? (
                                            <div className="flex flex-col gap-1 text-xs">
                                                {status.timers.appeal !== undefined ? (
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={12} className="text-blue-400" />
                                                        <span
                                                            className={`font-bold ${status.timers.appeal <= 5 ? 'text-red-400 animate-pulse' : 'text-blue-300'}`}
                                                        >
                                                            استئناف: باقي {status.timers.appeal} يوم
                                                        </span>
                                                    </div>
                                                ) : null}
                                                {status.timers.cassation !== undefined ? (
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={12} className="text-purple-400" />
                                                        <span
                                                            className={`font-bold ${status.timers.cassation <= 5 ? 'text-red-400 animate-pulse' : 'text-purple-300'}`}
                                                        >
                                                            تمييز: باقي {status.timers.cassation} يوم
                                                        </span>
                                                    </div>
                                                ) : null}
                                                {status.timers.review !== undefined ? (
                                                    <div className="flex items-center gap-2">
                                                        <AlertCircle
                                                            size={12}
                                                            className="text-orange-400"
                                                        />
                                                        <span
                                                            className={`font-bold ${status.timers.review <= 3 ? 'text-red-400 animate-pulse' : 'text-orange-300'}`}
                                                        >
                                                            ⏳ مراجعة: باقي {status.timers.review} أيام
                                                        </span>
                                                    </div>
                                                ) : null}
                                                {status.timers.finalAppeal !== undefined ? (
                                                    <div className="flex items-center gap-2">
                                                        <AlertCircle
                                                            size={12}
                                                            className="text-red-400"
                                                        />
                                                        <span
                                                            className={`font-bold ${status.timers.finalAppeal <= 5 ? 'text-red-400 animate-pulse' : 'text-red-300'}`}
                                                        >
                                                            🛑 طعن: باقي {status.timers.finalAppeal} يوم
                                                        </span>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}
                                        {parties.length > 0 ? (
                                            <div className="flex -space-x-2 space-x-reverse mt-1">
                                                {parties.slice(0, 3).map((p, i: number) => (
                                                    <div
                                                        key={i}
                                                        className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/15 flex items-center justify-center text-[10px] text-white/80 font-bold"
                                                        title={p.name}
                                                    >
                                                        {p.name ? p.name[0] : '؟'}
                                                    </div>
                                                ))}
                                                {parties.length > 3 ? (
                                                    <div className="w-7 h-7 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37] flex items-center justify-center text-[10px] font-bold">
                                                        +{parties.length - 3}
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </>
                                }
                                onOpen={() => onFileClick(file)}
                                openLabel="فتح الإضبارة"
                                footerIcons={
                                    type === 'deleted'
                                        ? [
                                              {
                                                  id: 'restore-hint',
                                                  label: 'استرجاع',
                                                  icon: <RotateCcw size={16} />,
                                                  tone: 'success',
                                                  onClick: () => onFileClick(file),
                                              },
                                          ]
                                        : []
                                }
                            />
                        );
                    })}
                </div>
            )}

            {!hasLawsuitBody && type === 'lawsuits' && hasLawsuitLifecycle ? (
                <div
                    className="flex flex-col items-center justify-center h-full text-center py-20 px-6"
                    data-testid="lawsuit-archive-empty"
                >
                    <h3 className="text-white/55 text-2xl font-bold mb-2">
                        {searchQuery || filterType !== 'all' || dossierSearchQuery
                            ? 'لا توجد نتائج'
                            : 'لا توجد ملفات'}
                    </h3>
                    {searchQuery || filterType !== 'all' || dossierSearchQuery ? (
                        <p className="text-white/40 text-sm">جرب تغيير معايير البحث أو الفلترة</p>
                    ) : lawsuitViewMode === 'trash' ? (
                        <p className="text-white/40 text-sm">لا توجد إضابير في السلة.</p>
                    ) : lawsuitViewMode === 'archived' ? (
                        <p className="text-white/40 text-sm">لا توجد إضابير في مخزن الأرشيف.</p>
                    ) : null}
                </div>
            ) : !(
                  (showCriminalCardsInGrid && filteredCriminalCases.length > 0) ||
                  (showLawsuitCardsInGrid && enrichedFiles.length > 0)
              ) && !(type === 'lawsuits' && hasLawsuitLifecycle) ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-20 px-6">
                    <h3 className="text-white/55 text-2xl font-bold mb-2">
                        {searchQuery || filterType !== 'all' || dossierSearchQuery
                            ? 'لا توجد نتائج'
                            : 'لا توجد ملفات'}
                    </h3>
                    {searchQuery || filterType !== 'all' || dossierSearchQuery ? (
                        <p className="text-white/40 text-sm">جرب تغيير معايير البحث أو الفلترة</p>
                    ) : null}
                </div>
            ) : null}
        </>
    );
}
