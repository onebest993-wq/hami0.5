import { describe, expect, it } from 'vitest';
import {
    HUB_DOSSIER_ACTIONS_MENU_Z_CLASS,
    HUB_DOSSIER_MODAL_Z_CLASS,
    HUB_DOSSIER_Z_CLASS,
} from '@/app/components/lawyer/shared/hubZLayers';
import { personalPearlHubTheme, personalPearlModalTheme } from './personalStatusPearlTheme';
import { PS_LAW_OVERLAY } from './personalStatusDossierTheme';

describe('personal status overlay z-layers', () => {
    it('keeps pearl overlays above the dossier root', () => {
        const hub = personalPearlHubTheme().overlay;
        const modal = personalPearlModalTheme().overlay;
        const sheet = personalPearlModalTheme().sheet;

        expect(hub).toContain(HUB_DOSSIER_MODAL_Z_CLASS);
        expect(modal).toContain(HUB_DOSSIER_MODAL_Z_CLASS);
        expect(sheet).toContain(HUB_DOSSIER_ACTIONS_MENU_Z_CLASS);
        expect(PS_LAW_OVERLAY).toContain(HUB_DOSSIER_MODAL_Z_CLASS);

        // Regression: never sit under dossier z-[235]
        expect(hub).not.toMatch(/z-\[150\]/);
        expect(modal).not.toMatch(/z-\[160\]/);
        expect(sheet).not.toMatch(/z-\[101\]/);

        expect(HUB_DOSSIER_MODAL_Z_CLASS).not.toBe(HUB_DOSSIER_Z_CLASS);
    });
});
