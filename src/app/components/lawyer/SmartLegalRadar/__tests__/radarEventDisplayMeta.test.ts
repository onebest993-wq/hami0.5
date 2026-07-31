import { describe, expect, it } from 'vitest';
import {
    parseCalendarNotesMeta,
    resolveRadarEventDisplayMeta,
} from '@/app/components/lawyer/SmartLegalRadar/radarEventDisplayMeta';

describe('radarEventDisplayMeta', () => {
    it('يفسّر الملاحظات القديمة مع الإيموجي بدون إظهارها', () => {
        const parsed = parseCalendarNotesMeta(
            '📂 المصدر: دعوى مدنية — موعد\n🏛 المحكمة: فثقفثق\n👥 لبيليب (المدعي) · يبليبلي (المدعى عليه)\nمحسومة لصالح الموكل',
        );
        expect(parsed.sourceLabel).toBe('دعوى مدنية — موعد');
        expect(parsed.court).toBe('فثقفثق');
        expect(parsed.partiesSummary).toContain('لبيليب');
        expect(parsed.freeNotes).toBe('محسومة لصالح الموكل');
        expect(JSON.stringify(parsed)).not.toMatch(/📂|🏛|👥/);
    });

    it('يفضّل الحقول المنظمة ويتجنب تكرار الموقع مع المحكمة', () => {
        const meta = resolveRadarEventDisplayMeta({
            notes: '📂 المصدر: قديم',
            sourceLabel: 'دعوى مدنية — موعد',
            court: 'محكمة البداءة',
            location: 'محكمة البداءة',
            partiesSummary: 'أحمد (المدعي)',
        });
        expect(meta.sourceLabel).toBe('دعوى مدنية — موعد');
        expect(meta.court).toBe('محكمة البداءة');
        expect(meta.location).toBeUndefined();
        expect(meta.partiesSummary).toBe('أحمد (المدعي)');
    });
});
