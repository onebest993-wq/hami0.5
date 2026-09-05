import { describe, expect, it, vi } from 'vitest';
import {
    createDeferredFeatureStubs,
    isDeferredPendingOpSatisfied,
} from '@/app/components/lawyer/dashboard/createDeferredFeatureStubs';

describe('isDeferredPendingOpSatisfied field-tasks race', () => {
    it('considers a pending fieldTasks op satisfied once the agenda is open', () => {
        const stubs = createDeferredFeatureStubs(vi.fn());
        const bag = {
            ...stubs,
            fieldTasks: {
                ...stubs.fieldTasks,
                fieldTasksSheetOpen: false,
                showTasksManager: true,
            },
        };
        expect(isDeferredPendingOpSatisfied(bag, 'fieldTasks')).toBe(true);
    });

    it('still requires the sheet when the agenda is closed', () => {
        const stubs = createDeferredFeatureStubs(vi.fn());
        expect(isDeferredPendingOpSatisfied(stubs, 'fieldTasks')).toBe(false);
        const openSheet = {
            ...stubs,
            fieldTasks: {
                ...stubs.fieldTasks,
                fieldTasksSheetOpen: true,
            },
        };
        expect(isDeferredPendingOpSatisfied(openSheet, 'fieldTasks')).toBe(true);
    });
});
