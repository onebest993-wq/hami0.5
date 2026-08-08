import React, { useState, type FormEvent, type ReactElement } from 'react';

import { useBootGateSurfaceReady } from '@/app/bootstrap/useBootGateSurfaceReady';
import { useAuth } from '@/app/context/AuthContext';
import { isBffAuthEnabled } from '@/app/utils/bffAuthFlags';

/**
 * بوابة دخول عند غياب الجلسة في الإنتاج (VITE_SHELL_AUTH_OPEN=false).
 * بدل lawyer-boot-shell-frozen الذي كان يعلق بلا مخرج.
 */
export function LawyerSignInGate(): ReactElement {
    useBootGateSurfaceReady();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email.trim(), password);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'فشل تسجيل الدخول';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen w-full bg-[#0a0f1c] flex items-center justify-center p-6"
            data-testid="lawyer-sign-in-gate"
            role="main"
            aria-label="تسجيل الدخول"
        >
            <form
                onSubmit={onSubmit}
                className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-[#05060d]/90 p-6"
            >
                <h1 className="text-center text-lg font-bold text-[#E6C673]">حامي — تسجيل الدخول</h1>
                <p className="text-center text-sm text-white/70">
                    {isBffAuthEnabled()
                        ? 'جلسة آمنة عبر الخادم — يلزم حساب محامٍ مسجّل.'
                        : 'أدخل بيانات حساب Supabase للمحامي.'}
                </p>
                <label className="block space-y-1">
                    <span className="text-sm text-white/80">البريد الإلكتروني</span>
                    <input
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-lg border border-white/15 bg-[#0a0f1c] px-3 py-2 text-white"
                        data-testid="lawyer-sign-in-email"
                    />
                </label>
                <label className="block space-y-1">
                    <span className="text-sm text-white/80">كلمة المرور</span>
                    <input
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-lg border border-white/15 bg-[#0a0f1c] px-3 py-2 text-white"
                        data-testid="lawyer-sign-in-password"
                    />
                </label>
                {error ? (
                    <p className="text-sm text-red-400" role="alert" data-testid="lawyer-sign-in-error">
                        {error}
                    </p>
                ) : null}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-[#E6C673] px-4 py-2 font-bold text-[#05060d] disabled:opacity-60"
                    data-testid="lawyer-sign-in-submit"
                >
                    {loading ? 'جاري الدخول…' : 'دخول'}
                </button>
            </form>
        </div>
    );
}
