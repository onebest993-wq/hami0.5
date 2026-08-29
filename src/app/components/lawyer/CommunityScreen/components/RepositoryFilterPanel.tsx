import { motion } from '@/app/motion/overlayMotionRuntime';
import { Scale } from '@/app/components/ui/icons/Scale';
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
    FORUM_FILTER_CLEAR_BTN,
    FORUM_FILTER_SECTION_LABEL,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';
import { ForumFilterChip } from './ForumFilterChip';

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
            <div className="px-4 py-3 border-b border-[#2A3344]/40">
                <p className={`${FORUM_TEXT_PRIMARY} font-bold text-sm`}>تصفية المستودع</p>
                <p className={`${FORUM_TEXT_MUTED} text-[11px] truncate mt-0.5`}>
                    {repositoryFilterSummary(selectedType, sortBy, selectedTag)}
                </p>
            </div>

            <div className="p-4 space-y-4 max-h-[min(70vh,420px)] overflow-y-auto scrollbar-hide">
                <section>
                    <p className={`${FORUM_FILTER_SECTION_LABEL} mb-2`}>ترتيب العرض</p>
                    <div className="grid grid-cols-1 gap-2">
                        {REPOSITORY_SORT_OPTIONS.map(({ value, label, icon }) => (
                            <ForumFilterChip
                                key={value}
                                label={label}
                                selected={sortBy === value}
                                icon={icon}
                                dense
                                onSelect={() => handleSort(value)}
                            />
                        ))}
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
                                className={FORUM_FILTER_CLEAR_BTN}
                            >
                                إظهار الكل
                            </button>
                        ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {REPOSITORY_TOPIC_FILTERS.map((label) => (
                            <ForumFilterChip
                                key={label}
                                label={label}
                                selected={selectedTag === label}
                                icon={REPOSITORY_TOPIC_ICONS[label] ?? Scale}
                                iconSize={15}
                                dense
                                onSelect={() => handleTag(label)}
                            />
                        ))}
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-2">
                        <p className={FORUM_FILTER_SECTION_LABEL}>نوع المستند</p>
                        {selectedType !== 'الكل' ? (
                            <button type="button" onClick={() => handleType('الكل')} className={FORUM_FILTER_CLEAR_BTN}>
                                إظهار الكل
                            </button>
                        ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {REPOSITORY_DOCUMENT_TYPES.map((type) => (
                            <ForumFilterChip
                                key={type}
                                label={type}
                                selected={selectedType === type}
                                icon={REPOSITORY_TYPE_ICONS[type] ?? REPOSITORY_TYPE_ICONS['أخرى']}
                                iconSize={15}
                                dense
                                onSelect={() => handleType(type)}
                            />
                        ))}
                    </div>
                </section>
            </div>
        </motion.div>
    );
};
