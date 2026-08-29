import React, { useMemo, useState } from 'react';
import { Search as SearchIcon } from '@/app/components/ui/icons/Search';
import { Clock } from '@/app/components/ui/icons/Clock';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import type { TimelineEvent } from '../../LawyerShared';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import {
    TIMELINE_FEED_CATEGORIES,
    classifyTimelineEvent,
    countTimelineByCategory,
    filterTimelineFeed,
    formatTimelineCardBody,
    formatTimelineCardTitle,
    getTimelineCategoryMeta,
    type TimelineFeedCategory,
} from '../smartFile/timelineFeedTaxonomy';
import { resolveTimelineVisual } from '../smartFile/timelineEventVisuals';
import { isSessionHubFocusEvent } from '../smartFile/sessionRecordEngine';

type ExtendedTimelineEvent = TimelineEvent & {
    isPause?: boolean;
    isInterruption?: boolean;
};

function getEvidentiaryBadge(weight: string) {
    switch (weight) {
        case 'official':
            return { label: 'سند رسمي', style: 'border-[#E6C673]/30 text-[#E6C673] bg-[#E6C673]/10' };
        case 'ordinary':
            return { label: 'سند عادي', style: 'border-white/15 text-white/60 bg-white/[0.04]' };
        case 'beginning':
            return { label: 'مبدأ ثبوت', style: 'border-indigo-400/30 text-indigo-300 bg-indigo-500/10 border-dashed' };
        default:
            return null;
    }
}

export const TimelineFeed = ({
    events,
    onDelete,
    onEventClick,
    visualVariant = 'civil',
}: {
    events: TimelineEvent[];
    onDelete?: (id: string) => void;
    onEventClick?: (event: TimelineEvent) => void;
    visualVariant?: 'civil' | 'personal' | 'personal-pearl';
}) => {
    const isPearl = visualVariant === 'personal-pearl';
    const isPersonal = visualVariant === 'personal' || isPearl;
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<TimelineFeedCategory>('all');
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

    const counts = useMemo(() => countTimelineByCategory(events), [events]);
    const visibleCategories = useMemo(
        () => TIMELINE_FEED_CATEGORIES.filter((c) => c.id === 'all' || counts[c.id] > 0),
        [counts],
    );

    const filteredEvents = useMemo(
        () => filterTimelineFeed(events, { query, category }),
        [events, query, category],
    );

    const shellClass = isPearl
        ? ''
        : isPersonal
        ? 'rounded-xl border border-white/[0.07] bg-[#141214]'
        : 'rounded-xl border border-[#E6C673]/12 bg-[#0A0F1C]/40';
    const accentIcon = isPearl ? 'text-white/35' : isPersonal ? 'text-[#C4A574]/45' : 'text-[#E6C673]/30';

    const searchBar = events.length > 0 ? (
        <div className={`${isPearl ? 'mb-2 space-y-1.5' : `${shellClass} p-2 mb-3 space-y-2`} print:hidden`}>
            <div className="relative">
                <SearchIcon
                    size={14}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${isPearl ? 'text-[#F0A8B4]/45' : isPersonal ? 'text-[#C4A574]/40' : 'text-[#E6C673]/40'}`}
                    aria-hidden
                />
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="بحث في السجل الزمني..."
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.timelineSearch}
                    className={`w-full rounded-lg py-1.5 pr-9 pl-3 text-xs text-[#FFFEF9] outline-none placeholder:text-[#9894A0]/60 transition-colors ${isPearl ? 'bg-[#F5C6D0]/[0.08] border border-[#F0A8B4]/22 focus:border-[#F0A8B4]/38 focus:bg-[#F5C6D0]/[0.12]' : 'bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/25 focus:border-[#E6C673]/35 focus:bg-white/[0.04]'}`}
                />
            </div>
            {visibleCategories.length > 1 ? (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="تصنيف السجل">
                    {visibleCategories.map((cat) => {
                        const active = category === cat.id;
                        const count = counts[cat.id];
                        const pearlChip = isPearl
                            ? active
                                ? 'border-white/[0.22] bg-white/[0.10] text-[#FFFEF9]'
                                : 'border-white/[0.10] bg-white/[0.04] text-[#9894A0] hover:border-white/[0.18] hover:text-[#ECE8E2]'
                            : null;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                data-testid={CIVIL_LAWSUIT_TEST_IDS.timelineCategoryChip(cat.id)}
                                onClick={() => setCategory(cat.id)}
                                className={[
                                    'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold transition-all',
                                    pearlChip ?? (active ? cat.chipActive : cat.chipIdle),
                                ].join(' ')}
                            >
                                <span>{cat.label}</span>
                                <span className={`tabular-nums text-[9px] ${active ? 'opacity-90' : 'opacity-50'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    ) : null;

    if (events.length === 0) {
        return (
            <>
                {searchBar}
                {isPearl ? (
                    <p className="text-[10px] text-[#9894A0] py-0.5">لا إجراءات — استخدم أوامر يسار</p>
                ) : (
                <div className={`text-center py-5 ${shellClass}`}>
                    <Clock size={22} className={`${accentIcon} mx-auto mb-2`} strokeWidth={1.5} />
                    <p className="text-white/30 text-sm">لا توجد إجراءات مسجلة حتى الآن</p>
                </div>
                )}
            </>
        );
    }

    if (filteredEvents.length === 0) {
        return (
            <>
                {searchBar}
                <div className={`text-center py-5 ${shellClass} border-dashed`}>
                    <SearchIcon size={20} className={`${accentIcon} mx-auto mb-2`} strokeWidth={1.5} />
                    <p className="text-white/40 text-sm">لا نتائج لهذا التصنيف أو البحث</p>
                    <p className="text-white/20 text-xs mt-1">جرّب تصنيفاً آخر أو كلمات مختلفة</p>
                </div>
            </>
        );
    }

    return (
        <>
            {searchBar}
            <div className="space-y-2">
                {filteredEvents.map((event) => {
                    const ext = event as ExtendedTimelineEvent;
                    const visual = resolveTimelineVisual(
                        event,
                        ext,
                        isPearl ? 'personal-pearl' : 'civil',
                    );
                    const { Icon } = visual;
                    const eventCategory = classifyTimelineEvent(event);
                    const categoryMeta = getTimelineCategoryMeta(eventCategory);
                    const displayTitle = formatTimelineCardTitle(event);
                    const fullDetails = formatTimelineCardBody(event);
                    const simplifyCivilContent = !isPearl && !isPersonal;
                    const hasDetails = Boolean(fullDetails.trim());
                    const isExpanded = expandedEventId === event.id;
                    const displayDetails = simplifyCivilContent
                        ? isExpanded
                            ? fullDetails
                            : ''
                        : fullDetails;

                    const isPauseEvent = ext.isPause || event.title?.includes('استئخار');
                    const isInterruptionEvent = ext.isInterruption || event.title?.includes('انقطاع السير');
                    const evidentiaryBadge = event.evidentiaryWeight
                        ? getEvidentiaryBadge(event.evidentiaryWeight)
                        : null;

                    const isHearingJump =
                        Boolean(onEventClick && isSessionHubFocusEvent(event));
                    const isExpandable = simplifyCivilContent && hasDetails && !isHearingJump;
                    const isClickable = isHearingJump || isExpandable;

                    const handleCardClick = () => {
                        if (isHearingJump) {
                            onEventClick?.(event);
                            return;
                        }
                        if (isExpandable) {
                            setExpandedEventId(isExpanded ? null : event.id);
                        }
                    };

                    const handleCardKeyDown = (e: React.KeyboardEvent) => {
                        if (!isClickable) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleCardClick();
                        }
                    };

                    return (
                        <div
                            key={event.id}
                            data-event-id={event.id}
                            className="relative flex items-start gap-3 group"
                        >
                            <div className={visual.dot} />

                            <div
                                className={`${visual.card} ${isClickable ? 'cursor-pointer' : ''} ${
                                    isExpanded ? 'ring-1 ring-[#E6C673]/20' : ''
                                }`}
                                role={isClickable ? 'button' : undefined}
                                tabIndex={isClickable ? 0 : undefined}
                                aria-expanded={isExpandable ? isExpanded : undefined}
                                onClick={isClickable ? handleCardClick : undefined}
                                onKeyDown={isClickable ? handleCardKeyDown : undefined}
                            >
                                {simplifyCivilContent ? (
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <h4
                                                className={`font-bold text-[13px] leading-snug ${visual.title}`}
                                            >
                                                {displayTitle}
                                            </h4>
                                            {hasDetails && !isExpanded ? (
                                                <p className="text-[10px] text-white/35 mt-1">
                                                    اضغط لعرض التفاصيل
                                                </p>
                                            ) : null}
                                            {displayDetails ? (
                                                <p
                                                    className={`text-[11px] leading-relaxed mt-2 whitespace-pre-line ${visual.detailsText} line-clamp-none`}
                                                >
                                                    {displayDetails}
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {isExpandable ? (
                                                <ChevronDown
                                                    size={14}
                                                    className={`text-white/35 transition-transform ${
                                                        isExpanded ? 'rotate-180' : ''
                                                    }`}
                                                    aria-hidden
                                                />
                                            ) : null}
                                            <span className="text-[10px] tabular-nums text-white/35">
                                                {event.date?.slice(0, 10) || '—'}
                                            </span>
                                            {onDelete ? (
                                                <div className="flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity print:hidden">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDelete(event.id);
                                                        }}
                                                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:border-rose-500/30 text-white/30 hover:text-rose-400 transition-colors touch-manipulation"
                                                        title="حذف"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                                <div className={visual.iconWrap}>
                                                    <Icon size={18} strokeWidth={1.65} className={visual.iconColor} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                                        <span
                                                            className={`shrink-0 px-1.5 py-0.5 rounded-md border text-[8px] font-bold ${
                                                                isPearl
                                                                    ? 'border-white/[0.16] bg-white/[0.08] text-[#ECE8E2]'
                                                                    : categoryMeta.chipActive
                                                            }`}
                                                        >
                                                            {categoryMeta.label}
                                                        </span>
                                                        <span className={`text-[10px] tabular-nums ${isPearl ? 'text-[#9894A0]' : 'text-white/35'}`}>
                                                            {event.date?.slice(0, 10) || '—'}
                                                        </span>
                                                        {event.time ? (
                                                            <span className={`text-[10px] tabular-nums ${isPearl ? 'text-[#9894A0]/80' : 'text-white/30'}`}>
                                                                {event.time}
                                                            </span>
                                                        ) : null}
                                                        {evidentiaryBadge ? (
                                                            <span
                                                                className={`px-1.5 py-0.5 rounded-md border text-[8px] font-bold ${evidentiaryBadge.style}`}
                                                            >
                                                                {evidentiaryBadge.label}
                                                            </span>
                                                        ) : null}
                                                        {isPauseEvent ? (
                                                            <span className="px-1.5 py-0.5 rounded-md border border-amber-500/25 bg-amber-500/10 text-[8px] font-bold text-amber-200/90">
                                                                استئخار
                                                            </span>
                                                        ) : null}
                                                        {isInterruptionEvent ? (
                                                            <span className="px-1.5 py-0.5 rounded-md border border-rose-500/25 bg-rose-500/10 text-[8px] font-bold text-rose-200/90">
                                                                انقطاع
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <h4 className={`font-bold text-[13px] leading-snug truncate ${visual.title}`}>
                                                        {displayTitle}
                                                    </h4>
                                                </div>
                                            </div>
                                            {onDelete ? (
                                                <div className="flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity print:hidden shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDelete(event.id);
                                                        }}
                                                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:border-rose-500/30 text-white/30 hover:text-rose-400 transition-colors touch-manipulation"
                                                        title="حذف"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                        {displayDetails ? (
                                            <p
                                                className={`text-[11px] leading-relaxed mt-2 pl-0.5 whitespace-pre-line ${visual.detailsText} ${
                                                    event.type === 'decision'
                                                    || event.type === 'milestone'
                                                    || isPauseEvent
                                                    || isInterruptionEvent
                                                        ? 'line-clamp-none'
                                                        : 'line-clamp-5'
                                                }`}
                                            >
                                                {displayDetails}
                                            </p>
                                        ) : null}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
};
