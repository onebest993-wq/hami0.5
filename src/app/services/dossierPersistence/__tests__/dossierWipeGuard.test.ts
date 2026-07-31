import { describe, expect, it } from 'vitest';
import {
    countDossierArray,
    countProtectedItems,
    shouldRejectDossierWipe,
} from '@/app/services/dossierPersistence/dossierWipeGuard';

describe('dossierWipeGuard', () => {
    it('rejects empty array overwrite when existing has items', () => {
        const existing = JSON.stringify([{ id: '1' }, { id: '2' }]);
        const incoming = JSON.stringify([]);
        expect(shouldRejectDossierWipe('lawyer_files', incoming, existing)).toBe(true);
        expect(shouldRejectDossierWipe('executionFiles', incoming, existing)).toBe(true);
        expect(shouldRejectDossierWipe('executionFiles:user-abc', incoming, existing)).toBe(true);
        expect(shouldRejectDossierWipe('lawyer_notes', incoming, existing)).toBe(true);
        expect(shouldRejectDossierWipe('hami:calendar:events:v1', incoming, existing)).toBe(true);
        expect(shouldRejectDossierWipe('hami:smartvault:docs:v1', incoming, existing)).toBe(true);
        expect(shouldRejectDossierWipe('hami:community:posts:v1', incoming, existing)).toBe(true);
    });

    it('allows save when incoming has items', () => {
        const existing = JSON.stringify([{ id: '1' }]);
        const incoming = JSON.stringify([{ id: '1' }, { id: '2' }]);
        expect(shouldRejectDossierWipe('lawyer_files', incoming, existing)).toBe(false);
        expect(shouldRejectDossierWipe('lawyer_notes', incoming, existing)).toBe(false);
    });

    it('allows first write when no existing data', () => {
        expect(shouldRejectDossierWipe('lawyer_files', '[]', null)).toBe(false);
        expect(shouldRejectDossierWipe('lawyer_notes', '[]', null)).toBe(false);
    });

    it('rejects empty object overwrite for settings when existing has keys', () => {
        const existing = JSON.stringify({ theme: 'dark', lang: 'ar' });
        expect(shouldRejectDossierWipe('lawyer_settings', '{}', existing)).toBe(true);
    });

    it('rejects empty tasks wrapper when existing has items', () => {
        const existing = JSON.stringify({ tasks: [{ id: '1' }, { id: '2' }] });
        const incoming = JSON.stringify({ tasks: [] });
        expect(shouldRejectDossierWipe('hami_quantum_legal_tasks_v1', incoming, existing)).toBe(true);
    });

    it('counts array items in raw json', () => {
        expect(countDossierArray(JSON.stringify([{ id: 'a' }]))).toBe(1);
        expect(countDossierArray('{}')).toBe(0);
        expect(countDossierArray(null)).toBe(0);
        expect(countProtectedItems('lawyer_notes', JSON.stringify([{ id: 'n1' }]))).toBe(1);
    });
});