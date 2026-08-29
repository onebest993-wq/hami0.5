import { describe, expect, it } from 'vitest';

describe('archive portal module graph', () => {
    it('loads ArchivePortal and LawsuitArchiveCard without throwing', async () => {
        const portal = await import('@/app/components/lawyer/ArchivePortal.tsx');
        expect(portal.ArchivePortal).toBeTypeOf('function');

        const card = await import(
            '@/app/components/lawyer/ArchivePortal/components/LawsuitArchiveCard'
        );
        expect(card.LawsuitArchiveCard).toBeTypeOf('function');

        const grid = await import(
            '@/app/components/lawyer/ArchivePortal/components/LawsuitArchiveFileGrid'
        );
        expect(grid.LawsuitArchiveFileGrid).toBeTypeOf('function');

        const lawsuitEntry = await import(
            '@/app/components/lawyer/ArchivePortal/ArchivePortalLawsuitEntry.tsx'
        );
        expect(lawsuitEntry.ArchivePortal).toBeTypeOf('function');
    }, 60_000);
});
