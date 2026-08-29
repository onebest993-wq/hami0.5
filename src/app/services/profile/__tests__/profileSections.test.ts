import { describe, expect, it } from 'vitest';
import { buildSections } from '@/app/services/profile/profileSections';
import type { EditDraft } from '@/app/services/profile/profileEditDraft';

describe('buildSections', () => {
    const draft: EditDraft = {
        header: { name: 'أحمد', title: '', profileImage: '', coverImage: '', phone: '', city: '' },
        actions: [{ id: 'a1', type: 'call', label: 'هاتف', value: '0770' }],
        gallery: ['https://cdn.example.com/g1.jpg'],
    };

    it('persists actions and gallery only — no legacy bio section', () => {
        const sections = buildSections(draft);
        expect(sections.map((s) => s.type)).toEqual(['actions', 'gallery']);
        expect(sections.find((s) => s.type === 'bio')).toBeUndefined();
    });
});
