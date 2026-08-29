import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getOrCreateDeviceId, resetDeviceIdForTests } from '@/app/security/deviceId.ts';

describe('deviceId', () => {
  beforeEach(() => {
    resetDeviceIdForTests();
  });

  afterEach(() => {
    resetDeviceIdForTests();
  });

  it('returns a stable 32-char hex id in browser context', () => {
    const a = getOrCreateDeviceId();
    const b = getOrCreateDeviceId();
    expect(a).toMatch(/^[a-f0-9]{32}$/);
    expect(a).toBe(b);
  });

  it('still returns stable id when localStorage is blocked', () => {
    const original = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
      if (key === 'hami_device_id') throw new Error('blocked');
      return original(key, value);
    });

    const a = getOrCreateDeviceId();
    const b = getOrCreateDeviceId();
    expect(a).toMatch(/^[a-f0-9]{32}$/);
    expect(a).toBe(b);
  });

  it('يعيد نفس المعرّف من الكوكي إذا فُرغ localStorage', () => {
    const first = getOrCreateDeviceId();
    localStorage.removeItem('hami_device_id');
    sessionStorage.removeItem('hami_device_id');
    resetDeviceIdForTests();
    document.cookie = `hami_device_id=${first}; path=/`;
    expect(getOrCreateDeviceId()).toBe(first);
  });
});
