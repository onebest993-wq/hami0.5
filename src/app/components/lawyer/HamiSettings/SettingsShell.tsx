import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import { SETTINGS_NAV, type SettingsSectionId } from '@/app/services/settings';
import { DashboardPatternOverlay } from '@/app/components/lawyer/DashboardPatternOverlay';
import { DashboardWallpaperLayer } from '@/app/components/lawyer/DashboardWallpaperLayer';
import { SETTING_GLASS_INNER } from './settings-ui';
import { resolveSettingsShellStyle } from './settingsShellStyle';

export type SettingsShellProps = {
    onClose: () => void;
    activeSection: SettingsSectionId;
    onSectionChange: (id: SettingsSectionId) => void;
    children: React.ReactNode;
};

export function SettingsShell({ onClose, activeSection, onSectionChange, children }: SettingsShellProps) {
    const { settings } = useLawyerSettings();
    const { wallpaperSrc, hasWallpaper, shellBg, headerTint } = resolveSettingsShellStyle(settings.appearance);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex flex-col overflow-hidden font-sans transition-colors duration-500"
            style={{ backgroundColor: shellBg }}
            data-hami-settings-shell=""
            dir="rtl"
        >
            <DashboardWallpaperLayer src={wallpaperSrc} enabled={hasWallpaper} />
            <DashboardPatternOverlay appearance={settings.appearance} enabled={!hasWallpaper} />
            <div className="relative z-[1] flex flex-col h-full min-h-0">
                <div
                    className="shrink-0 px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-5 backdrop-blur-md border-b border-white/[0.04]"
                    style={{ backgroundColor: headerTint }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold text-white">مركز الإعدادات</h1>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-white/5 text-white hover:bg-white/10"
                            aria-label="إغلاق"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <nav
                        className={`flex gap-0.5 p-1 rounded-2xl overflow-x-auto scrollbar-hide ${SETTING_GLASS_INNER}`}
                        aria-label="أقسام الإعدادات"
                    >
                        {SETTINGS_NAV.map((item) => {
                            const active = activeSection === item.id;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => onSectionChange(item.id)}
                                    className={`shrink-0 flex-1 min-w-[4.5rem] px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                                        active
                                            ? 'bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-inset ring-[#E6C673]/20'
                                            : 'text-white/45 hover:text-white/75 hover:bg-white/[0.03]'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>
                <div className="flex-1 overflow-y-auto px-6 pb-[max(5rem,env(safe-area-inset-bottom))] scrollbar-hide">
                    {children}
                    <p className="text-center text-[10px] text-white/20 mt-10 mb-4 font-mono">Hami Legal • v2</p>
                </div>
            </div>
        </motion.div>
    );
}
