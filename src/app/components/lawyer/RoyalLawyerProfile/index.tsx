import React, { useEffect, useLayoutEffect } from 'react';
import type { RoyalLawyerProfileProps } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import { useRoyalLawyerProfile } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useRoyalLawyerProfile';
import { ProfileErrorBoundary } from '@/app/components/lawyer/RoyalLawyerProfile/ProfileErrorBoundary';
import { ProfileBackBar } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileBackBar';
import { ProfileContent } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileContent';
import { ProfileInstantShell } from '@/app/components/lawyer/RoyalLawyerProfile/ProfileInstantShell';
import { resolveProfileAccentHex, resolveProfileAccentInkHex, resolveProfileAccentOnSolidHex, resolveProfilePageBackground } from '@/app/services/profile/profilePageCustomization';
import { getLiveProfileAppearance } from '@/app/services/profile/profileThemeRuntime';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useProfilePageHidden } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfilePageHidden';
import { ensureProfilePageSecondaryFxLoaded } from '@/app/components/lawyer/RoyalLawyerProfile/profilePageFxLoader';
import '@/app/components/lawyer/RoyalLawyerProfile/profilePageFx.css';
import '@/app/components/lawyer/RoyalLawyerProfile/profileChrome.css';

export type { RoyalLawyerProfileProps } from '@/app/components/lawyer/RoyalLawyerProfile/types';

/**
 * فتح مستقر: محتوى فوري من الكاش — بلا بوابة settle / غطاء / تبديل قشرة فوق محتوى جاهز.
 * تلك الطبقات كانت تزيد الوميض على Android WebView.
 */
function RoyalLawyerProfileInner(props: RoyalLawyerProfileProps) {
    const { isScreenMode, onBack, forumFollow, screenActive = true } = props;
    const profile = useRoyalLawyerProfile(props);
    const reduceMotion = useReduceMotion();
    const contentReady = Boolean(profile.paintReady && profile.header);
    const pageHidden = useProfilePageHidden(screenActive);
    const reveal = Boolean(screenActive && contentReady);

    useLayoutEffect(() => {
        ensureProfilePageSecondaryFxLoaded();
    }, []);

    useEffect(() => {
        if (!profile.paintReady) return;
        ensureProfilePageSecondaryFxLoaded();
    }, [profile.paintReady]);

    /*
     * أثناء الاستوديو: الثيم الحي من applyProfileRootTheme (قد لا يمرّ عبر React).
     * إن أُعيد رسم الجذر، نقرأ آخر معاينة حتى لا يُعاد الثيم المحفوظ فوقها.
     */
    const liveAppearance = profile.settingsOpen ? getLiveProfileAppearance() : null;
    const appearance = liveAppearance ?? profile.customization.appearance;
    const accent = appearance.accentColor;
    const material = appearance.material;
    const portraitFrame = appearance.portraitFrame ?? 'classic';
    const pageBg = resolveProfilePageBackground(accent);

    return (
        <div
            className="relative z-[1] min-h-full text-white overflow-x-clip pb-[max(8rem,calc(env(safe-area-inset-bottom)+6rem))]"
            dir="rtl"
            data-lawyer-profile-root
            data-profile-material={material}
            data-profile-portrait-frame={portraitFrame}
            data-profile-settings-open={profile.settingsOpen ? 'true' : undefined}
            data-profile-reduce-motion={reduceMotion ? 'true' : undefined}
            data-profile-page-hidden={pageHidden ? 'true' : undefined}
            data-profile-paint-ready={profile.paintReady ? 'true' : undefined}
            style={
                {
                    '--profile-accent': resolveProfileAccentHex(accent),
                    '--profile-accent-ink': resolveProfileAccentInkHex(accent),
                    '--profile-accent-on-solid': resolveProfileAccentOnSolidHex(accent),
                    '--profile-page-bg': pageBg,
                    backgroundColor: pageBg,
                    ...(pageHidden ? { pointerEvents: 'none' as const } : null),
                } as React.CSSProperties
            }
            aria-hidden={pageHidden || (!reveal && !profile.loadError)}
        >
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
                <div data-profile-page-texture className="absolute inset-0" />
            </div>

            {isScreenMode && onBack ? (
                <ProfileBackBar onBack={() => void profile.handleBack()} />
            ) : null}

            {contentReady ? (
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
                    pageHidden={pageHidden}
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
            ) : (
                /* keepAlive تحت الغطاء: أظهر قشرة بدل فراغ أسود عند أول snap */
                <ProfileInstantShell embedded />
            )}
        </div>
    );
}

export function RoyalLawyerProfile(props: RoyalLawyerProfileProps) {
    return (
        <ProfileErrorBoundary onBack={props.onBack}>
            <RoyalLawyerProfileInner {...props} />
        </ProfileErrorBoundary>
    );
}
