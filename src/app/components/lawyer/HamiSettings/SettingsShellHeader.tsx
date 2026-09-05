import React from 'react';
import { SETTINGS_NAV, type SettingsSectionId } from '@/app/services/settings/nav';
import { prefetchSettingsSection } from './settingsSectionLoad';
import {
    SettingsDatabaseIcon,
    SettingsPaletteIcon,
    SettingsShieldIcon,
    SettingsUserIcon,
    SettingsXIcon,
    type SettingsStemIcon,
} from './settingsStemIconsChrome';

const SECTION_IDS = SETTINGS_NAV.map((item) => item.id);

const TAB_ICON: Record<SettingsSectionId, SettingsStemIcon> = {
    appearance: SettingsPaletteIcon,
    security: SettingsShieldIcon,
    data: SettingsDatabaseIcon,
    account: SettingsUserIcon,
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
    const selectSection = (id: SettingsSectionId) => {
        prefetchSettingsSection(id);
        if (id !== activeSection) onSectionChange(id);
    };

    const onNavKeyDown = (event: React.KeyboardEvent) => {
        const idx = SECTION_IDS.indexOf(activeSection);
        if (idx < 0) return;
        if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            const next = event.key === 'Home' ? SECTION_IDS[0] : SECTION_IDS[SECTION_IDS.length - 1];
            if (!next) return;
            selectSection(next);
            document.getElementById(`settings-tab-${next}`)?.focus();
            return;
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            const ltrDelta = event.key === 'ArrowRight' ? 1 : -1;
            const delta = shellDir === 'rtl' ? -ltrDelta : ltrDelta;
            const next = SECTION_IDS[(idx + delta + SECTION_IDS.length) % SECTION_IDS.length]!;
            selectSection(next);
            document.getElementById(`settings-tab-${next}`)?.focus();
        }
    };

    return (
        <header
            className="hami-settings-header shrink-0 pt-[max(0.5rem,var(--hami-lawyer-header-safe-top,env(safe-area-inset-top)))] pb-1"
        >
            <div className="hami-settings-header-inner">
                <div className="flex items-center justify-between gap-2 mb-1">
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
                        <SettingsXIcon size={16} strokeWidth={2.25} aria-hidden />
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
                                onPointerEnter={() => {
                                    prefetchSettingsSection(item.id);
                                }}
                                onFocus={() => {
                                    prefetchSettingsSection(item.id);
                                }}
                                onPointerDown={(event) => {
                                    if (event.button !== 0) return;
                                    selectSection(item.id);
                                }}
                                onClick={() => {
                                    selectSection(item.id);
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
