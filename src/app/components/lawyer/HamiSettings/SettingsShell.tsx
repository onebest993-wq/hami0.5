import React, { useLayoutEffect, useRef } from 'react';
import { Database, Palette, Shield, User, X, type LucideIcon } from 'lucide-react';
import { useLawyerSettingsAppearance } from '@/app/context/LawyerSettingsContext';
import { SETTINGS_NAV, type SettingsSectionId } from '@/app/services/settings';
import '@/app/components/lawyer/dashboard/lawyerHomeFx.css';
import { resolveSettingsShellStyle } from './settingsShellStyle';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useSettingsShellFocusTrap } from './hooks/useSettingsShellFocusTrap';
import { useSettingsMobileSuspend } from './hooks/useSettingsMobileSuspend';
import { prefetchSettingsSection } from './settingsSectionLoader';
import {
    clearSettingsForceVisible,
    concealSettingsWarmShell,
    isSettingsForceVisible,
    isSettingsOverlayInteractionArmed,
    scheduleSettingsOverlayInteractionArm,
} from '@/app/runtime/settingsInstantPaint';

export type SettingsShellProps = {
    onClose: () => void;
    activeSection: SettingsSectionId;
    onSectionChange: (id: SettingsSectionId) => void;
    children: React.ReactNode;
    open?: boolean;
    hydrated?: boolean;
};

const SECTION_IDS = SETTINGS_NAV.map((item) => item.id);

const TAB_ICON: Record<SettingsSectionId, LucideIcon> = {
    appearance: Palette,
    security: Shield,
    data: Database,
    account: User,
};

/**
 * محتوى مركز الإعدادات داخل HamiSettingsHost (portal + طبقة معتمة).
 * الإغلاق فوري بعد انتهاء إيماءة الفتح (بلع click شبحي → --interact).
 */
export function SettingsShell({
    onClose,
    activeSection,
    onSectionChange,
    children,
    open = true,
    hydrated = false,
}: SettingsShellProps) {
    const reduceMotion = useReduceMotion();
    const shellRef = useRef<HTMLDivElement>(null);
    /** يمنع conceal عند تركيب keepAlive مغلق (pointerdown prime) */
    const wasVisibleRef = useRef(false);
    const visible = open;
    const { onKeyDownCapture } = useSettingsShellFocusTrap(shellRef, onClose, visible);
    useSettingsMobileSuspend(visible);

    const appearance = useLawyerSettingsAppearance();
    const { shellBg } = resolveSettingsShellStyle(appearance);
    const shellDir = appearance.language === 'en' ? 'ltr' : 'rtl';

    useLayoutEffect(() => {
        if (visible) {
            wasVisibleRef.current = true;
            clearSettingsForceVisible();
            scheduleSettingsOverlayInteractionArm();
            return undefined;
        }
        /* true→false فقط — لا conceal عند أول mount بـ open=false */
        if (wasVisibleRef.current) {
            wasVisibleRef.current = false;
            concealSettingsWarmShell();
        }
        clearSettingsForceVisible();
        return undefined;
    }, [visible]);

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

    const canCloseNow = () => {
        if (!visible && !isSettingsForceVisible()) return false;
        /* حارس إيماءة الفتح على زر X فقط — بعده إغلاق فوري */
        return isSettingsOverlayInteractionArmed();
    };

    const requestClose = (event?: React.SyntheticEvent) => {
        event?.preventDefault();
        event?.stopPropagation();
        if (!canCloseNow()) return;
        /*
         * onClose أولاً (flushSync) ثم conceal — لا تُخفِ الطبقة قبل تحديث React
         * حتى لا يومض هيدر اللوحة تحت فراغ الإعدادات.
         */
        onClose();
    };

    return (
        <div
            ref={shellRef}
            data-settings-root
            data-open={visible ? 'true' : 'false'}
            className="absolute inset-0 flex flex-col overflow-hidden font-sans"
            style={{ backgroundColor: shellBg || '#0B1021' }}
            data-hami-settings-shell=""
            data-testid="hami-settings-shell"
            data-settings-hydrated={hydrated || visible ? 'true' : 'false'}
            dir={shellDir}
            role="dialog"
            aria-modal={visible ? 'true' : 'false'}
            aria-hidden={!visible}
            aria-label="مركز الإعدادات"
            onKeyDownCapture={onKeyDownCapture}
        >
            <div className="relative z-[1] flex h-full min-h-0 flex-col">
                <header
                    className={`hami-settings-header shrink-0 px-4 pt-[max(0.65rem,env(safe-area-inset-top))] pb-3 ${
                        reduceMotion ? '' : 'hami-settings-header--glass'
                    }`}
                >
                    <div className="hami-settings-header-inner">
                        <div className="flex items-center justify-between gap-3 mb-3.5">
                            <div className="min-w-0">
                                <p className="hami-settings-kicker">لوحة التحكم</p>
                                <h1 className="hami-settings-title">مركز الإعدادات</h1>
                            </div>
                            <button
                                type="button"
                                data-testid="settings-shell-close"
                                className="hami-settings-close flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center touch-manipulation"
                                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                                aria-label="إغلاق الإعدادات"
                                onPointerDown={(event) => {
                                    /*
                                     * إغلاق على pointerdown = خروج لحظي.
                                     * closeSettings يكبح إعادة الفتح الشبحي (suppressSettingsReopen).
                                     */
                                    if (typeof event.button === 'number' && event.button !== 0) return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    requestClose(event);
                                }}
                                onClick={(event) => {
                                    /* احتياطي لوحة مفاتيح / إن لم يُلتَقط pointerdown */
                                    event.preventDefault();
                                    event.stopPropagation();
                                    requestClose(event);
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
                                const Icon = TAB_ICON[item.id] ?? Palette;
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
                                        onPointerDown={() => prefetchSettingsSection(item.id)}
                                        onPointerEnter={() => prefetchSettingsSection(item.id)}
                                        onFocus={() => prefetchSettingsSection(item.id)}
                                        data-testid={`settings-nav-${item.id}`}
                                        className={`hami-settings-tab min-h-[44px] touch-manipulation ${
                                            active ? 'hami-settings-tab--active' : ''
                                        }`}
                                    >
                                        <Icon
                                            size={15}
                                            strokeWidth={active ? 2.25 : 1.85}
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

                <div
                    id="settings-section-panel"
                    role="tabpanel"
                    aria-labelledby={`settings-tab-${activeSection}`}
                    className="hami-settings-scroll-panel flex-1 overflow-y-auto px-5 pb-[max(5rem,env(safe-area-inset-bottom))] scrollbar-hide overscroll-contain"
                >
                    {children}
                </div>
            </div>
        </div>
    );
}
