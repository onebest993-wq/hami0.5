import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bell, Shield, Moon, Globe, Mail, HelpCircle, LogOut, FileText, ChevronLeft, Activity, ShieldCheck, MessageSquare, ArrowRight, User, Sun } from 'lucide-react';
import { PageWrapper, GlassCard, AppHeader } from './SharedComponents';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useAuth } from '@/app/context/AuthContext';
import { useAppTheme } from '@/app/context/AppContext';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';

interface MainSettingsScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
  showPerformanceMonitor?: boolean;
  onTogglePerformanceMonitor?: (value: boolean) => void;
}

export const MainSettingsScreen = ({ 
  onBack, 
  onNavigate, 
  onLogout,
  showPerformanceMonitor = false,
  onTogglePerformanceMonitor
}: MainSettingsScreenProps) => {
  const { user } = useAuth();
  const { themeConfig, updateTheme } = useAppTheme();

  const userName = user?.user_metadata?.fullName || user?.email?.split('@')[0] || 'مستخدم';
  const userEmail = user?.email || '';
  const userAvatar = user?.user_metadata?.avatar_url || '';

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = persistenceRepository.load<{ mode: string }>('app_theme_config');
    return saved?.mode === 'dark' || themeConfig.mode === 'dark';
  });

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    const mode = newMode ? 'dark' : 'light';
    updateTheme({ mode });
    persistenceRepository.save('app_theme_config', { mode });
    SmartToast.success(newMode ? '🌙 تم تفعيل الوضع الليلي' : '☀️ تم تفعيل الوضع النهاري');
  };

  const copyEmail = () => {
    if (userEmail) {
      navigator.clipboard.writeText(userEmail);
      SmartToast.success('✅ تم نسخ البريد الإلكتروني');
    }
  };

  return (
    <PageWrapper>
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-[#001830]/90 backdrop-blur-xl border-b border-[#D4AF37]/20 p-5 flex items-center justify-between shadow-lg">
          <button type="button" onClick={onBack} className="w-10 h-10 rounded-full border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37]/10 transition">
              <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-white">الإعدادات</h1>
          <div className="w-10" />
      </div>

      <div className="p-6 space-y-6 pb-20">
          
          {/* Profile Section - حقيقي من AuthContext */}
          <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full border-2 border-[#D4AF37] p-1 mb-3">
                  {userAvatar ? (
                    <img src={userAvatar} alt="User" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                      <User className="w-8 h-8 text-[#D4AF37]" />
                    </div>
                  )}
              </div>
              <h2 className="text-white font-bold text-lg">{userName}</h2>
              {userEmail && (
                <button type="button" onClick={copyEmail} className="text-[#D4AF37]/70 text-xs hover:text-[#D4AF37] transition cursor-pointer flex items-center gap-1">
                  {userEmail}
                </button>
              )}
          </div>

          <div className="space-y-3">
              <SettingsItem 
                  icon={Bell} 
                  label="إعدادات الإشعارات" 
                  onClick={() => SmartToast.info("🔔 إعدادات الإشعارات - قريباً")}
              />
              <SettingsItem 
                  icon={Shield} 
                  label="الخصوصية والأمان" 
                  onClick={() => onNavigate('privacy')} 
              />
               <SettingsToggleItem 
                  icon={isDarkMode ? Moon : Sun} 
                  label="الوضع الليلي" 
                  isEnabled={isDarkMode}
                  onToggle={toggleDarkMode}
              />
               <SettingsItem 
                  icon={Globe} 
                  label="اللغة - العربية" 
                  onClick={() => SmartToast.info("🌍 تغيير اللغة قريباً")}
              />
              
              {/* Performance Monitor Toggle (Dev Only) */}
              {import.meta.env.DEV && onTogglePerformanceMonitor && (
                <SettingsToggleItem 
                  icon={Activity} 
                  label="مراقب الأداء" 
                  isEnabled={showPerformanceMonitor}
                  onToggle={() => {
                    onTogglePerformanceMonitor(!showPerformanceMonitor);
                    SmartToast.success(
                      !showPerformanceMonitor 
                        ? "✅ تم تفعيل مراقب الأداء" 
                        : "❌ تم إخفاء مراقب الأداء"
                    );
                  }}
                />
              )}
              
               <SettingsItem 
                  icon={Mail} 
                  label="الدعم الفني عبر البريد الإلكتروني" 
                  onClick={() => {
                    if (userEmail) {
                      window.open(`mailto:${userEmail}?subject=دعم فني - حامي`);
                      SmartToast.success("📧 تم فتح عميل البريد");
                    } else {
                      SmartToast.info("📧 الدعم الفني: support@hami.app");
                    }
                  }}
              />
               <SettingsItem 
                  icon={HelpCircle} 
                  label="مساعدة" 
                  onClick={() => onNavigate('support')} 
              />
               <SettingsItem 
                  icon={FileText} 
                  label="الشروط والأحكام" 
                  onClick={() => SmartToast.info("📜 سيتم فتح الشروط قريباً")}
              />
          </div>

          <div className="pt-6 border-t border-white/5">
              <button type="button" 
                onClick={onLogout}
                className="w-full py-4 rounded-xl border border-red-500/30 text-red-500 font-bold hover:bg-red-500 hover:text-white transition flex items-center justify-center gap-2"
              >
                  <LogOut className="w-5 h-5" /> تسجيل الخروج
              </button>
          </div>
          
          <p className="text-center text-[10px] text-gray-600 font-mono pt-4"> الإصدار 2.5.0 • تطبيق حامي</p>

      </div>
    </PageWrapper>
  );
};

const SettingsItem = ({ icon: Icon, label, onClick }: { icon: React.FC<{ className?: string }>; label: string; onClick: () => void }) => (
    <GlassCard onClick={onClick} className="p-4 flex items-center justify-between cursor-pointer hover:border-[#D4AF37]/50 group">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center group-hover:bg-[#D4AF37]/20 group-hover:text-[#D4AF37] transition">
                <Icon className="w-4 h-4 text-gray-400 group-hover:text-[#D4AF37]" />
            </div>
            <span className="text-gray-200 text-sm font-medium">{label}</span>
        </div>
        <ChevronLeft className="w-5 h-5 text-gray-600 group-hover:text-[#D4AF37] transition" />
    </GlassCard>
);

const SettingsToggleItem = ({ icon: Icon, label, isEnabled, onToggle }: { icon: React.FC<{ className?: string }>; label: string; isEnabled: boolean; onToggle: () => void }) => (
    <GlassCard onClick={onToggle} className="p-4 flex items-center justify-between cursor-pointer hover:border-[#D4AF37]/50 group">
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                isEnabled 
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37]' 
                    : 'bg-gray-800 text-gray-400 group-hover:bg-[#D4AF37]/20 group-hover:text-[#D4AF37]'
            }`}>
                <Icon className="w-4 h-4" />
            </div>
            <span className="text-gray-200 text-sm font-medium">{label}</span>
        </div>
        <motion.div 
            className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                isEnabled ? 'bg-[#D4AF37]' : 'bg-gray-600'
            }`}
            animate={{ backgroundColor: isEnabled ? '#D4AF37' : '#4B5563' }}
        >
            <motion.div 
                className="w-5 h-5 rounded-full bg-white shadow-md"
                animate={{ x: isEnabled ? 20 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
        </motion.div>
    </GlassCard>
);

// ------------------- SUB SCREENS -------------------

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
                    نحن في تطبيق "حامي" نلتزم بأعلى معايير التشفير والحماية. جميع القضايا والمحادثات بين الموكل والمحامي تخضع لاتفاقية سرية صارمة ولا يمكن لأي طرف ثالث الاطلاع عليها.
                </p>
                <div className="space-y-2 mt-4">
                    <li className="text-sm text-gray-400">تشفير End-to-End للمحادثات.</li>
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
            
            <GlassCard className="p-4" onClick={() => SmartToast.info("💬 جاري فتح المحادثة المباشرة...")}>
                <div className="flex justify-between items-center cursor-pointer">
                    <span className="text-white font-bold">بدء محادثة مباشرة</span>
                    <ArrowRight className="text-[#D4AF37]" />
                </div>
            </GlassCard>
        </div>
    </PageWrapper>
);
