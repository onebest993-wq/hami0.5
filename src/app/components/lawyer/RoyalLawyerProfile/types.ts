import type { LawyerProfileHeader, ProfileAction } from '@/app/services/lawyer-cloud';

export type RoyalLawyerProfileProps = {
    isScreenMode?: boolean;
    onBack?: () => void;
};

export type EditDraft = {
    header: LawyerProfileHeader;
    bio: string;
    actions: ProfileAction[];
    gallery: string[];
};
