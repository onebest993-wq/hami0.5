import { describe, expect, it } from 'vitest';
import { buildPhoneBodyDeferredScope } from '../buildPhoneBodyDeferredScope';

describe('buildPhoneBodyDeferredScope', () => {
    it('picks deferred panel keys from phone body scope bag', () => {
        const scope = buildPhoneBodyDeferredScope({
            executionId: 'exec-1',
            showExecutionFinancialHub: true,
            unrelatedKey: 'drop-me',
        });

        expect(scope.executionId).toBe('exec-1');
        expect(scope.showExecutionFinancialHub).toBe(true);
        expect((scope as Record<string, unknown>).unrelatedKey).toBeUndefined();
    });
});
