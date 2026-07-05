/**
 * Server-side role resolution — NEVER trust JWT user_metadata for privileges.
 * Sources: ADMIN_UUID env, profiles.role (admin | moderator).
 */
import { UserRole } from '@/app/types/admin-types';
/** Test-only */
export declare function resetRoleResolverCacheForTests(): void;
export declare function getConfiguredAdminUuid(): string;
export declare function getProfileRole(userId: string): Promise<string | null>;
export declare function isPlatformAdminUserId(userId: string): Promise<boolean>;
export declare function isForumModeratorUserId(userId: string): Promise<boolean>;
export declare function resolveForumRoleForUser(userId: string): Promise<UserRole | null>;
