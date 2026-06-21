import React from 'react';
import { motion } from 'motion/react';
import { Archive, Trash2 } from 'lucide-react';
import type { LawsuitViewMode } from '../hooks/useArchivePortalController';
import {
    ARCHIVE_SEGMENT_BTN_ACTIVE,
    ARCHIVE_SEGMENT_BTN_BASE,
    ARCHIVE_SEGMENT_BTN_INACTIVE,
    ARCHIVE_SEGMENT_SHELL,
    ARCHIVE_TOOLBAR_SECTION,
} from '../archiveToolbarStyles';

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

function LifecycleSegment({
    active,
    onClick,
    testId,
    children,
    activeClassName = ARCHIVE_SEGMENT_BTN_ACTIVE,
}: {
    active: boolean;
    onClick: () => void;
    testId?: string;
    children: React.ReactNode;
    activeClassName?: string;
}) {
    return (
        <button
            type="button"
            data-testid={testId}
            onClick={onClick}
            className={`${ARCHIVE_SEGMENT_BTN_BASE} inline-flex items-center gap-1.5 ${
                active ? activeClassName : ARCHIVE_SEGMENT_BTN_INACTIVE
            }`}
        >
            {children}
        </button>
    );
}

function CountBadge({ count, tone }: { count: number; tone: 'rose' | 'amber' }) {
    if (count <= 0) return null;
    const bg = tone === 'rose' ? 'bg-rose-600' : 'bg-amber-600';
    return (
        <span className={`min-w-[1.1rem] h-4 px-1 rounded-full ${bg} text-[10px] font-bold text-white inline-flex items-center justify-center`}>
            {count > 9 ? '9+' : count}
        </span>
    );
}

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
            {hasExecutionLifecycle ? (
                <motion.div className={`${ARCHIVE_TOOLBAR_SECTION} pb-2.5`}>
                    <div className={`${ARCHIVE_SEGMENT_SHELL} max-w-md`} role="tablist" aria-label="حالة إضابير التنفيذ">
                        <LifecycleSegment
                            active={!executionTrashView}
                            onClick={() => setExecutionTrashView(false)}
                            testId="executions-view-active"
                        >
                            الإضابير النشطة
                        </LifecycleSegment>
                        <LifecycleSegment
                            active={executionTrashView}
                            onClick={() => setExecutionTrashView(true)}
                            testId="executions-trash-toggle"
                            activeClassName="bg-rose-950/50 text-rose-100 border border-rose-500/30"
                        >
                            <Trash2 size={13} />
                            سلة المهملات
                            {!executionTrashView ? (
                                <CountBadge count={executionTrashedCountForFilter} tone="rose" />
                            ) : null}
                        </LifecycleSegment>
                    </div>
                    {executionTrashView ? (
                        <p className="mt-2 text-[11px] text-amber-200/75 leading-relaxed">
                            تبقى الإضابير هنا 30 يوماً ثم تُحذف تلقائياً نهائياً ما لم تُسترجع.
                        </p>
                    ) : null}
                </motion.div>
            ) : null}

            {hasLawsuitLifecycle ? (
                <motion.div className={ARCHIVE_TOOLBAR_SECTION}>
                    <div className={ARCHIVE_SEGMENT_SHELL} role="tablist" aria-label="حالة الإضابير">
                        <LifecycleSegment
                            active={lawsuitViewMode === 'active'}
                            onClick={() => setLawsuitViewMode('active')}
                            testId="lawsuits-view-active"
                        >
                            الإضابير النشطة
                        </LifecycleSegment>
                        <LifecycleSegment
                            active={lawsuitViewMode === 'archived'}
                            onClick={() => setLawsuitViewMode('archived')}
                            testId="lawsuits-view-archived"
                            activeClassName="bg-amber-950/45 text-amber-100 border border-amber-500/30"
                        >
                            <Archive size={13} />
                            مخزن الأرشيف
                            {lawsuitViewMode !== 'archived' ? (
                                <CountBadge count={unifiedArchivedCount} tone="amber" />
                            ) : null}
                        </LifecycleSegment>
                        <LifecycleSegment
                            active={lawsuitViewMode === 'trash'}
                            onClick={() => setLawsuitViewMode('trash')}
                            testId="lawsuits-trash-toggle"
                            activeClassName="bg-rose-950/50 text-rose-100 border border-rose-500/30"
                        >
                            <Trash2 size={13} />
                            سلة المهملات
                            {lawsuitViewMode !== 'trash' ? (
                                <CountBadge count={lawsuitTrashedCount} tone="rose" />
                            ) : null}
                        </LifecycleSegment>
                    </div>
                    {lawsuitViewMode === 'trash' ? (
                        <p className="mt-2 text-[11px] text-amber-200/75 leading-relaxed">
                            تبقى الإضابير هنا 30 يوماً ثم تُحذف تلقائياً نهائياً ما لم تُسترجع.
                        </p>
                    ) : null}
                </motion.div>
            ) : null}
        </>
    );
}
