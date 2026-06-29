import {
    resolveProfileAccentHex,
    resolveProfilePageBackground,
    type ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';

/** تحديث متغيرات CSS للمعاينة دون إعادة رسم React */
export function applyProfileRootTheme(
    appearance: ProfilePageCustomization['appearance'],
    root?: HTMLElement | null,
): void {
    const el =
        root ??
        (typeof document !== 'undefined'
            ? document.querySelector('[data-lawyer-profile-root]')
            : null);
    if (!el || !(el instanceof HTMLElement)) return;
    el.dataset.profileMaterial = appearance.material;
    el.style.setProperty('--profile-accent', resolveProfileAccentHex(appearance.accentColor));
    el.style.setProperty('--profile-page-bg', resolveProfilePageBackground(appearance.accentColor));
}
