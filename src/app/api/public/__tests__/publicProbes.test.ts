import { afterEach, describe, expect, it } from 'vitest';
import { GET as healthz } from '@/app/api/public/healthz/route.ts';
import { GET as readyz } from '@/app/api/public/readyz/route.ts';

const originalNodeEnv = process.env.NODE_ENV;

describe('public probe disclosure', () => {
    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
    });

    it('omits commit and env from healthz in production', async () => {
        process.env.NODE_ENV = 'production';
        const res = await healthz();
        const body = (await res.json()) as Record<string, unknown>;
        expect(body.ok).toBe(true);
        expect(body.commit).toBeUndefined();
        expect(body.env).toBeUndefined();
    });

    it('omits infra checks from readyz in production', async () => {
        process.env.NODE_ENV = 'production';
        const res = await readyz();
        const body = (await res.json()) as Record<string, unknown>;
        expect(body.checks).toBeUndefined();
        expect(typeof body.ok).toBe('boolean');
    });
});
