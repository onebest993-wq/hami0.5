import { describe, expect, it } from 'vitest';
import {
    buildLegacyDecisionMigrationSources,
    scopeTimelineEventsOnExecutionSwitch,
    timelineHasSubDossierOpenedEvent,
} from '../executionDashboardDossierBootSync';

describe('executionDashboardDossierBootSync', () => {
    it('collects legacy decision migration sources', () => {
        const sources = buildLegacyDecisionMigrationSources({
            decisionsStorageExecutionId: 'parent-1',
            executionId: 'legacy-1',
            fileId: 'legacy-1',
            activeSubFileId: 'sub-a',
            activeTabId: 'tab-2',
            currentFileId: 'parent-1',
        });
        expect(sources).toContain('legacy-1');
        expect(sources).toContain('legacy-1__sub__sub-a');
        expect(sources).toContain('tab-2');
    });

    it('scopes parent dossier timeline events', () => {
        const scoped = scopeTimelineEventsOnExecutionSwitch(
            {
                id: 'parent-1',
                timelineEvents: [{ id: 'e1', title: 't', metadata: { parentDossierId: 'parent-1' } }],
            } as any,
            null,
            'parent-1',
        );
        expect(scoped.length).toBeGreaterThan(0);
    });

    it('detects sub dossier opened timeline marker', () => {
        expect(
            timelineHasSubDossierOpenedEvent(
                [{ id: '1', metadata: { timelineThreadKey: 'sub_dossier_opened:sub-1' } }] as any,
                'sub-1',
            ),
        ).toBe(true);
    });
});
