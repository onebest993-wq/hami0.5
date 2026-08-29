import React, { useMemo } from 'react';
import {
    archiveGridClassForColumnCount,
    readArchiveGridWidthGuess,
    resolveArchiveGridColumnCount,
} from '@/app/components/lawyer/ArchivePortal/archiveGridGeometry';
import { ExecutionArchiveCardPaintSlot } from '@/app/components/lawyer/ArchivePortal/components/ExecutionArchiveCardPaintSlot';
import {
    ExecutionArchiveFilterMark,
    ExecutionArchivePlusMark,
    ExecutionArchiveSearchMark,
    ExecutionArchiveTrashMark,
    ExecutionArchiveXMark,
} from '@/app/components/lawyer/ArchivePortal/executionArchiveMarks';
import {
    EXECUTION_ARCHIVE_FAB,
    EXECUTION_ARCHIVE_INSTANT_CLOSE_BTN,
    EXECUTION_ARCHIVE_INSTANT_HEADER,
    EXECUTION_ARCHIVE_INSTANT_HEADER_ROW,
    EXECUTION_ARCHIVE_INSTANT_TITLE,
    EXECUTION_ARCHIVE_LIFECYCLE_ROW,
    EXECUTION_ARCHIVE_SEARCH_DECK,
    EXECUTION_ARCHIVE_SEARCH_GLYPH_SLOT,
    EXECUTION_ARCHIVE_SEARCH_ICON_CLUSTER,
    EXECUTION_ARCHIVE_SEARCH_ICON_SLOT,
    EXECUTION_ARCHIVE_SEARCH_SHELL,
    EXECUTION_FILTER_TAB_ACTIVE,
    EXECUTION_SEGMENT_BTN_BASE,
    EXECUTION_SEGMENT_BTN_INACTIVE,
    EXECUTION_SEGMENT_SHELL,
} from '@/app/components/lawyer/ArchivePortal/executionArchiveVisualLite';
import { inertProps } from '@/app/utils/inertProps';

/**
 * توأم هندسي لإطار المخزن الحي (رأس + أشرطة + بحث + صف بطاقات + FAB).
 * بلا شريط تفاعلي ولا lucide ولا محمّل أرشيف — غطاء أول إطار وانتظار Surface.
 */
export function ExecutionArchiveInstantFrame({
    includeHeader = false,
    onClose,
    onAddAction,
}: {
    includeHeader?: boolean;
    onClose?: () => void;
    onAddAction?: () => void;
}): React.ReactElement {
    const columnCount = useMemo(
        () => resolveArchiveGridColumnCount(readArchiveGridWidthGuess(0)),
        [],
    );
    const gridClass = archiveGridClassForColumnCount(columnCount);
    const paintSlots = useMemo(
        () => Array.from({ length: columnCount }, (_, index) => index),
        [columnCount],
    );

    const body = (
        <>
            <div {...inertProps(true)}>
                <div className={EXECUTION_ARCHIVE_LIFECYCLE_ROW}>
                    <div className="flex w-full items-center gap-2" data-testid="executions-lifecycle-row">
                        <div
                            className={`${EXECUTION_SEGMENT_SHELL} min-w-0 flex-1`}
                            role="tablist"
                            aria-label="حالة إضابير التنفيذ"
                        >
                            <span
                                className={`${EXECUTION_SEGMENT_BTN_BASE} inline-flex items-center justify-center gap-1.5 ${EXECUTION_FILTER_TAB_ACTIVE}`}
                            >
                                الإضابير النشطة
                            </span>
                            <span
                                className={`${EXECUTION_SEGMENT_BTN_BASE} inline-flex items-center justify-center gap-1.5 ${EXECUTION_SEGMENT_BTN_INACTIVE}`}
                            >
                                مخزن الأرشيف
                            </span>
                        </div>
                        <div className={`${EXECUTION_SEGMENT_SHELL} shrink-0`}>
                            <span
                                className={`${EXECUTION_SEGMENT_BTN_BASE} inline-flex min-h-[44px] min-w-[44px] h-11 w-11 shrink-0 items-center justify-center px-0 ${EXECUTION_SEGMENT_BTN_INACTIVE}`}
                                aria-label="سلة المهملات"
                            >
                                <ExecutionArchiveTrashMark />
                            </span>
                        </div>
                    </div>
                </div>
                <div
                    className={EXECUTION_ARCHIVE_SEARCH_DECK}
                    dir="rtl"
                    data-testid="execution-archive-search-deck"
                >
                    <div className={EXECUTION_ARCHIVE_SEARCH_SHELL}>
                        <input
                            type="search"
                            disabled
                            readOnly
                            tabIndex={-1}
                            placeholder="ابحث برقم الإضبارة أو العنوان..."
                            className="min-w-0 flex-1 bg-transparent px-3 text-sm text-white placeholder:text-white/35 outline-none"
                            aria-hidden
                        />
                        <div className={EXECUTION_ARCHIVE_SEARCH_ICON_CLUSTER}>
                            <span
                                className={`${EXECUTION_ARCHIVE_SEARCH_ICON_SLOT} text-slate-300`}
                                aria-hidden
                            >
                                <ExecutionArchiveFilterMark />
                            </span>
                            <span className={EXECUTION_ARCHIVE_SEARCH_GLYPH_SLOT} aria-hidden>
                                <ExecutionArchiveSearchMark />
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <div
                className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 pb-[max(4.25rem,calc(3.25rem+env(safe-area-inset-bottom)))]"
                data-testid="execution-archive-instant-grid-slot"
            >
                <div className={gridClass}>
                    {paintSlots.map((slot) => (
                        <ExecutionArchiveCardPaintSlot key={slot} />
                    ))}
                </div>
            </div>
            {onAddAction ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-[max(1rem,env(safe-area-inset-left))] pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.75rem))]">
                    <div className="pointer-events-auto flex justify-start px-1">
                        <button
                            type="button"
                            data-testid="executions-add-new"
                            onClick={onAddAction}
                            title="فتح إضبارة تنفيذ جديدة"
                            aria-label="فتح إضبارة تنفيذ جديدة"
                            className={EXECUTION_ARCHIVE_FAB}
                        >
                            <ExecutionArchivePlusMark />
                            <span className="tracking-wide whitespace-nowrap">إضبارة تنفيذ جديدة</span>
                        </button>
                    </div>
                </div>
            ) : null}
        </>
    );

    if (!includeHeader) {
        return (
            <div
                className="relative flex h-full min-h-0 flex-col bg-[#0B1021] font-['Tajawal']"
                data-testid="execution-archive-instant-body"
                aria-busy="true"
                aria-label="جاري تجهيز بطاقات المخزن"
            >
                {body}
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 bg-[#0B1021] font-['Tajawal','Cairo',sans-serif] flex flex-col"
            style={{ zIndex: 220 }}
            data-testid="execution-archive-paint-cover"
            data-hami-overlay-safe="1"
            role="dialog"
            aria-modal
            aria-busy="true"
            aria-label="مخزن الأضابير التنفيذية"
        >
            <div className={EXECUTION_ARCHIVE_INSTANT_HEADER}>
                <div className={EXECUTION_ARCHIVE_INSTANT_HEADER_ROW}>
                    <h2 className={EXECUTION_ARCHIVE_INSTANT_TITLE}>
                        مخزن الأضابير التنفيذية
                    </h2>
                    {onClose ? (
                        <button
                            type="button"
                            onClick={onClose}
                            className={EXECUTION_ARCHIVE_INSTANT_CLOSE_BTN}
                            aria-label="إغلاق مخزن الأضابير التنفيذية"
                        >
                            <ExecutionArchiveXMark size={18} />
                        </button>
                    ) : null}
                </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden bg-[#0B1021]">
                <div className="relative flex h-full min-h-0 flex-col bg-[#0B1021] font-['Tajawal']">
                    {body}
                </div>
            </div>
        </div>
    );
}
