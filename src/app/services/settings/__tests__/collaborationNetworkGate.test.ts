import { afterEach, describe, expect, it } from 'vitest';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '../defaults';
import {
    COLLABORATION_NETWORK_OFF,
    assertCollaborationNetworkReachable,
    canReachCollaborationNetwork,
} from '../collaborationNetworkGate';
import { isCollaborationNetworkCut } from '../collaborationNetworkLite';

describe('canReachCollaborationNetwork', () => {
    afterEach(() => {
        delete document.documentElement.dataset.hamiLocalOnly;
    });

    it('مفتوح في الافتراضي — التعاون لا ينتظر مزامنة الإضابير', () => {
        expect(canReachCollaborationNetwork(LAWYER_SETTINGS_V2_DEFAULTS)).toBe(true);
        expect(LAWYER_SETTINGS_V2_DEFAULTS.data.cloudSync).toBe(false);
    });

    it('يُقطع عند localOnlyMode', () => {
        const settings = {
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            security: { ...LAWYER_SETTINGS_V2_DEFAULTS.security, localOnlyMode: true },
        };
        expect(canReachCollaborationNetwork(settings)).toBe(false);
        expect(() => assertCollaborationNetworkReachable(settings)).toThrow(COLLABORATION_NETWORK_OFF);
    });

    it('يُقطع من علم الإقلاع حتى لو اللقطة تسمح', () => {
        document.documentElement.dataset.hamiLocalOnly = '1';
        expect(canReachCollaborationNetwork(LAWYER_SETTINGS_V2_DEFAULTS)).toBe(false);
        expect(isCollaborationNetworkCut()).toBe(true);
    });
});
