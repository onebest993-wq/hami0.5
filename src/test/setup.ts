/**
 * Vitest Setup File
 * إعدادات الاختبارات
 */

import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import fs from 'node:fs';
import path from 'node:path';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

/**
 * وحدات مثل storageCache وRateLimitService تبدأ مؤقّت تنظيف دوري عند استيرادها،
 * وتُنهيه على حدث pagehide. لا يُطلق jsdom ذلك الحدث أبداً، فيبقى المؤقّت حيّاً
 * في كل ملف اختبار يستوردها ولو بشكل غير مباشر — وتتراكم مؤقّتات تُبقي حلقة
 * الأحداث مشغولة فيعجز vitest عن الخروج بعد انتهاء المجموعة.
 *
 * إطلاق الحدث هنا يسلك مسار الإنهاء الذي كُتب في تلك الوحدات نفسها بدل الوصول
 * إلى دواخلها، فيبقى سلوك الإنتاج كما هو.
 */
afterAll(() => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('pagehide'));
});

// Mock environment variables
process.env.NODE_ENV = 'test';
vi.stubEnv('VITE_ENABLE_CLOUD_SYNC', 'true');
vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'false');
vi.stubEnv('VITE_SUPABASE_URL', 'https://test-project-id.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key-with-sufficient-length');

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

// Mock Supabase info (for testing)
vi.mock('@/utils/supabase/info', () => ({
  projectId: 'test-project-id',
  publicAnonKey: 'test-anon-key'
}));

/** يخدم ملفات القوانين العامة من public/ أثناء vitest (jsdom لا يملك خادماً حقيقياً) */
beforeAll(() => {
  const publicRoot = path.join(process.cwd(), 'public');
  const originalFetch = globalThis.fetch?.bind(globalThis);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const href =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const url = new URL(href, 'http://localhost');
    if (url.pathname.startsWith('/static-law-data/')) {
      const filePath = path.join(publicRoot, url.pathname.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        const body = fs.readFileSync(filePath, 'utf8');
        return new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
      }
      return new Response('not found', { status: 404 });
    }
    if (originalFetch) return originalFetch(input, init);
    throw new Error(`fetch not available for ${href}`);
  };
});
