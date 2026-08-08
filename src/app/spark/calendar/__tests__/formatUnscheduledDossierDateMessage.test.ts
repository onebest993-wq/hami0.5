import { describe, expect, it } from 'vitest';
import { formatUnscheduledDossierDateMessage } from '@/app/spark/calendar/formatUnscheduledDossierDateMessage';

describe('formatUnscheduledDossierDateMessage', () => {
    it('يتجنب تكرار «تاريخ» عند عنوان ومسار عامين', () => {
        expect(
            formatUnscheduledDossierDateMessage({
                moduleLabel: 'تنفيذ',
                title: 'تاريخ',
                pathLabel: 'تاريخ',
                whenLabel: '06/08/2026',
            }),
        ).toBe('موعد غير مجدول في تنفيذ — 06/08/2026 — هل تود مراجعته؟');
    });

    it('يُبقي تسمية المسار المميزة', () => {
        expect(
            formatUnscheduledDossierDateMessage({
                moduleLabel: 'دعوى',
                title: '12/2025',
                pathLabel: 'مهلة طعن',
                whenLabel: '06/08/2026',
            }),
        ).toBe('موعد غير مجدول في دعوى «12/2025» (مهلة طعن: 06/08/2026) — هل تود مراجعته؟');
    });
});
