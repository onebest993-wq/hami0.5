import type React from 'react';
import type { ForumProfileFollowState } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { LawyerProfileHeader, ProfileAction, ProfileGalleryItem } from '@/app/services/lawyer-cloud';
import type { EditDraft } from '../types';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import type { DisplayNamePolicy } from '@/app/domain/profile/displayNameCorrection';

export interface ProfileContentProps {
    saving: boolean;
    isEditing: boolean;
    draft: EditDraft | null;
    setDraft: React.Dispatch<React.SetStateAction<EditDraft | null>>;
    uploading: 'avatar' | 'gallery' | null;
    avatarRef: React.RefObject<HTMLInputElement | null>;
    galleryRef: React.RefObject<HTMLInputElement | null>;
    header: LawyerProfileHeader | undefined;
    actions: ProfileAction[];
    gallery: ProfileGalleryItem[];
    initials: string;
    displayNamePublic: string;
    cityPublic: string | undefined;
    phonePublic: string | undefined;
    syndicateIdPublic: string | undefined;
    startEdit: () => void;
    cancelEdit: () => void;
    saveProfile: (customizationOverride?: ProfilePageCustomization) => Promise<boolean>;
    uploadImage: (file: File, target: 'avatar' | 'gallery') => Promise<void>;
    addContactChannel: (type: ProfileAction['type']) => void;
    readOnly?: boolean;
    forumFollow?: ForumProfileFollowState;
    customization: ProfilePageCustomization;
    settingsOpen: boolean;
    savingSettings: boolean;
    profileUserId: string;
    openSettings: () => void;
    closeSettings: () => void;
    registerStudioDiscard?: (fn: (() => void) | null) => void;
    saveCustomization: (next: ProfilePageCustomization, options?: { silent?: boolean }) => Promise<boolean>;
    setPendingEditCustomization?: (next: ProfilePageCustomization | null) => void;
    committedGalleryPaths?: Array<string | undefined | null>;
    onGalleryViewerOpenChange?: (open: boolean) => void;
    onRegisterCloseGalleryViewer?: (close: (() => void) | null) => void;
    /** يُمرَّر من الشاشة — يخفي بوابات التعديل/المعرض عند keepAlive */
    screenActive?: boolean;
    pageHidden?: boolean;
    /** تبويب اللوحة — إخفاء شريط التنقل الداخلي */
    isScreenMode?: boolean;
    /** شاشة كاملة — زر الرجوع في صف الكروم العلوي */
    onBack?: () => void;
    displayNamePolicy?: DisplayNamePolicy | null;
}
