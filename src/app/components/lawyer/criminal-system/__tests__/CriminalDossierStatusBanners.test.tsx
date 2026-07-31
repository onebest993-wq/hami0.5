import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CriminalDossierTopBanners } from '../components/CriminalDossierStatusBanners';

describe('CriminalDossierTopBanners ownership', () => {
    it('shows claim button for orphan legacy read-only dossiers', () => {
        const onClaim = vi.fn();
        render(
            <CriminalDossierTopBanners
                shouldShowMandatoryCassationBanner={false}
                shouldShowArticle3DeadlineBanner={false}
                article3ElapsedDays={null}
                pendingSeveranceParentMatch={false}
                isInlineSeveranceFormOpen={false}
                parentCaseId="case-1"
                onResumeSeverance={() => {}}
                isPrejudicialFrozen={false}
                isInterventionReview={false}
                isCassationFilterReadOnly={false}
                isOwnerAccessDenied={true}
                isOrphanLegacyCase={true}
                onClaimCaseOwnership={onClaim}
            />,
        );

        const btn = screen.getByRole('button', { name: /تملّك الإضبارة للتعديل/ });
        fireEvent.click(btn);
        expect(onClaim).toHaveBeenCalledOnce();
    });

    it('does not show claim button when dossier belongs to another lawyer', () => {
        render(
            <CriminalDossierTopBanners
                shouldShowMandatoryCassationBanner={false}
                shouldShowArticle3DeadlineBanner={false}
                article3ElapsedDays={null}
                pendingSeveranceParentMatch={false}
                isInlineSeveranceFormOpen={false}
                parentCaseId="case-1"
                onResumeSeverance={() => {}}
                isPrejudicialFrozen={false}
                isInterventionReview={false}
                isCassationFilterReadOnly={false}
                isOwnerAccessDenied={true}
                isOrphanLegacyCase={false}
            />,
        );

        expect(screen.queryByRole('button', { name: /تملّك الإضبارة/ })).toBeNull();
        expect(screen.getByText(/ملكية محامٍ آخر/)).toBeTruthy();
    });
});
