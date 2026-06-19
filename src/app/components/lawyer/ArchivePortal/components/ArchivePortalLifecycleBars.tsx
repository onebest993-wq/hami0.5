import React from 'react';
import { motion } from 'motion/react';
import { Archive, Trash2 } from 'lucide-react';
import type { LawsuitViewMode } from '../hooks/useArchivePortalController';

type ArchivePortalLifecycleBarsProps = {
    hasExecutionLifecycle: boolean;
    executionTrashView: boolean;
    setExecutionTrashView: (v: boolean) => void;
    executionTrashedCountForFilter: number;
    hasLawsuitLifecycle: boolean;
    lawsuitViewMode: LawsuitViewMode;
    setLawsuitViewMode: (v: LawsuitViewMode) => void;
    unifiedArchivedCount: number;
    lawsuitTrashedCount: number;
};

export function ArchivePortalLifecycleBars({
    hasExecutionLifecycle,
    executionTrashView,
    setExecutionTrashView,
    executionTrashedCountForFilter,
    hasLawsuitLifecycle,
    lawsuitViewMode,
    setLawsuitViewMode,
    unifiedArchivedCount,
    lawsuitTrashedCount,
}: ArchivePortalLifecycleBarsProps) {
    return (
        <>
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
        </>
    );
}
