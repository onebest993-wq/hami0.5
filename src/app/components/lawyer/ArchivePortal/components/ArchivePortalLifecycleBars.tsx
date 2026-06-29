import React from 'react';
import { Archive, Trash2 } from 'lucide-react';
import type { LawsuitViewMode } from '../hooks/useArchivePortalController';
import type { ExecutionViewMode } from '../executionArchiveFilterUtils';
import {
    ARCHIVE_SEGMENT_BTN_ACTIVE,
    ARCHIVE_SEGMENT_BTN_BASE,
    ARCHIVE_SEGMENT_BTN_INACTIVE,
    ARCHIVE_SEGMENT_SHELL,
    ARCHIVE_TOOLBAR_SECTION,
} from '../archiveToolbarStyles';

type ArchivePortalLifecycleBarsProps = {
    hasExecutionLifecycle: boolean;
    executionViewMode: ExecutionViewMode;
    setExecutionViewMode: (mode: ExecutionViewMode) => void;
    executionTrashedCountTotal: number;
    executionArchivedCount: number;
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
    iconOnly = false,
    ariaLabel,
}: {
    active: boolean;
    onClick: () => void;
    testId?: string;
    children: React.ReactNode;
    activeClassName?: string;
    iconOnly?: boolean;
    ariaLabel?: string;
}) {
    return (
        <button
            type="button"
            data-testid={testId}
            aria-label={ariaLabel}
            title={ariaLabel}
            onClick={onClick}
            className={`${ARCHIVE_SEGMENT_BTN_BASE} inline-flex items-center justify-center gap-1.5 ${
                iconOnly ? 'h-9 w-9 shrink-0 px-0' : ''
            } ${active ? activeClassName : ARCHIVE_SEGMENT_BTN_INACTIVE}`}
        >
            {children}
        </button>
    );
}

function CountBadge({ count, tone }: { count: number; tone: 'rose' | 'amber' }) {
    if (count <= 0) return null;
    const bg = tone === 'rose' ? 'bg-rose-600' : 'bg-amber-600';
    return (
        <span
            className={`min-w-[1.1rem] h-4 px-1 rounded-full ${bg} text-[10px] font-bold text-white inline-flex items-center justify-center`}
        >
            {count > 9 ? '9+' : count}
        </span>
    );
}

export function ArchivePortalLifecycleBars({
    hasExecutionLifecycle,
    executionViewMode,
    setExecutionViewMode,
    executionTrashedCountTotal,
    executionArchivedCount,
    hasLawsuitLifecycle,
    lawsuitViewMode,
    setLawsuitViewMode,
    unifiedArchivedCount,
    lawsuitTrashedCount,
}: ArchivePortalLifecycleBarsProps) {
    return (
        <>
            {hasExecutionLifecycle ? (
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
                                            {executionTrashedCountTotal > 9
                                                ? '9+'
                                                : executionTrashedCountTotal}
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
            ) : null}

            {hasLawsuitLifecycle ? (
                <div className={ARCHIVE_TOOLBAR_SECTION}>
                    <div className="flex w-full items-center gap-2">
                        <div className={`${ARCHIVE_SEGMENT_SHELL} min-w-0 flex-1`} role="tablist" aria-label="حالة الإضابير">
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
                        </div>
                        <div className={`${ARCHIVE_SEGMENT_SHELL} shrink-0`}>
                            <LifecycleSegment
                                active={lawsuitViewMode === 'trash'}
                                onClick={() => setLawsuitViewMode('trash')}
                                testId="lawsuits-trash-toggle"
                                activeClassName="bg-rose-950/50 text-rose-100 border border-rose-500/30"
                                iconOnly
                                ariaLabel="سلة المهملات"
                            >
                                <span className="relative inline-flex items-center justify-center">
                                    <Trash2 size={15} />
                                    {lawsuitViewMode !== 'trash' && lawsuitTrashedCount > 0 ? (
                                        <span className="absolute -top-1.5 -left-1.5 min-w-[1rem] h-4 px-1 rounded-full bg-rose-600 text-[10px] font-bold text-white inline-flex items-center justify-center">
                                            {lawsuitTrashedCount > 9 ? '9+' : lawsuitTrashedCount}
                                        </span>
                                    ) : null}
                                </span>
                            </LifecycleSegment>
                        </div>
                    </div>
                    {lawsuitViewMode === 'trash' ? (
                        <p className="mt-2 text-[11px] text-amber-200/75 leading-relaxed">
                            تبقى الإضابير هنا 30 يوماً ثم تُحذف تلقائياً نهائياً ما لم تُسترجع.
                        </p>
                    ) : null}
                </div>
            ) : null}
        </>
    );
}
