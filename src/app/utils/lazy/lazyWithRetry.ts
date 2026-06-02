import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export type LazyComponent = ComponentType<Record<string, unknown>>;

const LAZY_IMPORT_TIMEOUT_MS = 18_000;

function importWithTimeout(
    componentImport: () => Promise<{ default: LazyComponent }>,
    retries: number,
): Promise<{ default: LazyComponent }> {
    return new Promise<{ default: LazyComponent }>((resolve, reject) => {
        let settled = false;
        const timeoutId = window.setTimeout(() => {
            if (settled) return;
            settled = true;
            reject(new Error('انتهت مهلة تحميل المكون. تحقق من الاتصال ثم أعد المحاولة.'));
        }, LAZY_IMPORT_TIMEOUT_MS);

        const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeoutId);
            fn();
        };

        const toLoadError = (error: unknown): Error => {
            const msg = error instanceof Error ? error.message : String(error);
            if (/Failed to fetch dynamically imported module/i.test(msg)) {
                return new Error('فشل في تحميل المكون. تأكد من الاتصال ثم أعد المحاولة.');
            }
            if (error instanceof Error) return error;
            return new Error('فشل في تحميل المكون. تأكد من الاتصال ثم أعد المحاولة.');
        };

        const attemptImport = (retriesLeft: number) => {
            componentImport()
                .then((mod) => finish(() => resolve(mod)))
                .catch((error: unknown) => {
                    if (retriesLeft === 0) {
                        finish(() => reject(toLoadError(error)));
                        return;
                    }

                    window.setTimeout(() => {
                        if (import.meta.env.DEV) {
                            console.log(`Retrying component import... (${retriesLeft} retries left)`);
                        }
                        attemptImport(retriesLeft - 1);
                    }, 1000);
                });
        };

        attemptImport(retries);
    });
}

/** في التطوير: بدون مهلة زمنية — Vite قد يُجمّع الـ chunk أول مرة دون اعتبار ذلك «فشل اتصال». */
export function lazyWithRetry(
    componentImport: () => Promise<{ default: LazyComponent }>,
    retries: number = 3,
): LazyExoticComponent<LazyComponent> {
    if (import.meta.env.DEV) {
        return lazy(() =>
            componentImport().catch((error: unknown) => {
                const msg = error instanceof Error ? error.message : String(error);
                if (/Failed to fetch dynamically imported module/i.test(msg)) {
                    throw new Error('فشل في تحميل المكون (تطوير). أعد تشغيل npm run dev ثم حدّث الصفحة.');
                }
                throw error;
            }),
        );
    }
    return lazy(() => importWithTimeout(componentImport, retries));
}
