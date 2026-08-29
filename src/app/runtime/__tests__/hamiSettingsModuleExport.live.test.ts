import { describe, expect, it } from 'vitest';

describe('HamiSettings module export (unmocked)', () => {
    it('dynamic import resolves a HamiSettings function', async () => {
        const mod = await import('@/app/components/lawyer/HamiSettings/index');
        expect(typeof mod.HamiSettings).toBe('function');
    }, 60_000);
});
