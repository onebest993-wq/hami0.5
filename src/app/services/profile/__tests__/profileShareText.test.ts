import { describe, expect, it } from 'vitest';
import { buildProfileShareText } from '@/app/services/profile/profileShareText';
import { defaultProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

describe('buildProfileShareText', () => {
    const privacy = defaultProfilePageCustomization().privacy;

    it('يشمل حقول المالك كاملة', () => {
        const text = buildProfileShareText({
            displayName: 'أحمد',
            title: 'محامٍ',
            ownerAuthEmail: 'owner@example.com',
            phone: '07701234567',
            city: 'بغداد',
            isOwner: true,
            privacy: { ...privacy, showPhoneMeta: false, showCityMeta: false },
            visibleActions: [],
        });
        expect(text).toContain('أحمد');
        expect(text).toContain('owner@example.com');
        expect(text).toContain('07701234567');
        expect(text).toContain('بغداد');
    });

    it('يخفي الهاتف والمدينة عن الزائر عند إيقاف الخصوصية', () => {
        const text = buildProfileShareText({
            displayName: 'سارة',
            phone: '07709998888',
            city: 'البصرة',
            isOwner: false,
            privacy: { ...privacy, showPhoneMeta: false, showCityMeta: false },
            visibleActions: [{ id: 'e1', type: 'email', label: 'بريد', value: 'public@example.com' }],
        });
        expect(text).toContain('public@example.com');
        expect(text).not.toContain('0770');
        expect(text).not.toContain('البصرة');
    });

    it('لا يُدرج بريد الجلسة للزائر', () => {
        const text = buildProfileShareText({
            displayName: 'خالد',
            ownerAuthEmail: 'viewer@wrong.com',
            isOwner: false,
            privacy,
            visibleActions: [],
        });
        expect(text).toBe('خالد');
        expect(text).not.toContain('viewer@wrong.com');
    });
});
