import { describe, expect, it } from 'vitest';
import { requirePlatformAdmin } from './lawsAdminAuth.ts';

describe('lawsAdminAuth', () => {
  it('resolves security imports and exports requirePlatformAdmin', () => {
    expect(typeof requirePlatformAdmin).toBe('function');
  });
});
