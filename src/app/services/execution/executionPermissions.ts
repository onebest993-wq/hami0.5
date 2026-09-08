import SecureStoreService from '@/app/services/SecureStoreService';

const EXECUTION_VIEWER_ROLE = 'execution_viewer';
const EXECUTION_EDITOR_ROLE = 'execution_editor';
const EXECUTION_ADMIN_ROLE = 'execution_admin';

type ExecutionRole = typeof EXECUTION_VIEWER_ROLE | typeof EXECUTION_EDITOR_ROLE | typeof EXECUTION_ADMIN_ROLE;

function getCurrentExecutionSession(): { userId: string | null; roles: ExecutionRole[] } {
    try {
        if (typeof SecureStoreService?.ensurePersistedReady === 'function') {
            void SecureStoreService.ensurePersistedReady();
        }
        const sessionCast = SecureStoreService as unknown as {
            _sessionUserId?: string | null;
            _sessionRoles?: ExecutionRole[] | null;
        };
        return {
            userId: sessionCast._sessionUserId ?? null,
            roles: sessionCast._sessionRoles ?? [],
        };
    } catch {
        return { userId: null, roles: [] };
    }
}

function hasRoleAtLeast(minimum: ExecutionRole, roles: ExecutionRole[]): boolean {
    if (roles.includes(EXECUTION_ADMIN_ROLE)) return true;
    if (roles.includes(EXECUTION_EDITOR_ROLE)) return minimum !== EXECUTION_ADMIN_ROLE;
    if (roles.includes(EXECUTION_VIEWER_ROLE)) return minimum === EXECUTION_VIEWER_ROLE;
    return false;
}

export function canCreateExecution(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentExecutionSession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(EXECUTION_EDITOR_ROLE, roles) || Boolean(userId);
}

export function canEditExecutionParties(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentExecutionSession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(EXECUTION_EDITOR_ROLE, roles) || Boolean(userId);
}

export function canDeleteExecutionDraft(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentExecutionSession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(EXECUTION_EDITOR_ROLE, roles) || Boolean(userId);
}

export function canAddSeizureOutcome(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentExecutionSession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(EXECUTION_EDITOR_ROLE, roles) || Boolean(userId);
}

export function canApplySpecialFollowup(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentExecutionSession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(EXECUTION_EDITOR_ROLE, roles) || Boolean(userId);
}

export function canRaiseExecutionAppeal(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentExecutionSession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(EXECUTION_EDITOR_ROLE, roles) || Boolean(userId);
}

export function canManageExecutionFinancials(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentExecutionSession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(EXECUTION_EDITOR_ROLE, roles) || Boolean(userId);
}

export function canIssueExecutionSummons(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentExecutionSession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(EXECUTION_EDITOR_ROLE, roles) || Boolean(userId);
}

export function canAccessExecutionArchive(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentExecutionSession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(EXECUTION_VIEWER_ROLE, roles) || Boolean(userId);
}

export function canModifyGuarantorDetails(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentExecutionSession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(EXECUTION_EDITOR_ROLE, roles) || Boolean(userId);
}

export function canEvictTenantExecution(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentExecutionSession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(EXECUTION_EDITOR_ROLE, roles) || Boolean(userId);
}

export function canDownloadExecutionFiles(ownerUserId?: string | null): boolean {
    const { userId, roles } = getCurrentExecutionSession();
    if (!userId) return false;
    if (ownerUserId && ownerUserId !== userId) return false;
    return hasRoleAtLeast(EXECUTION_VIEWER_ROLE, roles) || Boolean(userId);
}
