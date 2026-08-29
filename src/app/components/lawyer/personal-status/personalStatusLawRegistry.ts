import type { PersonalApplicableLaw } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import type { PersonalStatusLawCodeType } from '@/app/constants/personalStatusLawCatalog';

export type PersonalApplicableLawSource = {
    codeType: PersonalStatusLawCodeType;
    label: string;
    /** إخفاء التبويب إذا لم تُحقن مواد بعد (ما عدا القانون الرئيسي). */
    hideWhenEmpty?: boolean;
};

/** مصادر المواد حسب القانون المطبق على الملف. */
export const PERSONAL_APPLICABLE_LAW_SOURCES: Record<
    PersonalApplicableLaw,
    readonly PersonalApplicableLawSource[]
> = {
    law_188_1959: [
        {
            codeType: 'personal_status_188',
            label: 'قانون الأحوال الشخصية رقم 188',
        },
        {
            codeType: 'personal_status_supplementary',
            label: 'قوانين تطبيقية أخرى',
            hideWhenEmpty: true,
        },
    ],
    jaafari_code: [
        {
            codeType: 'jaafari_code',
            label: 'المدونة الجعفرية',
        },
    ],
};
