import type { LawyerProfileSection, ProfileAction } from '@/app/services/lawyer-cloud';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';

export function getActions(sections: LawyerProfileSection[]): ProfileAction[] {
    const s = sections.find((x) => x.type === 'actions');
    return s && Array.isArray(s.data) ? (s.data as ProfileAction[]) : [];
}

export function getGallery(sections: LawyerProfileSection[]): string[] {
    const s = sections.find((x) => x.type === 'gallery');
    return s && Array.isArray(s.data) ? (s.data as string[]) : [];
}

/** يبني الأقسام النشطة فقط — bio/cover أُزيلا من نموذج التحرير */
export function buildSections(draft: EditDraft): LawyerProfileSection[] {
    return [
        { id: 'actions-1', type: 'actions', data: draft.actions },
        { id: 'gallery-1', type: 'gallery', data: draft.gallery },
    ];
}
