import type { CSSProperties } from 'react';
import type { LawyerProfileSection, ProfileAction, ProfileGalleryItem } from '@/app/services/lawyer-cloud';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import { coerceGalleryItems } from '@/app/services/profile/profileGalleryItems';

export function getActions(sections: LawyerProfileSection[]): ProfileAction[] {
    const s = sections.find((x) => x.type === 'actions');
    return s && Array.isArray(s.data) ? (s.data as ProfileAction[]) : [];
}

export function getGallery(sections: LawyerProfileSection[]): ProfileGalleryItem[] {
    const s = sections.find((x) => x.type === 'gallery');
    return s && Array.isArray(s.data) ? coerceGalleryItems(s.data) : [];
}

/** يبني الأقسام النشطة فقط — bio/cover أُزيلا من نموذج التحرير */
export function buildSections(draft: EditDraft): LawyerProfileSection[] {
    return [
        { id: 'actions-1', type: 'actions', data: draft.actions },
        { id: 'gallery-1', type: 'gallery', data: draft.gallery },
    ];
}

/** نمط CSS لصورة عنصر المعرض مع التركيز والتكبير */
export function galleryItemImageStyle(item: ProfileGalleryItem): CSSProperties {
    const focusX = typeof item.focusX === 'number' ? item.focusX : 50;
    const focusY = typeof item.focusY === 'number' ? item.focusY : 50;
    const zoom = typeof item.zoom === 'number' ? item.zoom : 100;
    return {
        objectPosition: `${focusX}% ${focusY}%`,
        transform: `scale(${zoom / 100})`,
        transformOrigin: `${focusX}% ${focusY}%`,
    };
}
