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
            '@/app/components/lawyer/ArchivePortal/components/ArchivePortalFileGrid'
        );
        expect(grid.ArchivePortalFileGrid).toBeTypeOf('function');
    });
});
