import React from 'react';
import { Archive, Trash2 } from '@/app/components/ui/lucideIcons';
import type { ExecutionViewMode } from '../executionArchiveFilterUtils';
import { ARCHIVE_SEGMENT_SHELL, ARCHIVE_TOOLBAR_SECTION } from '../archiveToolbarStyles';
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
        <div className={`${ARCHIVE_TOOLBAR_SECTION} pb-2.5`}>
            <div className="flex w-full items-center gap-2" data-testid="executions-lifecycle-row">
                <div
                    className={`${ARCHIVE_SEGMENT_SHELL} min-w-0 flex-1`}
                    role="tablist"
                    aria-label="حالة إضابير التنفيذ"
                >
                    <LifecycleSegment
                        active={executionViewMode === 'active'}
                        onClick={() => setExecutionViewMode('active')}
                        testId="executions-view-active"
                    >
                        الإضابير النشطة
                    </LifecycleSegment>
                    <LifecycleSegment
                        active={executionViewMode === 'archived'}
                        onClick={() => setExecutionViewMode('archived')}
                        testId="executions-view-archived"
                        activeClassName="bg-amber-950/45 text-amber-100 border border-amber-500/30"
                    >
                        <Archive size={13} />
                        مخزن الأرشيف
                        {executionViewMode !== 'archived' ? (
                            <CountBadge count={executionArchivedCount} tone="amber" />
                        ) : null}
                    </LifecycleSegment>
                </div>
                <div className={`${ARCHIVE_SEGMENT_SHELL} shrink-0`}>
                    <LifecycleSegment
                        active={executionViewMode === 'trash'}
                        onClick={() => setExecutionViewMode('trash')}
                        testId="executions-trash-toggle"
                        activeClassName="bg-rose-950/50 text-rose-100 border border-rose-500/30"
                        iconOnly
                        ariaLabel="سلة المهملات"
                    >
                        <span className="relative inline-flex items-center justify-center">
                            <Trash2 size={15} />
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
