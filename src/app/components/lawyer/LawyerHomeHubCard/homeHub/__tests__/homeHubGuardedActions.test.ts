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
            togglePin: vi.fn(),
        });

        guardedNavigateRoute('javascript:alert(1)');
        expect(onNavigateRoute).not.toHaveBeenCalled();
        guardedNavigateRoute('https://evil.example/phish');
        expect(onNavigateRoute).not.toHaveBeenCalled();
    });

    it('مسار غير صالح مع جلسة يُظهر تحذيراً بلا تنقّل', async () => {
        const onNavigateRoute = vi.fn();
        const { guardedNavigateRoute } = createHomeHubGuardedActions({
            signedIn: true,
            lawyerId: 'lawyer-1',
            guardInteraction: (fn) => fn(),
            onNavigateRoute,
            onOpenEntity: vi.fn(),
            unpinItem: vi.fn(),
            togglePin: vi.fn(),
        });

        guardedNavigateRoute('javascript:alert(1)');
        expect(onNavigateRoute).not.toHaveBeenCalled();
        const { SmartToast } = await import('@/app/components/ui/SmartToast');
        await vi.waitFor(() => {
            expect(SmartToast.warning).toHaveBeenCalledWith(
                'تعذر فتح هذا العنصر — المسار غير صالح',
            );
        });
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
            togglePin: vi.fn(),
        });

        guardedDismissRadar('radar-1');
        expect(guardInteraction).toHaveBeenCalled();
    });

    it('guardedTogglePin يستدعي guardInteraction ثم togglePin', () => {
        const guardInteraction = vi.fn((fn: () => void) => fn());
        const togglePin = vi.fn();
        const { guardedTogglePin } = createHomeHubGuardedActions({
            signedIn: true,
            lawyerId: 'lawyer-1',
            guardInteraction,
            onNavigateRoute: vi.fn(),
            onOpenEntity: vi.fn(),
            unpinItem: vi.fn(),
            togglePin,
        });

        guardedTogglePin({
            id: 'pin-1',
            type: 'lawsuit',
            title: 'دعوى',
            clientName: '',
            caseNumber: '',
            routePath: 'workspace:lawsuit:pin-1',
        });
        expect(guardInteraction).toHaveBeenCalledTimes(1);
        expect(togglePin).toHaveBeenCalledTimes(1);
    });

    it('guardedNavigateRoute يطلب تسجيلاً عند الخروج', async () => {
        const onNavigateRoute = vi.fn();
        const { guardedNavigateRoute } = createHomeHubGuardedActions({
            signedIn: false,
            lawyerId: null,
            guardInteraction: (fn) => fn(),
            onNavigateRoute,
            onOpenEntity: vi.fn(),
            unpinItem: vi.fn(),
            togglePin: vi.fn(),
        });

        guardedNavigateRoute('workspace:lawsuit:1');
        expect(onNavigateRoute).not.toHaveBeenCalled();
        const { SmartToast } = await import('@/app/components/ui/SmartToast');
        await vi.waitFor(() => {
            expect(SmartToast.error).toHaveBeenCalled();
        });
    });
});
