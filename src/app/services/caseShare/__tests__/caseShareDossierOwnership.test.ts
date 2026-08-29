/**
 * تحقق ملكية CaseShare على الخادم — criminal عبر criminal_case_ownership
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const maybeSingle = vi.fn();
const eq2 = vi.fn(() => ({ maybeSingle }));
const eq1 = vi.fn(() => ({ eq: eq2 }));
const select = vi.fn(() => ({ eq: eq1 }));
const from = vi.fn(() => ({ select }));
const getSupabaseAdminClient = vi.fn(() => ({ from }));

vi.mock('@/app/api/security/supabaseAdminClient', () => ({
    getSupabaseAdminClient: (...args: unknown[]) => getSupabaseAdminClient(...args),
}));

import {
    assertShareSourceOwnedByUser,
    isServerShareCreateAllowed,
    ShareSourceOwnershipError,
    verifyCriminalRowOnServer,
} from '../caseShareDossierOwnership';
import type { DossierShareSource } from '../caseShareTypes';

const OWNER = '11111111-1111-4111-8111-111111111111';
const DOSSIER = 'crim-case-1';

function criminalSource(overrides?: Partial<DossierShareSource>): DossierShareSource {
    return {
        module: 'criminal',
        dossierId: DOSSIER,
        title: 'قضية جزائية',
        ...overrides,
    };
}

describe('caseShareDossierOwnership — criminal server verify', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        maybeSingle.mockResolvedValue({ data: { external_id: DOSSIER }, error: null });
        getSupabaseAdminClient.mockReturnValue({ from });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('isServerShareCreateAllowed يسمح بالجزائي عند وجود module و dossierId', () => {
        expect(isServerShareCreateAllowed(criminalSource())).toBe(true);
        expect(isServerShareCreateAllowed(criminalSource({ dossierId: '  ' }))).toBe(false);
    });

    it('verifyCriminalRowOnServer يعيد true عند وجود صف للمالك', async () => {
        await expect(verifyCriminalRowOnServer(OWNER, DOSSIER)).resolves.toBe(true);
        expect(from).toHaveBeenCalledWith('criminal_case_ownership');
        expect(eq1).toHaveBeenCalledWith('user_id', OWNER);
        expect(eq2).toHaveBeenCalledWith('external_id', DOSSIER);
    });

    it('verifyCriminalRowOnServer يعيد false عند غياب الصف', async () => {
        maybeSingle.mockResolvedValue({ data: null, error: null });
        await expect(verifyCriminalRowOnServer(OWNER, DOSSIER)).resolves.toBe(false);
    });

    it('verifyCriminalRowOnServer يعيد false عند خطأ الاستعلام', async () => {
        maybeSingle.mockResolvedValue({ data: null, error: { message: 'db' } });
        await expect(verifyCriminalRowOnServer(OWNER, DOSSIER)).resolves.toBe(false);
    });

    it('verifyCriminalRowOnServer يعيد false عند غياب عميل الإدارة', async () => {
        getSupabaseAdminClient.mockReturnValue(null);
        await expect(verifyCriminalRowOnServer(OWNER, DOSSIER)).resolves.toBe(false);
    });

    it('assertShareSourceOwnedByUser على الخادم يمرّ للجزائي عند وجود الصف', async () => {
        const win = globalThis.window;
        // @ts-expect-error force server path
        delete globalThis.window;
        try {
            await expect(
                assertShareSourceOwnedByUser(OWNER, criminalSource()),
            ).resolves.toBeUndefined();
            expect(from).toHaveBeenCalledWith('criminal_case_ownership');
        } finally {
            globalThis.window = win;
        }
    });

    it('assertShareSourceOwnedByUser على الخادم يرفض الجزائي بلا صف', async () => {
        maybeSingle.mockResolvedValue({ data: null, error: null });
        const win = globalThis.window;
        // @ts-expect-error force server path
        delete globalThis.window;
        try {
            await expect(assertShareSourceOwnedByUser(OWNER, criminalSource())).rejects.toBeInstanceOf(
                ShareSourceOwnershipError,
            );
        } finally {
            globalThis.window = win;
        }
    });
});
