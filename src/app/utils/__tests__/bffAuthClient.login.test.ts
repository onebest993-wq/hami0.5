import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
    resetWifeNativeFetchForTests,
    setWifeNativeFetchForTests,
} from '@/app/security/wifeNativeFetch';
import { resetDeviceIdForTests } from '@/app/security/deviceId';
import { bffLogin, resetBffSessionKeeperForTests } from '@/app/utils/bffAuthClient';

describe('bffLogin', () => {
    beforeEach(() => {
        resetWifeNativeFetchForTests();
        resetDeviceIdForTests();
        resetBffSessionKeeperForTests();
    });

    afterEach(() => {
        resetBffSessionKeeperForTests();
        resetWifeNativeFetchForTests();
        resetDeviceIdForTests();
        vi.restoreAllMocks();
    });

    it('imports getOrCreateDeviceId instead of throwing at login', () => {
        const src = fs.readFileSync(path.join(process.cwd(), 'src/app/utils/bffAuthClient.ts'), 'utf8');
        expect(src).toMatch(/import \{ getOrCreateDeviceId \} from '@\/app\/security\/deviceId'/);
    });

    it('POSTs /api/auth/login with a device header', async () => {
        const nativeFetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ ok: true, user: { id: 'u1', email: 'a@b.c' } }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        );
        setWifeNativeFetchForTests(nativeFetch);

        const user = await bffLogin('a@b.c', 'secret');
        expect(user.id).toBe('u1');
        expect(nativeFetch).toHaveBeenCalledTimes(1);
        const [, init] = nativeFetch.mock.calls[0] as [string, RequestInit];
        const headers = new Headers(init.headers);
        expect(headers.get('x-wife-device-id')).toMatch(/^[0-9a-f]{32}$/);
    });
});
