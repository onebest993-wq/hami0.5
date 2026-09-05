import { describe, expect, it } from 'vitest';
import { resolveNextPleadingAppointmentTitle } from '../pleadingAppointmentTitle';
import type { CaseStage } from '../../../LawyerShared';

describe('resolveNextPleadingAppointmentTitle', () => {
    it('بعد نقض التمييز يُسمّى أول موعد «أول مرافعة بعد النقض»', () => {
        const stage: CaseStage = {
            id: 's1',
            name: 'البداءة',
            stageName: 'البداءة',
            timeline: [
                {
                    id: 'm1',
                    type: 'milestone',
                    date: '2026-08-31',
                    title: '↩ نقض التمييز — استئناف السير',
                },
            ],
        };
        expect(resolveNextPleadingAppointmentTitle(stage)).toBe('أول مرافعة بعد النقض');
    });

    it('بعد أول مرافعة لاحقة يعود «موعد المرافعة»', () => {
        const stage: CaseStage = {
            id: 's1',
            name: 'البداءة',
            stageName: 'البداءة',
            timeline: [
                { id: 'a1', type: 'appointment', date: '2026-09-01', title: 'أول مرافعة بعد النقض', subType: 'pleading' },
                {
                    id: 'm1',
                    type: 'milestone',
                    date: '2026-08-31',
                    title: 'نقض التمييز — استئناف السير',
                },
            ],
        };
        expect(resolveNextPleadingAppointmentTitle(stage)).toBe('موعد المرافعة');
    });

    it('بدون أي موعد مرافعة سابق يُسمّى «أول مرافعة»', () => {
        const stage: CaseStage = {
            id: 's1',
            name: 'البداءة',
            stageName: 'البداءة',
            timeline: [],
        };
        expect(resolveNextPleadingAppointmentTitle(stage)).toBe('أول مرافعة');
    });
});
