import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
    X,
    Search,
    FileText,
    Clock,
    TrendingUp,
    Plus,
    RotateCcw,
    AlertCircle,
    Scale,
    Filter,
    History,
    Trash2,
} from 'lucide-react';
import {
    executionTrashDaysRemaining,
    isExecutionInTrash,
} from '@/app/utils/executionTrash';
import type { ArchivePortalProps, CaseFile } from '@/app/types/common';
import {
    isEvictionClaim,
} from '@/app/utils/executionModuleStrategies';
import ExecutionSmartCard from './ArchivePortal/components/ExecutionSmartCard';
import type { LooseArchiveFile, StageWithCaseMeta, ComputedSmartStatus, ArchiveEnrichedRow } from './ArchivePortal/types';
import { mergedPreviewTimelineEvents, executionTotalDemandEstimate, executionClaimBadgeArabic } from './ArchivePortal/utils';

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
}: ArchivePortalProps) => {
    
    // ========================================
    // 🆕 V46: SEARCH & FILTER FOR EXECUTION - ENHANCED
    // ========================================
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'civil' | 'sharia' | 'eviction'>('all');
    const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
    const [executionPreviewFile, setExecutionPreviewFile] = useState<LooseArchiveFile | null>(null);
    const [executionTrashView, setExecutionTrashView] = useState(false);
    const [trashConfirmTarget, setTrashConfirmTarget] = useState<LooseArchiveFile | null>(null);
    const [selectedTrashIds, setSelectedTrashIds] = useState<Set<string>>(new Set());
    const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false);
    const [permanentCountdown, setPermanentCountdown] = useState(10);
    const permanentIdsRef = useRef<Array<string | number>>([]);

    const previewTimelineEvents = useMemo(
        () => mergedPreviewTimelineEvents(executionPreviewFile),
        [executionPreviewFile]
    );

    const executionTrashedCount = useMemo(() => {
        if (type !== 'executions') return 0;
        return files.filter((f) => isExecutionInTrash(f as LooseArchiveFile)).length;
    }, [files, type]);

    useEffect(() => {
        if (!executionTrashView) setSelectedTrashIds(new Set());
    }, [executionTrashView]);

    useEffect(() => {
        if (!permanentDeleteOpen) return;
        let n = 10;
        setPermanentCountdown(n);
        const intervalId = window.setInterval(() => {
            n -= 1;
            setPermanentCountdown(n);
            if (n <= 0) {
                window.clearInterval(intervalId);
                onPermanentlyDeleteExecutions?.(permanentIdsRef.current);
                setPermanentDeleteOpen(false);
                setSelectedTrashIds(new Set());
            }
        }, 1000);
        return () => window.clearInterval(intervalId);
    }, [permanentDeleteOpen, onPermanentlyDeleteExecutions]);

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
        if (type === 'lawsuits') return 'إدارة الدعاوى القضائية (الشاملة) ⚖️';
        if (type === 'transaction') return 'سجل المعاملات';
        if (type === 'executions' && executionTrashView) return 'سلة مهملات الإضابير التنفيذية';
        if (type === 'executions') return 'مخزن الأضابير التنفيذية';
        if (type === 'deleted') return 'سلة المحذوفات';
        return 'الأرشيف الشامل';
    };

    const getIcon = () => {
        if (type === 'lawsuits') return Search;
        if (type === 'transaction') return FileText;
        if (type === 'executions') return TrendingUp;
        return Search;
    };

    const Icon = getIcon();

    // ========================================
    // 🆕 V46: FILTERED FILES FOR EXECUTION
    // ========================================
    const filteredExecutionFiles = useMemo(() => {
        if (type !== 'executions') return files;

        let filtered = files.filter((f) => {
            const inTrash = isExecutionInTrash(f as LooseArchiveFile);
            if (executionTrashView) return inTrash;
            if (!inTrash) {
                const fl = f as LooseArchiveFile;
                if ((fl as any).parentId) return false;
            }
            return !inTrash;
        });

        // Filter by type
        if (filterType !== 'all') {
            filtered = filtered.filter((f) => {
                const fl = f as LooseArchiveFile;
                const fileType = fl.claimType || fl.docType || '';
                if (filterType === 'sharia') return fileType.includes('نفقة') || fileType.includes('مهر') || fileType.includes('شرعي');
                if (filterType === 'civil') return fileType.includes('دين') || fileType.includes('مدني');
                if (filterType === 'eviction') return isEvictionClaim(fileType) || fileType.includes('إخلاء');
                return true;
            });
        }

        // Search - ENHANCED: شامل وقوي
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter((f) => {
                const fl = f as LooseArchiveFile;
                // البحث في الحقول الأساسية
                const fileNumber = (fl.fileNumber || fl.caseNo || '').toString().toLowerCase();
                const creditor = (fl.creditor || fl.clientName || '').toLowerCase();
                const debtor = (fl.debtor || fl.opponentName || '').toLowerCase();
                const claimType = (fl.claimType || fl.docType || '').toLowerCase();
                const courtRaw = fl.court;
                const court =
                    (typeof courtRaw === 'string'
                        ? courtRaw
                        : courtRaw && typeof courtRaw === 'object' && 'name' in courtRaw
                          ? String((courtRaw as { name?: string }).name ?? '')
                          : ''
                    ).toLowerCase();
                const status = (fl.status || '').toLowerCase();
                const relationship = (fl.relationship || '').toLowerCase();
                const linkedDebtor = String(fl.linkedDebtor ?? '').toLowerCase();
                
                // البحث في المبلغ (يدعم الأرقام)
                const amount = (fl.amount ?? fl.totalAmount ?? 0).toString();
                
                // البحث في أي حقل
                return fileNumber.includes(query) ||
                       creditor.includes(query) ||
                       debtor.includes(query) ||
                       claimType.includes(query) ||
                       court.includes(query) ||
                       status.includes(query) ||
                       relationship.includes(query) ||
                       linkedDebtor.includes(query) ||
                       amount.includes(query);
            });
        }

        return filtered;
    }, [files, type, filterType, searchQuery, executionTrashView]);

    // ========================================
    // SMART STATUS CALCULATION FOR EACH CASE
    // ========================================
    const enrichedFiles = useMemo((): ArchiveEnrichedRow[] => {
        const filesToEnrich = type === 'executions' ? filteredExecutionFiles : files;

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
    }, [files, filteredExecutionFiles, type]);

    const selectAllTrashedInView = useCallback(() => {
        const ids = new Set(
            filteredExecutionFiles.map((f) => String((f as LooseArchiveFile).id))
        );
        setSelectedTrashIds(ids);
    }, [filteredExecutionFiles]);

    const beginPermanentDeleteFlow = useCallback(() => {
        if (selectedTrashIds.size === 0 || !onPermanentlyDeleteExecutions) return;
        permanentIdsRef.current = Array.from(selectedTrashIds).map((k) => {
            const hit = files.find((x) => String((x as LooseArchiveFile).id) === k);
            return (hit as LooseArchiveFile | undefined)?.id ?? k;
        });
        setPermanentDeleteOpen(true);
    }, [selectedTrashIds, files, onPermanentlyDeleteExecutions]);

    return (
        <div
            className={
                embedded
                    ? 'h-full bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in duration-300 font-[\'Tajawal\']'
                    : 'fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in duration-300 font-[\'Tajawal\']'
            }
        >
            {!hideHeader && (
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#0B1021]">
                    <div className="flex items-center gap-4">
                    {type === 'executions' && (
                        <button
                            type="button"
                            onClick={() => setExecutionTrashView((v) => !v)}
                            title={executionTrashView ? 'العودة إلى مخزن الإضابير' : 'سلة المهملات'}
                            className={`relative shrink-0 w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${
                                executionTrashView
                                    ? 'border-[#E6C673]/50 bg-[#E6C673]/15 text-[#E6C673]'
                                    : 'border-white/15 bg-white/5 text-white/70 hover:border-rose-500/40 hover:text-rose-200'
                            }`}
                        >
                            <Trash2 size={22} />
                            {!executionTrashView && executionTrashedCount > 0 && (
                                <span className="absolute -top-1 -left-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center border border-[#0B1021]">
                                    {executionTrashedCount > 9 ? '9+' : executionTrashedCount}
                                </span>
                            )}
                        </button>
                    )}
                    <div>
                        <h2 className="text-2xl font-bold text-white">{getTitle()}</h2>
                        <p className="text-white/40 text-sm">
                            {enrichedFiles.length}{' '}
                            {type === 'executions' && (searchQuery || filterType !== 'all') && files.length !== enrichedFiles.length && (
                                <span>من أصل {files.length}</span>
                            )}{' '}
                            ملف • مركز القيادة الذكي
                            {type === 'executions' && executionTrashView && (
                                <span className="block mt-1 text-amber-200/80 text-[11px]">
                                    تبقى الإضابير هنا 30 يوماً ثم تُحذف تلقائياً نهائياً ما لم تُسترجع.
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all">
                    <X size={20} />
                </button>
                </div>
            )}

            {/* Top Action Bar (The "Massive Button" Zone) */}
            {!hideTopActionBar && type !== 'deleted' && !(type === 'executions' && executionTrashView) && (
                <div className="px-8 pt-6 pb-2">
                    <button 
                        onClick={onAddAction}
                        className={`w-full py-5 rounded-2xl font-bold text-lg shadow-2xl flex items-center justify-center gap-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border-2
                            ${type === 'executions' 
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-900/30 border-emerald-400/20' 
                                : 'bg-gradient-to-r from-[#E6C673] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#E6C673] text-[#0B1021] shadow-[#E6C673]/30 border-[#E6C673]/40'
                            }`}
                        style={{
                            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Plus size={28} strokeWidth={3} className="drop-shadow-lg" />
                        <span className="text-xl tracking-wide">
                            {type === 'executions' ? 'فتح إضبارة تنفيذ جديدة' : 'إضافة ملف قضائي جديد'}
                        </span>
                    </button>
                </div>
            )}

            {/* 🆕 V46: SEARCH & FILTER BAR (Execution Only) */}
            {type === 'executions' && (
                <div className="px-8 pt-4 pb-2">
                    <div className="flex items-center gap-4">
                        {/* Search Input */}
                        <div className="flex-1 relative">
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="ابحث برقم الإضبارة، اسم الدائن، أو المدين..."
                                className="
                                    w-full h-12 pr-12 pl-4 rounded-xl
                                    bg-white/5 border border-white/10
                                    text-white placeholder:text-white/40
                                    focus:outline-none focus:border-[#E6C673]/50
                                    transition-all
                                "
                            />
                        </div>

                        {/* Filter Dropdown */}
                        <div className="relative">
                            <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={18} />
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                                className="
                                    h-12 pr-12 pl-6 rounded-xl
                                    bg-white/5 border border-white/10
                                    text-white appearance-none cursor-pointer
                                    focus:outline-none focus:border-[#E6C673]/50
                                    transition-all
                                "
                            >
                                <option value="all">الكل</option>
                                <option value="civil">مدني</option>
                                <option value="sharia">شرعي</option>
                                <option value="eviction">إخلاء</option>
                            </select>
                        </div>
                    </div>
                </div>
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
                {/* 🆕 V46: CONDITIONAL RENDER - Execution Smart Cards OR Regular Cards */}
                {type === 'executions' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {enrichedFiles.map((file) => (
                            <ExecutionSmartCard
                                key={file.id}
                                file={file}
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
                                        ? () => onRestoreExecutionFromTrash((file as LooseArchiveFile).id)
                                        : undefined
                                }
                                trashDaysRemaining={executionTrashDaysRemaining(file as LooseArchiveFile)}
                                selected={selectedTrashIds.has(String((file as LooseArchiveFile).id))}
                                onToggleSelect={
                                    executionTrashView && onPermanentlyDeleteExecutions
                                        ? () => toggleTrashSelect((file as LooseArchiveFile).id)
                                        : undefined
                                }
                            />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {/* Files with Smart Status */}
                        {enrichedFiles.map((file) => {
                            const status = file.smartStatus;
                            const row = file as ArchiveEnrichedRow;
                            
                            return (
                                <motion.div
                                    key={String(file.id)}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ y: -5 }}
                                    onClick={() => onFileClick(file)}
                                    className={`h-72 bg-[#151825] rounded-3xl border ${status.borderColor} p-6 flex flex-col justify-between cursor-pointer hover:border-[#E6C673]/50 hover:shadow-2xl transition-all relative overflow-hidden group`}
                                >
                                    {/* Smart Status Badge (Top Right) */}
                                    <div className="absolute top-4 left-4 z-20">
                                        <div className={`px-3 py-1.5 ${status.bgColor} ${status.borderColor} border rounded-xl text-xs font-bold ${status.color} backdrop-blur-sm shadow-lg`}>
                                            {status.label}
                                        </div>
                                    </div>

                                    {/* Header */}
                                    <div className="flex justify-between items-start z-10 mt-12">
                                        <span className="px-3 py-1 bg-white/5 rounded-lg text-xs font-mono text-white/50 border border-white/5">
                                            {row.caseNo || row.caseNumber || 'غير محدد'}
                                        </span>
                                        {type === 'deleted' && <RotateCcw size={16} className="text-green-500" />}
                                    </div>

                                    {/* Content */}
                                    <div className="z-10">
                                        <h3 className="text-xl font-bold text-white mb-1 line-clamp-1 leading-tight">
                                            {(file as { docType?: string }).docType ?? file.title ?? String(file.type ?? 'دعوى')}
                                        </h3>
                                        <p className="text-white/40 text-sm mb-3 line-clamp-1">
                                            {'court' in file && file.court
                                                ? typeof file.court === 'string'
                                                    ? file.court
                                                    : file.court.name
                                                : 'directorate' in file
                                                  ? file.directorate
                                                  : 'غير محدد'}
                                        </p>
                                        
                                        {/* Smart Timers Display */}
                                        {status.timers && (
                                            <div className="mb-3 space-y-1.5">
                                                {status.timers.appeal !== undefined && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Clock size={12} className="text-blue-400" />
                                                        <span className={`font-bold ${status.timers.appeal <= 5 ? 'text-red-400 animate-pulse' : 'text-blue-300'}`}>
                                                            استئناف: باقي {status.timers.appeal} يوم
                                                        </span>
                                                    </div>
                                                )}
                                                {status.timers.cassation !== undefined && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Clock size={12} className="text-purple-400" />
                                                        <span className={`font-bold ${status.timers.cassation <= 5 ? 'text-red-400 animate-pulse' : 'text-purple-300'}`}>
                                                            تمييز: باقي {status.timers.cassation} يوم
                                                        </span>
                                                    </div>
                                                )}
                                                {status.timers.review !== undefined && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <AlertCircle size={12} className="text-orange-400" />
                                                        <span className={`font-bold ${status.timers.review <= 3 ? 'text-red-400 animate-pulse' : 'text-orange-300'}`}>
                                                            ⏳ باقي للمراجعة: {status.timers.review} أيام {status.timers.review <= 3 ? '(تُبطل بعدها)' : ''}
                                                        </span>
                                                    </div>
                                                )}
                                                {status.timers.finalAppeal !== undefined && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <AlertCircle size={12} className="text-red-400" />
                                                        <span className={`font-bold ${status.timers.finalAppeal <= 5 ? 'text-red-400 animate-pulse' : 'text-red-300'}`}>
                                                            🛑 باقي للطعن: {status.timers.finalAppeal} يوم
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Parties Avatars */}
                                        <div className="flex -space-x-2 space-x-reverse">
                                            {(row.parties ?? []).slice(0, 3).map((p, i: number) => (
                                                <div key={i} className="w-8 h-8 rounded-full bg-[#1A1E2E] border border-white/10 flex items-center justify-center text-[10px] text-white/70 font-bold">
                                                    {p.name ? p.name[0] : '؟'}
                                                </div>
                                            ))}
                                            {(row.parties ?? []).length > 3 && (
                                                <div className="w-8 h-8 rounded-full bg-[#E6C673] text-black flex items-center justify-center text-[10px] font-bold">
                                                    +{(row.parties ?? []).length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Background Decoration */}
                                    <Icon className="absolute -bottom-4 -left-4 text-white/5 rotate-12" size={120} strokeWidth={0.5} />
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Empty State */}
                {enrichedFiles.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-20">
                        <AlertCircle size={64} className="text-white/10 mb-4" />
                        <h3 className="text-white/40 text-2xl font-bold mb-2">
                            {searchQuery || filterType !== 'all' ? 'لا توجد نتائج' : 'لا توجد ملفات'}
                        </h3>
                        <p className="text-white/30 text-sm">
                            {searchQuery || filterType !== 'all' 
                                ? 'جرب تغيير معايير البحث أو الفلترة'
                                : type === 'executions' && executionTrashView
                                  ? 'لا توجد إضابير في السلة — أو انتهت مهلة الـ 30 يوماً وتم الحذف التلقائي.'
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
                                    <p className="text-white font-mono">
                                        {executionPreviewFile.fileNumber || executionPreviewFile.caseNo || '—'} /{' '}
                                        {executionPreviewFile.year ||
                                            executionPreviewFile.fileYear ||
                                            new Date().getFullYear()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-white/50">إجمالي المطلوب (تقدير)</p>
                                    <p className="text-[#E6C673] font-bold tabular-nums">
                                        {executionTotalDemandEstimate(executionPreviewFile) > 0
                                            ? new Intl.NumberFormat('ar-IQ').format(
                                                  Math.round(executionTotalDemandEstimate(executionPreviewFile))
                                              ) + ' ع.د'
                                            : '—'}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-white/50 text-xs mb-1">الدائن (موكلي)</p>
                                <p className="text-white font-semibold">
                                    {typeof executionPreviewFile.creditor === 'string'
                                        ? executionPreviewFile.creditor
                                        : executionPreviewFile.clientName ||
                                          executionPreviewFile.parties?.[0]?.name ||
                                          '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-white/50 text-xs mb-1">المدين</p>
                                <p className="text-white font-semibold">
                                    {typeof executionPreviewFile.debtor === 'string'
                                        ? executionPreviewFile.debtor
                                        : executionPreviewFile.opponentName ||
                                          executionPreviewFile.parties?.[1]?.name ||
                                          '—'}
                                </p>
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

            {type === 'executions' && permanentDeleteOpen && (
                <div className="fixed inset-0 z-[140] bg-black/85 flex items-center justify-center p-4">
                    <div className="bg-[#0A0F1C] border border-rose-500/35 rounded-2xl p-6 max-w-md w-full text-right shadow-2xl">
                        <h3 className="text-rose-200 font-bold text-lg mb-3 flex flex-row-reverse items-center justify-end gap-2">
                            <Trash2 size={20} />
                            حذف نهائي
                        </h3>
                        <p className="text-slate-300 text-sm leading-relaxed mb-4">
                            سيتم حذف {permanentIdsRef.current.length} إضبارة نهائياً من هذا الجهاز بعد انتهاء العد التنازلي (10
                            ثوانٍ). لا يمكن التراجع بعد اكتماله.
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
        </div>
    );
};
