import type { AdminUser, AdminUserRole } from '@/app/domain/admin/AdminUser';
import type { HqAccountActivity } from '@/app/domain/admin/HqAccountActivity';
import type { HqDirectoryListQuery } from '@/app/domain/admin/hqDirectoryQuery';

/**
 * عقد مستودع الإدارة — طبقة النواة (Clean Architecture).
 * التنفيذ الفعلي يعيش في طبقة البيانات دون تسريب تفاصيل Supabase إلى العرض.
 */
export abstract class IAdminRepository {
    abstract fetchDirectory(
        signal?: AbortSignal,
        query?: HqDirectoryListQuery,
    ): Promise<{
        users: AdminUser[];
        capped: boolean;
        matched: number;
        usersTotal: number;
        hasMore: boolean;
        matchedExact: boolean;
        offset: number;
        limit: number;
    }>;

    async fetchAllUsers(): Promise<AdminUser[]> {
        return (await this.fetchDirectory()).users;
    }

    /**
     * يغيّر دور المستخدم ضمن الأدوار القابلة للتعيين عن بعد (بدون ترقية admin).
     */
    abstract changeUserRole(userId: string, role: AdminUserRole): Promise<AdminUser>;

    abstract freezeAccount(userId: string, durationHours: 0 | 24 | 72 | 168): Promise<AdminUser>;

    abstract unfreezeAccount(userId: string): Promise<AdminUser>;

    abstract revokeUserSessions(userId: string): Promise<AdminUser | null>;

    abstract setUserPassword(userId: string, password: string): Promise<AdminUser | null>;

    abstract sendSystemNotice(input: {
        scope: 'all' | 'users';
        userIds?: string[];
        title: string;
        message: string;
    }): Promise<{ sent: number; failed: number; capped: boolean }>;

    abstract lockLogin(userId: string, durationHours: 0 | 24 | 72 | 168): Promise<AdminUser>;

    abstract unlockLogin(userId: string): Promise<AdminUser>;

    abstract softDeleteAccount(userId: string): Promise<AdminUser>;

    abstract restoreAccount(userId: string): Promise<AdminUser>;

    abstract banForum(userId: string, reason: string, durationHours?: 0 | 24 | 72 | 168): Promise<AdminUser>;

    abstract unbanForum(userId: string): Promise<AdminUser>;

    abstract setPublicVerifiedBadge(userId: string, shown: boolean): Promise<AdminUser>;

    abstract fetchAccountActivity(userId: string, signal?: AbortSignal): Promise<{
        user: AdminUser;
        activity: HqAccountActivity;
    }>;
}
