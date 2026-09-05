import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../../LawyerShared';
import { shouldPromptPleadingHearingRegistration } from '../pleadingHearingRegistrationPrompt';

describe('shouldPromptPleadingHearingRegistration', () => {
    it('يطلب موعداً بعد فتح إضبارة طعن بلا جلسة', () => {
        const stage = {
            stageName: 'الاستئناف',
            isPleadingsClosed: false,
            appealMetadata: { priorStageOutcome: 'WIN' },
            timeline: [
                { id: '1', type: 'milestone', date: '2026-08-01', title: 'فتح إضبارة الاستئناف' },
            ],
        } as CaseStage;
        expect(shouldPromptPleadingHearingRegistration(stage)).toBe(true);
    });

    it('يطلب موعداً بعد طعن الخصم عند فتح إضبارة بلا جلسة', () => {
        const stage = {
            stageName: 'الاستئناف',
            isPleadingsClosed: false,
            appealMetadata: { priorStageOutcome: 'WIN', filedBy: 'opponent' },
            timeline: [
                { id: '1', type: 'milestone', date: '2026-08-01', title: 'فتح إضبارة الاستئناف' },
            ],
        } as CaseStage;
        expect(shouldPromptPleadingHearingRegistration(stage)).toBe(true);
    });

    it('لا يطلب موعداً إن وُجدت جلسة مرافعة أحدث من النقض', () => {
        const stage = {
            stageName: 'الاستئناف',
            isPleadingsClosed: false,
            timeline: [
                {
                    id: 'a',
                    type: 'appointment',
                    date: '2026-08-10',
                    title: 'أول مرافعة بعد النقض',
                },
                {
                    id: 'r',
                    type: 'milestone',
                    date: '2026-08-01',
                    title: 'نقض التمييز — استئناف السير في الاستئناف',
                },
            ],
        } as CaseStage;
        expect(shouldPromptPleadingHearingRegistration(stage)).toBe(false);
    });

    it('يطلب موعداً عند pleadingDoorReopened بلا جلسة', () => {
        const stage = {
            stageName: 'البداءة',
            isPleadingsClosed: false,
            pleadingDoorReopened: true,
            timeline: [
                { id: '1', type: 'milestone', date: '2026-08-01', title: 'فتح باب المرافعة' },
            ],
        } as CaseStage;
        expect(shouldPromptPleadingHearingRegistration(stage)).toBe(true);
    });

    it('لا يطلب عند إغلاق المرافعات', () => {
        expect(
            shouldPromptPleadingHearingRegistration({
                isPleadingsClosed: true,
                pleadingDoorReopened: true,
                timeline: [],
            } as CaseStage),
        ).toBe(false);
    });
});
