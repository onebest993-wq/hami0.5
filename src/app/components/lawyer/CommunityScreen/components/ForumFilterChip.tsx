import type { LucideIcon } from '@/app/components/ui/lucideIcons';
import {
    FORUM_FILTER_CHIP_IDLE,
    FORUM_FILTER_CHIP_ICON_IDLE,
    FORUM_FILTER_CHIP_ICON_SELECTED,
    FORUM_FILTER_CHIP_SELECTED,
} from '../forumPlumTheme';

type ForumFilterChipProps = {
    label: string;
    selected: boolean;
    icon: LucideIcon;
    iconSize?: number;
    dense?: boolean;
    onSelect: () => void;
};

export function ForumFilterChip({
    label,
    selected,
    icon: Icon,
    iconSize = 16,
    dense = false,
    onSelect,
}: ForumFilterChipProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`flex min-h-[44px] items-center gap-2 border text-right transition-colors ${
                dense ? 'rounded-lg px-2.5 py-2' : 'rounded-xl px-3 py-2.5'
            } ${selected ? FORUM_FILTER_CHIP_SELECTED : FORUM_FILTER_CHIP_IDLE}`}
        >
            <span
                className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    selected ? FORUM_FILTER_CHIP_ICON_SELECTED : FORUM_FILTER_CHIP_ICON_IDLE
                }`}
            >
                <Icon size={iconSize} />
            </span>
            <span className={`${dense ? 'text-[11px]' : 'text-[12px]'} font-bold leading-tight`}>{label}</span>
        </button>
    );
}
