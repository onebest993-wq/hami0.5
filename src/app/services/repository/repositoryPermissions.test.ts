import { describe, it, expect, beforeEach, vi } from 'vitest';

import * as RepoPerms from './repositoryPermissions';

const MOCK_VALID_USER = 'user_valid_001';
const MOCK_OTHER_USER = 'user_other_999';
const MOCK_ADMIN = 'user_admin_001';

function injectSession(userId: string | null, roles: string[] = []): void {
    const SecureStoreService = vi.hoisted(() => ({
        ensurePersistedReady: vi.fn(async () => undefined),
    }));
    (SecureStoreService as unknown as Record<string, unknown>)._sessionUserId = userId;
    (SecureStoreService as unknown as Record<string, unknown>)._sessionRoles = roles;
    vi.doMock('@/app/services/SecureStoreService', () => ({ default: SecureStoreService, __esModule: true }));
}

const TWELVE_PERMS = [
    'canOpenRoom',
    'canRelocateRoom',
    'canUploadVaultDoc',
    'canExtractPdfText',
    'canDownloadBlob',
    'canWipeDossierBackup',
    'canReadSecureStorage',
    'canSyncRemotePaths',
    'canPreviewVaultUrl',
    'canEditDossierNote',
    'canLinkLawArticle',
    'canBootRepositoryHub',
] as const;

describe('Repository Permissions Matrix (12 canXxx)', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    for (const name of TWELVE_PERMS) {
        it(`${name}: returns false when no session user (null)`, async () => {
            injectSession(null, ['repository_viewer']);
            const mod = await import('./repositoryPermissions');
            const fn = mod[name as keyof typeof mod] as (owner?: string | null) => boolean;
            expect(fn()).toBe(false);
        });

        it(`${name}: returns false when owner mismatch (not same user)`, async () => {
            injectSession(MOCK_VALID_USER, ['repository_editor']);
            const mod = await import('./repositoryPermissions');
            const fn = mod[name as keyof typeof mod] as (owner?: string | null) => boolean;
            expect(fn(MOCK_OTHER_USER)).toBe(false);
        });
    }
});

describe('Repository Admin + Editor Role Thresholds', () => {
    beforeEach(() => vi.resetModules());

    it('canWipeDossierBackup: only ADMIN role allowed, editor→false', async () => {
        injectSession(MOCK_ADMIN, ['repository_editor']);
        const mod = await import('./repositoryPermissions');
        expect(mod.canWipeDossierBackup(MOCK_ADMIN)).toBe(false);
    });

    it('canWipeDossierBackup: admin role + owner match → true', async () => {
        injectSession(MOCK_ADMIN, ['repository_admin']);
        const mod = await import('./repositoryPermissions');
        expect(mod.canWipeDossierBackup(MOCK_ADMIN)).toBe(true);
    });

    it('canOpenRoom: viewer + owner match → true (viewer allowed)', async () => {
        injectSession(MOCK_VALID_USER, ['repository_viewer']);
        const mod = await import('./repositoryPermissions');
        expect(mod.canOpenRoom(MOCK_VALID_USER)).toBe(true);
    });

    it('canRelocateRoom: viewer + owner match → false (editor minimum)', async () => {
        injectSession(MOCK_VALID_USER, ['repository_viewer']);
        const mod = await import('./repositoryPermissions');
        expect(mod.canRelocateRoom(MOCK_VALID_USER)).toBe(false);
    });

    it('12 canXxx exports total count equals 12', () => {
        const exported = Object.keys(RepoPerms).filter((k) => k.startsWith('can'));
        expect(exported).toHaveLength(12);
    });
});
