import { describe, expect, it } from 'vitest';
import type { TimelineEvent } from '@/app/types/execution';
import { makeInabaSubFileId } from '@/app/stores/executionDashboardStore';
import {
    filterTimelineEventsForInabaDossier,
    filterTimelineEventsForParentDossier,
    timelineEventBelongsToInabaDossier,
} from '@/app/stores/executionDashboardStore';

describe('execution dashboard timeline dossier scope', () => {
    const parentId = 'parent-42';
    const inabaId = makeInabaSubFileId(parentId);

    it('includes legacy untagged events in inaba dossier view', () => {
        const legacy = { id: 'legacy-1', title: 'حدث قديم', type: 'other' } as TimelineEvent;
        expect(timelineEventBelongsToInabaDossier(legacy, inabaId)).toBe(true);
        expect(filterTimelineEventsForInabaDossier([legacy], inabaId)).toHaveLength(1);
    });

    it('excludes parent-scoped events from inaba dossier view', () => {
        const parentScoped = {
            id: 'parent-1',
            title: 'حدث أم',
            metadata: { dossierScope: 'parent', parentExecutionId: parentId },
        } as TimelineEvent;
        expect(timelineEventBelongsToInabaDossier(parentScoped, inabaId)).toBe(false);
    });

    it('includes stamped inaba events only for matching sub id', () => {
        const stamped = {
            id: 'inaba-1',
            title: 'إنابة',
            metadata: { dossierScope: 'inaba', inabaSubFileId: inabaId, parentExecutionId: parentId },
        } as TimelineEvent;
        expect(filterTimelineEventsForInabaDossier([stamped], inabaId)).toHaveLength(1);
        expect(filterTimelineEventsForInabaDossier([stamped], makeInabaSubFileId('other'))).toHaveLength(0);
    });

    it('keeps legacy untagged events on parent dossier view', () => {
        const legacy = { id: 'legacy-2', title: 'حدث أم قديم', type: 'other' } as TimelineEvent;
        expect(filterTimelineEventsForParentDossier([legacy], parentId)).toHaveLength(1);
    });
});
