import React, { useState } from 'react';
import { Mail, Lock, UserPlus, LogIn, Shield, LayoutDashboard } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { logAction } from '@/app/utils/auditLog';
import { LoginGlassCard, LoginGoldButton, LoginInputField } from './loginScreenPrimitives';

/** شاشة التطوير — دخول التطبيق أو المدير */
const DevAdminLoginScreen = () => {
    const { adminBypassLogin, devBypassLogin } = useAuth();
    const [loadingAction, setLoadingAction] = useState<'app' | 'admin' | null>(null);

    return (
        <div dir="rtl" className="min-h-screen font-['Tajawal'] bg-[#000510] text-white">
            <div className="min-h-screen flex items-center justify-center px-4 py-10">
                <div className="w-full max-w-md">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-black text-white tracking-tight">وضع التطوير</h1>
                        <p className="text-xs text-white/40 mt-1">اختصار محلي — التطبيق أو لوحة المدير</p>
                    </div>

                    <LoginGlassCard className="p-6 space-y-5 border-[#D4AF37]/30">
                        <p className="text-xs text-white/50 text-center leading-relaxed">
                            تسجيل الدخول بالبريد وكلمة المرور مُعطّل مؤقتاً أثناء مرحلة التطوير.
                        </p>
                        <LoginGoldButton
                            fullWidth
                            onClick={() => {
                                void (async () => {
                                    setLoadingAction('app');
                                    try {
                                        await devBypassLogin();
                                        SmartToast.success('تم الدخول إلى التطبيق');
                                    } catch {
                                        SmartToast.error('فشل الدخول إلى التطبيق');
                                    } finally {
                                        setLoadingAction(null);
                                    }
                                })();
                            }}
                            disabled={loadingAction !== null}
                            icon={LayoutDashboard}
                        >
                            {loadingAction === 'app' ? 'جاري الدخول...' : 'الدخول للتطبيق'}
                        </LoginGoldButton>

                        <button
                            type="button"
                            onClick={() => {
                                void (async () => {
                                    setLoadingAction('admin');
                                    try {
                                        await adminBypassLogin();
                                        SmartToast.success('تم تسجيل الدخول كمدير أعلى');
                                    } catch {
                                        SmartToast.error('فشل تسجيل الدخول كمدير');
                                    } finally {
                                        setLoadingAction(null);
                                    }
                                })();
                            }}
                            disabled={loadingAction !== null}
                            className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-2.5 text-xs font-bold text-[#E6C673] hover:bg-[#D4AF37]/15 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <Shield className="w-4 h-4" />
                            {loadingAction === 'admin' ? 'جاري الدخول...' : 'الدخول كمدير أعلى'}
                        </button>
                    </LoginGlassCard>
                </div>
            </div>
        </div>
    );
};

/** شاشة الإنتاج — تسجيل دخول عادي للمحامين */
const ProductionLoginScreen = () => {
    const { signup } = useAuth();
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
        <div dir="rtl" className="min-h-screen font-['Tajawal'] bg-[#000510] text-white">
            <div className="min-h-screen flex items-center justify-center px-4 py-10">
                <div className="w-full max-w-md">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-black text-white tracking-tight">تسجيل الدخول</h1>
                        <p className="text-xs text-white/40 mt-1">منتدى المحامين المغلق • وصول آمن</p>
                    </div>

                    <LoginGlassCard className="p-6 space-y-5 border-[#D4AF37]/30">
                        <LoginInputField
                            label="البريد الإلكتروني"
                            icon={Mail}
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@domain.com"
                        />
                        <LoginInputField
                            label="كلمة المرور"
                            icon={Lock}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />

                        <LoginGoldButton
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
                        </LoginGoldButton>
                        {errorMessage ? <p className="text-red-500 text-sm text-center">{errorMessage}</p> : null}

                        <button
                            type="button"
                            onClick={() => setMode((m) => (m === 'login' ? 'signup' : 'login'))}
                            className="w-full text-xs text-white/50 hover:text-white transition-colors"
                            disabled={isLoading}
                        >
                            {mode === 'login' ? 'إنشاء حساب جديد كـ محامي' : 'لدي حساب بالفعل'}
                        </button>
                    </LoginGlassCard>
                </div>
            </div>
        </div>
    );
};

export const LoginScreen = () => (import.meta.env.DEV ? <DevAdminLoginScreen /> : <ProductionLoginScreen />);
