import { Paperclip } from '@/app/components/ui/icons/Paperclip';
import { ImageIcon } from '@/app/components/ui/icons/ImageIcon';
import { FORUM_ACCENT_CHIP, FORUM_GHOST_BTN, FORUM_SEARCH_FILTERS } from '../forumPlumTheme';

type SearchOverlayFiltersProps = {
    filterHasPdf: boolean;
    onFilterHasPdfChange: (value: boolean) => void;
    filterHasImage: boolean;
    onFilterHasImageChange: (value: boolean) => void;
    selectedTag: string | null;
    onSelectedTagChange: (tag: string | null) => void;
    allTags: string[];
};

export function SearchOverlayFilters({
    filterHasPdf,
    onFilterHasPdfChange,
    filterHasImage,
    onFilterHasImageChange,
    selectedTag,
    onSelectedTagChange,
    allTags,
}: SearchOverlayFiltersProps) {
    return (
        <div className={FORUM_SEARCH_FILTERS}>
            <div className="flex gap-2 flex-wrap">
                <button
                    type="button"
                    onClick={() => onFilterHasPdfChange(!filterHasPdf)}
                    className={`min-h-[44px] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all touch-manipulation ${
                        filterHasPdf ? FORUM_ACCENT_CHIP : FORUM_GHOST_BTN
                    }`}
                >
                    <Paperclip size={14} />
                    يحتوي على PDF
                </button>
                <button
                    type="button"
                    onClick={() => onFilterHasImageChange(!filterHasImage)}
                    className={`min-h-[44px] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all touch-manipulation ${
                        filterHasImage ? FORUM_ACCENT_CHIP : FORUM_GHOST_BTN
                    }`}
                >
                    <ImageIcon size={14} />
                    يحتوي على صور
                </button>
            </div>

            {allTags.length > 0 ? (
                <div className="w-full overflow-x-auto scrollbar-hide">
                    <div className="flex gap-2 min-w-max">
                        {allTags.map((tag) => (
                            <button
                                type="button"
                                key={tag}
                                onClick={() => onSelectedTagChange(selectedTag === tag ? null : tag)}
                                className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold border transition-all touch-manipulation ${
                                    selectedTag === tag ? FORUM_ACCENT_CHIP : FORUM_GHOST_BTN
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
