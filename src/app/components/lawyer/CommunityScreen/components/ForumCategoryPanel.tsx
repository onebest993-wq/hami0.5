import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
    Sparkles,
    TrendingUp,
    Gavel,
    Scale,
    Shield,
    Users,
    Building2,
    Home,
    ArrowLeftRight,
    Clock3,
    Landmark,
    CreditCard,
    ScrollText,
    X,
    type LucideIcon,
} from 'lucide-react';
import { FORUM_FILTER_LABELS, FORUM_SORT_FILTER_COUNT } from '../forumFilters';
import {
    FORUM_DROPDOWN_PANEL,
    FORUM_FILTER_CHIP_IDLE,
    FORUM_FILTER_CHIP_ICON_IDLE,
    FORUM_FILTER_CHIP_ICON_SELECTED,
    FORUM_FILTER_CHIP_SELECTED,
    FORUM_FILTER_SECTION_LABEL,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';

const TOPIC_ICONS: Record<string, LucideIcon> = {
    تنفيذ: Gavel,
    مدني: Scale,
    جنائي: Shield,
    'أحوال شخصية': Users,
    شركات: Building2,
    عقاري: Home,
    معاملات: ArrowLeftRight,
    تقاعد: Clock3,
    مصارف: Landmark,
    قروض: CreditCard,
    'كاتب العدل': ScrollText,
};

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

            const viewportPadding = 8;
            const gap = 10;
            const estimatedHeight = 420;
            const width = Math.min(352, window.innerWidth - viewportPadding * 2);
            let left = rect.right - width;
            if (left + width > window.innerWidth - viewportPadding) {
                left = window.innerWidth - width - viewportPadding;
            }
            if (left < viewportPadding) {
                left = viewportPadding;
            }

            const belowTop = rect.bottom + gap;
            const aboveTop = rect.top - estimatedHeight - gap;
            const fitsBelow = belowTop + estimatedHeight <= window.innerHeight - viewportPadding;
            const fitsAbove = aboveTop >= viewportPadding;
            const top = fitsBelow
                ? belowTop
                : fitsAbove
                  ? aboveTop
                  : Math.max(viewportPadding, window.innerHeight - estimatedHeight - viewportPadding);

            setPanelPos({ top, left, width });
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
            className={`fixed z-50 origin-top-right overflow-hidden ${FORUM_DROPDOWN_PANEL}`}
            style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
            role="dialog"
            aria-label="تصنيفات المنتدى"
        >
            <div className="flex items-center justify-between gap-2 border-b border-[#4A3D52]/40 px-4 py-3">
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
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#342C3A] text-[#9A9098] transition-colors hover:bg-[#38303E] hover:text-[#F0B896]"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="max-h-[min(68vh,420px)] space-y-4 overflow-y-auto p-4 overscroll-contain scrollbar-hide">
                <section>
                    <p className={`${FORUM_FILTER_SECTION_LABEL} mb-2`}>ترتيب العرض</p>
                    <div className="grid grid-cols-2 gap-2">
                        {FORUM_FILTER_LABELS.slice(0, FORUM_SORT_FILTER_COUNT).map((label, index) => {
                            const isSelected = selectedFilterIndex === index;
                            const Icon = index === 0 ? Sparkles : TrendingUp;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => handleSelect(index)}
                                    className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-right transition-all duration-150 ${
                                        isSelected ? FORUM_FILTER_CHIP_SELECTED : FORUM_FILTER_CHIP_IDLE
                                    }`}
                                >
                                    <span
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                            isSelected ? FORUM_FILTER_CHIP_ICON_SELECTED : FORUM_FILTER_CHIP_ICON_IDLE
                                        }`}
                                    >
                                        <Icon size={16} />
                                    </span>
                                    <span className="text-[12px] font-bold leading-tight">{label}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-2">
                        <p className={FORUM_FILTER_SECTION_LABEL}>التخصصات القانونية</p>
                        {hasTopicFilter ? (
                            <button
                                type="button"
                                onClick={() => handleSelect(0)}
                                className="text-[10px] text-[#9A9098] hover:text-[#F0B896] transition-colors"
                            >
                                إظهار الكل
                            </button>
                        ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {FORUM_FILTER_LABELS.slice(FORUM_SORT_FILTER_COUNT).map((label, offset) => {
                            const index = offset + FORUM_SORT_FILTER_COUNT;
                            const isSelected = selectedFilterIndex === index;
                            const Icon = TOPIC_ICONS[label] ?? Scale;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => handleSelect(index)}
                                    className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-right transition-all duration-150 ${
                                        isSelected ? FORUM_FILTER_CHIP_SELECTED : FORUM_FILTER_CHIP_IDLE
                                    }`}
                                >
                                    <span
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                            isSelected ? FORUM_FILTER_CHIP_ICON_SELECTED : FORUM_FILTER_CHIP_ICON_IDLE
                                        }`}
                                    >
                                        <Icon size={15} />
                                    </span>
                                    <span className="text-[11px] font-bold leading-tight">{label}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>
            </div>
        </motion.div>,
        document.body,
    );
};
