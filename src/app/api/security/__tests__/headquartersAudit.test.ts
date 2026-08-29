import { beforeEach, describe, expect, it, vi } from 'vitest';

const { insertMock, getClientMock } = vi.hoisted(() => ({
    insertMock: vi.fn(),
    getClientMock: vi.fn(),
}));

vi.mock('../supabaseAdminClient.ts', () => ({
    getSupabaseAdminClient: (...a: unknown[]) => getClientMock(...a),
}));

import { recordHeadquartersAudit } from '../headquartersAudit.ts';

describe('recordHeadquartersAudit', () => {
    beforeEach(() => {
        insertMock.mockReset();
        getClientMock.mockReturnValue({
            from: () => ({ insert: insertMock }),
        });
    });

    it('يعدّ خطأ الإدراج فشلاً ولا يبتلعه', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        insertMock.mockResolvedValue({ error: { message: 'insert denied' } });
        const ok = await recordHeadquartersAudit({
            actorId: '11111111-2222-4333-8444-555555555555',
            action: 'user.freeze',
            targetId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        });
        expect(ok).toBe(false);
        expect(errorSpy).toHaveBeenCalledWith('[hq-audit] insert failed', '');
        errorSpy.mockRestore();
    });

    it('يعدّ الإدراج بلا خطأ نجاحاً', async () => {
        insertMock.mockResolvedValue({ error: null });
        const ok = await recordHeadquartersAudit({
            actorId: '11111111-2222-4333-8444-555555555555',
            action: 'user.freeze',
        });
        expect(ok).toBe(true);
        expect(insertMock).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'hq:user.freeze',
                user_id: '11111111-2222-4333-8444-555555555555',
            }),
        );
    });
});
