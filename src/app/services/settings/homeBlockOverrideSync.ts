import type { HomeBlockStyleOverride } from './homeLayout';

/** حقول المظهر القديمة من وضع التحرير — تُزال عند المزامنة فقط */
export const HOME_BLOCK_GLOBAL_APPEARANCE_KEYS = [
    'accentColor',
    'shape',
] as const satisfies ReadonlyArray<keyof HomeBlockStyleOverride>;

export type HomeBlockGlobalAppearanceKey = (typeof HOME_BLOCK_GLOBAL_APPEARANCE_KEYS)[number];

export function hasConflictingAppearanceOverrides(
    override?: HomeBlockStyleOverride,
): boolean {
    if (!override) return false;
    return HOME_BLOCK_GLOBAL_APPEARANCE_KEYS.some((key) => override[key] !== undefined);
}

export function stripConflictingAppearanceOverrides(
    override?: HomeBlockStyleOverride,
): HomeBlockStyleOverride | undefined {
    if (!override) return undefined;
    const next: HomeBlockStyleOverride = { ...override };
    for (const key of HOME_BLOCK_GLOBAL_APPEARANCE_KEYS) {
        delete next[key];
    }
    return Object.keys(next).length > 0 ? next : undefined;
}

/** patch لمسح تجاوزات المظهر المتعارضة مع الإعدادات العامة */
export function buildClearConflictingAppearancePatch(): Partial<HomeBlockStyleOverride> {
    return Object.fromEntries(
        HOME_BLOCK_GLOBAL_APPEARANCE_KEYS.map((key) => [key, undefined]),
    ) as Partial<HomeBlockStyleOverride>;
}
