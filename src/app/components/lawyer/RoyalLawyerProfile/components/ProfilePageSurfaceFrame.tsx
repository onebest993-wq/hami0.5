import React from 'react';
import type { ProfileAppearanceSettings } from '@/app/services/profile/profilePageTypes';
import {
    resolveProfileAccentHex,
    resolveProfileAccentInkHex,
    resolveProfileAccentOnSolidHex,
    resolveProfilePageBackground,
} from '@/app/services/profile/profilePageAppearance';
import '@/app/components/lawyer/RoyalLawyerProfile/profileChrome.css';
import '@/app/components/lawyer/RoyalLawyerProfile/profilePageFx.css';

export type ProfilePageSurfaceFrameProps = {
    appearance: ProfileAppearanceSettings;
    children: React.ReactNode;
    keyboardInsetPx?: number;
    interactionsOff?: boolean;
    ariaHidden?: boolean;
    openFirstPage?: boolean;
    liveTree?: boolean;
    settingsOpen?: boolean;
    editing?: boolean;
    reduceMotion?: boolean;
    pageHidden?: boolean;
    paintReady?: boolean;
};

/**
 * إطار الثيم المشترك لغطاء الفتح والشجرة الحية — نفس الجذر/الملمس/المتغيرات.
 */
export function ProfilePageSurfaceFrame({
    appearance,
    children,
    keyboardInsetPx = 0,
    interactionsOff = false,
    ariaHidden,
    openFirstPage = false,
    liveTree = false,
    settingsOpen = false,
    editing = false,
    reduceMotion = false,
    pageHidden = false,
    paintReady = false,
}: ProfilePageSurfaceFrameProps): React.ReactElement {
    const accent = appearance.accentColor;
    const pageBg = resolveProfilePageBackground(accent);

    return (
        <div
            className="relative z-[1] text-white overflow-x-clip"
            dir="rtl"
            data-lawyer-profile-root
            data-profile-open-first-page={openFirstPage ? true : undefined}
            data-testid={openFirstPage ? 'profile-open-first-page' : undefined}
            data-profile-live-tree={liveTree ? true : undefined}
            data-profile-material={appearance.material}
            data-profile-portrait-frame={appearance.portraitFrame ?? 'classic'}
            data-profile-accent={accent}
            data-profile-settings-open={settingsOpen ? 'true' : undefined}
            data-profile-editing={editing ? 'true' : undefined}
            data-profile-keyboard-open={keyboardInsetPx > 0 ? 'true' : undefined}
            data-profile-reduce-motion={reduceMotion ? 'true' : undefined}
            data-profile-page-hidden={pageHidden ? 'true' : undefined}
            data-profile-paint-ready={paintReady ? 'true' : undefined}
            style={
                {
                    '--profile-accent': resolveProfileAccentHex(accent),
                    '--profile-accent-ink': resolveProfileAccentInkHex(accent),
                    '--profile-accent-on-solid': resolveProfileAccentOnSolidHex(accent),
                    '--profile-page-bg': pageBg,
                    backgroundColor: pageBg,
                    paddingBottom: `max(4.75rem, calc(env(safe-area-inset-bottom) + 3.5rem + ${keyboardInsetPx}px))`,
                    ...(interactionsOff ? { pointerEvents: 'none' as const } : null),
                } as React.CSSProperties
            }
            aria-hidden={ariaHidden}
        >
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
                <div data-profile-page-texture className="absolute inset-0" />
            </div>
            <div data-profile-layout>{children}</div>
        </div>
    );
}
