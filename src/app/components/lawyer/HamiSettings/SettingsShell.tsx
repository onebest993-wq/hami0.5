import React, { useRef } from 'react';
import { useLawyerSettingsAppearance } from '@/app/context/LawyerSettingsContext';
import { SETTINGS_NAV, type SettingsSectionId } from '@/app/services/settings';
import { useHorizontalTabSwipe } from '@/app/utils/horizontalTabSwipe';
import { SETTINGS_SHELL_CHROME } from './settingsShellStyle';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useSettingsShellFocusTrap } from './hooks/useSettingsShellFocusTrap';
import { useSettingsMobileSuspend } from './hooks/useSettingsMobileSuspend';
import { useSettingsOverlayKeyboard } from './hooks/useSettingsOverlayKeyboard';
import { useSettingsShellCloseGuard } from './hooks/useSettingsShellCloseGuard';
import { SettingsShellHeader } from './SettingsShellHeader';
import { isSettingsLayerOpen } from '@/app/runtime/settingsInstantPaint';
import { inertProps } from '@/app/utils/inertProps';

export type SettingsShellProps = {
    onClose: () => void;
    activeSection: SettingsSectionId;
    onSectionChange: (id: SettingsSectionId) => void;
    children: React.ReactNode;
    open?: boolean;
    hydrated?: boolean;
};

const SETTINGS_SECTION_ORDER: readonly SettingsSectionId[] = SETTINGS_NAV.map((item) => item.id);

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
    const visible = isSettingsLayerOpen(open);
    const { onKeyDownCapture } = useSettingsShellFocusTrap(shellRef, onClose, visible);
    useSettingsMobileSuspend(visible);
    const keyboardInset = useSettingsOverlayKeyboard(visible, shellRef, reduceMotion);
    const { requestCloseGuarded } = useSettingsShellCloseGuard(visible, onClose);

    const appearance = useLawyerSettingsAppearance();
    const shellDir = appearance.language === 'en' ? 'ltr' : 'rtl';

    const { swipeHandlers: sectionSwipeHandlers } = useHorizontalTabSwipe({
        order: SETTINGS_SECTION_ORDER,
        activeId: activeSection,
        onChange: onSectionChange,
        enabled: visible,
    });

    return (
        <div
            ref={shellRef}
            data-settings-root
            data-open={visible ? 'true' : 'false'}
            className="absolute inset-0 flex flex-col overflow-hidden overscroll-none font-sans"
            style={{ backgroundColor: SETTINGS_SHELL_CHROME }}
            data-hami-settings-shell=""
            data-testid="hami-settings-shell"
            data-settings-hydrated={hydrated || visible ? 'true' : 'false'}
            dir={shellDir}
            role="dialog"
            aria-modal={visible ? 'true' : 'false'}
            aria-hidden={!visible}
            aria-label="مركز الإعدادات"
            onKeyDownCapture={onKeyDownCapture}
            {...inertProps(!visible)}
        >
            <div className="relative z-[1] flex h-full min-h-0 flex-col">
                <SettingsShellHeader
                    requestCloseGuarded={requestCloseGuarded}
                    activeSection={activeSection}
                    onSectionChange={onSectionChange}
                    shellDir={shellDir}
                />

                <div
                    id="settings-section-panel"
                    role="tabpanel"
                    aria-labelledby={`settings-tab-${activeSection}`}
                    className="hami-settings-scroll-panel flex-1 min-h-0 min-w-0 overflow-y-auto pb-[max(5rem,env(safe-area-inset-bottom))] scrollbar-hide overscroll-contain touch-pan-y"
                    data-testid="settings-section-panel"
                    data-keyboard-inset={keyboardInset}
                    style={{
                        paddingBottom: `calc(max(5rem, env(safe-area-inset-bottom, 0px)) + ${keyboardInset}px)`,
                    }}
                    {...sectionSwipeHandlers}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}
