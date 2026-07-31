import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'src/app/components/lawyer/ArchivePortal/components');

describe('archive dossier card cohesion', () => {
    it('lawsuit and criminal cards share ArchiveDossierIdentityBlock', () => {
        const lawsuit = fs.readFileSync(path.join(root, 'LawsuitArchiveCard.tsx'), 'utf8');
        const criminal = fs.readFileSync(path.join(root, 'CriminalArchiveCard.tsx'), 'utf8');
        expect(lawsuit).toContain('ArchiveDossierIdentityBlock');
        expect(criminal).toContain('ArchiveDossierIdentityBlock');
        expect(lawsuit).not.toContain('function PartyRow');
    });

    it('UnifiedDossierCard remains the single visual shell', () => {
        const grid = fs.readFileSync(path.join(root, 'ArchivePortalFileGrid.tsx'), 'utf8');
        expect(grid).toContain('UnifiedDossierCard');
    });
});
