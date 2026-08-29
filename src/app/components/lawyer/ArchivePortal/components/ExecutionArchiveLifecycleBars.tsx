import React from 'react';
import { ExecutionArchiveTrashMark } from '../executionArchiveMarks';
import type { ExecutionViewMode } from '../executionArchiveFilterPresentation';
import {
    EXECUTION_ARCHIVE_LIFECYCLE_ROW,
    EXECUTION_FILTER_TAB_ACTIVE,
    EXECUTION_SEGMENT_ARCHIVED_ACTIVE,
    EXECUTION_SEGMENT_BTN_BASE,
    EXECUTION_SEGMENT_BTN_INACTIVE,
    EXECUTION_SEGMENT_SHELL,
    EXECUTION_SEGMENT_TRASH_ACTIVE,
} from '../executionArchiveVisualLite';
import { CountBadge, LifecycleSegment } from './archiveLifecycleSegmentUi';

export type ExecutionArchiveLifecycleBarsProps = {
    executionViewMode: ExecutionViewMode;
    setExecutionViewMode: (mode: ExecutionViewMode) => void;
    executionTrashedCountTotal: number;
    executionArchivedCount: number;
};

export function ExecutionArchiveLifecycleBars({
    executionViewMode,
    setExecutionViewMode,
    executionTrashedCountTotal,
    executionArchivedCount,
}: ExecutionArchiveLifecycleBarsProps) {
    return (
        <div className={EXECUTION_ARCHIVE_LIFECYCLE_ROW}>
            <div className="flex w-full items-center gap-2" data-testid="executions-lifecycle-row">
                <div
                    className={`${EXECUTION_SEGMENT_SHELL} min-w-0 flex-1`}
                    role="tablist"
                    aria-label="حالة إضابير التنفيذ"
                >
                    <LifecycleSegment
                        active={executionViewMode === 'active'}
                        onClick={() => setExecutionViewMode('active')}
                        testId="executions-view-active"
                        baseClassName={EXECUTION_SEGMENT_BTN_BASE}
                        activeClassName={EXECUTION_FILTER_TAB_ACTIVE}
                        inactiveClassName={EXECUTION_SEGMENT_BTN_INACTIVE}
                    >
                        الإضابير النشطة
                    </LifecycleSegment>
                    <LifecycleSegment
                        active={executionViewMode === 'archived'}
                        onClick={() => setExecutionViewMode('archived')}
                        testId="executions-view-archived"
                        baseClassName={EXECUTION_SEGMENT_BTN_BASE}
                        activeClassName={EXECUTION_SEGMENT_ARCHIVED_ACTIVE}
                        inactiveClassName={EXECUTION_SEGMENT_BTN_INACTIVE}
                    >
                        مخزن الأرشيف
                        {executionViewMode !== 'archived' ? (
                            <CountBadge count={executionArchivedCount} tone="amber" />
                        ) : null}
                    </LifecycleSegment>
                </div>
                <div className={`${EXECUTION_SEGMENT_SHELL} shrink-0`}>
                    <LifecycleSegment
                        active={executionViewMode === 'trash'}
                        onClick={() => setExecutionViewMode('trash')}
                        testId="executions-trash-toggle"
                        baseClassName={EXECUTION_SEGMENT_BTN_BASE}
                        activeClassName={EXECUTION_SEGMENT_TRASH_ACTIVE}
                        inactiveClassName={EXECUTION_SEGMENT_BTN_INACTIVE}
                        iconOnly
                        ariaLabel="سلة المهملات"
                    >
                        <span className="relative inline-flex items-center justify-center">
                            <ExecutionArchiveTrashMark />
                            {executionViewMode !== 'trash' && executionTrashedCountTotal > 0 ? (
                                <span className="absolute -top-1.5 -left-1.5 min-w-[1rem] h-4 px-1 rounded-full bg-rose-600 text-[10px] font-bold text-white inline-flex items-center justify-center">
                                    {executionTrashedCountTotal > 9 ? '9+' : executionTrashedCountTotal}
                                </span>
                            ) : null}
                        </span>
                    </LifecycleSegment>
                </div>
            </div>
            {executionViewMode === 'trash' ? (
                <p className="mt-2 text-[11px] text-amber-200/75 leading-relaxed">
                    تبقى الإضابير هنا 30 يوماً ثم تُحذف تلقائياً نهائياً ما لم تُسترجع.
                </p>
            ) : null}
        </div>
    );
}
