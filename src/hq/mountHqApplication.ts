import { markBootPhase } from '@/app/bootstrap/bootMetrics';
import { removeStaticBootShell } from '@/app/bootstrap/bootStaticShell';
import { loadHqAppModule } from '@/hq/hqAppModule';

const APP_RUNTIME_READY_EVENT = 'hami:app-runtime-ready';

function withBootTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
            reject(new Error(`[hq-boot] ${label} timed out after ${ms}ms`));
        }, ms);
        promise.then(
            (value) => {
                window.clearTimeout(timeoutId);
                resolve(value);
            },
            (error: unknown) => {
                window.clearTimeout(timeoutId);
                reject(error);
            },
        );
    });
}

function waitForAppRuntimeReady(): Promise<void> {
    if (document.documentElement.dataset.hamiAppRuntimeReady === '1') return Promise.resolve();
    return new Promise((resolve) => {
        const onReady = () => {
            window.removeEventListener(APP_RUNTIME_READY_EVENT, onReady);
            resolve();
        };
        window.addEventListener(APP_RUNTIME_READY_EVENT, onReady, { once: true });
        window.setTimeout(onReady, 8_000);
    });
}

export function startHqApplicationBoot(): void {
    void mountHqApplication().catch((e: unknown) => {
        removeStaticBootShell({ force: true, instant: true });
        console.error('[hq] fatal boot', e);
    });
}

async function mountHqApplication(): Promise<void> {
    markBootPhase('start');
    try {
        const clientEnvPromise = import('@/utils/supabase/clientEnv').then((m) => {
            m.assertClientEnvOrThrow();
        });

        const [appMod, ReactMod, ReactDOMMod] = await withBootTimeout(
            Promise.all([loadHqAppModule(), import('react'), import('react-dom/client')]),
            20_000,
            'core module load',
        );

        void import('@/app/runtime/hqRuntimeShellLoader').then((m) => m.loadHqRuntimeShellModule());

        const rootElement = document.getElementById('root');
        if (!rootElement) throw new Error('Root element missing');

        const App = appMod.default;
        const React = ReactMod.default;
        const { createRoot } = ReactDOMMod;
        const root = createRoot(rootElement);

        root.render(
            import.meta.env.DEV
                ? React.createElement(React.StrictMode, null, React.createElement(App))
                : React.createElement(App),
        );

        markBootPhase('app-render');
        void clientEnvPromise.catch(() => undefined);
        await waitForAppRuntimeReady();
    } catch (e) {
        removeStaticBootShell({ force: true, instant: true });
        throw e;
    }
}
