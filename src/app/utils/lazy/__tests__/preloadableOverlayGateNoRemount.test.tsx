// @vitest-environment jsdom
/**
 * بوّابةٌ رُكّبت باردةً ثمّ اكتمل تحميلُها: **إعادةُ الرسم بعدها لا تهدم ما عُرض.**
 *
 * العطلُ الذي يحرسه: `isPreloaded() ? <X/> : <Suspense><X/></Suspense>` يُقيَّم في كلّ رسم.
 * فالنافذةُ تُعرض أوّلاً داخل `Suspense`، ثمّ يكتمل `preload` فتُعيد البوّابةُ الرسم — **وتُرجع
 * `X` بلا `Suspense`**: نوعُ عنصرٍ آخر في الموضع نفسه، فيُعاد تركيبُ ما تحته وتعود كلُّ حالةٍ
 * إلى قيمتها الأولى بلا أيّ setter.
 *
 * **ولماذا وحدةٌ مصنوعةٌ لا `createPreloadableLazyComponent`:** مع تلك يُسجَّل التحميلُ قبل أن
 * يُعيد React المحاولة، فيتجمّع الرسمان داخل `act` في رسمٍ واحد ولا يقع التبديلُ في الاختبار —
 * **فيمرّ على الشفرة المعطوبة**. وفي التطبيق يقعان في مهمّتين، فيقع. الوحدةُ هنا تفصل اللحظتين
 * عمداً: الشاشةُ تُعرض، **ثمّ** يكتمل `preload`.
 */
import React, { useEffect, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PreloadableOverlayGate, type PreloadableLike } from '../preloadableOverlayGate';

type StatefulProps = { label: string };

function makeStateful(mounts: { count: number }) {
    return function Stateful({ label }: StatefulProps) {
        const [tab, setTab] = useState('current');
        useEffect(() => {
            mounts.count += 1;
        }, []);
        return (
            <button type="button" data-testid="stateful" data-tab={tab} onClick={() => setTab('previous')}>
                {label}
            </button>
        );
    };
}

function coldLazy(Stateful: React.ComponentType<StatefulProps>) {
    let resolveChunk: () => void = () => undefined;
    const chunk = new Promise<{ default: React.ComponentType<StatefulProps> }>((resolve) => {
        resolveChunk = () => resolve({ default: Stateful });
    });
    let resolvePreload: () => void = () => undefined;
    const preloadDone = new Promise<void>((resolve) => {
        resolvePreload = resolve;
    });
    let preloaded = false;
    const lazy = Object.assign(React.lazy(() => chunk), {
        isPreloaded: () => preloaded,
        preload: () => preloadDone,
    }) as unknown as PreloadableLike<StatefulProps>;
    return {
        lazy,
        chunk,
        preloadDone,
        showChunk: () => resolveChunk(),
        finishPreload: () => {
            preloaded = true;
            resolvePreload();
        },
    };
}

describe('PreloadableOverlayGate — اكتمالُ التحميل لا يُعيد تركيبَ ما عُرض', () => {
    it('تُعرض داخل Suspense، ثمّ يكتمل preload وتُعاد الرسمة: الحالةُ باقية والتركيبُ مرّةٌ واحدة', async () => {
        const mounts = { count: 0 };
        const cold = coldLazy(makeStateful(mounts));
        const view = (label: string) => (
            <PreloadableOverlayGate lazy={cold.lazy} lazyProps={{ label }} fallback={<div data-testid="fallback" />} />
        );

        const { rerender } = render(view('a'));
        expect(screen.getByTestId('fallback')).toBeTruthy();

        await act(async () => {
            cold.showChunk();
            await cold.chunk;
        });
        fireEvent.click(await screen.findByTestId('stateful'));
        expect(screen.getByTestId('stateful').dataset.tab).toBe('previous');

        await act(async () => {
            cold.finishPreload();
            await cold.preloadDone;
        });
        rerender(view('b'));

        expect(screen.getByTestId('stateful').textContent).toBe('b');
        expect(screen.getByTestId('stateful').dataset.tab).toBe('previous');
        expect(mounts.count).toBe(1);
    });

    it('ضابطة: المسارُ الدافئ يرسم بلا بديلٍ ويبقى مركّباً عبر إعادة الرسم', () => {
        const mounts = { count: 0 };
        const Stateful = makeStateful(mounts);
        const warm = Object.assign(Stateful, {
            isPreloaded: () => true,
            preload: () => Promise.resolve(),
        }) as PreloadableLike<StatefulProps>;
        const view = (label: string) => (
            <PreloadableOverlayGate lazy={warm} lazyProps={{ label }} fallback={<div data-testid="fallback" />} />
        );

        const { rerender } = render(view('a'));
        expect(screen.queryByTestId('fallback')).toBeNull();
        fireEvent.click(screen.getByTestId('stateful'));
        rerender(view('b'));
        expect(screen.getByTestId('stateful').dataset.tab).toBe('previous');
        expect(mounts.count).toBe(1);
    });
});
