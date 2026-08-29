import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/unifiedSeizureLogEntryTypes';
import { buildUnifiedSeizureLogGuarantorEntries } from '@/app/components/lawyer/ExecutionDashboard/utils/buildUnifiedSeizureLogGuarantorEntries';
import { buildUnifiedSeizureLogMovableEntries } from '@/app/components/lawyer/ExecutionDashboard/utils/buildUnifiedSeizureLogMovableEntries';
import { buildUnifiedSeizureLogPropertyEntries } from '@/app/components/lawyer/ExecutionDashboard/utils/buildUnifiedSeizureLogPropertyEntries';
import { buildUnifiedSeizureLogSalaryEntries } from '@/app/components/lawyer/ExecutionDashboard/utils/buildUnifiedSeizureLogSalaryEntries';
import { buildUnifiedSeizureLogThirdPartyEntries } from '@/app/components/lawyer/ExecutionDashboard/utils/buildUnifiedSeizureLogThirdPartyEntries';
import type {
    UnifiedSeizureLogBuildInput,
    UnifiedSeizureTabCounts,
} from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogEntriesTypes';
import { sortEntries } from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogEntryInternalHelpers';

export type { UnifiedSeizureLogBuildInput, UnifiedSeizureTabCounts };

export function buildUnifiedSeizureLogEntries(input: UnifiedSeizureLogBuildInput): UnifiedSeizureLogEntry[] {
    const property = buildUnifiedSeizureLogPropertyEntries(input);
    const salary = buildUnifiedSeizureLogSalaryEntries(input);
    const movable = buildUnifiedSeizureLogMovableEntries(input);
    const thirdParty = buildUnifiedSeizureLogThirdPartyEntries(input);
    const guarantor = buildUnifiedSeizureLogGuarantorEntries({
        input,
        linkedPropertyDecisionIds: property.linkedPropertyDecisionIds,
        linkedSalaryDecisionIds: salary.linkedSalaryDecisionIds,
        seenMovableDecisionIds: movable.seenMovableDecisionIds,
    });

    return sortEntries([
        ...property.entries,
        ...salary.entries,
        ...movable.entries,
        ...thirdParty,
        ...guarantor,
    ]);
}

export function computeUnifiedSeizureTabCounts(entries: UnifiedSeizureLogEntry[]): UnifiedSeizureTabCounts {
    const counts = { property: 0, salary: 0, movable: 0, third_party: 0 };
    for (const e of entries) {
        if (e.kind === 'property') counts.property += 1;
        else if (e.kind === 'salary') counts.salary += 1;
        else if (e.kind === 'movable') counts.movable += 1;
        else if (e.kind === 'third_party') counts.third_party += 1;
    }
    return counts;
}

export function hasUnifiedSeizureLogEntries(entries: UnifiedSeizureLogEntry[]): boolean {
    const counts = computeUnifiedSeizureTabCounts(entries);
    return counts.property + counts.salary + counts.movable + counts.third_party > 0;
}
