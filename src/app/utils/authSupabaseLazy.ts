import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { resolveClientSupabaseConfig } from '@/utils/supabase/clientEnv';
import { purgeClientAuthResidue } from '@/app/utils/authStorage';

let clientPromise: Promise<SupabaseClient> | null = null;

function ensureSupabasePreconnect(): void {
    if (typeof document === 'undefined') return;
    const href = resolveClientSupabaseConfig().url;
    if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    link.crossOrigin = '';
    document.head.appendChild(link);
}

/** يحمّل عميل Supabase عند الحاجة فقط — لا يُسحب vendor-supabase في مسار الضيف. */
export async function getAuthSupabase(): Promise<SupabaseClient> {
    if (!clientPromise) {
        ensureSupabasePreconnect();
        clientPromise = import('@/lib/supabase').then((m) => m.supabase);
    }
    return clientPromise;
}

export async function signInWithPassword(
    email: string,
    password: string,
): Promise<{ session: Session | null; error: Error | null }> {
    const supabase = await getAuthSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { session: data.session ?? null, error: error as Error | null };
}

export async function signUpWithPassword(
    email: string,
    password: string,
    options: { data?: Record<string, unknown> },
): Promise<{ error: Error | null }> {
    const supabase = await getAuthSupabase();
    const { error } = await supabase.auth.signUp({ email, password, options });
    return { error: error as Error | null };
}

export async function requestPasswordResetEmail(
    email: string,
    redirectTo?: string,
): Promise<{ error: Error | null }> {
    const supabase = await getAuthSupabase();
    const { error } = await (
        supabase.auth as unknown as {
            resetPasswordForEmail: (
                email: string,
                opts?: { redirectTo?: string },
            ) => Promise<{ error: Error | null }>;
        }
    ).resetPasswordForEmail(email, {
        redirectTo: redirectTo || undefined,
    });
    return { error: error as Error | null };
}

/** تحديث كلمة المرور بعد جلسة `PASSWORD_RECOVERY` من رابط البريد */
export async function updateAuthPassword(
    password: string,
): Promise<{ error: Error | null }> {
    const supabase = await getAuthSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error as Error | null };
}

export async function signOutSupabase(): Promise<void> {
    try {
        const supabase = await getAuthSupabase();
        await supabase.auth.signOut();
    } catch {
        /* ignore */
    } finally {
        purgeClientAuthResidue();
    }
}

export async function attachSupabaseAuthListener(handlers: {
    onSession: (session: Session | null) => void;
    onReady?: () => void;
    onAuthEvent?: (event: string, session: Session | null) => void;
}): Promise<() => void> {
    const supabase = await getAuthSupabase();
    const { data, error } = await supabase.auth.getSession();
    if (!error && data.session) {
        handlers.onSession(data.session);
    }
    handlers.onReady?.();

    const { data: sub } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
        handlers.onAuthEvent?.(event, session);
        if (event === 'SIGNED_OUT') {
            handlers.onSession(null);
            return;
        }
        if (session) {
            handlers.onSession(session);
        }
    });

    return () => sub.subscription.unsubscribe();
}
