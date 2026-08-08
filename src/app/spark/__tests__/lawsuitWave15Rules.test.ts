import { describe, expect, it } from 'vitest';
import { collectLawsuitSparkNudges } from '@/app/spark/procedural/lawsuitNudgeRules';
import type { LawsuitSparkContext } from '@/app/spark/context/lawsuitSparkContext';
import type { CaseStage } from '@/app/components/lawyer/LawyerShared';

function ctx(overrides: Partial<LawsuitSparkContext> = {}): LawsuitSparkContext {
    const displayStage: CaseStage = {
        id: 's1',
        name: 'البداءة',
        status: 'active',
        stageName: 'مرحلة البداءة',
        ...(overrides.displayStage ?? {}),
    };
    return {
        dossierKey: 'lawsuit:1/2026',
        fileId: 'f1',
        jurisdiction: 'civil',
        representedParty: 'المدعي',
        status: 'نشطة',
        isPaused: false,
        pauseReason: '',
        displayStage,
        stages: overrides.stages ?? [displayStage],
        timeline: [],
        ...overrides,
    };
}

describe('lawsuitNudgeRules — Wave 1.5', () => {
    it('يقترح استئناف السير عند الإيقاف', () => {
        const nudges = collectLawsuitSparkNudges(
            ctx({
                status: 'مستأخرة',
                isPaused: true,
                pauseReason: 'وفاة خصم',
            }),
        );
        expect(nudges.some((n) => n.kind === 'lawsuit.pause_active')).toBe(true);
    });

    it('يقترح متابعة إبطال العريضة', () => {
        const nudges = collectLawsuitSparkNudges(
            ctx({
                displayStage: {
                    id: 's1',
                    name: 'البداءة',
                    status: 'active',
                    stageName: 'مرحلة البداءة',
                    petitionVoidFlow: {
                        status: 'registered',
                        voidLabel: 'إبطال عريضة الدعوى',
                        registeredDate: '2026-01-01',
                    },
                },
            }),
        );
        expect(nudges.some((n) => n.kind === 'lawsuit.petition_void_followup')).toBe(true);
    });

    it('يقترح قرار إدخال طرف ثالث معلّق', () => {
        const nudges = collectLawsuitSparkNudges(
            ctx({
                displayStage: {
                    id: 's1',
                    name: 'البداءة',
                    status: 'active',
                    stageName: 'مرحلة البداءة',
                    incidentalCases: [
                        {
                            id: 'inc-1',
                            type: 'thirdParty',
                            partyName: 'علي حسن',
                            date: '2026-02-01',
                            status: 'active',
                            entryDecision: 'pending',
                        },
                    ],
                },
            }),
        );
        expect(nudges.some((n) => n.kind === 'lawsuit.incidental_entry_pending')).toBe(true);
    });
});
