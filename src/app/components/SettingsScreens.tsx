import React from 'react';
import { ShieldCheck, MessageSquare, ArrowRight, Settings } from '@/app/components/ui/lucideIcons';
import { PageWrapper, GlassCard, AppHeader } from './SharedComponents';
import { SmartToast } from '@/app/components/ui/SmartToast';

export const PrivacyPolicyScreen = ({ onBack }: { onBack: () => void }) => (
    <PageWrapper>
        <AppHeader title="سياسة الخصوصية" onBack={onBack} />
        <div className="p-6 space-y-6 pb-20">
            <GlassCard className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mb-2">
                    <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <h2 className="text-xl font-bold text-white">سرية بياناتك هي أولويتنا</h2>
                <p className="text-gray-300 text-sm leading-relaxed">
                    نحن في تطبيق "حامي" نلتزم بأعلى معايير التشفير والحماية. بيانات القضايا والملفات القانونية محمية ولا تُشارَك مع أطراف ثالثة إلا بموجب أمر قضائي.
                </p>
                <div className="space-y-2 mt-4">
                    <li className="text-sm text-gray-400">تشفير البيانات المحلية والسحابية.</li>
                    <li className="text-sm text-gray-400">إخفاء هوية الموكل في ساحة الاستشارات العامة.</li>
                    <li className="text-sm text-gray-400">عدم مشاركة البيانات مع أي جهات إعلانية.</li>
                </div>
            </GlassCard>
        </div>
    </PageWrapper>
);

export const SupportScreen = ({ onBack }: { onBack: () => void }) => (
    <PageWrapper>
        <AppHeader title="الدعم الفني" onBack={onBack} />
        <div className="p-6 space-y-6">
            <div className="text-center py-10">
                <MessageSquare className="w-16 h-16 text-[#D4AF37] mx-auto mb-4 opacity-50" />
                <h2 className="text-xl font-bold text-white">كيف يمكننا مساعدتك؟</h2>
                <p className="text-gray-400 text-sm mt-2">فريق الدعم متاح 24/7 للإجابة على استفساراتك.</p>
            </div>

            <GlassCard className="p-4" onClick={() => SmartToast.info('📧 تواصل معنا عبر البريد: support@hami.app')}>
                <div className="flex justify-between items-center cursor-pointer">
                    <span className="text-white font-bold">تواصل مع الدعم</span>
                    <ArrowRight className="text-[#D4AF37]" />
                </div>
            </GlassCard>
        </div>
    </PageWrapper>
);

export function MainSettingsScreen({
    onBack,
    onNavigate,
    onLogout,
}: {
    onBack: () => void;
    onNavigate: (target: 'privacy' | 'support') => void;
    onLogout?: () => void;
    showPerformanceMonitor?: boolean;
    onTogglePerformanceMonitor?: (next: boolean) => void;
}) {
    return (
        <PageWrapper>
            <AppHeader title="الإعدادات" onBack={onBack} />
            <div className="p-6 space-y-4 pb-20">
                <GlassCard className="p-4" onClick={() => onNavigate('privacy')}>
                    <div className="flex justify-between items-center cursor-pointer">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
                            <span className="text-white font-bold">سياسة الخصوصية</span>
                        </div>
                        <ArrowRight className="text-[#D4AF37]" />
                    </div>
                </GlassCard>
                <GlassCard className="p-4" onClick={() => onNavigate('support')}>
                    <div className="flex justify-between items-center cursor-pointer">
                        <div className="flex items-center gap-3">
                            <MessageSquare className="w-5 h-5 text-[#D4AF37]" />
                            <span className="text-white font-bold">الدعم الفني</span>
                        </div>
                        <ArrowRight className="text-[#D4AF37]" />
                    </div>
                </GlassCard>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-start gap-3">
                    <Settings className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
                    <p className="text-xs text-white/55 leading-relaxed">
                        إعدادات المظهر والأمان والبيانات الكاملة متاحة من لوحة المحامي عبر أيقونة الإعدادات.
                    </p>
                </div>
                {onLogout ? (
                    <button
                        type="button"
                        onClick={onLogout}
                        className="w-full py-3 rounded-xl border border-red-400/30 text-red-300 text-sm font-bold hover:bg-red-500/10 transition-colors"
                    >
                        تسجيل الخروج
                    </button>
                ) : null}
            </div>
        </PageWrapper>
    );
}
