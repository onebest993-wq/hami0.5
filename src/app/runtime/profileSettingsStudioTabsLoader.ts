import { ensureRejectClearingPromise } from '@/app/runtime/ensureRejectClearingPromise';

type AppearanceTabModule =
    typeof import('@/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileSettingsAppearanceTab');
type ContainersTabModule =
    typeof import('@/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileSettingsContainersTab');
type TextEditorModule =
    typeof import('@/app/components/lawyer/RoyalLawyerProfile/components/TextBlockStudioEditor');
type ImageEditorModule =
    typeof import('@/app/components/lawyer/RoyalLawyerProfile/components/ImageBlockStudioEditor');

export type ProfileSettingsAppearanceTabComponent = AppearanceTabModule['ProfileSettingsAppearanceTab'];
export type ProfileSettingsContainersTabComponent = ContainersTabModule['ProfileSettingsContainersTab'];
export type TextBlockStudioEditorComponent = TextEditorModule['TextBlockStudioEditor'];
export type ImageBlockStudioEditorComponent = ImageEditorModule['ImageBlockStudioEditor'];

let tabsPromise: Promise<void> | null = null;
let cachedAppearanceTab: ProfileSettingsAppearanceTabComponent | null = null;
let cachedContainersTab: ProfileSettingsContainersTabComponent | null = null;
let cachedTextEditor: TextBlockStudioEditorComponent | null = null;
let cachedImageEditor: ImageBlockStudioEditorComponent | null = null;

export function isProfileSettingsStudioTabsResolved(): boolean {
    return Boolean(cachedAppearanceTab && cachedContainersTab && cachedTextEditor && cachedImageEditor);
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
    tabsPromise = null;
    cachedAppearanceTab = null;
    cachedContainersTab = null;
    cachedTextEditor = null;
    cachedImageEditor = null;
}

export function loadProfileSettingsStudioTabs(): Promise<void> {
    if (isProfileSettingsStudioTabsResolved()) return Promise.resolve();
    return ensureRejectClearingPromise(tabsPromise, (next) => {
        tabsPromise = next;
    }, () =>
        Promise.all([
            import(
                '@/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileSettingsAppearanceTab'
            ),
            import(
                '@/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileSettingsContainersTab'
            ),
            import('@/app/components/lawyer/RoyalLawyerProfile/components/TextBlockStudioEditor'),
            import('@/app/components/lawyer/RoyalLawyerProfile/components/ImageBlockStudioEditor'),
        ]).then(([appearance, containers, textEditor, imageEditor]) => {
            if (appearance?.ProfileSettingsAppearanceTab) {
                cachedAppearanceTab = appearance.ProfileSettingsAppearanceTab;
            }
            if (containers?.ProfileSettingsContainersTab) {
                cachedContainersTab = containers.ProfileSettingsContainersTab;
            }
            if (textEditor?.TextBlockStudioEditor) {
                cachedTextEditor = textEditor.TextBlockStudioEditor;
            }
            if (imageEditor?.ImageBlockStudioEditor) {
                cachedImageEditor = imageEditor.ImageBlockStudioEditor;
            }
        }),
    );
}

export function prefetchProfileSettingsStudioTabsModule(): void {
    if (typeof window === 'undefined') return;
    void loadProfileSettingsStudioTabs().catch(() => undefined);
}
