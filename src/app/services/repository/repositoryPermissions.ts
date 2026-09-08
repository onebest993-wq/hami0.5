import SecureStoreService from '@/app/services/SecureStoreService';

const REPOSITORY_VIEWER_ROLE = 'repository_viewer';
const REPOSITORY_EDITOR_ROLE = 'repository_editor';
const REPOSITORY_ADMIN_ROLE = 'repository_admin';

type RepositoryRole = typeof REPOSITORY_VIEWER_ROLE | typeof REPOSITORY_EDITOR_ROLE | typeof REPOSITORY_ADMIN_ROLE;

function getCurrentRepositorySession(): { userId: string | null; roles: RepositoryRole[] } {
    try {
        if (typeof SecureStoreService?.ensurePersistedReady === 'function') {
            void SecureStoreService.ensurePersistedReady();
        }
        const sessionCast = SecureStoreService as unknown as {
            _sessionUserId?: string | null;
            _sessionRoles?: RepositoryRole[] | null;
        };
        return {
            userId: sessionCast._sessionUserId ?? null,
            roles: sessionCast._sessionRoles ?? [],
        };
    } catch {
        return { userId: null, roles: [] };
    }
}

function hasRoleAtLeast(minimum: RepositoryRole, roles: RepositoryRole[]): boolean {
    if (roles.includes(REPOSITORY_ADMIN_ROLE)) return true;
    if (roles.includes(REPOSITORY_EDITOR_ROLE)) return minimum !== REPOSITORY_ADMIN_ROLE;
    if (roles.includes(REPOSITORY_VIEWER_ROLE)) return minimum === REPOSITORY_VIEWER_ROLE;
    return false;
}

export function canOpenRoom(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentRepositorySession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(REPOSITORY_VIEWER_ROLE, roles) || Boolean(userId);
}

export function canRelocateRoom(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentRepositorySession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(REPOSITORY_EDITOR_ROLE, roles);
}

export function canUploadVaultDoc(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentRepositorySession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(REPOSITORY_EDITOR_ROLE, roles) || Boolean(userId);
}

export function canExtractPdfText(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentRepositorySession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(REPOSITORY_EDITOR_ROLE, roles) || Boolean(userId);
}

export function canDownloadBlob(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentRepositorySession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(REPOSITORY_VIEWER_ROLE, roles) || Boolean(userId);
}

export function canWipeDossierBackup(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentRepositorySession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(REPOSITORY_ADMIN_ROLE, roles);
}

export function canReadSecureStorage(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentRepositorySession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(REPOSITORY_VIEWER_ROLE, roles) || Boolean(userId);
}

export function canSyncRemotePaths(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentRepositorySession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(REPOSITORY_EDITOR_ROLE, roles);
}

export function canPreviewVaultUrl(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentRepositorySession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(REPOSITORY_VIEWER_ROLE, roles) || Boolean(userId);
}

export function canEditDossierNote(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentRepositorySession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(REPOSITORY_EDITOR_ROLE, roles) || Boolean(userId);
}

export function canLinkLawArticle(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentRepositorySession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(REPOSITORY_EDITOR_ROLE, roles);
}

export function canBootRepositoryHub(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentRepositorySession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(REPOSITORY_VIEWER_ROLE, roles) || Boolean(userId);
}
