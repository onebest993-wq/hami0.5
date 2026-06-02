import { describe, expect, it } from 'vitest';
import { clusterTextIncludes } from '../clusterTextMatch';
import { clusterMatchReason, findCrossSectionLinks } from '../clusterMatchRules';
import type { ClusterScanRecord } from '../types';

describe('clusterTextMatch', () => {
    it('يطابق الأسماء العربية بعد التطبيع', () => {
        expect(clusterTextIncludes('شركة الأفق', 'ملف شركة الافق للتجارة')).toBe(true);
    });

    it('يرفض رقم قضية قصير جداً', () => {
        expect(clusterMatchReason('', '456', '', '456', 'عنوان')).toBeNull();
    });

    it('لا يربط رقم قضية جزئياً بآخر أطول (تجنب الإيجاب الكاذب)', () => {
        expect(
            clusterMatchReason('', '2026/ولائي/456', '', '2026/ولائي/4567', 'دعوى'),
        ).toBeNull();
    });

    it('لا يربط اسم موكل داخل كلمة أطول', () => {
        expect(
            clusterMatchReason('علي', '', 'معالي الدين', 'عنوان', ''),
        ).toBeNull();
    });

    it('لا يربط طلبات مستعجلة متعددة بنفس القسم', () => {
        const index: ClusterScanRecord[] = [
            {
                id: 'u1',
                type: 'urgent',
                title: 'حجز — 2026/ولائي/456',
                clientName: 'أ',
                caseNumber: '2026/ولائي/456',
                routePath: 'workspace:urgent:u1',
            },
            {
                id: 'u2',
                type: 'urgent',
                title: 'حجز آخر — 2026/ولائي/456',
                clientName: 'ب',
                caseNumber: '2026/ولائي/456',
                routePath: 'workspace:urgent:u2',
            },
            {
                id: 'l1',
                type: 'lawsuit',
                title: 'دعوى — 2026/ولائي/456',
                clientName: 'موكل',
                caseNumber: '2026/ولائي/456',
                routePath: 'workspace:lawsuit:l1',
            },
        ];
        const links = findCrossSectionLinks(
            { type: 'urgent', id: 'u1', clientName: '', caseNumber: '2026/ولائي/456' },
            index,
        );
        expect(links.some((l) => l.type === 'urgent')).toBe(false);
        expect(links.some((l) => l.type === 'lawsuit')).toBe(true);
        expect(links.length).toBeLessThanOrEqual(5);
    });
});
