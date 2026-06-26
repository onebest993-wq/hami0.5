import { describe, expect, it } from 'vitest';
import { assignExecutionDashboardChunkScope } from '../assignExecutionDashboardChunkScope';
import { EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS } from '../../followupSnapshotFieldKeys';

describe('useExecutionDashboardChunkScopeRef wiring', () => {
    it('assigns followup snapshot keys even when lazy chunk gates are closed', () => {
        const target: Record<string, unknown> = {};
        const sources: Record<string, unknown> = {
            handleCoerciveAction: () => {},
            saveCoerciveAction: () => {},
            handleSpecificDeliveryItemDeclaredDestroyed: () => {},
            hideExecutiveDetentionJudgeCard: true,
            earnerFinancialPersonalCoerciveActive: false,
        };

        assignExecutionDashboardChunkScope(target, sources, {
            phoneBody: false,
            shellOverlays: false,
        });

        for (const key of [
            'handleCoerciveAction',
            'saveCoerciveAction',
            'handleSpecificDeliveryItemDeclaredDestroyed',
            'hideExecutiveDetentionJudgeCard',
            'earnerFinancialPersonalCoerciveActive',
        ] as const) {
            expect(target[key]).toBe(sources[key]);
        }
    });

    it('registers every followup handler key as a function when provided in sources', () => {
        const target: Record<string, unknown> = {};
        const sources: Record<string, unknown> = {};
        for (const key of EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS) {
            if (key.startsWith('handle') || key.startsWith('save') || key.startsWith('open')) {
                sources[key] = () => {};
            } else {
                sources[key] = key;
            }
        }

        assignExecutionDashboardChunkScope(target, sources, {
            phoneBody: false,
            shellOverlays: false,
        });

        for (const key of EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS) {
            if (key.startsWith('handle') || key.startsWith('save') || key.startsWith('open')) {
                expect(typeof target[key]).toBe('function');
            }
        }
    });
});
