import { describe, it, expect } from 'vitest';
import {
    CRIMINAL_DASHBOARD_TAB_LABELS,
    CRIMINAL_DASHBOARD_TAB_ORDER,
    criminalDashboardTabClass,
} from '@/app/components/lawyer/criminal-system/criminalDashboardTabChrome';

describe('criminalDashboardTabChrome', () => {
    it('ترتيب التبويبات ثابت', () => {
        expect(CRIMINAL_DASHBOARD_TAB_ORDER).toEqual(['requests', 'statements', 'tracking', 'legal_codes']);
    });

    it('labels عربية لكل tab', () => {
        expect(CRIMINAL_DASHBOARD_TAB_LABELS.requests).toBe('القرارات');
        expect(CRIMINAL_DASHBOARD_TAB_LABELS.legal_codes).toBe('متون القوانين');
    });

    it('criminalDashboardTabClass يميّز active عن idle', () => {
        const active = criminalDashboardTabClass('requests', true);
        const idle = criminalDashboardTabClass('requests', false);
        expect(active).not.toBe(idle);
        expect(active).toContain('underline');
    });
});
