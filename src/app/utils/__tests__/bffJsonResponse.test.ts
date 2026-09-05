import { describe, expect, it } from 'vitest';
import { parseJsonResponse } from '@/app/utils/bffJsonResponse';

describe('parseJsonResponse', () => {
    it('يعيد الكائن عند JSON صالح', async () => {
        const response = new Response(JSON.stringify({ ok: true, n: 3 }), {
            headers: { 'Content-Type': 'application/json' },
        });
        await expect(parseJsonResponse<{ ok: boolean; n: number }>(response)).resolves.toEqual({
            ok: true,
            n: 3,
        });
    });

    it('يعيد كائناً فارغاً عند جسم فارغ أو فاسد — بلا رمي', async () => {
        await expect(parseJsonResponse(new Response(''))).resolves.toEqual({});
        await expect(parseJsonResponse(new Response('{not-json'))).resolves.toEqual({});
        await expect(parseJsonResponse(new Response('null'))).resolves.toBeNull();
    });
});
