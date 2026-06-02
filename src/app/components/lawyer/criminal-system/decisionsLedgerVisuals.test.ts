import { describe, expect, it } from 'vitest';
import type { JudicialDecision } from '@/app/types/criminal';
import {
    DECISION_VISUAL_THEME,
    classifyDecisionLedgerKind,
    classifyDecisionVisualKind,
    decisionHasConcernedParty,
    formatJudicialDecisionBailSummary,
    resolveConcernedPartyText,
    resolveLedgerDisplayArticle,
    shouldShowLedgerPartyMetaRow,
} from './decisionsLedgerVisuals';
import {
    ARREST_ORDER_TEMPLATE,
    ASSET_SEIZURE_TEMPLATE,
    BAIL_RELEASE_TEMPLATE,
    CUSTOM_JUDICIAL_DECISION_TYPE,
    CUSTOM_LAWYER_MOTION_TYPE,
    DEFENDANT_BAIL_TEMPLATE,
    DETENTION_DECISION_TEMPLATE,
    SUMMON_ORDER_TEMPLATE,
} from './proceduralRequestTypes';

function decision(
    overrides: Partial<JudicialDecision> & { title: string; proceduralTemplate?: string },
): JudicialDecision {
    return {
        id: overrides.id ?? 'd1',
        issuedAt: overrides.issuedAt ?? '2026-05-25',
        title: overrides.title,
        summary: overrides.summary ?? '',
        decisionType: overrides.decisionType ?? 'preparatory',
        appeals: overrides.appeals ?? [],
        isLocked: overrides.isLocked ?? false,
        defendantIds: overrides.defendantIds,
        beneficiaryPartyIds: overrides.beneficiaryPartyIds,
        proceduralTemplate: overrides.proceduralTemplate,
        legalArticleBasis: overrides.legalArticleBasis,
    } as JudicialDecision;
}

describe('classifyDecisionVisualKind', () => {
    it('flags detention as restrictive', () => {
        expect(
            classifyDecisionVisualKind(
                decision({ title: DETENTION_DECISION_TEMPLATE, proceduralTemplate: DETENTION_DECISION_TEMPLATE }),
            ),
        ).toBe('restrictive');
    });

    it('flags arrest order as restrictive', () => {
        expect(
            classifyDecisionVisualKind(
                decision({ title: ARREST_ORDER_TEMPLATE, proceduralTemplate: ARREST_ORDER_TEMPLATE }),
            ),
        ).toBe('restrictive');
    });

    it('flags asset seizure as restrictive', () => {
        expect(
            classifyDecisionVisualKind(
                decision({ title: ASSET_SEIZURE_TEMPLATE, proceduralTemplate: ASSET_SEIZURE_TEMPLATE }),
            ),
        ).toBe('restrictive');
    });

    it('flags summon order as summon', () => {
        expect(
            classifyDecisionVisualKind(
                decision({ title: SUMMON_ORDER_TEMPLATE, proceduralTemplate: SUMMON_ORDER_TEMPLATE }),
            ),
        ).toBe('summon');
    });

    it('flags new defendant bail as release', () => {
        expect(
            classifyDecisionVisualKind(
                decision({ title: DEFENDANT_BAIL_TEMPLATE, proceduralTemplate: DEFENDANT_BAIL_TEMPLATE }),
            ),
        ).toBe('release');
    });

    it('flags legacy bail-release template as release', () => {
        expect(
            classifyDecisionVisualKind(
                decision({ title: BAIL_RELEASE_TEMPLATE, proceduralTemplate: BAIL_RELEASE_TEMPLATE }),
            ),
        ).toBe('release');
    });

    it('falls back to general for unmapped templates', () => {
        expect(classifyDecisionVisualKind(decision({ title: 'إجراء غير محدد' }))).toBe('general');
    });

    it('falls back through title keywords when template is empty', () => {
        expect(
            classifyDecisionVisualKind(decision({ title: 'قرار إخلاء سبيل بكفالة' })),
        ).toBe('release');
        expect(
            classifyDecisionVisualKind(decision({ title: 'إصدار أمر استقدام عاجل' })),
        ).toBe('summon');
        expect(
            classifyDecisionVisualKind(decision({ title: 'حجز أموال متهم هارب' })),
        ).toBe('restrictive');
    });
});

describe('classifyDecisionLedgerKind', () => {
    it('treats dispositive decisions as judicial unconditionally', () => {
        expect(
            classifyDecisionLedgerKind(
                decision({ title: 'حكم نهائي', decisionType: 'dispositive' }),
            ),
        ).toBe('judicial');
    });

    it('classifies judicial templates correctly', () => {
        expect(
            classifyDecisionLedgerKind(
                decision({ title: DETENTION_DECISION_TEMPLATE, proceduralTemplate: DETENTION_DECISION_TEMPLATE }),
            ),
        ).toBe('judicial');
        expect(
            classifyDecisionLedgerKind(
                decision({
                    title: CUSTOM_JUDICIAL_DECISION_TYPE,
                    proceduralTemplate: CUSTOM_JUDICIAL_DECISION_TYPE,
                }),
            ),
        ).toBe('judicial');
    });

    it('classifies lawyer-motion templates correctly', () => {
        expect(
            classifyDecisionLedgerKind(
                decision({ title: BAIL_RELEASE_TEMPLATE, proceduralTemplate: BAIL_RELEASE_TEMPLATE }),
            ),
        ).toBe('lawyer_motion');
        expect(
            classifyDecisionLedgerKind(
                decision({
                    title: CUSTOM_LAWYER_MOTION_TYPE,
                    proceduralTemplate: CUSTOM_LAWYER_MOTION_TYPE,
                }),
            ),
        ).toBe('lawyer_motion');
    });

    it('defaults unknown templates to judicial (safer for visibility)', () => {
        expect(
            classifyDecisionLedgerKind(decision({ title: 'قالب نَادر/غير معروف' })),
        ).toBe('judicial');
    });
});

describe('resolveConcernedPartyText & decisionHasConcernedParty', () => {
    const partyLabel = (id: string) => {
        if (id === 'def-1') return 'علي حسن';
        if (id === 'def-2') return 'أحمد محمد';
        return '—';
    };

    it('returns empty when no party IDs are present', () => {
        expect(resolveConcernedPartyText(decision({ title: 'قرار عام' }), partyLabel)).toBe('');
        expect(decisionHasConcernedParty(decision({ title: 'قرار عام' }))).toBe(false);
    });

    it('joins multiple defendants with dot separator', () => {
        const d = decision({
            title: DETENTION_DECISION_TEMPLATE,
            proceduralTemplate: DETENTION_DECISION_TEMPLATE,
            defendantIds: ['def-1', 'def-2'],
        });
        expect(resolveConcernedPartyText(d, partyLabel)).toBe('علي حسن • أحمد محمد');
        expect(decisionHasConcernedParty(d)).toBe(true);
    });

    it('deduplicates IDs between defendantIds and beneficiaryPartyIds', () => {
        const d = decision({
            title: DETENTION_DECISION_TEMPLATE,
            defendantIds: ['def-1'],
            beneficiaryPartyIds: ['def-1', 'def-2'],
        });
        expect(resolveConcernedPartyText(d, partyLabel)).toBe('علي حسن • أحمد محمد');
    });

    it('ignores empty / whitespace-only IDs safely', () => {
        const d = decision({
            title: DETENTION_DECISION_TEMPLATE,
            defendantIds: ['', '  ', 'def-1'],
        });
        expect(resolveConcernedPartyText(d, partyLabel)).toBe('علي حسن');
        expect(decisionHasConcernedParty(d, partyLabel)).toBe(true);
    });

    it('treats unresolved party labels as no concerned party', () => {
        const d = decision({
            title: DETENTION_DECISION_TEMPLATE,
            defendantIds: ['missing-def'],
        });
        expect(resolveConcernedPartyText(d, partyLabel, { nameOnly: true })).toBe('');
        expect(decisionHasConcernedParty(d, partyLabel)).toBe(false);
    });

    it('strips role prefixes when nameOnly=true', () => {
        const prefixedLabel = (id: string) => {
            if (id === 'def-1') return 'متهم: علي حسن';
            if (id === 'def-2') return 'مشتكي: أحمد محمد';
            if (id === 'def-3') return 'الطرف: مهند خالد';
            return '—';
        };
        const d = decision({
            title: DETENTION_DECISION_TEMPLATE,
            defendantIds: ['def-1', 'def-2', 'def-3'],
        });
        expect(resolveConcernedPartyText(d, prefixedLabel, { nameOnly: true })).toBe(
            'علي حسن • أحمد محمد • مهند خالد',
        );
        // التَوافق العَكسي: بدون nameOnly تَظهر البَوادئ كما هي.
        expect(resolveConcernedPartyText(d, prefixedLabel)).toBe(
            'متهم: علي حسن • مشتكي: أحمد محمد • الطرف: مهند خالد',
        );
    });

    it('handles labels without colon safely under nameOnly', () => {
        const plainLabel = (id: string) => (id === 'def-1' ? 'علي حسن' : '—');
        const d = decision({ title: DETENTION_DECISION_TEMPLATE, defendantIds: ['def-1'] });
        expect(resolveConcernedPartyText(d, plainLabel, { nameOnly: true })).toBe('علي حسن');
    });
});

describe('formatJudicialDecisionBailSummary', () => {
    it('formats financial bail amount', () => {
        expect(
            formatJudicialDecisionBailSummary({ kind: 'financial', bailAmount: '1,000,000' }),
        ).toEqual({ label: 'مبلغ الكفالة', value: '1,000,000' });
    });

    it('formats personal guarantor names', () => {
        expect(
            formatJudicialDecisionBailSummary({
                kind: 'personal',
                guarantors: [{ fullName: 'أحمد علي' }, { fullName: 'محمد حسن' }],
            }),
        ).toEqual({ label: 'الكفلاء', value: 'أحمد علي • محمد حسن' });
    });

    it('returns null when bail payload is incomplete', () => {
        expect(formatJudicialDecisionBailSummary({ kind: 'financial', bailAmount: '' })).toBeNull();
        expect(formatJudicialDecisionBailSummary({ kind: 'personal', guarantors: [] })).toBeNull();
    });
});

describe('DECISION_VISUAL_THEME contract', () => {
    it('declares unique base border colors per visual kind', () => {
        const borders = Object.values(DECISION_VISUAL_THEME).map((t) => t.border);
        expect(new Set(borders).size).toBe(borders.length);
    });

    it('uses the legally requested base palette tokens', () => {
        expect(DECISION_VISUAL_THEME.restrictive.border).toContain('red-500');
        expect(DECISION_VISUAL_THEME.summon.border).toContain('amber-500');
        expect(DECISION_VISUAL_THEME.release.border).toContain('cyan-500');
        expect(DECISION_VISUAL_THEME.general.border).toContain('white');
    });
});

describe('ledger display deduplication helpers', () => {
    it('resolveLedgerDisplayArticle hides article when it matches active case article', () => {
        const d = {
            id: '1',
            issuedAt: '2026-05-01',
            title: 'قرار',
            summary: '',
            legalArticleBasis: '55',
            appeals: [],
        } as JudicialDecision;
        expect(resolveLedgerDisplayArticle(d, '55')).toBeUndefined();
        expect(resolveLedgerDisplayArticle(d, '413')).toBe('55');
    });

    it('shouldShowLedgerPartyMetaRow hides party when name is in title', () => {
        expect(shouldShowLedgerPartyMetaRow('لبيليب', 'قرار بحق لبيليب')).toBe(false);
        expect(shouldShowLedgerPartyMetaRow('لبيليب', 'تكفيل المتهم')).toBe(true);
    });
});
