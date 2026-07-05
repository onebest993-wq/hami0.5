import React from 'react';
import { motion } from 'motion/react';
import { Scale } from 'lucide-react';
import {
    REPOSITORY_DOCUMENT_TYPES,
    REPOSITORY_SORT_OPTIONS,
    REPOSITORY_TOPIC_FILTERS,
    REPOSITORY_TOPIC_ICONS,
    REPOSITORY_TYPE_ICONS,
    repositoryFilterSummary,
    type RepositorySortKey,
} from '../repositoryListFilters';
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

interface RepositoryFilterPanelProps {
    sortBy: RepositorySortKey;
    selectedType: string;
    selectedTag: string | null;
    onSortChange: (value: RepositorySortKey) => void;
    onTypeChange: (value: string) => void;
    onTagChange: (tag: string | null) => void;
    onClose: () => void;
}

export const RepositoryFilterPanel = ({
    sortBy,
    selectedType,
    selectedTag,
    onSortChange,
    onTypeChange,
    onTagChange,
    onClose,
}: RepositoryFilterPanelProps) => {
    const handleSort = (value: RepositorySortKey) => {
        onSortChange(value);
        onClose();
    };

    const handleType = (value: string) => {
        onTypeChange(value);
        onClose();
    };

    const handleTag = (tag: string) => {
        onTagChange(selectedTag === tag ? null : tag);
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className={`absolute left-0 top-full mt-2 w-[min(360px,calc(100vw-2rem))] z-50 ${FORUM_DROPDOWN_PANEL}`}
            role="dialog"
            aria-label="تصفية المستودع"
        >
            <div className="px-4 py-3 border-b border-[#4A3D52]/40">
                <p className={`${FORUM_TEXT_PRIMARY} font-bold text-sm`}>تصفية المستودع</p>
                <p className={`${FORUM_TEXT_MUTED} text-[11px] truncate mt-0.5`}>
                    {repositoryFilterSummary(selectedType, sortBy, selectedTag)}
                </p>
            </div>

            <div className="p-4 space-y-4 max-h-[min(70vh,420px)] overflow-y-auto scrollbar-hide">
                <section>
                    <p className={`${FORUM_FILTER_SECTION_LABEL} mb-2`}>ترتيب العرض</p>
                    <div className="grid grid-cols-1 gap-2">
                        {REPOSITORY_SORT_OPTIONS.map(({ value, label, icon: Icon }) => {
                            const isSelected = sortBy === value;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => handleSort(value)}
                                    className={`rounded-xl px-3 py-2.5 flex items-center gap-2 border text-right transition-all ${
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
                        {selectedTag ? (
                            <button
                                type="button"
                                onClick={() => {
                                    onTagChange(null);
                                    onClose();
                                }}
                                className="text-[10px] text-[#9A9098] hover:text-[#F0B896] transition-colors"
                            >
                                إظهار الكل
                            </button>
                        ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {REPOSITORY_TOPIC_FILTERS.map((label) => {
                            const isSelected = selectedTag === label;
                            const Icon = REPOSITORY_TOPIC_ICONS[label] ?? Scale;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => handleTag(label)}
                                    className={`rounded-xl px-3 py-2.5 flex items-center gap-2 border text-right transition-all ${
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

                <section>
                    <div className="flex items-center justify-between mb-2">
                        <p className={FORUM_FILTER_SECTION_LABEL}>نوع المستند</p>
                        {selectedType !== 'الكل' ? (
                            <button
                                type="button"
                                onClick={() => handleType('الكل')}
                                className="text-[10px] text-[#9A9098] hover:text-[#F0B896] transition-colors"
                            >
                                إظهار الكل
                            </button>
                        ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {REPOSITORY_DOCUMENT_TYPES.map((type) => {
                            const isSelected = selectedType === type;
                            const Icon = REPOSITORY_TYPE_ICONS[type] ?? REPOSITORY_TYPE_ICONS['أخرى'];
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => handleType(type)}
                                    className={`rounded-xl px-3 py-2.5 flex items-center gap-2 border text-right transition-all ${
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
                                    <span className="text-[11px] font-bold leading-tight">{type}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>
            </div>
        </motion.div>
    );
};
