import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CRIMINAL_DOSSIER_TEST_IDS } from '../criminalDossierTestIds';
import { CriminalDossierHeaderLazyBoundary } from '../CriminalDossierHeaderLazyBoundary';

describe('CriminalDossierHeaderLazyBoundary', () => {
    it('يُبقي زر المغادرة أثناء تحميل شظية الترويسة', async () => {
        const LazyNever = React.lazy(() => new Promise<{ default: React.ComponentType }>(() => {}));
        render(
            <CriminalDossierHeaderLazyBoundary onNavExit={vi.fn()}>
                <LazyNever />
            </CriminalDossierHeaderLazyBoundary>,
        );

        expect(await screen.findByTestId(CRIMINAL_DOSSIER_TEST_IDS.exit)).toBeTruthy();
        expect(screen.queryByTestId(CRIMINAL_DOSSIER_TEST_IDS.back)).toBeNull();
    });
});
