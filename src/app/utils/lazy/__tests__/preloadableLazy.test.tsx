// @vitest-environment jsdom
import React, { Suspense } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createPreloadableLazyComponent } from '../preloadableLazy';

function Real({ label }: { label: string }) {
    return <div data-testid="real">{label}</div>;
}

describe('createPreloadableLazyComponent', () => {
    it('يرسم المكوّن مباشرة بلا fallback بعد اكتمال preload', async () => {
        const LazyReal = createPreloadableLazyComponent(async () => ({ default: Real }));
        await act(async () => {
            await LazyReal.preload();
        });

        render(
            <Suspense fallback={<div data-testid="fallback" />}>
                <LazyReal label="جاهز" />
            </Suspense>,
        );

        // لا دورة تعليق — المحتوى الحقيقي في أول commit
        expect(screen.queryByTestId('fallback')).toBeNull();
        expect(screen.getByTestId('real').textContent).toBe('جاهز');
    });

    it('يمر عبر fallback ثم يرسم المحتوى في المسار البارد (بدون preload)', async () => {
        let resolveModule: (m: { default: typeof Real }) => void = () => undefined;
        const LazyReal = createPreloadableLazyComponent(
            () =>
                new Promise<{ default: typeof Real }>((resolve) => {
                    resolveModule = resolve;
                }),
        );

        render(
            <Suspense fallback={<div data-testid="fallback" />}>
                <LazyReal label="بارد" />
            </Suspense>,
        );

        expect(screen.getByTestId('fallback')).toBeTruthy();
        await act(async () => {
            resolveModule({ default: Real });
        });
        await waitFor(() => {
            expect(screen.getByTestId('real').textContent).toBe('بارد');
        });
    });

    it('preload لا يكرّر الاستيراد عند الاستدعاء المتعدد', async () => {
        let importCount = 0;
        const LazyReal = createPreloadableLazyComponent(async () => {
            importCount += 1;
            return { default: Real };
        });

        await Promise.all([LazyReal.preload(), LazyReal.preload()]);
        await LazyReal.preload();
        expect(importCount).toBe(1);
    });

    it('preload يعلّم isPreloaded بعد الاكتمال', async () => {
        const LazyReal = createPreloadableLazyComponent(async () => ({ default: Real }));
        expect(LazyReal.isPreloaded()).toBe(false);
        await act(async () => {
            await LazyReal.preload();
        });
        expect(LazyReal.isPreloaded()).toBe(true);
    });
});
