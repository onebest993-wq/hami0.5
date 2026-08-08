import { describe, expect, it } from 'vitest';

/** يعكس دمج عنقود المعالجات الجبري — لا استبدال كامل للعنقود */
function mergeCoerciveHandlerCluster(
    current: Record<string, unknown>,
    next: Record<string, unknown>,
): Record<string, unknown> {
    return { ...current, ...next };
}

describe('executionHandlerClusterMerge', () => {
    it('preserves existing handlers when coercive heavy cluster arrives', () => {
        const current = {
            handleResumeExecution: () => 'resume',
            saveCoerciveAction: () => 'save',
        };
        const next = {
            openPoliceAssistanceModal: () => 'police',
        };

        const merged = mergeCoerciveHandlerCluster(current, next);
        expect(merged.handleResumeExecution).toBe(current.handleResumeExecution);
        expect(merged.saveCoerciveAction).toBe(current.saveCoerciveAction);
        expect(merged.openPoliceAssistanceModal).toBe(next.openPoliceAssistanceModal);
    });

    it('overrides same-key handlers without wiping unrelated keys', () => {
        const current = {
            saveCoerciveAction: () => 'old',
            handleResumeExecution: () => 'resume',
        };
        const next = {
            saveCoerciveAction: () => 'new',
        };

        const merged = mergeCoerciveHandlerCluster(current, next);
        expect(merged.saveCoerciveAction).toBe(next.saveCoerciveAction);
        expect(merged.handleResumeExecution).toBe(current.handleResumeExecution);
    });
});
