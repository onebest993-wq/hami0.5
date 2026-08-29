import React, { useEffect, useState } from 'react';
import { ProfileHeroSection } from './ProfileHeroSection';
import { ProfileChromeHeader } from './ProfileChromeHeader';
import { ProfileContentBodySections } from './ProfileContentBodySections';
import type { ProfileContentProps } from './ProfileContentProps';
import type { ProfilePageView } from '../hooks/deriveProfilePageView';
import type { ProfilePageAccess } from '@/app/services/profile/profilePageTypes';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import {
    peekPublicVerifiedBadge,
    subscribePublicVerifiedBadge,
} from '@/app/services/auth/publicVerifiedBadgeStore';

export type ProfileFirstPaintTreeProps = Pick<
    ProfileContentProps,
    | 'saving'
    | 'isEditing'
    | 'draft'
    | 'setDraft'
    | 'uploading'
    | 'avatarRef'
    | 'galleryRef'
    | 'header'
    | 'actions'
    | 'gallery'
    | 'initials'
    | 'displayNamePublic'
    | 'syndicateIdPublic'
    | 'startEdit'
    | 'cancelEdit'
    | 'addContactChannel'
    | 'readOnly'
    | 'forumFollow'
    | 'customization'
    | 'settingsOpen'
    | 'openSettings'
    | 'committedGalleryPaths'
    | 'onGalleryViewerOpenChange'
    | 'onRegisterCloseGalleryViewer'
    | 'screenActive'
    | 'pageHidden'
    | 'isScreenMode'
    | 'onBack'
    | 'displayNamePolicy'
    | 'profileUserId'
> &
    ProfilePageView & {
        pageAccess: ProfilePageAccess;
        pageAccessBusy?: boolean;
        onCyclePageAccess?: () => void;
        accredited?: boolean;
        armEditOnPointerDown?: boolean;
        onSaveEdit: () => void;
        onBlocksLayoutChange: (blocks: ProfilePageCustomization['customBlocks']) => void;
        canView?: boolean;
        followCheckPending?: boolean;
        /** غطاء الفتح: الشارة من المخزن بلا طلب شبكة */
        peekAccredited?: boolean;
        children?: React.ReactNode;
    };

function usePeekAccreditedMark(userId: string, enabled: boolean): boolean {
    const [, setEpoch] = useState(0);
    useEffect(() => {
        if (!enabled) return;
        return subscribePublicVerifiedBadge(() => setEpoch((n) => n + 1));
    }, [enabled, userId]);
    return enabled ? peekPublicVerifiedBadge(userId) : false;
}

/**
 * الشاشة الأولى الكاملة: كروم + هيرو + سكة + قنوات + معرض.
 * بلا مضيف استوديو ولا مدخلات ملف ولا فحص متابعة.
 */
export function ProfileFirstPaintTree({
    saving,
    isEditing,
    draft,
    setDraft,
    uploading,
    avatarRef,
    galleryRef,
    header,
    actions,
    gallery,
    initials,
    displayNamePublic,
    syndicateIdPublic,
    startEdit,
    cancelEdit,
    addContactChannel,
    readOnly = false,
    forumFollow,
    customization,
    settingsOpen,
    openSettings,
    committedGalleryPaths = [],
    onGalleryViewerOpenChange,
    onRegisterCloseGalleryViewer,
    screenActive = true,
    pageHidden = false,
    isScreenMode = false,
    onBack,
    displayNamePolicy = null,
    profileUserId,
    visibleActions,
    showContactSection,
    showGallerySection,
    showCustomBlocks,
    metaItems,
    showSyndicate,
    pageAccess,
    pageAccessBusy,
    onCyclePageAccess,
    accredited = false,
    armEditOnPointerDown = false,
    onSaveEdit,
    onBlocksLayoutChange,
    canView = true,
    followCheckPending = false,
    peekAccredited = false,
    children,
}: ProfileFirstPaintTreeProps): React.ReactElement {
    const peeked = usePeekAccreditedMark((profileUserId ?? '').trim(), peekAccredited);
    const mark = peekAccredited ? peeked : accredited;
    const showProfileBody = canView && !followCheckPending;

    return (
        <div data-testid="lawyer-profile" className="relative w-full flex flex-col min-h-0">
            <ProfileChromeHeader
                showBack={Boolean(onBack)}
                onBack={onBack}
                armBackOnPointerDown={armEditOnPointerDown}
                isEditing={isEditing}
                saving={saving}
                uploading={Boolean(uploading)}
                screenActive={screenActive && !pageHidden}
                onCancelEdit={cancelEdit}
                onSaveEdit={onSaveEdit}
            />

            <div data-profile-scroll-body className="relative min-h-0">
                <ProfileHeroSection
                    isEditing={isEditing}
                    readOnly={readOnly}
                    draft={draft}
                    setDraft={setDraft}
                    header={header}
                    initials={initials}
                    displayNamePublic={displayNamePublic}
                    syndicateIdPublic={syndicateIdPublic}
                    showSyndicate={Boolean(showSyndicate)}
                    metaItems={showProfileBody ? metaItems : []}
                    uploading={uploading}
                    avatarRef={avatarRef}
                    forumFollow={forumFollow}
                    pageAccess={!readOnly ? pageAccess : undefined}
                    pageAccessBusy={pageAccessBusy}
                    onCyclePageAccess={!readOnly ? onCyclePageAccess : undefined}
                    profileViewAllowed={canView}
                    startEdit={startEdit}
                    openSettings={openSettings}
                    armEditOnPointerDown={armEditOnPointerDown}
                    isScreenMode={isScreenMode}
                    accredited={mark}
                    displayNamePolicy={readOnly ? null : displayNamePolicy}
                />

                {showProfileBody ? (
                    <ProfileContentBodySections
                        showContactSection={showContactSection}
                        showGallerySection={showGallerySection}
                        showCustomBlocks={showCustomBlocks}
                        isEditing={isEditing}
                        readOnly={readOnly}
                        draft={draft}
                        setDraft={setDraft}
                        actions={actions}
                        visibleActions={visibleActions}
                        gallery={gallery}
                        committedGalleryPaths={committedGalleryPaths}
                        uploading={uploading}
                        galleryRef={galleryRef}
                        screenActive={screenActive}
                        pageHidden={pageHidden}
                        settingsOpen={settingsOpen}
                        customBlocks={customization.customBlocks}
                        addContactChannel={addContactChannel}
                        onBlocksLayoutChange={onBlocksLayoutChange}
                        onGalleryViewerOpenChange={onGalleryViewerOpenChange}
                        onRegisterCloseGalleryViewer={onRegisterCloseGalleryViewer}
                    />
                ) : null}
                {children}
            </div>
        </div>
    );
}
