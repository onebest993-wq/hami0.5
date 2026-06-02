import { describe, expect, it } from 'vitest';
import {
    buildAlertDisplayMeta,
    buildAlertHeadline,
    buildSectionPhaseLine,
    formatAlertDueAt,
    isEndOfDayPlaceholderTime,
    isPlaceholderDisplayTime,
    normalizeProceduralPhase,
} from '../alertDisplayMeta';
import type { SecretaryAlert } from '../SecretaryOrchestrator';

describe('alertDisplayMeta', () => {
    it('يعرض العنوان والمحكمة وسطر القسم والمرحلة', () => {
        const alert: SecretaryAlert = {
            id: 'calendar:x',
            type: 'HEARING',
            title: 'علي حسن — 2026/150',
            summary: 'محكمة الجنح — جلسة مرافعة',
            dueAt: '2026-05-25T07:00:00.000Z',
            suggestedAction: '⚖️ تحضير دفوع الجلسة',
            aiDeepDive: 'موعد',
            target: 'criminal',
            priority: 2,
            clientName: 'علي حسن',
            caseNumber: '2026/150',
            courtName: 'محكمة الجنح',
            actionType: 'جلسة مرافعة',
        };
        const meta = buildAlertDisplayMeta(alert);
        expect(meta.headline).toBe('علي حسن — 2026/150');
        expect(meta.courtSubtitle).toBe('محكمة الجنح');
        expect(meta.sectionPhaseLine).toContain('جزائي');
        expect(meta.sectionPhaseLine).toContain('جلسة مرافعة');
        expect(meta.alertReason).toBeUndefined();
        expect(meta.caseRef).toBe('2026/150');
    });

    it('يصحح مرحلة التحقيق عند محكمة الجنح', () => {
        expect(normalizeProceduralPhase('مرحلة التحقيق', 'محكمة الجنح')).toBe('مرحلة المحاكمة');
        const line = buildSectionPhaseLine({
            id: 'x',
            type: 'HEARING',
            title: 'موكل',
            summary: 'محكمة الجنح — مرحلة التحقيق',
            aiDeepDive: '',
            target: 'criminal',
            priority: 2,
            courtName: 'محكمة الجنح',
            actionType: 'مرحلة التحقيق',
        });
        expect(line).toContain('مرحلة المحاكمة');
        expect(line).not.toMatch(/تحقيق/);
    });

    it('fallback لإضبارة جزائية بلا اسم موكل', () => {
        expect(
            buildAlertHeadline({
                id: 'x',
                type: 'DEADLINE',
                title: 'undefined — undefined',
                summary: '—',
                aiDeepDive: '',
                target: 'criminal',
                priority: 2,
            }),
        ).toBe('إضبارة جزائية غير معنونة');
    });

    it('يخفي 23:59 ويعرض التاريخ فقط', () => {
        const iso = new Date(2026, 4, 21, 23, 59, 0).toISOString();
        expect(isEndOfDayPlaceholderTime(iso)).toBe(true);
        expect(isPlaceholderDisplayTime(iso)).toBe(true);
        const formatted = formatAlertDueAt(iso);
        expect(formatted).toBeTruthy();
        expect(formatted).not.toMatch(/23:59/);
        expect(formatted).not.toMatch(/11:59/);
    });
});
