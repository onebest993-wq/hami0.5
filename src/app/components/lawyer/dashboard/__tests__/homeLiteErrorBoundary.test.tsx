import { describe, expect, it, vi, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
    HomeLiteErrorBoundary,
    HomeLiteErrorFallback,
} from '@/app/components/lawyer/dashboard/homeLiteErrorBoundary';
import { sentryCaptureException } from '@/app/observability/sentryClient';

vi.mock('@/app/observability/sentryClient', () => ({
    sentryCaptureException: vi.fn(() => Promise.resolve()),
}));

function Boom(): never {
    throw new Error('home-lite-boom');
}

describe('HomeLiteErrorBoundary', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('يعرض fallback ويبلّغ المصدر إلى Sentry', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        render(
            <HomeLiteErrorBoundary
                source="HomeMainZoneErrorBoundary"
                fallback={<div data-testid="home-lite-fallback">فشل</div>}
            >
                <Boom />
            </HomeLiteErrorBoundary>,
        );

        expect(screen.getByTestId('home-lite-fallback')).toHaveTextContent('فشل');
        expect(sentryCaptureException).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'home-lite-boom' }),
            expect.objectContaining({ source: 'HomeMainZoneErrorBoundary' }),
        );
        expect(consoleSpy).toHaveBeenCalled();
    });

    it('إعادة المحاولة تعيد تركيب الأبناء بعد زوال الخطأ', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        let shouldBoom = true;
        function MaybeBoom() {
            if (shouldBoom) throw new Error('home-lite-boom');
            return <div data-testid="home-lite-ok">ok</div>;
        }

        render(
            <HomeLiteErrorBoundary
                source="HomeMainZoneErrorBoundary"
                fallback={(retry) => (
                    <HomeLiteErrorFallback
                        testId="home-lite-fallback"
                        ariaLabel="خطأ في شبكة الواجهة الرئيسية"
                        message="تعذّر تحميل بطاقات الواجهة."
                        onRetry={retry}
                        className="relative flex flex-col items-center justify-center min-h-[200px] px-6 py-10 text-center"
                    />
                )}
            >
                <MaybeBoom />
            </HomeLiteErrorBoundary>,
        );

        expect(screen.getByTestId('home-lite-fallback')).toBeInTheDocument();
        const retry = screen.getByTestId('home-lite-fallback-retry');
        expect(retry).toHaveTextContent('إعادة المحاولة');
        expect(retry.className).toContain('min-h-[44px]');

        shouldBoom = false;
        fireEvent.click(retry);
        expect(screen.getByTestId('home-lite-ok')).toHaveTextContent('ok');
        expect(screen.queryByTestId('home-lite-fallback')).not.toBeInTheDocument();
        expect(consoleSpy).toHaveBeenCalled();
    });
});
