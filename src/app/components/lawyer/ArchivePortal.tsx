import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
    X,
    Clock,
    Plus,
    RotateCcw,
    AlertCircle,
    Scale,
    History,
    Trash2,
    Archive,
} from 'lucide-react';
import {
    executionTrashDaysRemaining,
    isExecutionInTrash,
} from '@/app/utils/executionTrash';
import {
    isLawsuitArchived,
    isLawsuitInTrash,
} from '@/app/utils/lawsuitTrash';
import type { ArchivePortalProps, CaseFile } from '@/app/types/common';
import type { ExecutionFile } from '@/app/types/execution';
import ExecutionSmartCard from './ArchivePortal/components/ExecutionSmartCard';
import {
    ExecutionArchiveToolbar,
    type ExecutionArchiveFilter,
} from './ArchivePortal/components/ExecutionArchiveToolbar';
import {
    EXECUTION_JURISDICTION_LABELS,
    EXECUTION_PERSPECTIVE_LABELS,
    buildExecutionJurisdictionCounts,
    filterExecutionArchiveFiles,
    getExecutionArchiveBasePool,
    isLegalEntityPerspectiveAllowed,
    type ExecutionPerspectiveFilter,
} from './ArchivePortal/executionArchiveFilterUtils';
import { ExecutionArchivePartyBlock } from './ArchivePortal/components/ExecutionArchivePartyBlock';
import { LawsuitArchiveCard } from './ArchivePortal/components/LawsuitArchiveCard';
import { CriminalArchiveCard } from './ArchivePortal/components/CriminalArchiveCard';
import { UnifiedDossierCard, type DossierKind } from './ArchivePortal/components/UnifiedDossierCard';
import {
    ArchiveDossierToolbar,
    type ArchiveDossierViewMode,
} from './ArchivePortal/components/ArchiveDossierToolbar';
import {
    filterByLawsuitJurisdictionTab,
    type LawsuitJurisdictionTab,
} from '@/app/domain/lawsuit/lawsuitJurisdiction';
import { criminalCaseReference, criminalSearchHaystack } from './ArchivePortal/criminalArchiveUtils';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';
import { buildLawsuitWorkspacePin, buildTransactionWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import type { LooseArchiveFile, StageWithCaseMeta, ComputedSmartStatus, ArchiveEnrichedRow } from './ArchivePortal/types';
import {
    mergedPreviewTimelineEvents,
    executionTotalDemandEstimate,
    executionClaimBadgeArabic,
    resolveExecutionArchiveCardView,
} from './ArchivePortal/utils';

const DEFAULT_ARCHIVE_SMART_STATUS: ComputedSmartStatus = {
    type: 'active',
    label: '🟢 مستمرة',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    timers: null,
};

/** Runtime / mock fields not present on strict CaseFile | ExecutionArchiveFile. */
export type { LooseArchiveFile, StageWithCaseMeta, ComputedSmartStatus, ArchiveEnrichedRow } from './ArchivePortal/types';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ARCHIVE PORTAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const ArchivePortal = ({ 
    type, 
    files, 
    theme, 
    shapeClass, 
    onClose, 
    onFileClick, 
    onAddAction,
    embedded,
    hideHeader,
    hideTopActionBar,
    onMoveExecutionToTrash,
    onRestoreExecutionFromTrash,
    onPermanentlyDeleteExecutions,
    onMoveLawsuitToTrash,
    onRestoreLawsuitFromTrash,
    onArchiveLawsuit,
    onRestoreArchivedLawsuit,
    onPermanentlyDeleteLawsuits,
    lawsuitFilesForCluster = [],
    criminalCases = [],
    onOpenCriminalCase,
    onDeleteCriminalCase,
    initialLawsuitJurisdictionTab,
}: ArchivePortalProps) => {
    
    // ========================================
    // 🆕 V46: SEARCH & FILTER FOR EXECUTION - ENHANCED
    // ========================================
    const [dossierSearchOpen, setDossierSearchOpen] = useState(false);
    const [dossierSearchQuery, setDossierSearchQuery] = useState('');
    const [lawsuitJurisdictionTab, setLawsuitJurisdictionTab] = useState<LawsuitJurisdictionTab>(
        initialLawsuitJurisdictionTab ?? 'all',
    );
    const viewingCriminal =
        type === 'criminal' || (type === 'lawsuits' && lawsuitJurisdictionTab === 'criminal');
    const [dossierViewMode, setDossierViewMode] = useState<ArchiveDossierViewMode>('grid');

    useEffect(() => {
        if (initialLawsuitJurisdictionTab) {
            setLawsuitJurisdictionTab(initialLawsuitJurisdictionTab);
        }
    }, [initialLawsuitJurisdictionTab]);

    const [criminalDeleteTarget, setCriminalDeleteTarget] = useState<{
        id: string;
        title: string;
    } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<ExecutionArchiveFilter>('all');
    const [perspectiveFilter, setPerspectiveFilter] = useState<ExecutionPerspectiveFilter>('all');
    const [executionPreviewFile, setExecutionPreviewFile] = useState<LooseArchiveFile | null>(null);
    const [executionTrashView, setExecutionTrashView] = useState(false);
    type LawsuitViewMode = 'active' | 'trash' | 'archived';
    const [lawsuitViewMode, setLawsuitViewMode] = useState<LawsuitViewMode>('active');

    const [trashConfirmTarget, setTrashConfirmTarget] = useState<LooseArchiveFile | null>(null);
    const [lawsuitTrashConfirmTarget, setLawsuitTrashConfirmTarget] = useState<LooseArchiveFile | null>(null);
    const [selectedTrashIds, setSelectedTrashIds] = useState<Set<string>>(new Set());
    const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false);
    const [permanentCountdown, setPermanentCountdown] = useState(10);
    const permanentIdsRef = useRef<Array<string | number>>([]);

    const previewTimelineEvents = useMemo(
        () => mergedPreviewTimelineEvents(executionPreviewFile),
        [executionPreviewFile]
    );

    const executionActivePool = useMemo(() => {
        if (type !== 'executions') return [] as LooseArchiveFile[];
        return getExecutionArchiveBasePool(files as LooseArchiveFile[], 'active');
    }, [files, type]);

    const executionTrashPool = useMemo(() => {
        if (type !== 'executions') return [] as LooseArchiveFile[];
        return getExecutionArchiveBasePool(files as LooseArchiveFile[], 'trash');
    }, [files, type]);

    const executionActiveCountByJurisdiction = useMemo(
        () => buildExecutionJurisdictionCounts(executionActivePool),
        [executionActivePool]
    );

    const executionTrashCountByJurisdiction = useMemo(
        () => buildExecutionJurisdictionCounts(executionTrashPool),
        [executionTrashPool]
    );

    const executionTrashedCountForFilter = executionTrashCountByJurisdiction[filterType];

    const executionJurisdictionCountsForView = executionTrashView
        ? executionTrashCountByJurisdiction
        : executionActiveCountByJurisdiction;

    const lawsuitTrashedCount = useMemo(() => {
        if (type !== 'lawsuits') return 0;
        return files.filter((f) => isLawsuitInTrash(f as LooseArchiveFile)).length;
    }, [files, type]);

    const lawsuitArchivedCount = useMemo(() => {
        if (type !== 'lawsuits') return 0;
        return files.filter((f) => isLawsuitArchived(f as LooseArchiveFile)).length;
    }, [files, type]);

    const criminalArchivedCount = useMemo(() => {
        if (type !== 'lawsuits') return 0;
        return (Array.isArray(criminalCases) ? criminalCases : []).filter((raw) => {
            if (!raw || typeof raw !== 'object') return false;
            const c = raw as Record<string, unknown>;
            const mergedInto = String(c.mergedIntoCaseId ?? '').trim();
            return Boolean(c.isArchived) || Boolean(mergedInto);
        }).length;
    }, [type, criminalCases]);

    const unifiedArchivedCount = lawsuitArchivedCount + criminalArchivedCount;

    useEffect(() => {
        if (!executionTrashView) setSelectedTrashIds(new Set());
    }, [executionTrashView]);

    useEffect(() => {
        if (
            !isLegalEntityPerspectiveAllowed(filterType) &&
            perspectiveFilter === 'legal_entity'
        ) {
            setPerspectiveFilter('all');
        }
    }, [filterType, perspectiveFilter]);

    useEffect(() => {
        if (lawsuitViewMode !== 'trash') setSelectedTrashIds(new Set());
    }, [lawsuitViewMode]);

    useEffect(() => {
        if (!permanentDeleteOpen) return;
        let n = 10;
        setPermanentCountdown(n);
        const intervalId = window.setInterval(() => {
            n -= 1;
            setPermanentCountdown(n);
            if (n <= 0) {
                window.clearInterval(intervalId);
                if (type === 'lawsuits') {
                    onPermanentlyDeleteLawsuits?.(permanentIdsRef.current);
                } else {
                    onPermanentlyDeleteExecutions?.(permanentIdsRef.current);
                }
                setPermanentDeleteOpen(false);
                setSelectedTrashIds(new Set());
            }
        }, 1000);
        return () => window.clearInterval(intervalId);
    }, [permanentDeleteOpen, onPermanentlyDeleteExecutions, onPermanentlyDeleteLawsuits, type]);

    const toggleTrashSelect = useCallback((id: string | number) => {
        const k = String(id);
        setSelectedTrashIds((prev) => {
            const next = new Set(prev);
            if (next.has(k)) next.delete(k);
            else next.add(k);
            return next;
        });
    }, []);

    // ========================================
    // CRITICAL: SMART CASE DASHBOARD LOGIC
    // ========================================
    
    const getTitle = () => {
        if (type === 'lawsuits' && lawsuitViewMode === 'trash') return 'سلة مهملات الإضابير';
        if (type === 'lawsuits' && lawsuitViewMode === 'archived') return 'مخزن أرشيف الإضابير';
        if (type === 'lawsuits') return 'إدارة الدعاوى القضائية (الشاملة) ⚖️';
        if (type === 'transaction') return 'سجل المعاملات';
        if (type === 'executions' && executionTrashView) return 'سلة مهملات الإضابير التنفيذية';
        if (type === 'executions') return 'مخزن الأضابير التنفيذية';
        if (type === 'deleted') return 'سلة المحذوفات';
        return 'الأرشيف الشامل';
    };

      const filteredExecutionFiles = useMemo(() => {
        if (type !== 'executions') return files;
        return filterExecutionArchiveFiles(files as LooseArchiveFile[], {
            mode: executionTrashView ? 'trash' : 'active',
            jurisdiction: filterType,
            perspective: perspectiveFilter,
            searchQuery,
        });
    }, [files, type, filterType, perspectiveFilter, searchQuery, executionTrashView]);

    const filteredLawsuitFiles = useMemo(() => {
        if (type !== 'lawsuits') return files;
        let filtered: typeof files;
        if (lawsuitViewMode === 'trash') {
            filtered = files.filter((f) => isLawsuitInTrash(f as LooseArchiveFile));
        } else if (lawsuitViewMode === 'archived') {
            filtered = files.filter((f) => isLawsuitArchived(f as LooseArchiveFile));
        } else {
            filtered = files.filter((f) => {
                const s = (f as LooseArchiveFile).status;
                return s !== 'deleted' && s !== 'archived';
            });
        }
        // 🔒 الجزائي مصدر منفصل (criminalCases) — لا نعرض ملفات الـ files فيه إطلاقاً
        if (lawsuitViewMode === 'active' && lawsuitJurisdictionTab === 'criminal') {
            filtered = [] as typeof filtered;
        } else if (lawsuitViewMode === 'active' && lawsuitJurisdictionTab !== 'all') {
            filtered = filterByLawsuitJurisdictionTab(
                filtered as LooseArchiveFile[],
                lawsuitJurisdictionTab,
            ) as typeof filtered;
        }
        const q = dossierSearchQuery.trim().toLowerCase();
        if (q) {
            filtered = filtered.filter((f) => {
                const row = f as LooseArchiveFile;
                const parties = Array.isArray(row.parties) ? row.parties : [];
                const partyNames = parties
                    .map((p) => (p && typeof p === 'object' && 'name' in p ? String((p as { name?: string }).name) : ''))
                    .join(' ');
                const hay = [
                    row.caseNo,
                    row.caseNumber,
                    row.title,
                    row.docType,
                    row.court,
                    partyNames,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return hay.includes(q);
            });
        }
        return filtered;
    }, [files, type, lawsuitViewMode, lawsuitJurisdictionTab, dossierSearchQuery]);

    const filteredCriminalCases = useMemo(() => {
        if (type !== 'lawsuits') return [];
        // ✅ في "الكل" أو "جزائي" — نعرض القضايا الجزائية؛ في "مدني"/"شخصية" — لا
        if (
            lawsuitViewMode === 'active' &&
            lawsuitJurisdictionTab !== 'criminal' &&
            lawsuitJurisdictionTab !== 'all'
        ) {
            return [];
        }
        if (lawsuitViewMode === 'trash') return [];

        let list = (Array.isArray(criminalCases) ? criminalCases : []).filter((raw) => {
            if (!raw || typeof raw !== 'object') return false;
            const c = raw as Record<string, unknown>;
            const mergedInto = String(c.mergedIntoCaseId ?? '').trim();
            const archived = Boolean(c.isArchived) || Boolean(mergedInto);
            if (lawsuitViewMode === 'archived') return archived;
            return !archived;
        }) as Record<string, unknown>[];
        const q = dossierSearchQuery.trim().toLowerCase();
        if (q) {
            list = list.filter((c) => criminalSearchHaystack(c).includes(q));
        }
        list.sort((a, b) => {
            const at = typeof a.createdAt === 'string' ? Date.parse(a.createdAt) : 0;
            const bt = typeof b.createdAt === 'string' ? Date.parse(b.createdAt) : 0;
            return bt - at;
        });
        return list;
    }, [type, lawsuitViewMode, lawsuitJurisdictionTab, criminalCases, dossierSearchQuery]);

    const isUnifiedLifecycleView = type === 'lawsuits' && lawsuitViewMode !== 'active';
    // ✅ في تبويب "الكل": نعرض كلاً من ملفات القضاء (مدني/شخصي) + القضايا الجزائية.
    // - مدني/شخصي → ملفات القضاء فقط.
    // - جزائي → القضايا الجزائية فقط.
    const showLawsuitCardsInGrid =
        type === 'lawsuits' && (isUnifiedLifecycleView || !viewingCriminal);
    const showCriminalCardsInGrid =
        type === 'lawsuits' &&
        lawsuitViewMode !== 'trash' &&
        (isUnifiedLifecycleView ||
            viewingCriminal ||
            (lawsuitViewMode === 'active' && lawsuitJurisdictionTab === 'all'));

    const showDossierToolbar = type === 'lawsuits' || type === 'criminal';

    // ========================================
    // SMART STATUS CALCULATION FOR EACH CASE
    // ========================================
    const enrichedFiles = useMemo((): ArchiveEnrichedRow[] => {
        const filesToEnrich =
            type === 'executions'
                ? filteredExecutionFiles
                : type === 'lawsuits'
                  ? filteredLawsuitFiles
                  : files;

        if (type !== 'executions') {
            return filesToEnrich.map((file): ArchiveEnrichedRow => ({
                ...(file as LooseArchiveFile),
                smartStatus: DEFAULT_ARCHIVE_SMART_STATUS,
            }));
        }
        
        return filesToEnrich.map((file): ArchiveEnrichedRow => {
            const loose = file as LooseArchiveFile;
            const caseLike = file as CaseFile & { activeStageIndex?: number };
            const stages = (caseLike.stages ?? []) as StageWithCaseMeta[];
            const activeStageIndex =
                caseLike.activeStageIndex !== undefined ? caseLike.activeStageIndex : Math.max(0, stages.length - 1);
            const currentStage = stages[activeStageIndex];

            // Default values
            let smartStatus: ComputedSmartStatus = {
                type: 'active', // active | waiting_appeal | review | annulled | final_close
                label: '🟢 مستمرة',
                color: 'text-green-400',
                bgColor: 'bg-green-500/10',
                borderColor: 'border-green-500/30',
                timers: null
            };

            // Check if stage has legal timers
            if (currentStage?.status === 'completed') {
                const decision = currentStage.finalDecision;
                const timers = currentStage.legalTimers;

                // Calculate remaining days
                const calcDaysRemaining = (deadline: string) => {
                    const today = new Date();
                    const target = new Date(deadline);
                    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return diff > 0 ? diff : 0;
                };

                // محسومة لصالح الموكل - بانتظار الطعن
                if (decision?.includes('بانتظار الطعن')) {
                    const appealDays = timers?.appealDeadline ? calcDaysRemaining(timers.appealDeadline) : 0;
                    const cassationDays = timers?.cassationDeadline ? calcDaysRemaining(timers.cassationDeadline) : 0;
                    
                    smartStatus = {
                        type: 'waiting_appeal',
                        label: '⏳ بانتظار طعن الخصم',
                        color: 'text-blue-400',
                        bgColor: 'bg-blue-500/10',
                        borderColor: 'border-blue-500/30',
                        timers: {
                            appeal: appealDays,
                            cassation: cassationDays
                        }
                    };
                }
                // متروكة للمراجعة
                else if (decision === 'متروكة للمراجعة') {
                    const reviewDays = timers?.reviewDeadline ? calcDaysRemaining(timers.reviewDeadline) : 0;
                    
                    // Auto-convert to annulled if expired
                    if (reviewDays <= 0) {
                        smartStatus = {
                            type: 'annulled',
                            label: '⚫ مبطلة (انتهت مدة المراجعة)',
                            color: 'text-gray-400',
                            bgColor: 'bg-gray-500/10',
                            borderColor: 'border-gray-500/30',
                            timers: null
                        };
                    } else {
                        smartStatus = {
                            type: 'review',
                            label: '🔄 متروكة للمراجعة',
                            color: 'text-orange-400',
                            bgColor: 'bg-orange-500/10',
                            borderColor: 'border-orange-500/30',
                            timers: {
                                review: reviewDays
                            }
                        };
                    }
                }
                // مبطلة
                else if (decision === 'مبطلة') {
                    smartStatus = {
                        type: 'annulled',
                        label: '⚫ مبطلة',
                        color: 'text-gray-400',
                        bgColor: 'bg-gray-500/10',
                        borderColor: 'border-gray-500/30',
                        timers: null
                    };
                }
                // منتهية نهائياً (30 يوم للطعن)
                else if (decision?.includes('منتهية نهائياً')) {
                    const finalDays = timers?.finalAppealDeadline ? calcDaysRemaining(timers.finalAppealDeadline) : 0;
                    
                    smartStatus = {
                        type: 'final_close',
                        label: '🛑 منتهية (قيد الإغلاق)',
                        color: 'text-red-400',
                        bgColor: 'bg-red-500/10',
                        borderColor: 'border-red-500/30',
                        timers: {
                            finalAppeal: finalDays
                        }
                    };
                }
            }

            if (type === 'executions') {
                const baseId = String((loose as any)?.id || '').trim();
                const unified = baseId
                    ? (files as any[]).filter(
                          (x: any) =>
                              String(x?.parentId || '').trim() === baseId &&
                              !isExecutionInTrash(x as LooseArchiveFile)
                      )
                    : [];
                const baseDemand = executionTotalDemandEstimate(loose);
                const unifiedDemand = unified.reduce((acc, cur) => acc + executionTotalDemandEstimate(cur as any), 0);
                return {
                    ...loose,
                    smartStatus,
                    unifiedCount: unified.length,
                    unifiedTotalDemand: unified.length > 0 ? baseDemand + unifiedDemand : undefined,
                };
            }

            return {
                ...loose,
                smartStatus,
            };
        });
    }, [files, filteredExecutionFiles, filteredLawsuitFiles, type]);

    const trashedFilesInView = type === 'lawsuits' ? filteredLawsuitFiles : filteredExecutionFiles;

    const selectAllTrashedInView = useCallback(() => {
        const ids = new Set(trashedFilesInView.map((f) => String((f as LooseArchiveFile).id)));
        setSelectedTrashIds(ids);
    }, [trashedFilesInView]);

    const beginPermanentDeleteFlow = useCallback(() => {
        if (selectedTrashIds.size === 0) return;
        if (type === 'lawsuits' && !onPermanentlyDeleteLawsuits) return;
        if (type !== 'lawsuits' && !onPermanentlyDeleteExecutions) return;
        permanentIdsRef.current = Array.from(selectedTrashIds).map((k) => {
            const hit = files.find((x) => String((x as LooseArchiveFile).id) === k);
            return (hit as LooseArchiveFile | undefined)?.id ?? k;
        });
        setPermanentDeleteOpen(true);
    }, [selectedTrashIds, files, onPermanentlyDeleteExecutions, onPermanentlyDeleteLawsuits, type]);

    const hasLawsuitLifecycle =
        type === 'lawsuits' &&
        Boolean(
            onMoveLawsuitToTrash ||
                onArchiveLawsuit ||
                onRestoreLawsuitFromTrash ||
                onPermanentlyDeleteLawsuits,
        );

    const hasExecutionLifecycle =
        type === 'executions' &&
        Boolean(onMoveExecutionToTrash || onRestoreExecutionFromTrash || onPermanentlyDeleteExecutions);

    const executionFilterSummary = useMemo(() => {
        const parts: string[] = [];
        if (filterType !== 'all') parts.push(EXECUTION_JURISDICTION_LABELS[filterType]);
        if (perspectiveFilter !== 'all') parts.push(EXECUTION_PERSPECTIVE_LABELS[perspectiveFilter]);
        return parts.join(' · ');
    }, [filterType, perspectiveFilter]);

    return (
        <div
            className={
                embedded
                    ? 'h-full bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in duration-300 font-[\'Tajawal\']'
                    : 'fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in duration-300 font-[\'Tajawal\']'
            }
        >
            {!hideHeader && (
                <div className="px-8 py-5 border-b border-white/10 flex justify-between items-center bg-[#0A0F1C]/75 backdrop-blur-xl shrink-0">
                    <div className="flex items-center gap-4 min-w-0">
                        {type === 'executions' ? (
                            <div className="shrink-0 w-12 h-12 rounded-2xl border border-[#E6C673]/35 bg-[#E6C673]/10 flex items-center justify-center text-[#E6C673]">
                                <Scale size={22} />
                            </div>
                        ) : null}
                        <div className="min-w-0">
                            <h2 className="text-2xl font-bold text-white truncate">{getTitle()}</h2>
                            <p className="text-white/40 text-sm">
                                {type === 'executions' ? (
                                    <>
                                        {executionTrashView ? (
                                            <>
                                                {enrichedFiles.length}{' '}
                                                {enrichedFiles.length === 1 ? 'إضبارة' : 'إضبارات'} في
                                                سلة المهملات
                                            </>
                                        ) : (
                                            <>
                                                {enrichedFiles.length}{' '}
                                                {enrichedFiles.length === 1 ? 'إضبارة' : 'إضبارات'}
                                                {executionFilterSummary ? (
                                                    <span className="text-[#E6C673]/80">
                                                        {' '}
                                                        · {executionFilterSummary}
                                                    </span>
                                                ) : null}
                                            </>
                                        )}
                                        {executionTrashView ? (
                                            <span className="block mt-1 text-amber-200/80 text-[11px]">
                                                تبقى الإضابير هنا 30 يوماً ثم تُحذف تلقائياً نهائياً ما لم
                                                تُسترجع.
                                            </span>
                                        ) : null}
                                    </>
                                ) : (
                                    <>
                                        {enrichedFiles.length}{' '}
                                        {(searchQuery || filterType !== 'all') &&
                                        files.length !== enrichedFiles.length ? (
                                            <span>من أصل {files.length} </span>
                                        ) : null}
                                        ملف
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}

            {/* Top Action Bar (The "Massive Button" Zone) */}
            {hasExecutionLifecycle && (
                <motion.div className="px-8 pt-4 pb-2 flex flex-wrap items-center gap-2 border-b border-white/5">
                    <button
                        type="button"
                        data-testid="executions-view-active"
                        onClick={() => setExecutionTrashView(false)}
                        className={`h-10 px-4 rounded-xl text-xs font-bold border transition-all ${
                            !executionTrashView
                                ? 'border-[#E6C673]/50 bg-[#E6C673]/15 text-[#E6C673]'
                                : 'border-white/15 bg-white/5 text-white/70 hover:text-white'
                        }`}
                    >
                        الإضابير النشطة
                    </button>
                    <button
                        type="button"
                        data-testid="executions-trash-toggle"
                        onClick={() => setExecutionTrashView(true)}
                        className={`relative h-10 px-4 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                            executionTrashView
                                ? 'border-rose-500/50 bg-rose-950/40 text-rose-100'
                                : 'border-white/15 bg-white/5 text-white/70 hover:text-rose-100'
                        }`}
                    >
                        <Trash2 size={14} />
                        سلة المهملات
                        {executionTrashedCountForFilter > 0 && !executionTrashView && (
                            <span className="min-w-[1.1rem] h-4 px-1 rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center">
                                {executionTrashedCountForFilter > 9 ? '9+' : executionTrashedCountForFilter}
                            </span>
                        )}
                    </button>
                    {executionTrashView && (
                        <p className="w-full text-[11px] text-amber-200/80 mt-1">
                            تبقى الإضابير هنا 30 يوماً ثم تُحذف تلقائياً نهائياً ما لم تُسترجع.
                        </p>
                    )}
                </motion.div>
            )}

            {hasLawsuitLifecycle && (
                <motion.div className="px-8 pt-4 pb-2 flex flex-wrap items-center gap-2 border-b border-white/5">
                    <button
                        type="button"
                        data-testid="lawsuits-view-active"
                        onClick={() => setLawsuitViewMode('active')}
                        className={`h-10 px-4 rounded-xl text-xs font-bold border transition-all ${
                            lawsuitViewMode === 'active'
                                ? 'border-[#E6C673]/50 bg-[#E6C673]/15 text-[#E6C673]'
                                : 'border-white/15 bg-white/5 text-white/70 hover:text-white'
                        }`}
                    >
                        الإضابير النشطة
                    </button>
                    <button
                        type="button"
                        data-testid="lawsuits-view-archived"
                        onClick={() => setLawsuitViewMode('archived')}
                        className={`relative h-10 px-4 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                            lawsuitViewMode === 'archived'
                                ? 'border-amber-500/50 bg-amber-950/40 text-amber-100'
                                : 'border-white/15 bg-white/5 text-white/70 hover:text-amber-100'
                        }`}
                    >
                        <Archive size={14} />
                        مخزن الأرشيف
                        {unifiedArchivedCount > 0 && lawsuitViewMode !== 'archived' && (
                            <span className="min-w-[1.1rem] h-4 px-1 rounded-full bg-amber-600 text-[10px] font-bold text-white flex items-center justify-center">
                                {unifiedArchivedCount > 9 ? '9+' : unifiedArchivedCount}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        data-testid="lawsuits-trash-toggle"
                        onClick={() => setLawsuitViewMode('trash')}
                        className={`relative h-10 px-4 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                            lawsuitViewMode === 'trash'
                                ? 'border-rose-500/50 bg-rose-950/40 text-rose-100'
                                : 'border-white/15 bg-white/5 text-white/70 hover:text-rose-100'
                        }`}
                    >
                        <Trash2 size={14} />
                        سلة المهملات
                        {lawsuitTrashedCount > 0 && lawsuitViewMode !== 'trash' && (
                            <span className="min-w-[1.1rem] h-4 px-1 rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center">
                                {lawsuitTrashedCount > 9 ? '9+' : lawsuitTrashedCount}
                            </span>
                        )}
                    </button>
                    {lawsuitViewMode === 'trash' && (
                        <p className="w-full text-[11px] text-amber-200/80 mt-1">
                            تبقى الإضابير هنا 30 يوماً ثم تُحذف تلقائياً نهائياً ما لم تُسترجع.
                        </p>
                    )}
                </motion.div>
            )}

            {showDossierToolbar ? (
                <ArchiveDossierToolbar
                    showJurisdictionTabs={type === 'lawsuits'}
                    jurisdictionTab={lawsuitJurisdictionTab}
                    onJurisdictionTabChange={setLawsuitJurisdictionTab}
                    searchOpen={dossierSearchOpen}
                    onToggleSearch={() => setDossierSearchOpen((v) => !v)}
                    searchQuery={dossierSearchQuery}
                    onSearchQueryChange={setDossierSearchQuery}
                    searchPlaceholder={
                        viewingCriminal
                            ? 'ابحث برقم الإضبارة، المشتكي، المتهم، أو المادة…'
                            : 'ابحث برقم القضية، الموكل، المحكمة…'
                    }
                    viewMode={dossierViewMode}
                    onViewModeChange={setDossierViewMode}
                />
            ) : null}

            {/* ⓘ زر "إضافة ملف قضائي جديد" تم نقله إلى FAB ثابت أسفل-يسار المنفذ — يظهر في كل التبويبات (مدني/شخصي/جزائي) ولا يأخذ مساحة من قائمة الإضابير. */}

            {type === 'executions' ? (
                <ExecutionArchiveToolbar
                    lifecycleMode={executionTrashView ? 'trash' : 'active'}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    filterType={filterType}
                    onFilterTypeChange={setFilterType}
                    perspectiveFilter={perspectiveFilter}
                    onPerspectiveFilterChange={setPerspectiveFilter}
                    jurisdictionCounts={executionJurisdictionCountsForView}
                />
            ) : null}

            {type === 'lawsuits' && lawsuitViewMode === 'trash' && enrichedFiles.length > 0 && onPermanentlyDeleteLawsuits && (
                <motion.div className="px-8 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 py-3">
                    <motion.div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={selectAllTrashedInView}
                            className="text-xs font-bold text-slate-300 border border-white/15 rounded-lg px-3 py-2 hover:bg-white/5"
                        >
                            تحديد الكل
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedTrashIds(new Set())}
                            className="text-xs font-bold text-slate-400 border border-white/10 rounded-lg px-3 py-2 hover:bg-white/5"
                        >
                            إلغاء التحديد
                        </button>
                        <span className="text-xs text-slate-500">محدد: {selectedTrashIds.size}</span>
                    </motion.div>
                    <button
                        type="button"
                        disabled={selectedTrashIds.size === 0}
                        onClick={beginPermanentDeleteFlow}
                        className="text-xs font-bold rounded-xl px-4 py-2.5 border border-rose-500/50 bg-rose-950/50 text-rose-100 hover:bg-rose-900/60 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        حذف نهائي للمحدد…
                    </button>
                </motion.div>
            )}

            {type === 'executions' && executionTrashView && enrichedFiles.length > 0 && onPermanentlyDeleteExecutions && (
                <div className="px-8 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={selectAllTrashedInView}
                            className="text-xs font-bold text-slate-300 border border-white/15 rounded-lg px-3 py-2 hover:bg-white/5"
                        >
                            تحديد الكل
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedTrashIds(new Set())}
                            className="text-xs font-bold text-slate-400 border border-white/10 rounded-lg px-3 py-2 hover:bg-white/5"
                        >
                            إلغاء التحديد
                        </button>
                        <span className="text-xs text-slate-500">
                            محدد: {selectedTrashIds.size}
                        </span>
                    </div>
                    <button
                        type="button"
                        disabled={selectedTrashIds.size === 0}
                        onClick={beginPermanentDeleteFlow}
                        className="text-xs font-bold rounded-xl px-4 py-2.5 border border-rose-500/50 bg-rose-950/50 text-rose-100 hover:bg-rose-900/60 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        حذف نهائي للمحدد…
                    </button>
                </div>
            )}

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-8">
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
            </div>

            {type === 'executions' && executionPreviewFile && (
                <div
                    className="fixed inset-0 z-[120] bg-black/85 flex items-center justify-center p-4"
                    onClick={() => setExecutionPreviewFile(null)}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#0B1120] border border-[#E6C673]/35 rounded-3xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-white/10 p-4 shrink-0">
                            <button
                                type="button"
                                onClick={() => setExecutionPreviewFile(null)}
                                className="p-2 rounded-lg hover:bg-white/10"
                            >
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
                                <p className="text-white font-bold">
                                    {executionClaimBadgeArabic(executionPreviewFile)}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <p className="text-white/50">رقم الإضبارة</p>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        <p className="text-white font-mono">
                                            {executionPreviewFile.fileNumber || executionPreviewFile.caseNo || '—'} /{' '}
                                            {executionPreviewFile.year ||
                                                executionPreviewFile.fileYear ||
                                                new Date().getFullYear()}
                                        </p>
                                        <span className="text-[10px] font-bold text-emerald-300">
                                            {resolveExecutionArchiveCardView(executionPreviewFile).dossierLifecycleBadge}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-white/50">
                                        {resolveExecutionArchiveCardView(executionPreviewFile).demandLabel}
                                    </p>
                                    <p className="text-[#E6C673] font-bold tabular-nums">
                                        {(() => {
                                            const pv = resolveExecutionArchiveCardView(executionPreviewFile);
                                            const amt =
                                                pv.remainingDemand > 0 &&
                                                pv.remainingDemand < pv.totalDemand
                                                    ? pv.remainingDemand
                                                    : pv.totalDemand;
                                            return amt > 0
                                                ? new Intl.NumberFormat('ar-IQ').format(Math.round(amt)) + ' د.ع'
                                                : '—';
                                        })()}
                                    </p>
                                </div>
                            </div>
                            <div>
                                {(() => {
                                    const pv = resolveExecutionArchiveCardView(executionPreviewFile);
                                    return (
                                        <>
                                            {pv.directorateLabel ? (
                                                <p className="mb-3 text-right text-xs">
                                                    <span className="text-white/50">مديرية التنفيذ: </span>
                                                    <span className="font-bold text-slate-100">
                                                        {pv.directorateLabel}
                                                    </span>
                                                </p>
                                            ) : null}
                                            <ExecutionArchivePartyBlock
                                                view={pv}
                                                className="mb-3 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                                            />
                                        </>
                                    );
                                })()}
                            </div>
                            {isEvictionClaim(
                                String(executionPreviewFile.claimType || executionPreviewFile.docType || '')
                            ) && (
                                <div className="rounded-xl border border-blue-500/25 bg-blue-950/20 p-3 space-y-1">
                                    <p className="text-blue-300 text-xs font-bold">بيانات العقار</p>
                                    <p className="text-slate-300 text-xs">
                                        رقم {executionPreviewFile.property_number || '—'} — مقاطعة{' '}
                                        {executionPreviewFile.district || '—'}
                                    </p>
                                    <p className="text-slate-400 text-[11px] leading-relaxed">
                                        صنف: {executionPreviewFile.property_type || '—'}
                                    </p>
                                    <p className="text-slate-400 text-[11px] leading-relaxed">
                                        {executionPreviewFile.full_address || '—'}
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
                                        previewTimelineEvents
                                            .slice(0, 25)
                                            .map((ev, idx) => (
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
                                            لا توجد أحداث في الملف المخزّن أو في ذاكرة الجلسة لهذه الإضبارة — افتح
                                            اللوحة لإكمال السجل.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-white/10 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    onFileClick(executionPreviewFile);
                                    setExecutionPreviewFile(null);
                                }}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#E6C673] to-amber-600 text-[#0B1021] font-bold text-sm"
                            >
                                فتح لوحة الإضبارة الكاملة
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {type === 'executions' && trashConfirmTarget && onMoveExecutionToTrash && (
                <div
                    className="fixed inset-0 z-[130] bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setTrashConfirmTarget(null)}
                    role="presentation"
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#0A0F1C] border border-[#E6C673]/30 rounded-2xl p-6 max-w-md w-full text-right shadow-2xl"
                    >
                        <h3 className="text-[#E6C673] font-bold text-lg mb-3">تأكيد النقل إلى سلة المهملات</h3>
                        <p className="text-slate-300 text-sm leading-relaxed mb-2">
                            سيتم نقل الإضبارة إلى سلة المهملات. تبقى هناك 30 يوماً ويمكنك استرجاعها خلالها؛ بعدها تُحذف
                            نهائياً تلقائياً من هذا الجهاز.
                        </p>
                        <p className="text-amber-200/90 text-xs mb-6">
                            رقم الإضبارة:{' '}
                            <span className="font-mono">
                                {trashConfirmTarget.fileNumber || trashConfirmTarget.caseNo || '—'}
                            </span>
                        </p>
                        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setTrashConfirmTarget(null)}
                                className="py-2.5 px-4 rounded-xl border border-white/15 text-slate-300 hover:bg-white/5"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onMoveExecutionToTrash(trashConfirmTarget.id);
                                    setTrashConfirmTarget(null);
                                }}
                                className="py-2.5 px-4 rounded-xl bg-rose-700/90 text-white font-bold hover:bg-rose-600"
                            >
                                تأكيد النقل إلى السلة
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {type === 'lawsuits' && lawsuitTrashConfirmTarget && onMoveLawsuitToTrash && (
                <motion.div
                    className="fixed inset-0 z-[130] bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setLawsuitTrashConfirmTarget(null)}
                    role="presentation"
                >
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#0A0F1C] border border-[#E6C673]/30 rounded-2xl p-6 max-w-md w-full text-right shadow-2xl"
                    >
                        <h3 className="text-[#E6C673] font-bold text-lg mb-3">تأكيد النقل إلى سلة المهملات</h3>
                        <p className="text-slate-300 text-sm leading-relaxed mb-2">
                            سيتم نقل إضبارة الدعوى إلى سلة المهملات. تبقى هناك 30 يوماً ويمكنك استرجاعها خلالها؛ بعدها
                            تُحذف نهائياً تلقائياً.
                        </p>
                        <p className="text-amber-200/90 text-xs mb-6">
                            رقم الإضبارة:{' '}
                            <span className="font-mono">
                                {lawsuitTrashConfirmTarget.caseNo || lawsuitTrashConfirmTarget.caseNumber || '—'}
                            </span>
                        </p>
                        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setLawsuitTrashConfirmTarget(null)}
                                className="py-2.5 px-4 rounded-xl border border-white/15 text-slate-300 hover:bg-white/5"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onMoveLawsuitToTrash(lawsuitTrashConfirmTarget.id);
                                    setLawsuitTrashConfirmTarget(null);
                                }}
                                className="py-2.5 px-4 rounded-xl bg-rose-700/90 text-white font-bold hover:bg-rose-600"
                            >
                                تأكيد النقل إلى السلة
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {criminalDeleteTarget && onDeleteCriminalCase ? (
                <div className="fixed inset-0 z-[130] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-[#0A0F1C] border border-rose-500/30 rounded-2xl p-6 max-w-md w-full text-right">
                        <h3 className="text-rose-200 font-bold text-lg mb-2">تأكيد حذف الإضبارة الجزائية</h3>
                        <p className="text-white/60 text-xs mb-4 truncate">{criminalDeleteTarget.title}</p>
                        <p className="text-slate-300 text-sm mb-6">
                            سيتم حذف الإضبارة وكل بياناتها المرتبطة نهائياً من هذا الجهاز.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setCriminalDeleteTarget(null)}
                                className="py-2 px-4 rounded-xl border border-white/15 text-slate-300"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onDeleteCriminalCase(criminalDeleteTarget.id);
                                    unpinWorkspaceItem(criminalDeleteTarget.id, 'criminal');
                                    setCriminalDeleteTarget(null);
                                }}
                                className="py-2 px-4 rounded-xl bg-rose-600 text-white font-bold"
                            >
                                حذف نهائي
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {(type === 'executions' || type === 'lawsuits') && permanentDeleteOpen && (
                <div className="fixed inset-0 z-[140] bg-black/85 flex items-center justify-center p-4">
                    <div className="bg-[#0A0F1C] border border-rose-500/35 rounded-2xl p-6 max-w-md w-full text-right shadow-2xl">
                        <h3 className="text-rose-200 font-bold text-lg mb-3 flex flex-row-reverse items-center justify-end gap-2">
                            <Trash2 size={20} />
                            حذف نهائي
                        </h3>
                        <p className="text-slate-300 text-sm leading-relaxed mb-4">
                            سيتم حذف {permanentIdsRef.current.length}{' '}
                            {type === 'lawsuits' ? 'إضبارة دعوى' : 'إضبارة'} نهائياً من هذا الجهاز بعد انتهاء العد
                            التنازلي (10 ثوانٍ). لا يمكن التراجع بعد اكتماله.
                        </p>
                        <p className="text-4xl font-black text-center text-rose-300 tabular-nums mb-6">
                            {permanentCountdown}
                        </p>
                        <button
                            type="button"
                            onClick={() => setPermanentDeleteOpen(false)}
                            className="w-full py-2.5 rounded-xl border border-white/20 text-slate-200 hover:bg-white/5"
                        >
                            إلغاء والاحتفاظ في السلة
                        </button>
                    </div>
                </div>
            )}

            {/* ⭐ Floating Action Button — يظهر في كل تبويبات الإضابير (مدني/شخصي/جزائي/تنفيذ) ولا يأخذ مساحة من القائمة. */}
            {!hideTopActionBar &&
                lawsuitViewMode === 'active' &&
                !(type === 'executions' && executionTrashView) &&
                (type === 'lawsuits' || type === 'executions') && (
                    <button
                        type="button"
                        data-testid={type === 'lawsuits' ? 'lawsuits-add-new' : undefined}
                        onClick={onAddAction}
                        title={
                            type === 'executions'
                                ? 'فتح إضبارة تنفيذ جديدة'
                                : lawsuitJurisdictionTab === 'criminal'
                                  ? 'إنشاء إضبارة جزائية جديدة'
                                  : 'إضافة ملف قضائي جديد'
                        }
                        aria-label={
                            type === 'executions'
                                ? 'فتح إضبارة تنفيذ جديدة'
                                : lawsuitJurisdictionTab === 'criminal'
                                  ? 'إنشاء إضبارة جزائية جديدة'
                                  : 'إضافة ملف قضائي جديد'
                        }
                        className={`absolute bottom-6 left-6 z-40 group flex items-center gap-2.5 h-14 rounded-full pl-5 pr-4 shadow-2xl border-2 font-bold transition-all duration-200 hover:scale-[1.04] active:scale-95 ${
                            lawsuitJurisdictionTab === 'criminal' && type === 'lawsuits'
                                ? 'bg-gradient-to-r from-rose-700 to-red-600 hover:from-red-600 hover:to-rose-600 text-white border-rose-400/40 shadow-rose-900/50'
                                : 'bg-gradient-to-r from-[#E6C673] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#E6C673] text-[#0B1021] border-[#E6C673]/60 shadow-[#E6C673]/30'
                        }`}
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                    >
                        <Plus size={22} strokeWidth={3} className="drop-shadow" />
                        <span className="text-sm tracking-wide whitespace-nowrap">
                            {type === 'executions'
                                ? 'إضبارة تنفيذ جديدة'
                                : lawsuitJurisdictionTab === 'criminal'
                                  ? 'إضبارة جزائية جديدة'
                                  : 'ملف قضائي جديد'}
                        </span>
                    </button>
                )}
        </div>
    );
};
