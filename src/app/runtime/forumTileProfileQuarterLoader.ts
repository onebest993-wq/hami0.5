type ForumTileProfileQuarterModule =
    typeof import('@/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarter');

let modulePromise: Promise<ForumTileProfileQuarterModule> | null = null;
let resolvedModule: ForumTileProfileQuarterModule | null = null;

export function prefetchForumTileProfileQuarterModule(): void {
    if (typeof window === 'undefined') return;
    if (resolvedModule) return;
    modulePromise ??= import('@/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarter').then(
        (mod) => {
            resolvedModule = mod;
            return mod;
        },
    );
}

export function getCachedForumTileProfileQuarter():
    | ForumTileProfileQuarterModule['ForumTileProfileQuarter']
    | null {
    return resolvedModule?.ForumTileProfileQuarter ?? null;
}

export function loadForumTileProfileQuarterModule(): Promise<ForumTileProfileQuarterModule> {
    prefetchForumTileProfileQuarterModule();
    return modulePromise!;
}
