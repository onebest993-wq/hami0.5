import { PROFILE_ACCENT_COLORS, PROFILE_MATERIALS } from './profilePageCatalog';
import type {
    ProfileAppearanceColor,
    ProfileAppearanceSettings,
    ProfilePrivacySettings,
} from './profilePageTypes';

const PROFILE_RANDOM_COOLDOWN_STORAGE_KEY = 'hami_profile_random_cooldown_until';

export function readProfileRandomCooldownUntil(): number {
    if (typeof window === 'undefined') return 0;
    try {
        const raw = sessionStorage.getItem(PROFILE_RANDOM_COOLDOWN_STORAGE_KEY);
        const parsed = raw ? Number(raw) : 0;
        return Number.isFinite(parsed) ? parsed : 0;
    } catch {
        return 0;
    }
}

export function writeProfileRandomCooldownUntil(untilMs: number): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(PROFILE_RANDOM_COOLDOWN_STORAGE_KEY, String(untilMs));
    } catch {
        /* ignore */
    }
}

function pickRandom<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)]!;
}

/** يختار لوناً وخامة مختلفين عشوائياً */
export function randomizeProfileAppearance(
    current?: ProfileAppearanceSettings,
): ProfileAppearanceSettings {
    const accentColor = pickRandom(PROFILE_ACCENT_COLORS).id;
    let material = pickRandom(PROFILE_MATERIALS).id;
    if (current && PROFILE_MATERIALS.length > 1) {
        let guard = 0;
        while (material === current.material && guard < 6) {
            material = pickRandom(PROFILE_MATERIALS).id;
            guard += 1;
        }
    }
    let accentGuard = 0;
    let nextAccent = accentColor;
    while (current && nextAccent === current.accentColor && accentGuard < 6) {
        nextAccent = pickRandom(PROFILE_ACCENT_COLORS).id;
        accentGuard += 1;
    }
    return { accentColor: nextAccent, material };
}

export function resolveProfileAccentHex(color: ProfileAppearanceColor): string {
    return PROFILE_ACCENT_COLORS.find((c) => c.id === color)?.hex ?? '#E6C673';
}

export function resolveProfilePageBackground(color: ProfileAppearanceColor): string {
    const hex = resolveProfileAccentHex(color);
    return `color-mix(in srgb, ${hex} 9%, #020408)`;
}

export function filterActionsForVisitor<T extends { id: string }>(
    actions: T[],
    privacy: ProfilePrivacySettings,
    isOwner: boolean,
): T[] {
    if (isOwner) return actions;
    if (!privacy.showContactChannels) return [];
    const hidden = new Set(privacy.hiddenContactIds);
    return actions.filter((a) => !hidden.has(a.id));
}
