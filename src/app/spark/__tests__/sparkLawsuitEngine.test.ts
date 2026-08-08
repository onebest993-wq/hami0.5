import { beforeEach, describe, expect, it } from 'vitest';
import type { CaseStage } from '@/app/components/lawyer/LawyerShared';
import { collectLawsuitSparkNudges } from '@/app/spark/procedural/lawsuitNudgeRules';
import { pickActiveLawsuitSparkNudge, pickLawsuitSparkNudgeQueue } from '@/app/spark/engine/sparkHybridEngine';
import {
    readSparkPreferencesForTests,
    recordSparkDismiss,
    resetSparkPreferences,
} from '@/app/spark/memory/sparkPreferenceStore';
import type { LawsuitSparkContext } from '@/app/spark/context/lawsuitSparkContext';

function baseCtx(overrides: Partial<LawsuitSparkContext> = {}): LawsuitSparkContext {
    const displayStage: CaseStage = {
        id: 'stage-1',
        name: 'البداءة',
        status: 'active',
        stageName: 'مرحلة البداءة',
        isPleadingsClosed: true,
        judgmentForm: 'غيابي',
        lastJudgmentType: 'غيابي',
        finalDecision: 'إجابة الدعوى',
        ...(overrides.displayStage ?? {}),
    };

    return {
        dossierKey: 'lawsuit:100/2026',
        fileId: 'file-1',
        jurisdiction: 'civil' as const,
        representedParty: 'المدعى عليه',
        status: 'نشطة',
        isPaused: false,
        pauseReason: '',
        displayStage,
        stages: overrides.stages ?? [displayStage],
        timeline: overrides.timeline ?? [],
        ...overrides,
    };
}

describe('lawsuitNudgeRules', () => {
    it('يقترح تسجيل التبليغ عند غياب تاريخ التبليغ', () => {
        const nudges = collectLawsuitSparkNudges(
            baseCtx({
                displayStage: {
                    id: 'stage-1',
                    name: 'البداءة',
                    status: 'active',
                    stageName: 'مرحلة البداءة',
                    isPleadingsClosed: true,
                    judgmentForm: 'غيابي',
                    lastJudgmentType: 'غيابي',
                    finalDecision: 'إجابة الدعوى',
                    awaitingAbsentJudgmentNotification: true,
                },
            }),
        );
        expect(nudges.some((n) => n.kind === 'lawsuit.absent_notification_missing')).toBe(true);
    });

    it('يقترح مسار اعتراض للمدعى عليه عند حكم غيابي', () => {
        const nudges = collectLawsuitSparkNudges(
            baseCtx({
                representedParty: 'المدعى عليه',
                displayStage: {
                    id: 'stage-1',
                    name: 'البداءة',
                    status: 'active',
                    stageName: 'مرحلة البداءة',
                    isPleadingsClosed: true,
                    judgmentForm: 'غيابي',
                    lastJudgmentType: 'غيابي',
                    finalDecision: 'إجابة الدعوى',
                    absentJudgmentNotificationDate: '2026-03-01',
                },
            }),
        );
        expect(nudges.some((n) => n.kind === 'lawsuit.defendant_objection_available')).toBe(true);
    });

    it('يقترح استئناف السير عند الانقطاع', () => {
        const nudges = collectLawsuitSparkNudges(
            baseCtx({
                status: 'منقطعة',
                displayStage: {
                    id: 'stage-1',
                    name: 'البداءة',
                    status: 'active',
                    stageName: 'مرحلة البداءة',
                    interruptionDate: '2026-02-01T00:00:00.000Z',
                },
            }),
        );
        expect(nudges.some((n) => n.kind === 'lawsuit.interruption_resume')).toBe(true);
    });

    it('يقترح مراجعة مهلة الطعن عند اقترابها', () => {
        const future = new Date();
        future.setDate(future.getDate() + 3);
        const appealDeadline = future.toISOString().slice(0, 10);

        const nudges = collectLawsuitSparkNudges(
            baseCtx({
                displayStage: {
                    id: 'stage-1',
                    name: 'البداءة',
                    status: 'active',
                    stageName: 'مرحلة البداءة',
                    isPleadingsClosed: true,
                    appealDeadline,
                    finalDecision: 'رفض الدعوى',
                },
            }),
        );
        expect(nudges.some((n) => n.kind === 'lawsuit.appeal_deadline_near')).toBe(true);
    });
});

describe('pickLawsuitSparkNudgeQueue', () => {
    it('يُرجع أكثر من تنبيه عند توفر عدة إشارات', () => {
        const ctx = baseCtx({
            isPaused: true,
            pauseReason: 'انتظار',
            displayStage: {
                id: 'stage-1',
                name: 'البداءة',
                status: 'active',
                stageName: 'مرحلة البداءة',
                isPleadingsClosed: true,
                judgmentForm: 'غيابي',
                lastJudgmentType: 'غيابي',
                finalDecision: 'إجابة الدعوى',
                awaitingAbsentJudgmentNotification: true,
            },
        });
        const queue = pickLawsuitSparkNudgeQueue(ctx, 5);
        expect(queue.length).toBeGreaterThanOrEqual(2);
    });
});

describe('sparkPreferenceStore', () => {
    beforeEach(() => {
        resetSparkPreferences();
    });

    it('يخفي التنبيه بعد 3 تجاهلات', () => {
        const ctx = baseCtx({
            representedParty: 'المدعي',
            displayStage: {
                id: 'stage-1',
                name: 'البداءة',
                status: 'active',
                stageName: 'مرحلة البداءة',
                isPleadingsClosed: true,
                judgmentForm: 'غيابي',
                lastJudgmentType: 'غيابي',
                finalDecision: 'إجابة الدعوى',
                awaitingAbsentJudgmentNotification: true,
            },
        });

        recordSparkDismiss('lawsuit.absent_notification_missing', ctx.dossierKey);
        recordSparkDismiss('lawsuit.absent_notification_missing', ctx.dossierKey);
        expect(pickActiveLawsuitSparkNudge(ctx)?.kind).toBe('lawsuit.absent_notification_missing');

        recordSparkDismiss('lawsuit.absent_notification_missing', ctx.dossierKey);
        expect(pickActiveLawsuitSparkNudge(ctx)).toBeNull();
        expect(readSparkPreferencesForTests()['lawsuit.absent_notification_missing::lawsuit:100/2026']?.hidden).toBe(
            true,
        );
    });
});
