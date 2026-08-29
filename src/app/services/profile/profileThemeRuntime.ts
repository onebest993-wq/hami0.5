import {
    resolveProfileAccentHex,
    resolveProfileAccentInkHex,
    resolveProfileAccentOnSolidHex,
    resolveProfilePageBackground,
    type ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';

type ProfileAppearance = ProfilePageCustomization['appearance'];

/** آخر مظهر طُبّق على الجذر — يُقرأ عند إعادة رسم React حتى لا يُعاد الثيم المحفوظ فوق معاينة الاستوديو */
let liveProfileAppearance: ProfileAppearance | null = null;

export function getLiveProfileAppearance(): ProfileAppearance | null {
    return liveProfileAppearance;
}

/** يُصفَّر عند تبديل هوية الملف حتى لا يتسرّب مظهر مستخدم سابق */
export function clearLiveProfileAppearance(): void {
    liveProfileAppearance = null;
}

/** يؤجّل تطبيق الثيم بعد إغلاق الاستوديو — يترك حركة الإغلاق تكتمل بلا وميض */
export function scheduleProfileRootTheme(
    appearance: ProfileAppearance,
    root?: HTMLElement | null,
): void {
    if (typeof window === 'undefined') {
        applyProfileRootTheme(appearance, root);
        return;
    }
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            applyProfileRootTheme(appearance, root);
        });
    });
}

/** تحديث متغيرات CSS للمعاينة دون إعادة رسم React */
export function applyProfileRootTheme(
    appearance: ProfileAppearance,
    root?: HTMLElement | null,
): void {
    liveProfileAppearance = appearance;
    const el =
        root ??
        (typeof document !== 'undefined'
            ? document.querySelector('[data-lawyer-profile-root]')
            : null);
    if (!el || !(el instanceof HTMLElement)) return;
    el.dataset.profileMaterial = appearance.material;
    el.dataset.profilePortraitFrame = appearance.portraitFrame ?? 'classic';
    el.dataset.profileAccent = appearance.accentColor;
    const pageBg = resolveProfilePageBackground(appearance.accentColor);
    el.style.setProperty('--profile-accent', resolveProfileAccentHex(appearance.accentColor));
    el.style.setProperty('--profile-accent-ink', resolveProfileAccentInkHex(appearance.accentColor));
    el.style.setProperty(
        '--profile-accent-on-solid',
        resolveProfileAccentOnSolidHex(appearance.accentColor),
    );
    el.style.setProperty('--profile-page-bg', pageBg);
    el.style.backgroundColor = pageBg;
}
