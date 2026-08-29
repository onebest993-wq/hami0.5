/**
 * Capacitor × WIFE — فحص تحضيري (بدون UI، بدون جهاز حقيقي).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getOrCreateDeviceId, resetDeviceIdForTests } from '@/app/security/deviceId';
import { attachWifeClientHeaders } from '@/app/services/secureApiWifeSigning';

const ROOT = path.resolve(process.cwd());
const CAP_CONFIG = path.join(ROOT, 'capacitor.config.ts');

describe('Capacitor WIFE security prep', () => {
  it('capacitor.config — https scheme و no mixed content', () => {
    const src = fs.readFileSync(CAP_CONFIG, 'utf8');
    expect(src).toMatch(/androidScheme:\s*['"]https['"]/);
    expect(src).toMatch(/allowMixedContent:\s*false/);
  });

  it('capacitor.config — Keyboard resizeOnFullScreen (موبايل)', () => {
    const src = fs.readFileSync(CAP_CONFIG, 'utf8');
    expect(src).toMatch(/resizeOnFullScreen:\s*true/);
  });

  it('PrivacyScreen — مفعّل من الإقلاع (FLAG_SECURE / شاشة المهام)', () => {
    const src = fs.readFileSync(CAP_CONFIG, 'utf8');
    expect(src).toContain('PrivacyScreen');
    expect(src).toMatch(/enable:\s*true/);
    expect(src).toMatch(/preventScreenshots:\s*true/);
  });

  it('SecureAPIClient يرسل x-wife-device-id على native WebView path', async () => {
    resetDeviceIdForTests();
    localStorage.clear();
    const deviceId = getOrCreateDeviceId();
    expect(deviceId).toMatch(/^[a-f0-9]{32}$/);

    const headers = await attachWifeClientHeaders({
      resolvedUrl: 'http://localhost/api/forum/status',
      method: 'GET',
      wireBody: null,
      nextHeaders: {},
      token: 'dev-access-token-guest-lawyer-1',
      bffMode: false,
      authPaused: false,
    });
    expect(new Headers(headers).get('x-wife-device-id')).toBe(deviceId);
  });

  it('capacitorShellBoot يفعّل native security wiring', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src', 'app', 'runtime', 'capacitorShellBoot.ts'),
      'utf8',
    );
    expect(src).toContain('wireNativeSecuritySettingsListener');
    expect(src).toContain('applyCapacitorNativePlugins');
  });
});
