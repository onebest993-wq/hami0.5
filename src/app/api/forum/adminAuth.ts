import { UserRole } from '../../types/admin-types.ts';
import {
  isForumModeratorUserId,
  resolveForumRoleForUser,
} from '../security/roleResolver.ts';

export async function canManageForumAdmin(userId: string): Promise<boolean> {
  return isForumModeratorUserId(userId);
}

export async function getForumRoleForUser(userId: string): Promise<UserRole | null> {
  return resolveForumRoleForUser(userId);
}
