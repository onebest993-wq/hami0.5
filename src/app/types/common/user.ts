/**
 * User & auth state types.
 */

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    avatar?: string;
    phone?: string;
    verified?: boolean;
    createdAt: string;
}

export type UserRole = 'lawyer' | 'admin';

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error?: string;
}
