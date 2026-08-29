/** مسودة تحرير الملف المهني — نوع مجال، لا يعتمد على طبقة UI */
import type {
    LawyerProfileHeader,
    ProfileAction,
    ProfileGalleryItem,
} from '@/app/services/cloud/lawyerProfileTypes';

export type ProfileEditDraft = {
    header: LawyerProfileHeader;
    actions: ProfileAction[];
    gallery: ProfileGalleryItem[];
};

/** اسم تاريخي مستقر للمستهلكين */
export type EditDraft = ProfileEditDraft;
