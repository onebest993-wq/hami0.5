import { beforeEach, describe, expect, it } from 'vitest';
import {
    __resetExecutionWarmCoordinatorForTests,
    markExecutionDossierWarmed,
    markExecutionWorkspaceWarmed,
    shouldWarmExecutionDossierFromArchiveHost,
} from '@/app/services/executionWarmCoordinator';

describe('executionWarmCoordinator', () => {
    beforeEach(() => {
        __resetExecutionWarmCoordinatorForTests();
    });

    it('يمنع تسخين مضيف الأرشيف مباشرة بعد تسخين الـ hub', () => {
        const now = 1_000_000;
        markExecutionWorkspaceWarmed(now);
        expect(shouldWarmExecutionDossierFromArchiveHost(now + 100)).toBe(false);
        expect(shouldWarmExecutionDossierFromArchiveHost(now + 3_000)).toBe(true);
    });

    it('يمنع التكرار خلال نافذة تسخين الإضبارة', () => {
        const now = 2_000_000;
        markExecutionDossierWarmed(now);
        expect(shouldWarmExecutionDossierFromArchiveHost(now + 500)).toBe(false);
        expect(shouldWarmExecutionDossierFromArchiveHost(now + 3_500)).toBe(true);
    });
});
