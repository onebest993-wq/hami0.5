import { describe, expect, it } from 'vitest';
import { resolveSparkPreferenceScope } from '@/app/spark/memory/resolveSparkPreferenceScope';
import type { SparkNudge } from '@/app/spark/types';

const baseNudge = (kind: SparkNudge['kind']): SparkNudge => ({
    id: 'n1',
    kind,
    surface: 'home',
    priority: 1,
    message: 'test',
    source: 'test',
});

describe('resolveSparkPreferenceScope', () => {
    it('يستخدم home-hub لملخص الرئيسية', () => {
        expect(resolveSparkPreferenceScope(baseNudge('home.procedural_attention_summary'))).toBe(
            'home-hub',
        );
    });

    it('يستخدم dossierKey للإضبارة المفتوحة', () => {
        expect(
            resolveSparkPreferenceScope(baseNudge('lawsuit.hearing_document_gap'), 'lawsuit:10/2026'),
        ).toBe('lawsuit:10/2026');
    });

    it('يستخدم نطاق أرشيف التنفيذ', () => {
        expect(
            resolveSparkPreferenceScope(
                baseNudge('execution.archive_attention_summary'),
                'execution:1',
            ),
        ).toBe('archive-execution');
    });
});
