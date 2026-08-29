import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { X } from '@/app/components/ui/icons/X';
import { FORUM_FILTER_LABELS, FORUM_SORT_FILTER_COUNT } from '../forumFilters';
import { FORUM_DROPDOWN_PANEL, FORUM_TEXT_MUTED, FORUM_TEXT_PRIMARY } from '../forumPlumTheme';
import { getForumOverlayPortalRoot } from '../forumOverlayPortal';
import { resolveForumFilterPanelPosition } from '../forumFilterPanelPosition';
import { ForumCategoryPanelSections } from './ForumCategoryPanelSections';

interface ForumCategoryPanelProps {
    selectedFilterIndex: number;
    onFilterSelect: (index: number) => void;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLButtonElement | null>;
}

export const ForumCategoryPanel = ({
    selectedFilterIndex,
    onFilterSelect,
    onClose,
    anchorRef,
}: ForumCategoryPanelProps) => {
    const activeLabel = FORUM_FILTER_LABELS[selectedFilterIndex] ?? FORUM_FILTER_LABELS[0];
    const hasTopicFilter = selectedFilterIndex >= FORUM_SORT_FILTER_COUNT;
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);

    const handleSelect = (index: number) => {
        onFilterSelect(index);
        onClose();
    };

    useLayoutEffect(() => {
        const update = () => {
            const rect = anchorRef.current?.getBoundingClientRect();
            if (!rect) return;
            setPanelPos(resolveForumFilterPanelPosition(rect));
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [anchorRef]);

    if (typeof document === 'undefined' || !panelPos) return null;

    return createPortal(
        <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className={`fixed z-[120] pointer-events-auto origin-top-right overflow-hidden ${FORUM_DROPDOWN_PANEL}`}
            style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
            role="dialog"
            aria-label="تصنيفات المنتدى"
        >
            <div className="flex items-center justify-between gap-2 border-b border-[#2A3344]/40 px-4 py-3">
                <div className="min-w-0">
                    <p className={`${FORUM_TEXT_PRIMARY} font-bold text-sm`}>تصفية ذكية</p>
                    <p className={`${FORUM_TEXT_MUTED} text-[11px] truncate mt-0.5`}>
                        {hasTopicFilter ? `التخصص: ${activeLabel}` : `الترتيب: ${activeLabel}`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="إغلاق"
                    className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-[#161E2C] text-[#9AA3B2] transition-colors hover:bg-[#1A2333] hover:text-[#E6C673] touch-manipulation"
                >
                    <X size={16} />
                </button>
            </div>
            <ForumCategoryPanelSections
                selectedFilterIndex={selectedFilterIndex}
                hasTopicFilter={hasTopicFilter}
                onSelect={handleSelect}
            />
        </motion.div>,
        getForumOverlayPortalRoot(),
    );
};
