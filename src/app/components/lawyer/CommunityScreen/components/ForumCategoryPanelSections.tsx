import { Sparkles } from '@/app/components/ui/icons/Sparkles';
import { TrendingUp } from '@/app/components/ui/icons/TrendingUp';
import { Gavel } from '@/app/components/ui/icons/Gavel';
import { Scale } from '@/app/components/ui/icons/Scale';
import { Shield } from '@/app/components/ui/icons/Shield';
import { Users } from '@/app/components/ui/icons/Users';
import { Building2 } from '@/app/components/ui/icons/Building2';
import { Home } from '@/app/components/ui/icons/Home';
import { ArrowLeftRight } from '@/app/components/ui/icons/ArrowLeftRight';
import { Clock3 } from '@/app/components/ui/icons/Clock3';
import { Landmark } from '@/app/components/ui/icons/Landmark';
import { CreditCard } from '@/app/components/ui/icons/CreditCard';
import { ScrollText } from '@/app/components/ui/icons/ScrollText';
import type { LucideIcon } from '@/app/components/ui/lucideIcons';
import { FORUM_FILTER_LABELS, FORUM_SORT_FILTER_COUNT } from '../forumFilters';
import { FORUM_FILTER_CLEAR_BTN, FORUM_FILTER_SECTION_LABEL } from '../forumPlumTheme';
import { ForumFilterChip } from './ForumFilterChip';

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

type ForumCategoryPanelSectionsProps = {
    selectedFilterIndex: number;
    hasTopicFilter: boolean;
    onSelect: (index: number) => void;
};

export function ForumCategoryPanelSections({
    selectedFilterIndex,
    hasTopicFilter,
    onSelect,
}: ForumCategoryPanelSectionsProps) {
    return (
        <div className="max-h-[min(68vh,420px)] space-y-4 overflow-y-auto p-4 overscroll-contain scrollbar-hide">
            <section>
                <p className={`${FORUM_FILTER_SECTION_LABEL} mb-2`}>ترتيب العرض</p>
                <div className="grid grid-cols-2 gap-2">
                    {FORUM_FILTER_LABELS.slice(0, FORUM_SORT_FILTER_COUNT).map((label, index) => (
                        <ForumFilterChip
                            key={label}
                            label={label}
                            selected={selectedFilterIndex === index}
                            icon={index === 0 ? Sparkles : TrendingUp}
                            onSelect={() => onSelect(index)}
                        />
                    ))}
                </div>
            </section>

            <section>
                <div className="flex items-center justify-between mb-2">
                    <p className={FORUM_FILTER_SECTION_LABEL}>التخصصات القانونية</p>
                    {hasTopicFilter ? (
                        <button type="button" onClick={() => onSelect(0)} className={FORUM_FILTER_CLEAR_BTN}>
                            إظهار الكل
                        </button>
                    ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {FORUM_FILTER_LABELS.slice(FORUM_SORT_FILTER_COUNT).map((label, offset) => {
                        const index = offset + FORUM_SORT_FILTER_COUNT;
                        return (
                            <ForumFilterChip
                                key={label}
                                label={label}
                                selected={selectedFilterIndex === index}
                                icon={TOPIC_ICONS[label] ?? Scale}
                                iconSize={15}
                                onSelect={() => onSelect(index)}
                            />
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
