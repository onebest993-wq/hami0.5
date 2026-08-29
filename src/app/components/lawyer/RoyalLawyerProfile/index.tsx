import React from 'react';
import type { RoyalLawyerProfileProps } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import { useRoyalLawyerProfile } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useRoyalLawyerProfile';
import { ProfileErrorBoundary } from '@/app/components/lawyer/RoyalLawyerProfile/ProfileErrorBoundary';
import { ProfileContent } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileContent';
import { ProfilePageSurfaceFrame } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfilePageSurfaceFrame';
import { getLiveProfileAppearance } from '@/app/services/profile/profileThemeRuntime';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { isAndroidNativeShell } from '@/app/runtime/nativePlatform';
import { useProfilePageHidden } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfilePageHidden';
import { prefetchProfileAndroidFx } from '@/app/runtime/profileAndroidFxLoader';

/* Capacitor Android: FX overrides خارج برميل الويب — تسخين فوري عند دخول الوحدة */
prefetchProfileAndroidFx();
export type { RoyalLawyerProfileProps } from '@/app/components/lawyer/RoyalLawyerProfile/types';

/**
 * فتح مستقر: محتوى فوري من الكاش — بلا قشرة InstantShell ولا بوابة settle فوق محتوى جاهز.
 */
function RoyalLawyerProfileInner(props: RoyalLawyerProfileProps) {
    const { isScreenMode, onBack, forumFollow, screenActive = true } = props;
    const profile = useRoyalLawyerProfile(props);
    const reduceMotion = useReduceMotion() || isAndroidNativeShell();
    const contentReady = profile.contentReady;
    const browserTabHidden = useProfilePageHidden(screenActive);
    const hasRenderableProfile = Boolean(profile.header) || contentReady;
    /* التفاعل فقط — لا تُربط أنماط الرسم بـ page-hidden أثناء keepAlive */
    const interactionsOff = !screenActive || browserTabHidden;
    const reveal = Boolean(screenActive && hasRenderableProfile);
    const editKeyboardInset = useMobileKeyboardInset(
        profile.isEditing && !profile.settingsOpen && screenActive && !browserTabHidden,
        true,
    );

    /*
     * أثناء الاستوديو: الثيم الحي من applyProfileRootTheme (قد لا يمرّ عبر React).
     * إن أُعيد رسم الجذر، نقرأ آخر معاينة حتى لا يُعاد الثيم المحفوظ فوقها.
     */
    const liveAppearance = profile.settingsOpen ? getLiveProfileAppearance() : null;
    const appearance = liveAppearance ?? profile.customization.appearance;

    return (
        <ProfilePageSurfaceFrame
            appearance={appearance}
            liveTree
            settingsOpen={profile.settingsOpen}
            editing={profile.isEditing}
            keyboardInsetPx={editKeyboardInset}
            reduceMotion={reduceMotion}
            pageHidden={browserTabHidden}
            paintReady={profile.paintReady}
            interactionsOff={interactionsOff}
            ariaHidden={interactionsOff || (!reveal && !profile.loadError)}
        >
            {hasRenderableProfile || (isScreenMode && !profile.loadError) ? (
                <ProfileContent
                    saving={profile.saving}
                    isEditing={profile.isEditing}
                    draft={profile.draft}
                    setDraft={profile.setDraft}
                    uploading={profile.uploading}
                    avatarRef={profile.avatarRef}
                    galleryRef={profile.galleryRef}
                    header={profile.header}
                    actions={profile.actions}
                    gallery={profile.gallery}
                    initials={profile.initials}
                    displayNamePublic={profile.displayNamePublic}
                    cityPublic={profile.cityPublic}
                    phonePublic={profile.phonePublic}
                    syndicateIdPublic={profile.syndicateIdPublic}
                    startEdit={profile.startEdit}
                    cancelEdit={profile.cancelEdit}
                    saveProfile={profile.saveProfile}
                    uploadImage={profile.uploadImage}
                    addContactChannel={profile.addContactChannel}
                    readOnly={!profile.isOwnProfile}
                    forumFollow={forumFollow}
                    customization={profile.customization}
                    settingsOpen={profile.settingsOpen}
                    savingSettings={profile.savingSettings}
                    profileUserId={profile.profileUserId}
                    openSettings={profile.openSettings}
                    closeSettings={profile.closeSettings}
                    registerStudioDiscard={profile.registerStudioDiscard}
                    saveCustomization={profile.saveCustomization}
                    setPendingEditCustomization={profile.setPendingEditCustomization}
                    committedGalleryPaths={profile.committedGalleryPaths}
                    onGalleryViewerOpenChange={profile.onGalleryViewerOpenChange}
                    onRegisterCloseGalleryViewer={profile.onRegisterCloseGalleryViewer}
                    screenActive={screenActive}
                    pageHidden={interactionsOff}
                    isScreenMode={isScreenMode}
                    onBack={
                        /* دائماً في وضع الشاشة — وإلا يُركَّب الكروم بعد snap ويدفع الهيرو */
                        isScreenMode && onBack ? () => void profile.handleBack() : undefined
                    }
                    displayNamePolicy={profile.displayNamePolicy}
                />
            ) : profile.loadError ? (
                <div
                    className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
                    data-testid="lawyer-profile-load-error"
                    role="alert"
                >
                    <p className="text-sm text-white/70">تعذّر تحميل الملف الشخصي</p>
                    <button
                        type="button"
                        onClick={() => profile.reloadProfile()}
                        className="min-h-[44px] px-4 rounded-xl border border-[#E6C673]/35 text-sm font-bold text-[#E6C673] touch-manipulation"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            ) : null}
        </ProfilePageSurfaceFrame>
    );
}

export function RoyalLawyerProfile(props: RoyalLawyerProfileProps) {
    return (
        <ProfileErrorBoundary onBack={props.onBack}>
            <RoyalLawyerProfileInner {...props} />
        </ProfileErrorBoundary>
    );
}
