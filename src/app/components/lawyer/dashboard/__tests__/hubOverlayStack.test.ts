import { describe, expect, it } from 'vitest';
import {
    HUB_DOSSIER_ACTIONS_MENU_Z_CLASS,
    HUB_DOSSIER_CHROME_Z_CLASS,
    HUB_DOSSIER_MODAL_Z_CLASS,
    HUB_DOSSIER_SPAWN_NEW_CASE_Z_CLASS,
    HUB_DOSSIER_Z_CLASS,
    HUB_NESTED_OVERLAY_Z_CLASS,
} from '../hubOverlayStack';

describe('hubOverlayStack z-order', () => {
    const z = (token: string) => Number(token.match(/\d+/)?.[0] ?? 0);

    it('keeps dossier nested modals above the legal actions sheet', () => {
        expect(z(HUB_DOSSIER_MODAL_Z_CLASS)).toBeGreaterThan(z(HUB_DOSSIER_ACTIONS_MENU_Z_CLASS));
    });

    it('keeps spawn-new-case above dossier shell and chrome nav', () => {
        expect(z(HUB_DOSSIER_SPAWN_NEW_CASE_Z_CLASS)).toBeGreaterThan(z(HUB_DOSSIER_Z_CLASS));
        expect(z(HUB_DOSSIER_SPAWN_NEW_CASE_Z_CLASS)).toBeGreaterThan(z(HUB_DOSSIER_CHROME_Z_CLASS));
    });

    it('keeps dossier above hub new-case overlay', () => {
        expect(z(HUB_DOSSIER_Z_CLASS)).toBeGreaterThan(z(HUB_NESTED_OVERLAY_Z_CLASS));
    });
});
