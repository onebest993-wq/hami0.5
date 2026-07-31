/**
 * Playwright Configuration
 * إعدادات اختبارات E2E
 * @version 1.0.0
 */

import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'fs';

const distReady = existsSync('dist/index.html');

/** بعد `npm run build` — يتجنّب إعادة استخدام dev server معطوب/قديم */
const usePreview =
    process.env.E2E_USE_PREVIEW === '1' ||
    process.env.E2E_USE_PREVIEW === 'true' ||
    (process.env.E2E_USE_PREVIEW !== '0' && distReady);
const previewPort = process.env.E2E_PREVIEW_PORT ?? '8090';
const baseURL = usePreview ? `http://127.0.0.1:${previewPort}` : 'http://localhost:8080';
const skipWebServer = process.env.E2E_SKIP_WEBSERVER === '1';

export default defineConfig({
  testDir: './e2e',
  
    /* Maximum time one test can run for */
    timeout: 30 * 1000,
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry: مرة محلياً للتزامن؛ مرتان على CI */
  retries: process.env.CI ? 2 : Number(process.env.PW_RETRIES ?? 1),

  /* workers: افتراضي متوازي محلياً؛ CI=1. استخدم PW_WORKERS=1 عند تذبذب dev server */
  workers: process.env.CI ? 1 : process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : undefined,
  
  /* Reporter to use */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  
  /* Shared settings for all the projects below */
  use: {
    baseURL,
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
    
    /* Locale */
    locale: 'ar-IQ',
    
    /* Timezone */
    timezoneId: 'Asia/Baghdad',
  },

  /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 7'] },
        },
        {
            name: 'mobile-safari',
            use: { ...devices['iPhone 14'] },
        },
    /* تشغيل المتصفحات الأخرى يدوياً: npx playwright test --project=firefox */
    ...(process.env.CI
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],

  /* dev للتطوير؛ preview بعد build لبوابات الإصدار (E2E_USE_PREVIEW=1) */
  ...(skipWebServer
    ? {}
    : {
          webServer: usePreview
              ? {
                    command: `npm run preview -- --port ${previewPort} --host 127.0.0.1 --strictPort`,
                    url: baseURL,
                    reuseExistingServer: true,
                    timeout: 120 * 1000,
                }
              : {
                    command: 'npm run dev',
                    url: 'http://localhost:8080',
                    reuseExistingServer: !process.env.CI,
                    timeout: 120 * 1000,
                },
      }),
});
