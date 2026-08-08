import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { resetLawyerDashboardModuleCache } from '@/app/runtime/lawyerDashboardLoader';

export type LazyComponent = ComponentType<Record<string, unknown>>;

const LAZY_IMPORT_TIMEOUT_MS = 18_000;

function isDynamicImportFetchError(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return (
        /Failed to fetch dynamically imported module/i.test(msg) ||
        /Importing a module script failed/i.test(msg) ||
        /error loading dynamically imported module/i.test(msg)
    );
}

function toLoadError(error: unknown): Error {
    const generic = 'فشل في تحميل المكون. تأكد من الاتصال ثم أعد المحاولة.';
    const cause =
        error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : '';
    const message =
        import.meta.env.DEV && cause && !cause.includes(generic)
            ? `${generic} (${cause})`
            : generic;
    if (error instanceof Error && import.meta.env.DEV) {
        const wrapped = new Error(message);
        wrapped.stack = error.stack;
        wrapped.cause = error;
        return wrapped;
    }
    if (error instanceof Error && !isDynamicImportFetchError(error)) return error;
    return new Error(message);
}

async function loadLazyModule(
    componentImport: () => Promise<{ default: LazyComponent }>,
    retriesLeft: number,
    attempt = 0,
): Promise<{ default: LazyComponent }> {
    try {
        return await componentImport();
    } catch (error) {
        if (retriesLeft > 0) {
            if (isDynamicImportFetchError(error)) {
                resetLawyerDashboardModuleCache();
            }
            const delayMs = Math.min(200 * 2 ** attempt, 2_000);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            return loadLazyModule(componentImport, retriesLeft - 1, attempt + 1);
        }
        throw toLoadError(error);
    }
}

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

        const attemptImport = (retriesLeft: number) => {
            componentImport()
                .then((mod) => finish(() => resolve(mod)))
                .catch((error: unknown) => {
                    if (retriesLeft === 0) {
                        finish(() => reject(toLoadError(error)));
                        return;
                    }
                    if (isDynamicImportFetchError(error)) {
                        resetLawyerDashboardModuleCache();
                    }
                    window.setTimeout(() => attemptImport(retriesLeft - 1), 1000);
                });
        };

        attemptImport(retries);
    });
}

/** إعادة محاولة عند فشل dynamic import — بدون إعادة تحميل الصفحة (تُدار عبر GlobalErrorBoundary). */
export function lazyWithRetry(
    componentImport: () => Promise<{ default: LazyComponent }>,
    retries: number = 3,
): LazyExoticComponent<LazyComponent> {
    if (import.meta.env.DEV) {
        return lazy(() => loadLazyModule(componentImport, 4));
    }
    return lazy(() => importWithTimeout(componentImport, retries));
}
