import { describe, expect, it } from 'vitest';
import { buildAlertsDataSignature } from '@/app/services/alerts/alertsDataSignature';
import type { LegalTask } from '@/app/types/TaskEngine';

describe('buildAlertsDataSignature', () => {
    it('يتغيّر عند تبديل تاريخ جلسة في نفس الإضبارة', () => {
        const file = {
            id: '10',
            status: 'active',
            stages: [
                {
                    id: 's1',
                    timeline: [{ id: 'h1', type: 'appointment', date: '2099-01-01' }],
                },
            ],
        };
        const one = buildAlertsDataSignature({
            files: [file as never],
            executionFiles: [],
            notes: [],
        });
        const two = buildAlertsDataSignature({
            files: [
                {
                    ...file,
                    stages: [
                        {
                            id: 's1',
                            timeline: [{ id: 'h1', type: 'appointment', date: '2099-01-02' }],
                        },
                    ],
                } as never,
            ],
            executionFiles: [],
            notes: [],
        });
        expect(one).not.toBe(two);
    });

    it('يتغيّر عند تثبيت مهمة ميدان بلا تاريخ صريح', () => {
        const base: LegalTask = {
            id: 'ft-1',
            title: 'زيارة',
            status: 'pending',
            rawText: '',
            subTasks: [],
            pinnedToFieldCurtain: false,
            isFatalDeadline: false,
            createdAt: new Date(),
        };
        const one = buildAlertsDataSignature({
            files: [],
            executionFiles: [],
            notes: [],
            fieldTasks: [base],
        });
        const two = buildAlertsDataSignature({
            files: [],
            executionFiles: [],
            notes: [],
            fieldTasks: [{ ...base, pinnedToFieldCurtain: true }],
        });
        expect(one).not.toBe(two);
    });

    it('يتتبّع موعد المشاهدة القادم', () => {
        const file = {
            id: 'ex-1',
            status: 'active',
            visitationSchedule: {
                config: { startTime: '16:00', location: 'بيت الطفل' },
                sessions: [{ id: 's1', date: '2099-06-15', status: 'scheduled' }],
            },
        };
        const one = buildAlertsDataSignature({
            files: [],
            executionFiles: [file],
            notes: [],
        });
        const two = buildAlertsDataSignature({
            files: [],
            executionFiles: [
                {
                    ...file,
                    visitationSchedule: {
                        ...file.visitationSchedule,
                        sessions: [{ id: 's1', date: '2099-06-16', status: 'scheduled' }],
                    },
                },
            ],
            notes: [],
        });
        expect(one).not.toBe(two);
    });
});
