import React from 'react';
import { Database } from '@/app/components/ui/icons/Database';
import { Palette } from '@/app/components/ui/icons/Palette';
import { Shield } from '@/app/components/ui/icons/Shield';
import { User } from '@/app/components/ui/icons/User';
import { X } from '@/app/components/ui/icons/X';
import type { LucideIcon } from '@/app/components/ui/lucideIcons';
import { SETTINGS_NAV, type SettingsSectionId } from '@/app/services/settings';
import { prefetchSettingsSection } from './settingsSectionLoad';

const SECTION_IDS = SETTINGS_NAV.map((item) => item.id);

const TAB_ICON: Record<SettingsSectionId, LucideIcon> = {
    appearance: Palette,
    security: Shield,
    data: Database,
    account: User,
};

export function SettingsShellHeader({
    requestCloseGuarded,
    activeSection,
    onSectionChange,
    shellDir,
}: {
    requestCloseGuarded: (event?: React.SyntheticEvent) => void;
    activeSection: SettingsSectionId;
    onSectionChange: (id: SettingsSectionId) => void;
    shellDir: 'ltr' | 'rtl';
}) {
    const onNavKeyDown = (event: React.KeyboardEvent) => {
        const idx = SECTION_IDS.indexOf(activeSection);
        if (idx < 0) return;
        if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            const next = event.key === 'Home' ? SECTION_IDS[0] : SECTION_IDS[SECTION_IDS.length - 1];
            if (!next) return;
            onSectionChange(next);
            document.getElementById(`settings-tab-${next}`)?.focus();
            return;
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            const ltrDelta = event.key === 'ArrowRight' ? 1 : -1;
            const delta = shellDir === 'rtl' ? -ltrDelta : ltrDelta;
            const next = SECTION_IDS[(idx + delta + SECTION_IDS.length) % SECTION_IDS.length]!;
            onSectionChange(next);
            document.getElementById(`settings-tab-${next}`)?.focus();
        }
    };

    return (
        <header
            className="hami-settings-header hami-settings-header--glass shrink-0 pt-[max(0.5rem,var(--hami-lawyer-header-safe-top,env(safe-area-inset-top)))] pb-2"
        >
            <div className="hami-settings-header-inner">
                <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="min-w-0">
                        <h1 className="hami-settings-title">مركز الإعدادات</h1>
                    </div>
                    <button
                        type="button"
                        data-testid="settings-shell-close"
                        className="hami-settings-close flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center touch-manipulation"
                        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                        aria-label="إغلاق الإعدادات"
                        onPointerDown={(event) => {
                            if (typeof event.button === 'number' && event.button !== 0) return;
                            requestCloseGuarded(event);
                        }}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            requestCloseGuarded(event);
                        }}
                    >
                        <X size={18} strokeWidth={2.25} aria-hidden />
                    </button>
                </div>

                <nav
                    className="hami-settings-tabs"
                    role="tablist"
                    aria-label="أقسام الإعدادات"
                    onKeyDown={onNavKeyDown}
                >
                    {SETTINGS_NAV.map((item) => {
                        const active = activeSection === item.id;
                        const Icon = TAB_ICON[item.id];
                        return (
                            <button
                                key={item.id}
                                id={`settings-tab-${item.id}`}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                aria-controls="settings-section-panel"
                                tabIndex={active ? 0 : -1}
                                onPointerDown={(event) => {
                                    if (event.button !== 0) return;
                                    prefetchSettingsSection(item.id);
                                    if (!active) onSectionChange(item.id);
                                }}
                                onClick={() => {
                                    if (!active) onSectionChange(item.id);
                                }}
                                data-testid={`settings-nav-${item.id}`}
                                className={`hami-settings-tab min-h-[44px] min-w-[44px] touch-manipulation ${
                                    active ? 'hami-settings-tab--active' : ''
                                }`}
                            >
                                <Icon
                                    size={14}
                                    strokeWidth={active ? 2.2 : 1.8}
                                    className="hami-settings-tab-icon"
                                    aria-hidden
                                />
                                <span className="hami-settings-tab-label">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
}
