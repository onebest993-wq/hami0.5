import { describe, expect, it, beforeEach } from 'vitest';
import {
    registerLawyerDashboardHeaderIntentHandler,
    requestLawyerDashboardHeaderIntent,
    resetLawyerDashboardHeaderIntentBridgeForTests,
} from '../lawyerDashboardHeaderIntentBridge';

describe('lawyerDashboardHeaderIntentBridge', () => {
    beforeEach(() => {
        resetLawyerDashboardHeaderIntentBridgeForTests();
    });

    it('يصفّ النية حتى تسجيل المعالج ثم يُفرّغها', () => {
        const seen: string[] = [];
        requestLawyerDashboardHeaderIntent('notifications');
        registerLawyerDashboardHeaderIntentHandler((intent) => {
            seen.push(intent);
        });
        expect(seen).toEqual(['notifications']);
    });

    it('يُنفّذ فوراً عند وجود معالج', () => {
        const seen: string[] = [];
        registerLawyerDashboardHeaderIntentHandler((intent) => {
            seen.push(intent);
        });
        requestLawyerDashboardHeaderIntent('search');
        expect(seen).toEqual(['search']);
    });
});
