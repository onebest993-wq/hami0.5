import { ensureRejectClearingPromise } from '@/app/runtime/ensureRejectClearingPromise';
import type { ProfileSettingsTab } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsSheetState';

type AppearanceTabModule =
    typeof import('@/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileSettingsAppearanceTab');
type ContainersTabModule =
    typeof import('@/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileSettingsContainersTab');
type TextEditorModule =
    typeof import('@/app/components/lawyer/RoyalLawyerProfile/components/TextBlockStudioEditor');
type ImageEditorModule =
    typeof import('@/app/components/lawyer/RoyalLawyerProfile/components/ImageBlockStudioEditor');

export type ProfileStudioChunk = 'appearance' | 'containers' | 'textEditor' | 'imageEditor';
export type ProfileStudioMainTab = ProfileSettingsTab;

export type ProfileSettingsAppearanceTabComponent = AppearanceTabModule['ProfileSettingsAppearanceTab'];
export type ProfileSettingsContainersTabComponent = ContainersTabModule['ProfileSettingsContainersTab'];
export type TextBlockStudioEditorComponent = TextEditorModule['TextBlockStudioEditor'];
export type ImageBlockStudioEditorComponent = ImageEditorModule['ImageBlockStudioEditor'];

const chunkInflight = new Map<ProfileStudioChunk, Promise<void>>();

let cachedAppearanceTab: ProfileSettingsAppearanceTabComponent | null = null;
let cachedContainersTab: ProfileSettingsContainersTabComponent | null = null;
let cachedTextEditor: TextBlockStudioEditorComponent | null = null;
let cachedImageEditor: ImageBlockStudioEditorComponent | null = null;

function adoptChunk(chunk: ProfileStudioChunk, mod: unknown): void {
    if (!mod || typeof mod !== 'object') return;
    switch (chunk) {
        case 'appearance':
            if ('ProfileSettingsAppearanceTab' in mod) {
                cachedAppearanceTab = (mod as AppearanceTabModule).ProfileSettingsAppearanceTab;
            }
            break;
        case 'containers':
            if ('ProfileSettingsContainersTab' in mod) {
                cachedContainersTab = (mod as ContainersTabModule).ProfileSettingsContainersTab;
            }
            break;
        case 'textEditor':
            if ('TextBlockStudioEditor' in mod) {
                cachedTextEditor = (mod as TextEditorModule).TextBlockStudioEditor;
            }
            break;
        case 'imageEditor':
            if ('ImageBlockStudioEditor' in mod) {
                cachedImageEditor = (mod as ImageEditorModule).ImageBlockStudioEditor;
            }
            break;
        default: {
            const _exhaustive: never = chunk;
            return _exhaustive;
        }
    }
}

function importChunk(chunk: ProfileStudioChunk): Promise<unknown> {
    switch (chunk) {
        case 'appearance':
            return import(
                '@/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileSettingsAppearanceTab'
            );
        case 'containers':
            return import(
                '@/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileSettingsContainersTab'
            );
        case 'textEditor':
            return import('@/app/components/lawyer/RoyalLawyerProfile/components/TextBlockStudioEditor');
        case 'imageEditor':
            return import('@/app/components/lawyer/RoyalLawyerProfile/components/ImageBlockStudioEditor');
        default: {
            const _exhaustive: never = chunk;
            return Promise.reject(new Error(`unknown-chunk:${_exhaustive}`));
        }
    }
}

export function isProfileStudioChunkResolved(chunk: ProfileStudioChunk): boolean {
    switch (chunk) {
        case 'appearance':
            return cachedAppearanceTab !== null;
        case 'containers':
            return cachedContainersTab !== null;
        case 'textEditor':
            return cachedTextEditor !== null;
        case 'imageEditor':
            return cachedImageEditor !== null;
        default: {
            const _exhaustive: never = chunk;
            return Boolean(_exhaustive);
        }
    }
}

export function isProfileStudioMainTabResolved(tab: ProfileStudioMainTab): boolean {
    return isProfileStudioChunkResolved(tab);
}

/** @deprecated استخدم isProfileStudioMainTabResolved */
export function isProfileSettingsStudioTabsResolved(): boolean {
    return (
        isProfileStudioChunkResolved('appearance') &&
        isProfileStudioChunkResolved('containers') &&
        isProfileStudioChunkResolved('textEditor') &&
        isProfileStudioChunkResolved('imageEditor')
    );
}

export function getCachedProfileSettingsAppearanceTab(): ProfileSettingsAppearanceTabComponent | null {
    return cachedAppearanceTab;
}

export function getCachedProfileSettingsContainersTab(): ProfileSettingsContainersTabComponent | null {
    return cachedContainersTab;
}

export function getCachedTextBlockStudioEditor(): TextBlockStudioEditorComponent | null {
    return cachedTextEditor;
}

export function getCachedImageBlockStudioEditor(): ImageBlockStudioEditorComponent | null {
    return cachedImageEditor;
}

export function resetProfileSettingsStudioTabsLoaderForTests(): void {
    chunkInflight.clear();
    cachedAppearanceTab = null;
    cachedContainersTab = null;
    cachedTextEditor = null;
    cachedImageEditor = null;
}

export function loadProfileStudioChunk(chunk: ProfileStudioChunk): Promise<void> {
    if (isProfileStudioChunkResolved(chunk)) return Promise.resolve();

    const pending = chunkInflight.get(chunk);
    if (pending) return pending;

    const run = importChunk(chunk)
        .then((mod) => {
            adoptChunk(chunk, mod);
            if (!isProfileStudioChunkResolved(chunk)) {
                throw new Error(`profile-studio-chunk-missing:${chunk}`);
            }
        })
        .finally(() => {
            chunkInflight.delete(chunk);
        });

    chunkInflight.set(chunk, run);
    return run;
}

export function loadProfileStudioMainTab(tab: ProfileStudioMainTab): Promise<void> {
    return loadProfileStudioChunk(tab);
}

export function prefetchProfileStudioChunk(chunk: ProfileStudioChunk): void {
    if (typeof window === 'undefined') return;
    void loadProfileStudioChunk(chunk).catch(() => undefined);
}

export function prefetchProfileStudioMainTab(tab: ProfileStudioMainTab): void {
    prefetchProfileStudioChunk(tab);
}

/**
 * عند فتح الاستوديو: التبويب الافتراضي (المظهر) فقط — بلا تحميل المحرّرين الثقيلة.
 */
export function prefetchProfileSettingsStudioTabsModule(): void {
    prefetchProfileStudioChunk('appearance');
}

/** تحميل كل الأقسام — للاختبارات أو التسخين العدواني فقط */
export function loadProfileSettingsStudioTabs(): Promise<void> {
    return Promise.all([
        loadProfileStudioChunk('appearance'),
        loadProfileStudioChunk('containers'),
        loadProfileStudioChunk('textEditor'),
        loadProfileStudioChunk('imageEditor'),
    ]).then(() => undefined);
}
