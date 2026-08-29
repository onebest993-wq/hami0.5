/**
 * نقاط دخول خفيفة لـ hooks المصادقة — تُستخدم من المكوّنات lazy
 * دون سحب AuthProvider من AuthContext.tsx إلى مسار الهيدر/الإقلاع.
 *
 * السياق: authContextStore.ts
 * الأدوات: authRoleUtils.ts
 */
import { useContext, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import {
    AuthContext,
    type AuthContextType,
} from '@/app/context/authContextStore';
import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';
import { resolveDevMockLawyerUser } from '@/app/services/auth/devMockLawyerAuth';
import { userHasRole } from '@/app/context/authRoleUtils';

export { userHasRole, isSuperAdminUser } from '@/app/context/authRoleUtils';

/** جذر التطبيق — لا يرمي خارج AuthProvider (مقاوم لانقطاع HMR) */
export function useAppRootAuth(): Pick<AuthContextType, 'user' | 'isLoading' | 'logout'> {
    const context = useContext(AuthContext);
    return useMemo(() => {
        if (context !== undefined) {
            return { user: context.user, isLoading: context.isLoading, logout: context.logout };
        }
        const persisted = readPersistedSupabaseAuth();
        const user = resolveDevMockLawyerUser(persisted.user);
        return {
            user,
            isLoading: false,
            logout: async () => {
                const runtime = await import('@/app/context/authProviderRuntime');
                await runtime.performRootAuthLogout();
            },
        };
    }, [context]);
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}

/** للمكوّنات lazy — لا يرمي إذا انفصل الـ context بسبب تقسيم الحزم/HMR */
export function useAuthUser(): User | null {
    const context = useContext(AuthContext);
    if (context !== undefined) return context.user;
    return resolveDevMockLawyerUser(readPersistedSupabaseAuth().user);
}

/** للمكوّنات lazy — user + hasRole + isLoading دون رمي خارج AuthProvider */
export function useAuthSafe(): {
    user: User | null;
    isLoading: boolean;
    hasRole: (role: 'lawyer' | 'admin') => boolean;
} {
    const context = useContext(AuthContext);
    const persistedUser = context === undefined ? readPersistedSupabaseAuth().user : null;
    const user = resolveDevMockLawyerUser(context !== undefined ? context.user : persistedUser);
    const isLoading = context !== undefined ? context.isLoading : false;
    const hasRole = useMemo(
        () => (role: 'lawyer' | 'admin') => userHasRole(user, role),
        [user],
    );
    return useMemo(
        () => ({ user, isLoading, hasRole }),
        [hasRole, isLoading, user],
    );
}
