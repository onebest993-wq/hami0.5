import React from 'react';
import { Archive } from '@/app/components/ui/icons/Archive';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import type { LawsuitViewMode } from '../hooks/lawsuitLifecycleTypes';
import { ARCHIVE_SEGMENT_SHELL, ARCHIVE_TOOLBAR_SECTION } from '../archiveToolbarStyles';
import { CountBadge, LifecycleSegment } from './archiveLifecycleSegmentUi';

export type LawsuitArchiveLifecycleBarsProps = {
    lawsuitViewMode: LawsuitViewMode;
    setLawsuitViewMode: (v: LawsuitViewMode) => void;
    unifiedArchivedCount: number;
    lawsuitTrashedCount: number;
    showLawsuitTrashToggle?: boolean;
    selectedLawsuitCount?: number;
};

export function LawsuitArchiveLifecycleBars({
    lawsuitViewMode,
    setLawsuitViewMode,
    unifiedArchivedCount,
    lawsuitTrashedCount,
    showLawsuitTrashToggle,
}: LawsuitArchiveLifecycleBarsProps) {
    const trashToggleVisible = showLawsuitTrashToggle ?? true;

    return (
        <div className={ARCHIVE_TOOLBAR_SECTION}>
            <div className="flex w-full items-center gap-2">
                <div
                    className={`${ARCHIVE_SEGMENT_SHELL} min-w-0 flex-1`}
                    role="tablist"
                    aria-label="حالة الإضابير"
                >
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
                {trashToggleVisible ? (
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
                ) : null}
            </div>
            {lawsuitViewMode === 'trash' ? (
                <p className="mt-1.5 text-[11px] text-amber-200/75 leading-relaxed">
                    تبقى الإضابير هنا حتى تحذفها نهائياً بنفسك. يمكنك استرجاعها في أي وقت.
                </p>
            ) : null}
        </div>
    );
}
