import type { AdminUser } from '@/app/domain/admin/AdminUser';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
    isHeadquartersAdminRole,
    isHeadquartersProtectedAdminId,
} from './headquartersUserMap.ts';
import { fetchHeadquartersUser } from './headquartersUsers.ts';
import { isPostgresUuidSubject } from './postgresUuidSubject.ts';

export type HeadquartersControlTarget =
    | { ok: true; user: AdminUser | null }
    | { ok: false; status: number; error: string };

export function rejectHeadquartersTargetId(
    targetUserId: string,
    actorId: string,
    options: { allowSelf?: boolean } = {},
): { status: number; error: string } | null {
    if (!isPostgresUuidSubject(targetUserId)) {
        return { status: 400, error: 'targetUserId مطلوب' };
    }
    if (!options.allowSelf && targetUserId === actorId) {
        return { status: 400, error: 'لا يمكن تعديل الحساب الحالي بهذا المسار' };
    }
    if (isHeadquartersProtectedAdminId(targetUserId)) {
        return { status: 403, error: 'لا يمكن تعديل مدير المنصّة' };
    }
    return null;
}

/**
 * هدف سيطرة المقر: UUID حيّ، ليس الفاعل، ليس مدير المنصّة، ليس role=admin.
 * `allowMissing` لرفع حظر يتيم بعد اختفاء الصف.
 */
export async function resolveHeadquartersControlTarget(
    admin: SupabaseClient,
    targetUserId: string,
    actorId: string,
    options: { allowMissing?: boolean } = {},
): Promise<HeadquartersControlTarget> {
    const rejected = rejectHeadquartersTargetId(targetUserId, actorId);
    if (rejected) return { ok: false, ...rejected };
    const user = await fetchHeadquartersUser(admin, targetUserId);
    if (!user) {
        if (options.allowMissing) return { ok: true, user: null };
        return { ok: false, status: 404, error: 'المستخدم غير موجود' };
    }
    if (isHeadquartersAdminRole(user.role)) {
        return { ok: false, status: 403, error: 'لا يمكن تعديل حساب إدارة' };
    }
    return { ok: true, user };
}
