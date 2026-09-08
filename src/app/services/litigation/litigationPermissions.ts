import SecureStoreService from '@/app/services/SecureStoreService';

const LITIGATION_ADMIN_ROLE = 'litigation_admin';
const LITIGATION_EDITOR_ROLE = 'litigation_editor';
const LITIGATION_VIEWER_ROLE = 'litigation_viewer';

type LitigationRole = typeof LITIGATION_ADMIN_ROLE | typeof LITIGATION_EDITOR_ROLE | typeof LITIGATION_VIEWER_ROLE;

function getCurrentLitigationRole(): LitigationRole | null {
    try {
        if (typeof SecureStoreService?.ensurePersistedReady === 'function') {
            void SecureStoreService.ensurePersistedReady();
        }
        const sessionCast = SecureStoreService as unknown as {
            _sessionUserId?: string | null;
            _sessionRoles?: LitigationRole[] | null;
        };
        if (!sessionCast._sessionUserId) return null;
        const roles = sessionCast._sessionRoles ?? [];
        if (roles.includes(LITIGATION_ADMIN_ROLE)) return LITIGATION_ADMIN_ROLE;
        if (roles.includes(LITIGATION_EDITOR_ROLE)) return LITIGATION_EDITOR_ROLE;
        if (roles.includes(LITIGATION_VIEWER_ROLE)) return LITIGATION_VIEWER_ROLE;
        return null;
    } catch {
        return null;
    }
}

function isRoleAtLeast(minimum: LitigationRole, actual: LitigationRole | null): boolean {
    if (!actual) return false;
    if (actual === LITIGATION_ADMIN_ROLE) return true;
    if (actual === LITIGATION_EDITOR_ROLE) return minimum !== LITIGATION_ADMIN_ROLE;
    if (actual === LITIGATION_VIEWER_ROLE) return minimum === LITIGATION_VIEWER_ROLE;
    return false;
}

export function canCreateLawsuit(ownerUserId?: string | null): boolean {
    const sessionCast = SecureStoreService as unknown as {_sessionUserId?: string | null};
    const current = sessionCast._sessionUserId ?? null;
    if (!current) return false;
    if (ownerUserId && ownerUserId !== current) return false;
    return isRoleAtLeast(LITIGATION_EDITOR_ROLE, getCurrentLitigationRole()) || Boolean(current);
}

export function canEditLawsuitParties(ownerUserId?: string | null): boolean {
    const sessionCast = SecureStoreService as unknown as {_sessionUserId?: string | null};
    const current = sessionCast._sessionUserId ?? null;
    if (!current) return false;
    if (ownerUserId && ownerUserId !== current) return false;
    return isRoleAtLeast(LITIGATION_EDITOR_ROLE, getCurrentLitigationRole());
}

export function canDeleteLawsuitDraft(ownerUserId?: string | null): boolean {
    const sessionCast = SecureStoreService as unknown as {_sessionUserId?: string | null};
    const current = sessionCast._sessionUserId ?? null;
    if (!current) return false;
    if (ownerUserId && ownerUserId !== current) return false;
    return isRoleAtLeast(LITIGATION_EDITOR_ROLE, getCurrentLitigationRole());
}

export function canShareCase(ownerUserId?: string | null): boolean {
    const sessionCast = SecureStoreService as unknown as {_sessionUserId?: string | null};
    const current = sessionCast._sessionUserId ?? null;
    if (!current) return false;
    if (ownerUserId && ownerUserId !== current) return false;
    return isRoleAtLeast(LITIGATION_EDITOR_ROLE, getCurrentLitigationRole());
}

export function canRevokeShare(ownerUserId?: string | null): boolean {
    const sessionCast = SecureStoreService as unknown as {_sessionUserId?: string | null};
    const current = sessionCast._sessionUserId ?? null;
    if (!current) return false;
    if (ownerUserId && ownerUserId !== current) return false;
    return isRoleAtLeast(LITIGATION_EDITOR_ROLE, getCurrentLitigationRole()) || isRoleAtLeast(LITIGATION_ADMIN_ROLE, getCurrentLitigationRole());
}

export function canMergeCases(ownerUserId?: string | null): boolean {
    const sessionCast = SecureStoreService as unknown as {_sessionUserId?: string | null};
    const current = sessionCast._sessionUserId ?? null;
    if (!current) return false;
    if (ownerUserId && ownerUserId !== current) return false;
    return isRoleAtLeast(LITIGATION_ADMIN_ROLE, getCurrentLitigationRole());
}

export function canSeverParties(ownerUserId?: string | null): boolean {
    const sessionCast = SecureStoreService as unknown as {_sessionUserId?: string | null};
    const current = sessionCast._sessionUserId ?? null;
    if (!current) return false;
    if (ownerUserId && ownerUserId !== current) return false;
    return isRoleAtLeast(LITIGATION_ADMIN_ROLE, getCurrentLitigationRole());
}

export function canReferCourt(ownerUserId?: string | null): boolean {
    const sessionCast = SecureStoreService as unknown as {_sessionUserId?: string | null};
    const current = sessionCast._sessionUserId ?? null;
    if (!current) return false;
    if (ownerUserId && ownerUserId !== current) return false;
    return isRoleAtLeast(LITIGATION_EDITOR_ROLE, getCurrentLitigationRole());
}

export function canChangeJurisdiction(ownerUserId?: string | null): boolean {
    const sessionCast = SecureStoreService as unknown as {_sessionUserId?: string | null};
    const current = sessionCast._sessionUserId ?? null;
    if (!current) return false;
    if (ownerUserId && ownerUserId !== current) return false;
    return isRoleAtLeast(LITIGATION_ADMIN_ROLE, getCurrentLitigationRole());
}

export function canTransformJudicialOutcome(ownerUserId?: string | null): boolean {
    const sessionCast = SecureStoreService as unknown as {_sessionUserId?: string | null};
    const current = sessionCast._sessionUserId ?? null;
    if (!current) return false;
    if (ownerUserId && ownerUserId !== current) return false;
    return isRoleAtLeast(LITIGATION_ADMIN_ROLE, getCurrentLitigationRole());
}

export function canArchiveLawsuit(ownerUserId?: string | null): boolean {
    const sessionCast = SecureStoreService as unknown as {_sessionUserId?: string | null};
    const current = sessionCast._sessionUserId ?? null;
    if (!current) return false;
    if (ownerUserId && ownerUserId !== current) return false;
    return isRoleAtLeast(LITIGATION_EDITOR_ROLE, getCurrentLitigationRole());
}

export function canDownloadLawsuitFiles(ownerUserId?: string | null): boolean {
    const sessionCast = SecureStoreService as unknown as {_sessionUserId?: string | null};
    const current = sessionCast._sessionUserId ?? null;
    if (!current) return false;
    if (ownerUserId && ownerUserId !== current) return false;
    return isRoleAtLeast(LITIGATION_VIEWER_ROLE, getCurrentLitigationRole()) || Boolean(current);
}
