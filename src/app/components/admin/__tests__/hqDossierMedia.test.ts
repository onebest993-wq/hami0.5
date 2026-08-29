import { describe, expect, it } from 'vitest';
import { HQ_DOSSIER_IMAGE_MAX, sanitizeHqDossierImage } from '@/app/components/admin/hqDossierMedia';

describe('sanitizeHqDossierImage', () => {
    it('يقبل jpeg/png ويرفض svg والنص الطويل', () => {
        expect(sanitizeHqDossierImage(`data:image/jpeg;base64,${'A'.repeat(80)}`)).toMatch(/^data:image\/jpeg/);
        expect(sanitizeHqDossierImage(`data:image/png;base64,${'B'.repeat(80)}`)).toMatch(/^data:image\/png/);
        expect(sanitizeHqDossierImage('data:image/svg+xml;base64,PHN2Zz4=')).toBeNull();
        expect(sanitizeHqDossierImage('https://evil.example/x.png')).toBeNull();
        expect(sanitizeHqDossierImage(`data:image/jpeg;base64,${'C'.repeat(HQ_DOSSIER_IMAGE_MAX)}`)).toBeNull();
    });
});
