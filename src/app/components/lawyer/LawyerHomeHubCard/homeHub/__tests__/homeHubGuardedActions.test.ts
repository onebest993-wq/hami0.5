import { describe, expect, it, vi } from 'vitest';

import { createHomeHubGuardedActions } from '@/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubGuardedActions';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        warning: vi.fn(),
    },
}));

describe('homeHubGuardedActions', () => {
    it('guardedNavigateRoute يرفض مساراً غير آمن', () => {
        const onNavigateRoute = vi.fn();
        const { guardedNavigateRoute } = createHomeHubGuardedActions({
            signedIn: true,
            lawyerId: 'lawyer-1',
            guardInteraction: (fn) => fn(),
            onNavigateRoute,
            onOpenEntity: vi.fn(),
            unpinItem: vi.fn(),
        });

        guardedNavigateRoute('javascript:alert(1)');
        expect(onNavigateRoute).not.toHaveBeenCalled();
    });

    it('guardedDismissRadar يستدعي guardInteraction', () => {
        const guardInteraction = vi.fn((fn: () => void) => fn());
        const { guardedDismissRadar } = createHomeHubGuardedActions({
            signedIn: true,
            lawyerId: 'lawyer-1',
            guardInteraction,
            onNavigateRoute: vi.fn(),
            onOpenEntity: vi.fn(),
            unpinItem: vi.fn(),
        });

        guardedDismissRadar('radar-1');
        expect(guardInteraction).toHaveBeenCalled();
    });
});
