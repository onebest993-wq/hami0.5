// @ts-nocheck
import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Clock, RotateCcw } from 'lucide-react';
import ExecutionSmartCard from './ExecutionSmartCard';
import { LawsuitArchiveCard } from './LawsuitArchiveCard';
import { CriminalArchiveCard } from './CriminalArchiveCard';
import { UnifiedDossierCard, type DossierKind } from './UnifiedDossierCard';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';
import { buildLawsuitWorkspacePin, buildTransactionWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import { criminalCaseReference } from '../criminalArchiveUtils';
import type { LooseArchiveFile, ArchiveEnrichedRow } from '../types';
import type { ExecutionArchiveFilter } from './ExecutionArchiveToolbar';
import type { ExecutionPerspectiveFilter } from '../executionArchiveFilterUtils';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import type { ArchiveDossierViewMode } from './ArchiveDossierToolbar';

export type ArchivePortalFileGridProps = {
    type: 'lawsuits' | 'executions' | 'deleted' | 'execution';
    enrichedFiles: ArchiveEnrichedRow[];
    searchQuery: string;
    filterType: ExecutionArchiveFilter;
    perspectiveFilter: ExecutionPerspectiveFilter;
    executionTrashView: boolean;
    setExecutionTrashView: (v: boolean) => void;
    lawsuitFilesForCluster: unknown[];
    onFileClick: (file: unknown) => void;
    setExecutionPreviewFile: (file: LooseArchiveFile | null) => void;
    onMoveExecutionToTrash?: (id: string) => void;
    onRestoreExecutionFromTrash?: (id: string) => void;
    onPermanentlyDeleteExecutions?: (ids: string[]) => void;
    executionTrashDaysRemaining: (file: LooseArchiveFile) => number | undefined;
    selectedTrashIds: Set<string>;
    toggleTrashSelect: (id: string) => void;
    setTrashConfirmTarget: (file: LooseArchiveFile) => void;
    hasLawsuitLifecycle: boolean;
    dossierViewMode: ArchiveDossierViewMode;
    showCriminalCardsInGrid: boolean;
    filteredCriminalCases: Array<{ id: string | number } & Record<string, unknown>>;
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
};

export function ArchivePortalFileGrid(props: ArchivePortalFileGridProps) {
    const {
        type,
        enrichedFiles,
        searchQuery,
        filterType,
        perspectiveFilter,
        executionTrashView,
        setExecutionTrashView,
        lawsuitFilesForCluster,
        onFileClick,
        setExecutionPreviewFile,
        onMoveExecutionToTrash,
        onRestoreExecutionFromTrash,
        onPermanentlyDeleteExecutions,
        executionTrashDaysRemaining,
        selectedTrashIds,
        toggleTrashSelect,
        setTrashConfirmTarget,
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
        lawsuitJurisdictionTab,
    } = props;

    return (
        <>
    {type === 'executions' ? (
        enrichedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle size={56} className="mb-4 text-white/10" />
                <h3 className="mb-2 text-xl font-bold text-white/45">
                    {searchQuery.trim() ||
                    filterType !== 'all' ||
                    perspectiveFilter !== 'all'
                        ? 'لا توجد نتائج'
                        : executionTrashView
                          ? 'سلة المهملات فارغة'
                          : 'لا توجد إضابير نشطة'}
                </h3>
                <p className="max-w-sm text-sm text-white/30">
                    {searchQuery.trim() ||
                    filterType !== 'all' ||
                    perspectiveFilter !== 'all'
                        ? 'جرّب تغيير البحث أو اختر «الكل» في الفلاتر.'
                        : executionTrashView
                          ? 'لا توجد إضابير هنا — أو انتهت مهلة الـ 30 يوماً.'
                          : 'ابدأ بفتح إضبارة تنفيذ جديدة من لوحة المحامي.'}
                </p>
                {executionTrashView && !searchQuery.trim() ? (
                    <button
                        type="button"
                        data-testid="executions-empty-back-active"
                        onClick={() => setExecutionTrashView(false)}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#E6C673]/40 bg-[#E6C673]/10 px-4 py-2.5 text-xs font-bold text-[#E6C673] transition-all hover:bg-[#E6C673]/20"
                    >
                        الإضابير النشطة
                    </button>
                ) : null}
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {enrichedFiles.map((file) => (
                    <ExecutionSmartCard
                        key={file.id}
                        file={file}
                        lawsuitFilesForCluster={lawsuitFilesForCluster}
                        variant={executionTrashView ? 'trash' : 'active'}
                        onOpen={() => onFileClick(file)}
                        onPreview={() => setExecutionPreviewFile(file as LooseArchiveFile)}
                        onRequestMoveToTrash={
                            !executionTrashView && onMoveExecutionToTrash
                                ? () => setTrashConfirmTarget(file as LooseArchiveFile)
                                : undefined
                        }
                        onRestoreFromTrash={
                            executionTrashView && onRestoreExecutionFromTrash
                                ? () =>
                                      onRestoreExecutionFromTrash(
                                          (file as LooseArchiveFile).id
                                      )
                                : undefined
                        }
                        trashDaysRemaining={executionTrashDaysRemaining(
                            file as LooseArchiveFile
                        )}
                        selected={selectedTrashIds.has(
                            String((file as LooseArchiveFile).id)
                        )}
                        onToggleSelect={
                            executionTrashView && onPermanentlyDeleteExecutions
                                ? () => toggleTrashSelect((file as LooseArchiveFile).id)
                                : undefined
                        }
                    />
                ))}
            </div>
        )
    ) : type === 'lawsuits' && hasLawsuitLifecycle && dossierViewMode === 'compact' ? (
        <ul className="space-y-2 max-w-4xl mx-auto">
            {showCriminalCardsInGrid &&
                filteredCriminalCases.map((c) => (
                    <li key={`criminal:${String(c.id)}`}>
                        <CriminalArchiveCard
                            record={c}
                            variant="compact"
                            onOpen={() => onOpenCriminalCase?.(String(c.id))}
                        />
                    </li>
                ))}
            {showLawsuitCardsInGrid &&
                enrichedFiles.map((file) => {
                const row = file as ArchiveEnrichedRow;
                const isTx = row.type === 'transaction';
                return (
                    <li key={String(file.id)}>
                        <button
                            type="button"
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
                    </li>
                );
            })}
        </ul>
    ) : type === 'lawsuits' && hasLawsuitLifecycle ? (
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {showCriminalCardsInGrid &&
                filteredCriminalCases.map((c) => (
                    <CriminalArchiveCard
                        key={`criminal:${String(c.id)}`}
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
                ))}
            {showLawsuitCardsInGrid &&
                enrichedFiles.map((file) => {
                const variant =
                    lawsuitViewMode === 'trash'
                        ? 'trash'
                        : lawsuitViewMode === 'archived'
                          ? 'archived'
                          : 'active';
                return (
                    <LawsuitArchiveCard
                        key={String(file.id)}
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
            })}
        </motion.div>
    ) : (
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/*
             * بطاقات احتياطية موحَّدة (معاملات، محذوفات، دعاوى قديمة بدون دورة حياة).
             * نعتمد على UnifiedDossierCard لإبقاء التصميم الزجاجي الماسي متّسقاً عبر كلّ الأقسام.
             */}
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
        </motion.div>
    )}

    {/* Empty State — لا يُعرض لإضابير التنفيذ */}
    {type !== 'executions' &&
    !(
        (showCriminalCardsInGrid && filteredCriminalCases.length > 0) ||
        (showLawsuitCardsInGrid && enrichedFiles.length > 0)
    ) && (
        <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <AlertCircle size={64} className="text-white/10 mb-4" />
            <h3 className="text-white/40 text-2xl font-bold mb-2">
                {searchQuery || filterType !== 'all' || dossierSearchQuery
                    ? 'لا توجد نتائج'
                    : 'لا توجد ملفات'}
            </h3>
            <p className="text-white/30 text-sm">
                {searchQuery || filterType !== 'all' 
                    ? 'جرب تغيير معايير البحث أو الفلترة'
                    : type === 'executions' && executionTrashView
                      ? 'لا توجد إضابير في السلة — أو انتهت مهلة الـ 30 يوماً وتم الحذف التلقائي.'
                      : type === 'lawsuits' && lawsuitViewMode === 'trash'
                        ? 'لا توجد إضابير في السلة — أو انتهت مهلة الـ 30 يوماً وتم الحذف التلقائي.'
                        : type === 'lawsuits' && lawsuitViewMode === 'archived'
                          ? 'لا توجد إضابير في مخزن الأرشيف.'
                          : type === 'executions'
                            ? 'ابدأ بفتح إضبارة تنفيذ جديدة'
                            : 'ابدأ بإضافة ملف جديد'
                }
            </p>
        </div>
    )}
        </>
    );
}
