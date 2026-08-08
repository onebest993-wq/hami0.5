import { ensureRejectClearingPromise } from '@/app/runtime/ensureRejectClearingPromise';

type ProfileCanvasBackgroundEditorModule =
    typeof import('@/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileCanvasBackgroundEditor');

export type ProfileCanvasBackgroundEditorComponent =
    ProfileCanvasBackgroundEditorModule['ProfileCanvasBackgroundEditor'];

let modulePromise: Promise<ProfileCanvasBackgroundEditorModule> | null = null;
let cachedEditor: ProfileCanvasBackgroundEditorComponent | null = null;

export function isProfileCanvasBgEditorResolved(): boolean {
    return cachedEditor !== null;
}

export function getCachedProfileCanvasBackgroundEditor(): ProfileCanvasBackgroundEditorComponent | null {
    return cachedEditor;
}

export function resetProfileCanvasBgEditorLoaderForTests(): void {
    modulePromise = null;
    cachedEditor = null;
}

function ensureModule(): Promise<ProfileCanvasBackgroundEditorModule> {
    return ensureRejectClearingPromise(modulePromise, (next) => {
        modulePromise = next;
    }, () =>
        import(
            '@/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileCanvasBackgroundEditor'
        ).then((mod) => {
            if (mod?.ProfileCanvasBackgroundEditor) {
                cachedEditor = mod.ProfileCanvasBackgroundEditor;
            }
            return mod;
        }),
    );
}

export function loadProfileCanvasBgEditorModule(): Promise<ProfileCanvasBackgroundEditorModule> {
    return ensureModule();
}

export function prefetchProfileCanvasBgEditorModule(): void {
    if (typeof window === 'undefined') return;
    void ensureModule().catch(() => undefined);
}
