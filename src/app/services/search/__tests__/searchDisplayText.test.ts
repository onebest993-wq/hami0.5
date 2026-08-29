import { describe, expect, it } from 'vitest';
import {
    formatSearchLocationPath,
    sanitizeSearchDisplayText,
    searchEventTypeLabel,
} from '@/app/services/search/searchDisplayText';

describe('searchDisplayText', () => {
    it('يزيل الإيموجي والرموز الزخرفية من نص العرض', () => {
        expect(sanitizeSearchDisplayText('✨ فتح إضبارة التمييز')).toBe('فتح إضبارة التمييز');
        expect(sanitizeSearchDisplayText('قرار ⭐ محكمة')).toBe('قرار محكمة');
    });

    it('يزيل HTML وتجاوز الاتجاه من نص العرض', () => {
        expect(sanitizeSearchDisplayText('<img src=x onerror=alert(1)>دعوى')).toBe('دعوى');
        expect(sanitizeSearchDisplayText('يمين\u202Eيسار')).toBe('يمينيسار');
    });

    it('يترجم أنواع الأحداث الإنجليزية إلى عربية', () => {
        expect(searchEventTypeLabel('appointment')).toBe('موعد');
        expect(searchEventTypeLabel('decision')).toBe('قرار');
        expect(searchEventTypeLabel('')).toBe('');
    });

    it('يبني مسار موقع مفصول بنقاط', () => {
        expect(formatSearchLocationPath(['100/2026', 'بداءة', 'موعد', 'أحمد'])).toBe(
            '100/2026 · بداءة · موعد · أحمد',
        );
    });
});
