import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const nativeState = { native: false };

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => nativeState.native,
}));

type RegisterCall = { url: string; options?: RegistrationOptions };

const registerCalls: RegisterCall[] = [];
const postedMessages: { data: unknown; transfer: unknown[] }[] = [];

function installServiceWorkerMock(options: { controlled: boolean }) {
    const controller = options.controlled
        ? ({
              postMessage: (data: unknown, transfer: unknown[] = []) => {
                  postedMessages.push({ data, transfer });
                  const port = transfer[0] as MessagePort | undefined;
                  port?.postMessage?.({ ok: true, warmed: 3 });
              },
          } as unknown as ServiceWorker)
        : null;

    const registration = {
        waiting: null,
        installing: null,
        addEventListener: () => undefined,
    } as unknown as ServiceWorkerRegistration;

    const container: Record<string, unknown> & { controller: ServiceWorker | null } = {
        controller,
        ready: Promise.resolve(registration),
        getRegistrations: () => Promise.resolve([] as unknown as readonly ServiceWorkerRegistration[]),
        register: (url: string, opts?: RegistrationOptions) => {
            registerCalls.push({ url, options: opts });
            return Promise.resolve(registration);
        },
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
    };

    Object.defineProperty(navigator, 'serviceWorker', {
        value: container,
        configurable: true,
        writable: true,
    });
    return container;
}

async function loadModule() {
    vi.resetModules();
    return import('@/app/runtime/appServiceWorker');
}

describe('appServiceWorker — تسجيل واحد لا يُهدر شبكة المستخدم', () => {
    beforeEach(() => {
        registerCalls.length = 0;
        postedMessages.length = 0;
        nativeState.native = false;
        vi.stubEnv('PROD', true);
        document.documentElement.removeAttribute('data-hami-sw-warm-ready');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        Reflect.deleteProperty(navigator, 'serviceWorker');
    });

    it('لا يُسجّل داخل الغلاف الأصلي ويُزيل ما بقي من عامل سابق', async () => {
        nativeState.native = true;
        const container = installServiceWorkerMock({ controlled: false });
        let unregistered = 0;
        container.getRegistrations = () =>
            Promise.resolve([
                {
                    unregister: () => {
                        unregistered += 1;
                        return Promise.resolve(true);
                    },
                },
            ] as unknown as readonly ServiceWorkerRegistration[]);
        const { registerAppServiceWorker } = await loadModule();

        await expect(registerAppServiceWorker()).resolves.toBeNull();
        expect(registerCalls).toHaveLength(0);
        await vi.waitFor(() => expect(unregistered).toBe(1));
    });

    it('يُسجّل على الويب بسياسة updateViaCache=none', async () => {
        installServiceWorkerMock({ controlled: false });
        const { registerAppServiceWorker } = await loadModule();

        await registerAppServiceWorker();
        expect(registerCalls).toHaveLength(1);
        expect(registerCalls[0].url).toBe('/sw.js');
        expect(registerCalls[0].options?.updateViaCache).toBe('none');
    });

    it('لا يُكرّر التسجيل عند النداء مرتين', async () => {
        installServiceWorkerMock({ controlled: false });
        const { registerAppServiceWorker } = await loadModule();

        await Promise.all([registerAppServiceWorker(), registerAppServiceWorker()]);
        expect(registerCalls).toHaveLength(1);
    });

    it('صفحة مُدارة منذ البداية لا تُسخَّن — لا تنزيل ثانٍ للقشرة', async () => {
        installServiceWorkerMock({ controlled: true });
        const { registerAppServiceWorker } = await loadModule();

        await registerAppServiceWorker();
        await Promise.resolve();

        expect(postedMessages.filter((m) => (m.data as { type?: string }).type === 'WARM_APP_SHELL')).toHaveLength(0);
        expect(document.documentElement.getAttribute('data-hami-sw-warm-ready')).toBe('1');
    });

    it('أول تحميل غير مُدار يُفوّض التسخين إلى العامل عبر رسالة', async () => {
        const container = installServiceWorkerMock({ controlled: false });
        const { registerAppServiceWorker } = await loadModule();

        const pending = registerAppServiceWorker();
        // يسيطر العامل بعد التسجيل: يُنصَّب المتحكّم ثم يُبَثّ controllerchange.
        container.controller = {
            postMessage: (data: unknown, transfer: unknown[] = []) => {
                postedMessages.push({ data, transfer });
                (transfer[0] as MessagePort | undefined)?.postMessage?.({ ok: true, warmed: 2 });
            },
        } as unknown as ServiceWorker;
        await pending;
        await vi.waitFor(() => {
            expect(document.documentElement.getAttribute('data-hami-sw-warm-ready')).toBe('1');
        });

        const warm = postedMessages.filter((m) => (m.data as { type?: string }).type === 'WARM_APP_SHELL');
        expect(warm).toHaveLength(1);
        expect(Array.isArray((warm[0].data as { urls?: unknown }).urls)).toBe(true);
    });
});

describe('public/sw.js — عقد ثابت لا يُنقض بصمت', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'public/sw.js'), 'utf8');

    it('اسم الذاكرة مختوم عند البناء لا مكتوب باليد', () => {
        expect(source).toContain("const CACHE_VERSION = '__HAMI_SW_CACHE_VERSION__'");
    });

    it('لا يعترض ما لا يخزّنه — إقلاع العامل ليس ضريبة على كل طلب', () => {
        expect(source).toContain('if (!shouldCacheRequest(request)) return;');
    });

    it('لا يستثني ملفات css الجذرية بحجّة وضع التطوير', () => {
        expect(source).not.toContain('isViteDevBypass');
    });

    it('نقرة الإشعار تُقارن الأصل لا السلسلة "/"', () => {
        expect(source).not.toContain("client.url === '/'");
        expect(source).toContain('new URL(client.url).origin === self.location.origin');
    });

    it('لا مزامنة خلفية صورية بلا منطق', () => {
        expect(source).not.toContain('sync-legal-data');
        expect(source).not.toContain('syncLegalData');
    });

    it('الحذف عند التفعيل مقصور على ذاكرات هذا التطبيق', () => {
        expect(source).toContain("name.startsWith('legal-system-')");
    });
});
