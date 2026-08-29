import {
    isSeizureLogTab,
    type SeizureLogTab,
} from '@/app/components/lawyer/execution/unifiedSeizureLogTabTypes';
import type { UnifiedSeizureTabCounts } from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogEntries';

export const UNIFIED_SEIZURE_TAB_ORDER: SeizureLogTab[] = [
    'property',
    'salary',
    'movable',
    'third_party',
];

export function resolveFirstUnifiedSeizureTab(
    counts: UnifiedSeizureTabCounts | Record<SeizureLogTab, number>,
    preferredTab?: string
): SeizureLogTab {
    if (preferredTab && isSeizureLogTab(preferredTab) && counts[preferredTab] > 0) {
        return preferredTab;
    }
    return UNIFIED_SEIZURE_TAB_ORDER.find((k) => counts[k] > 0) || 'property';
}
