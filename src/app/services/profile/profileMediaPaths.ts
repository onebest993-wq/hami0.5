import type { ProfilePageCustomization } from '@/app/services/profile/profilePageTypes';

/** يجمع مسارات التخزين السحابي المرتبطة بحاويات الصفحة */
export function collectProfileMediaPaths(
    customization: ProfilePageCustomization | undefined | null,
): string[] {
    const paths: string[] = [];
    const seen = new Set<string>();
    for (const block of customization?.customBlocks ?? []) {
        const imagePath = block.imageStoragePath?.trim();
        if (imagePath && !seen.has(imagePath)) {
            seen.add(imagePath);
            paths.push(imagePath);
        }
        const bgPath = block.canvasStyle?.backgroundStoragePath?.trim();
        if (bgPath && !seen.has(bgPath)) {
            seen.add(bgPath);
            paths.push(bgPath);
        }
    }
    return paths;
}

/** مسارات كانت في السابق واختفت بعد الحفظ/الحذف */
export function profileMediaPathsRemovedFrom(
    previous: ProfilePageCustomization | undefined | null,
    next: ProfilePageCustomization | undefined | null,
): string[] {
    const keep = new Set(collectProfileMediaPaths(next));
    return collectProfileMediaPaths(previous).filter((path) => !keep.has(path));
}

/** مسارات رُفعت في المسودة ولم تُحفظ بعد — تُحذف عند الإلغاء */
export function profileMediaPathsOnlyIn(
    candidate: ProfilePageCustomization | undefined | null,
    baseline: ProfilePageCustomization | undefined | null,
): string[] {
    const base = new Set(collectProfileMediaPaths(baseline));
    return collectProfileMediaPaths(candidate).filter((path) => !base.has(path));
}
