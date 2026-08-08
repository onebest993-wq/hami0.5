import { beforeEach, describe, expect, it } from 'vitest';
import { buildSparkShellViewModel } from '@/app/spark/engine/sparkPassiveEngine';
import {
    registerSparkShellContext,
    resetSparkShellStoreForTests,
} from '@/app/spark/shell/sparkShellStore';
import type { SparkNudge } from '@/app/spark/types';

const sampleNudge = (id: string, kind: SparkNudge['kind'] = 'lawsuit.hearing_document_gap'): SparkNudge => ({
    id,
    kind,
    surface: 'lawsuit',
    priority: 5,
    message: `تنبيه ${id}`,
    source: 'test',
    dossierKey: 'lawsuit:1',
});

describe('sparkPassiveEngine', () => {
    beforeEach(() => {
        resetSparkShellStoreForTests();
    });

    it('يفضّل تنبيه الإضبارة المفتوحة على ملخص الرئيسية', () => {
        registerSparkShellContext({
            surface: 'lawsuit',
            dossierKey: 'lawsuit:1',
            dossierLabel: '10/2026',
            passiveNudge: sampleNudge('open-1'),
        });

        const view = buildSparkShellViewModel({
            registration: {
                surface: 'lawsuit',
                dossierKey: 'lawsuit:1',
                dossierLabel: '10/2026',
                passiveNudge: sampleNudge('open-1'),
            },
            homeSummary: sampleNudge('home-1', 'home.procedural_attention_summary'),
        });

        expect(view.nudges).toHaveLength(1);
        expect(view.nudges[0]?.id).toBe('open-1');
        expect(view.contextLabel).toBe('10/2026');
    });

    it('يعرض ملخص الرئيسية عند غياب إضبارة مفتوحة', () => {
        const view = buildSparkShellViewModel({
            registration: null,
            homeSummary: sampleNudge('home-1', 'home.procedural_attention_summary'),
        });

        expect(view.hasAttention).toBe(true);
        expect(view.nudges[0]?.kind).toBe('home.procedural_attention_summary');
        expect(view.surface).toBe('home');
    });

    it('يعرض طابور تنبيهات الإضبارة في Shell', () => {
        const view = buildSparkShellViewModel({
            registration: {
                surface: 'execution',
                dossierKey: 'execution:1',
                dossierLabel: '100/2026',
                passiveNudge: sampleNudge('exec-1', 'execution.debtor_unnotified'),
                passiveNudges: [
                    sampleNudge('exec-1', 'execution.debtor_unnotified'),
                    sampleNudge('exec-2', 'execution.secretary_deadline'),
                    sampleNudge('exec-3', 'execution.coercive_stalled'),
                ],
            },
            homeSummary: null,
        });

        expect(view.nudges).toHaveLength(3);
        expect(view.nudges[0]?.id).toBe('exec-1');
    });
});
