import type { FollowupScenarioInput } from './followupScenarioResolver';
import { resolveFollowupScenario } from './followupScenarioResolver';
import { resolveFollowupHiddenActions } from './resolveFollowupHiddenActions';
import {
    readFollowupModalPersist,
    resolveFollowupTabOnOpen,
    writeFollowupModalPersist,
} from '@/app/components/lawyer/ExecutionDashboard/utils/followupModalPersistUtils';

export type FollowupModalJourneyStep = {
    action: 'open' | 'switch_tab' | 'close';
    tab?: string;
    routeSeizureRequests?: boolean;
};

export type FollowupModalJourneyResult = {
    scenarioTabIds: string[];
    hiddenToggleVisible: boolean;
    steps: FollowupModalJourneyStep[];
    finalTab: string | null;
    persistTabAfterClose: string | undefined;
};

/**
 * محاكاة open → tab → persist → reopen لسيناريو محضر المتابعة (بدون DOM).
 */
export function simulateFollowupModalJourney(
    input: FollowupScenarioInput,
    journeyTabs: string[],
    storageKey = 'hami-followup-modal:journey-test',
): FollowupModalJourneyResult {
    const scenario = resolveFollowupScenario(input);
    const hidden = resolveFollowupHiddenActions(input);
    const allowedTabOrder = scenario.effectiveSectionTabOrder;

    const steps: FollowupModalJourneyStep[] = [];
    let currentTab: string | null = null;

    for (const requestedTab of journeyTabs) {
        if (requestedTab === '__open__') {
            const open = resolveFollowupTabOnOpen({
                savedTab: readFollowupModalPersist(storageKey).tab,
                allowedTabOrder,
            });
            steps.push({
                action: 'open',
                tab: open.tab,
                routeSeizureRequests: open.routeSeizureRequests,
            });
            currentTab = open.routeSeizureRequests ? 'seizure_requests' : open.tab;
            continue;
        }
        if (requestedTab === '__close__') {
            writeFollowupModalPersist(storageKey, {
                tab: currentTab ?? undefined,
                scroll: 0,
            });
            steps.push({ action: 'close', tab: currentTab });
            currentTab = null;
            continue;
        }
        const resolved = resolveFollowupTabOnOpen({
            explicitTab: requestedTab as never,
            allowedTabOrder,
        });
        steps.push({
            action: 'switch_tab',
            tab: resolved.tab,
            routeSeizureRequests: resolved.routeSeizureRequests,
        });
        currentTab = resolved.routeSeizureRequests ? 'seizure_requests' : resolved.tab;
        if (currentTab) {
            writeFollowupModalPersist(storageKey, { tab: currentTab });
        }
    }

    const persistTabAfterClose = readFollowupModalPersist(storageKey).tab;

    return {
        scenarioTabIds: scenario.effectiveTabIds,
        hiddenToggleVisible: hidden.hiddenToggleVisible,
        steps,
        finalTab: currentTab,
        persistTabAfterClose,
    };
}
