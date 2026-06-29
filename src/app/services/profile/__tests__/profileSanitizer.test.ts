import { describe, expect, it } from 'vitest';
import { sanitizeLawyerProfile } from '@/app/services/profileSanitizer';
import type { LawyerProfileData } from '@/app/services/lawyer-cloud';

describe('sanitizeLawyerProfile', () => {
    it('يقصّ أطوال الاسم وقنوات التواصل عند التحميل', () => {
        const raw: LawyerProfileData = {
            header: { name: 'ن'.repeat(100), title: 'محامٍ' },
            sections: [
                {
                    type: 'actions',
                    data: [
                        {
                            id: 'a1',
                            type: 'email',
                            label: 'ب'.repeat(60),
                            value: 'x'.repeat(300),
                        },
                    ],
                },
            ],
            customization: {},
        };

        const cleaned = sanitizeLawyerProfile(raw);
        expect(cleaned.header.name.length).toBe(80);
        const action = cleaned.sections[0]?.data?.[0] as { label: string; value: string };
        expect(action.label.length).toBe(48);
        expect(action.value.length).toBe(240);
    });
});
