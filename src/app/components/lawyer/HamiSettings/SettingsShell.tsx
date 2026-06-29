import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { useLawyerSettingsAppearance } from '@/app/context/LawyerSettingsContext';
import { SETTINGS_NAV, type SettingsSectionId } from '@/app/services/settings';
import { SETTING_GLASS_INNER } from './settings-ui';
import '@/app/components/lawyer/dashboard/lawyerHomeFx.css';
import { resolveSettingsShellStyle } from './settingsShellStyle';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useSettingsShellFocusTrap } from './hooks/useSettingsShellFocusTrap';
import { useSettingsMobileSuspend } from './hooks/useSettingsMobileSuspend';
import { prefetchSettingsSection } from './settingsSectionLoader';

export type SettingsShellProps = {
    onClose: () => void;
    activeSection: SettingsSectionId;
    onSectionChange: (id: SettingsSectionId) => void;
    children: React.ReactNode;
    /** false عند إخفاء الإعدادات مع keep-alive — لا scroll-lock */
    open?: boolean;
};

const SECTION_IDS = SETTINGS_NAV.map((item) => item.id);

export function SettingsShell({
    onClose,
    activeSection,
    onSectionChange,
    children,
    open = true,
}: SettingsShellProps) {
    const reduceMotion = useReduceMotion();
    const shellRef = useRef<HTMLDivElement>(null);
    const { onKeyDownCapture } = useSettingsShellFocusTrap(shellRef, onClose, open);
    useBodyScrollLock(open);
    useSettingsMobileSuspend(open);

    const appearance = useLawyerSettingsAppearance();
    const { hasWallpaper, shellBg, headerTint } = resolveSettingsShellStyle(appearance);
    const shellDir = appearance.language === 'en' ? 'ltr' : 'rtl';

    const onNavKeyDown = (event: React.KeyboardEvent) => {
        const idx = SECTION_IDS.indexOf(activeSection);
        if (idx < 0) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            const delta = event.key === 'ArrowLeft' ? 1 : -1;
            const next = SECTION_IDS[(idx + delta + SECTION_IDS.length) % SECTION_IDS.length]!;
            onSectionChange(next);
            document.getElementById(`settings-tab-${next}`)?.focus();
        }
    };

    return (
        <div
            ref={shellRef}
            className="fixed inset-0 z-[150] flex flex-col overflow-hidden font-sans"
            style={{ backgroundColor: shellBg }}
            data-hami-settings-shell=""
            data-testid="hami-settings-shell"
            data-hami-wallpaper={hasWallpaper ? '1' : '0'}
            dir={shellDir}
            role="dialog"
            aria-modal="true"
            aria-label="مركز الإعدادات"
            onKeyDownCapture={onKeyDownCapture}
        >
            {hasWallpaper ? (
                <div className="fixed inset-0 z-0 pointer-events-none bg-[#0B1021]/50" aria-hidden />
            ) : null}
            <div className="relative z-[1] flex flex-col h-full min-h-0">
                <div
                    className="hami-settings-header shrink-0 px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-5 backdrop-blur-md border-b border-white/[0.04]"
                    style={{ backgroundColor: headerTint }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold text-white">مركز الإعدادات</h1>
                        <button
                            type="button"
                            onClick={onClose}
                            data-testid="settings-shell-close"
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-white/5 text-white hover:bg-white/10 min-h-[44px] min-w-[44px]"
                            aria-label="إغلاق الإعدادات"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <nav
                        className={`flex gap-0.5 p-1 rounded-2xl overflow-x-auto scrollbar-hide ${SETTING_GLASS_INNER}`}
                        role="tablist"
                        aria-label="أقسام الإعدادات"
                        onKeyDown={onNavKeyDown}
                    >
                        {SETTINGS_NAV.map((item) => {
                            const active = activeSection === item.id;
                            return (
                                <button
                                    key={item.id}
                                    id={`settings-tab-${item.id}`}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    aria-controls="settings-section-panel"
                                    tabIndex={active ? 0 : -1}
                                    onClick={() => {
                                        prefetchSettingsSection(item.id);
                                        onSectionChange(item.id);
                                    }}
                                    onPointerEnter={() => prefetchSettingsSection(item.id)}
                                    onFocus={() => prefetchSettingsSection(item.id)}
                                    data-testid={`settings-nav-${item.id}`}
                                    className={`shrink-0 flex-1 min-w-[4.5rem] px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                                        reduceMotion ? '' : 'duration-200'
                                    } ${
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
                <div
                    id="settings-section-panel"
                    role="tabpanel"
                    aria-labelledby={`settings-tab-${activeSection}`}
                    className="hami-settings-scroll-panel flex-1 overflow-y-auto px-6 pb-[max(5rem,env(safe-area-inset-bottom))] scrollbar-hide overscroll-contain"
                >
                    {children}
                    <p className="text-center text-[10px] text-white/20 mt-10 mb-4 font-mono">Hami Legal • v2</p>
                </div>
            </div>
        </div>
    );
}
