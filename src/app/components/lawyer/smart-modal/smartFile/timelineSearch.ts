import type { TimelineEvent } from '../../LawyerShared';
import { filterTimelineFeed } from './timelineFeedTaxonomy';

/** @deprecated use filterTimelineFeed */
export function filterTimelineEvents(events: TimelineEvent[], query: string): TimelineEvent[] {
    return filterTimelineFeed(events, { query, category: 'all' });
}

export { filterTimelineFeed, type TimelineFeedCategory } from './timelineFeedTaxonomy';
