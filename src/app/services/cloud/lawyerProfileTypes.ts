import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

export interface LawyerProfileHeader {
    name: string;
    title: string;
    coverImage: string;
    profileImage: string;
    profileImagePath?: string;
    coverImagePath?: string;
    phone?: string;
    city?: string;
    workplace?: string;
    specialization?: string;
    practiceSinceYear?: number;
    syndicateId?: string;
}

export interface ProfileStat {
    id: string;
    label: string;
    value: string;
}

/** عنصر معرض الملف — URL مع تركيز/تكبير اختياري */
export type ProfileGalleryItem = {
    url: string;
    focusX: number;
    focusY: number;
    zoom: number;
    /** مسار التخزين السحابي — لتنظيف الوسائط اليتيمة */
    storagePath?: string;
};

export type ProfileLocationMode = 'gps' | 'manual';

export interface ProfileAction {
    id: string;
    type: 'call' | 'email' | 'website' | 'location';
    label: string;
    value: string;
    /** للموقع: gps = فتح الخرائط، manual = عرض نصي فقط */
    locationMode?: ProfileLocationMode;
}

export interface LawyerProfileSection {
    id: string;
    type: 'stats' | 'bio' | 'gallery' | 'actions';
    data: ProfileStat[] | string[] | string | ProfileAction[] | ProfileGalleryItem[];
}

export interface LawyerProfileData {
    header: LawyerProfileHeader;
    sections: LawyerProfileSection[];
    customization?: ProfilePageCustomization;
}

export const DEFAULT_LAWYER_PROFILE: LawyerProfileData = {
    header: {
        name: '',
        title: 'المحامي والمستشار القانوني',
        coverImage: '',
        profileImage: '',
        phone: '',
        city: '',
        workplace: '',
        specialization: '',
    },
    sections: [
        { id: 'bio-1', type: 'bio', data: '' },
        { id: 'actions-1', type: 'actions', data: [] },
        { id: 'gallery-1', type: 'gallery', data: [] },
    ],
};
