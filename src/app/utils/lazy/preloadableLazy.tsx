/**
 * Lazy واعٍ بالتحميل المسبق — React.lazy يعلّق (Suspense) عند أول تركيب حتى لو
 * كانت الوحدة محمّلة، فيومض الهيكل إطاراً كاملاً. هنا: إذا اكتمل preload
 * نرسم المكوّن الحقيقي مباشرة في نفس الـ commit — صفر تعليق، صفر وميض.
 */
import React from 'react';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

type ModuleWithDefault<P> = { default: React.ComponentType<P> };

export type PreloadableLazyComponent<P> = React.FC<P> & {
    /** يحمّل الوحدة ويثبّتها للرسم المباشر — آمن للاستدعاء المتكرر */
    preload: () => Promise<void>;
    /** هل اكتمل التحميل وثُبّت المكوّن؟ */
    isPreloaded: () => boolean;
};

export function createPreloadableLazyComponent<P extends Record<string, any>>(
    importer: () => Promise<ModuleWithDefault<P>>,
): PreloadableLazyComponent<P> {
    let Resolved: React.ComponentType<P> | null = null;
    let modulePromise: Promise<ModuleWithDefault<P>> | null = null;

    const load = (): Promise<ModuleWithDefault<P>> => {
        if (!modulePromise) {
            modulePromise = importer()
                .then((mod) => {
                    Resolved = mod.default;
                    return mod;
                })
                .catch((err: unknown) => {
                    // فشل الشبكة لا يثبّت وعداً ميتاً — المحاولة التالية تعيد الاستيراد
                    modulePromise = null;
                    throw err;
                });
        }
        return modulePromise;
    };

    // مسار التعليق (البارد) يمر عبر lazyWithRetry — إعادة محاولة عند فشل الشبكة
    const Lazy = lazyWithRetry(
        load as unknown as () => Promise<{ default: LazyComponent }>,
    ) as unknown as React.ComponentType<P>;

    function PreloadableLazy(props: P) {
        // إن اكتمل preload (أثناء الأرشيف/الإقلاع) ارسم المباشر فوراً —
        // useState كان يُثبّت Lazy إلى الأبد حتى بعد اكتمال التحميل لنفس الـ instance.
        if (Resolved) {
            return <Resolved {...props} />;
        }
        return <Lazy {...props} />;
    }

    const out = PreloadableLazy as PreloadableLazyComponent<P>;
    out.preload = () =>
        load().then(
            () => undefined,
            () => undefined,
        );
    out.isPreloaded = () => Resolved != null;
    return out;
}
