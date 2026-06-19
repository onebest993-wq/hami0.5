import type { LawyerProfileSection, ProfileAction } from '@/app/services/lawyer-cloud';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';

export function getBio(sections: LawyerProfileSection[]): string {
    const s = sections.find((x) => x.type === 'bio');
    return s && typeof s.data === 'string' ? s.data : '';
}

export function getActions(sections: LawyerProfileSection[]): ProfileAction[] {
    const s = sections.find((x) => x.type === 'actions');
    return s && Array.isArray(s.data) ? (s.data as ProfileAction[]) : [];
}

export function getGallery(sections: LawyerProfileSection[]): string[] {
    const s = sections.find((x) => x.type === 'gallery');
    return s && Array.isArray(s.data) ? (s.data as string[]) : [];
}

export function buildSections(draft: EditDraft): LawyerProfileSection[] {
    return [
        { id: 'bio-1', type: 'bio', data: draft.bio },
        { id: 'actions-1', type: 'actions', data: draft.actions },
        { id: 'gallery-1', type: 'gallery', data: draft.gallery },
    ];
}

export function actionHref(a: ProfileAction): string {
    switch (a.type) {
        case 'whatsapp':
            return `https://wa.me/${a.value.replace(/\D/g, '')}`;
        case 'call':
            return `tel:${a.value}`;
        case 'email':
            return `mailto:${a.value}`;
        case 'website':
            return a.value.startsWith('http') ? a.value : `https://${a.value}`;
        case 'location':
            return `https://maps.google.com/?q=${encodeURIComponent(a.value)}`;
        default:
            return '#';
    }
}
