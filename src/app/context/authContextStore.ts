/**
 * سياق المصادقة كـ singleton مستقر.
 * يُفصل عن AuthProvider حتى لا يُنتج HMR نسختين من createContext
 * فيظهر خطأ: useAuth must be used within an AuthProvider.
 */
import { createContext, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { LawyerRegistrationPayload } from '@/app/services/auth/lawyerVerificationStore';

export type RegisterLawyerInput = LawyerRegistrationPayload & { password: string };

export type AuthContextType = {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (
        email: string,
        password: string,
        options?: { fullName?: string; accountType?: 'lawyer'; phone?: string },
    ) => Promise<void>;
    registerLawyer: (
        input: RegisterLawyerInput,
    ) => Promise<{
        userId: string;
        pendingMessage: string;
        emailConfirmRequired?: boolean;
        hqReceived: boolean;
    }>;
    registerLawyerAccount: (input: {
        email: string;
        password: string;
    }) => Promise<{ userId: string; pendingMessage: string; emailConfirmRequired?: boolean }>;
    finalizeLawyerOnboarding: (
        input: Omit<RegisterLawyerInput, 'password'> & { userId?: string },
    ) => Promise<{ pendingMessage: string; hqReceived: boolean }>;
    enterLocalGuest: () => Promise<void>;
    requestPasswordReset: (email: string) => Promise<string>;
    resendEmailConfirmation: (email: string) => Promise<string>;
    exitGuestForAuthGate: (mode: 'login' | 'register') => Promise<void>;
    logout: (options?: { skipLocalPurge?: boolean }) => Promise<void>;
    hasRole: (role: 'lawyer' | 'admin') => boolean;
    devBypassLogin: () => Promise<void>;
    adminBypassLogin: () => Promise<void>;
};

export type AuthProviderProps = {
    children: ReactNode;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
