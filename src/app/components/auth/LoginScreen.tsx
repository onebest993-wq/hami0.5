import React, { Suspense, useState } from 'react';
import { Mail, Lock, UserPlus, LogIn } from '@/app/components/ui/lucideIcons';
import { PageWrapper, GlassCard, GoldButton, InputField } from '@/app/components/SharedComponents';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { logAction } from '@/app/utils/auditLog';

const DevSecurityPanel = React.lazy(() =>
    import('@/app/components/shared/DevSecurityPanel').then((m) => ({ default: m.DevSecurityPanel })),
);

export const LoginScreen = () => {
    const { signup, devBypassLogin, adminBypassLogin } = useAuth();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim() || !password) {
            SmartToast.warning('يرجى إدخال البريد وكلمة المرور');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) {
                setErrorMessage(error.message);
                return;
            }

            setErrorMessage('');
            await logAction('login_success', {
                source: 'LoginScreen',
                email: email.trim(),
            });
            window.history.pushState({ screen: 'lawyer' }, '', '/');
            SmartToast.success('تم تسجيل الدخول');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
            setErrorMessage(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PageWrapper>
            <div dir="rtl" className="min-h-screen flex items-center justify-center px-4 py-10 bg-[#000510]">
                <div className="w-full max-w-md">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-black text-white tracking-tight">تسجيل الدخول</h1>
                        <p className="text-xs text-white/40 mt-1">منتدى المحامين المغلق • وصول آمن</p>
                    </div>

                    <GlassCard className="p-6 space-y-5 border-[#D4AF37]/30">
                        <InputField
                            label="البريد الإلكتروني"
                            icon={Mail}
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@domain.com"
                        />
                        <InputField
                            label="كلمة المرور"
                            icon={Lock}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />

                        <GoldButton
                            fullWidth
                            onClick={() => {
                                if (mode === 'login') {
                                    void handleLogin({
                                        preventDefault: () => undefined,
                                    } as React.FormEvent);
                                    return;
                                }
                                void (async () => {
                                    if (!email.trim() || !password) {
                                        SmartToast.warning('يرجى إدخال البريد وكلمة المرور');
                                        return;
                                    }
                                    setIsLoading(true);
                                    try {
                                        await signup(email.trim(), password, { role: 'lawyer' });
                                        setErrorMessage('');
                                        SmartToast.success('تم إنشاء الحساب');
                                    } catch (err: unknown) {
                                        const message =
                                            err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
                                        setErrorMessage(message);
                                        SmartToast.error(message);
                                    } finally {
                                        setIsLoading(false);
                                    }
                                })();
                            }}
                            disabled={isLoading}
                            icon={mode === 'login' ? LogIn : UserPlus}
                        >
                            {isLoading
                                ? mode === 'login'
                                    ? 'جاري التحقق...'
                                    : 'جاري المعالجة...'
                                : mode === 'login'
                                  ? 'تسجيل الدخول'
                                  : 'إنشاء حساب جديد كـ محامي'}
                        </GoldButton>
                        {errorMessage ? <p className="text-red-500 text-sm text-center">{errorMessage}</p> : null}

                        <button
                            type="button"
                            onClick={() => setMode((m) => (m === 'login' ? 'signup' : 'login'))}
                            className="w-full text-xs text-white/50 hover:text-white transition-colors"
                            disabled={isLoading}
                        >
                            {mode === 'login' ? 'إنشاء حساب جديد كـ محامي' : 'لدي حساب بالفعل'}
                        </button>

                        {import.meta.env.DEV ? (
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        void (async () => {
                                            setIsLoading(true);
                                            try {
                                                await devBypassLogin();
                                                SmartToast.success('تم تفعيل تخطي المطور');
                                            } catch {
                                                SmartToast.error('فشل تخطي المطور');
                                            } finally {
                                                setIsLoading(false);
                                            }
                                        })();
                                    }}
                                    className="w-full text-xs text-[#DAA520] hover:text-[#E6C673] transition-colors"
                                    disabled={isLoading}
                                >
                                    تخطي المطور - Dev Bypass
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        void (async () => {
                                            setIsLoading(true);
                                            try {
                                                await adminBypassLogin();
                                                SmartToast.success('تم تسجيل الدخول كمدير أعلى (DEV)');
                                            } catch {
                                                SmartToast.error('فشل تسجيل الدخول كمدير');
                                            } finally {
                                                setIsLoading(false);
                                            }
                                        })();
                                    }}
                                    className="w-full text-xs text-[#ffbf47] hover:text-[#ffd37a] transition-colors"
                                    disabled={isLoading}
                                >
                                    الدخول كمدير أعلى - Dev Admin Login
                                </button>
                            </div>
                        ) : null}
                    </GlassCard>
                </div>
            </div>
            {import.meta.env.DEV ? (
                <Suspense fallback={null}>
                    <DevSecurityPanel />
                </Suspense>
            ) : null}
        </PageWrapper>
    );
};
