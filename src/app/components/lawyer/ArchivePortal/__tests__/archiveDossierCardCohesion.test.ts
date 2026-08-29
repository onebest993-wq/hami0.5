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
        const identity = fs.readFileSync(path.join(root, 'ArchiveDossierIdentityBlock.tsx'), 'utf8');
        expect(identity).toContain('archive-hearing-slot');
        expect(identity).toContain('invisible');
        expect(identity).toContain('ArchiveHearingStrip');
        expect(identity).toContain("metaLayout = 'inline'");
        expect(identity).toContain('grid grid-cols-2 gap-x-3 gap-y-1.5');
    });

    it('زر التثبيت يظهر مع البطاقة وبطابع أيقونات الأرشيف', () => {
        const lawsuit = fs.readFileSync(path.join(root, 'LawsuitArchiveCard.tsx'), 'utf8');
        const criminal = fs.readFileSync(path.join(root, 'CriminalArchiveCard.tsx'), 'utf8');
        const pin = fs.readFileSync(
            path.join(root, '../../../../workspace/WorkspacePinButton.tsx'),
            'utf8',
        );
        expect(lawsuit).toContain('WorkspacePinButton');
        expect(lawsuit).toContain('variant="ghost"');
        expect(lawsuit).not.toContain('LazyWorkspacePinButton');
        expect(lawsuit).not.toContain('<Suspense');
        expect(criminal).toContain('variant="ghost"');
        expect(pin).toContain("variant?: 'typed' | 'ghost'");
        expect(pin).toContain("variant === 'ghost'");
    });

    it('LawsuitArchiveFileGrid يستخدم LawsuitArchiveCard وليس UnifiedDossierCard', () => {
        const grid = fs.readFileSync(path.join(root, 'LawsuitArchiveFileGrid.tsx'), 'utf8');
        expect(grid).toContain('LawsuitArchiveCard');
        expect(grid).not.toContain('UnifiedDossierCard');
    });
});
