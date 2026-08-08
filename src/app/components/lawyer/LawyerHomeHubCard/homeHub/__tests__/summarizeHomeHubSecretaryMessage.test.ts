import { describe, expect, it } from 'vitest';
import type { SparkNudge } from '@/app/spark/types';
import {
    compactHomeHubSecretaryActionLabel,
    summarizeHomeHubSecretaryMessage,
} from '@/app/components/lawyer/LawyerHomeHubCard/homeHub/summarizeHomeHubSecretaryMessage';

describe('summarizeHomeHubSecretaryMessage', () => {
    it('يختصر تاريخاً غير مجدولاً مع القسم والإضبارة دون تكرار «تاريخ»', () => {
        const nudge: SparkNudge = {
            id: 'cal-1',
            kind: 'calendar.unscheduled_dossier_date',
            surface: 'calendar',
            priority: 6,
            message:
                'موعد غير مجدول في تنفيذ — 06/08/2026 — هل تود مراجعته؟',
            presence: { present: [], missing: ['موعد في التقويم'] },
            source: 'test',
            targetFileId: 'execution:exec-1',
        };
        expect(summarizeHomeHubSecretaryMessage(nudge)).toBe(
            'تنفيذ — 06/08/2026 · غير مجدول',
        );
    });

    it('يُبقي تسمية المسار إن كانت مميزة', () => {
        const nudge: SparkNudge = {
            id: 'cal-2',
            kind: 'calendar.unscheduled_dossier_date',
            surface: 'calendar',
            priority: 6,
            message:
                'موعد غير مجدول في دعوى «12/2025» (مهلة طعن: 06/08/2026) — هل تود مراجعته؟',
            presence: { present: [], missing: [] },
            source: 'test',
        };
        expect(summarizeHomeHubSecretaryMessage(nudge)).toBe(
            'دعوى «12/2025» — مهلة طعن: 06/08/2026 · غير مجدول',
        );
    });

    it('يختصر إضبارة واحدة مع القسم والسبب', () => {
        const nudge: SparkNudge = {
            id: 'home-2',
            kind: 'home.procedural_attention_summary',
            surface: 'home',
            priority: 4,
            message: 'يبدو أن تنفيذ 123/2025 تحتاج غير مبلّغ — هل يهمك الأمر؟',
            presence: { present: [], missing: [] },
            source: 'test',
        };
        expect(summarizeHomeHubSecretaryMessage(nudge)).toBe('تنفيذ 123/2025 · غير مبلّغ');
    });

    it('يختصر مجموعة متابعات على نفس الإضبارة والموضوع', () => {
        const nudge: SparkNudge = {
            id: 'home-3',
            kind: 'home.procedural_attention_summary',
            surface: 'home',
            priority: 4,
            message:
                'يبدو أن تنفيذ «123/2025» — 3 متابعات (غير مبلّغ) — هل يهمك الأمر؟',
            presence: { present: [], missing: [] },
            source: 'test',
        };
        expect(summarizeHomeHubSecretaryMessage(nudge)).toBe('تنفيذ «123/2025» · 3 · غير مبلّغ');
    });
});

describe('compactHomeHubSecretaryActionLabel', () => {
    it('يختصر فتح الإضبارة إلى فتح', () => {
        expect(compactHomeHubSecretaryActionLabel('فتح الإضبارة')).toBe('فتح');
    });
});
