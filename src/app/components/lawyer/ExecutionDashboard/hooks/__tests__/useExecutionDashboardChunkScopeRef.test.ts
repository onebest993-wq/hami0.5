import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useExecutionPhoneBodyChunkScopeRef } from '../useExecutionDashboardChunkScopeRef';

describe('useExecutionPhoneBodyChunkScopeRef', () => {
    it('syncs showExecutionFinancialHub during render when syncToken changes', () => {
        let sources: Record<string, unknown> = {
            showExecutionFinancialHub: false,
            showUnifiedSeizureLogModal: false,
        };

        const { result, rerender } = renderHook(
            ({ token }: { token: string }) =>
                useExecutionPhoneBodyChunkScopeRef(true, token, () => sources),
            { initialProps: { token: '0' } },
        );

        expect(result.current.current.showExecutionFinancialHub).toBe(false);

        sources = {
            showExecutionFinancialHub: true,
            showUnifiedSeizureLogModal: false,
        };
        rerender({ token: '1' });

        // يجب أن تكون القيمة الجديدة مقروءة فوراً في نفس دورة الـ render — لا تنتظر layout effect
        expect(result.current.current.showExecutionFinancialHub).toBe(true);

        sources = {
            showExecutionFinancialHub: false,
            showUnifiedSeizureLogModal: true,
        };
        rerender({ token: '2' });

        expect(result.current.current.showExecutionFinancialHub).toBe(false);
        expect(result.current.current.showUnifiedSeizureLogModal).toBe(true);
    });
});
